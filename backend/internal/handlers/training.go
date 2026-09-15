package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/mrbuilder/backend/internal/utils"
)

type TrainingHandler struct {
	DB *sql.DB
}

func NewTrainingHandler(db *sql.DB) *TrainingHandler {
	return &TrainingHandler{DB: db}
}

// ---------- qualification logic (shared with job handlers) ----------

// moduleDone: every active lesson in modules of this kind (and category, if given) has completed_at
func moduleDone(db execer, userID, kind, category string) (done, total int) {
	var cat interface{} = category
	if category == "" {
		cat = nil
	}
	db.QueryRow(`SELECT COUNT(*) FILTER (WHERE p.completed_at IS NOT NULL), COUNT(*)
        FROM training_lessons l JOIN training_modules m ON m.id=l.module_id
        LEFT JOIN training_progress p ON p.lesson_id=l.id AND p.user_id=$1
        WHERE m.kind=$2 AND ($3::text IS NULL OR m.category=$3) AND m.is_active AND l.is_active AND l.manufacturer IS NULL`, userID, kind, cat).Scan(&done, &total)
	return
}

// LockState describes why a contractor is (or is not) allowed to work.
type LockState struct {
	Locked           bool     `json:"locked"`
	Approved         bool     `json:"approved"`
	CoreDone         bool     `json:"core_done"`
	SafetyDone       bool     `json:"safety_done"`
	Qualified        []string `json:"qualified"`
	PracticalPending []string `json:"practical_pending"`
	InTraining       []string `json:"in_training"`
	Reasons          []string `json:"reasons"`
}

func lockState(db execer, userID string) LockState {
	var st LockState
	var status string
	db.QueryRow(`SELECT status FROM users WHERE id=$1`, userID).Scan(&status)
	st.Approved = status == "active"
	cd, ct := moduleDone(db, userID, "core", "")
	sd, stt := moduleDone(db, userID, "safety", "")
	st.CoreDone = ct > 0 && cd == ct
	st.SafetyDone = stt > 0 && sd == stt
	st.Qualified, st.PracticalPending, st.InTraining = []string{}, []string{}, []string{}
	rows, err := db.Query(`SELECT category, status FROM contractor_qualifications WHERE user_id=$1 ORDER BY category`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var c, s string
			if rows.Scan(&c, &s) == nil {
				switch s {
				case "qualified":
					st.Qualified = append(st.Qualified, c)
				case "practical_pending":
					st.PracticalPending = append(st.PracticalPending, c)
				case "training":
					st.InTraining = append(st.InTraining, c)
				}
			}
		}
	}
	st.Reasons = []string{}
	if !st.Approved {
		st.Reasons = append(st.Reasons, "account_not_approved")
	}
	if !st.CoreDone {
		st.Reasons = append(st.Reasons, "core_incomplete")
	}
	if !st.SafetyDone {
		st.Reasons = append(st.Reasons, "safety_incomplete")
	}
	if len(st.Qualified) == 0 {
		st.Reasons = append(st.Reasons, "no_qualified_category")
	}
	st.Locked = len(st.Reasons) > 0
	return st
}

// isQualified: unlocked account AND qualified for the category
func isQualified(db execer, userID, category string) bool {
	st := lockState(db, userID)
	if st.Locked {
		return false
	}
	for _, c := range st.Qualified {
		if c == category {
			return true
		}
	}
	return false
}

// recomputeQualifications advances training → practical_pending / qualified after progress changes.
// Returns categories that just became qualified.
func recomputeQualifications(db *sql.DB, userID string) []string {
	newly := []string{}
	cd, ct := moduleDone(db, userID, "core", "")
	sd, st := moduleDone(db, userID, "safety", "")
	if !(ct > 0 && cd == ct && st > 0 && sd == st) {
		return newly
	}
	version := GetSettingString(db, "training_version", "2026.09")
	rows, err := db.Query(`SELECT q.category, q.status, c.requires_practical, q.practical_result
        FROM contractor_qualifications q JOIN service_categories c ON c.slug=q.category WHERE q.user_id=$1 AND q.status IN ('training','practical_pending')`, userID)
	if err != nil {
		return newly
	}
	type row struct {
		cat, status string
		practical   bool
		result      *string
	}
	var rs []row
	for rows.Next() {
		var r row
		if rows.Scan(&r.cat, &r.status, &r.practical, &r.result) == nil {
			rs = append(rs, r)
		}
	}
	rows.Close()
	for _, r := range rs {
		d, t := moduleDone(db, userID, "category", r.cat)
		if t > 0 && d < t {
			continue
		}
		if r.practical && !(r.result != nil && *r.result == "pass") {
			if r.status != "practical_pending" {
				db.Exec(`UPDATE contractor_qualifications SET status='practical_pending', training_version=$1, updated_at=NOW() WHERE user_id=$2 AND category=$3`, version, userID, r.cat)
				notify(db, userID, "training", "Practical assessment next", "Training for "+r.cat+" is complete — a supervised first job will activate this category", "", "training", gin.H{"category": r.cat})
			}
			continue
		}
		db.Exec(`UPDATE contractor_qualifications SET status='qualified', qualified_at=NOW(), training_version=$1, updated_at=NOW() WHERE user_id=$2 AND category=$3`, version, userID, r.cat)
		newly = append(newly, r.cat)
	}
	if len(newly) > 0 {
		st := lockState(db, userID)
		if !st.Locked {
			notify(db, userID, "account_activated", "You're activated", "You can now accept jobs in: "+strings.Join(st.Qualified, ", "), "", "activated", nil)
		}
		for _, cat := range newly {
			rematchWaitlist(db, cat)
		}
	}
	return newly
}

// rematchWaitlist moves no_match_waitlist jobs in a category back to matching and notifies both sides.
func rematchWaitlist(db *sql.DB, category string) {
	rows, err := db.Query(`SELECT id, consumer_id, title, location_city FROM jobs WHERE status='no_match_waitlist' AND service_category=$1`, category)
	if err != nil {
		return
	}
	type j struct {
		id, consumer, title string
		city                *string
	}
	var js []j
	for rows.Next() {
		var x j
		if rows.Scan(&x.id, &x.consumer, &x.title, &x.city) == nil {
			js = append(js, x)
		}
	}
	rows.Close()
	if len(js) == 0 {
		return
	}
	contractors := qualifiedContractorUserIDs(db, category)
	for _, x := range js {
		db.Exec(`UPDATE jobs SET status='matching', updated_at=NOW() WHERE id=$1 AND status='no_match_waitlist'`, x.id)
		logEvent(db, x.id, "", "system", "rematched", "no_match_waitlist", "matching", gin.H{"category": category})
		notify(db, x.consumer, "matching", "A contractor is now available", "We are matching your request", x.id, "requestDetail", gin.H{"stage": "matching"})
		for _, cid := range contractors {
			notify(db, cid, "new_job", "New job near you", x.title+" · "+strOr(x.city, ""), x.id, "job", gin.H{"stage": "marketplace"})
		}
	}
}

// ---------- hub / lessons ----------

// GET /training — hub with lock state and per-module progress
func (h *TrainingHandler) Hub(c *gin.Context) {
	userID := c.GetString("user_id")
	st := lockState(h.DB, userID)

	rows, err := h.DB.Query(`SELECT m.id, m.kind, m.category, m.slug, m.title, m.description, m.sort_order,
            COUNT(l.id) FILTER (WHERE l.manufacturer IS NULL), COUNT(p.completed_at) FILTER (WHERE l.manufacturer IS NULL)
        FROM training_modules m
        LEFT JOIN training_lessons l ON l.module_id=m.id AND l.is_active
        LEFT JOIN training_progress p ON p.lesson_id=l.id AND p.user_id=$1
        WHERE m.is_active GROUP BY m.id ORDER BY m.sort_order`, userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load training: "+err.Error())
		return
	}
	defer rows.Close()
	chosen := map[string]bool{}
	for _, c := range append(append(st.Qualified, st.PracticalPending...), st.InTraining...) {
		chosen[c] = true
	}
	modules := []gin.H{}
	for rows.Next() {
		var id, kind, slug, title string
		var cat, desc *string
		var order, total, done int
		if rows.Scan(&id, &kind, &cat, &slug, &title, &desc, &order, &total, &done) == nil {
			relevant := kind != "category" || (cat != nil && chosen[*cat])
			modules = append(modules, gin.H{"id": id, "kind": kind, "category": cat, "slug": slug, "title": title, "description": desc,
				"lessons_total": total, "lessons_done": done, "complete": total > 0 && done == total, "relevant": relevant})
		}
	}
	utils.Success(c, http.StatusOK, "", gin.H{"lock": st, "training_version": GetSettingString(h.DB, "training_version", "2026.09"), "modules": modules})
}

// GET /training/modules/:slug — lessons with progress
func (h *TrainingHandler) Module(c *gin.Context) {
	userID := c.GetString("user_id")
	rows, err := h.DB.Query(`SELECT l.id, l.slug, l.title, l.summary, l.duration_minutes, l.is_placeholder, l.manufacturer, l.model, l.sort_order,
            (SELECT COUNT(*) FROM quiz_questions q WHERE q.lesson_id=l.id AND q.is_active) AS questions,
            p.watched_at, p.completed_at, p.best_score, p.attempts
        FROM training_lessons l JOIN training_modules m ON m.id=l.module_id
        LEFT JOIN training_progress p ON p.lesson_id=l.id AND p.user_id=$1
        WHERE m.slug=$2 AND l.is_active ORDER BY l.sort_order`, userID, c.Param("slug"))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load module")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, slug, title string
		var summary, mfr, model *string
		var dur, order, questions int
		var placeholder bool
		var watched, completed sql.NullTime
		var best, attempts *int
		if rows.Scan(&id, &slug, &title, &summary, &dur, &placeholder, &mfr, &model, &order, &questions, &watched, &completed, &best, &attempts) == nil {
			out = append(out, gin.H{"id": id, "slug": slug, "title": title, "summary": summary, "duration_minutes": dur, "is_placeholder": placeholder,
				"manufacturer": mfr, "model": model, "has_quiz": questions > 0, "watched_at": nullTime(watched), "completed_at": nullTime(completed),
				"best_score": best, "attempts": attempts})
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

// GET /training/lessons/:id — full lesson (video, transcript, examples, checklist) + quiz without answers
func (h *TrainingHandler) Lesson(c *gin.Context) {
	userID := c.GetString("user_id")
	var id, slug, title, mslug string
	var summary, video, transcript, mfr, model *string
	var examples, checklist []byte
	var dur int
	var placeholder bool
	err := h.DB.QueryRow(`SELECT l.id, l.slug, l.title, l.summary, l.video_url, l.transcript, l.examples, l.checklist, l.duration_minutes, l.is_placeholder, l.manufacturer, l.model, m.slug
        FROM training_lessons l JOIN training_modules m ON m.id=l.module_id WHERE (l.id::text=$1 OR l.slug=$1) AND l.is_active`, c.Param("id")).
		Scan(&id, &slug, &title, &summary, &video, &transcript, &examples, &checklist, &dur, &placeholder, &mfr, &model, &mslug)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Lesson not found")
		return
	}
	var watched, completed sql.NullTime
	var best, attempts *int
	h.DB.QueryRow(`SELECT watched_at, completed_at, best_score, attempts FROM training_progress WHERE user_id=$1 AND lesson_id=$2`, userID, id).Scan(&watched, &completed, &best, &attempts)
	utils.Success(c, http.StatusOK, "", gin.H{"id": id, "slug": slug, "module": mslug, "title": title, "summary": summary, "video_url": video, "transcript": transcript,
		"examples": json.RawMessage(examples), "checklist": json.RawMessage(checklist), "duration_minutes": dur, "is_placeholder": placeholder,
		"manufacturer": mfr, "model": model, "quiz": h.quiz(id), "progress": gin.H{"watched_at": nullTime(watched), "completed_at": nullTime(completed), "best_score": best, "attempts": attempts}})
}

func (h *TrainingHandler) quiz(lessonID string) []gin.H {
	out := []gin.H{}
	rows, err := h.DB.Query(`SELECT id, question, options, is_critical FROM quiz_questions WHERE lesson_id=$1 AND is_active ORDER BY sort_order`, lessonID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var id, q string
		var opts []byte
		var crit bool
		if rows.Scan(&id, &q, &opts, &crit) == nil {
			out = append(out, gin.H{"id": id, "question": q, "options": json.RawMessage(opts), "is_critical": crit})
		}
	}
	return out
}

func (h *TrainingHandler) lessonID(c *gin.Context) (string, bool) {
	var id string
	if h.DB.QueryRow(`SELECT id FROM training_lessons WHERE (id::text=$1 OR slug=$1) AND is_active`, c.Param("id")).Scan(&id) != nil {
		utils.Error(c, http.StatusNotFound, "Lesson not found")
		return "", false
	}
	return id, true
}

// POST /training/lessons/:id/watched — records the video was watched (never counts as completion)
func (h *TrainingHandler) Watched(c *gin.Context) {
	userID := c.GetString("user_id")
	id, ok := h.lessonID(c)
	if !ok {
		return
	}
	h.DB.Exec(`INSERT INTO training_progress (user_id, lesson_id, watched_at) VALUES ($1,$2,NOW())
        ON CONFLICT (user_id, lesson_id) DO UPDATE SET watched_at=COALESCE(training_progress.watched_at, NOW()), updated_at=NOW()`, userID, id)
	utils.Success(c, http.StatusOK, "Watched", nil)
}

// POST /training/lessons/:id/complete — for lessons WITHOUT a quiz: acknowledge checklist → completed
func (h *TrainingHandler) Complete(c *gin.Context) {
	userID := c.GetString("user_id")
	id, ok := h.lessonID(c)
	if !ok {
		return
	}
	var questions int
	h.DB.QueryRow(`SELECT COUNT(*) FROM quiz_questions WHERE lesson_id=$1 AND is_active`, id).Scan(&questions)
	if questions > 0 {
		utils.Error(c, http.StatusConflict, "This lesson has a quiz — pass the quiz to complete it")
		return
	}
	version := GetSettingString(h.DB, "training_version", "2026.09")
	h.DB.Exec(`INSERT INTO training_progress (user_id, lesson_id, watched_at, completed_at, training_version) VALUES ($1,$2,NOW(),NOW(),$3)
        ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed_at=COALESCE(training_progress.completed_at, NOW()), training_version=$3, updated_at=NOW()`, userID, id, version)
	newly := recomputeQualifications(h.DB, userID)
	utils.Success(c, http.StatusOK, "Lesson completed", gin.H{"newly_qualified": newly, "lock": lockState(h.DB, userID)})
}

type QuizSubmission struct {
	Answers map[string]string `json:"answers" binding:"required"` // question_id → option_id
}

// POST /training/lessons/:id/quiz — scored server-side; pass = score ≥ quiz_pass_pct AND all critical correct
func (h *TrainingHandler) SubmitQuiz(c *gin.Context) {
	userID := c.GetString("user_id")
	var req QuizSubmission
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	id, ok := h.lessonID(c)
	if !ok {
		return
	}
	rows, err := h.DB.Query(`SELECT id, correct_option, is_critical, explanation FROM quiz_questions WHERE lesson_id=$1 AND is_active`, id)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load quiz")
		return
	}
	total, correct := 0, 0
	criticalMissed := false
	review := []gin.H{}
	for rows.Next() {
		var qid, ans string
		var crit bool
		var expl *string
		if rows.Scan(&qid, &ans, &crit, &expl) != nil {
			continue
		}
		total++
		got := req.Answers[qid]
		okA := got == ans
		if okA {
			correct++
		} else if crit {
			criticalMissed = true
		}
		review = append(review, gin.H{"question_id": qid, "your_answer": got, "correct": okA, "is_critical": crit, "explanation": expl})
	}
	rows.Close()
	if total == 0 {
		utils.Error(c, http.StatusConflict, "This lesson has no quiz")
		return
	}
	score := correct * 100 / total
	passPct := GetSettingInt(h.DB, "quiz_pass_pct", 80)
	passed := score >= passPct && !criticalMissed

	h.DB.Exec(`INSERT INTO quiz_attempts (user_id, lesson_id, score_pct, passed, critical_missed, answers) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
		userID, id, score, passed, criticalMissed, toJSON(req.Answers))
	version := GetSettingString(h.DB, "training_version", "2026.09")
	h.DB.Exec(`INSERT INTO training_progress (user_id, lesson_id, attempts, best_score, passed_at, completed_at, training_version)
        VALUES ($1,$2,1,$3,CASE WHEN $4 THEN NOW() END,CASE WHEN $4 THEN NOW() END,$5)
        ON CONFLICT (user_id, lesson_id) DO UPDATE SET attempts=training_progress.attempts+1, best_score=GREATEST(training_progress.best_score,$3),
            passed_at=COALESCE(training_progress.passed_at, CASE WHEN $4 THEN NOW() END),
            completed_at=COALESCE(training_progress.completed_at, CASE WHEN $4 THEN NOW() END), training_version=$5, updated_at=NOW()`,
		userID, id, score, passed, version)

	newly := []string{}
	if passed {
		newly = recomputeQualifications(h.DB, userID)
	}
	result := "fail"
	if passed {
		result = "pass"
	} else if criticalMissed {
		result = "critical_miss"
	}
	utils.Success(c, http.StatusOK, "Quiz "+result, gin.H{"result": result, "score_pct": score, "pass_pct": passPct, "critical_missed": criticalMissed,
		"review": review, "newly_qualified": newly, "lock": lockState(h.DB, userID)})
}

// GET /training/library?q=&category=&manufacturer=
func (h *TrainingHandler) Library(c *gin.Context) {
	where := []string{"l.is_active", "m.is_active"}
	args := []interface{}{}
	if q := strings.TrimSpace(c.Query("q")); q != "" {
		args = append(args, "%"+q+"%")
		where = append(where, "(l.title ILIKE $1 OR l.summary ILIKE $1 OR l.manufacturer ILIKE $1 OR l.model ILIKE $1)")
	}
	if v := c.Query("category"); v != "" {
		args = append(args, v)
		where = append(where, "m.category=$"+itoa(len(args)))
	}
	if v := c.Query("manufacturer"); v != "" {
		args = append(args, v)
		where = append(where, "l.manufacturer=$"+itoa(len(args)))
	}
	rows, err := h.DB.Query(`SELECT l.id, l.slug, l.title, l.summary, l.duration_minutes, l.is_placeholder, l.manufacturer, l.model, m.slug, m.kind, m.category
        FROM training_lessons l JOIN training_modules m ON m.id=l.module_id WHERE `+strings.Join(where, " AND ")+` ORDER BY m.sort_order, l.sort_order`, args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to search library")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id, slug, title, mslug, kind string
		var summary, mfr, model, cat *string
		var dur int
		var placeholder bool
		if rows.Scan(&id, &slug, &title, &summary, &dur, &placeholder, &mfr, &model, &mslug, &kind, &cat) == nil {
			out = append(out, gin.H{"id": id, "slug": slug, "title": title, "summary": summary, "duration_minutes": dur, "is_placeholder": placeholder,
				"manufacturer": mfr, "model": model, "module": mslug, "kind": kind, "category": cat})
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

// ---------- my services ----------

type ServicesRequest struct {
	Categories []string `json:"categories" binding:"required,min=1"`
}

// GET /training/services
func (h *TrainingHandler) MyServices(c *gin.Context) {
	userID := c.GetString("user_id")
	rows, err := h.DB.Query(`SELECT q.category, c.name, q.status, q.qualified_at, q.training_version, c.requires_practical
        FROM contractor_qualifications q JOIN service_categories c ON c.slug=q.category WHERE q.user_id=$1 ORDER BY c.sort_order`, userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load services")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var cat, name, status string
		var qa sql.NullTime
		var ver *string
		var practical bool
		if rows.Scan(&cat, &name, &status, &qa, &ver, &practical) == nil {
			d, t := moduleDone(h.DB, userID, "category", cat)
			out = append(out, gin.H{"category": cat, "name": name, "status": status, "qualified_at": nullTime(qa), "training_version": ver,
				"requires_practical": practical, "lessons_done": d, "lessons_total": t})
		}
	}
	utils.Success(c, http.StatusOK, "", gin.H{"services": out, "lock": lockState(h.DB, userID)})
}

// PUT /training/services — choose categories (adds go to training; removing revokes; no re-approval of the account)
func (h *TrainingHandler) UpdateServices(c *gin.Context) {
	userID := c.GetString("user_id")
	var req ServicesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var valid int
	h.DB.QueryRow(`SELECT COUNT(*) FROM service_categories WHERE slug = ANY($1) AND is_active`, pq.Array(req.Categories)).Scan(&valid)
	if valid != len(req.Categories) {
		utils.Error(c, http.StatusBadRequest, "Unknown category in list")
		return
	}
	var profileID string
	if h.DB.QueryRow(`SELECT id FROM contractor_profiles WHERE user_id=$1`, userID).Scan(&profileID) != nil {
		utils.Error(c, http.StatusConflict, "Contractor profile missing")
		return
	}
	tx, _ := h.DB.Begin()
	defer tx.Rollback()
	tx.Exec(`DELETE FROM contractor_skills WHERE contractor_id=$1 AND NOT (skill_name = ANY($2))`, profileID, pq.Array(req.Categories))
	tx.Exec(`DELETE FROM contractor_qualifications WHERE user_id=$1 AND NOT (category = ANY($2))`, userID, pq.Array(req.Categories))
	for _, cat := range req.Categories {
		tx.Exec(`INSERT INTO contractor_skills (contractor_id, skill_name) VALUES ($1,$2) ON CONFLICT DO NOTHING`, profileID, cat)
		tx.Exec(`INSERT INTO contractor_qualifications (user_id, category) VALUES ($1,$2) ON CONFLICT DO NOTHING`, userID, cat)
	}
	tx.Commit()
	recomputeQualifications(h.DB, userID)
	h.MyServices(c)
}

// ---------- admin ----------

type PracticalRequest struct {
	Category string  `json:"category" binding:"required"`
	JobID    *string `json:"job_id"`
	Result   string  `json:"result" binding:"required,oneof=pass fail"`
	Notes    *string `json:"notes"`
}

// POST /admin/contractors/:id/practical — record the supervised first job
func (h *TrainingHandler) AdminPractical(c *gin.Context) {
	userID := c.Param("id")
	var req PracticalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	res, _ := h.DB.Exec(`UPDATE contractor_qualifications SET practical_job_id=$1, practical_result=$2, practical_at=NOW(), updated_at=NOW() WHERE user_id=$3 AND category=$4`,
		req.JobID, req.Result, userID, req.Category)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Contractor has not chosen that category")
		return
	}
	if req.JobID != nil {
		h.DB.Exec(`UPDATE jobs SET is_assessment=TRUE WHERE id=$1`, *req.JobID)
	}
	newly := recomputeQualifications(h.DB, userID)
	if req.Result == "fail" {
		notify(h.DB, userID, "training", "Practical assessment not passed", strOr(req.Notes, "Please review the training and try again"), "", "training", gin.H{"category": req.Category})
	}
	utils.Success(c, http.StatusOK, "Practical recorded", gin.H{"newly_qualified": newly, "lock": lockState(h.DB, userID)})
}

type QualificationOverride struct {
	Status string `json:"status" binding:"required,oneof=training practical_pending qualified revoked"`
}

// PUT /admin/contractors/:id/qualifications/:category — manual override
func (h *TrainingHandler) AdminSetQualification(c *gin.Context) {
	userID, cat := c.Param("id"), c.Param("category")
	var req QualificationOverride
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	version := GetSettingString(h.DB, "training_version", "2026.09")
	if _, err := h.DB.Exec(`INSERT INTO contractor_qualifications (user_id, category, status, qualified_at, training_version)
        VALUES ($1,$2,$3::text,CASE WHEN $3::text='qualified' THEN NOW() END,$4)
        ON CONFLICT (user_id, category) DO UPDATE SET status=$3::text, qualified_at=CASE WHEN $3::text='qualified' THEN NOW() ELSE contractor_qualifications.qualified_at END, training_version=$4, updated_at=NOW()`,
		userID, cat, req.Status, version); err != nil {
		utils.Error(c, http.StatusBadRequest, "Failed to set qualification: "+err.Error())
		return
	}
	if req.Status == "qualified" {
		var profileID string
		if h.DB.QueryRow(`SELECT id FROM contractor_profiles WHERE user_id=$1`, userID).Scan(&profileID) == nil {
			h.DB.Exec(`INSERT INTO contractor_skills (contractor_id, skill_name) VALUES ($1,$2) ON CONFLICT DO NOTHING`, profileID, cat)
		}
		rematchWaitlist(h.DB, cat)
	}
	utils.Success(c, http.StatusOK, "Qualification set", gin.H{"lock": lockState(h.DB, userID)})
}

// GET /admin/contractors/:id/training — lock state + progress summary
func (h *TrainingHandler) AdminContractorTraining(c *gin.Context) {
	userID := c.Param("id")
	st := lockState(h.DB, userID)
	rows, _ := h.DB.Query(`SELECT l.slug, p.completed_at, p.best_score, p.attempts FROM training_progress p JOIN training_lessons l ON l.id=p.lesson_id WHERE p.user_id=$1 ORDER BY l.sort_order`, userID)
	progress := []gin.H{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var slug string
			var done sql.NullTime
			var best, att *int
			if rows.Scan(&slug, &done, &best, &att) == nil {
				progress = append(progress, gin.H{"lesson": slug, "completed_at": nullTime(done), "best_score": best, "attempts": att})
			}
		}
	}
	utils.Success(c, http.StatusOK, "", gin.H{"lock": st, "progress": progress})
}

// ---------- admin content CRUD (modules / lessons / questions) ----------

type LessonUpsert struct {
	ModuleSlug      string           `json:"module" binding:"required"`
	Slug            string           `json:"slug" binding:"required"`
	Title           string           `json:"title" binding:"required"`
	Summary         *string          `json:"summary"`
	VideoURL        *string          `json:"video_url"`
	Transcript      *string          `json:"transcript"`
	Examples        *json.RawMessage `json:"examples"`
	Checklist       *json.RawMessage `json:"checklist"`
	DurationMinutes *int             `json:"duration_minutes"`
	Manufacturer    *string          `json:"manufacturer"`
	Model           *string          `json:"model"`
	IsPlaceholder   *bool            `json:"is_placeholder"`
	SortOrder       *int             `json:"sort_order"`
	IsActive        *bool            `json:"is_active"`
}

// PUT /admin/training/lessons/:slug
func (h *TrainingHandler) AdminUpsertLesson(c *gin.Context) {
	var req LessonUpsert
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var moduleID string
	if h.DB.QueryRow(`SELECT id FROM training_modules WHERE slug=$1`, req.ModuleSlug).Scan(&moduleID) != nil {
		utils.Error(c, http.StatusBadRequest, "Unknown module")
		return
	}
	examples, checklist := "[]", "[]"
	if req.Examples != nil {
		examples = string(*req.Examples)
	}
	if req.Checklist != nil {
		checklist = string(*req.Checklist)
	}
	_, err := h.DB.Exec(`INSERT INTO training_lessons (module_id, slug, title, summary, video_url, transcript, examples, checklist, duration_minutes, manufacturer, model, is_placeholder, sort_order, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,COALESCE($9,5),$10,$11,COALESCE($12,FALSE),COALESCE($13,0),COALESCE($14,TRUE))
        ON CONFLICT (slug) DO UPDATE SET module_id=$1, title=$3, summary=COALESCE($4,training_lessons.summary), video_url=COALESCE($5,training_lessons.video_url),
            transcript=COALESCE($6,training_lessons.transcript), examples=CASE WHEN $15 THEN $7::jsonb ELSE training_lessons.examples END,
            checklist=CASE WHEN $16 THEN $8::jsonb ELSE training_lessons.checklist END, duration_minutes=COALESCE($9,training_lessons.duration_minutes),
            manufacturer=COALESCE($10,training_lessons.manufacturer), model=COALESCE($11,training_lessons.model), is_placeholder=COALESCE($12,training_lessons.is_placeholder),
            sort_order=COALESCE($13,training_lessons.sort_order), is_active=COALESCE($14,training_lessons.is_active), updated_at=NOW()`,
		moduleID, c.Param("slug"), req.Title, req.Summary, req.VideoURL, req.Transcript, examples, checklist, req.DurationMinutes, req.Manufacturer, req.Model,
		req.IsPlaceholder, req.SortOrder, req.IsActive, req.Examples != nil, req.Checklist != nil)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Failed to save lesson: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "Lesson saved", nil)
}

type QuestionsReplace struct {
	Questions []struct {
		Question      string          `json:"question" binding:"required"`
		Options       json.RawMessage `json:"options" binding:"required"`
		CorrectOption string          `json:"correct_option" binding:"required"`
		IsCritical    bool            `json:"is_critical"`
		Explanation   *string         `json:"explanation"`
	} `json:"questions" binding:"required"`
}

// PUT /admin/training/lessons/:slug/quiz — replace the whole quiz
func (h *TrainingHandler) AdminReplaceQuiz(c *gin.Context) {
	var req QuestionsReplace
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var lessonID string
	if h.DB.QueryRow(`SELECT id FROM training_lessons WHERE slug=$1`, c.Param("slug")).Scan(&lessonID) != nil {
		utils.Error(c, http.StatusNotFound, "Lesson not found")
		return
	}
	tx, _ := h.DB.Begin()
	defer tx.Rollback()
	tx.Exec(`DELETE FROM quiz_questions WHERE lesson_id=$1`, lessonID)
	for i, q := range req.Questions {
		tx.Exec(`INSERT INTO quiz_questions (lesson_id, question, options, correct_option, is_critical, explanation, sort_order) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7)`,
			lessonID, q.Question, string(q.Options), q.CorrectOption, q.IsCritical, q.Explanation, i+1)
	}
	if len(req.Questions) > 0 {
		tx.Exec(`UPDATE training_lessons SET is_placeholder=FALSE, updated_at=NOW() WHERE id=$1`, lessonID)
	}
	tx.Commit()
	utils.Success(c, http.StatusOK, "Quiz saved", gin.H{"questions": len(req.Questions)})
}

type AdminAssignRequest struct {
	ContractorID string `json:"contractor_id" binding:"required"`
	IsAssessment bool   `json:"is_assessment"`
}

// POST /admin/jobs/:id/assign — admin assigns a job directly (used for the supervised assessment job)
func (h *TrainingHandler) AdminAssignJob(c *gin.Context) {
	var req AdminAssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var status, consumerID, title string
	if h.DB.QueryRow(`SELECT status, consumer_id, title FROM jobs WHERE id=$1`, c.Param("id")).Scan(&status, &consumerID, &title) != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if !inList(status, "matching", "no_match_waitlist", "reassigning") {
		utils.Error(c, http.StatusConflict, "Job is not open for assignment (status "+status+")")
		return
	}
	h.DB.Exec(`UPDATE jobs SET contractor_id=$1, status='assigned', is_assessment=$2, accepted_at=NOW(), updated_at=NOW() WHERE id=$3`, req.ContractorID, req.IsAssessment, c.Param("id"))
	logEvent(h.DB, c.Param("id"), c.GetString("user_id"), "admin", "admin_assigned", status, "assigned", gin.H{"contractor_id": req.ContractorID, "is_assessment": req.IsAssessment})
	notify(h.DB, req.ContractorID, "job_assigned", "Assessment job assigned", title, c.Param("id"), "job", gin.H{"stage": "assigned"})
	notify(h.DB, consumerID, "job_assigned", "Contractor assigned", partyName(h.DB, &req.ContractorID)+" will carry out your job", c.Param("id"), "requestDetail", gin.H{"stage": "assigned"})
	utils.Success(c, http.StatusOK, "Assigned", nil)
}
