package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/mrbuilder/backend/internal/utils"
)

type WarrantyHandler struct {
	DB *sql.DB
}

func NewWarrantyHandler(db *sql.DB) *WarrantyHandler {
	return &WarrantyHandler{DB: db}
}

type warrantyRow struct {
	ID           string    `json:"id"`
	JobID        string    `json:"job_id"`
	JobTitle     string    `json:"job_title"`
	ConsumerID   string    `json:"consumer_id"`
	ContractorID *string   `json:"contractor_id"`
	WarrantyType string    `json:"warranty_type"`
	Status       string    `json:"status"`
	StartDate    time.Time `json:"start_date"`
	EndDate      time.Time `json:"end_date"`
	CreatedAt    time.Time `json:"created_at"`
}

// POST /jobs/:id/warranties — assigned contractor issues a warranty for a confirmed job
func (h *WarrantyHandler) Create(c *gin.Context) {
	userID := c.GetString("user_id")
	jobID := c.Param("id")

	var req struct {
		WarrantyType string `json:"warranty_type" binding:"required,oneof=structural labor materials"`
		Years        int    `json:"years" binding:"required,min=1,max=25"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var consumerID string
	var contractorID *string
	var status string
	if err := h.DB.QueryRow(`SELECT consumer_id, contractor_id, status FROM jobs WHERE id=$1`, jobID).
		Scan(&consumerID, &contractorID, &status); err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if contractorID == nil || *contractorID != userID {
		utils.Error(c, http.StatusForbidden, "Only the assigned contractor can issue a warranty")
		return
	}
	if status != "confirmed" {
		utils.Error(c, http.StatusConflict, "Warranties can only be issued for confirmed jobs")
		return
	}

	var id string
	err := h.DB.QueryRow(
		`INSERT INTO warranties (job_id, consumer_id, contractor_id, warranty_type, end_date)
		 VALUES ($1, $2, $3, $4, NOW() + ($5 || ' years')::interval) RETURNING id`,
		jobID, consumerID, userID, req.WarrantyType, req.Years,
	).Scan(&id)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to create warranty")
		return
	}

	h.DB.Exec(
		`INSERT INTO notifications (user_id, notification_type, title, body, job_id)
		 VALUES ($1, 'system', 'Warranty issued', 'A warranty document was issued for your job', $2)`,
		consumerID, jobID,
	)

	utils.Success(c, http.StatusCreated, "Warranty issued", gin.H{"id": id})
}

// GET /warranties/me
func (h *WarrantyHandler) ListMine(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")

	col := "w.consumer_id"
	if role == "contractor" {
		col = "w.contractor_id"
	}

	rows, err := h.DB.Query(
		`SELECT w.id, w.job_id, j.title, w.consumer_id, w.contractor_id, w.warranty_type,
		 CASE WHEN w.end_date < NOW() THEN 'expired' ELSE w.status::text END,
		 w.start_date, w.end_date, w.created_at
		 FROM warranties w JOIN jobs j ON j.id = w.job_id
		 WHERE `+col+`=$1 ORDER BY w.created_at DESC`,
		userID,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list warranties")
		return
	}
	defer rows.Close()

	list := []warrantyRow{}
	for rows.Next() {
		var w warrantyRow
		if rows.Scan(&w.ID, &w.JobID, &w.JobTitle, &w.ConsumerID, &w.ContractorID, &w.WarrantyType,
			&w.Status, &w.StartDate, &w.EndDate, &w.CreatedAt) == nil {
			list = append(list, w)
		}
	}
	utils.Success(c, http.StatusOK, "", list)
}

// POST /warranties/:id/claims — consumer files a claim on their active warranty
func (h *WarrantyHandler) CreateClaim(c *gin.Context) {
	userID := c.GetString("user_id")
	warrantyID := c.Param("id")

	var req struct {
		IssueDescription string   `json:"issue_description" binding:"required"`
		DateIssueStarted string   `json:"date_issue_started"`
		EvidencePhotos   []string `json:"evidence_photos"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var jobID, wType, consumerID string
	var endDate time.Time
	if err := h.DB.QueryRow(
		`SELECT job_id, warranty_type::text, consumer_id, end_date FROM warranties WHERE id=$1`, warrantyID,
	).Scan(&jobID, &wType, &consumerID, &endDate); err != nil {
		utils.Error(c, http.StatusNotFound, "Warranty not found")
		return
	}
	if consumerID != userID {
		utils.Error(c, http.StatusForbidden, "Not your warranty")
		return
	}
	if time.Now().After(endDate) {
		utils.Error(c, http.StatusConflict, "Warranty has expired")
		return
	}

	var dateStarted interface{}
	if req.DateIssueStarted != "" {
		dateStarted = req.DateIssueStarted
	}

	var id string
	err := h.DB.QueryRow(
		`INSERT INTO warranty_claims (warranty_id, job_id, consumer_id, warranty_type, issue_description, date_issue_started, evidence_photos)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		warrantyID, jobID, userID, wType, req.IssueDescription, dateStarted, pq.Array(req.EvidencePhotos),
	).Scan(&id)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to create claim")
		return
	}

	utils.Success(c, http.StatusCreated, "Claim submitted", gin.H{"id": id})
}

// GET /claims/me
func (h *WarrantyHandler) ListMyClaims(c *gin.Context) {
	userID := c.GetString("user_id")

	rows, err := h.DB.Query(
		`SELECT wc.id, wc.warranty_id, wc.job_id, j.title, wc.warranty_type::text, wc.issue_description,
		 wc.status::text, wc.created_at
		 FROM warranty_claims wc JOIN jobs j ON j.id = wc.job_id
		 WHERE wc.consumer_id=$1 ORDER BY wc.created_at DESC`,
		userID,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list claims")
		return
	}
	defer rows.Close()

	list := []gin.H{}
	for rows.Next() {
		var id, wid, jid, title, wtype, desc, status string
		var createdAt time.Time
		if rows.Scan(&id, &wid, &jid, &title, &wtype, &desc, &status, &createdAt) == nil {
			list = append(list, gin.H{
				"id": id, "warranty_id": wid, "job_id": jid, "job_title": title,
				"warranty_type": wtype, "issue_description": desc, "status": status, "created_at": createdAt,
			})
		}
	}
	utils.Success(c, http.StatusOK, "", list)
}
