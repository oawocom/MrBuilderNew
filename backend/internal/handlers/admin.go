package handlers

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

type AdminHandler struct {
	DB *sql.DB
}

func NewAdminHandler(db *sql.DB) *AdminHandler {
	return &AdminHandler{DB: db}
}

// GET /admin/stats
func (h *AdminHandler) Stats(c *gin.Context) {
	stats := gin.H{}

	var consumers, contractors, admins int64
	h.DB.QueryRow(`SELECT
		COUNT(*) FILTER (WHERE role='consumer'),
		COUNT(*) FILTER (WHERE role='contractor'),
		COUNT(*) FILTER (WHERE role='admin') FROM users`).Scan(&consumers, &contractors, &admins)
	stats["users"] = gin.H{"consumers": consumers, "contractors": contractors, "admins": admins, "total": consumers + contractors + admins}

	jobRows, err := h.DB.Query(`SELECT status::text, COUNT(*) FROM jobs GROUP BY status`)
	jobs := gin.H{}
	var jobsTotal int64
	if err == nil {
		defer jobRows.Close()
		for jobRows.Next() {
			var s string
			var n int64
			if jobRows.Scan(&s, &n) == nil {
				jobs[s] = n
				jobsTotal += n
			}
		}
	}
	jobs["total"] = jobsTotal
	stats["jobs"] = jobs

	var quotesTotal, quotesPending int64
	h.DB.QueryRow(`SELECT COUNT(*), COUNT(*) FILTER (WHERE status='pending') FROM job_quotes`).Scan(&quotesTotal, &quotesPending)
	stats["quotes"] = gin.H{"total": quotesTotal, "pending": quotesPending}

	var invTotal, invPaid int64
	var invPaidSum, invPendingSum sql.NullFloat64
	h.DB.QueryRow(`SELECT COUNT(*), COUNT(*) FILTER (WHERE status='paid'),
		COALESCE(SUM(amount) FILTER (WHERE status='paid'),0),
		COALESCE(SUM(amount) FILTER (WHERE status='pending'),0) FROM invoices`).
		Scan(&invTotal, &invPaid, &invPaidSum, &invPendingSum)
	stats["invoices"] = gin.H{"total": invTotal, "paid": invPaid, "paid_sum": invPaidSum.Float64, "pending_sum": invPendingSum.Float64}

	var claimsPending int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM warranty_claims WHERE status IN ('pending','under_review')`).Scan(&claimsPending)
	stats["claims_pending"] = claimsPending

	var waitlistN, partnersN int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM waitlist`).Scan(&waitlistN)
	h.DB.QueryRow(`SELECT COUNT(*) FROM partner_requests`).Scan(&partnersN)
	stats["waitlist"] = waitlistN
	stats["partner_requests"] = partnersN

	utils.Success(c, http.StatusOK, "", stats)
}

// GET /admin/users?search=&role=&status=
func (h *AdminHandler) ListUsers(c *gin.Context) {
	page, limit := utils.Pagination(c)

	where := []string{"1=1"}
	args := []interface{}{}
	add := func(cond string, val interface{}) {
		args = append(args, val)
		where = append(where, strings.Replace(cond, "?", "$"+itoa(len(args)), 1))
	}
	if v := c.Query("search"); v != "" {
		add("(email ILIKE ? OR first_name ILIKE '%'||TRIM(?,'%')||'%' OR last_name ILIKE '%'||TRIM(?,'%')||'%')", "%"+v+"%")
		// simpler: single email/name search on email only if complex fails
	}
	if v := c.Query("role"); v != "" {
		add("role = ?::user_role", v)
	}
	if v := c.Query("status"); v != "" {
		add("status = ?::account_status", v)
	}
	whereSQL := strings.Join(where, " AND ")

	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE `+whereSQL, args...).Scan(&total)

	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query(
		`SELECT id, email, first_name, last_name, role::text, status::text, created_at, last_login_at
		 FROM users WHERE `+whereSQL+` ORDER BY created_at DESC LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)),
		args...,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list users")
		return
	}
	defer rows.Close()

	list := []gin.H{}
	for rows.Next() {
		var id, email, fn, ln, role, status string
		var createdAt time.Time
		var lastLogin *time.Time
		if rows.Scan(&id, &email, &fn, &ln, &role, &status, &createdAt, &lastLogin) == nil {
			list = append(list, gin.H{
				"id": id, "email": email, "first_name": fn, "last_name": ln,
				"role": role, "status": status, "created_at": createdAt, "last_login_at": lastLogin,
			})
		}
	}
	utils.Paginated(c, http.StatusOK, list, total, page, limit)
}

// PATCH /admin/users/:id/status {status}
func (h *AdminHandler) SetUserStatus(c *gin.Context) {
	var req struct {
		Status string `json:"status" binding:"required,oneof=pending active suspended deactivated"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	res, err := h.DB.Exec(`UPDATE users SET status=$1::account_status, updated_at=NOW() WHERE id=$2`, req.Status, c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to update user")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "User not found")
		return
	}
	utils.Success(c, http.StatusOK, "User status updated", nil)
}

// GET /admin/jobs?status=
func (h *AdminHandler) ListJobs(c *gin.Context) {
	page, limit := utils.Pagination(c)

	where := "1=1"
	args := []interface{}{}
	if v := c.Query("status"); v != "" {
		args = append(args, v)
		where = "j.status = $1::job_status"
	}

	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM jobs j WHERE `+where, args...).Scan(&total)

	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query(
		`SELECT j.id, j.title, j.job_type::text, j.status::text, j.payment_amount, j.created_at,
		 uc.first_name || ' ' || uc.last_name AS consumer,
		 COALESCE(ut.first_name || ' ' || ut.last_name, '') AS contractor
		 FROM jobs j
		 JOIN users uc ON uc.id = j.consumer_id
		 LEFT JOIN users ut ON ut.id = j.contractor_id
		 WHERE `+where+` ORDER BY j.created_at DESC LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)),
		args...,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list jobs")
		return
	}
	defer rows.Close()

	list := []gin.H{}
	for rows.Next() {
		var id, title, jtype, status, consumer, contractor string
		var amount *float64
		var createdAt time.Time
		if rows.Scan(&id, &title, &jtype, &status, &amount, &createdAt, &consumer, &contractor) == nil {
			list = append(list, gin.H{
				"id": id, "title": title, "job_type": jtype, "status": status,
				"payment_amount": amount, "created_at": createdAt,
				"consumer": consumer, "contractor": contractor,
			})
		}
	}
	utils.Paginated(c, http.StatusOK, list, total, page, limit)
}

// GET /admin/claims
func (h *AdminHandler) ListClaims(c *gin.Context) {
	rows, err := h.DB.Query(
		`SELECT wc.id, wc.status::text, wc.warranty_type::text, wc.issue_description, wc.admin_notes, wc.created_at,
		 j.title, u.first_name || ' ' || u.last_name
		 FROM warranty_claims wc
		 JOIN jobs j ON j.id = wc.job_id
		 JOIN users u ON u.id = wc.consumer_id
		 ORDER BY wc.created_at DESC LIMIT 100`,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list claims")
		return
	}
	defer rows.Close()

	list := []gin.H{}
	for rows.Next() {
		var id, status, wtype, desc, jobTitle, consumer string
		var notes *string
		var createdAt time.Time
		if rows.Scan(&id, &status, &wtype, &desc, &notes, &createdAt, &jobTitle, &consumer) == nil {
			list = append(list, gin.H{
				"id": id, "status": status, "warranty_type": wtype, "issue_description": desc,
				"admin_notes": notes, "created_at": createdAt, "job_title": jobTitle, "consumer": consumer,
			})
		}
	}
	utils.Success(c, http.StatusOK, "", list)
}

// PATCH /admin/claims/:id {status, admin_notes}
func (h *AdminHandler) SetClaimStatus(c *gin.Context) {
	var req struct {
		Status     string  `json:"status" binding:"required,oneof=pending under_review approved denied resolved cancelled"`
		AdminNotes *string `json:"admin_notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	extra := ""
	if req.Status == "resolved" {
		extra = ", resolution_date=NOW()"
	}
	res, err := h.DB.Exec(
		`UPDATE warranty_claims SET status=$1::warranty_claim_status, admin_notes=COALESCE($2, admin_notes), updated_at=NOW()`+extra+` WHERE id=$3`,
		req.Status, req.AdminNotes, c.Param("id"),
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to update claim")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Claim not found")
		return
	}
	utils.Success(c, http.StatusOK, "Claim updated", nil)
}

// GET /admin/waitlist
func (h *AdminHandler) ListWaitlist(c *gin.Context) {
	rows, err := h.DB.Query(`SELECT id, full_name, email, phone, interested_role::text, state, city, COALESCE(status,'pending'), created_at FROM waitlist ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list waitlist")
		return
	}
	defer rows.Close()
	list := []gin.H{}
	for rows.Next() {
		var id, name, email, status string
		var phone, role, state, city *string
		var createdAt time.Time
		if rows.Scan(&id, &name, &email, &phone, &role, &state, &city, &status, &createdAt) == nil {
			list = append(list, gin.H{"id": id, "full_name": name, "email": email, "phone": phone, "interested_role": role, "state": state, "city": city, "status": status, "created_at": createdAt})
		}
	}
	utils.Success(c, http.StatusOK, "", list)
}

// GET /admin/partner-requests
func (h *AdminHandler) ListPartnerRequests(c *gin.Context) {
	rows, err := h.DB.Query(`SELECT id, company_name, contact_person, email, phone, website_url, type_of_business::text, message, created_at FROM partner_requests ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list partner requests")
		return
	}
	defer rows.Close()
	list := []gin.H{}
	for rows.Next() {
		var id, company, contact, email, btype string
		var phone, site, msg *string
		var createdAt time.Time
		if rows.Scan(&id, &company, &contact, &email, &phone, &site, &btype, &msg, &createdAt) == nil {
			list = append(list, gin.H{"id": id, "company_name": company, "contact_person": contact, "email": email, "phone": phone, "website_url": site, "type_of_business": btype, "message": msg, "created_at": createdAt})
		}
	}
	utils.Success(c, http.StatusOK, "", list)
}

// GET /admin/invoices
func (h *AdminHandler) ListInvoices(c *gin.Context) {
	page, limit := utils.Pagination(c)

	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM invoices`).Scan(&total)

	rows, err := h.DB.Query(
		`SELECT i.id, i.amount, i.status::text, i.created_at, i.paid_at, j.title,
		 uc.first_name || ' ' || uc.last_name, ut.first_name || ' ' || ut.last_name
		 FROM invoices i
		 JOIN jobs j ON j.id = i.job_id
		 JOIN users uc ON uc.id = i.consumer_id
		 JOIN users ut ON ut.id = i.contractor_id
		 ORDER BY i.created_at DESC LIMIT $1 OFFSET $2`,
		limit, (page-1)*limit,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list invoices")
		return
	}
	defer rows.Close()

	list := []gin.H{}
	for rows.Next() {
		var id, status, jobTitle, consumer, contractor string
		var amount float64
		var createdAt time.Time
		var paidAt *time.Time
		if rows.Scan(&id, &amount, &status, &createdAt, &paidAt, &jobTitle, &consumer, &contractor) == nil {
			list = append(list, gin.H{
				"id": id, "amount": amount, "status": status, "created_at": createdAt, "paid_at": paidAt,
				"job_title": jobTitle, "consumer": consumer, "contractor": contractor,
			})
		}
	}
	utils.Paginated(c, http.StatusOK, list, total, page, limit)
}

// GET /admin/warranties
func (h *AdminHandler) ListWarranties(c *gin.Context) {
	rows, err := h.DB.Query(
		`SELECT w.id, w.warranty_type::text,
		 CASE WHEN w.end_date < NOW() THEN 'expired' ELSE w.status::text END,
		 w.start_date, w.end_date, j.title,
		 uc.first_name || ' ' || uc.last_name,
		 COALESCE(ut.first_name || ' ' || ut.last_name, '')
		 FROM warranties w
		 JOIN jobs j ON j.id = w.job_id
		 JOIN users uc ON uc.id = w.consumer_id
		 LEFT JOIN users ut ON ut.id = w.contractor_id
		 ORDER BY w.created_at DESC LIMIT 200`,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list warranties")
		return
	}
	defer rows.Close()

	list := []gin.H{}
	for rows.Next() {
		var id, wtype, status, jobTitle, consumer, contractor string
		var start, end time.Time
		if rows.Scan(&id, &wtype, &status, &start, &end, &jobTitle, &consumer, &contractor) == nil {
			list = append(list, gin.H{
				"id": id, "warranty_type": wtype, "status": status,
				"start_date": start, "end_date": end,
				"job_title": jobTitle, "consumer": consumer, "contractor": contractor,
			})
		}
	}
	utils.Success(c, http.StatusOK, "", list)
}


// PATCH /admin/waitlist/:id/activate
func (h *AdminHandler) ActivateWaitlist(c *gin.Context) {
	res, err := h.DB.Exec(`UPDATE waitlist SET status='activated' WHERE id=$1`, c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to activate")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Entry not found")
		return
	}
	utils.Success(c, http.StatusOK, "Activated", nil)
}

// GET /admin/system — db size etc.
func (h *AdminHandler) SystemInfo(c *gin.Context) {
	var size string
	h.DB.QueryRow(`SELECT pg_size_pretty(pg_database_size(current_database()))`).Scan(&size)
	utils.Success(c, http.StatusOK, "", gin.H{"db_size": size})
}
