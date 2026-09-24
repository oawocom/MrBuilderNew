package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

var contentKeys = []string{"catalog_pergola_types", "catalog_brands", "catalog_enclosure_types", "catalog_accessories", "catalog_pergola_systems", "catalog_electronics_devices", "content_home_promo", "content_care_tips", "content_faq_pro", "content_support"}

// GET /content — public bundle of catalogue lists and copy for the apps
func (h *TrainingHandler) Content(c *gin.Context) {
	out := gin.H{}
	for _, k := range contentKeys {
		if raw, ok := GetSettingRaw(h.DB, k); ok {
			out[strings.TrimPrefix(strings.TrimPrefix(k, "catalog_"), "content_")] = json.RawMessage(raw)
		}
	}
	rows, _ := h.DB.Query(`SELECT slug, name, description, requires_practical FROM service_categories WHERE is_active ORDER BY sort_order`)
	cats := []gin.H{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var slug, name string
			var desc *string
			var prac bool
			if rows.Scan(&slug, &name, &desc, &prac) == nil {
				cats = append(cats, gin.H{"slug": slug, "name": name, "description": desc, "requires_practical": prac})
			}
		}
	}
	out["categories"] = cats
	out["version"] = contentVersion(h.DB)
	utils.Success(c, http.StatusOK, "", out)
}

// GET /legal/:kind — terms | privacy
func (h *TrainingHandler) Legal(c *gin.Context) {
	kind := c.Param("kind")
	if kind != "terms" && kind != "privacy" {
		utils.Error(c, http.StatusNotFound, "Unknown document")
		return
	}
	raw, ok := GetSettingRaw(h.DB, "legal_"+kind)
	if !ok {
		utils.Error(c, http.StatusNotFound, "Not published")
		return
	}
	utils.Success(c, http.StatusOK, "", json.RawMessage(raw))
}

func contentVersion(db *sql.DB) string {
	var v string
	db.QueryRow(`SELECT COALESCE(MAX(updated_at)::text,'') FROM platform_settings WHERE key LIKE 'catalog_%' OR key LIKE 'content_%' OR key LIKE 'legal_%'`).Scan(&v)
	return v
}
