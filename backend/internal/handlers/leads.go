package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

type LeadsHandler struct{ DB *sql.DB }

// POST /leads — public website forms. Body: {kind, name|contact, email, phone, company?, ...fields}
func (h *LeadsHandler) Create(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Error(c, http.StatusBadRequest, "Invalid body")
		return
	}
	str := func(k string) string {
		if v, ok := body[k].(string); ok {
			return strings.TrimSpace(v)
		}
		return ""
	}
	kind := str("kind")
	if kind != "contractor" && kind != "consumer" && kind != "partner" {
		utils.Error(c, http.StatusBadRequest, "Unknown form kind")
		return
	}
	name := str("name")
	if name == "" {
		name = str("contact")
	}
	email, phone, company := strings.ToLower(str("email")), str("phone"), str("company")
	if email == "" || !strings.Contains(email, "@") {
		utils.Error(c, http.StatusBadRequest, "A valid email is required")
		return
	}
	if len(body) > 60 {
		utils.Error(c, http.StatusBadRequest, "Too many fields")
		return
	}
	// duplicate guard: same kind + email or phone within 24h
	var dup int
	h.DB.QueryRow(`SELECT COUNT(*) FROM website_leads WHERE kind=$1 AND created_at > NOW() - INTERVAL '24 hours' AND (lower(email)=$2 OR ($3<>'' AND phone=$3))`, kind, email, phone).Scan(&dup)
	if dup > 0 {
		utils.Error(c, http.StatusConflict, "We already have your details from the last 24 hours — we'll be in touch.")
		return
	}
	delete(body, "kind")
	payload, _ := json.Marshal(body)
	var id string
	if err := h.DB.QueryRow(`INSERT INTO website_leads (kind, name, email, phone, company, payload, source) VALUES ($1,$2,$3,$4,$5,$6,'website') RETURNING id`,
		kind, nullIfEmpty(name), email, nullIfEmpty(phone), nullIfEmpty(company), payload).Scan(&id); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Could not save")
		return
	}
	// notify admins (in-app)
	rows, _ := h.DB.Query(`SELECT id FROM users WHERE role='admin' AND status='active'`)
	if rows != nil {
		defer rows.Close()
		title := map[string]string{"contractor": "New contractor waitlist signup", "consumer": "New website service request", "partner": "New partnership inquiry"}[kind]
		for rows.Next() {
			var uid string
			if rows.Scan(&uid) == nil {
				notify(h.DB, uid, "lead", title, name+" · "+email, "", "leads", gin.H{"lead_id": id})
			}
		}
	}
	QueueEmail(h.DB, "", email, "lead_received", map[string]string{"name": name, "link": publicBase()}, nil, "", "")
	utils.Success(c, http.StatusCreated, "Saved", gin.H{"id": id})
}

// GET /admin/leads?kind=&status=&q=
func (h *LeadsHandler) AdminList(c *gin.Context) {
	kind, status, q := c.Query("kind"), c.Query("status"), strings.ToLower(strings.TrimSpace(c.Query("q")))
	rows, err := h.DB.Query(`SELECT id, kind, COALESCE(name,''), COALESCE(email,''), COALESCE(phone,''), COALESCE(company,''), payload, status, COALESCE(notes,''), created_at
        FROM website_leads WHERE ($1='' OR kind=$1) AND ($2='' OR status=$2) AND ($3='' OR lower(COALESCE(name,'')||' '||COALESCE(email,'')||' '||COALESCE(company,'')) LIKE '%'||$3||'%')
        ORDER BY created_at DESC LIMIT 500`, kind, status, q)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Query failed")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, k, name, email, phone, company, st, notes, created string
		var payload []byte
		if rows.Scan(&id, &k, &name, &email, &phone, &company, &payload, &st, &notes, &created) == nil {
			out = append(out, gin.H{"id": id, "kind": k, "name": name, "email": email, "phone": phone, "company": company, "payload": json.RawMessage(payload), "status": st, "notes": notes, "created_at": created})
		}
	}
	var counts struct{ New, Contractor, Consumer, Partner int }
	h.DB.QueryRow(`SELECT COUNT(*) FILTER (WHERE status='new'), COUNT(*) FILTER (WHERE kind='contractor'), COUNT(*) FILTER (WHERE kind='consumer'), COUNT(*) FILTER (WHERE kind='partner') FROM website_leads`).Scan(&counts.New, &counts.Contractor, &counts.Consumer, &counts.Partner)
	utils.Success(c, http.StatusOK, "", gin.H{"leads": out, "counts": gin.H{"new": counts.New, "contractor": counts.Contractor, "consumer": counts.Consumer, "partner": counts.Partner}})
}

// PATCH /admin/leads/:id {status?, notes?}
func (h *LeadsHandler) AdminUpdate(c *gin.Context) {
	var body struct {
		Status *string `json:"status"`
		Notes  *string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Error(c, http.StatusBadRequest, "Invalid body")
		return
	}
	if body.Status != nil {
		if _, err := h.DB.Exec(`UPDATE website_leads SET status=$1, updated_at=NOW() WHERE id=$2`, *body.Status, c.Param("id")); err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid status")
			return
		}
	}
	if body.Notes != nil {
		h.DB.Exec(`UPDATE website_leads SET notes=$1, updated_at=NOW() WHERE id=$2`, *body.Notes, c.Param("id"))
	}
	utils.Success(c, http.StatusOK, "Updated", nil)
}

func nullIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
