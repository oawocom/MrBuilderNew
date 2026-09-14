package models

import "time"

type ConsumerProfile struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	AddressLine1 *string   `json:"address_line1"`
	AddressLine2 *string   `json:"address_line2"`
	City         *string   `json:"city"`
	State        *string   `json:"state"`
	ZipCode      *string   `json:"zip_code"`
	Country      *string   `json:"country"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type ContractorProfile struct {
	ID                      string    `json:"id"`
	UserID                  string    `json:"user_id"`
	Role                    string    `json:"role"`
	BusinessName            *string   `json:"business_name"`
	BusinessType            *string   `json:"business_type"`
	YearsOfExperience       *int      `json:"years_of_experience"`
	ProfessionalTitle       *string   `json:"professional_title"`
	HourlyRate              *float64  `json:"hourly_rate"`
	Bio                     *string   `json:"bio"`
	AddressLine1            *string   `json:"address_line1"`
	AddressLine2            *string   `json:"address_line2"`
	City                    *string   `json:"city"`
	State                   *string   `json:"state"`
	ZipCode                 *string   `json:"zip_code"`
	Country                 *string   `json:"country"`
	InsuranceCertificateURL *string   `json:"insurance_certificate_url"`
	ContractorLicenseURL    *string   `json:"contractor_license_url"`
	BackgroundCheckPassed   bool      `json:"background_check_passed"`
	RatingAvg               float64   `json:"rating_avg"`
	JobsCompleted           int       `json:"jobs_completed"`
	IsVerified              bool      `json:"is_verified"`
	Skills                  []string  `json:"skills"`
	PergolaSystems          []string  `json:"pergola_systems"`
	CreatedAt               time.Time `json:"created_at"`
	UpdatedAt               time.Time `json:"updated_at"`
}

type UpdateConsumerProfileRequest struct {
	AddressLine1 *string `json:"address_line1"`
	AddressLine2 *string `json:"address_line2"`
	City         *string `json:"city"`
	State        *string `json:"state"`
	ZipCode      *string `json:"zip_code"`
	Country      *string `json:"country"`
}

type UpdateContractorProfileRequest struct {
	Role              *string  `json:"role" binding:"omitempty,oneof=inspector service_team installation_team"`
	BusinessName      *string  `json:"business_name"`
	BusinessType      *string  `json:"business_type" binding:"omitempty,oneof=sole_proprietor llc corporation partnership"`
	YearsOfExperience *int     `json:"years_of_experience"`
	ProfessionalTitle *string  `json:"professional_title"`
	HourlyRate        *float64 `json:"hourly_rate"`
	Bio               *string  `json:"bio"`
	AddressLine1      *string  `json:"address_line1"`
	AddressLine2      *string  `json:"address_line2"`
	City              *string  `json:"city"`
	State             *string  `json:"state"`
	ZipCode           *string  `json:"zip_code"`
	Country           *string  `json:"country"`
}

type UpdateListRequest struct {
	Items []string `json:"items" binding:"required"`
}
