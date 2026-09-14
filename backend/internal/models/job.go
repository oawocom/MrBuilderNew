package models

import "time"

type Job struct {
	ID                 string     `json:"id"`
	ConsumerID         string     `json:"consumer_id"`
	ContractorID       *string    `json:"contractor_id"`
	Title              string     `json:"title"`
	Description        *string    `json:"description"`
	JobType            string     `json:"job_type"`
	Status             string     `json:"status"`
	LocationAddress    *string    `json:"location_address"`
	LocationCity       *string    `json:"location_city"`
	LocationState      *string    `json:"location_state"`
	LocationZip        *string    `json:"location_zip"`
	LocationLat        *float64   `json:"location_lat"`
	LocationLng        *float64   `json:"location_lng"`
	PreferredStartDate *string    `json:"preferred_start_date"`
	PreferredEndDate   *string    `json:"preferred_end_date"`
	PaymentAmount      *float64   `json:"payment_amount"`
	StructureType      *string    `json:"structure_type"`
	BuildingType       *string    `json:"building_type"`
	MainProduct        *string    `json:"main_product"`
	SideEnclosure      *string    `json:"side_enclosure"`
	WidthFt            *float64   `json:"width_ft"`
	LengthFt           *float64   `json:"length_ft"`
	HeightFt           *float64   `json:"height_ft"`
	Images             []string   `json:"images"`
	AcceptedAt         *time.Time `json:"accepted_at"`
	StartedAt          *time.Time `json:"started_at"`
	CompletedAt        *time.Time `json:"completed_at"`
	ConfirmedAt        *time.Time `json:"confirmed_at"`
	CancelledAt        *time.Time `json:"cancelled_at"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type CreateJobRequest struct {
	Title              string   `json:"title" binding:"required"`
	Description        *string  `json:"description"`
	JobType            string   `json:"job_type" binding:"required,oneof=installation maintenance repair inspection"`
	LocationAddress    *string  `json:"location_address"`
	LocationCity       *string  `json:"location_city"`
	LocationState      *string  `json:"location_state"`
	LocationZip        *string  `json:"location_zip"`
	LocationLat        *float64 `json:"location_lat"`
	LocationLng        *float64 `json:"location_lng"`
	PreferredStartDate *string  `json:"preferred_start_date"`
	PreferredEndDate   *string  `json:"preferred_end_date"`
	PaymentAmount      *float64 `json:"payment_amount"`
	StructureType      *string  `json:"structure_type" binding:"omitempty,oneof=attached free_standing"`
	BuildingType       *string  `json:"building_type" binding:"omitempty,oneof=residential commercial government"`
	MainProduct        *string  `json:"main_product"`
	SideEnclosure      *string  `json:"side_enclosure"`
	WidthFt            *float64 `json:"width_ft"`
	LengthFt           *float64 `json:"length_ft"`
	HeightFt           *float64 `json:"height_ft"`
	Images             []string `json:"images"`
}

type CancelJobRequest struct {
	Reason string `json:"reason" binding:"required"`
}
