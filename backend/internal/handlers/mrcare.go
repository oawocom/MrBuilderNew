package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/mrbuilder/backend/internal/utils"
)

type MrCareHandler struct {
	DB *sql.DB
}

func NewMrCareHandler(db *sql.DB) *MrCareHandler {
	return &MrCareHandler{DB: db}
}

// ---------- pergolas ----------

const pergolaColumns = `id, consumer_id, name, address_line1, city, state, zip_code, lat, lng, structure_type, mounting, width_ft, length_ft, height_ft,
    spec, brand, model, installed_at::text, install_job_id, photo_url, is_active, created_at`

func scanPergola(row interface{ Scan(...interface{}) error }) (gin.H, error) {
	var id, consumerID, name string
	var addr, city, state, zip, st, mounting, brand, model, installed, installJob, photo *string
	var lat, lng, w, l, hgt *float64
	var spec []byte
	var active bool
	var created time.Time
	if err := row.Scan(&id, &consumerID, &name, &addr, &city, &state, &zip, &lat, &lng, &st, &mounting, &w, &l, &hgt, &spec, &brand, &model, &installed, &installJob, &photo, &active, &created); err != nil {
		return nil, err
	}
	return gin.H{"id": id, "consumer_id": consumerID, "name": name, "address_line1": addr, "city": city, "state": state, "zip_code": zip, "lat": lat, "lng": lng,
		"structure_type": st, "mounting": mounting, "width_ft": w, "length_ft": l, "height_ft": hgt, "spec": json.RawMessage(spec), "brand": brand, "model": model,
		"installed_at": installed, "install_job_id": installJob, "photo_url": photo, "is_active": active, "created_at": created}, nil
}

func (h *MrCareHandler) coverage(pergolaID string) gin.H {
	out := gin.H{"maintenance": nil, "electronics": nil}
	rows, err := h.DB.Query(`SELECT id, offering, plan_slug, status, renew_at FROM mrcare_subscriptions WHERE status='active' AND $1 = ANY(pergola_ids)`, pergolaID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var id, off, plan, status string
		var renew sql.NullTime
		if rows.Scan(&id, &off, &plan, &status, &renew) == nil {
			out[off] = gin.H{"subscription_id": id, "plan": plan, "status": status, "renew_at": nullTime(renew)}
		}
	}
	return out
}

// GET /pergolas
func (h *MrCareHandler) ListPergolas(c *gin.Context) {
	userID := c.GetString("user_id")
	rows, err := h.DB.Query(`SELECT `+pergolaColumns+` FROM consumer_pergolas WHERE consumer_id=$1 AND is_active ORDER BY created_at`, userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list pergolas")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		if p, err := scanPergola(rows); err == nil {
			p["coverage"] = h.coverage(p["id"].(string))
			out = append(out, p)
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

type PergolaRequest struct {
	Name          *string          `json:"name"`
	AddressLine1  *string          `json:"address_line1"`
	City          *string          `json:"city"`
	State         *string          `json:"state"`
	ZipCode       *string          `json:"zip_code"`
	Lat           *float64         `json:"lat"`
	Lng           *float64         `json:"lng"`
	StructureType *string          `json:"structure_type"`
	Mounting      *string          `json:"mounting" binding:"omitempty,oneof=attached free_standing"`
	WidthFt       *float64         `json:"width_ft"`
	LengthFt      *float64         `json:"length_ft"`
	HeightFt      *float64         `json:"height_ft"`
	Spec          *json.RawMessage `json:"spec"`
	Brand         *string          `json:"brand"`
	Model         *string          `json:"model"`
	InstalledAt   *string          `json:"installed_at"`
	PhotoURL      *string          `json:"photo_url"`
}

// POST /pergolas
func (h *MrCareHandler) CreatePergola(c *gin.Context) {
	userID := c.GetString("user_id")
	var req PergolaRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == nil {
		utils.Error(c, http.StatusBadRequest, "name is required")
		return
	}
	spec := "{}"
	if req.Spec != nil {
		spec = string(*req.Spec)
	}
	row := h.DB.QueryRow(`INSERT INTO consumer_pergolas (consumer_id, name, address_line1, city, state, zip_code, lat, lng, structure_type, mounting, width_ft, length_ft, height_ft, spec, brand, model, installed_at, photo_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17::date,$18) RETURNING `+pergolaColumns,
		userID, *req.Name, req.AddressLine1, req.City, req.State, req.ZipCode, req.Lat, req.Lng, req.StructureType, req.Mounting, req.WidthFt, req.LengthFt, req.HeightFt, spec, req.Brand, req.Model, req.InstalledAt, req.PhotoURL)
	p, err := scanPergola(row)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Failed to create pergola: "+err.Error())
		return
	}
	p["coverage"] = h.coverage(p["id"].(string))
	utils.Success(c, http.StatusCreated, "Pergola added", p)
}

// PATCH /pergolas/:id
func (h *MrCareHandler) UpdatePergola(c *gin.Context) {
	userID := c.GetString("user_id")
	var req PergolaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var spec interface{}
	if req.Spec != nil {
		spec = string(*req.Spec)
	}
	row := h.DB.QueryRow(`UPDATE consumer_pergolas SET name=COALESCE($1,name), address_line1=COALESCE($2,address_line1), city=COALESCE($3,city), state=COALESCE($4,state),
        zip_code=COALESCE($5,zip_code), lat=COALESCE($6,lat), lng=COALESCE($7,lng), structure_type=COALESCE($8,structure_type), mounting=COALESCE($9,mounting),
        width_ft=COALESCE($10,width_ft), length_ft=COALESCE($11,length_ft), height_ft=COALESCE($12,height_ft), spec=COALESCE($13::jsonb,spec), brand=COALESCE($14,brand),
        model=COALESCE($15,model), installed_at=COALESCE($16::date,installed_at), photo_url=COALESCE($17,photo_url), updated_at=NOW()
        WHERE id=$18 AND consumer_id=$19 RETURNING `+pergolaColumns,
		req.Name, req.AddressLine1, req.City, req.State, req.ZipCode, req.Lat, req.Lng, req.StructureType, req.Mounting, req.WidthFt, req.LengthFt, req.HeightFt, spec, req.Brand, req.Model, req.InstalledAt, req.PhotoURL, c.Param("id"), userID)
	p, err := scanPergola(row)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Pergola not found")
		return
	}
	p["coverage"] = h.coverage(p["id"].(string))
	utils.Success(c, http.StatusOK, "Pergola updated", p)
}

// DELETE /pergolas/:id — soft
func (h *MrCareHandler) DeletePergola(c *gin.Context) {
	userID := c.GetString("user_id")
	res, _ := h.DB.Exec(`UPDATE consumer_pergolas SET is_active=FALSE, updated_at=NOW() WHERE id=$1 AND consumer_id=$2`, c.Param("id"), userID)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Pergola not found")
		return
	}
	utils.Success(c, http.StatusOK, "Pergola removed", nil)
}

// EnsurePergolaForJob creates a pergola record when an installation job is paid (called from settle).
func EnsurePergolaForJob(db *sql.DB, jobID string) {
	db.Exec(`INSERT INTO consumer_pergolas (consumer_id, name, address_line1, city, state, zip_code, lat, lng, structure_type, mounting, width_ft, length_ft, height_ft, spec, installed_at, install_job_id)
        SELECT consumer_id, title, location_address, location_city, location_state, location_zip, location_lat, location_lng,
               pergola_spec->>'structure_type', mounting, width_ft, length_ft, height_ft, pergola_spec, NOW()::date, id
        FROM jobs j WHERE j.id=$1 AND j.service_category='installation' AND j.pergola_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM consumer_pergolas p WHERE p.install_job_id=j.id)`, jobID)
	db.Exec(`UPDATE jobs j SET pergola_id=p.id FROM consumer_pergolas p WHERE p.install_job_id=j.id AND j.id=$1 AND j.pergola_id IS NULL`, jobID)
}

// ---------- registered equipment ----------

type EquipmentRequest struct {
	PergolaID   string  `json:"pergola_id" binding:"required"`
	DeviceType  string  `json:"device_type" binding:"required,oneof=motor led_lighting fan electric_heater controller sensor speaker other"`
	Brand       *string `json:"brand"`
	Model       *string `json:"model"`
	Serial      *string `json:"serial"`
	InstalledAt *string `json:"installed_at"`
	PhotoURL    *string `json:"photo_url"`
}

// GET /equipment?pergola_id=
func (h *MrCareHandler) ListEquipment(c *gin.Context) {
	userID := c.GetString("user_id")
	where, args := "consumer_id=$1 AND is_active", []interface{}{userID}
	if v := c.Query("pergola_id"); v != "" {
		args = append(args, v)
		where += " AND pergola_id=$2"
	}
	rows, err := h.DB.Query(`SELECT id, pergola_id, device_type, brand, model, serial, installed_at::text, photo_url, registered_by, created_at FROM registered_equipment WHERE `+where+` ORDER BY created_at`, args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list equipment")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, pid, dtype, by string
		var brand, model, serial, inst, photo *string
		var at time.Time
		if rows.Scan(&id, &pid, &dtype, &brand, &model, &serial, &inst, &photo, &by, &at) == nil {
			out = append(out, gin.H{"id": id, "pergola_id": pid, "device_type": dtype, "brand": brand, "model": model, "serial": serial, "installed_at": inst, "photo_url": photo, "registered_by": by, "created_at": at})
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

// POST /equipment
func (h *MrCareHandler) AddEquipment(c *gin.Context) {
	userID := c.GetString("user_id")
	var req EquipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var own int
	h.DB.QueryRow(`SELECT COUNT(*) FROM consumer_pergolas WHERE id=$1 AND consumer_id=$2`, req.PergolaID, userID).Scan(&own)
	if own == 0 {
		utils.Error(c, http.StatusNotFound, "Pergola not found")
		return
	}
	var id string
	if err := h.DB.QueryRow(`INSERT INTO registered_equipment (pergola_id, consumer_id, device_type, brand, model, serial, installed_at, photo_url) VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8) RETURNING id`,
		req.PergolaID, userID, req.DeviceType, req.Brand, req.Model, req.Serial, req.InstalledAt, req.PhotoURL).Scan(&id); err != nil {
		utils.Error(c, http.StatusBadRequest, "Failed to register equipment: "+err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "Equipment registered", gin.H{"id": id})
}

// DELETE /equipment/:id
func (h *MrCareHandler) RemoveEquipment(c *gin.Context) {
	userID := c.GetString("user_id")
	res, _ := h.DB.Exec(`UPDATE registered_equipment SET is_active=FALSE WHERE id=$1 AND consumer_id=$2`, c.Param("id"), userID)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Equipment not found")
		return
	}
	utils.Success(c, http.StatusOK, "Equipment removed", nil)
}

// ---------- subscriptions ----------

const subColumns = `id, consumer_id, offering, plan_id, plan_slug, billing, status, pergola_ids, addons, price_plan, price_addons, price_total,
    visits_per_year, visits_used, claims_used, starts_at, renew_at, cancelled_at, cancel_reason, certificate_url, invoice_id, created_at`

func scanSub(row interface{ Scan(...interface{}) error }) (gin.H, error) {
	var id, consumerID, off, planID, planSlug, billing, status string
	var pergolas []string
	var addons []byte
	var pPlan, pAdd, pTotal float64
	var vpy, vused, cused int
	var starts, renew, cancelled sql.NullTime
	var reason, cert, invoice *string
	var created time.Time
	if err := row.Scan(&id, &consumerID, &off, &planID, &planSlug, &billing, &status, pq.Array(&pergolas), &addons, &pPlan, &pAdd, &pTotal, &vpy, &vused, &cused, &starts, &renew, &cancelled, &reason, &cert, &invoice, &created); err != nil {
		return nil, err
	}
	if pergolas == nil {
		pergolas = []string{}
	}
	return gin.H{"id": id, "consumer_id": consumerID, "offering": off, "plan_id": planID, "plan": planSlug, "billing": billing, "status": status, "pergola_ids": pergolas,
		"addons": json.RawMessage(addons), "price_plan": pPlan, "price_addons": pAdd, "price_total": pTotal, "visits_per_year": vpy, "visits_used": vused,
		"claims_used": cused, "starts_at": nullTime(starts), "renew_at": nullTime(renew), "cancelled_at": nullTime(cancelled), "cancel_reason": reason,
		"certificate_url": cert, "invoice_id": invoice, "created_at": created}, nil
}

type SubscriptionRequest struct {
	Offering   string              `json:"offering" binding:"required,oneof=maintenance electronics"`
	Plan       string              `json:"plan" binding:"required"`
	PergolaIDs []string            `json:"pergola_ids" binding:"required,min=1"`
	Addons     map[string][]string `json:"addons"` // pergola_id → addon slugs
	Consent    bool                `json:"consent"`
}

type subQuote struct {
	planID, planName              string
	pricePlan, priceAddons, total float64
	visits                        int
	lines                         []gin.H
}

func (h *MrCareHandler) priceSubscription(req SubscriptionRequest) (subQuote, error) {
	var q subQuote
	var planPrice float64
	var active bool
	if err := h.DB.QueryRow(`SELECT id, name, annual_price, visits_per_year, is_active FROM mrcare_plans WHERE slug=$1 AND offering=$2`, req.Plan, req.Offering).
		Scan(&q.planID, &q.planName, &planPrice, &q.visits, &active); err != nil || !active {
		return q, fmt.Errorf("unknown plan")
	}
	n := float64(len(req.PergolaIDs))
	q.pricePlan = money(planPrice * n)
	q.lines = append(q.lines, gin.H{"label": q.planName + " × " + fmt.Sprint(len(req.PergolaIDs)) + " pergola(s)", "amount": q.pricePlan})
	for pid, slugs := range req.Addons {
		for _, slug := range slugs {
			var name string
			var price float64
			if h.DB.QueryRow(`SELECT name, annual_price FROM mrcare_addons WHERE slug=$1 AND offering=$2 AND is_active`, slug, req.Offering).Scan(&name, &price) != nil {
				return q, fmt.Errorf("unknown add-on %s", slug)
			}
			q.priceAddons += price
			q.lines = append(q.lines, gin.H{"label": name, "pergola_id": pid, "amount": price})
		}
	}
	q.priceAddons = money(q.priceAddons)
	q.total = money(q.pricePlan + q.priceAddons)
	return q, nil
}

// POST /mrcare/quote — price a plan selection (Price & terms step)
func (h *MrCareHandler) QuoteSubscription(c *gin.Context) {
	var req SubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	q, err := h.priceSubscription(req)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	extras := gin.H{}
	if req.Offering == "electronics" {
		extras["pre_inspection_fee"] = GetSettingFloat(h.DB, "inspection_fee", 99)
		extras["service_call_fee"] = GetSettingFloat(h.DB, "electronics_claim_fee", 49)
		extras["claims_per_year"] = GetSettingInt(h.DB, "electronics_claims_per_year", 3)
	}
	utils.Success(c, http.StatusOK, "", gin.H{"lines": q.lines, "price_plan": q.pricePlan, "price_addons": q.priceAddons, "total": q.total, "visits_per_year": q.visits, "billing": "annual", "extras": extras})
}

// POST /mrcare/subscriptions — purchase (activates on payment; payment simulated until Stripe step)
func (h *MrCareHandler) CreateSubscription(c *gin.Context) {
	userID := c.GetString("user_id")
	var req SubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if !req.Consent {
		utils.Error(c, http.StatusBadRequest, "Terms consent is required")
		return
	}
	var own int
	h.DB.QueryRow(`SELECT COUNT(*) FROM consumer_pergolas WHERE consumer_id=$1 AND is_active AND id = ANY($2)`, userID, pq.Array(req.PergolaIDs)).Scan(&own)
	if own != len(req.PergolaIDs) {
		utils.Error(c, http.StatusBadRequest, "One or more pergolas not found")
		return
	}
	var covered int
	h.DB.QueryRow(`SELECT COUNT(*) FROM mrcare_subscriptions WHERE consumer_id=$1 AND offering=$2 AND status IN ('active','pending_payment') AND pergola_ids && $3`, userID, req.Offering, pq.Array(req.PergolaIDs)).Scan(&covered)
	if covered > 0 {
		utils.Error(c, http.StatusConflict, "A pergola in this selection is already covered by this offering")
		return
	}
	q, err := h.priceSubscription(req)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	addons := req.Addons
	if addons == nil {
		addons = map[string][]string{}
	}
	intentID, err := ChargeCustomer(h.DB, userID, q.total, "MrCare "+q.planName, map[string]string{"type": "mrcare", "plan": req.Plan})
	if err != nil {
		utils.Error(c, http.StatusPaymentRequired, "Payment failed: "+err.Error())
		return
	}
	tx, _ := h.DB.Begin()
	defer tx.Rollback()
	var subID, invoiceID string
	if err := tx.QueryRow(`INSERT INTO mrcare_subscriptions (consumer_id, offering, plan_id, plan_slug, pergola_ids, addons, price_plan, price_addons, price_total, visits_per_year, consent_at)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,NOW()) RETURNING id`,
		userID, req.Offering, q.planID, req.Plan, pq.Array(req.PergolaIDs), toJSON(addons), q.pricePlan, q.priceAddons, q.total, q.visits).Scan(&subID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to create subscription: "+err.Error())
		return
	}
	// invoice — consumer pays it (Stripe later); here: marked paid immediately to activate
	tx.QueryRow(`INSERT INTO invoices (consumer_id, amount, description, status, paid_at, metadata) VALUES ($1,$2,$3,'paid',NOW(),$4::jsonb) RETURNING id`,
		userID, q.total, "MrCare "+q.planName, toJSON(gin.H{"subscription_id": subID, "type": "mrcare"})).Scan(&invoiceID)
	tx.Exec(`UPDATE mrcare_subscriptions SET status='active', starts_at=NOW(), renew_at=NOW() + INTERVAL '1 year', invoice_id=NULLIF($1,'')::uuid, stripe_payment_intent_id=$3, updated_at=NOW() WHERE id=$2`, invoiceID, subID, nilIfEmpty(intentID))
	tx.Exec(`INSERT INTO transactions (user_id, transaction_type, status, amount, description) VALUES ($1,'job_payment','completed',$2,$3)`, userID, q.total, "MrCare "+q.planName)
	tx.Commit()
	addDocument(h.DB, userID, "certificate", "MrCare certificate · "+q.planName, nil, &req.PergolaIDs[0], &subID, nil, gin.H{"offering": req.Offering, "plan": req.Plan, "total": q.total, "pergola_ids": req.PergolaIDs})
	scheduleReminder(h.DB, userID, req.PergolaIDs[0], "plan_renewal", time.Now().AddDate(1, 0, 0), "subscription")
	notify(h.DB, userID, "mrcare_active", "MrCare plan active", q.planName+" is active — certificate available in Documents", "", "subscriptions", gin.H{"subscription_id": subID})
	h.respondSub(c, http.StatusCreated, "Subscription active", subID)
}

func (h *MrCareHandler) respondSub(c *gin.Context, code int, msg, id string) {
	s, err := scanSub(h.DB.QueryRow(`SELECT `+subColumns+` FROM mrcare_subscriptions WHERE id=$1`, id))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Subscription not found")
		return
	}
	utils.Success(c, code, msg, s)
}

// GET /mrcare — hub: both offerings with status, pergolas, actions
func (h *MrCareHandler) Hub(c *gin.Context) {
	userID := c.GetString("user_id")
	subs := []gin.H{}
	rows, err := h.DB.Query(`SELECT `+subColumns+` FROM mrcare_subscriptions WHERE consumer_id=$1 AND status<>'expired' ORDER BY created_at DESC`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			if s, e := scanSub(rows); e == nil {
				subs = append(subs, s)
			}
		}
	}
	var maint, elec interface{}
	for _, s := range subs {
		if s["status"] == "active" {
			if s["offering"] == "maintenance" && maint == nil {
				maint = s
			}
			if s["offering"] == "electronics" && elec == nil {
				elec = s
			}
		}
	}
	utils.Success(c, http.StatusOK, "", gin.H{
		"maintenance":   gin.H{"subscribed": maint != nil, "subscription": maint, "action": "book_maintenance"},
		"electronics":   gin.H{"subscribed": elec != nil, "subscription": elec, "action": "report_electronics_issue"},
		"subscriptions": subs,
	})
}

// GET /mrcare/subscriptions/:id
func (h *MrCareHandler) GetSubscription(c *gin.Context) {
	userID := c.GetString("user_id")
	s, err := scanSub(h.DB.QueryRow(`SELECT `+subColumns+` FROM mrcare_subscriptions WHERE id=$1 AND consumer_id=$2`, c.Param("id"), userID))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Subscription not found")
		return
	}
	utils.Success(c, http.StatusOK, "", s)
}

type SubscriptionChange struct {
	Plan       *string             `json:"plan"`
	PergolaIDs []string            `json:"pergola_ids"`
	Addons     map[string][]string `json:"addons"`
}

// PATCH /mrcare/subscriptions/:id — change plan / coverage / add-ons (re-priced; difference invoiced later)
func (h *MrCareHandler) ChangeSubscription(c *gin.Context) {
	userID := c.GetString("user_id")
	var req SubscriptionChange
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	cur, err := scanSub(h.DB.QueryRow(`SELECT `+subColumns+` FROM mrcare_subscriptions WHERE id=$1 AND consumer_id=$2 AND status='active'`, c.Param("id"), userID))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Active subscription not found")
		return
	}
	sr := SubscriptionRequest{Offering: cur["offering"].(string), Plan: cur["plan"].(string), PergolaIDs: cur["pergola_ids"].([]string)}
	json.Unmarshal(cur["addons"].(json.RawMessage), &sr.Addons)
	if req.Plan != nil {
		sr.Plan = *req.Plan
	}
	if req.PergolaIDs != nil {
		sr.PergolaIDs = req.PergolaIDs
	}
	if req.Addons != nil {
		sr.Addons = req.Addons
	}
	q, err := h.priceSubscription(sr)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.DB.Exec(`UPDATE mrcare_subscriptions SET plan_id=$1, plan_slug=$2, pergola_ids=$3, addons=$4::jsonb, price_plan=$5, price_addons=$6, price_total=$7, visits_per_year=$8, updated_at=NOW() WHERE id=$9`,
		q.planID, sr.Plan, pq.Array(sr.PergolaIDs), toJSON(sr.Addons), q.pricePlan, q.priceAddons, q.total, q.visits, c.Param("id"))
	h.respondSub(c, http.StatusOK, "Subscription updated", c.Param("id"))
}

// DELETE /mrcare/subscriptions/:id — cancel (stays active until renew_at; no refund logic yet)
func (h *MrCareHandler) CancelSubscription(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		Reason *string `json:"reason"`
	}
	c.ShouldBindJSON(&req)
	res, _ := h.DB.Exec(`UPDATE mrcare_subscriptions SET status='cancelled', cancelled_at=NOW(), cancel_reason=$1, updated_at=NOW() WHERE id=$2 AND consumer_id=$3 AND status='active'`, req.Reason, c.Param("id"), userID)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Active subscription not found")
		return
	}
	h.respondSub(c, http.StatusOK, "Subscription cancelled", c.Param("id"))
}

// ---------- maintenance bookings ----------

type BookingRequest struct {
	SubscriptionID  string           `json:"subscription_id" binding:"required"`
	PergolaID       string           `json:"pergola_id" binding:"required"`
	VisitType       string           `json:"visit_type" binding:"omitempty,oneof=seasonal pre_winter post_winter inspection"`
	PreferredWindow *json.RawMessage `json:"preferred_window"`
	Notes           *string          `json:"notes"`
}

func (h *MrCareHandler) pergolaJobFields(pergolaID string) (name string, addr, city, state, zip *string, lat, lng, w, l, hgt *float64, spec []byte) {
	h.DB.QueryRow(`SELECT name, address_line1, city, state, zip_code, lat, lng, width_ft, length_ft, height_ft, spec FROM consumer_pergolas WHERE id=$1`, pergolaID).
		Scan(&name, &addr, &city, &state, &zip, &lat, &lng, &w, &l, &hgt, &spec)
	return
}

// POST /mrcare/bookings — creates a $0 maintenance job covered by the plan
func (h *MrCareHandler) CreateBooking(c *gin.Context) {
	userID := c.GetString("user_id")
	var req BookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var status string
	var vpy, used int
	err := h.DB.QueryRow(`SELECT status, visits_per_year, visits_used FROM mrcare_subscriptions WHERE id=$1 AND consumer_id=$2 AND offering='maintenance' AND $3 = ANY(pergola_ids)`,
		req.SubscriptionID, userID, req.PergolaID).Scan(&status, &vpy, &used)
	if err != nil || status != "active" {
		utils.Error(c, http.StatusConflict, "No active maintenance plan covers this pergola")
		return
	}
	if used >= vpy {
		utils.Error(c, http.StatusConflict, fmt.Sprintf("All %d visits for this plan year are used", vpy))
		return
	}
	visit := req.VisitType
	if visit == "" {
		visit = "seasonal"
	}
	name, addr, city, state, zip, lat, lng, w, l, hgt, spec := h.pergolaJobFields(req.PergolaID)
	net := GetSettingFloat(h.DB, "maintenance_visit_contractor_net", 180)
	window := "{}"
	if req.PreferredWindow != nil {
		window = string(*req.PreferredWindow)
	}
	tx, _ := h.DB.Begin()
	defer tx.Rollback()
	var jobID string
	if err := tx.QueryRow(`INSERT INTO jobs (consumer_id, title, description, service_category, quote_method, status, kind, subscription_id, covered_by, pergola_id,
            location_address, location_city, location_state, location_zip, location_lat, location_lng, width_ft, length_ft, height_ft, pergola_spec, notes,
            quote_total, platform_fee, contractor_net)
        VALUES ($1,$2,$3,'maintenance','instant','matching','maintenance_booking',$4,'maintenance',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,0,0,$17) RETURNING id`,
		userID, "Maintenance visit · "+name, "Covered by Service & Maintenance plan — no charge to client", req.SubscriptionID, req.PergolaID,
		addr, city, state, zip, lat, lng, w, l, hgt, string(nz(spec)), req.Notes, net).Scan(&jobID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to create booking: "+err.Error())
		return
	}
	tx.Exec(`INSERT INTO maintenance_bookings (job_id, subscription_id, pergola_id, visit_type, preferred_window) VALUES ($1,$2,$3,$4,$5::jsonb)`, jobID, req.SubscriptionID, req.PergolaID, visit, window)
	tx.Exec(`UPDATE mrcare_subscriptions SET visits_used=visits_used+1, updated_at=NOW() WHERE id=$1`, req.SubscriptionID)
	logEvent(tx, jobID, userID, "consumer", "booking_requested", "", "matching", gin.H{"visit_type": visit, "subscription_id": req.SubscriptionID})
	tx.Commit()
	notify(h.DB, userID, "booking_requested", "Maintenance visit requested", "We are finding a technician", jobID, "requestDetail", gin.H{"stage": "matching"})
	for _, cid := range qualifiedContractorUserIDs(h.DB, "maintenance") {
		notify(h.DB, cid, "new_job", "New maintenance visit near you", name+" · "+strOr(city, ""), jobID, "job", gin.H{"stage": "marketplace"})
	}
	utils.Success(c, http.StatusCreated, "Visit requested", gin.H{"job_id": jobID, "visits_remaining": vpy - used - 1})
}

func nz(b []byte) []byte {
	if len(b) == 0 {
		return []byte("{}")
	}
	return b
}

// ---------- electronics claims ----------

type ClaimRequest struct {
	SubscriptionID  string           `json:"subscription_id" binding:"required"`
	PergolaID       string           `json:"pergola_id" binding:"required"`
	EquipmentID     *string          `json:"equipment_id"`
	IssueCode       string           `json:"issue_code" binding:"required,oneof=not_powering intermittent noise remote_unresponsive water_ingress other"`
	Notes           *string          `json:"notes"`
	Files           []string         `json:"files"`
	Priority        string           `json:"priority" binding:"omitempty,oneof=low normal high"`
	PreferredWindow *json.RawMessage `json:"preferred_window"`
}

// POST /mrcare/claims — submission never implies approval; admin reviews, then the job is matched
func (h *MrCareHandler) CreateClaim(c *gin.Context) {
	userID := c.GetString("user_id")
	var req ClaimRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var status string
	var used int
	err := h.DB.QueryRow(`SELECT status, claims_used FROM mrcare_subscriptions WHERE id=$1 AND consumer_id=$2 AND offering='electronics' AND $3 = ANY(pergola_ids)`,
		req.SubscriptionID, userID, req.PergolaID).Scan(&status, &used)
	if err != nil || status != "active" {
		utils.Error(c, http.StatusConflict, "No active Electronics Protection plan covers this pergola")
		return
	}
	limit := GetSettingInt(h.DB, "electronics_claims_per_year", 3)
	if used >= limit {
		utils.Error(c, http.StatusConflict, fmt.Sprintf("Claim limit of %d per plan year reached", limit))
		return
	}
	prio := req.Priority
	if prio == "" {
		prio = "normal"
	}
	name, addr, city, state, zip, lat, lng, w, l, hgt, spec := h.pergolaJobFields(req.PergolaID)
	fee := GetSettingFloat(h.DB, "electronics_claim_fee", 49)
	net := GetSettingFloat(h.DB, "electronics_claim_contractor_net", 240)
	window := "{}"
	if req.PreferredWindow != nil {
		window = string(*req.PreferredWindow)
	}
	tx, _ := h.DB.Begin()
	defer tx.Rollback()
	var jobID string
	if err := tx.QueryRow(`INSERT INTO jobs (consumer_id, title, description, service_category, quote_method, status, kind, subscription_id, covered_by, pergola_id,
            location_address, location_city, location_state, location_zip, location_lat, location_lng, width_ft, length_ft, height_ft, pergola_spec, issue_description, urgency,
            quote_total, platform_fee, contractor_net)
        VALUES ($1,$2,$3,'repair','instant','submitted','electronics_claim',$4,'electronics',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,0,$19) RETURNING id`,
		userID, "Electronics claim · "+name, "Covered by Electronics Protection — service-call fee applies", req.SubscriptionID, req.PergolaID,
		addr, city, state, zip, lat, lng, w, l, hgt, string(nz(spec)), req.Notes, prio, fee, net).Scan(&jobID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to create claim: "+err.Error())
		return
	}
	var claimID string
	tx.QueryRow(`INSERT INTO electronics_claims (job_id, subscription_id, pergola_id, equipment_id, issue_code, notes, files, priority, preferred_window, service_call_fee)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10) RETURNING id`, jobID, req.SubscriptionID, req.PergolaID, req.EquipmentID, req.IssueCode, req.Notes, toJSON(req.Files), prio, window, fee).Scan(&claimID)
	tx.Exec(`UPDATE mrcare_subscriptions SET claims_used=claims_used+1, updated_at=NOW() WHERE id=$1`, req.SubscriptionID)
	logEvent(tx, jobID, userID, "consumer", "claim_submitted", "", "submitted", gin.H{"claim_id": claimID, "issue_code": req.IssueCode})
	tx.Commit()
	notify(h.DB, userID, "claim_submitted", "Claim under review", "We'll confirm coverage and assign a technician", jobID, "requestDetail", gin.H{"stage": "claim_review"})
	notifyAdmins(h.DB, "claim_submitted", "New electronics claim", req.IssueCode+" · "+name, jobID, gin.H{"claim_id": claimID})
	utils.Success(c, http.StatusCreated, "Claim submitted", gin.H{"job_id": jobID, "claim_id": claimID, "service_call_fee": fee})
}

type ClaimReview struct {
	Status string  `json:"status" binding:"required,oneof=approved denied"`
	Notes  *string `json:"notes"`
}

// PATCH /admin/mrcare/claims/:id — approve → job goes to matching (repair-qualified contractors); deny → job cancelled
func (h *MrCareHandler) AdminReviewClaim(c *gin.Context) {
	userID := c.GetString("user_id")
	var req ClaimReview
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var jobID, consumerID, title, cur string
	var subID string
	var city *string
	if err := h.DB.QueryRow(`SELECT cl.job_id, j.consumer_id, j.title, j.location_city, cl.review_status, cl.subscription_id FROM electronics_claims cl JOIN jobs j ON j.id=cl.job_id WHERE cl.id=$1`, c.Param("id")).
		Scan(&jobID, &consumerID, &title, &city, &cur, &subID); err != nil {
		utils.Error(c, http.StatusNotFound, "Claim not found")
		return
	}
	if cur != "under_review" {
		utils.Error(c, http.StatusConflict, "Claim already "+cur)
		return
	}
	h.DB.Exec(`UPDATE electronics_claims SET review_status=$1, reviewed_by=$2, reviewed_at=NOW() WHERE id=$3`, req.Status, userID, c.Param("id"))
	if req.Status == "approved" {
		h.DB.Exec(`UPDATE jobs SET status='matching', updated_at=NOW() WHERE id=$1`, jobID)
		logEvent(h.DB, jobID, userID, "admin", "claim_approved", "submitted", "matching", gin.H{"notes": req.Notes})
		notify(h.DB, consumerID, "claim_approved", "Claim approved", "Finding a technician for your repair", jobID, "requestDetail", gin.H{"stage": "matching"})
		for _, cid := range qualifiedContractorUserIDs(h.DB, "repair") {
			notify(h.DB, cid, "new_job", "New electronics repair near you", title+" · "+strOr(city, ""), jobID, "job", gin.H{"stage": "marketplace"})
		}
	} else {
		h.DB.Exec(`UPDATE jobs SET status='cancelled_by_client', cancelled_at=NOW(), updated_at=NOW() WHERE id=$1`, jobID)
		h.DB.Exec(`UPDATE mrcare_subscriptions SET claims_used=GREATEST(claims_used-1,0) WHERE id=$1`, subID)
		logEvent(h.DB, jobID, userID, "admin", "claim_denied", "submitted", "cancelled_by_client", gin.H{"notes": req.Notes})
		notify(h.DB, consumerID, "claim_denied", "Claim not covered", strOr(req.Notes, "This issue is outside the plan's coverage"), jobID, "requestDetail", gin.H{"stage": "claim_denied"})
	}
	utils.Success(c, http.StatusOK, "Claim "+req.Status, nil)
}

// GET /admin/mrcare/claims?status=under_review
func (h *MrCareHandler) AdminListClaims(c *gin.Context) {
	page, limit := utils.Pagination(c)
	where, args := "1=1", []interface{}{}
	if v := c.Query("status"); v != "" {
		args = append(args, v)
		where = "cl.review_status=$1"
	}
	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM electronics_claims cl WHERE `+where, args...).Scan(&total)
	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query(`SELECT cl.id, cl.job_id, j.request_code, j.consumer_id, u.first_name || ' ' || u.last_name, cl.issue_code, cl.priority, cl.review_status, cl.service_call_fee, cl.created_at
        FROM electronics_claims cl JOIN jobs j ON j.id=cl.job_id JOIN users u ON u.id=j.consumer_id WHERE `+where+` ORDER BY cl.created_at DESC LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list claims")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, jobID, consumerID, name, issue, prio, status string
		var code *string
		var fee float64
		var at time.Time
		if rows.Scan(&id, &jobID, &code, &consumerID, &name, &issue, &prio, &status, &fee, &at) == nil {
			out = append(out, gin.H{"id": id, "job_id": jobID, "request_code": code, "consumer_id": consumerID, "consumer": name, "issue_code": issue, "priority": prio, "review_status": status, "service_call_fee": fee, "created_at": at})
		}
	}
	utils.Paginated(c, http.StatusOK, out, total, page, limit)
}
