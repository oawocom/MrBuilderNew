package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pdf/fpdf"
	"github.com/mrbuilder/backend/internal/utils"
)

var invoicePDFSecret []byte

// InitInvoicePDF sets the key used to sign public invoice PDF links (called from routes.Setup).
func InitInvoicePDF(secret string) { invoicePDFSecret = []byte("invoice-pdf:" + secret) }

func invoiceSig(id string) string {
	m := hmac.New(sha256.New, invoicePDFSecret)
	m.Write([]byte(id))
	return hex.EncodeToString(m.Sum(nil))[:32]
}

// InvoicePDFURL returns the public, signed PDF link for an invoice.
func InvoicePDFURL(id string) string {
	base := os.Getenv("PUBLIC_BASE_URL")
	if base == "" {
		base = "https://mrbuilder.com"
	}
	return strings.TrimRight(base, "/") + "/api/v1/invoices/" + id + "/pdf?s=" + invoiceSig(id)
}

type pdfLine struct {
	Label      string  `json:"label"`
	Qty        float64 `json:"qty"`
	UnitAmount float64 `json:"unit_amount"`
	Amount     float64 `json:"amount"`
}

// GET /invoices/:id/pdf?s=<sig> — public, signed link; renders the invoice as a PDF on the fly
func (h *QuoteHandler) InvoicePDF(c *gin.Context) {
	id := c.Param("id")
	if len(invoicePDFSecret) == 0 || !hmac.Equal([]byte(c.Query("s")), []byte(invoiceSig(id))) {
		utils.Error(c, http.StatusForbidden, "Invalid link")
		return
	}
	var amount, tip, credit float64
	var status, lineType, jobTitle, cName, cEmail, pName string
	var desc, code, addr, city, state, zip, cPhone, quoteID *string
	var createdAt time.Time
	var paidAt *time.Time
	err := h.DB.QueryRow(`SELECT i.amount, i.status::text, COALESCE(i.line_type,'job'), i.description, i.created_at, i.paid_at,
	    j.title, j.request_code, j.location_address, j.location_city, j.location_state, j.location_zip, j.tip, j.inspection_fee_credit, j.current_quote_id::text,
	    uc.first_name||' '||uc.last_name, uc.email, uc.phone, ut.first_name||' '||ut.last_name
	    FROM invoices i JOIN jobs j ON j.id=i.job_id JOIN users uc ON uc.id=i.consumer_id JOIN users ut ON ut.id=i.contractor_id WHERE i.id=$1`, id).
		Scan(&amount, &status, &lineType, &desc, &createdAt, &paidAt, &jobTitle, &code, &addr, &city, &state, &zip, &tip, &credit, &quoteID, &cName, &cEmail, &cPhone, &pName)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Invoice not found")
		return
	}
	lines := []pdfLine{}
	adjs := []struct {
		Label  string  `json:"label"`
		Amount float64 `json:"amount"`
	}{}
	if lineType == "job" && quoteID != nil {
		var li, adj []byte
		if h.DB.QueryRow(`SELECT line_items, adjustments FROM quote_versions WHERE id=$1`, *quoteID).Scan(&li, &adj) == nil {
			json.Unmarshal(li, &lines)
			json.Unmarshal(adj, &adjs)
		}
	}
	if len(lines) == 0 {
		lines = append(lines, pdfLine{Label: strOr(desc, jobTitle), Qty: 1, UnitAmount: amount - tip + credit, Amount: amount - tip + credit})
	}
	dueDays := GetSettingInt(h.DB, "invoice_due_days", 7)
	company := map[string]string{}
	if raw, ok := GetSettingRaw(h.DB, "content_company"); ok {
		json.Unmarshal(raw, &company)
	}

	orange := [3]int{239, 104, 32}
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(18, 18, 18)
	pdf.SetAutoPageBreak(true, 20)
	pdf.AddPage()
	// header
	pdf.SetTextColor(orange[0], orange[1], orange[2])
	pdf.SetFont("Helvetica", "B", 22)
	pdf.CellFormat(90, 10, "MrBuilder", "", 0, "L", false, 0, "")
	pdf.SetTextColor(24, 29, 39)
	pdf.SetFont("Helvetica", "B", 22)
	pdf.CellFormat(84, 10, strings.ToUpper(docTypeLabel("invoice")), "", 1, "R", false, 0, "")
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(113, 118, 128)
	pdf.CellFormat(90, 5, strOr(invPtr(company["legal_name"]), "MrBuilder"), "", 0, "L", false, 0, "")
	pdf.CellFormat(84, 5, "No. "+strings.ToUpper(id[:8])+"   "+strOr(code, ""), "", 1, "R", false, 0, "")
	if company["address"] != "" {
		pdf.CellFormat(90, 5, company["address"], "", 0, "L", false, 0, "")
	} else {
		pdf.CellFormat(90, 5, "", "", 0, "L", false, 0, "")
	}
	pdf.CellFormat(84, 5, "Issued "+createdAt.Format("Jan 2, 2006"), "", 1, "R", false, 0, "")
	pdf.CellFormat(90, 5, company["email"], "", 0, "L", false, 0, "")
	if paidAt != nil {
		pdf.CellFormat(84, 5, "Paid "+paidAt.Format("Jan 2, 2006"), "", 1, "R", false, 0, "")
	} else if status == "pending" {
		pdf.CellFormat(84, 5, "Due "+createdAt.AddDate(0, 0, dueDays).Format("Jan 2, 2006"), "", 1, "R", false, 0, "")
	} else {
		pdf.CellFormat(84, 5, strings.Title(status), "", 1, "R", false, 0, "")
	}
	pdf.Ln(3)
	pdf.SetDrawColor(orange[0], orange[1], orange[2])
	pdf.SetLineWidth(1)
	pdf.Line(18, pdf.GetY(), 192, pdf.GetY())
	pdf.Ln(6)

	// parties
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(113, 118, 128)
	pdf.CellFormat(87, 5, "BILL TO", "", 0, "L", false, 0, "")
	pdf.CellFormat(87, 5, "SERVICE", "", 1, "L", false, 0, "")
	pdf.SetTextColor(24, 29, 39)
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(87, 6, cName, "", 0, "L", false, 0, "")
	pdf.CellFormat(87, 6, jobTitle, "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 9.5)
	pdf.SetTextColor(60, 64, 72)
	left := []string{cEmail}
	if cPhone != nil && *cPhone != "" {
		left = append(left, *cPhone)
	}
	loc := strings.TrimSpace(strings.Join(invFilterEmpty(strOr(addr, ""), strOr(city, ""), strOr(state, "")+" "+strOr(zip, "")), ", "))
	if loc != "" {
		left = append(left, loc)
	}
	right := []string{"PRO: " + pName, "Type: " + strings.Title(lineType)}
	for i := 0; i < len(left) || i < len(right); i++ {
		l, r := "", ""
		if i < len(left) {
			l = left[i]
		}
		if i < len(right) {
			r = right[i]
		}
		pdf.CellFormat(87, 5, l, "", 0, "L", false, 0, "")
		pdf.CellFormat(87, 5, r, "", 1, "L", false, 0, "")
	}
	pdf.Ln(6)

	// table
	pdf.SetFillColor(250, 250, 250)
	pdf.SetDrawColor(233, 234, 235)
	pdf.SetLineWidth(0.2)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(113, 118, 128)
	pdf.CellFormat(94, 8, "DESCRIPTION", "B", 0, "L", true, 0, "")
	pdf.CellFormat(20, 8, "QTY", "B", 0, "R", true, 0, "")
	pdf.CellFormat(30, 8, "UNIT", "B", 0, "R", true, 0, "")
	pdf.CellFormat(30, 8, "AMOUNT", "B", 1, "R", true, 0, "")
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(24, 29, 39)
	subtotal := 0.0
	for _, l := range lines {
		pdf.CellFormat(94, 8, l.Label, "B", 0, "L", false, 0, "")
		pdf.CellFormat(20, 8, invTrimNum(l.Qty), "B", 0, "R", false, 0, "")
		pdf.CellFormat(30, 8, fmt.Sprintf("$%.2f", l.UnitAmount), "B", 0, "R", false, 0, "")
		pdf.CellFormat(30, 8, fmt.Sprintf("$%.2f", l.Amount), "B", 1, "R", false, 0, "")
		subtotal += l.Amount
	}
	for _, a := range adjs {
		pdf.CellFormat(144, 8, a.Label, "B", 0, "L", false, 0, "")
		pdf.CellFormat(30, 8, fmt.Sprintf("$%.2f", a.Amount), "B", 1, "R", false, 0, "")
		subtotal += a.Amount
	}
	pdf.Ln(2)
	total := func(label, val string, bold bool) {
		if bold {
			pdf.SetFont("Helvetica", "B", 12)
		} else {
			pdf.SetFont("Helvetica", "", 10)
			pdf.SetTextColor(60, 64, 72)
		}
		pdf.CellFormat(114, 7, "", "", 0, "L", false, 0, "")
		pdf.CellFormat(30, 7, label, "", 0, "R", false, 0, "")
		pdf.CellFormat(30, 7, val, "", 1, "R", false, 0, "")
		pdf.SetTextColor(24, 29, 39)
	}
	total("Subtotal", fmt.Sprintf("$%.2f", subtotal), false)
	if credit > 0 {
		total("Inspection credit", fmt.Sprintf("-$%.2f", credit), false)
	}
	if tip > 0 {
		total("Tip", fmt.Sprintf("$%.2f", tip), false)
	}
	total("Total", fmt.Sprintf("$%.2f", amount), true)
	pdf.Ln(10)
	pdf.SetFont("Helvetica", "", 8.5)
	pdf.SetTextColor(113, 118, 128)
	note := "Thank you for choosing MrBuilder."
	if paidAt != nil {
		note = "This invoice has been paid in full. " + note
	} else if status == "pending" {
		note = fmt.Sprintf("Payment is due within %d days of issue. ", dueDays) + note
	}
	pdf.MultiCell(174, 4.5, note, "", "L", false)
	pdf.Ln(2)
	pdf.CellFormat(174, 4.5, "Generated by MrBuilder - "+time.Now().Format("Jan 2, 2006"), "", 1, "L", false, 0, "")

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="invoice-%s.pdf"`, strOr(code, id[:8])))
	if err := pdf.Output(c.Writer); err != nil {
		utils.Error(c, http.StatusInternalServerError, "PDF failed: "+err.Error())
	}
}

func invPtr(s string) *string { return &s }

func invFilterEmpty(ss ...string) []string {
	out := []string{}
	for _, s := range ss {
		if strings.TrimSpace(s) != "" {
			out = append(out, strings.TrimSpace(s))
		}
	}
	return out
}

func invTrimNum(f float64) string {
	if f == float64(int64(f)) {
		return fmt.Sprintf("%d", int64(f))
	}
	return fmt.Sprintf("%.2f", f)
}
