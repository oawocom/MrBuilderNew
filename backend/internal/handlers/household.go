package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/integrations"
	"github.com/mrbuilder/backend/internal/utils"
)

type HouseholdHandler struct {
	DB *sql.DB
}

func NewHouseholdHandler(db *sql.DB) *HouseholdHandler {
	return &HouseholdHandler{DB: db}
}

func randomToken(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// ---------- household ----------

// isHouseholdMember: active member of owner's household with the given permission column (or "" for any)
func isHouseholdMember(db execer, ownerID, userID, permission string) bool {
	if ownerID == userID {
		return true
	}
	q := `SELECT COUNT(*) FROM household_members WHERE owner_id=$1 AND member_id=$2 AND status='active'`
	if permission != "" {
		q += " AND " + permission
	}
	var n int
	db.QueryRow(q, ownerID, userID).Scan(&n)
	return n > 0
}

func (h *HouseholdHandler) memberView(id string) gin.H {
	var ownerID, role, status string
	var memberID, email, phone, name, token *string
	var canCreate, canMsg, canAck bool
	var invited time.Time
	var joined sql.NullTime
	if h.DB.QueryRow(`SELECT owner_id, member_id, invite_email, invite_phone, name, role, can_create_requests, can_message, can_acknowledge, status, invite_token, invited_at, joined_at
        FROM household_members WHERE id=$1`, id).Scan(&ownerID, &memberID, &email, &phone, &name, &role, &canCreate, &canMsg, &canAck, &status, &token, &invited, &joined) != nil {
		return nil
	}
	out := gin.H{"id": id, "owner_id": ownerID, "member_id": memberID, "email": email, "phone": phone, "name": name, "role": role, "status": status,
		"permissions": gin.H{"can_create_requests": canCreate, "can_message": canMsg, "can_acknowledge": canAck}, "invited_at": invited, "joined_at": nullTime(joined)}
	if memberID != nil {
		out["member"] = loadParty(h.DB, memberID)
	}
	if status == "invited" && token != nil {
		out["invite_token"] = *token
	}
	return out
}

// GET /household — members I manage + households I belong to
func (h *HouseholdHandler) Get(c *gin.Context) {
	userID := c.GetString("user_id")
	members := []gin.H{}
	rows, _ := h.DB.Query(`SELECT id FROM household_members WHERE owner_id=$1 AND status<>'removed' ORDER BY invited_at`, userID)
	if rows != nil {
		for rows.Next() {
			var id string
			if rows.Scan(&id) == nil {
				if v := h.memberView(id); v != nil {
					members = append(members, v)
				}
			}
		}
		rows.Close()
	}
	memberships := []gin.H{}
	rows2, _ := h.DB.Query(`SELECT id, owner_id FROM household_members WHERE member_id=$1 AND status='active'`, userID)
	if rows2 != nil {
		for rows2.Next() {
			var id, owner string
			if rows2.Scan(&id, &owner) == nil {
				v := h.memberView(id)
				v["owner"] = loadParty(h.DB, &owner)
				memberships = append(memberships, v)
			}
		}
		rows2.Close()
	}
	utils.Success(c, http.StatusOK, "", gin.H{"members": members, "memberships": memberships})
}

type InviteRequest struct {
	Email             *string `json:"email"`
	Phone             *string `json:"phone"`
	Name              *string `json:"name"`
	Role              string  `json:"role" binding:"omitempty,oneof=member viewer"`
	CanCreateRequests *bool   `json:"can_create_requests"`
	CanMessage        *bool   `json:"can_message"`
	CanAcknowledge    *bool   `json:"can_acknowledge"`
}

// POST /household/invites
func (h *HouseholdHandler) Invite(c *gin.Context) {
	userID := c.GetString("user_id")
	var req InviteRequest
	if err := c.ShouldBindJSON(&req); err != nil || (req.Email == nil && req.Phone == nil) {
		utils.Error(c, http.StatusBadRequest, "email or phone is required")
		return
	}
	role := req.Role
	if role == "" {
		role = "member"
	}
	canCreate, canMsg, canAck := role == "member", true, role == "member"
	if req.CanCreateRequests != nil {
		canCreate = *req.CanCreateRequests
	}
	if req.CanMessage != nil {
		canMsg = *req.CanMessage
	}
	if req.CanAcknowledge != nil {
		canAck = *req.CanAcknowledge
	}
	// existing account?
	var memberID *string
	var mid string
	if req.Email != nil && h.DB.QueryRow(`SELECT id FROM users WHERE LOWER(email)=LOWER($1)`, *req.Email).Scan(&mid) == nil {
		memberID = &mid
	} else if req.Phone != nil && h.DB.QueryRow(`SELECT id FROM users WHERE phone=$1`, *req.Phone).Scan(&mid) == nil {
		memberID = &mid
	}
	if memberID != nil && *memberID == userID {
		utils.Error(c, http.StatusBadRequest, "You can't invite yourself")
		return
	}
	var dup int
	h.DB.QueryRow(`SELECT COUNT(*) FROM household_members WHERE owner_id=$1 AND status<>'removed' AND (member_id=$2 OR (invite_email IS NOT NULL AND LOWER(invite_email)=LOWER($3)) OR (invite_phone IS NOT NULL AND invite_phone=$4))`,
		userID, memberID, strOr(req.Email, ""), strOr(req.Phone, "")).Scan(&dup)
	if dup > 0 {
		utils.Error(c, http.StatusConflict, "Already invited")
		return
	}
	token := randomToken(16)
	var id string
	if err := h.DB.QueryRow(`INSERT INTO household_members (owner_id, member_id, invite_email, invite_phone, name, role, can_create_requests, can_message, can_acknowledge, status, invite_token)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'invited',$10) RETURNING id`, userID, memberID, req.Email, req.Phone, req.Name, role, canCreate, canMsg, canAck, token).Scan(&id); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to invite: "+err.Error())
		return
	}
	if memberID != nil {
		notify(h.DB, *memberID, "household_invite", partyName(h.DB, &userID)+" invited you to their household", "Accept to see and help with their pergola requests", "", "household", gin.H{"invite_token": token, "membership_id": id})
	}
	base := GetSettingString(h.DB, "web_base_url", "https://new.mrbuilder.com")
	link := base + "/register?invite=" + token
	inviter := partyName(h.DB, &userID)
	if req.Email != nil {
		integrations.SendEmail(*req.Email, inviter+" invited you to their MrBuilder household", "<p>"+inviter+" added you to their household on MrBuilder so you can help manage their pergola requests.</p><p><a href=\""+link+"\">Accept the invitation</a></p>")
	} else if req.Phone != nil {
		integrations.SendSMS(*req.Phone, inviter+" invited you to their MrBuilder household: "+link)
	}
	utils.Success(c, http.StatusCreated, "Invitation sent", h.memberView(id))
}

// POST /household/accept {token}
func (h *HouseholdHandler) Accept(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var id, ownerID string
	if h.DB.QueryRow(`UPDATE household_members SET member_id=$1, status='active', joined_at=NOW(), invite_token=NULL WHERE invite_token=$2 AND status='invited' AND (member_id IS NULL OR member_id=$1) AND owner_id<>$1 RETURNING id, owner_id`,
		userID, req.Token).Scan(&id, &ownerID) != nil {
		utils.Error(c, http.StatusNotFound, "Invalid or used invitation")
		return
	}
	notify(h.DB, ownerID, "household_joined", partyName(h.DB, &userID)+" joined your household", "", "", "household", gin.H{"membership_id": id})
	utils.Success(c, http.StatusOK, "Joined household", h.memberView(id))
}

type MemberUpdate struct {
	Role              *string `json:"role" binding:"omitempty,oneof=member viewer"`
	Name              *string `json:"name"`
	CanCreateRequests *bool   `json:"can_create_requests"`
	CanMessage        *bool   `json:"can_message"`
	CanAcknowledge    *bool   `json:"can_acknowledge"`
}

// PATCH /household/members/:id
func (h *HouseholdHandler) UpdateMember(c *gin.Context) {
	userID := c.GetString("user_id")
	var req MemberUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	res, _ := h.DB.Exec(`UPDATE household_members SET role=COALESCE($1,role), name=COALESCE($2,name), can_create_requests=COALESCE($3,can_create_requests),
        can_message=COALESCE($4,can_message), can_acknowledge=COALESCE($5,can_acknowledge) WHERE id=$6 AND owner_id=$7 AND status<>'removed'`,
		req.Role, req.Name, req.CanCreateRequests, req.CanMessage, req.CanAcknowledge, c.Param("id"), userID)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Member not found")
		return
	}
	utils.Success(c, http.StatusOK, "Member updated", h.memberView(c.Param("id")))
}

// DELETE /household/members/:id — owner removes, or a member leaves
func (h *HouseholdHandler) RemoveMember(c *gin.Context) {
	userID := c.GetString("user_id")
	res, _ := h.DB.Exec(`UPDATE household_members SET status='removed', removed_at=NOW(), invite_token=NULL WHERE id=$1 AND (owner_id=$2 OR member_id=$2) AND status<>'removed'`, c.Param("id"), userID)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Member not found")
		return
	}
	utils.Success(c, http.StatusOK, "Removed", nil)
}

// POST /jobs/:id/acknowledge — household member (or owner) confirms the work looks done; only the owner can approve payment
func (h *HouseholdHandler) Acknowledge(c *gin.Context) {
	userID := c.GetString("user_id")
	var consumerID, status, title string
	var code *string
	if h.DB.QueryRow(`SELECT consumer_id, status::text, title, request_code FROM jobs WHERE id=$1`, c.Param("id")).Scan(&consumerID, &status, &title, &code) != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if !isHouseholdMember(h.DB, consumerID, userID, "can_acknowledge") {
		utils.Error(c, http.StatusForbidden, "Not allowed")
		return
	}
	if status != "awaiting_confirmation" {
		utils.Error(c, http.StatusConflict, "Job is not awaiting confirmation")
		return
	}
	h.DB.Exec(`UPDATE jobs SET hh_acknowledged_by=$1, hh_acknowledged_at=NOW(), updated_at=NOW() WHERE id=$2`, userID, c.Param("id"))
	logEvent(h.DB, c.Param("id"), userID, "household", "hh_acknowledged", status, status, nil)
	if userID != consumerID {
		notify(h.DB, consumerID, "hh_ack", partyName(h.DB, &userID)+" acknowledged "+strOr(code, title), "Approve to release payment", c.Param("id"), "requestDetail", gin.H{"stage": "awaiting"})
	}
	utils.Success(c, http.StatusOK, "Acknowledged — the account owner will approve payment", gin.H{"owner_approval_required": userID != consumerID})
}

// ---------- documents ----------

func addDocument(db execer, userID, dtype, title string, jobID, pergolaID, refID, url *string, payload interface{}) {
	if userID == "" {
		return
	}
	db.Exec(`INSERT INTO documents (user_id, type, title, job_id, pergola_id, ref_id, url, payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
		userID, dtype, title, jobID, pergolaID, refID, url, toJSON(payload))
}

// documentsForPaidJob: invoice + completion photo set (called from settle)
func documentsForPaidJob(db *sql.DB, jobID string) {
	var consumerID, title string
	var code, pergolaID *string
	var charged *float64
	if db.QueryRow(`SELECT consumer_id, title, request_code, pergola_id, consumer_charged FROM jobs WHERE id=$1`, jobID).Scan(&consumerID, &title, &code, &pergolaID, &charged) != nil {
		return
	}
	var invoiceID *string
	db.QueryRow(`SELECT id FROM invoices WHERE job_id=$1 AND line_type='job' ORDER BY created_at DESC LIMIT 1`, jobID).Scan(&invoiceID)
	addDocument(db, consumerID, "invoice", "Invoice "+strOr(code, title), &jobID, pergolaID, invoiceID, nil, gin.H{"amount": charged, "paid": true})
	photos := []string{}
	rows, _ := db.Query(`SELECT url FROM job_evidence WHERE job_id=$1 AND kind='completion' ORDER BY created_at`, jobID)
	if rows != nil {
		for rows.Next() {
			var u string
			if rows.Scan(&u) == nil {
				photos = append(photos, u)
			}
		}
		rows.Close()
	}
	if len(photos) > 0 {
		addDocument(db, consumerID, "completion_photos", "Completion photos · "+strOr(code, title), &jobID, pergolaID, nil, nil, gin.H{"photos": photos})
	}
}

// GET /documents?type=&job_id=&pergola_id=
func (h *HouseholdHandler) ListDocuments(c *gin.Context) {
	userID := c.GetString("user_id")
	page, limit := utils.Pagination(c)
	where := []string{"user_id=$1"}
	args := []interface{}{userID}
	if v := c.Query("type"); v != "" {
		args = append(args, v)
		where = append(where, fmt.Sprintf("type=$%d", len(args)))
	}
	if v := c.Query("job_id"); v != "" {
		args = append(args, v)
		where = append(where, fmt.Sprintf("job_id=$%d", len(args)))
	}
	if v := c.Query("pergola_id"); v != "" {
		args = append(args, v)
		where = append(where, fmt.Sprintf("pergola_id=$%d", len(args)))
	}
	w := strings.Join(where, " AND ")
	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM documents WHERE `+w, args...).Scan(&total)
	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query(`SELECT d.id, d.type, d.title, d.job_id, j.request_code, d.pergola_id, d.ref_id, d.url, d.payload, d.share_token IS NOT NULL, d.created_at
        FROM documents d LEFT JOIN jobs j ON j.id=d.job_id WHERE `+w+fmt.Sprintf(` ORDER BY d.created_at DESC LIMIT $%d OFFSET $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load documents")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, dtype, title string
		var jobID, code, pergolaID, refID, url *string
		var payload []byte
		var shared bool
		var at time.Time
		if rows.Scan(&id, &dtype, &title, &jobID, &code, &pergolaID, &refID, &url, &payload, &shared, &at) == nil {
			out = append(out, gin.H{"id": id, "type": dtype, "title": title, "job_id": jobID, "request_code": code, "pergola_id": pergolaID, "ref_id": refID, "url": url, "payload": json.RawMessage(payload), "shared": shared, "created_at": at})
		}
	}
	utils.Paginated(c, http.StatusOK, out, total, page, limit)
}

// POST /documents/:id/share → public link token (7 days)
func (h *HouseholdHandler) ShareDocument(c *gin.Context) {
	userID := c.GetString("user_id")
	token := randomToken(16)
	res, _ := h.DB.Exec(`UPDATE documents SET share_token=$1, share_expires_at=NOW() + INTERVAL '7 days' WHERE id=$2 AND user_id=$3`, token, c.Param("id"), userID)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Document not found")
		return
	}
	utils.Success(c, http.StatusOK, "Share link created", gin.H{"token": token, "path": "/api/v1/public/documents/" + token, "expires_in_days": 7})
}

// GET /public/documents/:token
func (h *HouseholdHandler) PublicDocument(c *gin.Context) {
	var dtype, title string
	var url *string
	var payload []byte
	if h.DB.QueryRow(`SELECT type, title, url, payload FROM documents WHERE share_token=$1 AND (share_expires_at IS NULL OR share_expires_at > NOW())`, c.Param("token")).Scan(&dtype, &title, &url, &payload) != nil {
		utils.Error(c, http.StatusNotFound, "Link expired or invalid")
		return
	}
	utils.Success(c, http.StatusOK, "", gin.H{"type": dtype, "title": title, "url": url, "payload": json.RawMessage(payload)})
}

// ---------- drafts ----------

type DraftRequest struct {
	ServiceCategory *string          `json:"service_category"`
	Step            *string          `json:"step"`
	Payload         *json.RawMessage `json:"payload"`
}

func (h *HouseholdHandler) draftView(row interface{ Scan(...interface{}) error }) (gin.H, error) {
	var id string
	var cat, step *string
	var payload []byte
	var created, updated time.Time
	if err := row.Scan(&id, &cat, &step, &payload, &created, &updated); err != nil {
		return nil, err
	}
	return gin.H{"id": id, "service_category": cat, "step": step, "payload": json.RawMessage(payload), "created_at": created, "updated_at": updated}, nil
}

// GET /drafts
func (h *HouseholdHandler) ListDrafts(c *gin.Context) {
	rows, err := h.DB.Query(`SELECT id, service_category, step, payload, created_at, updated_at FROM request_drafts WHERE user_id=$1 ORDER BY updated_at DESC`, c.GetString("user_id"))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load drafts")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		if d, e := h.draftView(rows); e == nil {
			out = append(out, d)
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

// POST /drafts
func (h *HouseholdHandler) CreateDraft(c *gin.Context) {
	var req DraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	payload := "{}"
	if req.Payload != nil {
		payload = string(*req.Payload)
	}
	d, err := h.draftView(h.DB.QueryRow(`INSERT INTO request_drafts (user_id, service_category, step, payload) VALUES ($1,$2,$3,$4::jsonb) RETURNING id, service_category, step, payload, created_at, updated_at`,
		c.GetString("user_id"), req.ServiceCategory, req.Step, payload))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to save draft: "+err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "Draft saved", d)
}

// PUT /drafts/:id
func (h *HouseholdHandler) UpdateDraft(c *gin.Context) {
	var req DraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var payload interface{}
	if req.Payload != nil {
		payload = string(*req.Payload)
	}
	d, err := h.draftView(h.DB.QueryRow(`UPDATE request_drafts SET service_category=COALESCE($1,service_category), step=COALESCE($2,step), payload=COALESCE($3::jsonb,payload), updated_at=NOW()
        WHERE id=$4 AND user_id=$5 RETURNING id, service_category, step, payload, created_at, updated_at`, req.ServiceCategory, req.Step, payload, c.Param("id"), c.GetString("user_id")))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Draft not found")
		return
	}
	utils.Success(c, http.StatusOK, "Draft saved", d)
}

// DELETE /drafts/:id
func (h *HouseholdHandler) DeleteDraft(c *gin.Context) {
	res, _ := h.DB.Exec(`DELETE FROM request_drafts WHERE id=$1 AND user_id=$2`, c.Param("id"), c.GetString("user_id"))
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Draft not found")
		return
	}
	utils.Success(c, http.StatusOK, "Draft deleted", nil)
}

// ---------- maintenance reminders ----------

func scheduleReminder(db *sql.DB, userID, pergolaID, kind string, dueAt time.Time, source string) {
	db.Exec(`INSERT INTO maintenance_reminders (user_id, pergola_id, kind, due_at, source) VALUES ($1,$2,$3,$4::date,$5) ON CONFLICT (pergola_id, kind, due_at) DO NOTHING`,
		userID, pergolaID, kind, dueAt, source)
}

// remindersForPaidJob: next maintenance due after an installation or maintenance visit (called from settle)
func remindersForPaidJob(db *sql.DB, jobID string) {
	var consumerID, category string
	var pergolaID *string
	if db.QueryRow(`SELECT consumer_id, COALESCE(service_category,''), pergola_id FROM jobs WHERE id=$1`, jobID).Scan(&consumerID, &category, &pergolaID) != nil || pergolaID == nil {
		return
	}
	if category != "installation" && category != "maintenance" {
		return
	}
	months := GetSettingInt(db, "maintenance_interval_months", 12)
	db.Exec(`UPDATE maintenance_reminders SET status='done', updated_at=NOW() WHERE pergola_id=$1 AND kind='maintenance' AND status IN ('pending','notified','snoozed')`, *pergolaID)
	scheduleReminder(db, consumerID, *pergolaID, "maintenance", time.Now().AddDate(0, months, 0), "last_visit")
}

// RunReminders: notify due reminders (lead time from settings); un-snooze expired snoozes. Called by the ticker.
func RunReminders(db *sql.DB) {
	db.Exec(`UPDATE maintenance_reminders SET status='pending', snoozed_until=NULL, updated_at=NOW() WHERE status='snoozed' AND snoozed_until <= CURRENT_DATE`)
	lead := GetSettingInt(db, "reminder_days_before_due", 14)
	rows, err := db.Query(`SELECT r.id, r.user_id, r.pergola_id, r.kind, r.due_at::text, p.name FROM maintenance_reminders r JOIN consumer_pergolas p ON p.id=r.pergola_id
        WHERE r.status='pending' AND r.due_at <= CURRENT_DATE + ($1 || ' days')::interval`, fmt.Sprint(lead))
	if err != nil {
		return
	}
	type rem struct{ id, user, pergola, kind, due, name string }
	var list []rem
	for rows.Next() {
		var r rem
		if rows.Scan(&r.id, &r.user, &r.pergola, &r.kind, &r.due, &r.name) == nil {
			list = append(list, r)
		}
	}
	rows.Close()
	for _, r := range list {
		title := map[string]string{"maintenance": "Maintenance due soon", "winterization": "Time to winterize", "plan_renewal": "MrCare plan renews soon"}[r.kind]
		notify(db, r.user, "reminder_"+r.kind, title, r.name+" · due "+r.due, "", "reminders", gin.H{"reminder_id": r.id, "pergola_id": r.pergola})
		db.Exec(`UPDATE maintenance_reminders SET status='notified', notified_at=NOW(), updated_at=NOW() WHERE id=$1`, r.id)
		log.Printf("reminder sent %s (%s)", r.id, r.kind)
	}
}

// GET /reminders
func (h *HouseholdHandler) ListReminders(c *gin.Context) {
	rows, err := h.DB.Query(`SELECT r.id, r.pergola_id, p.name, r.kind, r.due_at::text, r.status, r.snoozed_until::text, r.source FROM maintenance_reminders r JOIN consumer_pergolas p ON p.id=r.pergola_id
        WHERE r.user_id=$1 AND r.status IN ('pending','notified','snoozed') ORDER BY r.due_at`, c.GetString("user_id"))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load reminders")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, pid, name, kind, due, status string
		var snoozed, source *string
		if rows.Scan(&id, &pid, &name, &kind, &due, &status, &snoozed, &source) == nil {
			out = append(out, gin.H{"id": id, "pergola_id": pid, "pergola": name, "kind": kind, "due_at": due, "status": status, "snoozed_until": snoozed, "source": source})
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

// POST /reminders/:id/snooze {days} · /dismiss · /done
func (h *HouseholdHandler) ReminderAction(c *gin.Context) {
	userID := c.GetString("user_id")
	action := c.Param("action")
	var q string
	args := []interface{}{c.Param("id"), userID}
	switch action {
	case "snooze":
		var req struct {
			Days int `json:"days"`
		}
		c.ShouldBindJSON(&req)
		if req.Days <= 0 {
			req.Days = 7
		}
		q = `UPDATE maintenance_reminders SET status='snoozed', snoozed_until=CURRENT_DATE + ($3 || ' days')::interval, updated_at=NOW() WHERE id=$1 AND user_id=$2`
		args = append(args, fmt.Sprint(req.Days))
	case "dismiss":
		q = `UPDATE maintenance_reminders SET status='dismissed', updated_at=NOW() WHERE id=$1 AND user_id=$2`
	case "done":
		q = `UPDATE maintenance_reminders SET status='done', updated_at=NOW() WHERE id=$1 AND user_id=$2`
	default:
		utils.Error(c, http.StatusBadRequest, "Unknown action")
		return
	}
	res, _ := h.DB.Exec(q, args...)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Reminder not found")
		return
	}
	utils.Success(c, http.StatusOK, "Reminder "+action+"d", nil)
}

// ---------- referrals ----------

// GET /referrals
func (h *HouseholdHandler) Referrals(c *gin.Context) {
	userID := c.GetString("user_id")
	var code string
	h.DB.QueryRow(`SELECT referral_code FROM users WHERE id=$1`, userID).Scan(&code)
	rows, _ := h.DB.Query(`SELECT r.status, r.reward_amount, r.created_at, u.first_name FROM referrals r JOIN users u ON u.id=r.referred_id WHERE r.referrer_id=$1 ORDER BY r.created_at DESC`, userID)
	list := []gin.H{}
	earned := 0.0
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var status, name string
			var amt *float64
			var at time.Time
			if rows.Scan(&status, &amt, &at, &name) == nil {
				if amt != nil && status == "rewarded" {
					earned += *amt
				}
				list = append(list, gin.H{"name": name, "status": status, "reward_amount": amt, "created_at": at})
			}
		}
	}
	var balance float64
	h.DB.QueryRow(`SELECT COALESCE(balance,0) FROM balances WHERE user_id=$1`, userID).Scan(&balance)
	utils.Success(c, http.StatusOK, "", gin.H{"code": code, "reward_amount": GetSettingFloat(h.DB, "referral_reward", 25), "earned": money(earned), "credit_balance": money(balance), "referrals": list})
}

// POST /referrals/apply {code} — once per account, before the first paid job
func (h *HouseholdHandler) ApplyReferral(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var referrer string
	if h.DB.QueryRow(`SELECT id FROM users WHERE referral_code=UPPER($1) AND id<>$2`, strings.TrimSpace(req.Code), userID).Scan(&referrer) != nil {
		utils.Error(c, http.StatusNotFound, "Invalid referral code")
		return
	}
	var paid int
	h.DB.QueryRow(`SELECT COUNT(*) FROM jobs WHERE consumer_id=$1 AND status='completed_paid'`, userID).Scan(&paid)
	if paid > 0 {
		utils.Error(c, http.StatusConflict, "Referral codes can only be applied before your first paid job")
		return
	}
	if _, err := h.DB.Exec(`INSERT INTO referrals (referrer_id, referred_id) VALUES ($1,$2)`, referrer, userID); err != nil {
		utils.Error(c, http.StatusConflict, "A referral is already applied to this account")
		return
	}
	utils.Success(c, http.StatusOK, "Referral applied", gin.H{"reward_after": "your first paid job"})
}

// rewardReferral credits the referrer after the referred user's first paid job (called from settle)
func rewardReferral(db *sql.DB, consumerID, jobID string) {
	var refID, referrer string
	if db.QueryRow(`SELECT id, referrer_id FROM referrals WHERE referred_id=$1 AND status='pending'`, consumerID).Scan(&refID, &referrer) != nil {
		return
	}
	amount := GetSettingFloat(db, "referral_reward", 25)
	db.Exec(`UPDATE referrals SET status='rewarded', reward_amount=$1, rewarded_job_id=$2, rewarded_at=NOW() WHERE id=$3`, amount, jobID, refID)
	db.Exec(`INSERT INTO balances (user_id, balance) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET balance=balances.balance+$2, updated_at=NOW()`, referrer, amount)
	db.Exec(`INSERT INTO transactions (user_id, transaction_type, status, amount, description) VALUES ($1,'referral_credit','completed',$2,'Referral reward')`, referrer, amount)
	notify(db, referrer, "referral_reward", fmt.Sprintf("You earned $%.0f credit", amount), partyName(db, &consumerID)+" completed their first job", "", "referrals", nil)
}

// ---------- contractor public summary ----------

// GET /contractors/:id/summary — for the consumer's job / quote screens
func (h *HouseholdHandler) ContractorSummary(c *gin.Context) {
	id := c.Param("id")
	var first, last string
	var avatar *string
	var rating float64
	var jobs int
	var since time.Time
	if h.DB.QueryRow(`SELECT u.first_name, u.last_name, u.avatar_url, COALESCE(cp.rating_avg,0), COALESCE(cp.jobs_completed,0), u.created_at
        FROM users u LEFT JOIN contractor_profiles cp ON cp.user_id=u.id WHERE u.id=$1 AND u.role='contractor'`, id).Scan(&first, &last, &avatar, &rating, &jobs, &since) != nil {
		utils.Error(c, http.StatusNotFound, "Contractor not found")
		return
	}
	cats := []string{}
	rows, _ := h.DB.Query(`SELECT c.name FROM contractor_qualifications q JOIN service_categories c ON c.slug=q.category WHERE q.user_id=$1 AND q.status='qualified' ORDER BY c.sort_order`, id)
	if rows != nil {
		for rows.Next() {
			var n string
			if rows.Scan(&n) == nil {
				cats = append(cats, n)
			}
		}
		rows.Close()
	}
	var ratings int
	h.DB.QueryRow(`SELECT COUNT(*) FROM ratings WHERE rated_user=$1`, id).Scan(&ratings)
	var avgAccept *float64
	h.DB.QueryRow(`SELECT AVG(EXTRACT(EPOCH FROM (accepted_at - updated_at)))/60 FROM jobs WHERE contractor_id=$1 AND accepted_at IS NOT NULL AND status='completed_paid'`, id).Scan(&avgAccept)
	initial := ""
	if r := []rune(last); len(r) > 0 {
		initial = " " + string(r[:1]) + "."
	}
	utils.Success(c, http.StatusOK, "", gin.H{"id": id, "name": first + initial, "avatar_url": avatar, "rating_avg": rating, "ratings_count": ratings,
		"jobs_completed": jobs, "member_since": since.Format("2006-01"), "qualified_categories": cats, "pro": len(cats) > 0})
}
