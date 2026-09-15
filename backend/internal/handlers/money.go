package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

type MoneyHandler struct {
	DB *sql.DB
}

func NewMoneyHandler(db *sql.DB) *MoneyHandler {
	return &MoneyHandler{DB: db}
}

func rangeStart(r string) (time.Time, string) {
	now := time.Now()
	switch r {
	case "week":
		return now.AddDate(0, 0, -7), "day"
	case "year":
		return now.AddDate(-1, 0, 0), "month"
	case "all":
		return time.Time{}, "month"
	default: // month
		return now.AddDate(0, -1, 0), "day"
	}
}

// minPayout returns the contractor's own threshold or the platform default
func minPayout(db *sql.DB, userID string) float64 {
	var own *float64
	db.QueryRow(`SELECT min_payout_amount FROM user_settings WHERE user_id=$1`, userID).Scan(&own)
	if own != nil && *own > 0 {
		return *own
	}
	return GetSettingFloat(db, "min_payout_amount", 50)
}

// GET /earnings?range=week|month|year|all
func (h *MoneyHandler) Earnings(c *gin.Context) {
	userID := c.GetString("user_id")
	from, bucket := rangeStart(c.DefaultQuery("range", "month"))

	var balance float64
	h.DB.QueryRow(`SELECT COALESCE(balance,0) FROM balances WHERE user_id=$1`, userID).Scan(&balance)

	var pendingPayouts float64
	h.DB.QueryRow(`SELECT COALESCE(SUM(amount),0) FROM payout_requests WHERE contractor_id=$1 AND status IN ('pending','approved')`, userID).Scan(&pendingPayouts)

	// net expected from jobs finished but not yet confirmed/paid
	var pendingJobs float64
	var pendingCount int
	h.DB.QueryRow(`SELECT COALESCE(SUM(contractor_net),0), COUNT(*) FROM jobs WHERE contractor_id=$1
        AND status IN ('awaiting_confirmation','issue_reported','dispute_open','dispute_rejected','return_visit_scheduled')`, userID).Scan(&pendingJobs, &pendingCount)

	var earned, tips, fees float64
	var jobsPaid int
	h.DB.QueryRow(`SELECT
            COALESCE(SUM(CASE WHEN transaction_type='earning' THEN amount END),0),
            COALESCE(SUM(CASE WHEN transaction_type='tip' THEN amount END),0),
            COALESCE(SUM(CASE WHEN transaction_type IN ('platform_fee','cancellation_fee') THEN amount END),0),
            COUNT(DISTINCT CASE WHEN transaction_type='earning' THEN job_id END)
        FROM transactions WHERE user_id=$1 AND status='completed' AND created_at>=$2`, userID, from).Scan(&earned, &tips, &fees, &jobsPaid)

	// series for the chart
	series := []gin.H{}
	rows, err := h.DB.Query(`SELECT date_trunc($3, created_at) AS b, COALESCE(SUM(amount),0)
        FROM transactions WHERE user_id=$1 AND status='completed' AND created_at>=$2 AND transaction_type IN ('earning','tip','platform_fee','cancellation_fee')
        GROUP BY b ORDER BY b`, userID, from, bucket)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var b time.Time
			var v float64
			if rows.Scan(&b, &v) == nil {
				series = append(series, gin.H{"bucket": b.Format("2006-01-02"), "amount": money(v)})
			}
		}
	}

	utils.Success(c, http.StatusOK, "", gin.H{
		"balance":            money(balance),
		"available":          money(balance),
		"pending_payouts":    money(pendingPayouts),
		"pending_jobs":       money(pendingJobs),
		"pending_jobs_count": pendingCount,
		"earned":             money(earned),
		"tips":               money(tips),
		"fees":               money(fees),
		"net":                money(earned + tips + fees),
		"jobs_paid":          jobsPaid,
		"min_payout":         minPayout(h.DB, userID),
		"series":             series,
	})
}

// GET /transactions?type=all|payout|fee|earning|tip
func (h *MoneyHandler) Transactions(c *gin.Context) {
	userID := c.GetString("user_id")
	page, limit := utils.Pagination(c)

	where := "user_id=$1"
	args := []interface{}{userID}
	switch c.DefaultQuery("type", "all") {
	case "payout":
		where += " AND transaction_type='payout'"
	case "fee":
		where += " AND transaction_type IN ('platform_fee','cancellation_fee')"
	case "earning":
		where += " AND transaction_type='earning'"
	case "tip":
		where += " AND transaction_type='tip'"
	}
	var total int64
	h.DB.QueryRow("SELECT COUNT(*) FROM transactions WHERE "+where, args...).Scan(&total)

	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query(`SELECT t.id, t.job_id, j.request_code, j.title, t.transaction_type, t.status, t.amount, t.description, t.receipt_url, t.created_at
        FROM transactions t LEFT JOIN jobs j ON j.id=t.job_id WHERE `+where+` ORDER BY t.created_at DESC LIMIT $2 OFFSET $3`, args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list transactions")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, ttype, status string
		var jobID, code, title, desc, receipt *string
		var amount float64
		var at time.Time
		if rows.Scan(&id, &jobID, &code, &title, &ttype, &status, &amount, &desc, &receipt, &at) == nil {
			out = append(out, gin.H{"id": id, "job_id": jobID, "request_code": code, "job_title": title, "type": ttype, "status": status,
				"amount": amount, "description": desc, "receipt_url": receipt, "created_at": at})
		}
	}
	utils.Paginated(c, http.StatusOK, out, total, page, limit)
}

type PayoutRequest struct {
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	PaymentMethodID *string `json:"payment_method_id"`
}

// createPayout moves balance into a pending payout request. Stripe transfer is wired in the payments step.
func createPayout(db *sql.DB, userID string, amount float64, methodID *string, auto bool) (string, error) {
	tx, err := db.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	var balance float64
	if err := tx.QueryRow(`SELECT COALESCE(balance,0) FROM balances WHERE user_id=$1 FOR UPDATE`, userID).Scan(&balance); err != nil {
		return "", fmt.Errorf("no balance")
	}
	if amount > balance {
		return "", fmt.Errorf("amount exceeds available balance ($%.2f)", balance)
	}
	if methodID == nil {
		var id string
		if tx.QueryRow(`SELECT id FROM payment_methods WHERE user_id=$1 ORDER BY is_default DESC, created_at LIMIT 1`, userID).Scan(&id) == nil {
			methodID = &id
		}
	}
	var label *string
	if methodID != nil {
		tx.QueryRow(`SELECT COALESCE(label, COALESCE(bank_name, card_brand) || ' •••• ' || COALESCE(bank_last_four, card_last_four, ''))
            FROM payment_methods WHERE id=$1 AND user_id=$2`, *methodID, userID).Scan(&label)
	}
	var pid string
	if err := tx.QueryRow(`INSERT INTO payout_requests (contractor_id, amount, payment_method_id, method_label, is_auto) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		userID, amount, methodID, label, auto).Scan(&pid); err != nil {
		return "", err
	}
	tx.Exec(`UPDATE balances SET balance=balance-$1, updated_at=NOW() WHERE user_id=$2`, amount, userID)
	tx.Exec(`INSERT INTO transactions (user_id, transaction_type, status, amount, description) VALUES ($1,'payout','pending',$2,$3)`,
		userID, money(-amount), "Payout request")
	if err := tx.Commit(); err != nil {
		return "", err
	}
	return pid, nil
}

// POST /payouts
func (h *MoneyHandler) RequestPayout(c *gin.Context) {
	userID := c.GetString("user_id")
	var req PayoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	min := minPayout(h.DB, userID)
	if req.Amount < min {
		utils.Error(c, http.StatusBadRequest, fmt.Sprintf("Minimum payout is $%.2f", min))
		return
	}
	pid, err := createPayout(h.DB, userID, money(req.Amount), req.PaymentMethodID, false)
	if err != nil {
		utils.Error(c, http.StatusConflict, err.Error())
		return
	}
	notify(h.DB, userID, "payout_requested", "Payout requested", fmt.Sprintf("$%.2f · processing", req.Amount), "", "payments", gin.H{"payout_id": pid})
	utils.Success(c, http.StatusCreated, "Payout requested", gin.H{"payout_id": pid})
}

// MaybeAutoPayout is called after a contractor's balance grows.
func MaybeAutoPayout(db *sql.DB, userID string) {
	var auto bool
	if db.QueryRow(`SELECT auto_payout FROM user_settings WHERE user_id=$1`, userID).Scan(&auto) != nil || !auto {
		return
	}
	var balance float64
	db.QueryRow(`SELECT COALESCE(balance,0) FROM balances WHERE user_id=$1`, userID).Scan(&balance)
	min := minPayout(db, userID)
	if balance >= min && balance > 0 {
		if pid, err := createPayout(db, userID, money(balance), nil, true); err == nil {
			notify(db, userID, "payout_requested", "Automatic payout", fmt.Sprintf("$%.2f · processing", balance), "", "payments", gin.H{"payout_id": pid})
		}
	}
}

// GET /payouts/me
func (h *MoneyHandler) ListPayouts(c *gin.Context) {
	userID := c.GetString("user_id")
	page, limit := utils.Pagination(c)
	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM payout_requests WHERE contractor_id=$1`, userID).Scan(&total)
	rows, err := h.DB.Query(`SELECT id, amount, status, method_label, is_auto, rejected_reason, processed_at, created_at
        FROM payout_requests WHERE contractor_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, userID, limit, (page-1)*limit)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list payouts")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, status string
		var label, reason *string
		var amount float64
		var auto bool
		var processed sql.NullTime
		var at time.Time
		if rows.Scan(&id, &amount, &status, &label, &auto, &reason, &processed, &at) == nil {
			out = append(out, gin.H{"id": id, "amount": amount, "status": status, "method": label, "is_auto": auto, "rejected_reason": reason,
				"processed_at": nullTime(processed), "created_at": at})
		}
	}
	utils.Paginated(c, http.StatusOK, out, total, page, limit)
}

type PayoutDecision struct {
	Status string  `json:"status" binding:"required,oneof=approved completed rejected"`
	Reason *string `json:"reason"`
}

// PATCH /admin/payouts/:id
func (h *MoneyHandler) AdminPayoutDecision(c *gin.Context) {
	var req PayoutDecision
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var userID, cur string
	var amount float64
	if err := h.DB.QueryRow(`SELECT contractor_id, status, amount FROM payout_requests WHERE id=$1`, c.Param("id")).Scan(&userID, &cur, &amount); err != nil {
		utils.Error(c, http.StatusNotFound, "Payout not found")
		return
	}
	if cur == "completed" || cur == "rejected" {
		utils.Error(c, http.StatusConflict, "Payout already "+cur)
		return
	}
	if req.Status == "approved" && stripeEnabled() {
		if tid, err := TransferToContractor(h.DB, userID, amount, c.Param("id")); err == nil {
			req.Status = "completed"
			h.DB.Exec(`UPDATE payout_requests SET stripe_transfer_id=$1 WHERE id=$2`, tid, c.Param("id"))
		} else {
			utils.Error(c, http.StatusBadGateway, "Stripe transfer failed: "+err.Error()+" — you can still 'Mark paid' manually")
			return
		}
	}
	tx, _ := h.DB.Begin()
	defer tx.Rollback()
	tx.Exec(`UPDATE payout_requests SET status=$1::payout_status, rejected_reason=$2, processed_at=CASE WHEN $1 IN ('completed','rejected') THEN NOW() END, updated_at=NOW() WHERE id=$3`,
		req.Status, req.Reason, c.Param("id"))
	switch req.Status {
	case "completed":
		tx.Exec(`UPDATE transactions SET status='completed' WHERE user_id=$1 AND transaction_type='payout' AND status='pending' AND amount=$2`, userID, -amount)
	case "rejected":
		tx.Exec(`UPDATE balances SET balance=balance+$1, updated_at=NOW() WHERE user_id=$2`, amount, userID)
		tx.Exec(`UPDATE transactions SET status='failed' WHERE user_id=$1 AND transaction_type='payout' AND status='pending' AND amount=$2`, userID, -amount)
	}
	tx.Commit()
	switch req.Status {
	case "completed":
		notify(h.DB, userID, "payout_completed", "Payout sent", fmt.Sprintf("$%.2f is on its way", amount), "", "payments", nil)
	case "rejected":
		notify(h.DB, userID, "payout_rejected", "Payout rejected", strOr(req.Reason, "Balance returned to your account"), "", "payments", nil)
	}
	utils.Success(c, http.StatusOK, "Payout "+req.Status, nil)
}

// GET /admin/payouts?status=pending
func (h *MoneyHandler) AdminListPayouts(c *gin.Context) {
	page, limit := utils.Pagination(c)
	where := "1=1"
	args := []interface{}{}
	if v := c.Query("status"); v != "" {
		args = append(args, v)
		where = "p.status=$1::payout_status"
	}
	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM payout_requests p WHERE `+where, args...).Scan(&total)
	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query(`SELECT p.id, p.contractor_id, u.first_name || ' ' || u.last_name, u.email, p.amount, p.status, p.method_label, p.is_auto, p.created_at
        FROM payout_requests p JOIN users u ON u.id=p.contractor_id WHERE `+where+` ORDER BY p.created_at DESC LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list payouts")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, cid, name, email, status string
		var label *string
		var amount float64
		var auto bool
		var at time.Time
		if rows.Scan(&id, &cid, &name, &email, &amount, &status, &label, &auto, &at) == nil {
			out = append(out, gin.H{"id": id, "contractor_id": cid, "contractor": name, "email": email, "amount": amount, "status": status, "method": label, "is_auto": auto, "created_at": at})
		}
	}
	utils.Paginated(c, http.StatusOK, out, total, page, limit)
}

// GET /schedule?from=YYYY-MM-DD&to=YYYY-MM-DD — contractor's jobs with a date in range
func (h *MoneyHandler) Schedule(c *gin.Context) {
	userID := c.GetString("user_id")
	from := c.DefaultQuery("from", time.Now().Format("2006-01-02"))
	to := c.DefaultQuery("to", time.Now().AddDate(0, 0, 14).Format("2006-01-02"))

	rows, err := h.DB.Query(`SELECT id, request_code, title, service_category, status, location_address, location_city,
            COALESCE(scheduled_start, preferred_start_date::timestamptz) AS starts, scheduled_end, return_visit_at, consumer_id
        FROM jobs WHERE contractor_id=$1
          AND status::text NOT IN ('completed_paid','dispute_upheld','cancelled_by_client','cancelled_by_contractor','confirmed','cancelled','reassigning')
          AND (
            COALESCE(scheduled_start, preferred_start_date::timestamptz) BETWEEN $2::date AND ($3::date + 1)
            OR return_visit_at BETWEEN $2::date AND ($3::date + 1)
          )
        ORDER BY COALESCE(return_visit_at, scheduled_start, preferred_start_date::timestamptz)`, userID, from, to)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load schedule: "+err.Error())
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, title, status, consumerID string
		var code, cat, addr, city *string
		var starts, ends, ret sql.NullTime
		if rows.Scan(&id, &code, &title, &cat, &status, &addr, &city, &starts, &ends, &ret, &consumerID) == nil {
			out = append(out, gin.H{"job_id": id, "request_code": code, "title": title, "service_category": cat, "status": status,
				"address": addr, "city": city, "starts_at": nullTime(starts), "ends_at": nullTime(ends), "return_visit_at": nullTime(ret),
				"customer": loadParty(h.DB, &consumerID)})
		}
	}
	utils.Success(c, http.StatusOK, "", gin.H{"from": from, "to": to, "items": out})
}

// ---------- payment methods (tokenization via Stripe comes in the payments step) ----------

type PaymentMethodRequest struct {
	MethodType   string  `json:"method_type" binding:"required,oneof=credit_card debit_card bank_account"`
	Label        *string `json:"label"`
	CardBrand    *string `json:"card_brand"`
	CardLastFour *string `json:"card_last_four"`
	BankName     *string `json:"bank_name"`
	BankLastFour *string `json:"bank_last_four"`
	IsDefault    bool    `json:"is_default"`
	StripeID     *string `json:"stripe_payment_method_id"`
}

// GET /payment-methods
func (h *MoneyHandler) ListPaymentMethods(c *gin.Context) {
	userID := c.GetString("user_id")
	rows, err := h.DB.Query(`SELECT id, method_type, label, card_brand, card_last_four, bank_name, bank_last_four, is_default, created_at
        FROM payment_methods WHERE user_id=$1 ORDER BY is_default DESC, created_at`, userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list payment methods")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, mtype string
		var label, brand, c4, bank, b4 *string
		var def bool
		var at time.Time
		if rows.Scan(&id, &mtype, &label, &brand, &c4, &bank, &b4, &def, &at) == nil {
			out = append(out, gin.H{"id": id, "method_type": mtype, "label": label, "card_brand": brand, "card_last_four": c4,
				"bank_name": bank, "bank_last_four": b4, "is_default": def, "created_at": at})
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

// POST /payment-methods
func (h *MoneyHandler) AddPaymentMethod(c *gin.Context) {
	userID := c.GetString("user_id")
	var req PaymentMethodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var count int
	h.DB.QueryRow(`SELECT COUNT(*) FROM payment_methods WHERE user_id=$1`, userID).Scan(&count)
	if count == 0 {
		req.IsDefault = true
	}
	if req.IsDefault {
		h.DB.Exec(`UPDATE payment_methods SET is_default=FALSE WHERE user_id=$1`, userID)
	}
	var id string
	err := h.DB.QueryRow(`INSERT INTO payment_methods (user_id, method_type, label, card_brand, card_last_four, bank_name, bank_last_four, is_default, stripe_payment_method_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, userID, req.MethodType, req.Label, req.CardBrand, req.CardLastFour, req.BankName, req.BankLastFour, req.IsDefault, req.StripeID).Scan(&id)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to add payment method: "+err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "Payment method added", gin.H{"id": id, "is_default": req.IsDefault})
}

// PATCH /payment-methods/:id/default
func (h *MoneyHandler) SetDefaultPaymentMethod(c *gin.Context) {
	userID := c.GetString("user_id")
	tx, _ := h.DB.Begin()
	defer tx.Rollback()
	tx.Exec(`UPDATE payment_methods SET is_default=FALSE WHERE user_id=$1`, userID)
	res, _ := tx.Exec(`UPDATE payment_methods SET is_default=TRUE, updated_at=NOW() WHERE id=$1 AND user_id=$2`, c.Param("id"), userID)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Payment method not found")
		return
	}
	tx.Commit()
	utils.Success(c, http.StatusOK, "Default updated", nil)
}

// DELETE /payment-methods/:id
func (h *MoneyHandler) DeletePaymentMethod(c *gin.Context) {
	userID := c.GetString("user_id")
	res, _ := h.DB.Exec(`DELETE FROM payment_methods WHERE id=$1 AND user_id=$2`, c.Param("id"), userID)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Payment method not found")
		return
	}
	// keep one default
	h.DB.Exec(`UPDATE payment_methods SET is_default=TRUE WHERE id=(SELECT id FROM payment_methods WHERE user_id=$1 ORDER BY created_at LIMIT 1)
        AND NOT EXISTS (SELECT 1 FROM payment_methods WHERE user_id=$1 AND is_default)`, userID)
	utils.Success(c, http.StatusOK, "Payment method removed", nil)
}
