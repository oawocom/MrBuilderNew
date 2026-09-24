package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/integrations"
	"github.com/mrbuilder/backend/internal/utils"
)

type IntegrationsHandler struct {
	DB *sql.DB
}

func NewIntegrationsHandler(db *sql.DB) *IntegrationsHandler {
	return &IntegrationsHandler{DB: db}
}

func (h *IntegrationsHandler) view(provider string) gin.H {
	cfg, enabled := integrations.Get(provider)
	masked := gin.H{}
	for _, f := range integrations.Providers[provider] {
		v := cfg[f]
		if integrations.IsSecret(f) {
			v = integrations.Mask(v)
		}
		masked[f] = v
	}
	var testAt sql.NullTime
	var testOk *bool
	var testMsg *string
	var updated sql.NullTime
	h.DB.QueryRow(`SELECT last_test_at, last_test_ok, last_test_message, updated_at FROM integration_settings WHERE provider=$1`, provider).Scan(&testAt, &testOk, &testMsg, &updated)
	configured := false
	for _, f := range integrations.Providers[provider] {
		if cfg[f] != "" {
			configured = true
		}
	}
	return gin.H{"provider": provider, "fields": integrations.Providers[provider], "config": masked, "is_enabled": enabled, "configured": configured,
		"last_test_at": nullTime(testAt), "last_test_ok": testOk, "last_test_message": testMsg, "updated_at": nullTime(updated)}
}

// GET /admin/integrations
func (h *IntegrationsHandler) List(c *gin.Context) {
	order := []string{"stripe", "smtp", "twilio", "storage", "google_oauth", "apple_oauth", "push", "maps"}
	out := []gin.H{}
	for _, p := range order {
		out = append(out, h.view(p))
	}
	utils.Success(c, http.StatusOK, "", gin.H{"encryption_ready": integrations.Ready(), "providers": out})
}

type IntegrationUpdate struct {
	Config    map[string]string `json:"config"`
	IsEnabled *bool             `json:"is_enabled"`
}

// PUT /admin/integrations/:provider
func (h *IntegrationsHandler) Update(c *gin.Context) {
	var req IntegrationUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Config == nil {
		req.Config = map[string]string{}
	}
	if err := integrations.Set(c.Param("provider"), req.Config, req.IsEnabled, c.GetString("user_id")); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "Saved", h.view(c.Param("provider")))
}

// POST /admin/integrations/:provider/test — {to?: "email or phone"}
func (h *IntegrationsHandler) Test(c *gin.Context) {
	provider := c.Param("provider")
	userID := c.GetString("user_id")
	var req struct {
		To string `json:"to"`
	}
	c.ShouldBindJSON(&req)
	var email, phone string
	var phonePtr *string
	h.DB.QueryRow(`SELECT email, phone FROM users WHERE id=$1`, userID).Scan(&email, &phonePtr)
	if phonePtr != nil {
		phone = *phonePtr
	}
	var err error
	msg := "OK"
	switch provider {
	case "smtp":
		to := req.To
		if to == "" {
			to = email
		}
		err = integrations.SendEmail(to, "MrBuilder test email", "<p>SMTP is configured correctly.</p><p>"+time.Now().Format(time.RFC1123)+"</p>")
		msg = "Test email sent to " + to
	case "twilio":
		to := req.To
		if to == "" {
			to = phone
		}
		if to == "" {
			err = fmt.Errorf("no phone number on your account — pass {\"to\": \"+1...\"}")
		} else {
			err = integrations.SendSMS(to, "MrBuilder: SMS is configured correctly.")
			msg = "Test SMS sent to " + to
		}
	case "push":
		tokens := []string{}
		rows, _ := h.DB.Query(`SELECT token FROM device_tokens WHERE user_id=$1`, userID)
		if rows != nil {
			for rows.Next() {
				var t string
				if rows.Scan(&t) == nil {
					tokens = append(tokens, t)
				}
			}
			rows.Close()
		}
		if len(tokens) == 0 {
			err = fmt.Errorf("no device registered for your account — open the app and log in first")
		} else {
			err = integrations.SendPush(tokens, "MrBuilder", "Push notifications are working", map[string]interface{}{"screen": "home"})
			msg = fmt.Sprintf("Sent to %d device(s)", len(tokens))
		}
	case "storage":
		err = integrations.StorageTest()
		msg = "Wrote and deleted a test object"
	case "stripe":
		var out map[string]interface{}
		out, err = integrations.StripeRequest("GET", "/v1/balance", nil)
		if err == nil {
			msg = fmt.Sprintf("Connected · livemode=%v", out["livemode"])
		}
	case "maps":
		var lat, lng float64
		var f string
		lat, lng, f, err = integrations.Geocode("1600 Amphitheatre Parkway, Mountain View, CA")
		if err == nil {
			msg = fmt.Sprintf("Geocoded %s → %.4f, %.4f", f, lat, lng)
		}
	case "google_oauth", "apple_oauth":
		cfg, enabled := integrations.Get(provider)
		if !enabled {
			err = fmt.Errorf("disabled")
		} else if cfg["client_id"] == "" && cfg["client_ids"] == "" {
			err = fmt.Errorf("client id missing")
		}
		msg = "Configuration present (verified on first sign-in)"
	default:
		utils.Error(c, http.StatusNotFound, "Unknown provider")
		return
	}
	ok := err == nil
	if !ok {
		msg = err.Error()
	}
	h.DB.Exec(`UPDATE integration_settings SET last_test_at=NOW(), last_test_ok=$1, last_test_message=$2 WHERE provider=$3`, ok, msg, provider)
	if !ok {
		utils.Error(c, http.StatusBadGateway, msg)
		return
	}
	utils.Success(c, http.StatusOK, msg, h.view(provider))
}

// ---------- uploads ----------

type UploadRequest struct {
	Filename    string `json:"filename" binding:"required"`
	ContentType string `json:"content_type" binding:"required"`
	Purpose     string `json:"purpose" binding:"required,oneof=evidence avatar product document chat inspection claim"`
	SizeBytes   int64  `json:"size_bytes"`
}

// POST /uploads — returns a presigned PUT URL; the app uploads the file directly, then uses public_url
func (h *IntegrationsHandler) CreateUpload(c *gin.Context) {
	userID := c.GetString("user_id")
	var req UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.SizeBytes > 25*1024*1024 {
		utils.Error(c, http.StatusBadRequest, "Max upload size is 25 MB")
		return
	}
	ext := strings.ToLower(path.Ext(req.Filename))
	key := fmt.Sprintf("%s/%s/%d-%s%s", req.Purpose, userID[:8], time.Now().UnixNano(), strings.TrimSuffix(randomToken(4), ""), ext)
	uploadURL, publicURL, err := integrations.PresignUpload(key, req.ContentType)
	var id string
	if err != nil { // no S3 configured → store on our own server
		if e := h.DB.QueryRow(`INSERT INTO uploads (user_id, purpose, object_key, public_url, content_type, size_bytes) VALUES ($1,$2,$3,'',$4,$5) RETURNING id`,
			userID, req.Purpose, key, req.ContentType, req.SizeBytes).Scan(&id); e != nil {
			utils.Error(c, http.StatusInternalServerError, "Could not register upload")
			return
		}
		uploadURL, publicURL = localUploadURLs(id, key)
		h.DB.Exec(`UPDATE uploads SET public_url=$2 WHERE id=$1`, id, publicURL)
	} else {
		h.DB.QueryRow(`INSERT INTO uploads (user_id, purpose, object_key, public_url, content_type, size_bytes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
			userID, req.Purpose, key, publicURL, req.ContentType, req.SizeBytes).Scan(&id)
	}
	utils.Success(c, http.StatusCreated, "", gin.H{"id": id, "upload_url": uploadURL, "method": "PUT", "headers": gin.H{"Content-Type": req.ContentType}, "public_url": publicURL, "expires_in": 900})
}

// POST /geocode {address}
func (h *IntegrationsHandler) Geocode(c *gin.Context) {
	var req struct {
		Address string `json:"address" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	lat, lng, formatted, err := integrations.Geocode(req.Address)
	if err != nil {
		utils.Error(c, http.StatusServiceUnavailable, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "", gin.H{"lat": lat, "lng": lng, "formatted_address": formatted})
}

// ---------- store admin extras ----------

// GET /admin/store/products?all=1&category=
func (h *IntegrationsHandler) AdminListProducts(c *gin.Context) {
	where, args := "1=1", []interface{}{}
	if c.Query("all") == "" {
		where = "p.is_active"
	}
	if v := c.Query("category"); v != "" {
		args = append(args, v)
		where += fmt.Sprintf(" AND p.category=$%d", len(args))
	}
	rows, err := h.DB.Query(`SELECT `+productColumns+` FROM supply_products p WHERE `+where+` ORDER BY p.category, p.name`, args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load products")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		if p, e := scanProduct(rows, nil); e == nil {
			out = append(out, p)
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

type CategoryUpsert struct {
	Name      string  `json:"name" binding:"required"`
	ImageURL  *string `json:"image_url"`
	SortOrder *int    `json:"sort_order"`
	IsActive  *bool   `json:"is_active"`
}

// PUT /admin/store/categories/:slug
func (h *IntegrationsHandler) AdminUpsertCategory(c *gin.Context) {
	var req CategoryUpsert
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	_, err := h.DB.Exec(`INSERT INTO supply_categories (slug, name, image_url, sort_order, is_active) VALUES ($1,$2,$3,COALESCE($4,0),COALESCE($5,TRUE))
        ON CONFLICT (slug) DO UPDATE SET name=$2, image_url=COALESCE($3,supply_categories.image_url), sort_order=COALESCE($4,supply_categories.sort_order), is_active=COALESCE($5,supply_categories.is_active)`,
		c.Param("slug"), req.Name, req.ImageURL, req.SortOrder, req.IsActive)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Failed to save category: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "Category saved", nil)
}
