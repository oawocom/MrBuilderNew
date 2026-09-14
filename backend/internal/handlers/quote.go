package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/models"
	"github.com/mrbuilder/backend/internal/utils"
)

type QuoteHandler struct {
	DB *sql.DB
}

func NewQuoteHandler(db *sql.DB) *QuoteHandler {
	return &QuoteHandler{DB: db}
}

const quoteColumns = `id, job_id, contractor_id, amount, title, description, line_items::text,
	status, is_read, valid_until, accepted_at, rejected_at, created_at, updated_at`

func scanQuote(row interface{ Scan(...interface{}) error }) (*models.JobQuote, error) {
	var q models.JobQuote
	err := row.Scan(&q.ID, &q.JobID, &q.ContractorID, &q.Amount, &q.Title, &q.Description, &q.LineItems,
		&q.Status, &q.IsRead, &q.ValidUntil, &q.AcceptedAt, &q.RejectedAt, &q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &q, nil
}

// POST /jobs/:id/quotes — contractor sends a quote for a posted job
func (h *QuoteHandler) Create(c *gin.Context) {
	userID := c.GetString("user_id")
	jobID := c.Param("id")

	var req models.CreateQuoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var status, consumerID string
	if err := h.DB.QueryRow(`SELECT status, consumer_id FROM jobs WHERE id=$1`, jobID).Scan(&status, &consumerID); err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if status != "posted" {
		utils.Error(c, http.StatusConflict, "Quotes can only be sent for posted jobs")
		return
	}
	if consumerID == userID {
		utils.Error(c, http.StatusForbidden, "You cannot quote your own job")
		return
	}

	row := h.DB.QueryRow(
		`INSERT INTO job_quotes (job_id, contractor_id, amount, title, description, line_items, valid_until)
		 VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
		 RETURNING `+quoteColumns,
		jobID, userID, req.Amount, req.Title, req.Description, req.LineItems, req.ValidUntil,
	)
	q, err := scanQuote(row)
	if err != nil {
		utils.Error(c, http.StatusConflict, "You already sent a quote for this job")
		return
	}

	// Notify the consumer
	h.DB.Exec(
		`INSERT INTO notifications (user_id, notification_type, title, body, job_id)
		 VALUES ($1, 'new_job', 'New quote received', 'A contractor sent a quote for your job', $2)`,
		consumerID, jobID,
	)

	utils.Success(c, http.StatusCreated, "Quote sent", q)
}

// GET /jobs/:id/quotes — consumer sees all quotes for their job; contractor sees own
func (h *QuoteHandler) ListForJob(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	jobID := c.Param("id")

	var consumerID string
	if err := h.DB.QueryRow(`SELECT consumer_id FROM jobs WHERE id=$1`, jobID).Scan(&consumerID); err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}

	var rows *sql.Rows
	var err error
	if role == "consumer" || role == "admin" {
		if role == "consumer" && consumerID != userID {
			utils.Error(c, http.StatusForbidden, "Not your job")
			return
		}
		rows, err = h.DB.Query("SELECT "+quoteColumns+" FROM job_quotes WHERE job_id=$1 ORDER BY created_at DESC", jobID)
		// Mark quotes as read when the consumer opens them
		h.DB.Exec(`UPDATE job_quotes SET is_read=TRUE WHERE job_id=$1`, jobID)
	} else {
		rows, err = h.DB.Query("SELECT "+quoteColumns+" FROM job_quotes WHERE job_id=$1 AND contractor_id=$2", jobID, userID)
	}
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list quotes")
		return
	}
	defer rows.Close()

	quotes := []*models.JobQuote{}
	for rows.Next() {
		if q, e := scanQuote(rows); e == nil {
			quotes = append(quotes, q)
		}
	}
	utils.Success(c, http.StatusOK, "", quotes)
}

// GET /quotes/me — contractor's own quotes
func (h *QuoteHandler) ListMine(c *gin.Context) {
	userID := c.GetString("user_id")
	page, limit := utils.Pagination(c)

	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM job_quotes WHERE contractor_id=$1`, userID).Scan(&total)

	rows, err := h.DB.Query(
		"SELECT "+quoteColumns+" FROM job_quotes WHERE contractor_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
		userID, limit, (page-1)*limit,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list quotes")
		return
	}
	defer rows.Close()

	quotes := []*models.JobQuote{}
	for rows.Next() {
		if q, e := scanQuote(rows); e == nil {
			quotes = append(quotes, q)
		}
	}
	utils.Paginated(c, http.StatusOK, quotes, total, page, limit)
}

// PATCH /quotes/:id/accept — consumer accepts a quote:
// quote -> accepted, other quotes -> rejected, job -> accepted + contractor assigned, invoice created.
func (h *QuoteHandler) Accept(c *gin.Context) {
	userID := c.GetString("user_id")
	quoteID := c.Param("id")

	var jobID, contractorID string
	var amount float64
	var qStatus, jStatus, consumerID string
	err := h.DB.QueryRow(
		`SELECT q.job_id, q.contractor_id, q.amount, q.status, j.status, j.consumer_id
		 FROM job_quotes q JOIN jobs j ON j.id = q.job_id WHERE q.id=$1`,
		quoteID,
	).Scan(&jobID, &contractorID, &amount, &qStatus, &jStatus, &consumerID)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Quote not found")
		return
	}
	if consumerID != userID {
		utils.Error(c, http.StatusForbidden, "Not your job")
		return
	}
	if qStatus != "pending" {
		utils.Error(c, http.StatusConflict, "Quote is not pending")
		return
	}
	if jStatus != "posted" {
		utils.Error(c, http.StatusConflict, "Job is not open")
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Transaction failed")
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE job_quotes SET status='accepted', accepted_at=NOW(), updated_at=NOW() WHERE id=$1`, quoteID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to accept quote")
		return
	}
	if _, err := tx.Exec(
		`UPDATE job_quotes SET status='rejected', rejected_at=NOW(), updated_at=NOW() WHERE job_id=$1 AND id<>$2 AND status='pending'`,
		jobID, quoteID,
	); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to reject other quotes")
		return
	}
	if _, err := tx.Exec(
		`UPDATE jobs SET status='accepted', contractor_id=$1, payment_amount=$2, accepted_at=NOW(), updated_at=NOW() WHERE id=$3`,
		contractorID, amount, jobID,
	); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to update job")
		return
	}

	var invoiceID string
	if err := tx.QueryRow(
		`INSERT INTO invoices (job_id, quote_id, consumer_id, contractor_id, amount, description)
		 VALUES ($1, $2, $3, $4, $5, 'Invoice for accepted quote') RETURNING id`,
		jobID, quoteID, consumerID, contractorID, amount,
	).Scan(&invoiceID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to create invoice")
		return
	}

	if err := tx.Commit(); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Transaction commit failed")
		return
	}

	// Notify the contractor
	h.DB.Exec(
		`INSERT INTO notifications (user_id, notification_type, title, body, job_id)
		 VALUES ($1, 'job_accepted', 'Quote accepted', 'Your quote was accepted. You are assigned to the job.', $2)`,
		contractorID, jobID,
	)

	utils.Success(c, http.StatusOK, "Quote accepted", gin.H{
		"quote_id":   quoteID,
		"job_id":     jobID,
		"invoice_id": invoiceID,
	})
}

// PATCH /quotes/:id/reject — consumer rejects a quote
func (h *QuoteHandler) Reject(c *gin.Context) {
	userID := c.GetString("user_id")
	quoteID := c.Param("id")

	res, err := h.DB.Exec(
		`UPDATE job_quotes q SET status='rejected', rejected_at=NOW(), updated_at=NOW()
		 FROM jobs j WHERE q.id=$1 AND q.job_id=j.id AND j.consumer_id=$2 AND q.status='pending'`,
		quoteID, userID,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to reject quote")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusConflict, "Quote not found, not yours, or not pending")
		return
	}
	utils.Success(c, http.StatusOK, "Quote rejected", nil)
}

// PATCH /quotes/:id/withdraw — contractor withdraws their pending quote
func (h *QuoteHandler) Withdraw(c *gin.Context) {
	userID := c.GetString("user_id")
	quoteID := c.Param("id")

	res, err := h.DB.Exec(
		`UPDATE job_quotes SET status='withdrawn', updated_at=NOW() WHERE id=$1 AND contractor_id=$2 AND status='pending'`,
		quoteID, userID,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to withdraw quote")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusConflict, "Quote not found, not yours, or not pending")
		return
	}
	utils.Success(c, http.StatusOK, "Quote withdrawn", nil)
}

// GET /invoices/me — caller's invoices (both roles)
func (h *QuoteHandler) ListMyInvoices(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	page, limit := utils.Pagination(c)

	col := "consumer_id"
	if role == "contractor" {
		col = "contractor_id"
	}

	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM invoices WHERE `+col+`=$1`, userID).Scan(&total)

	rows, err := h.DB.Query(
		`SELECT id, job_id, quote_id, consumer_id, contractor_id, amount, description, status, is_read,
		 stripe_payment_intent_id, stripe_checkout_session_id, paid_at, cancelled_at, created_at, updated_at
		 FROM invoices WHERE `+col+`=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, (page-1)*limit,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list invoices")
		return
	}
	defer rows.Close()

	invoices := []*models.Invoice{}
	for rows.Next() {
		var inv models.Invoice
		if err := rows.Scan(&inv.ID, &inv.JobID, &inv.QuoteID, &inv.ConsumerID, &inv.ContractorID,
			&inv.Amount, &inv.Description, &inv.Status, &inv.IsRead,
			&inv.StripePaymentIntentID, &inv.StripeCheckoutSessionID,
			&inv.PaidAt, &inv.CancelledAt, &inv.CreatedAt, &inv.UpdatedAt); err == nil {
			invoices = append(invoices, &inv)
		}
	}
	utils.Paginated(c, http.StatusOK, invoices, total, page, limit)
}
