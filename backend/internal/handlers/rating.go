package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

type RatingHandler struct {
	DB *sql.DB
}

func NewRatingHandler(db *sql.DB) *RatingHandler {
	return &RatingHandler{DB: db}
}

type CreateRatingRequest struct {
	Score   int     `json:"score" binding:"required,min=1,max=5"`
	Comment *string `json:"comment"`
}

// POST /jobs/:id/ratings — rate the other party of a confirmed job
func (h *RatingHandler) Create(c *gin.Context) {
	userID := c.GetString("user_id")
	jobID := c.Param("id")

	var req CreateRatingRequest
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
	if status != "confirmed" {
		utils.Error(c, http.StatusConflict, "Only confirmed jobs can be rated")
		return
	}
	if contractorID == nil {
		utils.Error(c, http.StatusConflict, "Job has no contractor")
		return
	}

	var ratedUser string
	switch userID {
	case consumerID:
		ratedUser = *contractorID
	case *contractorID:
		ratedUser = consumerID
	default:
		utils.Error(c, http.StatusForbidden, "You are not a party of this job")
		return
	}

	var id string
	err := h.DB.QueryRow(
		`INSERT INTO ratings (job_id, rated_by, rated_user, score, comment) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		jobID, userID, ratedUser, req.Score, req.Comment,
	).Scan(&id)
	if err != nil {
		utils.Error(c, http.StatusConflict, "You already rated this job")
		return
	}

	// Refresh contractor's average rating if the contractor was rated
	if ratedUser == *contractorID {
		h.DB.Exec(
			`UPDATE contractor_profiles SET rating_avg =
			 (SELECT ROUND(AVG(score)::numeric, 2) FROM ratings WHERE rated_user=$1), updated_at=NOW()
			 WHERE user_id=$1`,
			ratedUser,
		)
	}

	utils.Success(c, http.StatusCreated, "Rating submitted", gin.H{"id": id, "score": req.Score})
}

// GET /jobs/:id/ratings
func (h *RatingHandler) ListForJob(c *gin.Context) {
	jobID := c.Param("id")
	rows, err := h.DB.Query(
		`SELECT r.id, r.rated_by, r.rated_user, r.score, r.comment, r.created_at,
		 u.first_name || ' ' || u.last_name
		 FROM ratings r JOIN users u ON u.id = r.rated_by WHERE r.job_id=$1 ORDER BY r.created_at`,
		jobID,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list ratings")
		return
	}
	defer rows.Close()

	list := []gin.H{}
	for rows.Next() {
		var id, ratedBy, ratedUser, byName string
		var score int
		var comment *string
		var createdAt sql.NullTime
		if rows.Scan(&id, &ratedBy, &ratedUser, &score, &comment, &createdAt, &byName) == nil {
			list = append(list, gin.H{
				"id": id, "rated_by": ratedBy, "rated_by_name": byName,
				"rated_user": ratedUser, "score": score, "comment": comment,
				"created_at": createdAt.Time,
			})
		}
	}
	utils.Success(c, http.StatusOK, "", list)
}

// GET /users/:id/ratings — ratings received by a user
func (h *RatingHandler) ListForUser(c *gin.Context) {
	targetID := c.Param("id")
	page, limit := utils.Pagination(c)

	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM ratings WHERE rated_user=$1`, targetID).Scan(&total)

	rows, err := h.DB.Query(
		`SELECT r.id, r.job_id, r.score, r.comment, r.created_at, u.first_name || ' ' || u.last_name
		 FROM ratings r JOIN users u ON u.id = r.rated_by
		 WHERE r.rated_user=$1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
		targetID, limit, (page-1)*limit,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list ratings")
		return
	}
	defer rows.Close()

	list := []gin.H{}
	for rows.Next() {
		var id, jobID, byName string
		var score int
		var comment *string
		var createdAt sql.NullTime
		if rows.Scan(&id, &jobID, &score, &comment, &createdAt, &byName) == nil {
			list = append(list, gin.H{
				"id": id, "job_id": jobID, "score": score, "comment": comment,
				"rated_by_name": byName, "created_at": createdAt.Time,
			})
		}
	}
	utils.Paginated(c, http.StatusOK, list, total, page, limit)
}
