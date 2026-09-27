package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

// POST /me/password {current_password?, new_password} — signed-in user changes their password.
// current_password is verified when the account has one; other sessions are signed out.
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		Current string `json:"current_password"`
		New     string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "New password must be at least 8 characters")
		return
	}
	var hash *string
	if h.DB.QueryRow(`SELECT password_hash FROM users WHERE id=$1`, userID).Scan(&hash) != nil {
		utils.Error(c, http.StatusNotFound, "Account not found")
		return
	}
	if hash != nil && *hash != "" {
		if req.Current == "" {
			utils.Error(c, http.StatusBadRequest, "Enter your current password")
			return
		}
		if !utils.CheckPassword(req.Current, *hash) {
			utils.Error(c, http.StatusBadRequest, "Current password is incorrect")
			return
		}
	}
	newHash, err := utils.HashPassword(req.New)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Could not update password")
		return
	}
	h.DB.Exec(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, newHash, userID)
	h.DB.Exec(`UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`, userID)
	utils.Success(c, http.StatusOK, "Password updated", nil)
}
