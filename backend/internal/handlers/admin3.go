package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

// GET /admin/team — admin accounts
func (h *TrainingHandler) AdminListTeam(c *gin.Context) {
	rows, err := h.DB.Query(`SELECT id, email, first_name, last_name, phone, status::text, last_login_at, created_at FROM users WHERE role='admin' ORDER BY created_at`)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list team")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, email, first, last, status string
		var phone *string
		var lastLogin sql.NullTime
		var created time.Time
		if rows.Scan(&id, &email, &first, &last, &phone, &status, &lastLogin, &created) == nil {
			out = append(out, gin.H{"id": id, "email": email, "first_name": first, "last_name": last, "phone": phone, "status": status, "last_login_at": nullTime(lastLogin), "created_at": created})
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}
