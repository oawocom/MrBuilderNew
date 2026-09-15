package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/models"
	"github.com/mrbuilder/backend/internal/utils"
)

func money(f float64) float64 { return math.Round(f*100) / 100 }

func inList(s string, list ...string) bool {
	for _, x := range list {
		if s == x {
			return true
		}
	}
	return false
}

var terminalStatuses = []string{"completed_paid", "dispute_upheld", "cancelled_by_client", "cancelled_by_contractor", "confirmed", "cancelled", "quote_declined"}

func notifyAdmins(db execer, ntype, title, body, jobID string, params map[string]interface{}) {
	rows, err := db.Query(`SELECT id FROM users WHERE role='admin' AND status='active'`)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			p := map[string]interface{}{}
			for k, v := range params {
				p[k] = v
			}
			notify(db, id, ntype, title, body, jobID, "adminJob", p)
		}
	}
}

func partyName(db execer, userID *string) string {
	if userID == nil {
		return "Contractor"
	}
	var n string
	db.QueryRow(`SELECT first_name || ' ' || last_name FROM users WHERE id=$1`, *userID).Scan(&n)
	if n == "" {
		return "Contractor"
	}
	return n
}

// loadForContractor returns the job if the caller is its assigned contractor and status is one of allowed.
func (h *JobHandler) loadForContractor(c *gin.Context, allowed ...string) *models.Job {
	userID := c.GetString("user_id")
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return nil
	}
	if j.ContractorID == nil || *j.ContractorID != userID {
		utils.Error(c, http.StatusForbidden, "You are not assigned to this job")
		return nil
	}
	if !j.IsAssessment && lockState(h.DB, userID).Locked {
		utils.Error(c, http.StatusForbidden, "Your account is locked until training is complete")
		return nil
	}
	if len(allowed) > 0 && !inList(j.Status, allowed...) {
		utils.Error(c, http.StatusConflict, "Not allowed in status "+j.Status)
		return nil
	}
	return j
}

func (h *JobHandler) loadForConsumer(c *gin.Context, allowed ...string) *models.Job {
	userID := c.GetString("user_id")
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return nil
	}
	if j.ConsumerID != userID {
		utils.Error(c, http.StatusForbidden, "Not your request")
		return nil
	}
	if len(allowed) > 0 && !inList(j.Status, allowed...) {
		utils.Error(c, http.StatusConflict, "Not allowed in status "+j.Status)
		return nil
	}
	return j
}

// ---------- en route / arrived ----------

type EnRouteRequest struct {
	EtaMinutes int `json:"eta_minutes" binding:"required,min=1"`
}

// POST /jobs/:id/en-route
func (h *JobHandler) EnRoute(c *gin.Context) {
	var req EnRouteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j := h.loadForContractor(c, "assigned", "return_visit_scheduled", "dispute_rejected", "issue_reported")
	if j == nil {
		return
	}
	from := j.Status
	to := "en_route"
	if from != "assigned" {
		to = from // return visit: keep status, just record the trip
	}
	h.DB.Exec(`UPDATE jobs SET status=$1, en_route_eta_minutes=$2, en_route_at=NOW(), updated_at=NOW() WHERE id=$3`, to, req.EtaMinutes, j.ID)
	logEvent(h.DB, j.ID, *j.ContractorID, "contractor", "en_route", from, to, gin.H{"eta_minutes": req.EtaMinutes})
	notify(h.DB, j.ConsumerID, "en_route", partyName(h.DB, j.ContractorID)+" is on the way", fmt.Sprintf("ETA about %d minutes", req.EtaMinutes), j.ID, "requestDetail", gin.H{"stage": "en_route"})
	h.respondJob(c, http.StatusOK, "On my way", j.ID)
}

// POST /jobs/:id/arrived
func (h *JobHandler) Arrived(c *gin.Context) {
	j := h.loadForContractor(c, "assigned", "en_route", "return_visit_scheduled", "dispute_rejected", "issue_reported")
	if j == nil {
		return
	}
	from := j.Status
	to := "arrived"
	if !inList(from, "assigned", "en_route") {
		to = from
	}
	h.DB.Exec(`UPDATE jobs SET status=$1, arrived_at=NOW(), updated_at=NOW() WHERE id=$2`, to, j.ID)
	logEvent(h.DB, j.ID, *j.ContractorID, "contractor", "arrived", from, to, nil)
	notify(h.DB, j.ConsumerID, "arrived", partyName(h.DB, j.ContractorID)+" has arrived", "Your contractor is on site", j.ID, "requestDetail", gin.H{"stage": "arrived"})
	h.respondJob(c, http.StatusOK, "Arrived", j.ID)
}

// ---------- before-work evidence + checklist ----------

type EvidenceRequest struct {
	Kind       string   `json:"kind" binding:"required,oneof=area product damage"`
	URL        string   `json:"url" binding:"required"`
	Note       *string  `json:"note"`
	CapturedAt *string  `json:"captured_at"`
	Lat        *float64 `json:"lat"`
	Lng        *float64 `json:"lng"`
}

// POST /jobs/:id/evidence — before Start only; immutable afterwards
func (h *JobHandler) AddEvidence(c *gin.Context) {
	var req EvidenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j := h.loadForContractor(c, "assigned", "en_route", "arrived")
	if j == nil {
		return
	}
	if req.Kind == "damage" && (req.Note == nil || strings.TrimSpace(*req.Note) == "") {
		utils.Error(c, http.StatusBadRequest, "Damage photos need a note")
		return
	}
	var id string
	err := h.DB.QueryRow(`INSERT INTO job_evidence (job_id, kind, url, note, captured_at, lat, lng, uploaded_by)
        VALUES ($1,$2,$3,$4,$5::timestamptz,$6,$7,$8) RETURNING id`,
		j.ID, req.Kind, req.URL, req.Note, req.CapturedAt, req.Lat, req.Lng, *j.ContractorID).Scan(&id)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to save evidence: "+err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "Evidence saved", gin.H{"id": id, "counts": h.evidenceCounts(j.ID, *j.ContractorID)})
}

func (h *JobHandler) evidenceCounts(jobID, contractorID string) map[string]int {
	out := map[string]int{"area": 0, "product": 0, "damage": 0}
	rows, err := h.DB.Query(`SELECT kind, COUNT(*) FROM job_evidence WHERE job_id=$1 AND uploaded_by=$2 AND kind IN ('area','product','damage') GROUP BY kind`, jobID, contractorID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var k string
		var n int
		if rows.Scan(&k, &n) == nil {
			out[k] = n
		}
	}
	return out
}

// GET /jobs/:id/evidence — owner, assigned contractor, admin
func (h *JobHandler) ListEvidence(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if !(role == "admin" || j.ConsumerID == userID || (j.ContractorID != nil && *j.ContractorID == userID)) {
		utils.Error(c, http.StatusForbidden, "Not allowed")
		return
	}
	rows, err := h.DB.Query(`SELECT id, kind, url, note, captured_at, lat, lng, uploaded_by, created_at FROM job_evidence WHERE job_id=$1 ORDER BY created_at`, j.ID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load evidence")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, kind, url string
		var note, by *string
		var cap sql.NullTime
		var lat, lng *float64
		var at time.Time
		if rows.Scan(&id, &kind, &url, &note, &cap, &lat, &lng, &by, &at) == nil {
			var capAt interface{}
			if cap.Valid {
				capAt = cap.Time
			}
			out = append(out, gin.H{"id": id, "kind": kind, "url": url, "note": note, "captured_at": capAt, "lat": lat, "lng": lng, "uploaded_by": by, "created_at": at})
		}
	}
	utils.Success(c, http.StatusOK, "", gin.H{"items": out, "damage_flagged": j.DamageFlagged, "shared_with": []string{"customer", "admin"}})
}

type ChecklistRequest struct {
	Items []string `json:"items" binding:"required"`
}

// categoryChecklist returns item ids and which are critical
func (h *JobHandler) categoryChecklist(category string) (ids []string, critical map[string]bool) {
	critical = map[string]bool{}
	var raw []byte
	if h.DB.QueryRow(`SELECT pre_job_checklist FROM service_categories WHERE slug=$1`, category).Scan(&raw) != nil {
		return
	}
	var items []struct {
		ID       string `json:"id"`
		Critical bool   `json:"critical"`
	}
	json.Unmarshal(raw, &items)
	for _, it := range items {
		ids = append(ids, it.ID)
		critical[it.ID] = it.Critical
	}
	return
}

// PUT /jobs/:id/checklist — save ticked items (validated against the category list)
func (h *JobHandler) UpdateChecklist(c *gin.Context) {
	var req ChecklistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j := h.loadForContractor(c, "assigned", "en_route", "arrived")
	if j == nil {
		return
	}
	ids, _ := h.categoryChecklist(strOr(j.ServiceCategory, ""))
	valid := map[string]bool{}
	for _, id := range ids {
		valid[id] = true
	}
	done := []string{}
	for _, it := range req.Items {
		if valid[it] {
			done = append(done, it)
		}
	}
	h.DB.Exec(`UPDATE jobs SET checklist_done=$1::jsonb, updated_at=NOW() WHERE id=$2`, toJSON(done), j.ID)
	utils.Success(c, http.StatusOK, "Checklist saved", gin.H{"done": done, "total": len(ids)})
}

type StartRequest struct {
	DamagePresent bool `json:"damage_present"`
}

// POST /jobs/:id/start — gated by checklist + evidence rules
func (h *JobHandler) StartJob(c *gin.Context) {
	var req StartRequest
	c.ShouldBindJSON(&req)
	j := h.loadForContractor(c, "arrived")
	if j == nil {
		return
	}
	missing := []string{}

	ids, _ := h.categoryChecklist(strOr(j.ServiceCategory, ""))
	var done []string
	json.Unmarshal(j.ChecklistDone, &done)
	doneSet := map[string]bool{}
	for _, d := range done {
		doneSet[d] = true
	}
	for _, id := range ids {
		if !doneSet[id] {
			missing = append(missing, "checklist:"+id)
		}
	}

	counts := h.evidenceCounts(j.ID, *j.ContractorID)
	if counts["area"] < 3 {
		missing = append(missing, fmt.Sprintf("area_photos:%d/3", counts["area"]))
	}
	if counts["product"] < 1 {
		missing = append(missing, "product_photos:0/1")
	}
	if req.DamagePresent {
		var withNote int
		h.DB.QueryRow(`SELECT COUNT(*) FROM job_evidence WHERE job_id=$1 AND uploaded_by=$2 AND kind='damage' AND COALESCE(note,'')<>''`, j.ID, *j.ContractorID).Scan(&withNote)
		if withNote < 1 {
			missing = append(missing, "damage_photo_with_note:0/1")
		}
	}
	if len(missing) > 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"success": false, "error": "Start requirements not met", "missing": missing})
		return
	}

	h.DB.Exec(`UPDATE jobs SET status='in_progress', started_at=NOW(), damage_flagged=$1, updated_at=NOW() WHERE id=$2`, req.DamagePresent, j.ID)
	logEvent(h.DB, j.ID, *j.ContractorID, "contractor", "started", "arrived", "in_progress", gin.H{"damage_present": req.DamagePresent, "evidence": counts})
	notify(h.DB, j.ConsumerID, "work_started", "Work has started", partyName(h.DB, j.ContractorID)+" started the job · before-work photos are in your request", j.ID, "requestDetail", gin.H{"stage": "in_progress"})
	h.respondJob(c, http.StatusOK, "Job started", j.ID)
}

// ---------- safety pause ----------

type PauseRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// POST /jobs/:id/pause
func (h *JobHandler) Pause(c *gin.Context) {
	var req PauseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j := h.loadForContractor(c, "in_progress")
	if j == nil {
		return
	}
	h.DB.Exec(`UPDATE jobs SET status='paused_safety', paused_at=NOW(), pause_reason=$1, updated_at=NOW() WHERE id=$2`, req.Reason, j.ID)
	logEvent(h.DB, j.ID, *j.ContractorID, "contractor", "paused_safety", "in_progress", "paused_safety", gin.H{"reason": req.Reason})
	notify(h.DB, j.ConsumerID, "work_paused", "Work paused for safety", req.Reason, j.ID, "requestDetail", gin.H{"stage": "paused"})
	notifyAdmins(h.DB, "work_paused", "Safety pause on "+strOr(j.RequestCode, ""), req.Reason, j.ID, gin.H{"stage": "paused"})
	h.respondJob(c, http.StatusOK, "Work paused", j.ID)
}

// POST /jobs/:id/resume
func (h *JobHandler) Resume(c *gin.Context) {
	j := h.loadForContractor(c, "paused_safety")
	if j == nil {
		return
	}
	h.DB.Exec(`UPDATE jobs SET status='in_progress', resumed_at=NOW(), updated_at=NOW() WHERE id=$1`, j.ID)
	logEvent(h.DB, j.ID, *j.ContractorID, "contractor", "resumed", "paused_safety", "in_progress", nil)
	notify(h.DB, j.ConsumerID, "work_resumed", "Work resumed", partyName(h.DB, j.ContractorID)+" resumed the job", j.ID, "requestDetail", gin.H{"stage": "in_progress"})
	h.respondJob(c, http.StatusOK, "Work resumed", j.ID)
}

// ---------- completion / confirmation ----------

type CompleteRequest struct {
	Photos []string `json:"photos" binding:"required,min=2"`
	Note   string   `json:"note" binding:"required"`
}

func (h *JobHandler) markAwaiting(j *models.Job, from, eventType string, data interface{}) {
	hours := GetSettingInt(h.DB, "auto_confirm_hours", 72)
	h.DB.Exec(`UPDATE jobs SET status='awaiting_confirmation', completed_at=NOW(), auto_confirm_at=NOW() + ($1 || ' hours')::interval, updated_at=NOW() WHERE id=$2`, fmt.Sprint(hours), j.ID)
	logEvent(h.DB, j.ID, *j.ContractorID, "contractor", eventType, from, "awaiting_confirmation", data)
	notify(h.DB, j.ConsumerID, "awaiting_confirmation", partyName(h.DB, j.ContractorID)+" marked your job complete", fmt.Sprintf("Please confirm within %d hours", hours), j.ID, "requestDetail", gin.H{"stage": "awaiting"})
}

// POST /jobs/:id/complete — ≥2 photos + note → awaiting_confirmation
func (h *JobHandler) CompleteJob(c *gin.Context) {
	var req CompleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j := h.loadForContractor(c, "in_progress")
	if j == nil {
		return
	}
	for _, u := range req.Photos {
		h.DB.Exec(`INSERT INTO job_evidence (job_id, kind, url, uploaded_by) VALUES ($1,'completion',$2,$3)`, j.ID, u, *j.ContractorID)
	}
	h.DB.Exec(`UPDATE jobs SET completion_note=$1 WHERE id=$2`, req.Note, j.ID)
	h.markAwaiting(j, "in_progress", "completed", gin.H{"photos": len(req.Photos)})
	h.respondJob(c, http.StatusOK, "Marked complete", j.ID)
}

// POST /jobs/:id/fix-done — after an issue / rejected dispute / return visit, contractor resubmits
func (h *JobHandler) FixDone(c *gin.Context) {
	var req CompleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j := h.loadForContractor(c, "issue_reported", "dispute_rejected", "return_visit_scheduled")
	if j == nil {
		return
	}
	for _, u := range req.Photos {
		h.DB.Exec(`INSERT INTO job_evidence (job_id, kind, url, uploaded_by) VALUES ($1,'completion',$2,$3)`, j.ID, u, *j.ContractorID)
	}
	h.DB.Exec(`UPDATE jobs SET completion_note=$1 WHERE id=$2`, req.Note, j.ID)
	h.markAwaiting(j, j.Status, "fix_done", gin.H{"photos": len(req.Photos)})
	h.respondJob(c, http.StatusOK, "Fix submitted", j.ID)
}

// settle moves money for a finished job: consumer charge, contractor earning + tip, platform fee.
// Stripe capture is wired in the payments step; for now it records transactions and balances.
func settle(db *sql.DB, jobID, actorID, actorRole, eventType string, tip float64) error {
	j, err := scanJob(db.QueryRow("SELECT "+jobColumns+" FROM jobs WHERE id=$1", jobID))
	if err != nil {
		return err
	}
	if j.ContractorID == nil || j.QuoteTotal == nil {
		return fmt.Errorf("job has no contractor or quote")
	}
	total := *j.QuoteTotal
	fee := 0.0
	if j.PlatformFee != nil {
		fee = *j.PlatformFee
	}
	net := total - fee
	if j.ContractorNet != nil {
		net = *j.ContractorNet
	}
	charged := money(total - j.InspectionFeeCredit + tip)
	payout := money(net + tip)

	intentID, err := ChargeCustomer(db, j.ConsumerID, charged, "MrBuilder "+strOr(j.RequestCode, j.Title), map[string]string{"job_id": j.ID, "type": "job"})
	if err != nil {
		notify(db, j.ConsumerID, "payment_failed", "Payment failed", "We couldn't charge your card: "+err.Error()+". Update your payment method and confirm again.", j.ID, "requestDetail", gin.H{"stage": "awaiting"})
		return fmt.Errorf("card charge failed: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE jobs SET status='completed_paid', tip=$1, consumer_charged=$2, stripe_payment_intent_id=$4, confirmed_at=NOW(), paid_at=NOW(), updated_at=NOW() WHERE id=$3`, tip, charged, j.ID, nilIfEmpty(intentID)); err != nil {
		return err
	}
	tx.Exec(`INSERT INTO transactions (user_id, job_id, transaction_type, status, amount, description, stripe_payment_intent_id) VALUES ($1,$2,'job_payment','completed',$3,$4,$5)`,
		j.ConsumerID, j.ID, charged, "Payment for "+strOr(j.RequestCode, j.Title), nilIfEmpty(intentID))
	tx.Exec(`INSERT INTO transactions (user_id, job_id, transaction_type, status, amount, description) VALUES ($1,$2,'earning','completed',$3,$4)`,
		*j.ContractorID, j.ID, money(net), "Job "+strOr(j.RequestCode, j.Title))
	if fee > 0 {
		tx.Exec(`INSERT INTO transactions (user_id, job_id, transaction_type, status, amount, description) VALUES ($1,$2,'platform_fee','completed',$3,'MrBuilder fee')`,
			*j.ContractorID, j.ID, money(-fee))
	}
	if tip > 0 {
		tx.Exec(`INSERT INTO transactions (user_id, job_id, transaction_type, status, amount, description) VALUES ($1,$2,'tip','completed',$3,'Tip')`,
			*j.ContractorID, j.ID, money(tip))
	}
	tx.Exec(`INSERT INTO balances (user_id, balance) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET balance=balances.balance+$2, updated_at=NOW()`, *j.ContractorID, payout)
	tx.Exec(`INSERT INTO invoices (job_id, consumer_id, contractor_id, amount, description, status, paid_at, stripe_payment_intent_id) VALUES ($1,$2,$3,$4,$5,'paid',NOW(),$6)`,
		j.ID, j.ConsumerID, *j.ContractorID, charged, "Invoice "+strOr(j.RequestCode, ""), nilIfEmpty(intentID))
	tx.Exec(`UPDATE contractor_profiles SET jobs_completed=jobs_completed+1, updated_at=NOW() WHERE user_id=$1`, *j.ContractorID)
	logEvent(tx, j.ID, actorID, actorRole, eventType, j.Status, "completed_paid", gin.H{"charged": charged, "payout": payout, "tip": tip, "fee": fee})
	if err := tx.Commit(); err != nil {
		return err
	}

	notify(db, j.ConsumerID, "payment_successful", "Payment successful", fmt.Sprintf("$%.2f charged · receipt available", charged), j.ID, "requestDetail", gin.H{"stage": "completed"})
	notify(db, *j.ContractorID, "job_paid", "Client confirmed & paid", fmt.Sprintf("$%.2f added to your balance", payout), j.ID, "job", gin.H{"stage": "completed"})
	MaybeAutoPayout(db, *j.ContractorID)
	EnsurePergolaForJob(db, j.ID)
	documentsForPaidJob(db, j.ID)
	remindersForPaidJob(db, j.ID)
	rewardReferral(db, j.ConsumerID, j.ID)
	return nil
}

type ConfirmRequest struct {
	Tip float64 `json:"tip"`
}

// POST /jobs/:id/confirm — only the originating account approves; releases payment
func (h *JobHandler) ConfirmJob(c *gin.Context) {
	var req ConfirmRequest
	c.ShouldBindJSON(&req)
	j := h.loadForConsumer(c, "awaiting_confirmation")
	if j == nil {
		return
	}
	if req.Tip < 0 || (req.Tip > 0 && !GetSettingBool(h.DB, "tip_enabled", true)) {
		req.Tip = 0
	}
	if err := settle(h.DB, j.ID, j.ConsumerID, "consumer", "confirmed", money(req.Tip)); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Payment failed: "+err.Error())
		return
	}
	h.respondJob(c, http.StatusOK, "Job confirmed and paid", j.ID)
}

type IssueRequest struct {
	Reason string   `json:"reason" binding:"required"`
	Text   *string  `json:"text"`
	Photos []string `json:"photos"`
}

// POST /jobs/:id/issue — consumer reports a problem instead of confirming; payment on hold
func (h *JobHandler) ReportIssue(c *gin.Context) {
	var req IssueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j := h.loadForConsumer(c, "awaiting_confirmation")
	if j == nil {
		return
	}
	for _, u := range req.Photos {
		h.DB.Exec(`INSERT INTO job_evidence (job_id, kind, url, note, uploaded_by) VALUES ($1,'issue',$2,$3,$4)`, j.ID, u, req.Text, j.ConsumerID)
	}
	h.DB.Exec(`UPDATE jobs SET status='issue_reported', issue_reason=$1, issue_text=$2, auto_confirm_at=NULL, updated_at=NOW() WHERE id=$3`, req.Reason, req.Text, j.ID)
	logEvent(h.DB, j.ID, j.ConsumerID, "consumer", "issue_reported", "awaiting_confirmation", "issue_reported", gin.H{"reason": req.Reason, "text": req.Text, "photos": len(req.Photos)})
	notify(h.DB, *j.ContractorID, "issue_reported", "Client reported an issue", req.Reason+" — review the feedback", j.ID, "job", gin.H{"stage": "issue"})
	notify(h.DB, j.ConsumerID, "issue_sent", "Report sent · payment on hold", "The contractor has been asked to review your report", j.ID, "requestDetail", gin.H{"stage": "issue"})
	h.respondJob(c, http.StatusOK, "Issue reported", j.ID)
}

type DisputeRequest struct {
	Text  string   `json:"text" binding:"required"`
	Files []string `json:"files"`
}

// POST /jobs/:id/dispute — contractor disputes the consumer's issue report
func (h *JobHandler) OpenDispute(c *gin.Context) {
	var req DisputeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j := h.loadForContractor(c, "issue_reported")
	if j == nil {
		return
	}
	for _, u := range req.Files {
		h.DB.Exec(`INSERT INTO job_evidence (job_id, kind, url, note, uploaded_by) VALUES ($1,'dispute',$2,$3,$4)`, j.ID, u, req.Text, *j.ContractorID)
	}
	h.DB.Exec(`INSERT INTO job_disputes (job_id, raised_by, reason, status) VALUES ($1,$2,$3,'under_review')`, j.ID, *j.ContractorID, req.Text)
	h.DB.Exec(`UPDATE jobs SET status='dispute_open', updated_at=NOW() WHERE id=$1`, j.ID)
	logEvent(h.DB, j.ID, *j.ContractorID, "contractor", "dispute_opened", "issue_reported", "dispute_open", gin.H{"files": len(req.Files)})
	notify(h.DB, j.ConsumerID, "dispute_open", partyName(h.DB, j.ContractorID)+" disputed your report", "MrBuilder is reviewing", j.ID, "requestDetail", gin.H{"stage": "disputed"})
	notifyAdmins(h.DB, "dispute_open", "Dispute on "+strOr(j.RequestCode, ""), req.Text, j.ID, gin.H{"stage": "disputed"})
	h.respondJob(c, http.StatusOK, "Dispute opened", j.ID)
}

type DisputeDecisionRequest struct {
	Decision      string  `json:"decision" binding:"required,oneof=rejected upheld"`
	Resolution    string  `json:"resolution" binding:"required"`
	ReturnVisitAt *string `json:"return_visit_at"` // for rejected: schedule the corrective visit
}

// PATCH /admin/jobs/:id/dispute — admin decides
func (h *JobHandler) AdminDisputeDecision(c *gin.Context) {
	userID := c.GetString("user_id")
	var req DisputeDecisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if j.Status != "dispute_open" {
		utils.Error(c, http.StatusConflict, "No open dispute")
		return
	}
	h.DB.Exec(`UPDATE job_disputes SET status='resolved', decision=$1, resolution=$2, decided_by=$3, resolved_at=NOW() WHERE job_id=$4 AND status<>'resolved'`,
		req.Decision, req.Resolution, userID, j.ID)

	if req.Decision == "upheld" {
		if err := settle(h.DB, j.ID, userID, "admin", "dispute_upheld", 0); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Settlement failed: "+err.Error())
			return
		}
		h.DB.Exec(`UPDATE jobs SET status='dispute_upheld', updated_at=NOW() WHERE id=$1`, j.ID)
		notify(h.DB, j.ConsumerID, "dispute_resolved", "MrBuilder confirmed the job", "The dispute was resolved in the contractor's favor and you were charged", j.ID, "requestDetail", gin.H{"stage": "resolved"})
		notify(h.DB, *j.ContractorID, "dispute_resolved", "Dispute resolved · payment processing", req.Resolution, j.ID, "job", gin.H{"stage": "resolved"})
	} else {
		to := "dispute_rejected"
		if req.ReturnVisitAt != nil {
			to = "return_visit_scheduled"
			h.DB.Exec(`UPDATE jobs SET status=$1, return_visit_at=$2::timestamptz, updated_at=NOW() WHERE id=$3`, to, *req.ReturnVisitAt, j.ID)
		} else {
			h.DB.Exec(`UPDATE jobs SET status=$1, updated_at=NOW() WHERE id=$2`, to, j.ID)
		}
		logEvent(h.DB, j.ID, userID, "admin", "dispute_rejected", "dispute_open", to, gin.H{"resolution": req.Resolution, "return_visit_at": req.ReturnVisitAt})
		notify(h.DB, j.ConsumerID, "dispute_resolved", "Dispute resolved in your favor", "The contractor will return to fix the issues", j.ID, "requestDetail", gin.H{"stage": "returning"})
		notify(h.DB, *j.ContractorID, "dispute_rejected", "Dispute rejected · fix the issues", req.Resolution, j.ID, "job", gin.H{"stage": "returning"})
	}
	h.respondJob(c, http.StatusOK, "Dispute "+req.Decision, j.ID)
}

// ---------- reschedule ----------

type RescheduleRequest struct {
	Kind          string  `json:"kind" binding:"omitempty,oneof=start return"`
	ProposedStart string  `json:"proposed_start" binding:"required"`
	ProposedEnd   *string `json:"proposed_end"`
	Message       *string `json:"message"`
}

// POST /jobs/:id/reschedule — either party proposes; original slot stays until accepted
func (h *JobHandler) ProposeReschedule(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	var req RescheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	isConsumer := j.ConsumerID == userID
	isContractor := j.ContractorID != nil && *j.ContractorID == userID
	if !isConsumer && !isContractor {
		utils.Error(c, http.StatusForbidden, "Not allowed")
		return
	}
	kind := req.Kind
	if kind == "" {
		kind = "start"
	}
	if kind == "start" && !inList(j.Status, "assigned") {
		utils.Error(c, http.StatusConflict, "Start can only be rescheduled while assigned")
		return
	}
	if kind == "return" && !inList(j.Status, "dispute_rejected", "return_visit_scheduled") {
		utils.Error(c, http.StatusConflict, "No return visit to reschedule")
		return
	}
	if j.ReschedulePendingBy != nil {
		utils.Error(c, http.StatusConflict, "A proposal is already pending")
		return
	}
	var pid string
	err = h.DB.QueryRow(`INSERT INTO job_reschedule_proposals (job_id, proposed_by, proposed_by_role, kind, proposed_start, proposed_end, message)
        VALUES ($1,$2,$3,$4,$5::timestamptz,$6::timestamptz,$7) RETURNING id`, j.ID, userID, role, kind, req.ProposedStart, req.ProposedEnd, req.Message).Scan(&pid)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Invalid proposal: "+err.Error())
		return
	}
	h.DB.Exec(`UPDATE jobs SET reschedule_pending_by=$1, updated_at=NOW() WHERE id=$2`, role, j.ID)
	logEvent(h.DB, j.ID, userID, role, "reschedule_proposed", j.Status, j.Status, gin.H{"proposal_id": pid, "kind": kind, "proposed_start": req.ProposedStart})
	if isConsumer {
		notify(h.DB, *j.ContractorID, "reschedule_requested", "Reschedule request from "+partyName(h.DB, &j.ConsumerID), "Proposed "+req.ProposedStart, j.ID, "job", gin.H{"stage": "reschedule", "proposal_id": pid})
	} else {
		notify(h.DB, j.ConsumerID, "reschedule_requested", partyName(h.DB, j.ContractorID)+" proposed a new time", "Proposed "+req.ProposedStart+" · your original slot is kept until you accept", j.ID, "requestDetail", gin.H{"stage": "reschedule", "proposal_id": pid})
	}
	utils.Success(c, http.StatusCreated, "Proposal sent", gin.H{"proposal_id": pid})
}

type RescheduleResponse struct {
	Action        string  `json:"action" binding:"required,oneof=accept decline counter"`
	ProposedStart *string `json:"proposed_start"` // for counter
	ProposedEnd   *string `json:"proposed_end"`
	Message       *string `json:"message"`
}

// PATCH /jobs/:id/reschedule/:pid — the other party responds
func (h *JobHandler) RespondReschedule(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	var req RescheduleResponse
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	var proposedBy, kind, pstatus string
	var start time.Time
	var end sql.NullTime
	err = h.DB.QueryRow(`SELECT proposed_by, kind, status, proposed_start, proposed_end FROM job_reschedule_proposals WHERE id=$1 AND job_id=$2`, c.Param("pid"), j.ID).
		Scan(&proposedBy, &kind, &pstatus, &start, &end)
	if err != nil || pstatus != "pending" {
		utils.Error(c, http.StatusNotFound, "No pending proposal")
		return
	}
	if proposedBy == userID || !(j.ConsumerID == userID || (j.ContractorID != nil && *j.ContractorID == userID)) {
		utils.Error(c, http.StatusForbidden, "Only the other party can respond")
		return
	}

	switch req.Action {
	case "accept":
		h.DB.Exec(`UPDATE job_reschedule_proposals SET status='accepted', responded_by=$1, responded_at=NOW() WHERE id=$2`, userID, c.Param("pid"))
		if kind == "return" {
			h.DB.Exec(`UPDATE jobs SET return_visit_at=$1, status='return_visit_scheduled', reschedule_pending_by=NULL, updated_at=NOW() WHERE id=$2`, start, j.ID)
		} else {
			h.DB.Exec(`UPDATE jobs SET scheduled_start=$1, scheduled_end=$2, reschedule_pending_by=NULL, updated_at=NOW() WHERE id=$3`, start, end, j.ID)
		}
		logEvent(h.DB, j.ID, userID, role, "reschedule_accepted", j.Status, j.Status, gin.H{"kind": kind, "start": start})
		notify(h.DB, proposedBy, "reschedule_accepted", "New time accepted", start.Format("Mon, Jan 2 · 3:04 PM"), j.ID, "job", gin.H{"stage": "scheduled"})
	case "decline":
		h.DB.Exec(`UPDATE job_reschedule_proposals SET status='declined', responded_by=$1, responded_at=NOW() WHERE id=$2`, userID, c.Param("pid"))
		h.DB.Exec(`UPDATE jobs SET reschedule_pending_by=NULL, updated_at=NOW() WHERE id=$1`, j.ID)
		logEvent(h.DB, j.ID, userID, role, "reschedule_declined", j.Status, j.Status, gin.H{"kind": kind})
		notify(h.DB, proposedBy, "reschedule_declined", "New time declined", "The original appointment stays", j.ID, "job", gin.H{"stage": "scheduled"})
	case "counter":
		if req.ProposedStart == nil {
			utils.Error(c, http.StatusBadRequest, "proposed_start required for counter")
			return
		}
		h.DB.Exec(`UPDATE job_reschedule_proposals SET status='countered', responded_by=$1, responded_at=NOW() WHERE id=$2`, userID, c.Param("pid"))
		var pid string
		h.DB.QueryRow(`INSERT INTO job_reschedule_proposals (job_id, proposed_by, proposed_by_role, kind, proposed_start, proposed_end, message)
            VALUES ($1,$2,$3,$4,$5::timestamptz,$6::timestamptz,$7) RETURNING id`, j.ID, userID, role, kind, *req.ProposedStart, req.ProposedEnd, req.Message).Scan(&pid)
		h.DB.Exec(`UPDATE jobs SET reschedule_pending_by=$1, updated_at=NOW() WHERE id=$2`, role, j.ID)
		logEvent(h.DB, j.ID, userID, role, "reschedule_countered", j.Status, j.Status, gin.H{"proposal_id": pid, "proposed_start": *req.ProposedStart})
		notify(h.DB, proposedBy, "reschedule_requested", "Counter-proposal: "+*req.ProposedStart, "Accept or suggest another time", j.ID, "job", gin.H{"stage": "reschedule", "proposal_id": pid})
	}
	h.respondJob(c, http.StatusOK, "Proposal "+req.Action+"ed", j.ID)
}

// GET /jobs/:id/reschedule — proposals for the job
func (h *JobHandler) ListReschedule(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if !(role == "admin" || j.ConsumerID == userID || (j.ContractorID != nil && *j.ContractorID == userID)) {
		utils.Error(c, http.StatusForbidden, "Not allowed")
		return
	}
	rows, err := h.DB.Query(`SELECT id, proposed_by, proposed_by_role, kind, proposed_start, proposed_end, message, status, responded_at, created_at
        FROM job_reschedule_proposals WHERE job_id=$1 ORDER BY created_at DESC`, j.ID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load proposals")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, by, byRole, kind, status string
		var start, created time.Time
		var end, responded sql.NullTime
		var msg *string
		if rows.Scan(&id, &by, &byRole, &kind, &start, &end, &msg, &status, &responded, &created) == nil {
			out = append(out, gin.H{"id": id, "proposed_by": by, "proposed_by_role": byRole, "kind": kind, "proposed_start": start,
				"proposed_end": nullTime(end), "message": msg, "status": status, "responded_at": nullTime(responded), "created_at": created})
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

func nullTime(t sql.NullTime) interface{} {
	if t.Valid {
		return t.Time
	}
	return nil
}

// ---------- cancellation ----------

// GET /jobs/:id/cancel-preview — what cancelling now would cost the caller
func (h *JobHandler) CancelPreview(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if !(j.ConsumerID == userID || (j.ContractorID != nil && *j.ContractorID == userID)) {
		utils.Error(c, http.StatusForbidden, "Not allowed")
		return
	}
	phase, pct, basis, amount, blocked := h.cancelFee(j, role)
	utils.Success(c, http.StatusOK, "", gin.H{"phase": phase, "fee_pct": pct, "fee_basis": basis, "fee_amount": amount, "blocked": blocked != ""})
}

// cancelFee computes the fee for the caller cancelling the job now. blocked is a reason string if not allowed.
func (h *JobHandler) cancelFee(j *models.Job, role string) (phase string, pct float64, basis string, amount float64, blocked string) {
	if inList(j.Status, terminalStatuses...) {
		return "", 0, "", 0, "Job is already finished"
	}
	if inList(j.Status, "dispute_open", "dispute_rejected") {
		return "", 0, "", 0, "Cannot cancel while a dispute is open"
	}
	if inList(j.Status, "awaiting_confirmation", "issue_reported", "return_visit_scheduled") && role == "consumer" {
		return "", 0, "", 0, "Work is complete — confirm or report an issue instead"
	}
	postStart := j.StartedAt != nil && inList(j.Status, "in_progress", "paused_safety", "awaiting_confirmation", "issue_reported", "return_visit_scheduled")
	basis = GetSettingString(h.DB, "post_start_cancel_basis", "quote_total")
	base := 0.0
	if j.QuoteTotal != nil {
		base = *j.QuoteTotal
	}
	if basis == "contractor_net" && j.ContractorNet != nil {
		base = *j.ContractorNet
	}
	if postStart {
		phase = "post_start"
		pct = GetSettingFloat(h.DB, "post_start_cancel_pct", 5)
	} else {
		phase = "pre_start"
		basis = "quote_total"
		if role == "contractor" {
			pct = GetSettingFloat(h.DB, "contractor_cancel_pct", 1)
		} else if j.ContractorID != nil {
			pct = GetSettingFloat(h.DB, "consumer_cancel_pct_pre_start", 0)
		}
	}
	amount = money(base * pct / 100)
	return
}

// PATCH /jobs/:id/cancel — consumer or assigned contractor
func (h *JobHandler) CancelJob(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	var req models.CancelJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	isConsumer := j.ConsumerID == userID && role == "consumer"
	isContractor := role == "contractor" && j.ContractorID != nil && *j.ContractorID == userID
	if !isConsumer && !isContractor {
		utils.Error(c, http.StatusForbidden, "Not allowed")
		return
	}
	phase, pct, basis, amount, blocked := h.cancelFee(j, role)
	if blocked != "" {
		utils.Error(c, http.StatusConflict, blocked)
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Transaction failed")
		return
	}
	defer tx.Rollback()

	newStatus := "cancelled_by_client"
	cancelledBy := "consumer"
	if isContractor {
		cancelledBy = "contractor"
		newStatus = "reassigning" // job goes back to the marketplace
		tx.Exec(`UPDATE jobs SET status='reassigning', contractor_id=NULL, accepted_at=NULL, en_route_at=NULL, en_route_eta_minutes=NULL, arrived_at=NULL,
            started_at=NULL, paused_at=NULL, pause_reason=NULL, checklist_done='[]', damage_flagged=FALSE, reschedule_pending_by=NULL, updated_at=NOW() WHERE id=$1`, j.ID)
		tx.Exec(`UPDATE job_reschedule_proposals SET status='withdrawn' WHERE job_id=$1 AND status='pending'`, j.ID)
	} else {
		tx.Exec(`UPDATE jobs SET status='cancelled_by_client', cancelled_at=NOW(), reschedule_pending_by=NULL, updated_at=NOW() WHERE id=$1`, j.ID)
	}
	{
		tx.Exec(`INSERT INTO job_cancellations (job_id, cancelled_by, cancelled_by_user, reason, text, phase, fee_pct, fee_basis, service_fee_applied, service_fee_amount)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT (job_id) DO UPDATE SET cancelled_by=EXCLUDED.cancelled_by, cancelled_by_user=EXCLUDED.cancelled_by_user, reason=EXCLUDED.reason, text=EXCLUDED.text,
              phase=EXCLUDED.phase, fee_pct=EXCLUDED.fee_pct, fee_basis=EXCLUDED.fee_basis, service_fee_applied=EXCLUDED.service_fee_applied, service_fee_amount=EXCLUDED.service_fee_amount`,
			j.ID, cancelledBy, userID, req.Reason, req.Text, phase, pct, basis, amount > 0, amount)
	}
	if amount > 0 {
		if isConsumer {
			if _, err := ChargeCustomer(h.DB, userID, amount, "MrBuilder cancellation fee "+strOr(j.RequestCode, ""), map[string]string{"job_id": j.ID, "type": "cancellation_fee"}); err != nil {
				utils.Error(c, http.StatusPaymentRequired, "Cancellation fee could not be charged: "+err.Error())
				return
			}
		}
		tx.Exec(`INSERT INTO transactions (user_id, job_id, transaction_type, status, amount, description) VALUES ($1,$2,'cancellation_fee','completed',$3,$4)`,
			userID, j.ID, money(-amount), fmt.Sprintf("Cancellation fee (%s, %.0f%%)", phase, pct))
		if isContractor {
			tx.Exec(`INSERT INTO balances (user_id, balance) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET balance=balances.balance-$3, updated_at=NOW()`, userID, -amount, amount)
		}
	}
	logEvent(tx, j.ID, userID, role, "cancelled", j.Status, newStatus, gin.H{"reason": req.Reason, "text": req.Text, "phase": phase, "fee_pct": pct, "fee_amount": amount})
	if err := tx.Commit(); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Commit failed")
		return
	}

	if isContractor {
		notify(h.DB, j.ConsumerID, "contractor_cancelled", "Your contractor cancelled · no fee", "We are finding a new contractor for your job", j.ID, "requestDetail", gin.H{"stage": "reassigning"})
		notify(h.DB, userID, "you_cancelled", "You cancelled the job", fmt.Sprintf("%.0f%% cancellation fee applied ($%.2f)", pct, amount), j.ID, "job", gin.H{"stage": "cancelled"})
		for _, cid := range qualifiedContractorUserIDs(h.DB, strOr(j.ServiceCategory, "")) {
			if cid != userID {
				notify(h.DB, cid, "new_job", "New job near you", j.Title+" · "+strOr(j.LocationCity, ""), j.ID, "job", gin.H{"stage": "marketplace"})
			}
		}
	} else {
		if j.ContractorID != nil {
			notify(h.DB, *j.ContractorID, "job_cancelled", "Job was cancelled by client", "No fee to you", j.ID, "job", gin.H{"stage": "cancelled"})
		}
		body := "Request cancelled"
		if amount > 0 {
			body = fmt.Sprintf("Cancellation fee $%.2f (%.0f%%) applied", amount, pct)
		}
		notify(h.DB, userID, "you_cancelled", "Request cancelled", body, j.ID, "requestDetail", gin.H{"stage": "cancelled"})
	}
	h.respondJob(c, http.StatusOK, "Cancelled", j.ID)
}

// ---------- auto-confirm ----------

// RunAutoConfirm settles jobs whose confirmation window has passed. Called by a ticker in main.
func RunAutoConfirm(db *sql.DB) {
	rows, err := db.Query(`SELECT id FROM jobs WHERE status='awaiting_confirmation' AND auto_confirm_at IS NOT NULL AND auto_confirm_at < NOW()`)
	if err != nil {
		return
	}
	ids := []string{}
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	rows.Close()
	for _, id := range ids {
		if err := settle(db, id, "", "system", "auto_confirmed", 0); err != nil {
			log.Printf("auto-confirm %s failed: %v", id, err)
		} else {
			log.Printf("auto-confirmed job %s", id)
		}
	}
}

func StartAutoConfirm(db *sql.DB) {
	go func() {
		for {
			RunAutoConfirm(db)
			PurgeDeletedAccounts(db)
			RunReminders(db)
			time.Sleep(10 * time.Minute)
		}
	}()
}

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
