package models

import "time"

type JobQuote struct {
	ID           string     `json:"id"`
	JobID        string     `json:"job_id"`
	ContractorID string     `json:"contractor_id"`
	Amount       float64    `json:"amount"`
	Title        *string    `json:"title"`
	Description  *string    `json:"description"`
	LineItems    *string    `json:"line_items,omitempty"` // raw JSON
	Status       string     `json:"status"`
	IsRead       bool       `json:"is_read"`
	ValidUntil   *time.Time `json:"valid_until"`
	AcceptedAt   *time.Time `json:"accepted_at"`
	RejectedAt   *time.Time `json:"rejected_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type CreateQuoteRequest struct {
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	Title       *string `json:"title"`
	Description *string `json:"description"`
	LineItems   *string `json:"line_items"` // JSON string, optional
	ValidUntil  *string `json:"valid_until"`
}

type Invoice struct {
	ID                      string     `json:"id"`
	JobID                   string     `json:"job_id"`
	QuoteID                 *string    `json:"quote_id"`
	ConsumerID              string     `json:"consumer_id"`
	ContractorID            string     `json:"contractor_id"`
	Amount                  float64    `json:"amount"`
	Description             *string    `json:"description"`
	Status                  string     `json:"status"`
	IsRead                  bool       `json:"is_read"`
	StripePaymentIntentID   *string    `json:"stripe_payment_intent_id"`
	StripeCheckoutSessionID *string    `json:"stripe_checkout_session_id"`
	PaidAt                  *time.Time `json:"paid_at"`
	CancelledAt             *time.Time `json:"cancelled_at"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
}
