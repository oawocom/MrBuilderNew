package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

type AccountHandler struct {
	DB *sql.DB
}

func NewAccountHandler(db *sql.DB) *AccountHandler {
	return &AccountHandler{DB: db}
}

func (h *AccountHandler) ensureSettings(userID string) {
	h.DB.Exec(`INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userID)
}

func (h *AccountHandler) settings(userID string) gin.H {
	h.ensureSettings(userID)
	var email, sms, push, payout, jobs, payouts, msgs, updates, dark, autoUpd, autoPay, twoFA bool
	var lang, units string
	var minPayout *float64
	h.DB.QueryRow(`SELECT email_notifications, sms_notifications, push_notifications, payout_notifications,
            notify_new_jobs, notify_payouts, notify_messages, notify_updates, dark_mode, auto_update, auto_payout, two_factor_enabled,
            language, units, min_payout_amount FROM user_settings WHERE user_id=$1`, userID).
		Scan(&email, &sms, &push, &payout, &jobs, &payouts, &msgs, &updates, &dark, &autoUpd, &autoPay, &twoFA, &lang, &units, &minPayout)
	return gin.H{
		"notifications": gin.H{"email": email, "sms": sms, "push": push, "payout": payout,
			"n_jobs": jobs, "n_payouts": payouts, "n_msgs": msgs, "n_updates": updates},
		"preferences": gin.H{"language": lang, "dark_mode": dark, "auto_update": autoUpd, "auto_payout": autoPay,
			"units": units, "min_payout_amount": minPayout, "two_factor_enabled": twoFA},
	}
}

// GET /me/settings
func (h *AccountHandler) GetSettings(c *gin.Context) {
	utils.Success(c, http.StatusOK, "", h.settings(c.GetString("user_id")))
}

type NotificationPrefs struct {
	Email    *bool `json:"email"`
	SMS      *bool `json:"sms"`
	Push     *bool `json:"push"`
	Payout   *bool `json:"payout"`
	NJobs    *bool `json:"n_jobs"`
	NPayouts *bool `json:"n_payouts"`
	NMsgs    *bool `json:"n_msgs"`
	NUpdates *bool `json:"n_updates"`
}

// PATCH /me/notifications
func (h *AccountHandler) UpdateNotifications(c *gin.Context) {
	userID := c.GetString("user_id")
	var req NotificationPrefs
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.ensureSettings(userID)
	h.DB.Exec(`UPDATE user_settings SET
        email_notifications=COALESCE($1,email_notifications), sms_notifications=COALESCE($2,sms_notifications),
        push_notifications=COALESCE($3,push_notifications), payout_notifications=COALESCE($4,payout_notifications),
        notify_new_jobs=COALESCE($5,notify_new_jobs), notify_payouts=COALESCE($6,notify_payouts),
        notify_messages=COALESCE($7,notify_messages), notify_updates=COALESCE($8,notify_updates), updated_at=NOW()
        WHERE user_id=$9`, req.Email, req.SMS, req.Push, req.Payout, req.NJobs, req.NPayouts, req.NMsgs, req.NUpdates, userID)
	utils.Success(c, http.StatusOK, "Notifications updated", h.settings(userID))
}

type Preferences struct {
	Language        *string  `json:"language" binding:"omitempty,oneof=en es"`
	DarkMode        *bool    `json:"dark_mode"`
	AutoUpdate      *bool    `json:"auto_update"`
	AutoPayout      *bool    `json:"auto_payout"`
	Units           *string  `json:"units" binding:"omitempty,oneof=imperial metric"`
	MinPayoutAmount *float64 `json:"min_payout_amount"`
}

// PATCH /me/preferences
func (h *AccountHandler) UpdatePreferences(c *gin.Context) {
	userID := c.GetString("user_id")
	var req Preferences
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.MinPayoutAmount != nil {
		floor := GetSettingFloat(h.DB, "min_payout_amount", 50)
		if *req.MinPayoutAmount < floor {
			utils.Error(c, http.StatusBadRequest, fmt.Sprintf("Minimum payout cannot be below $%.2f", floor))
			return
		}
	}
	h.ensureSettings(userID)
	h.DB.Exec(`UPDATE user_settings SET
        language=COALESCE($1,language), dark_mode=COALESCE($2,dark_mode), auto_update=COALESCE($3,auto_update),
        auto_payout=COALESCE($4,auto_payout), units=COALESCE($5,units), min_payout_amount=COALESCE($6,min_payout_amount), updated_at=NOW()
        WHERE user_id=$7`, req.Language, req.DarkMode, req.AutoUpdate, req.AutoPayout, req.Units, req.MinPayoutAmount, userID)
	if req.AutoPayout != nil && *req.AutoPayout {
		MaybeAutoPayout(h.DB, userID)
	}
	utils.Success(c, http.StatusOK, "Preferences updated", h.settings(userID))
}

type DeviceRequest struct {
	Token    string `json:"token" binding:"required"`
	Platform string `json:"platform" binding:"required,oneof=ios android web"`
	App      string `json:"app" binding:"omitempty,oneof=consumer contractor"`
}

// POST /me/devices — register a push token
func (h *AccountHandler) RegisterDevice(c *gin.Context) {
	userID := c.GetString("user_id")
	var req DeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	app := req.App
	if app == "" {
		app = c.GetString("user_role")
		if app != "contractor" {
			app = "consumer"
		}
	}
	h.DB.Exec(`INSERT INTO device_tokens (user_id, token, platform, app) VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id, token) DO UPDATE SET platform=EXCLUDED.platform, app=EXCLUDED.app, last_seen_at=NOW()`, userID, req.Token, req.Platform, app)
	utils.Success(c, http.StatusOK, "Device registered", nil)
}

// DELETE /me/devices — body {token}
func (h *AccountHandler) UnregisterDevice(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.DB.Exec(`DELETE FROM device_tokens WHERE user_id=$1 AND token=$2`, userID, req.Token)
	utils.Success(c, http.StatusOK, "Device removed", nil)
}

// DELETE /me — schedule deletion (grace period); account deactivated immediately, sessions revoked
func (h *AccountHandler) DeleteAccount(c *gin.Context) {
	userID := c.GetString("user_id")
	var active int
	h.DB.QueryRow(`SELECT COUNT(*) FROM jobs WHERE (consumer_id=$1 OR contractor_id=$1)
        AND status::text NOT IN ('completed_paid','dispute_upheld','cancelled_by_client','cancelled_by_contractor','confirmed','cancelled','quote_declined','no_match_waitlist','quote_ready','submitted')`, userID).Scan(&active)
	if active > 0 {
		utils.Error(c, http.StatusConflict, fmt.Sprintf("You have %d active job(s). Finish or cancel them before deleting your account", active))
		return
	}
	var balance float64
	h.DB.QueryRow(`SELECT COALESCE(balance,0) FROM balances WHERE user_id=$1`, userID).Scan(&balance)
	if balance > 0 {
		utils.Error(c, http.StatusConflict, fmt.Sprintf("You still have $%.2f to pay out. Request a payout first", balance))
		return
	}
	grace := GetSettingInt(h.DB, "account_deletion_grace_days", 30)
	h.DB.Exec(`UPDATE users SET status='deactivated', deletion_requested_at=NOW(), updated_at=NOW() WHERE id=$1`, userID)
	h.DB.Exec(`UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`, userID)
	h.DB.Exec(`DELETE FROM device_tokens WHERE user_id=$1`, userID)
	utils.Success(c, http.StatusOK, fmt.Sprintf("Account scheduled for deletion in %d days. Log in before then to restore it.", grace), gin.H{"grace_days": grace})
}

// PurgeDeletedAccounts anonymises accounts whose grace period has passed. Called by the ticker.
func PurgeDeletedAccounts(db *sql.DB) {
	grace := GetSettingInt(db, "account_deletion_grace_days", 30)
	db.Exec(`UPDATE users SET email = 'deleted-' || id || '@deleted.mrbuilder', phone=NULL, first_name='Deleted', last_name='User',
        avatar_url=NULL, password_hash='', deleted_at=NOW(), updated_at=NOW()
        WHERE deletion_requested_at IS NOT NULL AND deleted_at IS NULL AND deletion_requested_at < NOW() - ($1 || ' days')::interval`, fmt.Sprint(grace))
}
