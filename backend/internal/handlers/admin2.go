package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/mrbuilder/backend/internal/integrations"
	"github.com/mrbuilder/backend/internal/models"
	"github.com/mrbuilder/backend/internal/utils"
)

// GET /admin/jobs2?status=a,b&category=&q=&page — full job rows with party names (admin panel)
func (h *JobHandler) AdminListJobs(c *gin.Context) {
	page, limit := utils.Pagination(c)
	where := []string{"1=1"}
	args := []interface{}{}
	if v := c.Query("status"); v != "" {
		args = append(args, pq.Array(strings.Split(v, ",")))
		where = append(where, "status::text = ANY($"+strconv.Itoa(len(args))+")")
	}
	if v := c.Query("category"); v != "" {
		args = append(args, v)
		where = append(where, "service_category=$"+strconv.Itoa(len(args)))
	}
	if v := strings.TrimSpace(c.Query("q")); v != "" {
		args = append(args, "%"+v+"%")
		n := strconv.Itoa(len(args))
		where = append(where, "(request_code ILIKE $"+n+" OR title ILIKE $"+n+" OR location_city ILIKE $"+n+")")
	}
	if c.Query("attention") != "" {
		where = append(where, "status::text IN ('dispute_open','paused_safety','no_match_waitlist','quote_declined','issue_reported')")
	}
	w := strings.Join(where, " AND ")
	var total int64
	h.DB.QueryRow("SELECT COUNT(*) FROM jobs WHERE "+w, args...).Scan(&total)
	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query("SELECT "+jobColumns+" FROM jobs WHERE "+w+" ORDER BY updated_at DESC LIMIT $"+strconv.Itoa(len(args)-1)+" OFFSET $"+strconv.Itoa(len(args)), args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list jobs: "+err.Error())
		return
	}
	defer rows.Close()
	out := []*models.Job{}
	for rows.Next() {
		if j, e := scanJob(rows); e == nil {
			j.Consumer = loadParty(h.DB, &j.ConsumerID)
			j.Contractor = loadParty(h.DB, j.ContractorID)
			out = append(out, j)
		}
	}
	utils.Paginated(c, http.StatusOK, out, total, page, limit)
}

// GET /admin/jobs2/:id — full detail incl. quotes, report, evidence, events, disputes
func (h *JobHandler) AdminGetJob(c *gin.Context) {
	j, err := h.getJob(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	h.enrich(j)
	events := []gin.H{}
	rows, _ := h.DB.Query(`SELECT event_type, from_status, to_status, actor_role, data, created_at FROM job_events WHERE job_id=$1 ORDER BY created_at`, j.ID)
	if rows != nil {
		for rows.Next() {
			var et string
			var from, to, role *string
			var data []byte
			var at time.Time
			if rows.Scan(&et, &from, &to, &role, &data, &at) == nil {
				events = append(events, gin.H{"event_type": et, "from": from, "to": to, "actor_role": role, "data": string(data), "created_at": at})
			}
		}
		rows.Close()
	}
	var dispute interface{}
	var reason, decision, resolution *string
	var dstatus string
	if h.DB.QueryRow(`SELECT reason, status::text, decision, resolution FROM job_disputes WHERE job_id=$1 ORDER BY created_at DESC LIMIT 1`, j.ID).Scan(&reason, &dstatus, &decision, &resolution) == nil {
		dispute = gin.H{"reason": reason, "status": dstatus, "decision": decision, "resolution": resolution}
	}
	evidence := []gin.H{}
	erows, _ := h.DB.Query(`SELECT kind, url, note, created_at FROM job_evidence WHERE job_id=$1 ORDER BY created_at`, j.ID)
	if erows != nil {
		for erows.Next() {
			var k, u string
			var note *string
			var at time.Time
			if erows.Scan(&k, &u, &note, &at) == nil {
				evidence = append(evidence, gin.H{"kind": k, "url": u, "note": note, "created_at": at})
			}
		}
		erows.Close()
	}
	utils.Success(c, http.StatusOK, "", gin.H{"job": j, "events": events, "dispute": dispute, "evidence": evidence})
}

// GET /admin/contractors?q=&status= — contractors with qualification summary
func (h *TrainingHandler) AdminListContractors(c *gin.Context) {
	page, limit := utils.Pagination(c)
	where := []string{"u.role='contractor'"}
	args := []interface{}{}
	if v := c.Query("status"); v != "" {
		args = append(args, v)
		where = append(where, "u.status::text=$"+strconv.Itoa(len(args)))
	}
	if v := strings.TrimSpace(c.Query("q")); v != "" {
		args = append(args, "%"+v+"%")
		n := strconv.Itoa(len(args))
		where = append(where, "(u.email ILIKE $"+n+" OR u.first_name ILIKE $"+n+" OR u.last_name ILIKE $"+n+")")
	}
	w := strings.Join(where, " AND ")
	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM users u WHERE `+w, args...).Scan(&total)
	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query(`SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.status::text, u.created_at, COALESCE(cp.rating_avg,0), COALESCE(cp.jobs_completed,0), COALESCE(cp.city,''), COALESCE(cp.state,''),
            COALESCE((SELECT balance FROM balances b WHERE b.user_id=u.id),0),
            COALESCE((SELECT string_agg(q.category || ':' || q.status, ',' ORDER BY q.category) FROM contractor_qualifications q WHERE q.user_id=u.id),'')
        FROM users u LEFT JOIN contractor_profiles cp ON cp.user_id=u.id WHERE `+w+` ORDER BY u.created_at DESC LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list contractors: "+err.Error())
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, email, first, last, status, city, state, quals string
		var phone *string
		var created time.Time
		var rating, balance float64
		var jobs int
		if rows.Scan(&id, &email, &first, &last, &phone, &status, &created, &rating, &jobs, &city, &state, &balance, &quals) == nil {
			q := []gin.H{}
			if quals != "" {
				for _, p := range strings.Split(quals, ",") {
					kv := strings.SplitN(p, ":", 2)
					if len(kv) == 2 {
						q = append(q, gin.H{"category": kv[0], "status": kv[1]})
					}
				}
			}
			st := lockState(h.DB, id)
			out = append(out, gin.H{"id": id, "email": email, "first_name": first, "last_name": last, "phone": phone, "status": status, "created_at": created,
				"rating_avg": rating, "jobs_completed": jobs, "city": city, "state": state, "balance": balance, "qualifications": q, "locked": st.Locked, "core_done": st.CoreDone, "safety_done": st.SafetyDone})
		}
	}
	utils.Paginated(c, http.StatusOK, out, total, page, limit)
}

var _ = sql.ErrNoRows

// GET /admin/training — modules with lessons (content management)
func (h *TrainingHandler) AdminContent(c *gin.Context) {
	rows, err := h.DB.Query(`SELECT m.id, m.kind, m.category, m.slug, m.title, m.description, m.sort_order, m.is_active,
            l.id, l.slug, l.title, l.summary, l.duration_minutes, l.is_placeholder, l.manufacturer, l.model, l.sort_order, l.is_active, l.video_url IS NOT NULL AND l.video_url<>'',
            (SELECT COUNT(*) FROM quiz_questions q WHERE q.lesson_id=l.id AND q.is_active)
        FROM training_modules m LEFT JOIN training_lessons l ON l.module_id=m.id ORDER BY m.sort_order, l.sort_order`)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load content")
		return
	}
	defer rows.Close()
	modules := []gin.H{}
	idx := map[string]int{}
	for rows.Next() {
		var mid, kind, mslug, mtitle string
		var mcat, mdesc *string
		var morder int
		var mactive bool
		var lid, lslug, ltitle, lsummary, mfr, model, video *string
		var ldur, lorder *int
		var lplace, lactive, hasVideo *bool
		var questions int
		_ = video
		if rows.Scan(&mid, &kind, &mcat, &mslug, &mtitle, &mdesc, &morder, &mactive, &lid, &lslug, &ltitle, &lsummary, &ldur, &lplace, &mfr, &model, &lorder, &lactive, &hasVideo, &questions) != nil {
			continue
		}
		i, ok := idx[mid]
		if !ok {
			modules = append(modules, gin.H{"id": mid, "kind": kind, "category": mcat, "slug": mslug, "title": mtitle, "description": mdesc, "sort_order": morder, "is_active": mactive, "lessons": []gin.H{}})
			i = len(modules) - 1
			idx[mid] = i
		}
		if lid != nil {
			ls := modules[i]["lessons"].([]gin.H)
			hv := hasVideo != nil && *hasVideo
			ls = append(ls, gin.H{"id": *lid, "slug": *lslug, "title": *ltitle, "summary": lsummary, "duration_minutes": ldur, "is_placeholder": lplace, "manufacturer": mfr, "model": model, "sort_order": lorder, "is_active": lactive, "has_video": hv, "questions": questions})
			modules[i]["lessons"] = ls
		}
	}
	utils.Success(c, http.StatusOK, "", modules)
}

// GET /admin/training/lessons/:slug — full lesson with quiz answers
func (h *TrainingHandler) AdminLesson(c *gin.Context) {
	var id, slug, title, mslug string
	var summary, video, transcript, mfr, model *string
	var examples, checklist []byte
	var dur, order int
	var placeholder, active bool
	if h.DB.QueryRow(`SELECT l.id, l.slug, l.title, l.summary, l.video_url, l.transcript, l.examples, l.checklist, l.duration_minutes, l.is_placeholder, l.manufacturer, l.model, l.sort_order, l.is_active, m.slug
        FROM training_lessons l JOIN training_modules m ON m.id=l.module_id WHERE l.slug=$1`, c.Param("slug")).
		Scan(&id, &slug, &title, &summary, &video, &transcript, &examples, &checklist, &dur, &placeholder, &mfr, &model, &order, &active, &mslug) != nil {
		utils.Error(c, http.StatusNotFound, "Lesson not found")
		return
	}
	qs := []gin.H{}
	rows, _ := h.DB.Query(`SELECT question, options, correct_option, is_critical, explanation FROM quiz_questions WHERE lesson_id=$1 AND is_active ORDER BY sort_order`, id)
	if rows != nil {
		for rows.Next() {
			var q, correct string
			var opts []byte
			var crit bool
			var expl *string
			if rows.Scan(&q, &opts, &correct, &crit, &expl) == nil {
				qs = append(qs, gin.H{"question": q, "options": json.RawMessage(opts), "correct_option": correct, "is_critical": crit, "explanation": expl})
			}
		}
		rows.Close()
	}
	utils.Success(c, http.StatusOK, "", gin.H{"id": id, "slug": slug, "module": mslug, "title": title, "summary": summary, "video_url": video, "transcript": transcript,
		"examples": json.RawMessage(examples), "checklist": json.RawMessage(checklist), "duration_minutes": dur, "is_placeholder": placeholder, "manufacturer": mfr, "model": model, "sort_order": order, "is_active": active, "questions": qs})
}

// GET /admin/dashboard — operational numbers
func (h *JobHandler) AdminDashboard(c *gin.Context) {
	out := gin.H{}
	q := func(key, sql string) {
		var v float64
		h.DB.QueryRow(sql).Scan(&v)
		out[key] = v
	}
	q("jobs_active", `SELECT COUNT(*) FROM jobs WHERE status::text IN ('assigned','en_route','arrived','in_progress','paused_safety')`)
	q("jobs_matching", `SELECT COUNT(*) FROM jobs WHERE status::text IN ('matching','reassigning')`)
	q("jobs_waitlist", `SELECT COUNT(*) FROM jobs WHERE status='no_match_waitlist'`)
	q("jobs_awaiting_confirmation", `SELECT COUNT(*) FROM jobs WHERE status='awaiting_confirmation'`)
	q("disputes_open", `SELECT COUNT(*) FROM jobs WHERE status='dispute_open'`)
	q("safety_pauses", `SELECT COUNT(*) FROM jobs WHERE status='paused_safety'`)
	q("quotes_pending", `SELECT COUNT(*) FROM jobs WHERE status='quote_ready'`)
	q("paid_30d", `SELECT COALESCE(SUM(consumer_charged),0) FROM jobs WHERE status IN ('completed_paid','dispute_upheld') AND paid_at > NOW() - INTERVAL '30 days'`)
	q("fees_30d", `SELECT COALESCE(SUM(platform_fee),0) FROM jobs WHERE status IN ('completed_paid','dispute_upheld') AND paid_at > NOW() - INTERVAL '30 days'`)
	q("jobs_paid_30d", `SELECT COUNT(*) FROM jobs WHERE status IN ('completed_paid','dispute_upheld') AND paid_at > NOW() - INTERVAL '30 days'`)
	q("payouts_pending", `SELECT COALESCE(SUM(amount),0) FROM payout_requests WHERE status IN ('pending','approved')`)
	q("claims_under_review", `SELECT COUNT(*) FROM electronics_claims WHERE review_status='under_review'`)
	q("orders_to_ship", `SELECT COUNT(*) FROM supply_orders WHERE status IN ('paid','packing')`)
	q("orders_reported", `SELECT COUNT(*) FROM supply_orders WHERE report_reason IS NOT NULL AND status<>'cancelled'`)
	q("contractors_pending", `SELECT COUNT(*) FROM users WHERE role='contractor' AND status='pending'`)
	q("contractors_active", `SELECT COUNT(*) FROM users WHERE role='contractor' AND status='active'`)
	q("contractors_practical_pending", `SELECT COUNT(DISTINCT user_id) FROM contractor_qualifications WHERE status='practical_pending'`)
	q("consumers", `SELECT COUNT(*) FROM users WHERE role='consumer'`)
	q("subscriptions_active", `SELECT COUNT(*) FROM mrcare_subscriptions WHERE status='active'`)
	q("requests_7d", `SELECT COUNT(*) FROM jobs WHERE created_at > NOW() - INTERVAL '7 days'`)
	series := []gin.H{}
	rows, _ := h.DB.Query(`SELECT d::date, COALESCE((SELECT COUNT(*) FROM jobs j WHERE j.created_at::date=d::date),0), COALESCE((SELECT SUM(consumer_charged) FROM jobs j WHERE j.paid_at::date=d::date),0)
        FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day') d ORDER BY d`)
	if rows != nil {
		for rows.Next() {
			var d time.Time
			var n int
			var amt float64
			if rows.Scan(&d, &n, &amt) == nil {
				series = append(series, gin.H{"date": d.Format("2006-01-02"), "requests": n, "paid": amt})
			}
		}
		rows.Close()
	}
	out["series"] = series
	utils.Success(c, http.StatusOK, "", out)
}

// ---------- admin user management ----------

type AdminCreateUser struct {
	Role       string   `json:"role" binding:"required,oneof=consumer contractor admin"`
	FirstName  string   `json:"first_name" binding:"required"`
	LastName   string   `json:"last_name" binding:"required"`
	Email      string   `json:"email" binding:"required,email"`
	Phone      *string  `json:"phone"`
	Password   *string  `json:"password"`
	City       *string  `json:"city"`
	State      *string  `json:"state"`
	Categories []string `json:"categories"` // contractor: pre-qualified categories
	Approved   *bool    `json:"approved"`
}

// POST /admin/users — admin creates an account (pre-approved); returns the temporary password once
func (h *TrainingHandler) AdminCreateUser(c *gin.Context) {
	var req AdminCreateUser
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	pw := ""
	if req.Password != nil && len(*req.Password) >= 8 {
		pw = *req.Password
	} else {
		pw = "Mrb-" + randomToken(4) + "!"
	}
	hash, err := utils.HashPassword(pw)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Password hashing failed")
		return
	}
	status := "active"
	if req.Approved != nil && !*req.Approved {
		status = "pending"
	}
	var id string
	if err := h.DB.QueryRow(`INSERT INTO users (email, password_hash, phone, first_name, last_name, role, status, email_verified) VALUES (LOWER($1),$2,$3,$4,$5,$6,$7,TRUE) RETURNING id`,
		strings.TrimSpace(req.Email), hash, req.Phone, req.FirstName, req.LastName, req.Role, status).Scan(&id); err != nil {
		utils.Error(c, http.StatusConflict, "Could not create user (email already used?): "+err.Error())
		return
	}
	h.DB.Exec(`INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, id)
	switch req.Role {
	case "contractor":
		var profileID string
		h.DB.QueryRow(`INSERT INTO contractor_profiles (user_id, role, city, state, is_verified) VALUES ($1,'installation_team',$2,$3,TRUE) RETURNING id`, id, req.City, req.State).Scan(&profileID)
		for _, cat := range req.Categories {
			h.DB.Exec(`INSERT INTO contractor_skills (contractor_id, skill_name) VALUES ($1,$2) ON CONFLICT DO NOTHING`, profileID, cat)
			h.DB.Exec(`INSERT INTO contractor_qualifications (user_id, category, status, qualified_at, training_version) VALUES ($1,$2,'qualified',NOW(),$3) ON CONFLICT DO NOTHING`, id, cat, GetSettingString(h.DB, "training_version", "2026.09"))
			rematchWaitlist(h.DB, cat)
		}
	case "consumer":
		h.DB.Exec(`INSERT INTO consumer_profiles (user_id, city, state) VALUES ($1,$2,$3)`, id, req.City, req.State)
	}
	emailed := false
	if err := integrations.SendEmail(req.Email, "Your MrBuilder account", "<p>Hi "+req.FirstName+",</p><p>An account was created for you on MrBuilder.</p><p>Email: <b>"+req.Email+"</b><br>Temporary password: <b>"+pw+"</b></p><p>Please change it after your first login.</p>"); err == nil {
		emailed = true
	}
	utils.Success(c, http.StatusCreated, "User created", gin.H{"id": id, "temporary_password": pw, "emailed": emailed, "status": status})
}

type AdminUpdateUser struct {
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Email     *string `json:"email"`
	Phone     *string `json:"phone"`
	Password  *string `json:"password"`
}

// PATCH /admin/users/:id — edit details / reset password
func (h *TrainingHandler) AdminUpdateUser(c *gin.Context) {
	var req AdminUpdateUser
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var hash *string
	if req.Password != nil && *req.Password != "" {
		if len(*req.Password) < 8 {
			utils.Error(c, http.StatusBadRequest, "Password must be at least 8 characters")
			return
		}
		hh, _ := utils.HashPassword(*req.Password)
		hash = &hh
	}
	res, err := h.DB.Exec(`UPDATE users SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name), email=COALESCE(LOWER($3),email), phone=COALESCE($4,phone),
        password_hash=COALESCE($5,password_hash), updated_at=NOW() WHERE id=$6`, req.FirstName, req.LastName, req.Email, req.Phone, hash, c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusConflict, "Update failed: "+err.Error())
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "User not found")
		return
	}
	if hash != nil {
		h.DB.Exec(`UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`, c.Param("id"))
	}
	utils.Success(c, http.StatusOK, "User updated", nil)
}

// GET /admin/customers?q=&status= — consumers with activity summary
func (h *TrainingHandler) AdminListCustomers(c *gin.Context) {
	page, limit := utils.Pagination(c)
	where := []string{"u.role='consumer'"}
	args := []interface{}{}
	if v := c.Query("status"); v != "" {
		args = append(args, v)
		where = append(where, "u.status::text=$"+strconv.Itoa(len(args)))
	}
	if v := strings.TrimSpace(c.Query("q")); v != "" {
		args = append(args, "%"+v+"%")
		n := strconv.Itoa(len(args))
		where = append(where, "(u.email ILIKE $"+n+" OR u.first_name ILIKE $"+n+" OR u.last_name ILIKE $"+n+" OR u.phone ILIKE $"+n+")")
	}
	w := strings.Join(where, " AND ")
	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM users u WHERE `+w, args...).Scan(&total)
	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query(`SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.status::text, u.created_at, COALESCE(cp.city,''), COALESCE(cp.state,''),
            (SELECT COUNT(*) FROM jobs j WHERE j.consumer_id=u.id), (SELECT COUNT(*) FROM jobs j WHERE j.consumer_id=u.id AND j.status IN ('completed_paid','dispute_upheld')),
            COALESCE((SELECT SUM(consumer_charged) FROM jobs j WHERE j.consumer_id=u.id),0),
            (SELECT COUNT(*) FROM consumer_pergolas p WHERE p.consumer_id=u.id AND p.is_active),
            (SELECT COUNT(*) FROM mrcare_subscriptions s WHERE s.consumer_id=u.id AND s.status='active'),
            (SELECT COUNT(*) FROM household_members m WHERE m.owner_id=u.id AND m.status='active')
        FROM users u LEFT JOIN consumer_profiles cp ON cp.user_id=u.id WHERE `+w+` ORDER BY u.created_at DESC LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list customers: "+err.Error())
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, email, first, last, status, city, state string
		var phone *string
		var created time.Time
		var jobs, paid, pergolas, subs, members int
		var spent float64
		if rows.Scan(&id, &email, &first, &last, &phone, &status, &created, &city, &state, &jobs, &paid, &spent, &pergolas, &subs, &members) == nil {
			out = append(out, gin.H{"id": id, "email": email, "first_name": first, "last_name": last, "phone": phone, "status": status, "created_at": created, "city": city, "state": state,
				"jobs": jobs, "jobs_paid": paid, "spent": spent, "pergolas": pergolas, "subscriptions": subs, "household_members": members})
		}
	}
	utils.Paginated(c, http.StatusOK, out, total, page, limit)
}
