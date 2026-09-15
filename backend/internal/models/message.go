package models

import "time"

type Conversation struct {
	ID           string     `json:"id"`
	JobID        string     `json:"job_id"`
	ConsumerID   string     `json:"consumer_id"`
	ContractorID string     `json:"contractor_id"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	JobTitle     string     `json:"job_title,omitempty"`
	OtherName    string     `json:"other_name,omitempty"`
	LastMessage  *string    `json:"last_message,omitempty"`
	LastAt       *time.Time `json:"last_message_at,omitempty"`
	UnreadCount  int        `json:"unread_count"`
}

type Message struct {
	ID              string    `json:"id"`
	ConversationID  string    `json:"conversation_id"`
	SenderID        string    `json:"sender_id"`
	MessageType     string    `json:"message_type"`
	Content         *string   `json:"content"`
	FileURL         *string   `json:"file_url"`
	FileName        *string   `json:"file_name"`
	FileSize        *int      `json:"file_size"`
	DurationSeconds *int      `json:"duration_seconds"`
	IsRead          bool      `json:"is_read"`
	CreatedAt       time.Time `json:"created_at"`
}

type SendMessageRequest struct {
	MessageType     string  `json:"message_type" binding:"omitempty,oneof=text voice file image"`
	Content         *string `json:"content"`
	FileURL         *string `json:"file_url"`
	FileName        *string `json:"file_name"`
	FileSize        *int    `json:"file_size"`
	DurationSeconds *int    `json:"duration_seconds"`
}
