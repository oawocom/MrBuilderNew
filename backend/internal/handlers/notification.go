package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

type NotificationHandler struct {
	DB *sql.DB
}

func NewNotificationHandler(db *sql.DB) *NotificationHandler {
	return &NotificationHandler{DB: db}
}

// GET /notifications — caller's notifications, newest first, with unread count
func (h *NotificationHandler) List(c *gin.Context) {
	userID := c.GetString("user_id")
	page, limit := utils.Pagination(c)

	var total, unread int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM notifications WHERE user_id=$1`, userID).Scan(&total)
	h.DB.QueryRow(`SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=FALSE`, userID).Scan(&unread)

	rows, err := h.DB.Query(
		`SELECT id, notification_type, title, body, job_id, is_read, created_at
		 FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, (page-1)*limit,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list notifications")
		return
	}
	defer rows.Close()

	list := []gin.H{}
	for rows.Next() {
		var id, ntype, title string
		var body *string
		var jobID *string
		var isRead bool
		var createdAt sql.NullTime
		if rows.Scan(&id, &ntype, &title, &body, &jobID, &isRead, &createdAt) == nil {
			list = append(list, gin.H{
				"id": id, "notification_type": ntype, "title": title, "body": body,
				"job_id": jobID, "is_read": isRead, "created_at": createdAt.Time,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    list,
		"meta":    gin.H{"total": total, "unread": unread, "page": page, "limit": limit},
	})
}

// PATCH /notifications/:id/read
func (h *NotificationHandler) MarkRead(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	res, _ := h.DB.Exec(`UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2`, id, userID)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Notification not found")
		return
	}
	utils.Success(c, http.StatusOK, "Marked as read", nil)
}

// PATCH /notifications/read-all
func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID := c.GetString("user_id")
	h.DB.Exec(`UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE`, userID)
	utils.Success(c, http.StatusOK, "All marked as read", nil)
}
