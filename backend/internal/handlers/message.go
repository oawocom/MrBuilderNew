package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/models"
	"github.com/mrbuilder/backend/internal/utils"
)

type MessageHandler struct {
	DB *sql.DB
}

func NewMessageHandler(db *sql.DB) *MessageHandler {
	return &MessageHandler{DB: db}
}

// POST /jobs/:id/conversation — get or create the conversation for an assigned job
func (h *MessageHandler) GetOrCreate(c *gin.Context) {
	userID := c.GetString("user_id")
	jobID := c.Param("id")

	var consumerID string
	var contractorID *string
	if err := h.DB.QueryRow(`SELECT consumer_id, contractor_id FROM jobs WHERE id=$1`, jobID).Scan(&consumerID, &contractorID); err != nil {
		utils.Error(c, http.StatusNotFound, "Job not found")
		return
	}
	if contractorID == nil {
		utils.Error(c, http.StatusConflict, "Job has no assigned contractor yet")
		return
	}
	if userID != consumerID && userID != *contractorID {
		utils.Error(c, http.StatusForbidden, "You are not a party of this job")
		return
	}

	var conv models.Conversation
	err := h.DB.QueryRow(
		`SELECT id, job_id, consumer_id, contractor_id, is_active, created_at FROM conversations WHERE job_id=$1`,
		jobID,
	).Scan(&conv.ID, &conv.JobID, &conv.ConsumerID, &conv.ContractorID, &conv.IsActive, &conv.CreatedAt)
	if err == sql.ErrNoRows {
		err = h.DB.QueryRow(
			`INSERT INTO conversations (job_id, consumer_id, contractor_id) VALUES ($1, $2, $3)
			 RETURNING id, job_id, consumer_id, contractor_id, is_active, created_at`,
			jobID, consumerID, *contractorID,
		).Scan(&conv.ID, &conv.JobID, &conv.ConsumerID, &conv.ContractorID, &conv.IsActive, &conv.CreatedAt)
	}
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to open conversation")
		return
	}

	utils.Success(c, http.StatusOK, "", conv)
}

// GET /conversations — caller's conversations with last message and unread count
func (h *MessageHandler) List(c *gin.Context) {
	userID := c.GetString("user_id")

	rows, err := h.DB.Query(
		`SELECT cv.id, cv.job_id, cv.consumer_id, cv.contractor_id, cv.is_active, cv.created_at,
		 j.title,
		 CASE WHEN cv.consumer_id=$1 THEN uc.first_name || ' ' || uc.last_name
		      ELSE us.first_name || ' ' || us.last_name END AS other_name,
		 (SELECT content FROM messages m WHERE m.conversation_id=cv.id ORDER BY m.created_at DESC LIMIT 1),
		 (SELECT created_at FROM messages m WHERE m.conversation_id=cv.id ORDER BY m.created_at DESC LIMIT 1),
		 (SELECT COUNT(*) FROM messages m WHERE m.conversation_id=cv.id AND m.is_read=FALSE AND m.sender_id<>$1)
		 FROM conversations cv
		 JOIN jobs j ON j.id = cv.job_id
		 JOIN users uc ON uc.id = cv.contractor_id
		 JOIN users us ON us.id = cv.consumer_id
		 WHERE cv.consumer_id=$1 OR cv.contractor_id=$1
		 ORDER BY COALESCE((SELECT created_at FROM messages m WHERE m.conversation_id=cv.id ORDER BY m.created_at DESC LIMIT 1), cv.created_at) DESC`,
		userID,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list conversations")
		return
	}
	defer rows.Close()

	list := []*models.Conversation{}
	for rows.Next() {
		var cv models.Conversation
		if err := rows.Scan(&cv.ID, &cv.JobID, &cv.ConsumerID, &cv.ContractorID, &cv.IsActive, &cv.CreatedAt,
			&cv.JobTitle, &cv.OtherName, &cv.LastMessage, &cv.LastAt, &cv.UnreadCount); err == nil {
			list = append(list, &cv)
		}
	}
	utils.Success(c, http.StatusOK, "", list)
}

func (h *MessageHandler) memberOf(convID, userID string) (consumerID, contractorID string, ok bool) {
	err := h.DB.QueryRow(
		`SELECT consumer_id, contractor_id FROM conversations WHERE id=$1`, convID,
	).Scan(&consumerID, &contractorID)
	if err != nil {
		return "", "", false
	}
	return consumerID, contractorID, userID == consumerID || userID == contractorID
}

// GET /conversations/:id/messages — paginated, marks incoming as read
func (h *MessageHandler) ListMessages(c *gin.Context) {
	userID := c.GetString("user_id")
	convID := c.Param("id")
	page, limit := utils.Pagination(c)

	if _, _, ok := h.memberOf(convID, userID); !ok {
		utils.Error(c, http.StatusForbidden, "Not your conversation")
		return
	}

	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM messages WHERE conversation_id=$1`, convID).Scan(&total)

	rows, err := h.DB.Query(
		`SELECT id, conversation_id, sender_id, message_type, content, file_url, file_name, file_size,
		 duration_seconds, is_read, created_at
		 FROM messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		convID, limit, (page-1)*limit,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list messages")
		return
	}
	defer rows.Close()

	msgs := []*models.Message{}
	for rows.Next() {
		var m models.Message
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.MessageType, &m.Content,
			&m.FileURL, &m.FileName, &m.FileSize, &m.DurationSeconds, &m.IsRead, &m.CreatedAt); err == nil {
			msgs = append(msgs, &m)
		}
	}

	// Mark messages from the other side as read
	h.DB.Exec(`UPDATE messages SET is_read=TRUE WHERE conversation_id=$1 AND sender_id<>$2 AND is_read=FALSE`, convID, userID)

	utils.Paginated(c, http.StatusOK, msgs, total, page, limit)
}

// POST /conversations/:id/messages
func (h *MessageHandler) Send(c *gin.Context) {
	userID := c.GetString("user_id")
	convID := c.Param("id")

	consumerID, contractorID, ok := h.memberOf(convID, userID)
	if !ok {
		utils.Error(c, http.StatusForbidden, "Not your conversation")
		return
	}

	var req models.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.MessageType == "" {
		req.MessageType = "text"
	}
	if req.MessageType == "text" && (req.Content == nil || *req.Content == "") {
		utils.Error(c, http.StatusBadRequest, "Text message requires content")
		return
	}
	if req.MessageType != "text" && (req.FileURL == nil || *req.FileURL == "") {
		utils.Error(c, http.StatusBadRequest, "File/voice/image message requires file_url")
		return
	}

	var m models.Message
	err := h.DB.QueryRow(
		`INSERT INTO messages (conversation_id, sender_id, message_type, content, file_url, file_name, file_size, duration_seconds)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 RETURNING id, conversation_id, sender_id, message_type, content, file_url, file_name, file_size, duration_seconds, is_read, created_at`,
		convID, userID, req.MessageType, req.Content, req.FileURL, req.FileName, req.FileSize, req.DurationSeconds,
	).Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.MessageType, &m.Content,
		&m.FileURL, &m.FileName, &m.FileSize, &m.DurationSeconds, &m.IsRead, &m.CreatedAt)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to send message")
		return
	}

	// Notify the other party
	recipient := consumerID
	if userID == consumerID {
		recipient = contractorID
	}
	var jobID string
	h.DB.QueryRow(`SELECT job_id FROM conversations WHERE id=$1`, convID).Scan(&jobID)
	h.DB.Exec(
		`INSERT INTO notifications (user_id, notification_type, title, body, job_id)
		 VALUES ($1, 'new_message', 'New message', 'You received a new message', $2)`,
		recipient, jobID,
	)

	utils.Success(c, http.StatusCreated, "Message sent", m)
}
