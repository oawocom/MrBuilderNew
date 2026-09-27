package handlers

import (
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// documentHTML renders a shared document as a branded, printable page when the client is a browser
// (Accept: text/html). Returns false when the caller should answer with JSON instead.
func documentHTML(c *gin.Context, dtype, title string, url *string, payload []byte) bool {
	if !strings.Contains(c.GetHeader("Accept"), "text/html") {
		return false
	}
	var data map[string]interface{}
	json.Unmarshal(payload, &data)
	base := "https://" + c.Request.Host
	if strings.Contains(c.Request.Host, "localhost") || strings.Contains(c.Request.Host, "127.0.0.1") {
		base = "http://" + c.Request.Host
	}
	var b strings.Builder
	b.WriteString(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>` + html.EscapeString(title) + ` — MrBuilder</title>
<style>body{margin:0;background:#F5F5F5;font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;color:#181D27}
.wrap{max-width:720px;margin:0 auto;padding:24px 16px 48px}.card{background:#fff;border:1px solid #E9EAEB;border-radius:20px;overflow:hidden}
.hd{display:flex;align-items:center;gap:14px;padding:20px 24px;border-bottom:4px solid #EF6820}.hd img{height:40px}.hd .t{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#EF6820}.hd h1{margin:2px 0 0;font-size:20px;letter-spacing:-.02em}
.rows{padding:8px 24px 16px}.row{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid #F0F0F1;font-size:14.5px}.row:last-child{border-bottom:0}.k{color:#717680}.v{font-weight:600;text-align:right;word-break:break-word}
.sub{padding:0 24px 16px}.sub h3{margin:16px 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#717680}
table{width:100%;border-collapse:collapse;font-size:14px}th{text-align:left;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:#717680;padding:8px 0;border-bottom:1px solid #E9EAEB}td{padding:10px 0;border-bottom:1px solid #F0F0F1}td.n,th.n{text-align:right}
.imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}.imgs img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;border:1px solid #E9EAEB}
.ft{padding:16px 24px;background:#FAFAFA;border-top:1px solid #E9EAEB;font-size:12.5px;color:#717680;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.btn{display:inline-block;padding:10px 16px;border-radius:10px;background:#EF6820;color:#fff;font-weight:600;text-decoration:none;font-size:14px}.btn.o{background:#fff;color:#181D27;border:1px solid #D5D7DA}
@media print{body{background:#fff}.wrap{padding:0}.card{border:0}.noprint{display:none}}</style></head><body><div class="wrap"><div class="card">`)
	b.WriteString(`<div class="hd"><img src="` + base + `/site/brand/mrb-head-logo.png" alt="MrBuilder"><div><div class="t">` + html.EscapeString(docTypeLabel(dtype)) + `</div><h1>` + html.EscapeString(title) + `</h1></div></div>`)

	// simple fields first, then tables / photos / nested objects
	keys := make([]string, 0, len(data))
	for k := range data {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	b.WriteString(`<div class="rows">`)
	for _, k := range keys {
		v := data[k]
		switch v.(type) {
		case map[string]interface{}, []interface{}:
			continue
		}
		if v == nil {
			continue
		}
		b.WriteString(`<div class="row"><span class="k">` + html.EscapeString(docLabel(k)) + `</span><span class="v">` + html.EscapeString(docValue(k, v)) + `</span></div>`)
	}
	b.WriteString(`</div>`)
	for _, k := range keys {
		switch v := data[k].(type) {
		case []interface{}:
			if len(v) == 0 {
				continue
			}
			b.WriteString(`<div class="sub"><h3>` + html.EscapeString(docLabel(k)) + `</h3>`)
			if s, ok := v[0].(string); ok && strings.HasPrefix(s, "http") {
				b.WriteString(`<div class="imgs">`)
				for _, x := range v {
					if u, ok := x.(string); ok {
						b.WriteString(`<a href="` + html.EscapeString(u) + `" target="_blank"><img src="` + html.EscapeString(u) + `"></a>`)
					}
				}
				b.WriteString(`</div>`)
			} else if first, ok := v[0].(map[string]interface{}); ok {
				cols := make([]string, 0, len(first))
				for ck := range first {
					cols = append(cols, ck)
				}
				sort.Strings(cols)
				b.WriteString(`<table><tr>`)
				for _, ck := range cols {
					b.WriteString(`<th class="` + numClass(first[ck]) + `">` + html.EscapeString(docLabel(ck)) + `</th>`)
				}
				b.WriteString(`</tr>`)
				for _, x := range v {
					row, _ := x.(map[string]interface{})
					b.WriteString(`<tr>`)
					for _, ck := range cols {
						b.WriteString(`<td class="` + numClass(row[ck]) + `">` + html.EscapeString(docValue(ck, row[ck])) + `</td>`)
					}
					b.WriteString(`</tr>`)
				}
				b.WriteString(`</table>`)
			} else {
				b.WriteString(`<div class="rows">`)
				for _, x := range v {
					b.WriteString(`<div class="row"><span class="v" style="text-align:left">` + html.EscapeString(docValue(k, x)) + `</span></div>`)
				}
				b.WriteString(`</div>`)
			}
			b.WriteString(`</div>`)
		case map[string]interface{}:
			if len(v) == 0 {
				continue
			}
			b.WriteString(`<div class="sub"><h3>` + html.EscapeString(docLabel(k)) + `</h3><div class="rows" style="padding:0">`)
			sub := make([]string, 0, len(v))
			for sk := range v {
				sub = append(sub, sk)
			}
			sort.Strings(sub)
			for _, sk := range sub {
				if v[sk] == nil {
					continue
				}
				b.WriteString(`<div class="row"><span class="k">` + html.EscapeString(docLabel(sk)) + `</span><span class="v">` + html.EscapeString(docValue(sk, v[sk])) + `</span></div>`)
			}
			b.WriteString(`</div></div>`)
		}
	}
	b.WriteString(`<div class="ft"><span>Generated by MrBuilder · ` + time.Now().Format("Jan 2, 2006") + `</span><span class="noprint">`)
	if url != nil && *url != "" {
		b.WriteString(`<a class="btn o" href="` + html.EscapeString(*url) + `" target="_blank">Open file</a> `)
	}
	b.WriteString(`<a class="btn" href="#" onclick="window.print();return false">Print / Save PDF</a></span></div></div></div></body></html>`)
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(b.String()))
	return true
}

func docTypeLabel(t string) string {
	switch t {
	case "invoice":
		return "Invoice"
	case "receipt":
		return "Receipt"
	case "certificate":
		return "MrCare certificate"
	case "inspection_report":
		return "Inspection report"
	case "completion_photos":
		return "Completion photos"
	case "warranty":
		return "Warranty"
	case "order_receipt":
		return "Order receipt"
	}
	return docLabel(t)
}

func docLabel(k string) string {
	k = strings.ReplaceAll(k, "_", " ")
	if k == "" {
		return k
	}
	return strings.ToUpper(k[:1]) + k[1:]
}

func isMoneyKey(k string) bool {
	for _, s := range []string{"amount", "total", "price", "fee", "net", "subtotal", "tax", "tip", "credit"} {
		if strings.Contains(k, s) {
			return true
		}
	}
	return false
}

func numClass(v interface{}) string {
	if _, ok := v.(float64); ok {
		return "n"
	}
	return ""
}

func docValue(k string, v interface{}) string {
	switch x := v.(type) {
	case nil:
		return "—"
	case bool:
		if x {
			return "Yes"
		}
		return "No"
	case float64:
		if isMoneyKey(k) {
			return fmt.Sprintf("$%.2f", x)
		}
		if x == float64(int64(x)) {
			return fmt.Sprintf("%d", int64(x))
		}
		return fmt.Sprintf("%.2f", x)
	case string:
		if strings.HasSuffix(k, "_at") || strings.HasSuffix(k, "_date") || k == "date" {
			for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02T15:04:05Z07:00", "2006-01-02"} {
				if t, err := time.Parse(layout, x); err == nil {
					if layout == "2006-01-02" {
						return t.Format("Jan 2, 2006")
					}
					return t.Format("Jan 2, 2006 · 3:04 PM")
				}
			}
		}
		if len(x) > 0 && (k == "status" || k == "plan" || k == "offering" || k == "kind" || k == "type") {
			return docLabel(strings.ReplaceAll(x, "-", " "))
		}
		return x
	}
	bs, _ := json.Marshal(v)
	return string(bs)
}
