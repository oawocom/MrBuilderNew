package pricing

import (
	"database/sql"
	"encoding/json"
	"math"
)

// Spec is the pergola / job specification the engine prices. It is stored on jobs.pergola_spec
// and can be overridden by an inspection report.
type Spec struct {
	StructureType  string      `json:"structure_type"` // louvered | fixed_roof | retractable
	Mounting       string      `json:"mounting"`       // attached | free_standing
	WidthFt        float64     `json:"width_ft"`
	LengthFt       float64     `json:"length_ft"`
	HeightFt       float64     `json:"height_ft"`
	Enclosures     []Enclosure `json:"enclosures"`
	Accessories    []Accessory `json:"accessories"`
	Footings       Footings    `json:"footings"`
	Urgency        string      `json:"urgency"`         // repair: low | medium | high
	EstimatedHours float64     `json:"estimated_hours"` // repair labor; default 2
	Relocation     bool        `json:"relocation"`      // removal: re-install at new location
}

type Enclosure struct {
	Type     string  `json:"type"` // screen | glass | privacy_wall | louvered_wall | zip_shade ...
	WidthFt  float64 `json:"width_ft"`
	LengthFt float64 `json:"length_ft"`
	HeightFt float64 `json:"height_ft"`
	Location string  `json:"location,omitempty"`
}

type Accessory struct {
	Type string `json:"type"` // led_lighting | fan | electric_heater | speaker | motor_controls ...
	Qty  int    `json:"qty"`
}

type Footings struct {
	Involved bool `json:"involved"`
	Ready    bool `json:"ready"`
	Count    int  `json:"count"`
}

type LineItem struct {
	RuleID     string  `json:"rule_id"`
	Component  string  `json:"component"`
	Code       string  `json:"code,omitempty"`
	Label      string  `json:"label"`
	Unit       string  `json:"unit"`
	Qty        float64 `json:"qty"`
	UnitAmount float64 `json:"unit_amount"`
	Amount     float64 `json:"amount"`
}

type Result struct {
	LineItems     []LineItem `json:"line_items"`
	Subtotal      float64    `json:"subtotal"`
	Total         float64    `json:"total"`
	PlatformFee   float64    `json:"platform_fee"`
	ContractorNet float64    `json:"contractor_net"`
}

type rule struct {
	id, component, unit string
	code, structureType *string
	amount              float64
	label               *string
}

func round2(f float64) float64 { return math.Round(f*100) / 100 }

func settingFloat(db *sql.DB, key string, def float64) float64 {
	var v []byte
	if err := db.QueryRow(`SELECT value FROM platform_settings WHERE key=$1`, key).Scan(&v); err != nil {
		return def
	}
	var f float64
	if json.Unmarshal(v, &f) != nil {
		return def
	}
	return f
}

// Calculate prices a job in one category. Quote = sum of matching active pricing_rules.
// adjustments are manual admin lines added on top (may be negative).
func Calculate(db *sql.DB, category string, spec Spec, adjustments []LineItem) (Result, error) {
	rows, err := db.Query(`SELECT id, component, code, structure_type, amount, unit, label
        FROM pricing_rules WHERE service_category=$1 AND is_active ORDER BY component, code`, category)
	if err != nil {
		return Result{}, err
	}
	defer rows.Close()

	var rules []rule
	for rows.Next() {
		var r rule
		if rows.Scan(&r.id, &r.component, &r.code, &r.structureType, &r.amount, &r.unit, &r.label) == nil {
			rules = append(rules, r)
		}
	}

	// If a component has a rule specific to this structure type, ignore its generic (NULL) siblings.
	typedComponents := map[string]bool{}
	for _, r := range rules {
		if r.structureType != nil && *r.structureType == spec.StructureType {
			typedComponents[r.component] = true
		}
	}

	area := spec.WidthFt * spec.LengthFt
	res := Result{LineItems: []LineItem{}}

	add := func(r rule, qty float64) {
		if qty <= 0 {
			return
		}
		li := LineItem{RuleID: r.id, Component: r.component, Unit: r.unit, Qty: qty, UnitAmount: r.amount, Amount: round2(r.amount * qty)}
		if r.code != nil {
			li.Code = *r.code
		}
		if r.label != nil {
			li.Label = *r.label
		} else {
			li.Label = r.component
		}
		res.LineItems = append(res.LineItems, li)
		res.Subtotal += li.Amount
	}

	for _, r := range rules {
		if r.structureType != nil && *r.structureType != spec.StructureType {
			continue
		}
		if r.structureType == nil && typedComponents[r.component] {
			continue
		}
		code := ""
		if r.code != nil {
			code = *r.code
		}
		switch r.component {
		case "base":
			add(r, 1)
		case "per_sqft":
			add(r, area)
		case "mounting":
			if code == spec.Mounting {
				add(r, 1)
			}
		case "footing_not_ready":
			if spec.Footings.Involved && !spec.Footings.Ready {
				n := spec.Footings.Count
				if n < 1 {
					n = 1
				}
				add(r, float64(n))
			}
		case "height_over_10ft":
			if spec.HeightFt > 10 {
				add(r, 1)
			}
		case "enclosure":
			n := 0
			for _, e := range spec.Enclosures {
				if e.Type == code {
					n++
				}
			}
			add(r, float64(n))
		case "accessory":
			n := 0
			for _, a := range spec.Accessories {
				if a.Type == code {
					n += a.Qty
				}
			}
			add(r, float64(n))
		case "urgency":
			if code == spec.Urgency {
				add(r, 1)
			}
		case "per_hour":
			h := spec.EstimatedHours
			if h <= 0 {
				h = 2
			}
			add(r, h)
		case "relocation":
			if spec.Relocation {
				add(r, 1)
			}
		default:
			// unknown component: treat as flat line so admin additions still apply
			add(r, 1)
		}
	}

	for _, a := range adjustments {
		a.Component = "adjustment"
		if a.Qty == 0 {
			a.Qty = 1
		}
		if a.UnitAmount == 0 {
			a.UnitAmount = a.Amount
		}
		a.Amount = round2(a.UnitAmount * a.Qty)
		res.LineItems = append(res.LineItems, a)
		res.Subtotal += a.Amount
	}

	res.Subtotal = round2(res.Subtotal)
	res.Total = res.Subtotal
	if res.Total < 0 {
		res.Total = 0
	}

	pct := settingFloat(db, "platform_fee_pct", 10)
	flat := settingFloat(db, "platform_fee_flat", 0)
	res.PlatformFee = round2(res.Total*pct/100 + flat)
	if res.PlatformFee > res.Total {
		res.PlatformFee = res.Total
	}
	res.ContractorNet = round2(res.Total - res.PlatformFee)
	return res, nil
}

// SpecFromJSON parses jobs.pergola_spec and fills top-level dims / mounting when they live on the job row.
func SpecFromJSON(raw []byte, widthFt, lengthFt, heightFt *float64, mounting, urgency *string) Spec {
	var s Spec
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &s)
	}
	if s.WidthFt == 0 && widthFt != nil {
		s.WidthFt = *widthFt
	}
	if s.LengthFt == 0 && lengthFt != nil {
		s.LengthFt = *lengthFt
	}
	if s.HeightFt == 0 && heightFt != nil {
		s.HeightFt = *heightFt
	}
	if s.Mounting == "" && mounting != nil {
		s.Mounting = *mounting
	}
	if s.Urgency == "" && urgency != nil {
		s.Urgency = *urgency
	}
	return s
}
