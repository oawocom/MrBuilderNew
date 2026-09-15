package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/models"
	"github.com/mrbuilder/backend/internal/utils"
)

type AuthHandler struct {
	DB        *sql.DB
	JWTSecret string
}

func NewAuthHandler(db *sql.DB, jwtSecret string) *AuthHandler {
	return &AuthHandler{DB: db, JWTSecret: jwtSecret}
}

func (h *AuthHandler) issueTokens(userID, role string) (*models.TokenPair, error) {
	access, err := utils.GenerateToken(userID, role, h.JWTSecret)
	if err != nil {
		return nil, err
	}

	refresh, err := utils.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	_, err = h.DB.Exec(
		`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
		userID, refresh, time.Now().Add(utils.RefreshTokenTTL),
	)
	if err != nil {
		return nil, err
	}

	return &models.TokenPair{AccessToken: access, RefreshToken: refresh}, nil
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var exists bool
	h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)", req.Email).Scan(&exists)
	if exists {
		utils.Error(c, http.StatusConflict, "Email already registered")
		return
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	var user models.User
	err = h.DB.QueryRow(
		`INSERT INTO users (email, password_hash, phone, first_name, last_name, role, status)
		 VALUES ($1, $2, $3, $4, $5, $6, 'active')
		 RETURNING id, email, phone, first_name, last_name, role, status, email_verified, phone_verified, created_at, updated_at`,
		req.Email, hash, req.Phone, req.FirstName, req.LastName, req.Role,
	).Scan(&user.ID, &user.Email, &user.Phone, &user.FirstName, &user.LastName,
		&user.Role, &user.Status, &user.EmailVerified, &user.PhoneVerified,
		&user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// Create profile based on role
	if req.Role == "contractor" {
		h.DB.Exec("INSERT INTO contractor_profiles (user_id, role) VALUES ($1, 'service_team')", user.ID)
	} else {
		h.DB.Exec("INSERT INTO consumer_profiles (user_id) VALUES ($1)", user.ID)
	}

	// Create default settings
	h.DB.Exec("INSERT INTO user_settings (user_id) VALUES ($1)", user.ID)

	tokens, err := h.issueTokens(user.ID, user.Role)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to issue tokens")
		return
	}

	utils.Success(c, http.StatusCreated, "Registration successful", models.AuthResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		User:         user,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var user models.User
	err := h.DB.QueryRow(
		`SELECT id, email, password_hash, phone, first_name, last_name, role, status,
		 email_verified, phone_verified, created_at, updated_at
		 FROM users WHERE email=$1`,
		req.Email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Phone,
		&user.FirstName, &user.LastName, &user.Role, &user.Status,
		&user.EmailVerified, &user.PhoneVerified, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		utils.Error(c, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		utils.Error(c, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if user.Status == "suspended" {

		utils.Error(c, http.StatusForbidden, "Account is suspended")

		return

	}

	if user.Status == "deactivated" {

		var restored bool

		h.DB.QueryRow(`UPDATE users SET status='active', deletion_requested_at=NULL, updated_at=NOW() WHERE id=$1 AND deletion_requested_at IS NOT NULL AND deleted_at IS NULL RETURNING TRUE`, user.ID).Scan(&restored)

		if !restored {

			utils.Error(c, http.StatusForbidden, "Account is not active")

			return

		}

		user.Status = "active"

	}

	h.DB.Exec("UPDATE users SET last_login_at=NOW() WHERE id=$1", user.ID)

	tokens, err := h.issueTokens(user.ID, user.Role)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to issue tokens")
		return
	}

	utils.Success(c, http.StatusOK, "Login successful", models.AuthResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		User:         user,
	})
}

// Refresh rotates the refresh token: the old one is revoked, a new pair is issued.
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req models.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var userID string
	var expiresAt time.Time
	var revokedAt *time.Time
	err := h.DB.QueryRow(
		`SELECT user_id, expires_at, revoked_at FROM refresh_tokens WHERE token=$1`,
		req.RefreshToken,
	).Scan(&userID, &expiresAt, &revokedAt)
	if err != nil {
		utils.Error(c, http.StatusUnauthorized, "Invalid refresh token")
		return
	}

	if revokedAt != nil || time.Now().After(expiresAt) {
		utils.Error(c, http.StatusUnauthorized, "Refresh token expired or revoked")
		return
	}

	var role string
	var status string
	err = h.DB.QueryRow(`SELECT role, status FROM users WHERE id=$1`, userID).Scan(&role, &status)
	if err != nil {
		utils.Error(c, http.StatusUnauthorized, "User not found")
		return
	}

	if status == "suspended" || status == "deactivated" {
		utils.Error(c, http.StatusForbidden, "Account is not active")
		return
	}

	// Rotation: revoke the used token
	h.DB.Exec(`UPDATE refresh_tokens SET revoked_at=NOW() WHERE token=$1`, req.RefreshToken)

	tokens, err := h.issueTokens(userID, role)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to issue tokens")
		return
	}

	utils.Success(c, http.StatusOK, "Token refreshed", tokens)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req models.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	h.DB.Exec(`UPDATE refresh_tokens SET revoked_at=NOW() WHERE token=$1`, req.RefreshToken)

	utils.Success(c, http.StatusOK, "Logged out successfully", nil)
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetString("user_id")

	var user models.User
	err := h.DB.QueryRow(
		`SELECT id, email, phone, first_name, last_name, avatar_url, role, status,
		 email_verified, phone_verified, last_login_at, created_at, updated_at
		 FROM users WHERE id=$1`,
		userID,
	).Scan(&user.ID, &user.Email, &user.Phone, &user.FirstName, &user.LastName,
		&user.AvatarURL, &user.Role, &user.Status, &user.EmailVerified,
		&user.PhoneVerified, &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "User not found")
		return
	}

	utils.Success(c, http.StatusOK, "", user)
}
