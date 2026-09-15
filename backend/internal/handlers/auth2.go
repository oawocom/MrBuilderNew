package handlers

import (
	"crypto/rsa"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"math/rand"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/mrbuilder/backend/internal/integrations"
	"github.com/mrbuilder/backend/internal/models"
	"github.com/mrbuilder/backend/internal/utils"
)

// ---------- OAuth ----------

type OAuthRequest struct {
	Provider  string  `json:"provider" binding:"required,oneof=google apple"`
	IDToken   string  `json:"id_token" binding:"required"`
	Role      string  `json:"role" binding:"omitempty,oneof=consumer contractor"`
	FirstName *string `json:"first_name"` // Apple only sends the name on first sign-in
	LastName  *string `json:"last_name"`
}

type oauthIdentity struct{ sub, email, first, last string }

func verifyGoogle(idToken string) (oauthIdentity, error) {
	cfg, on := integrations.Get("google_oauth")
	if !on {
		return oauthIdentity{}, fmt.Errorf("Google sign-in is not enabled")
	}
	resp, err := http.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken)
	if err != nil {
		return oauthIdentity{}, err
	}
	defer resp.Body.Close()
	var t struct {
		Aud        string `json:"aud"`
		Sub        string `json:"sub"`
		Email      string `json:"email"`
		GivenName  string `json:"given_name"`
		FamilyName string `json:"family_name"`
	}
	json.NewDecoder(resp.Body).Decode(&t)
	if resp.StatusCode != 200 || t.Sub == "" {
		return oauthIdentity{}, fmt.Errorf("invalid Google token")
	}
	ok := false
	for _, id := range strings.Split(cfg["client_ids"], ",") {
		if strings.TrimSpace(id) == t.Aud {
			ok = true
		}
	}
	if !ok {
		return oauthIdentity{}, fmt.Errorf("Google token audience mismatch")
	}
	return oauthIdentity{sub: t.Sub, email: strings.ToLower(t.Email), first: t.GivenName, last: t.FamilyName}, nil
}

func appleKey(kid string) (*rsa.PublicKey, error) {
	resp, err := http.Get("https://appleid.apple.com/auth/keys")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var ks struct {
		Keys []struct{ Kid, N, E string } `json:"keys"`
	}
	json.NewDecoder(resp.Body).Decode(&ks)
	for _, k := range ks.Keys {
		if k.Kid == kid {
			nb, _ := base64.RawURLEncoding.DecodeString(k.N)
			eb, _ := base64.RawURLEncoding.DecodeString(k.E)
			return &rsa.PublicKey{N: new(big.Int).SetBytes(nb), E: int(new(big.Int).SetBytes(eb).Int64())}, nil
		}
	}
	return nil, fmt.Errorf("apple key not found")
}

func verifyApple(idToken string) (oauthIdentity, error) {
	cfg, on := integrations.Get("apple_oauth")
	if !on {
		return oauthIdentity{}, fmt.Errorf("Apple sign-in is not enabled")
	}
	claims := jwt.MapClaims{}
	tok, err := jwt.ParseWithClaims(idToken, claims, func(t *jwt.Token) (interface{}, error) {
		kid, _ := t.Header["kid"].(string)
		return appleKey(kid)
	}, jwt.WithIssuer("https://appleid.apple.com"))
	if err != nil || !tok.Valid {
		return oauthIdentity{}, fmt.Errorf("invalid Apple token")
	}
	aud, _ := claims["aud"].(string)
	ok := false
	for _, id := range strings.Split(cfg["client_id"], ",") {
		if strings.TrimSpace(id) == aud {
			ok = true
		}
	}
	if !ok {
		return oauthIdentity{}, fmt.Errorf("Apple token audience mismatch")
	}
	sub, _ := claims["sub"].(string)
	email, _ := claims["email"].(string)
	return oauthIdentity{sub: sub, email: strings.ToLower(email)}, nil
}

// POST /auth/oauth — sign in or sign up with Google / Apple
func (h *AuthHandler) OAuth(c *gin.Context) {
	var req OAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var id oauthIdentity
	var err error
	if req.Provider == "google" {
		id, err = verifyGoogle(req.IDToken)
	} else {
		id, err = verifyApple(req.IDToken)
	}
	if err != nil {
		utils.Error(c, http.StatusUnauthorized, err.Error())
		return
	}
	if req.FirstName != nil && id.first == "" {
		id.first = *req.FirstName
	}
	if req.LastName != nil && id.last == "" {
		id.last = *req.LastName
	}

	var user models.User
	scan := func(row *sql.Row) error {
		return row.Scan(&user.ID, &user.Email, &user.Phone, &user.FirstName, &user.LastName, &user.Role, &user.Status, &user.EmailVerified, &user.PhoneVerified, &user.CreatedAt, &user.UpdatedAt)
	}
	const cols = `id, email, phone, first_name, last_name, role, status, email_verified, phone_verified, created_at, updated_at`
	err = scan(h.DB.QueryRow(`SELECT `+cols+` FROM users WHERE oauth_provider=$1 AND oauth_sub=$2`, req.Provider, id.sub))
	if err != nil && id.email != "" {
		// link to an existing email account
		if err = scan(h.DB.QueryRow(`SELECT `+cols+` FROM users WHERE LOWER(email)=$1`, id.email)); err == nil {
			h.DB.Exec(`UPDATE users SET oauth_provider=$1, oauth_sub=$2, email_verified=TRUE WHERE id=$3`, req.Provider, id.sub, user.ID)
		}
	}
	if err != nil {
		if id.email == "" {
			utils.Error(c, http.StatusBadRequest, "No email available from "+req.Provider+" — please register with email")
			return
		}
		role := req.Role
		if role == "" {
			role = "consumer"
		}
		first, last := id.first, id.last
		if first == "" {
			first = strings.Split(id.email, "@")[0]
		}
		if last == "" {
			last = "."
		}
		status := "active"
		if role == "contractor" {
			status = "pending"
		}
		if err = scan(h.DB.QueryRow(`INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified, oauth_provider, oauth_sub)
            VALUES ($1,NULL,$2,$3,$4,$5,TRUE,$6,$7) RETURNING `+cols, id.email, first, last, role, status, req.Provider, id.sub)); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Could not create account: "+err.Error())
			return
		}
		h.DB.Exec(`INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, user.ID)
		if role == "contractor" {
			h.DB.Exec(`INSERT INTO contractor_profiles (user_id, role) VALUES ($1,'installation_team')`, user.ID)
		} else {
			h.DB.Exec(`INSERT INTO consumer_profiles (user_id) VALUES ($1)`, user.ID)
		}
	}
	if user.Status == "suspended" {
		utils.Error(c, http.StatusForbidden, "Account is suspended")
		return
	}
	if user.Status == "deactivated" {
		h.DB.Exec(`UPDATE users SET status='active', deletion_requested_at=NULL, updated_at=NOW() WHERE id=$1 AND deletion_requested_at IS NOT NULL AND deleted_at IS NULL`, user.ID)
		user.Status = "active"
	}
	h.DB.Exec(`UPDATE users SET last_login_at=NOW() WHERE id=$1`, user.ID)
	tokens, err := h.issueTokens(user.ID, user.Role)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to issue tokens")
		return
	}
	utils.Success(c, http.StatusOK, "Signed in", models.AuthResponse{AccessToken: tokens.AccessToken, RefreshToken: tokens.RefreshToken, User: user})
}

// ---------- OTP verification (phone / email) ----------

func otpCode() string { return fmt.Sprintf("%06d", rand.Intn(1000000)) }

func sendOTP(db *sql.DB, userID *string, channel, to, purpose string) error {
	code := otpCode()
	var uid interface{}
	if userID != nil {
		uid = *userID
	}
	var phone, email interface{}
	if channel == "sms" {
		phone = to
	} else {
		email = to
	}
	db.Exec(`UPDATE otp_codes SET used=TRUE WHERE used=FALSE AND purpose=$1 AND (phone=$2 OR email=$3)`, purpose, to, to)
	if _, err := db.Exec(`INSERT INTO otp_codes (user_id, phone, email, code, purpose, expires_at) VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '15 minutes')`, uid, phone, email, code, purpose); err != nil {
		return err
	}
	msg := "Your MrBuilder code is " + code + ". It expires in 15 minutes."
	if purpose == "reset" {
		base := GetSettingString(db, "web_base_url", "https://new.mrbuilder.com")
		msg = "Reset your MrBuilder password with code " + code + " or open " + base + "/reset?email=" + to + "&code=" + code
	}
	if channel == "sms" {
		return integrations.SendSMS(to, msg)
	}
	return integrations.SendEmail(to, "Your MrBuilder verification code", "<p>"+msg+"</p>")
}

func checkOTP(db *sql.DB, to, code, purpose string) bool {
	var id string
	var attempts int
	if db.QueryRow(`SELECT id, attempts FROM otp_codes WHERE (phone=$1 OR email=$1) AND purpose=$2 AND used=FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`, to, purpose).Scan(&id, &attempts) != nil {
		return false
	}
	if attempts >= 5 {
		return false
	}
	var ok bool
	db.QueryRow(`SELECT code=$1 FROM otp_codes WHERE id=$2`, code, id).Scan(&ok)
	if ok {
		db.Exec(`UPDATE otp_codes SET used=TRUE WHERE id=$1`, id)
	} else {
		db.Exec(`UPDATE otp_codes SET attempts=attempts+1 WHERE id=$1`, id)
	}
	return ok
}

// POST /me/verify/send {channel: sms|email}
func (h *AuthHandler) VerifySend(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		Channel string `json:"channel" binding:"required,oneof=sms email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var email string
	var phone *string
	h.DB.QueryRow(`SELECT email, phone FROM users WHERE id=$1`, userID).Scan(&email, &phone)
	to := email
	if req.Channel == "sms" {
		if phone == nil || *phone == "" {
			utils.Error(c, http.StatusBadRequest, "Add a phone number first")
			return
		}
		to = *phone
	}
	if err := sendOTP(h.DB, &userID, req.Channel, to, "verify"); err != nil {
		utils.Error(c, http.StatusServiceUnavailable, "Could not send code: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "Code sent", gin.H{"to": to})
}

// POST /me/verify/confirm {channel, code}
func (h *AuthHandler) VerifyConfirm(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		Channel string `json:"channel" binding:"required,oneof=sms email"`
		Code    string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var email string
	var phone *string
	h.DB.QueryRow(`SELECT email, phone FROM users WHERE id=$1`, userID).Scan(&email, &phone)
	to := email
	if req.Channel == "sms" && phone != nil {
		to = *phone
	}
	if !checkOTP(h.DB, to, req.Code, "verify") {
		utils.Error(c, http.StatusBadRequest, "Invalid or expired code")
		return
	}
	if req.Channel == "sms" {
		h.DB.Exec(`UPDATE users SET phone_verified=TRUE, updated_at=NOW() WHERE id=$1`, userID)
	} else {
		h.DB.Exec(`UPDATE users SET email_verified=TRUE, updated_at=NOW() WHERE id=$1`, userID)
	}
	utils.Success(c, http.StatusOK, "Verified", nil)
}

// ---------- forgot / reset password ----------

// POST /auth/forgot {email}
func (h *AuthHandler) Forgot(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	var id string
	if h.DB.QueryRow(`SELECT id FROM users WHERE LOWER(email)=$1 AND deleted_at IS NULL`, email).Scan(&id) == nil {
		if err := sendOTP(h.DB, &id, "email", email, "reset"); err != nil {
			utils.Error(c, http.StatusServiceUnavailable, "Email is not configured yet — contact support to reset your password")
			return
		}
	}
	utils.Success(c, http.StatusOK, "If that email exists, a reset code has been sent", nil)
}

// POST /auth/reset {email, code, password}
func (h *AuthHandler) Reset(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Code     string `json:"code" binding:"required"`
		Password string `json:"password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if !checkOTP(h.DB, email, req.Code, "reset") {
		utils.Error(c, http.StatusBadRequest, "Invalid or expired code")
		return
	}
	hash, _ := utils.HashPassword(req.Password)
	var id string
	if h.DB.QueryRow(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE LOWER(email)=$2 RETURNING id`, hash, email).Scan(&id) != nil {
		utils.Error(c, http.StatusNotFound, "Account not found")
		return
	}
	h.DB.Exec(`UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`, id)
	utils.Success(c, http.StatusOK, "Password updated — please sign in", nil)
}
