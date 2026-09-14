package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/models"
	"github.com/mrbuilder/backend/internal/utils"
)

type JobHandler struct {
	DB *sql.DB
}

func NewJobHandler(db *sql.DB) *JobHandler {
	return &JobHandler{DB: db}
}

const jobColumns = `id, consumer_id, contractor_id, title, description, job_type, status,
	location_address, location_city, location_state, location_zip, location_lat, location_lng,
	preferred_start_date::text, preferred_end_date::text, payment_amount, structure_type, building_type,
	main_product, side_enclosure, width_ft, length_ft, height_ft,
	accepted_at, started_at, completed_at, confirmed_at, cancelled_at, created_at, updated_at`

func scanJob(row interface{ Scan(...interface{}) error }) (*models.Job, error) {
	var j models.Job
	err := row.Scan(&j.ID, &j.ConsumerID, &j.ContractorID, &j.Title, &j.Description, &j.JobType, &j.Status,
		&j.LocationAddress, &j.LocationCity, &j.LocationState, &j.LocationZip, &j.LocationLat, &j.LocationLng,
		&j.PreferredStartDate, &j.PreferredEndDate, &j.PaymentAmount, &j.StructureType, &j.BuildingType,
		&j.MainProduct, &j.SideEnclosure, &j.WidthFt, &j.LengthFt, &j.HeightFt,
		&j.AcceptedAt, &j.StartedAt, &j.CompletedAt, &j.ConfirmedAt, &j.CancelledAt, &j.CreatedAt, &j.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &j, nil
}

func (h *JobHandler) loadImages(j *models.Job) {
	j.Images = []string{}
	rows, err := h.DB.Query(`SELECT image_url FROM job_images WHERE job_id=$1 ORDER BY created_at`, j.ID)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var u string
		if rows.Scan(&u) == nil {
			j.Images = append(j.Images, u)
		}
	}
}

// POST /jobs — consumer posts a new job
func (h *JobHandler) Create(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.CreateJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	row := h.DB.QueryRow(
		`INSERT INTO jobs (consumer_id, title, description, job_type,
		 location_address, location_city, location_state, location_zip, location_lat, location_lng,
		 preferred_start_date, preferred_end_date, payment_amount, structure_type, building_type,
		 main_product, side_enclosure, width_ft, length_ft, height_ft)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
		 RETURNING `+jobColumns,
		userID, req.Title, req.Description, req.JobType,
		req.LocationAddress, req.LocationCity, req.LocationState, req.LocationZip, req.LocationLat, req.LocationLng,
		req.PreferredStartDate, req.PreferredEndDate, req.PaymentAmount, req.StructureType, req.BuildingType,
		req.MainProduct, req.SideEnclosure, req.WidthFt, req.LengthFt, req.HeightFt,
	)

	j, err := scanJob(row)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to create job: "+err.Error())
		return
	}

	for _, img := range req.Images {
		img = strings.TrimSpace(img)
		if img != "" {
			h.DB.Exec(`INSERT INTO job_images (job_id, image_url) VALUES ($1, $2)`, j.ID, img)
		}
	}
	h.loadImages(j)

	utils.Success(c, http.StatusCreated, "Job created", j)
}

// GET /jobs — browse open (posted) jobs, with optional filters
func (h *JobHandler) ListOpen(c *gin.Context) {
	page, limit := utils.Pagination(c)

	where := []string{"status='posted'"}
	args := []interface{}{}
	add := func(cond string, val interface{}) {
		args = append(args, val)
		where = append(where, strings.Replace(cond, "?", "$"+itoa(len(args)), 1))
	}

	if v := c.Query("job_type"); v != "" {
		add("job_type = ?", v)
	}
	if v := c.Query("city"); v != "" {
		add("location_city ILIKE ?", v)
	}
	if v := c.Query("state"); v != "" {
		add("location_state ILIKE ?", v)
	}

	whereSQL := strings.Join(where, " AND ")

	var total int64
	h.DB.QueryRow("SELECT COUNT(*) FROM jobs WHERE "+whereSQL, args...).Scan(&total)

	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query(
		"SELECT "+jobColumns+" FROM jobs WHERE "+whereSQL+
			" ORDER BY created_at DESC LIMIT $"+itoa(len(args)-1)+" OFFSET $"+itoa(len(args)),
		args...,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list jobs")
		return
	}
	defer rows.Close()

	jobs := []*models.Job{}
	for rows.Next() {
		if j, err := scanJob(rows); err == nil {
			h.loadImages(j)
			jobs = append(jobs, j)
		}
	}

	utils.Paginated(c, http.StatusOK, jobs, total, page, limit)
}

// GET /jobs/me — caller's jobs (consumer: posted by them; contractor: assigned to them)
func (h *JobHandler) ListMine(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	page, limit := utils.Pagination(c)

	col := "consumer_id"
	if role == "contractor" {
		col = "contractor_id"
	}

	where := col + "=$1"
	args := []interface{}{userID}
	if v := c.Query("status"); v != "" {
		args = append(args, v)
		where += " AND status=$2"
	}

	var total int64
	h.DB.QueryRow("SELECT COUNT(*) FROM jobs WHERE "+where, args...).Scan(&total)

	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query(
		"SELECT "+jobColumns+" FROM jobs WHERE "+where+
			" ORDER BY created_at DESC LIMIT $"+itoa(len(args)-1)+" OFFSET $"+itoa(len(args)),
		args...,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list jobs")
		return
	}
	defer rows.Close()

	jobs := []*models.Job{}
	for rows.Next() {
		if j, err := scanJob(rows); err == nil {
			h.loadImages(j)
			jobs = append(jobs, j)
		}
	}

	utils.Paginated(c, http.StatusOK, jobs, total, page, limit)
}

// GET /jobs/:id
func (h *JobHandler) Get(c *gin.Context) {
	id := c.Param("id")

	row := h.DB.QueryRow("SELECT "+jobColumns+" FROM jobs WHERE id=$1", id)
	j, err := scanJob(row)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	h.loadImages(j)

	utils.Success(c, http.StatusOK, "", j)
}

// job status transition helper: verifies the actor and current status
func (h *JobHandler) transition(c *gin.Context, requiredStatus, newStatus, actorCol, timestampCol string) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	res, err := h.DB.Exec(
		"UPDATE jobs SET status=$1, "+timestampCol+"=NOW(), updated_at=NOW() WHERE id=$2 AND status=$3 AND "+actorCol+"=$4",
		newStatus, id, requiredStatus, userID,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to update job")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		utils.Error(c, http.StatusConflict, "Job is not in the required state or you are not allowed")
		return
	}

	if newStatus == "confirmed" {
		h.DB.Exec(
			`UPDATE contractor_profiles SET jobs_completed = jobs_completed + 1, updated_at=NOW()
			 WHERE user_id = (SELECT contractor_id FROM jobs WHERE id=$1)`,
			id,
		)
	}

	row := h.DB.QueryRow("SELECT "+jobColumns+" FROM jobs WHERE id=$1", id)
	j, _ := scanJob(row)
	if j != nil {
		h.loadImages(j)
	}
	utils.Success(c, http.StatusOK, "Job "+newStatus, j)
}

// PATCH /jobs/:id/start — assigned contractor starts an accepted job
func (h *JobHandler) Start(c *gin.Context) {
	h.transition(c, "accepted", "in_progress", "contractor_id", "started_at")
}

// PATCH /jobs/:id/complete — assigned contractor marks in-progress job completed
func (h *JobHandler) Complete(c *gin.Context) {
	h.transition(c, "in_progress", "completed", "contractor_id", "completed_at")
}

// PATCH /jobs/:id/confirm — consumer confirms a completed job
func (h *JobHandler) Confirm(c *gin.Context) {
	h.transition(c, "completed", "confirmed", "consumer_id", "confirmed_at")
}

// PATCH /jobs/:id/cancel — consumer or assigned contractor cancels with a reason
func (h *JobHandler) Cancel(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	id := c.Param("id")

	var req models.CancelJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	actorCol := "consumer_id"
	cancelledBy := "consumer"
	if role == "contractor" {
		actorCol = "contractor_id"
		cancelledBy = "contractor"
	}

	tx, err := h.DB.Begin()
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Transaction failed")
		return
	}
	defer tx.Rollback()

	res, err := tx.Exec(
		"UPDATE jobs SET status='cancelled', cancelled_at=NOW(), updated_at=NOW() WHERE id=$1 AND "+actorCol+"=$2 AND status IN ('posted','accepted','in_progress')",
		id, userID,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to cancel job")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		utils.Error(c, http.StatusConflict, "Job cannot be cancelled in its current state or you are not allowed")
		return
	}

	if _, err := tx.Exec(
		`INSERT INTO job_cancellations (job_id, cancelled_by, cancelled_by_user, reason) VALUES ($1, $2, $3, $4)`,
		id, cancelledBy, userID, req.Reason,
	); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to record cancellation")
		return
	}

	if err := tx.Commit(); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Transaction commit failed")
		return
	}

	row := h.DB.QueryRow("SELECT "+jobColumns+" FROM jobs WHERE id=$1", id)
	j, _ := scanJob(row)
	if j != nil {
		h.loadImages(j)
	}
	utils.Success(c, http.StatusOK, "Job cancelled", j)
}
