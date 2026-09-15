package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

type SettingsHandler struct {
	DB *sql.DB
}

func NewSettingsHandler(db *sql.DB) *SettingsHandler {
	return &SettingsHandler{DB: db}
}

// ---------- helpers used by other handlers (pricing, payments, training) ----------

func GetSettingRaw(db *sql.DB, key string) (json.RawMessage, bool) {
	var v []byte
	if err := db.QueryRow(`SELECT value FROM platform_settings WHERE key=$1`, key).Scan(&v); err != nil {
		return nil, false
	}
	return json.RawMessage(v), true
}

func GetSettingFloat(db *sql.DB, key string, def float64) float64 {
	if raw, ok := GetSettingRaw(db, key); ok {
		var f float64
		if json.Unmarshal(raw, &f) == nil {
			return f
		}
	}
	return def
}

func GetSettingInt(db *sql.DB, key string, def int) int {
	return int(GetSettingFloat(db, key, float64(def)))
}

func GetSettingBool(db *sql.DB, key string, def bool) bool {
	if raw, ok := GetSettingRaw(db, key); ok {
		var b bool
		if json.Unmarshal(raw, &b) == nil {
			return b
		}
	}
	return def
}

func GetSettingString(db *sql.DB, key string, def string) string {
	if raw, ok := GetSettingRaw(db, key); ok {
		var s string
		if json.Unmarshal(raw, &s) == nil {
			return s
		}
	}
	return def
}

// ---------- settings ----------

// GET /settings — all platform settings as {key: value}
func (h *SettingsHandler) List(c *gin.Context) {
	rows, err := h.DB.Query(`SELECT key, value FROM platform_settings ORDER BY key`)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load settings")
		return
	}
	defer rows.Close()

	out := map[string]json.RawMessage{}
	for rows.Next() {
		var k string
		var v []byte
		if rows.Scan(&k, &v) == nil {
			out[k] = json.RawMessage(v)
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

// GET /admin/settings — with descriptions and audit fields
func (h *SettingsHandler) AdminList(c *gin.Context) {
	rows, err := h.DB.Query(`SELECT key, value, description, updated_by, updated_at FROM platform_settings ORDER BY key`)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load settings")
		return
	}
	defer rows.Close()

	type row struct {
		Key         string          `json:"key"`
		Value       json.RawMessage `json:"value"`
		Description *string         `json:"description"`
		UpdatedBy   *string         `json:"updated_by"`
		UpdatedAt   string          `json:"updated_at"`
	}
	out := []row{}
	for rows.Next() {
		var r row
		var v []byte
		if rows.Scan(&r.Key, &v, &r.Description, &r.UpdatedBy, &r.UpdatedAt) == nil {
			r.Value = json.RawMessage(v)
			out = append(out, r)
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

// PUT /admin/settings — body: {"key": value, ...}; only existing keys are updated
func (h *SettingsHandler) Update(c *gin.Context) {
	userID := c.GetString("user_id")

	var body map[string]json.RawMessage
	if err := c.ShouldBindJSON(&body); err != nil || len(body) == 0 {
		utils.Error(c, http.StatusBadRequest, "Body must be a JSON object of key: value")
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Transaction failed")
		return
	}
	defer tx.Rollback()

	updated := []string{}
	for k, v := range body {
		res, err := tx.Exec(`UPDATE platform_settings SET value=$1, updated_by=$2, updated_at=NOW() WHERE key=$3`,
			string(v), userID, k)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid value for "+k)
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			utils.Error(c, http.StatusNotFound, "Unknown setting: "+k)
			return
		}
		updated = append(updated, k)
	}
	if err := tx.Commit(); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Commit failed")
		return
	}
	utils.Success(c, http.StatusOK, "Settings updated", gin.H{"updated": updated})
}

// ---------- service categories ----------

type ServiceCategory struct {
	Slug              string          `json:"slug"`
	Name              string          `json:"name"`
	Description       *string         `json:"description"`
	RequiresPractical bool            `json:"requires_practical"`
	PreJobChecklist   json.RawMessage `json:"pre_job_checklist"`
	SortOrder         int             `json:"sort_order"`
	IsActive          bool            `json:"is_active"`
}

const categoryColumns = `slug, name, description, requires_practical, pre_job_checklist, sort_order, is_active`

func scanCategory(row interface{ Scan(...interface{}) error }) (*ServiceCategory, error) {
	var sc ServiceCategory
	var cl []byte
	if err := row.Scan(&sc.Slug, &sc.Name, &sc.Description, &sc.RequiresPractical, &cl, &sc.SortOrder, &sc.IsActive); err != nil {
		return nil, err
	}
	sc.PreJobChecklist = json.RawMessage(cl)
	return &sc, nil
}

// GET /categories — active categories (public). ?all=1 includes inactive (admin use)
func (h *SettingsHandler) ListCategories(c *gin.Context) {
	q := `SELECT ` + categoryColumns + ` FROM service_categories`
	if c.Query("all") == "" {
		q += ` WHERE is_active`
	}
	rows, err := h.DB.Query(q + ` ORDER BY sort_order`)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load categories")
		return
	}
	defer rows.Close()

	out := []*ServiceCategory{}
	for rows.Next() {
		if sc, err := scanCategory(rows); err == nil {
			out = append(out, sc)
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

type UpdateCategoryRequest struct {
	Name              *string          `json:"name"`
	Description       *string          `json:"description"`
	RequiresPractical *bool            `json:"requires_practical"`
	PreJobChecklist   *json.RawMessage `json:"pre_job_checklist"`
	SortOrder         *int             `json:"sort_order"`
	IsActive          *bool            `json:"is_active"`
}

// PUT /admin/categories/:slug
func (h *SettingsHandler) UpdateCategory(c *gin.Context) {
	slug := c.Param("slug")
	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var checklist interface{}
	if req.PreJobChecklist != nil {
		checklist = string(*req.PreJobChecklist)
	}
	row := h.DB.QueryRow(`UPDATE service_categories SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            requires_practical = COALESCE($3, requires_practical),
            pre_job_checklist = COALESCE($4::jsonb, pre_job_checklist),
            sort_order = COALESCE($5, sort_order),
            is_active = COALESCE($6, is_active)
        WHERE slug=$7 RETURNING `+categoryColumns,
		req.Name, req.Description, req.RequiresPractical, checklist, req.SortOrder, req.IsActive, slug)
	sc, err := scanCategory(row)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Category not found")
		return
	}
	utils.Success(c, http.StatusOK, "Category updated", sc)
}

// ---------- pricing rules ----------

type PricingRule struct {
	ID              string  `json:"id"`
	ServiceCategory string  `json:"service_category"`
	Component       string  `json:"component"`
	Code            *string `json:"code"`
	StructureType   *string `json:"structure_type"`
	Amount          float64 `json:"amount"`
	Unit            string  `json:"unit"`
	Label           *string `json:"label"`
	IsActive        bool    `json:"is_active"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

const pricingColumns = `id, service_category, component, code, structure_type, amount, unit, label, is_active, created_at, updated_at`

func scanPricingRule(row interface{ Scan(...interface{}) error }) (*PricingRule, error) {
	var p PricingRule
	if err := row.Scan(&p.ID, &p.ServiceCategory, &p.Component, &p.Code, &p.StructureType, &p.Amount, &p.Unit, &p.Label, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
		return nil, err
	}
	return &p, nil
}

// GET /admin/pricing-rules?category=installation&all=1
func (h *SettingsHandler) ListPricingRules(c *gin.Context) {
	q := `SELECT ` + pricingColumns + ` FROM pricing_rules WHERE 1=1`
	args := []interface{}{}
	if v := c.Query("category"); v != "" {
		args = append(args, v)
		q += ` AND service_category=$` + strconv.Itoa(len(args))
	}
	if c.Query("all") == "" {
		q += ` AND is_active`
	}
	rows, err := h.DB.Query(q+` ORDER BY service_category, component, code`, args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load pricing rules")
		return
	}
	defer rows.Close()

	out := []*PricingRule{}
	for rows.Next() {
		if p, err := scanPricingRule(rows); err == nil {
			out = append(out, p)
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

type PricingRuleRequest struct {
	ServiceCategory string  `json:"service_category" binding:"required"`
	Component       string  `json:"component" binding:"required"`
	Code            *string `json:"code"`
	StructureType   *string `json:"structure_type"`
	Amount          float64 `json:"amount" binding:"required"`
	Unit            string  `json:"unit" binding:"required,oneof=flat per_sqft per_unit per_side per_hour"`
	Label           *string `json:"label"`
	IsActive        *bool   `json:"is_active"`
}

// POST /admin/pricing-rules
func (h *SettingsHandler) CreatePricingRule(c *gin.Context) {
	var req PricingRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	row := h.DB.QueryRow(`INSERT INTO pricing_rules (service_category, component, code, structure_type, amount, unit, label, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING `+pricingColumns,
		req.ServiceCategory, req.Component, req.Code, req.StructureType, req.Amount, req.Unit, req.Label, active)
	p, err := scanPricingRule(row)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Failed to create rule: "+err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "Pricing rule created", p)
}

// PUT /admin/pricing-rules/:id
func (h *SettingsHandler) UpdatePricingRule(c *gin.Context) {
	var req PricingRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	row := h.DB.QueryRow(`UPDATE pricing_rules SET service_category=$1, component=$2, code=$3, structure_type=$4,
        amount=$5, unit=$6, label=$7, is_active=$8, updated_at=NOW() WHERE id=$9 RETURNING `+pricingColumns,
		req.ServiceCategory, req.Component, req.Code, req.StructureType, req.Amount, req.Unit, req.Label, active, c.Param("id"))
	p, err := scanPricingRule(row)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Pricing rule not found")
		return
	}
	utils.Success(c, http.StatusOK, "Pricing rule updated", p)
}

// DELETE /admin/pricing-rules/:id — soft delete (keeps history for old quotes)
func (h *SettingsHandler) DeletePricingRule(c *gin.Context) {
	res, err := h.DB.Exec(`UPDATE pricing_rules SET is_active=FALSE, updated_at=NOW() WHERE id=$1`, c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to delete rule")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Pricing rule not found")
		return
	}
	utils.Success(c, http.StatusOK, "Pricing rule deactivated", nil)
}

// ---------- MrCare plans ----------

type MrCarePlan struct {
	ID            string          `json:"id"`
	Offering      string          `json:"offering"`
	Slug          string          `json:"slug"`
	Name          string          `json:"name"`
	Description   *string         `json:"description"`
	AnnualPrice   float64         `json:"annual_price"`
	VisitsPerYear int             `json:"visits_per_year"`
	Features      json.RawMessage `json:"features"`
	SortOrder     int             `json:"sort_order"`
	IsActive      bool            `json:"is_active"`
}

type MrCareAddon struct {
	ID          string  `json:"id"`
	Offering    string  `json:"offering"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	AnnualPrice float64 `json:"annual_price"`
	SortOrder   int     `json:"sort_order"`
	IsActive    bool    `json:"is_active"`
}

// GET /mrcare/plans — active plans + add-ons grouped by offering (public)
func (h *SettingsHandler) ListMrCarePlans(c *gin.Context) {
	rows, err := h.DB.Query(`SELECT id, offering, slug, name, description, annual_price, visits_per_year, features, sort_order, is_active
        FROM mrcare_plans WHERE is_active ORDER BY offering, sort_order`)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load plans")
		return
	}
	plans := []*MrCarePlan{}
	for rows.Next() {
		var p MrCarePlan
		var f []byte
		if rows.Scan(&p.ID, &p.Offering, &p.Slug, &p.Name, &p.Description, &p.AnnualPrice, &p.VisitsPerYear, &f, &p.SortOrder, &p.IsActive) == nil {
			p.Features = json.RawMessage(f)
			plans = append(plans, &p)
		}
	}
	rows.Close()

	arows, err := h.DB.Query(`SELECT id, offering, slug, name, description, annual_price, sort_order, is_active
        FROM mrcare_addons WHERE is_active ORDER BY offering, sort_order`)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load add-ons")
		return
	}
	defer arows.Close()
	addons := []*MrCareAddon{}
	for arows.Next() {
		var a MrCareAddon
		if arows.Scan(&a.ID, &a.Offering, &a.Slug, &a.Name, &a.Description, &a.AnnualPrice, &a.SortOrder, &a.IsActive) == nil {
			addons = append(addons, &a)
		}
	}
	utils.Success(c, http.StatusOK, "", gin.H{"plans": plans, "addons": addons})
}

type MrCarePlanRequest struct {
	Offering      string           `json:"offering" binding:"required,oneof=maintenance electronics"`
	Slug          string           `json:"slug" binding:"required"`
	Name          string           `json:"name" binding:"required"`
	Description   *string          `json:"description"`
	AnnualPrice   float64          `json:"annual_price" binding:"required"`
	VisitsPerYear int              `json:"visits_per_year"`
	Features      *json.RawMessage `json:"features"`
	SortOrder     int              `json:"sort_order"`
	IsActive      *bool            `json:"is_active"`
}

// PUT /admin/mrcare/plans/:slug — upsert a plan by slug
func (h *SettingsHandler) UpsertMrCarePlan(c *gin.Context) {
	var req MrCarePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	features := "[]"
	if req.Features != nil {
		features = string(*req.Features)
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	_, err := h.DB.Exec(`INSERT INTO mrcare_plans (offering, slug, name, description, annual_price, visits_per_year, features, sort_order, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (slug) DO UPDATE SET offering=EXCLUDED.offering, name=EXCLUDED.name, description=EXCLUDED.description,
            annual_price=EXCLUDED.annual_price, visits_per_year=EXCLUDED.visits_per_year, features=EXCLUDED.features,
            sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, updated_at=NOW()`,
		req.Offering, c.Param("slug"), req.Name, req.Description, req.AnnualPrice, req.VisitsPerYear, features, req.SortOrder, active)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Failed to save plan: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "Plan saved", nil)
}

type MrCareAddonRequest struct {
	Offering    string  `json:"offering" binding:"required,oneof=maintenance electronics"`
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	AnnualPrice float64 `json:"annual_price" binding:"required"`
	SortOrder   int     `json:"sort_order"`
	IsActive    *bool   `json:"is_active"`
}

// PUT /admin/mrcare/addons/:slug — upsert an add-on by slug
func (h *SettingsHandler) UpsertMrCareAddon(c *gin.Context) {
	var req MrCareAddonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	_, err := h.DB.Exec(`INSERT INTO mrcare_addons (offering, slug, name, description, annual_price, sort_order, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (slug) DO UPDATE SET offering=EXCLUDED.offering, name=EXCLUDED.name, description=EXCLUDED.description,
            annual_price=EXCLUDED.annual_price, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active`,
		req.Offering, c.Param("slug"), req.Name, req.Description, req.AnnualPrice, req.SortOrder, active)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Failed to save add-on: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "Add-on saved", nil)
}
