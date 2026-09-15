package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/mrbuilder/backend/internal/models"
	"github.com/mrbuilder/backend/internal/pricing"
	"github.com/mrbuilder/backend/internal/utils"
)

type JobHandler struct {
	DB *sql.DB
}

func NewJobHandler(db *sql.DB) *JobHandler {
	return &JobHandler{DB: db}
}

const jobColumns = `id, request_code, consumer_id, contractor_id, title, description, service_category, quote_method, status,
    location_address, location_city, location_state, location_zip, location_lat, location_lng, property_type,
    preferred_start_date::text, preferred_end_date::text, scheduled_start, scheduled_end,
    notes, urgency, time_window, issue_description, mounting, width_ft, length_ft, height_ft, pergola_spec,
    quote_total, platform_fee, contractor_net, tip, inspection_fee, inspection_fee_credit,
    en_route_eta_minutes, en_route_at, arrived_at, paused_at, pause_reason, completion_note, checklist_done,
    auto_confirm_at, damage_flagged, return_visit_at, reschedule_pending_by, issue_reason, issue_text, resumed_at, consumer_charged, paid_at, is_assessment, pergola_id, kind, subscription_id, covered_by, created_by, hh_acknowledged_by, hh_acknowledged_at,
    parent_job_id, current_quote_id, accepted_at, started_at, completed_at, confirmed_at, cancelled_at, created_at, updated_at`

func scanJob(row interface{ Scan(...interface{}) error }) (*models.Job, error) {
	var j models.Job
	var spec, checklist []byte
	err := row.Scan(&j.ID, &j.RequestCode, &j.ConsumerID, &j.ContractorID, &j.Title, &j.Description, &j.ServiceCategory, &j.QuoteMethod, &j.Status,
		&j.LocationAddress, &j.LocationCity, &j.LocationState, &j.LocationZip, &j.LocationLat, &j.LocationLng, &j.PropertyType,
		&j.PreferredStartDate, &j.PreferredEndDate, &j.ScheduledStart, &j.ScheduledEnd,
		&j.Notes, &j.Urgency, &j.TimeWindow, &j.IssueDescription, &j.Mounting, &j.WidthFt, &j.LengthFt, &j.HeightFt, &spec,
		&j.QuoteTotal, &j.PlatformFee, &j.ContractorNet, &j.Tip, &j.InspectionFee, &j.InspectionFeeCredit,
		&j.EnRouteEtaMinutes, &j.EnRouteAt, &j.ArrivedAt, &j.PausedAt, &j.PauseReason, &j.CompletionNote, &checklist,
		&j.AutoConfirmAt, &j.DamageFlagged, &j.ReturnVisitAt, &j.ReschedulePendingBy, &j.IssueReason, &j.IssueText, &j.ResumedAt, &j.ConsumerCharged, &j.PaidAt, &j.IsAssessment, &j.PergolaID, &j.Kind, &j.SubscriptionID, &j.CoveredBy, &j.CreatedBy, &j.HHAcknowledgedBy, &j.HHAcknowledgedAt,
		&j.ParentJobID, &j.CurrentQuoteID, &j.AcceptedAt, &j.StartedAt, &j.CompletedAt, &j.ConfirmedAt, &j.CancelledAt, &j.CreatedAt, &j.UpdatedAt)
	if err != nil {
		return nil, err
	}
	j.PergolaSpec = json.RawMessage(spec)
	j.ChecklistDone = json.RawMessage(checklist)
	return &j, nil
}

// scanJobWithDistance scans jobColumns + a trailing distance column
func scanJobWithDistance(rows *sql.Rows) (*models.Job, error) {
	var j models.Job
	var spec, checklist []byte
	var dist *float64
	err := rows.Scan(&j.ID, &j.RequestCode, &j.ConsumerID, &j.ContractorID, &j.Title, &j.Description, &j.ServiceCategory, &j.QuoteMethod, &j.Status,
		&j.LocationAddress, &j.LocationCity, &j.LocationState, &j.LocationZip, &j.LocationLat, &j.LocationLng, &j.PropertyType,
		&j.PreferredStartDate, &j.PreferredEndDate, &j.ScheduledStart, &j.ScheduledEnd,
		&j.Notes, &j.Urgency, &j.TimeWindow, &j.IssueDescription, &j.Mounting, &j.WidthFt, &j.LengthFt, &j.HeightFt, &spec,
		&j.QuoteTotal, &j.PlatformFee, &j.ContractorNet, &j.Tip, &j.InspectionFee, &j.InspectionFeeCredit,
		&j.EnRouteEtaMinutes, &j.EnRouteAt, &j.ArrivedAt, &j.PausedAt, &j.PauseReason, &j.CompletionNote, &checklist,
		&j.AutoConfirmAt, &j.DamageFlagged, &j.ReturnVisitAt, &j.ReschedulePendingBy, &j.IssueReason, &j.IssueText, &j.ResumedAt, &j.ConsumerCharged, &j.PaidAt, &j.IsAssessment, &j.PergolaID, &j.Kind, &j.SubscriptionID, &j.CoveredBy, &j.CreatedBy, &j.HHAcknowledgedBy, &j.HHAcknowledgedAt,
		&j.ParentJobID, &j.CurrentQuoteID, &j.AcceptedAt, &j.StartedAt, &j.CompletedAt, &j.ConfirmedAt, &j.CancelledAt, &j.CreatedAt, &j.UpdatedAt,
		&dist)
	if err != nil {
		return nil, err
	}
	j.PergolaSpec = json.RawMessage(spec)
	j.ChecklistDone = json.RawMessage(checklist)
	j.DistanceMiles = dist
	return &j, nil
}

func (h *JobHandler) loadImages(j *models.Job) {
	j.Images = []string{}
	rows, err := h.DB.Query(`SELECT image_url FROM job_images WHERE job_id=$1 ORDER BY created_at`, j.ID)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var u string
		if rows.Scan(&u) == nil {
			j.Images = append(j.Images, u)
		}
	}
}

// enrich attaches images, quotes, inspection report and party info for a detail response
func (h *JobHandler) enrich(j *models.Job) {
	h.loadImages(j)
	j.Quotes = loadQuoteVersions(h.DB, j.ID)
	j.InspectionReport = loadInspectionReport(h.DB, j.ID)
	j.Consumer = loadParty(h.DB, &j.ConsumerID)
	j.Contractor = loadParty(h.DB, j.ContractorID)
}

func (h *JobHandler) getJob(id string) (*models.Job, error) {
	return scanJob(h.DB.QueryRow("SELECT "+jobColumns+" FROM jobs WHERE id=$1", id))
}

func (h *JobHandler) respondJob(c *gin.Context, code int, msg, id string) {
	j, err := h.getJob(id)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	h.enrich(j)
	utils.Success(c, code, msg, j)
}

func (h *JobHandler) hasSkill(userID, category string) bool {
	return isQualified(h.DB, userID, category)
}

// POST /jobs — consumer submits a request. instant → quote generated now; inspection → inspection job for contractors.
func (h *JobHandler) Create(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.CreateJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	ownerID := userID
	if req.OwnerID != nil && *req.OwnerID != userID {
		if c.GetString("user_role") != "admin" && !isHouseholdMember(h.DB, *req.OwnerID, userID, "can_create_requests") {
			utils.Error(c, http.StatusForbidden, "You can't create requests for that household")
			return
		}
		ownerID = *req.OwnerID
	}

	var catName string
	if err := h.DB.QueryRow(`SELECT name FROM service_categories WHERE slug=$1 AND is_active`, req.ServiceCategory).Scan(&catName); err != nil {
		utils.Error(c, http.StatusBadRequest, "Unknown service category")
		return
	}

	method := req.QuoteMethod
	if req.ServiceCategory == "inspection" {
		method = "inspection"
	}
	if method == "" {
		method = "instant"
	}

	title := catName
	if req.Title != nil && strings.TrimSpace(*req.Title) != "" {
		title = *req.Title
	}
	spec := "{}"
	if req.PergolaSpec != nil && len(*req.PergolaSpec) > 0 {
		spec = string(*req.PergolaSpec)
	}
	inspectionFee := 0.0
	if method == "inspection" {
		inspectionFee = GetSettingFloat(h.DB, "inspection_fee", 99)
	}

	row := h.DB.QueryRow(
		`INSERT INTO jobs (consumer_id, title, description, service_category, quote_method, status,
             location_address, location_city, location_state, location_zip, location_lat, location_lng, property_type,
             preferred_start_date, preferred_end_date, notes, mounting, width_ft, length_ft, height_ft, pergola_spec,
             urgency, time_window, issue_description, inspection_fee, parent_job_id, created_by, pergola_id)
         VALUES ($1,$2,$3,$4,$5,'submitted',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21,$22,$23,$24,$25,$26,$27)
         RETURNING `+jobColumns,
		ownerID, title, req.Description, req.ServiceCategory, method,
		req.LocationAddress, req.LocationCity, req.LocationState, req.LocationZip, req.LocationLat, req.LocationLng, req.PropertyType,
		req.PreferredStartDate, req.PreferredEndDate, req.Notes, req.Mounting, req.WidthFt, req.LengthFt, req.HeightFt, spec,
		req.Urgency, req.TimeWindow, req.IssueDescription, inspectionFee, req.ParentJobID, userID, req.PergolaID,
	)
	j, err := scanJob(row)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to create request: "+err.Error())
		return
	}
	if req.DraftID != nil {
		h.DB.Exec(`DELETE FROM request_drafts WHERE id=$1 AND user_id=$2`, *req.DraftID, userID)
	}
	for _, img := range req.Images {
		if img = strings.TrimSpace(img); img != "" {
			h.DB.Exec(`INSERT INTO job_images (job_id, image_url) VALUES ($1, $2)`, j.ID, img)
		}
	}
	logEvent(h.DB, j.ID, userID, "consumer", "submitted", "", "submitted", gin.H{"quote_method": method})

	if method == "instant" {
		h.DB.Exec(`UPDATE jobs SET status='quote_generating', updated_at=NOW() WHERE id=$1`, j.ID)
		q, err := generateQuote(h.DB, h.DB, j.ID, "system", "", nil, nil, nil)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Request saved but quote generation failed: "+err.Error())
			return
		}
		logEvent(h.DB, j.ID, "", "system", "quote_generated", "quote_generating", "quote_ready", gin.H{"quote_id": q.ID, "total": q.Total})
		notify(h.DB, ownerID, "quote_ready", "Your quote is ready", "Review and approve the quote for "+title, j.ID,
			"requestDetail", gin.H{"stage": "quote_ready"})
	} else {
		h.DB.Exec(`UPDATE jobs SET status='inspection_booked', updated_at=NOW() WHERE id=$1`, j.ID)
		logEvent(h.DB, j.ID, "", "system", "inspection_booked", "submitted", "inspection_booked", gin.H{"inspection_fee": inspectionFee})
		notify(h.DB, ownerID, "inspection_booked", "Inspection requested", "We are finding an inspector for your request", j.ID,
			"requestDetail", gin.H{"stage": "inspection_booked"})
		for _, cid := range qualifiedContractorUserIDs(h.DB, "inspection") {
			notify(h.DB, cid, "new_job", "New inspection near you", title+" · "+strOr(j.LocationCity, ""), j.ID, "job", gin.H{"stage": "marketplace"})
		}
	}

	h.respondJob(c, http.StatusCreated, "Request submitted", j.ID)
}

// Gone — old contractor-priced quote endpoints
func Gone(c *gin.Context) {
	utils.Error(c, http.StatusGone, "Contractor-priced quotes were removed; quotes are generated by the system")
}

func strOr(s *string, def string) string {
	if s == nil {
		return def
	}
	return *s
}

// GET /jobs — contractor marketplace: matching jobs in the caller's qualified categories (+ open inspections if qualified).
// Optional: ?lat&lng (adds distance_miles, sorts by distance) ?max_distance ?category ?max_budget
func (h *JobHandler) ListOpen(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	page, limit := utils.Pagination(c)

	args := []interface{}{}
	arg := func(v interface{}) string { args = append(args, v); return "$" + strconv.Itoa(len(args)) }

	where := []string{"j.contractor_id IS NULL"}
	if role == "contractor" {
		if st := lockState(h.DB, userID); st.Locked {
			c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}, "meta": gin.H{"total": 0, "page": page, "limit": limit, "locked": true, "lock": st}})
			return
		}
		u := arg(userID)
		where = append(where, `(
            (j.status='matching' AND j.service_category IN (SELECT category FROM contractor_qualifications WHERE user_id=`+u+` AND status='qualified'))
            OR (j.status='inspection_booked' AND EXISTS (SELECT 1 FROM contractor_qualifications WHERE user_id=`+u+` AND category='inspection' AND status='qualified'))
        )`)
		where = append(where, `NOT EXISTS (SELECT 1 FROM job_declines d WHERE d.job_id=j.id AND d.contractor_id=`+u+`)`)
		where = append(where, `EXISTS (SELECT 1 FROM users u WHERE u.id=`+u+` AND u.status='active')`)
	} else {
		where = append(where, "j.status IN ('matching','inspection_booked')")
	}
	if v := c.Query("category"); v != "" {
		where = append(where, "j.service_category="+arg(v))
	}
	if v := c.Query("max_budget"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			where = append(where, "j.contractor_net<="+arg(f))
		}
	}

	distExpr := "NULL::float8"
	orderBy := "j.created_at DESC"
	if latS, lngS := c.Query("lat"), c.Query("lng"); latS != "" && lngS != "" {
		lat, e1 := strconv.ParseFloat(latS, 64)
		lng, e2 := strconv.ParseFloat(lngS, 64)
		if e1 == nil && e2 == nil {
			la, ln := arg(lat), arg(lng)
			distExpr = `CASE WHEN j.location_lat IS NULL THEN NULL ELSE 3959 * acos(LEAST(1.0, cos(radians(` + la + `)) * cos(radians(j.location_lat)) * cos(radians(j.location_lng) - radians(` + ln + `)) + sin(radians(` + la + `)) * sin(radians(j.location_lat)))) END`
			orderBy = "(" + distExpr + ") ASC NULLS LAST, j.created_at DESC"
			if md := c.Query("max_distance"); md != "" {
				if f, err := strconv.ParseFloat(md, 64); err == nil {
					where = append(where, "("+distExpr+") <= "+arg(f))
				}
			}
		}
	}

	whereSQL := strings.Join(where, " AND ")
	var total int64
	h.DB.QueryRow("SELECT COUNT(*) FROM jobs j WHERE "+whereSQL, args...).Scan(&total)

	lim, off := arg(limit), arg((page-1)*limit)
	rows, err := h.DB.Query("SELECT "+qualify(jobColumns)+", ("+distExpr+") AS distance FROM jobs j WHERE "+whereSQL+
		" ORDER BY "+orderBy+" LIMIT "+lim+" OFFSET "+off, args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list jobs: "+err.Error())
		return
	}
	defer rows.Close()

	jobs := []*models.Job{}
	for rows.Next() {
		if j, err := scanJobWithDistance(rows); err == nil {
			h.loadImages(j)
			jobs = append(jobs, j)
		}
	}
	utils.Paginated(c, http.StatusOK, jobs, total, page, limit)
}

// qualify prefixes every column in jobColumns with "j." (handles the ::text casts)
func qualify(cols string) string {
	parts := strings.Split(cols, ",")
	for i, p := range parts {
		parts[i] = "j." + strings.TrimSpace(p)
	}
	return strings.Join(parts, ", ")
}

// GET /jobs/me — caller's requests (consumer) / jobs (contractor). ?status=a,b,c ?active=1 (non-terminal only)
func (h *JobHandler) ListMine(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	page, limit := utils.Pagination(c)

	where := "contractor_id=$1"
	if role != "contractor" {
		where = "(consumer_id=$1 OR consumer_id IN (SELECT owner_id FROM household_members WHERE member_id=$1 AND status='active'))"
	}
	args := []interface{}{userID}
	if v := c.Query("status"); v != "" {
		args = append(args, pq.Array(strings.Split(v, ",")))
		where += " AND status::text = ANY($2)"
	} else if c.Query("active") != "" {
		where += " AND status::text NOT IN ('completed_paid','dispute_upheld','cancelled_by_client','cancelled_by_contractor','confirmed','cancelled','quote_declined')"
	}
	if v := c.Query("kind"); v != "" {
		args = append(args, v)
		where += " AND kind=$" + strconv.Itoa(len(args))
	}

	var total int64
	h.DB.QueryRow("SELECT COUNT(*) FROM jobs WHERE "+where, args...).Scan(&total)

	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query("SELECT "+jobColumns+" FROM jobs WHERE "+where+
		" ORDER BY updated_at DESC LIMIT $"+strconv.Itoa(len(args)-1)+" OFFSET $"+strconv.Itoa(len(args)), args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list jobs")
		return
	}
	defer rows.Close()

	jobs := []*models.Job{}
	for rows.Next() {
		if j, err := scanJob(rows); err == nil {
			h.loadImages(j)
			if role == "consumer" {
				j.Contractor = loadParty(h.DB, j.ContractorID)
			} else {
				j.Consumer = loadParty(h.DB, &j.ConsumerID)
			}
			jobs = append(jobs, j)
		}
	}
	utils.Paginated(c, http.StatusOK, jobs, total, page, limit)
}

// GET /jobs/:id — owner, assigned contractor, admin, or a contractor who can see it in the marketplace
func (h *JobHandler) Get(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")

	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	allowed := role == "admin" || j.ConsumerID == userID || (j.ContractorID != nil && *j.ContractorID == userID)
	if !allowed && role == "consumer" {
		allowed = isHouseholdMember(h.DB, j.ConsumerID, userID, "")
	}
	if !allowed && role == "contractor" && j.ContractorID == nil {
		switch j.Status {
		case "matching":
			allowed = j.ServiceCategory != nil && h.hasSkill(userID, *j.ServiceCategory)
		case "inspection_booked":
			allowed = h.hasSkill(userID, "inspection")
		}
	}
	if !allowed {
		utils.Error(c, http.StatusForbidden, "Not allowed")
		return
	}
	h.enrich(j)
	utils.Success(c, http.StatusOK, "", j)
}

// GET /jobs/:id/events — timeline (owner, assigned contractor, admin)
func (h *JobHandler) ListEvents(c *gin.Context) {
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
	rows, err := h.DB.Query(`SELECT id, actor_id, actor_role, event_type, from_status, to_status, data, created_at
        FROM job_events WHERE job_id=$1 ORDER BY created_at`, j.ID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load events")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, etype string
		var actorID, actorRole, from, to *string
		var data []byte
		var at sql.NullTime
		if rows.Scan(&id, &actorID, &actorRole, &etype, &from, &to, &data, &at) == nil {
			out = append(out, gin.H{"id": id, "actor_id": actorID, "actor_role": actorRole, "event_type": etype,
				"from_status": from, "to_status": to, "data": json.RawMessage(data), "created_at": at.Time})
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

// POST /jobs/:id/quote/approve — consumer approves the current quote → matching (or assigned to the inspecting contractor)
func (h *JobHandler) ApproveQuote(c *gin.Context) {
	userID := c.GetString("user_id")
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if j.ConsumerID != userID {
		utils.Error(c, http.StatusForbidden, "Not your request")
		return
	}
	if j.Status != "quote_ready" || j.CurrentQuoteID == nil {
		utils.Error(c, http.StatusConflict, "No quote awaiting approval")
		return
	}
	var valid bool
	h.DB.QueryRow(`SELECT valid_until IS NULL OR valid_until > NOW() FROM quote_versions WHERE id=$1 AND status='sent'`, *j.CurrentQuoteID).Scan(&valid)
	if !valid {
		utils.Error(c, http.StatusConflict, "Quote has expired — request a new quote")
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Transaction failed")
		return
	}
	defer tx.Rollback()

	tx.Exec(`UPDATE quote_versions SET status='approved', responded_at=NOW() WHERE id=$1`, *j.CurrentQuoteID)

	newStatus := "matching"
	cat := strOr(j.ServiceCategory, "")
	if j.ContractorID != nil && h.hasSkill(*j.ContractorID, cat) {
		newStatus = "assigned" // inspecting contractor keeps the job
	} else if len(qualifiedContractorUserIDs(tx, cat)) == 0 {
		newStatus = "no_match_waitlist"
	}
	if newStatus == "assigned" {
		tx.Exec(`UPDATE jobs SET status='assigned', accepted_at=NOW(), updated_at=NOW() WHERE id=$1`, j.ID)
	} else {
		tx.Exec(`UPDATE jobs SET status=$1, contractor_id=NULL, updated_at=NOW() WHERE id=$2`, newStatus, j.ID)
	}
	logEvent(tx, j.ID, userID, "consumer", "quote_approved", "quote_ready", newStatus, gin.H{"quote_id": *j.CurrentQuoteID, "total": j.QuoteTotal})

	if err := tx.Commit(); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Commit failed")
		return
	}

	switch newStatus {
	case "assigned":
		notify(h.DB, *j.ContractorID, "job_assigned", "Quote approved — job is yours", j.Title+" · "+strOr(j.RequestCode, ""), j.ID, "job", gin.H{"stage": "assigned"})
		notify(h.DB, userID, "job_assigned", "Contractor assigned", "Your inspector will carry out the job", j.ID, "requestDetail", gin.H{"stage": "assigned"})
	case "matching":
		notify(h.DB, userID, "matching", "Approved · finding a contractor", "We are matching your request with qualified contractors", j.ID, "requestDetail", gin.H{"stage": "matching"})
		for _, cid := range qualifiedContractorUserIDs(h.DB, cat) {
			notify(h.DB, cid, "new_job", "New job near you", j.Title+" · "+strOr(j.LocationCity, ""), j.ID, "job", gin.H{"stage": "marketplace"})
		}
	case "no_match_waitlist":
		notify(h.DB, userID, "no_match", "You're on the waitlist", "No qualified contractor is available yet — we'll notify you as soon as one is", j.ID, "requestDetail", gin.H{"stage": "no_match_waitlist"})
	}
	h.respondJob(c, http.StatusOK, "Quote approved", j.ID)
}

// POST /jobs/:id/quote/decline — consumer declines → quote_declined (no revised quote promised)
func (h *JobHandler) DeclineQuote(c *gin.Context) {
	userID := c.GetString("user_id")
	var req models.DeclineQuoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if j.ConsumerID != userID {
		utils.Error(c, http.StatusForbidden, "Not your request")
		return
	}
	if j.Status != "quote_ready" || j.CurrentQuoteID == nil {
		utils.Error(c, http.StatusConflict, "No quote to decline")
		return
	}
	h.DB.Exec(`UPDATE quote_versions SET status='declined', decline_reason=$1, responded_at=NOW() WHERE id=$2`, req.Reason, *j.CurrentQuoteID)
	h.DB.Exec(`UPDATE jobs SET status='quote_declined', updated_at=NOW() WHERE id=$1`, j.ID)
	logEvent(h.DB, j.ID, userID, "consumer", "quote_declined", "quote_ready", "quote_declined", gin.H{"reason": req.Reason})
	h.respondJob(c, http.StatusOK, "Quote declined", j.ID)
}

// POST /jobs/:id/accept — qualified, active contractor takes a matching job (or an open inspection)
func (h *JobHandler) Accept(c *gin.Context) {
	userID := c.GetString("user_id")
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if j.ContractorID != nil {
		utils.Error(c, http.StatusConflict, "Job already taken")
		return
	}
	needSkill := strOr(j.ServiceCategory, "")
	newStatus := "assigned"
	switch j.Status {
	case "matching", "reassigning":
	case "inspection_booked":
		needSkill = "inspection"
		newStatus = "inspection_booked"
	default:
		utils.Error(c, http.StatusConflict, "Job is not open for acceptance")
		return
	}
	if !h.hasSkill(userID, needSkill) {
		utils.Error(c, http.StatusForbidden, "Your account is not qualified for this category")
		return
	}

	res, err := h.DB.Exec(`UPDATE jobs SET contractor_id=$1, status=$2, accepted_at=NOW(), updated_at=NOW()
        WHERE id=$3 AND contractor_id IS NULL`, userID, newStatus, j.ID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to accept job")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusConflict, "Job already taken")
		return
	}
	logEvent(h.DB, j.ID, userID, "contractor", "accepted", j.Status, newStatus, nil)

	var name string
	h.DB.QueryRow(`SELECT first_name || ' ' || last_name FROM users WHERE id=$1`, userID).Scan(&name)
	if newStatus == "assigned" {
		notify(h.DB, j.ConsumerID, "job_assigned", "Contractor assigned", name+" accepted your job", j.ID, "requestDetail", gin.H{"stage": "assigned"})
	} else {
		notify(h.DB, j.ConsumerID, "inspection_assigned", "Inspector assigned", name+" will inspect your pergola", j.ID, "requestDetail", gin.H{"stage": "inspection_booked"})
	}
	h.respondJob(c, http.StatusOK, "Job accepted", j.ID)
}

// POST /jobs/:id/decline — contractor hides a marketplace job; no rating effect
func (h *JobHandler) Decline(c *gin.Context) {
	userID := c.GetString("user_id")
	var req models.DeclineJobRequest
	c.ShouldBindJSON(&req)
	h.DB.Exec(`INSERT INTO job_declines (job_id, contractor_id, reason) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, c.Param("id"), userID, req.Reason)
	logEvent(h.DB, c.Param("id"), userID, "contractor", "declined", "", "", gin.H{"reason": req.Reason})
	utils.Success(c, http.StatusOK, "Job declined", nil)
}

// POST /jobs/:id/inspection-report — inspecting contractor submits findings; engine prices the job → quote_ready
func (h *JobHandler) SubmitInspectionReport(c *gin.Context) {
	userID := c.GetString("user_id")
	var req models.InspectionReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if j.ContractorID == nil || *j.ContractorID != userID {
		utils.Error(c, http.StatusForbidden, "You are not the inspector on this job")
		return
	}
	if j.Status != "inspection_booked" {
		utils.Error(c, http.StatusConflict, "Job is not awaiting an inspection report")
		return
	}

	footings := "{}"
	if req.Footings != nil {
		footings = string(*req.Footings)
	}
	var override interface{}
	if req.SpecOverride != nil {
		override = string(*req.SpecOverride)
	}
	scope := req.Scope
	if scope == nil {
		scope = []string{}
	}

	var reportID string
	err = h.DB.QueryRow(`INSERT INTO inspection_reports (job_id, contractor_id, width_ft, length_ft, height_ft, structure_type_observed,
            mounting_observed, footings, scope, findings, photos, pdf_url, spec_override)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb,$12,$13::jsonb) RETURNING id`,
		j.ID, userID, req.WidthFt, req.LengthFt, req.HeightFt, req.StructureTypeObserved, req.MountingObserved,
		footings, pq.Array(scope), req.Findings, toJSON(req.Photos), req.PdfURL, override).Scan(&reportID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to save report: "+err.Error())
		return
	}

	// observed dims / mounting become the job's dims
	h.DB.Exec(`UPDATE jobs SET width_ft=COALESCE($1,width_ft), length_ft=COALESCE($2,length_ft), height_ft=COALESCE($3,height_ft),
        mounting=COALESCE($4,mounting), status='inspection_done', updated_at=NOW() WHERE id=$5`,
		req.WidthFt, req.LengthFt, req.HeightFt, req.MountingObserved, j.ID)
	logEvent(h.DB, j.ID, userID, "contractor", "inspection_report_submitted", "inspection_booked", "inspection_done", gin.H{"report_id": reportID})
	addDocument(h.DB, j.ConsumerID, "inspection_report", "Inspection report · "+strOr(j.RequestCode, ""), &j.ID, j.PergolaID, &reportID, req.PdfURL, gin.H{"photos": req.Photos, "findings": req.Findings})
	notify(h.DB, j.ConsumerID, "report_submitted", "Inspection report submitted", "We are generating your quote", j.ID, "requestDetail", gin.H{"stage": "inspection_done"})

	h.DB.Exec(`UPDATE jobs SET status='quote_generating', updated_at=NOW() WHERE id=$1`, j.ID)
	q, err := generateQuote(h.DB, h.DB, j.ID, "system", "", nil, nil, &reportID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Report saved but quote generation failed: "+err.Error())
		return
	}
	logEvent(h.DB, j.ID, "", "system", "quote_generated", "quote_generating", "quote_ready", gin.H{"quote_id": q.ID, "total": q.Total})
	notify(h.DB, j.ConsumerID, "quote_ready", "Your quote is ready", "Review and approve the quote for "+j.Title, j.ID, "requestDetail", gin.H{"stage": "quote_ready"})

	h.respondJob(c, http.StatusCreated, "Report submitted", j.ID)
}

// POST /admin/jobs/:id/requote — admin regenerates the quote with manual adjustment lines
func (h *JobHandler) AdminRequote(c *gin.Context) {
	userID := c.GetString("user_id")
	var req models.RequoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	switch j.Status {
	case "quote_ready", "quote_declined", "inspection_done", "submitted", "quote_generating":
	default:
		utils.Error(c, http.StatusConflict, "Job cannot be re-quoted in status "+j.Status)
		return
	}
	adj := []pricing.LineItem{}
	for _, a := range req.Adjustments {
		adj = append(adj, pricing.LineItem{Label: a.Label, Amount: a.Amount, UnitAmount: a.Amount, Qty: 1, Unit: "flat"})
	}
	var reportID *string
	if r := loadInspectionReport(h.DB, j.ID); r != nil {
		reportID = &r.ID
	}
	q, err := generateQuote(h.DB, h.DB, j.ID, "admin", userID, adj, req.Note, reportID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Quote generation failed: "+err.Error())
		return
	}
	logEvent(h.DB, j.ID, userID, "admin", "quote_regenerated", j.Status, "quote_ready", gin.H{"quote_id": q.ID, "version": q.Version, "total": q.Total})
	notify(h.DB, j.ConsumerID, "quote_ready", "Updated quote ready", "A revised quote (v"+strconv.Itoa(q.Version)+") is ready for review", j.ID, "requestDetail", gin.H{"stage": "quote_ready"})
	h.respondJob(c, http.StatusOK, "Quote regenerated", j.ID)
}
