package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"html/template"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/integrations"
	"github.com/mrbuilder/backend/internal/utils"
)

// ---------- template registry ----------

type EmailTemplate struct {
	Subject  string `json:"subject"`
	Title    string `json:"title"`
	Body     string `json:"body"`
	CTA      string `json:"cta"`
	Audience string `json:"audience"` // consumer | contractor | both | lead
	Group    string `json:"group"`
	Enabled  bool   `json:"enabled"`
}

// Event keys are stable; notification types map onto them (see ntypeEvent).
var defaultEmailTemplates = map[string]EmailTemplate{
	"welcome_consumer":      {"Welcome to MrBuilder, {{name}}", "Welcome to MrBuilder", "Your account is ready. Create your first installation or repair request whenever you're ready — you'll see an itemized quote before anything is booked, and you only pay after you confirm the finished work.", "Open MrBuilder", "consumer", "Account", true},
	"welcome_contractor":    {"Your MrBuilder PRO application was received", "Application received", "Thanks for applying, {{name}}. Our team reviews applications within 3–5 business days. Meanwhile, the Core and Safety training modules are open in the MrBuilder PRO app — completing them speeds up activation.", "Start training", "contractor", "Account", true},
	"account_activated":     {"You're activated on MrBuilder PRO", "You're activated", "Good news, {{name}} — your account is approved and the marketplace is open. New jobs near you appear on the Home tab; each one shows scope, dates and payout before you accept.", "Browse jobs", "contractor", "Account", true},
	"verification_code":     {"Your MrBuilder verification code", "Confirm it's you", "Enter this code in MrBuilder. It expires in 10 minutes. If you didn't request it, you can ignore this email — never share the code with anyone.", "", "both", "Account", true},
	"household_invite":      {"{{inviter}} invited you to their MrBuilder household", "You've been invited", "{{inviter}} added you to their household on MrBuilder so you can help manage their pergola requests. Accept the invitation to get access.", "Accept invitation", "consumer", "Account", true},
	"quote_ready":           {"Your quote for {{job_title}} is ready", "Your quote is ready, {{name}}", "MrBuilder has priced request {{job_code}} from the details you provided. Nothing is scheduled until you approve.", "Review & approve quote", "consumer", "Requests", true},
	"job_assigned":          {"A professional accepted your request {{job_code}}", "Contractor assigned", "{{contractor}} accepted your request {{job_code}} ({{job_title}}). You can message them from the request, and you'll be notified when they're on the way.", "View request", "consumer", "Requests", true},
	"en_route":              {"{{contractor}} is on the way", "On the way", "{{contractor}} is heading to your property for {{job_title}}. Estimated arrival: {{eta}}.", "Track the visit", "consumer", "Requests", true},
	"work_started":          {"Work has started on {{job_title}}", "Work in progress", "{{contractor}} completed the site check and started the work on request {{job_code}}. Follow the progress and photos in the app.", "View progress", "consumer", "Requests", true},
	"awaiting_confirmation": {"Please confirm the finished work — {{job_code}}", "Work completed — please confirm", "{{contractor}} marked {{job_title}} as complete and added photos. Review them and confirm to release payment, or report an issue. If we don't hear from you, the job is confirmed automatically on {{deadline}}.", "Review & confirm", "consumer", "Requests", true},
	"payment_successful":    {"Receipt for {{job_title}} — {{amount}}", "Thank you — payment received", "Your payment of {{amount}} for request {{job_code}} was successful. The receipt is available in Documents.", "View receipt", "consumer", "Payments", true},
	"issue_reported":        {"Issue reported on {{job_code}}", "The client reported an issue", "The client reported that {{job_title}} isn't fully complete. Payment is on hold. Review their feedback in the app and either fix the issue or dispute it.", "View feedback", "contractor", "Requests", true},
	"dispute_resolved":      {"Decision on {{job_code}}", "Dispute decision", "MrBuilder reviewed the issue on request {{job_code}} and reached a decision. Open the request for the details and next steps.", "View request", "both", "Requests", true},
	"job_cancelled":         {"Request {{job_code}} was cancelled", "Request cancelled", "Request {{job_code}} ({{job_title}}) has been cancelled. Any applicable fees are shown in the app.", "View details", "both", "Requests", true},
	"reschedule_requested":  {"Reschedule request for {{job_code}}", "New time proposed", "A new time was proposed for {{job_title}}: {{proposed}}. The original slot is kept until you respond.", "Respond", "both", "Requests", true},
	"new_job":               {"New job near you: {{job_title}}", "New job available", "A new job is available near you — {{job_title}} in {{city}}, payout {{amount}}. Review the scope and dates before you accept.", "View job", "contractor", "Jobs", true},
	"job_paid":              {"Payment released for {{job_code}} — {{amount}}", "The client confirmed your work", "{{amount}} for {{job_title}} has been added to your balance. Withdraw it any time above the minimum payout, or turn on automatic payouts.", "View earnings", "contractor", "Payments", true},
	"payout_completed":      {"Payout of {{amount}} sent", "Payout sent", "{{amount}} is on its way to your account. Bank transfers usually arrive in 1–2 business days.", "View transactions", "contractor", "Payments", true},
	"mrcare_active":         {"Your MrCare plan is active", "MrCare is active", "Your {{plan}} plan is active for {{pergola}}. Book included visits or report an electronics issue from the MrCare tab.", "Open MrCare", "consumer", "MrCare", true},
	"claim_approved":        {"Your MrCare claim was approved", "Claim approved", "Your electronics claim is approved. A technician will be scheduled and you'll be notified with the visit details.", "View claim", "consumer", "MrCare", true},
	"claim_denied":          {"Update on your MrCare claim", "Claim update", "We reviewed your electronics claim and couldn't approve it this time. The reason is shown in the app; you can still request a paid repair.", "View claim", "consumer", "MrCare", true},
	"order_placed":          {"Order {{order}} confirmed", "Order confirmed", "Thanks — your Mr Supply order {{order}} ({{amount}}) is confirmed. We'll email you when it ships.", "Track order", "both", "Mr Supply", true},
	"order_shipped":         {"Order {{order}} is on its way", "Shipped", "Your order {{order}} has shipped. Track it in the app.", "Track order", "both", "Mr Supply", true},
	"lead_received":         {"We received your request", "Thanks, {{name}} — we've got it", "Your request has been added to our queue. A MrBuilder coordinator will follow up with next steps. Nothing is scheduled or charged until you approve a quote.", "", "lead", "Website", true},
}

var ntypeEvent = map[string]string{"quote_ready": "quote_ready", "job_assigned": "job_assigned", "inspection_assigned": "job_assigned", "en_route": "en_route", "work_started": "work_started", "awaiting_confirmation": "awaiting_confirmation", "payment_successful": "payment_successful", "issue_reported": "issue_reported", "dispute_resolved": "dispute_resolved", "dispute_rejected": "dispute_resolved", "job_cancelled": "job_cancelled", "contractor_cancelled": "job_cancelled", "reschedule_requested": "reschedule_requested", "new_job": "new_job", "job_paid": "job_paid", "payout_completed": "payout_completed", "mrcare_active": "mrcare_active", "claim_approved": "claim_approved", "claim_denied": "claim_denied", "order_placed": "order_placed", "order_shipped": "order_shipped", "account_activated": "account_activated"}

func emailTemplates(db *sql.DB) map[string]EmailTemplate {
	out := map[string]EmailTemplate{}
	for k, v := range defaultEmailTemplates {
		out[k] = v
	}
	if raw, ok := GetSettingRaw(db, "email_templates"); ok {
		var saved map[string]EmailTemplate
		if json.Unmarshal(raw, &saved) == nil {
			for k, v := range saved {
				d := out[k]
				if v.Group == "" {
					v.Group = d.Group
				}
				if v.Audience == "" {
					v.Audience = d.Audience
				}
				out[k] = v
			}
		}
	}
	return out
}

// ---------- rendering ----------

const emailLayout = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>{{.Subject}}</title></head>
<body style="margin:0;background:#F5F5F6;font-family:Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F5F6;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
<tr><td style="padding:0 0 16px 4px;"><img src="{{.Base}}/site/brand/mrb-lockup.png" alt="Mr. Builder" height="40" style="height:40px;display:block;"></td></tr>
<tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E9EAEB;">
<div style="height:6px;background:{{.Accent}};"></div>
<div style="padding:32px 36px 8px;{{if .Center}}text-align:center;{{end}}">
<div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#EF6820;text-transform:uppercase;">{{.Eyebrow}}</div>
<h1 style="margin:8px 0 12px;font-size:24px;line-height:1.25;color:#181D27;">{{.Title}}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#535862;">{{.Body}}</p>
{{if .Code}}<div style="display:inline-block;padding:16px 28px;border-radius:14px;background:#FAFAFA;border:1px solid #E9EAEB;font-size:34px;font-weight:700;letter-spacing:.35em;color:#181D27;">{{.Code}}</div>{{end}}
{{if .Rows}}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAFAFA;border-radius:14px;border:1px solid #E9EAEB;"><tr><td style="padding:16px 18px;"><table role="presentation" width="100%" style="font-size:14px;color:#535862;">
{{range .Rows}}<tr><td style="padding:4px 0;width:130px;">{{.K}}</td><td style="padding:4px 0;color:#181D27;{{if .Strong}}font-weight:700;font-size:18px;color:#067647;{{end}}">{{.V}}</td></tr>{{end}}
</table></td></tr></table>{{end}}
{{if .CTA}}<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px {{if .Center}}auto{{else}}0{{end}} 8px;"><tr><td style="background:#EF6820;border-radius:999px;"><a href="{{.Link}}" style="display:inline-block;padding:14px 26px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">{{.CTA}}</a></td></tr></table>{{end}}
{{if .Fine}}<p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#717680;">{{.Fine}}</p>{{end}}
</div>
<div style="padding:20px 36px 28px;"><div style="height:1px;background:#E9EAEB;margin-bottom:16px;"></div>
<table role="presentation" width="100%"><tr><td style="font-size:12px;color:#717680;line-height:18px;">{{if .Ref}}{{.Ref}}<br>{{end}}You're receiving this because you have a MrBuilder account. <a href="{{.Base}}/profile/settings" style="color:#717680;">Notification settings</a></td><td align="right" valign="top"><img src="{{.Base}}/site/brand/mrb-mark.png" alt="" width="34" style="width:34px;"></td></tr></table></div>
</td></tr>
<tr><td style="padding:18px 8px 0;text-align:center;font-size:12px;color:#A4A7AE;line-height:18px;">© {{.Year}} {{.Company}}{{if .Address}} · {{.Address}}{{end}} · <a href="{{.Base}}/legal/terms" style="color:#A4A7AE;">Terms</a> · <a href="{{.Base}}/legal/privacy" style="color:#A4A7AE;">Privacy</a></td></tr>
</table></td></tr></table></body></html>`

var emailTpl = template.Must(template.New("email").Parse(emailLayout))

type emailRow struct {
	K, V   string
	Strong bool
}
type emailView struct {
	Subject, Base, Accent, Eyebrow, Title, Body, Code, CTA, Link, Fine, Ref, Company, Address string
	Year                                                                                      int
	Center                                                                                    bool
	Rows                                                                                      []emailRow
}

func fillVars(s string, vars map[string]string) string {
	for k, v := range vars {
		s = strings.ReplaceAll(s, "{{"+k+"}}", html.EscapeString(v))
	}
	return s
}

// RenderEmail builds subject + HTML for an event with placeholder vars. rows/code/fine are optional extras.
func RenderEmail(db *sql.DB, event string, vars map[string]string, rows []emailRow, code, fine string) (subject, htmlOut string, ok bool) {
	t, found := emailTemplates(db)[event]
	if !found || !t.Enabled {
		return "", "", false
	}
	co := struct {
		LegalName string `json:"legal_name"`
		Address   string `json:"address"`
	}{LegalName: "MrBuilder"}
	if raw, ok := GetSettingRaw(db, "content_company"); ok {
		json.Unmarshal(raw, &co)
	}
	accent := "#EF6820"
	if t.Audience == "contractor" {
		accent = "#181D27"
	}
	eyebrow := t.Group
	if t.Audience == "contractor" {
		eyebrow = "MrBuilder PRO · " + t.Group
	}
	v := emailView{Subject: fillVars(t.Subject, vars), Base: publicBase(), Accent: accent, Eyebrow: eyebrow, Title: fillVars(t.Title, vars), Body: fillVars(t.Body, vars), Code: code, CTA: t.CTA, Link: vars["link"], Fine: fine, Ref: vars["ref"], Company: co.LegalName, Address: co.Address, Year: time.Now().Year(), Center: code != "", Rows: rows}
	if v.Link == "" {
		v.Link = publicBase()
	}
	var b bytes.Buffer
	if err := emailTpl.Execute(&b, v); err != nil {
		return "", "", false
	}
	return v.Subject, b.String(), true
}

// ---------- outbox ----------

// QueueEmail stores an email for the worker. to may be a user id (resolved, preference-checked) or an address (for leads).
func QueueEmail(db *sql.DB, userID, toAddr, event string, vars map[string]string, rows []emailRow, code, fine string) {
	if db == nil {
		return
	}
	if userID != "" {
		var email, first string
		var wants bool
		if db.QueryRow(`SELECT u.email, u.first_name, COALESCE(s.email_notifications, TRUE) FROM users u LEFT JOIN user_settings s ON s.user_id=u.id WHERE u.id=$1`, userID).Scan(&email, &first, &wants) != nil || !wants {
			return
		}
		toAddr = email
		if vars["name"] == "" {
			vars["name"] = first
		}
	}
	if toAddr == "" {
		return
	}
	subject, body, ok := RenderEmail(db, event, vars, rows, code, fine)
	if !ok {
		return
	}
	db.Exec(`INSERT INTO email_outbox (user_id, to_address, event, subject, html) VALUES ($1,$2,$3,$4,$5)`, nullIfEmpty(userID), toAddr, event, subject, body)
}

// queueForNotification is called from notify(): maps a notification type to an email event and enriches vars from the job.
func queueForNotification(db *sql.DB, userID, ntype, title, body, jobID string, data map[string]interface{}) {
	event, ok := ntypeEvent[ntype]
	if !ok {
		return
	}
	vars := map[string]string{}
	rows := []emailRow{}
	if jobID != "" {
		var code, jtitle, city, contractor string
		var total, net sql.NullFloat64
		var sched, auto sql.NullTime
		db.QueryRow(`SELECT j.request_code, j.title, COALESCE(j.location_city,''), COALESCE(cu.first_name||' '||LEFT(cu.last_name,1)||'.',''), j.total_price, j.contractor_net, j.scheduled_start, j.auto_confirm_at
            FROM jobs j LEFT JOIN users cu ON cu.id=j.contractor_id WHERE j.id=$1`, jobID).Scan(&code, &jtitle, &city, &contractor, &total, &net, &sched, &auto)
		vars["job_code"], vars["job_title"], vars["city"], vars["contractor"] = code, jtitle, city, contractor
		vars["ref"] = "Request " + code
		if total.Valid {
			vars["amount"] = fmt.Sprintf("$%.2f", total.Float64)
		}
		var role string
		db.QueryRow(`SELECT role FROM users WHERE id=$1`, userID).Scan(&role)
		if role == "contractor" {
			if net.Valid {
				vars["amount"] = fmt.Sprintf("$%.2f", net.Float64)
			}
			vars["link"] = publicBase() + "/profile/contractor"
			rows = append(rows, emailRow{"Job", jtitle + " · " + code, false})
			if sched.Valid {
				rows = append(rows, emailRow{"When", sched.Time.Format("Jan 2, 3:04 PM"), false})
			}
			if city != "" {
				rows = append(rows, emailRow{"Where", city, false})
			}
			if vars["amount"] != "" {
				rows = append(rows, emailRow{"Your payout", vars["amount"], true})
			}
		} else {
			vars["link"] = publicBase() + "/profile/requests/" + jobID
			rows = append(rows, emailRow{"Request", jtitle + " · " + code, false})
			if contractor != "" {
				rows = append(rows, emailRow{"Professional", contractor, false})
			}
			if sched.Valid {
				rows = append(rows, emailRow{"Scheduled", sched.Time.Format("Jan 2, 3:04 PM"), false})
			}
			if vars["amount"] != "" && (event == "quote_ready" || event == "payment_successful") {
				rows = append(rows, emailRow{"Total", vars["amount"], true})
			}
		}
		if auto.Valid {
			vars["deadline"] = auto.Time.Format("Jan 2, 3:04 PM")
		}
	}
	for k, v := range data {
		if s, ok := v.(string); ok && vars[k] == "" {
			vars[k] = s
		}
	}
	if vars["eta"] == "" {
		vars["eta"] = "soon"
	}
	if vars["proposed"] == "" {
		vars["proposed"] = "see the app"
	}
	QueueEmail(db, userID, "", event, vars, rows, "", "")
}

// StartEmailWorker sends queued emails when the SMTP integration is enabled.
func StartEmailWorker(db *sql.DB) {
	go func() {
		for {
			time.Sleep(20 * time.Second)
			// welcome emails for accounts created in the last day that haven't got one yet
			if wr, err := db.Query(`SELECT u.id, u.role FROM users u WHERE u.created_at > NOW() - INTERVAL '1 day' AND u.email NOT LIKE '%@mrb.dev'
                AND NOT EXISTS (SELECT 1 FROM email_outbox e WHERE e.user_id=u.id AND e.event LIKE 'welcome_%') LIMIT 50`); err == nil {
				type nu struct{ id, role string }
				var list []nu
				for wr.Next() {
					var n nu
					if wr.Scan(&n.id, &n.role) == nil {
						list = append(list, n)
					}
				}
				wr.Close()
				for _, n := range list {
					ev, link := "welcome_consumer", publicBase()+"/profile"
					if n.role == "contractor" {
						ev, link = "welcome_contractor", publicBase()+"/profile/contractor"
					}
					QueueEmail(db, n.id, "", ev, map[string]string{"link": link}, nil, "", "")
					db.Exec(`INSERT INTO email_outbox (user_id, to_address, event, subject, html, status) SELECT $1, '', $2, '', '', 'skipped' WHERE NOT EXISTS (SELECT 1 FROM email_outbox WHERE user_id=$1 AND event=$2)`, n.id, ev)
				}
			}
			if _, ok := integrations.Get("smtp"); !ok {
				continue
			}
			rows, err := db.Query(`SELECT id, to_address, subject, html FROM email_outbox WHERE status='pending' AND attempts < 3 ORDER BY created_at LIMIT 20`)
			if err != nil {
				continue
			}
			type item struct{ id, to, subject, html string }
			var items []item
			for rows.Next() {
				var it item
				if rows.Scan(&it.id, &it.to, &it.subject, &it.html) == nil {
					items = append(items, it)
				}
			}
			rows.Close()
			for _, it := range items {
				if err := integrations.SendEmail(it.to, it.subject, it.html); err != nil {
					db.Exec(`UPDATE email_outbox SET attempts=attempts+1, last_error=$2, status=CASE WHEN attempts+1>=3 THEN 'failed' ELSE 'pending' END WHERE id=$1`, it.id, err.Error())
				} else {
					db.Exec(`UPDATE email_outbox SET status='sent', sent_at=NOW(), attempts=attempts+1 WHERE id=$1`, it.id)
				}
			}
		}
	}()
}

// ---------- admin ----------

type EmailAdminHandler struct{ DB *sql.DB }

// GET /admin/emails/templates
func (h *EmailAdminHandler) List(c *gin.Context) {
	var counts struct{ Pending, Sent, Failed int }
	h.DB.QueryRow(`SELECT COUNT(*) FILTER (WHERE status='pending'), COUNT(*) FILTER (WHERE status='sent'), COUNT(*) FILTER (WHERE status='failed') FROM email_outbox`).Scan(&counts.Pending, &counts.Sent, &counts.Failed)
	_, smtpOn := integrations.Get("smtp")
	utils.Success(c, http.StatusOK, "", gin.H{"templates": emailTemplates(h.DB), "defaults": defaultEmailTemplates, "smtp_enabled": smtpOn, "outbox": gin.H{"pending": counts.Pending, "sent": counts.Sent, "failed": counts.Failed}})
}

// PUT /admin/emails/templates {event: {subject,title,body,cta,enabled}}
func (h *EmailAdminHandler) Save(c *gin.Context) {
	var body map[string]EmailTemplate
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Error(c, http.StatusBadRequest, "Invalid body")
		return
	}
	raw, _ := json.Marshal(body)
	h.DB.Exec(`INSERT INTO platform_settings (key, value, description) VALUES ('email_templates', $1::jsonb, 'Transactional email copy') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, string(raw))
	utils.Success(c, http.StatusOK, "Saved", nil)
}

// GET /admin/emails/preview?event=
func (h *EmailAdminHandler) Preview(c *gin.Context) {
	vars := map[string]string{"name": "Jordan", "job_code": "MRB-2026-11204", "job_title": "Louvered pergola installation", "contractor": "Mike R.", "amount": "$4,940.00", "city": "Round Rock, TX", "eta": "15 minutes", "deadline": "Sep 28, 9:00 AM", "proposed": "Sep 25, 2:00 PM", "plan": "Plus", "pergola": "Backyard pergola", "order": "MS-2026-0042", "inviter": "Alex", "ref": "Request MRB-2026-11204 · 4821 Oak Hollow Dr, Austin, TX", "link": publicBase()}
	rows := []emailRow{{"Request", "Louvered pergola installation · MRB-2026-11204", false}, {"Professional", "Mike R.", false}, {"Scheduled", "Sep 22, 9:00 AM", false}, {"Total", "$4,940.00", true}}
	code := ""
	if c.Query("event") == "verification_code" {
		code, rows = "482 913", nil
	}
	_, out, ok := RenderEmail(h.DB, c.Query("event"), vars, rows, code, "")
	if !ok {
		c.String(http.StatusNotFound, "Unknown or disabled template")
		return
	}
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, out)
}

// POST /admin/emails/test {event, to}
func (h *EmailAdminHandler) SendTest(c *gin.Context) {
	var req struct {
		Event string `json:"event"`
		To    string `json:"to"`
	}
	c.ShouldBindJSON(&req)
	if _, ok := integrations.Get("smtp"); !ok {
		utils.Error(c, http.StatusServiceUnavailable, "Enable the Email (SMTP) integration first")
		return
	}
	vars := map[string]string{"name": "Test", "job_code": "MRB-2026-00001", "job_title": "Sample job", "contractor": "Mike R.", "amount": "$1,234.00", "city": "Austin, TX", "link": publicBase(), "inviter": "Alex", "plan": "Plus", "pergola": "Backyard pergola", "order": "MS-0001"}
	subject, out, ok := RenderEmail(h.DB, req.Event, vars, nil, "", "")
	if !ok {
		utils.Error(c, http.StatusBadRequest, "Unknown template")
		return
	}
	if err := integrations.SendEmail(req.To, "[TEST] "+subject, out); err != nil {
		utils.Error(c, http.StatusBadGateway, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "Sent", nil)
}

// GET /admin/emails/outbox
func (h *EmailAdminHandler) Outbox(c *gin.Context) {
	rows, _ := h.DB.Query(`SELECT id, to_address, event, subject, status, attempts, COALESCE(last_error,''), created_at, sent_at FROM email_outbox ORDER BY created_at DESC LIMIT 100`)
	out := []gin.H{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var id, to, ev, sub, st, er string
			var att int
			var cr time.Time
			var sent sql.NullTime
			if rows.Scan(&id, &to, &ev, &sub, &st, &att, &er, &cr, &sent) == nil {
				out = append(out, gin.H{"id": id, "to": to, "event": ev, "subject": sub, "status": st, "attempts": att, "error": er, "created_at": cr, "sent_at": sent.Time})
			}
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}
