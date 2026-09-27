package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/integrations"
	"github.com/mrbuilder/backend/internal/utils"
)

func jobAddress(addr, city, state, zip *string) string {
	parts := invFilterEmpty(strOr(addr, ""), strOr(city, ""), strOr(state, ""), strOr(zip, ""))
	if len(parts) < 2 {
		return ""
	}
	return strings.Join(parts, ", ")
}

// geocodeJob fills location_lat/lng from the address when the Maps integration is enabled (best-effort).
func geocodeJob(db *sql.DB, jobID string) bool {
	var addr, city, state, zip *string
	if db.QueryRow(`SELECT location_address, location_city, location_state, location_zip FROM jobs WHERE id=$1 AND location_lat IS NULL`, jobID).Scan(&addr, &city, &state, &zip) != nil {
		return false
	}
	a := jobAddress(addr, city, state, zip)
	if a == "" {
		return false
	}
	lat, lng, _, err := integrations.Geocode(a)
	if err != nil {
		return false
	}
	_, err = db.Exec(`UPDATE jobs SET location_lat=$1, location_lng=$2, updated_at=NOW() WHERE id=$3 AND location_lat IS NULL`, lat, lng, jobID)
	return err == nil
}

// POST /admin/geocode-missing — back-fill coordinates for jobs (and pergolas) that have an address but no lat/lng
func (h *IntegrationsHandler) GeocodeMissing(c *gin.Context) {
	if _, enabled := integrations.Get("maps"); !enabled {
		utils.Error(c, http.StatusServiceUnavailable, "Maps integration is not enabled")
		return
	}
	ids := []string{}
	rows, err := h.DB.Query(`SELECT id FROM jobs WHERE location_lat IS NULL AND location_address IS NOT NULL ORDER BY created_at DESC LIMIT 500`)
	if err == nil {
		for rows.Next() {
			var id string
			if rows.Scan(&id) == nil {
				ids = append(ids, id)
			}
		}
		rows.Close()
	}
	jobsDone := 0
	for _, id := range ids {
		if geocodeJob(h.DB, id) {
			jobsDone++
		}
	}
	pergDone := 0
	prows, err := h.DB.Query(`SELECT id, address_line1, city, state, zip_code FROM consumer_pergolas WHERE lat IS NULL AND address_line1 IS NOT NULL LIMIT 500`)
	if err == nil {
		type pg struct {
			id                     string
			addr, city, state, zip *string
		}
		list := []pg{}
		for prows.Next() {
			var p pg
			if prows.Scan(&p.id, &p.addr, &p.city, &p.state, &p.zip) == nil {
				list = append(list, p)
			}
		}
		prows.Close()
		for _, p := range list {
			if a := jobAddress(p.addr, p.city, p.state, p.zip); a != "" {
				if lat, lng, _, e := integrations.Geocode(a); e == nil {
					if _, e2 := h.DB.Exec(`UPDATE consumer_pergolas SET lat=$1, lng=$2 WHERE id=$3`, lat, lng, p.id); e2 == nil {
						pergDone++
					}
				}
			}
		}
	}
	utils.Success(c, http.StatusOK, "Geocoding done", gin.H{"jobs_total": len(ids), "jobs_geocoded": jobsDone, "pergolas_geocoded": pergDone})
}
