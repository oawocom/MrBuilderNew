package models

import (
	"encoding/json"
	"time"
)

type Job struct {
	ID                  string          `json:"id"`
	RequestCode         *string         `json:"request_code"`
	ConsumerID          string          `json:"consumer_id"`
	ContractorID        *string         `json:"contractor_id"`
	Title               string          `json:"title"`
	Description         *string         `json:"description"`
	ServiceCategory     *string         `json:"service_category"`
	QuoteMethod         string          `json:"quote_method"`
	Status              string          `json:"status"`
	LocationAddress     *string         `json:"location_address"`
	LocationCity        *string         `json:"location_city"`
	LocationState       *string         `json:"location_state"`
	LocationZip         *string         `json:"location_zip"`
	LocationLat         *float64        `json:"location_lat"`
	LocationLng         *float64        `json:"location_lng"`
	PropertyType        *string         `json:"property_type"`
	PreferredStartDate  *string         `json:"preferred_start_date"`
	PreferredEndDate    *string         `json:"preferred_end_date"`
	ScheduledStart      *time.Time      `json:"scheduled_start"`
	ScheduledEnd        *time.Time      `json:"scheduled_end"`
	Notes               *string         `json:"notes"`
	Urgency             *string         `json:"urgency"`
	TimeWindow          *string         `json:"time_window"`
	IssueDescription    *string         `json:"issue_description"`
	Mounting            *string         `json:"mounting"`
	WidthFt             *float64        `json:"width_ft"`
	LengthFt            *float64        `json:"length_ft"`
	HeightFt            *float64        `json:"height_ft"`
	PergolaSpec         json.RawMessage `json:"pergola_spec"`
	QuoteTotal          *float64        `json:"quote_total"`
	PlatformFee         *float64        `json:"platform_fee"`
	ContractorNet       *float64        `json:"contractor_net"`
	Tip                 float64         `json:"tip"`
	InspectionFee       float64         `json:"inspection_fee"`
	InspectionFeeCredit float64         `json:"inspection_fee_credit"`
	EnRouteEtaMinutes   *int            `json:"en_route_eta_minutes"`
	EnRouteAt           *time.Time      `json:"en_route_at"`
	ArrivedAt           *time.Time      `json:"arrived_at"`
	PausedAt            *time.Time      `json:"paused_at"`
	PauseReason         *string         `json:"pause_reason"`
	CompletionNote      *string         `json:"completion_note"`
	ChecklistDone       json.RawMessage `json:"checklist_done"`
	AutoConfirmAt       *time.Time      `json:"auto_confirm_at"`
	DamageFlagged       bool            `json:"damage_flagged"`
	ReturnVisitAt       *time.Time      `json:"return_visit_at"`
	ReschedulePendingBy *string         `json:"reschedule_pending_by"`
	IssueReason         *string         `json:"issue_reason"`
	IssueText           *string         `json:"issue_text"`
	ResumedAt           *time.Time      `json:"resumed_at"`
	ConsumerCharged     *float64        `json:"consumer_charged"`
	PaidAt              *time.Time      `json:"paid_at"`
	IsAssessment        bool            `json:"is_assessment"`
	PergolaID           *string         `json:"pergola_id"`
	Kind                string          `json:"kind"`
	SubscriptionID      *string         `json:"subscription_id"`
	CoveredBy           *string         `json:"covered_by"`
	CreatedBy           *string         `json:"created_by"`
	HHAcknowledgedBy    *string         `json:"hh_acknowledged_by"`
	HHAcknowledgedAt    *time.Time      `json:"hh_acknowledged_at"`
	ParentJobID         *string         `json:"parent_job_id"`
	CurrentQuoteID      *string         `json:"current_quote_id"`
	AcceptedAt          *time.Time      `json:"accepted_at"`
	StartedAt           *time.Time      `json:"started_at"`
	CompletedAt         *time.Time      `json:"completed_at"`
	ConfirmedAt         *time.Time      `json:"confirmed_at"`
	CancelledAt         *time.Time      `json:"cancelled_at"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`

	// Attached on detail / list responses
	Images           []string          `json:"images"`
	DistanceMiles    *float64          `json:"distance_miles,omitempty"`
	Quotes           []*QuoteVersion   `json:"quotes,omitempty"`
	InspectionReport *InspectionReport `json:"inspection_report,omitempty"`
	Consumer         *PartyInfo        `json:"consumer,omitempty"`
	Contractor       *PartyInfo        `json:"contractor,omitempty"`
}

type PartyInfo struct {
	ID        string  `json:"id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Phone     *string `json:"phone"`
	AvatarURL *string `json:"avatar_url"`
}

type QuoteVersion struct {
	ID                 string          `json:"id"`
	JobID              string          `json:"job_id"`
	Version            int             `json:"version"`
	LineItems          json.RawMessage `json:"line_items"`
	Adjustments        json.RawMessage `json:"adjustments"`
	Subtotal           float64         `json:"subtotal"`
	Total              float64         `json:"total"`
	PlatformFee        float64         `json:"platform_fee"`
	ContractorNet      float64         `json:"contractor_net"`
	InspectionCredit   float64         `json:"inspection_credit"`
	GeneratedBy        string          `json:"generated_by"`
	InspectionReportID *string         `json:"inspection_report_id"`
	Status             string          `json:"status"`
	DeclineReason      *string         `json:"decline_reason"`
	Note               *string         `json:"note"`
	ValidUntil         *time.Time      `json:"valid_until"`
	RespondedAt        *time.Time      `json:"responded_at"`
	CreatedAt          time.Time       `json:"created_at"`
}

type InspectionReport struct {
	ID                    string          `json:"id"`
	JobID                 string          `json:"job_id"`
	ContractorID          string          `json:"contractor_id"`
	WidthFt               *float64        `json:"width_ft"`
	LengthFt              *float64        `json:"length_ft"`
	HeightFt              *float64        `json:"height_ft"`
	StructureTypeObserved *string         `json:"structure_type_observed"`
	MountingObserved      *string         `json:"mounting_observed"`
	Footings              json.RawMessage `json:"footings"`
	Scope                 []string        `json:"scope"`
	Findings              *string         `json:"findings"`
	Photos                json.RawMessage `json:"photos"`
	PdfURL                *string         `json:"pdf_url"`
	CreatedAt             time.Time       `json:"created_at"`
}

// CreateJobRequest — consumer request form (install or repair) → same fields on the contractor job card
type CreateJobRequest struct {
	ServiceCategory    string           `json:"service_category" binding:"required"`
	QuoteMethod        string           `json:"quote_method" binding:"omitempty,oneof=instant inspection"`
	Title              *string          `json:"title"`
	Description        *string          `json:"description"`
	LocationAddress    *string          `json:"location_address"`
	LocationCity       *string          `json:"location_city"`
	LocationState      *string          `json:"location_state"`
	LocationZip        *string          `json:"location_zip"`
	LocationLat        *float64         `json:"location_lat"`
	LocationLng        *float64         `json:"location_lng"`
	PropertyType       *string          `json:"property_type" binding:"omitempty,oneof=residential commercial hoa government"`
	PreferredStartDate *string          `json:"preferred_start_date"`
	PreferredEndDate   *string          `json:"preferred_end_date"`
	Notes              *string          `json:"notes"`
	Mounting           *string          `json:"mounting" binding:"omitempty,oneof=attached free_standing"`
	WidthFt            *float64         `json:"width_ft"`
	LengthFt           *float64         `json:"length_ft"`
	HeightFt           *float64         `json:"height_ft"`
	PergolaSpec        *json.RawMessage `json:"pergola_spec"`
	Urgency            *string          `json:"urgency" binding:"omitempty,oneof=low medium high"`
	TimeWindow         *string          `json:"time_window"`
	IssueDescription   *string          `json:"issue_description"`
	Images             []string         `json:"images"`
	ParentJobID        *string          `json:"parent_job_id"`
	PergolaID          *string          `json:"pergola_id"`
	OwnerID            *string          `json:"owner_id"` // household member creating on behalf of the owner
	DraftID            *string          `json:"draft_id"` // draft to delete on success
}

type CancelJobRequest struct {
	Reason string  `json:"reason" binding:"required"`
	Text   *string `json:"text"`
}

type DeclineQuoteRequest struct {
	Reason string `json:"reason" binding:"required"`
}

type DeclineJobRequest struct {
	Reason *string `json:"reason"`
}

type InspectionReportRequest struct {
	WidthFt               *float64         `json:"width_ft"`
	LengthFt              *float64         `json:"length_ft"`
	HeightFt              *float64         `json:"height_ft"`
	StructureTypeObserved *string          `json:"structure_type_observed"`
	MountingObserved      *string          `json:"mounting_observed" binding:"omitempty,oneof=attached free_standing"`
	Footings              *json.RawMessage `json:"footings"`
	Scope                 []string         `json:"scope"`
	Findings              *string          `json:"findings"`
	Photos                []struct {
		URL   string `json:"url" binding:"required"`
		Label string `json:"label"`
	} `json:"photos" binding:"required,min=2"`
	PdfURL       *string          `json:"pdf_url"`
	SpecOverride *json.RawMessage `json:"spec_override"`
}

type RequoteRequest struct {
	Adjustments []struct {
		Label  string  `json:"label" binding:"required"`
		Amount float64 `json:"amount" binding:"required"`
	} `json:"adjustments"`
	Note *string `json:"note"`
}
