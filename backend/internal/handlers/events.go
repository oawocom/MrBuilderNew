package handlers

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/lib/pq"
	"github.com/mrbuilder/backend/internal/integrations"
	"github.com/mrbuilder/backend/internal/models"
	"github.com/mrbuilder/backend/internal/pricing"
)

// execer is satisfied by *sql.DB and *sql.Tx
type execer interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
	QueryRow(query string, args ...interface{}) *sql.Row
	Query(query string, args ...interface{}) (*sql.Rows, error)
}

func toJSON(v interface{}) string {
	if v == nil {
		return "{}"
	}
	b, err := json.Marshal(v)
	if err != nil {
		return "{}"
	}
	return string(b)
}

// logEvent records a job transition / action.
func logEvent(db execer, jobID, actorID, actorRole, eventType, from, to string, data interface{}) {
	var actor interface{} = actorID
	if actorID == "" {
		actor = nil
	}
	db.Exec(`INSERT INTO job_events (job_id, actor_id, actor_role, event_type, from_status, to_status, data)
        VALUES ($1,$2,$3,$4,NULLIF($5,''),NULLIF($6,''),$7::jsonb)`,
		jobID, actor, actorRole, eventType, from, to, toJSON(data))
}

// notify creates an in-app notification with a deep link payload {screen, params}.
// Push delivery is added later (device_tokens).
func notify(db execer, userID, ntype, title, body, jobID, screen string, params map[string]interface{}) {
	if userID == "" {
		return
	}
	if params == nil {
		params = map[string]interface{}{}
	}
	if jobID != "" {
		params["job_id"] = jobID
	}
	data := map[string]interface{}{"screen": screen, "params": params}
	var job interface{} = jobID
	if jobID == "" {
		job = nil
	}
	var id string
	db.QueryRow(`INSERT INTO notifications (user_id, notification_type, title, body, job_id, data)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id`, userID, ntype, title, body, job, toJSON(data)).Scan(&id)
	if pushDB != nil && id != "" {
		go deliverPush(id, userID, title, body, data)
	}
}

var pushDB *sql.DB

// InitPush enables push delivery for notifications (called from routes.Setup).
func InitPush(db *sql.DB) { pushDB = db }

func deliverPush(notificationID, userID, title, body string, data map[string]interface{}) {
	var enabled bool
	if pushDB.QueryRow(`SELECT COALESCE((SELECT push_notifications FROM user_settings WHERE user_id=$1), TRUE)`, userID).Scan(&enabled) != nil || !enabled {
		return
	}
	rows, err := pushDB.Query(`SELECT token FROM device_tokens WHERE user_id=$1`, userID)
	if err != nil {
		return
	}
	tokens := []string{}
	for rows.Next() {
		var t string
		if rows.Scan(&t) == nil {
			tokens = append(tokens, t)
		}
	}
	rows.Close()
	if len(tokens) == 0 {
		return
	}
	if err := integrations.SendPush(tokens, title, body, data); err == nil {
		pushDB.Exec(`UPDATE notifications SET delivered_push_at=NOW() WHERE id=$1`, notificationID)
	}
}

// generateQuote runs the pricing engine for a job, stores a new quote_versions row,
// supersedes older sent versions, and updates the job money fields + status quote_ready.
func generateQuote(db execer, sqlDB *sql.DB, jobID, generatedBy, byUser string, adjustments []pricing.LineItem, note *string, inspectionReportID *string) (*models.QuoteVersion, error) {
	var category string
	var spec []byte
	var w, l, h *float64
	var mounting, urgency *string
	var inspectionFee float64
	err := db.QueryRow(`SELECT COALESCE(service_category,''), pergola_spec, width_ft, length_ft, height_ft, mounting, urgency, inspection_fee
        FROM jobs WHERE id=$1`, jobID).Scan(&category, &spec, &w, &l, &h, &mounting, &urgency, &inspectionFee)
	if err != nil {
		return nil, err
	}

	// inspection report may override the spec used for pricing
	if inspectionReportID != nil {
		var override []byte
		var rw, rl, rh *float64
		var rmount *string
		db.QueryRow(`SELECT spec_override, width_ft, length_ft, height_ft, mounting_observed FROM inspection_reports WHERE id=$1`, *inspectionReportID).
			Scan(&override, &rw, &rl, &rh, &rmount)
		if len(override) > 2 { // not null / not "{}"
			spec = override
		}
		if rw != nil {
			w = rw
		}
		if rl != nil {
			l = rl
		}
		if rh != nil {
			h = rh
		}
		if rmount != nil {
			mounting = rmount
		}
	}

	if adjustments == nil {
		adjustments = []pricing.LineItem{}
	}
	s := pricing.SpecFromJSON(spec, w, l, h, mounting, urgency)
	res, err := pricing.Calculate(sqlDB, category, s, adjustments)
	if err != nil {
		return nil, err
	}

	credit := 0.0
	if inspectionFee > 0 && GetSettingBool(sqlDB, "inspection_fee_credited", true) {
		credit = inspectionFee
		if credit > res.Total {
			credit = res.Total
		}
	}

	validDays := GetSettingInt(sqlDB, "quote_valid_days", 14)
	validUntil := time.Now().AddDate(0, 0, validDays)

	var version int
	db.QueryRow(`SELECT COALESCE(MAX(version),0)+1 FROM quote_versions WHERE job_id=$1`, jobID).Scan(&version)
	db.Exec(`UPDATE quote_versions SET status='superseded' WHERE job_id=$1 AND status='sent'`, jobID)

	var byUserArg interface{} = byUser
	if byUser == "" {
		byUserArg = nil
	}
	var q models.QuoteVersion
	var li, adj []byte
	err = db.QueryRow(`INSERT INTO quote_versions (job_id, version, line_items, adjustments, subtotal, total, platform_fee, contractor_net,
            inspection_credit, generated_by, generated_by_user, inspection_report_id, note, valid_until)
        VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id, job_id, version, line_items, adjustments, subtotal, total, platform_fee, contractor_net, inspection_credit,
            generated_by, inspection_report_id, status, decline_reason, note, valid_until, responded_at, created_at`,
		jobID, version, toJSON(res.LineItems), toJSON(adjustments), res.Subtotal, res.Total, res.PlatformFee, res.ContractorNet,
		credit, generatedBy, byUserArg, inspectionReportID, note, validUntil).
		Scan(&q.ID, &q.JobID, &q.Version, &li, &adj, &q.Subtotal, &q.Total, &q.PlatformFee, &q.ContractorNet, &q.InspectionCredit,
			&q.GeneratedBy, &q.InspectionReportID, &q.Status, &q.DeclineReason, &q.Note, &q.ValidUntil, &q.RespondedAt, &q.CreatedAt)
	if err != nil {
		return nil, err
	}
	q.LineItems = json.RawMessage(li)
	q.Adjustments = json.RawMessage(adj)

	_, err = db.Exec(`UPDATE jobs SET status='quote_ready', quote_total=$1, platform_fee=$2, contractor_net=$3,
        inspection_fee_credit=$4, current_quote_id=$5, updated_at=NOW() WHERE id=$6`,
		res.Total, res.PlatformFee, res.ContractorNet, credit, q.ID, jobID)
	return &q, err
}

const quoteVersionColumns = `id, job_id, version, line_items, adjustments, subtotal, total, platform_fee, contractor_net, inspection_credit,
    generated_by, inspection_report_id, status, decline_reason, note, valid_until, responded_at, created_at`

func scanQuoteVersion(row interface{ Scan(...interface{}) error }) (*models.QuoteVersion, error) {
	var q models.QuoteVersion
	var li, adj []byte
	if err := row.Scan(&q.ID, &q.JobID, &q.Version, &li, &adj, &q.Subtotal, &q.Total, &q.PlatformFee, &q.ContractorNet, &q.InspectionCredit,
		&q.GeneratedBy, &q.InspectionReportID, &q.Status, &q.DeclineReason, &q.Note, &q.ValidUntil, &q.RespondedAt, &q.CreatedAt); err != nil {
		return nil, err
	}
	q.LineItems = json.RawMessage(li)
	q.Adjustments = json.RawMessage(adj)
	return &q, nil
}

func loadQuoteVersions(db execer, jobID string) []*models.QuoteVersion {
	out := []*models.QuoteVersion{}
	rows, err := db.Query(`SELECT `+quoteVersionColumns+` FROM quote_versions WHERE job_id=$1 ORDER BY version DESC`, jobID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		if q, err := scanQuoteVersion(rows); err == nil {
			out = append(out, q)
		}
	}
	return out
}

func loadInspectionReport(db execer, jobID string) *models.InspectionReport {
	var r models.InspectionReport
	var footings, photos []byte
	var scope []string
	err := db.QueryRow(`SELECT id, job_id, contractor_id, width_ft, length_ft, height_ft, structure_type_observed, mounting_observed,
        footings, scope, findings, photos, pdf_url, created_at FROM inspection_reports WHERE job_id=$1 ORDER BY created_at DESC LIMIT 1`, jobID).
		Scan(&r.ID, &r.JobID, &r.ContractorID, &r.WidthFt, &r.LengthFt, &r.HeightFt, &r.StructureTypeObserved, &r.MountingObserved,
			&footings, pq.Array(&scope), &r.Findings, &photos, &r.PdfURL, &r.CreatedAt)
	if err != nil {
		return nil
	}
	r.Footings = json.RawMessage(footings)
	r.Photos = json.RawMessage(photos)
	r.Scope = scope
	return &r
}

func loadParty(db execer, userID *string) *models.PartyInfo {
	if userID == nil || *userID == "" {
		return nil
	}
	var p models.PartyInfo
	if err := db.QueryRow(`SELECT id, first_name, last_name, phone, avatar_url FROM users WHERE id=$1`, *userID).
		Scan(&p.ID, &p.FirstName, &p.LastName, &p.Phone, &p.AvatarURL); err != nil {
		return nil
	}
	return &p
}

// qualifiedContractorUserIDs returns active contractors whose skills include the category.
func qualifiedContractorUserIDs(db execer, category string) []string {
	out := []string{}
	rows, err := db.Query(`SELECT u.id FROM users u JOIN contractor_qualifications q ON q.user_id=u.id
        WHERE u.role='contractor' AND u.status='active' AND q.status='qualified' AND q.category=$1`, category)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			out = append(out, id)
		}
	}
	return out
}
