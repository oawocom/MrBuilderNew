package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/models"
	"github.com/mrbuilder/backend/internal/utils"
)

// Chat between the consumer and the assigned contractor of a job.
// Response shapes follow the mobile apps: conversations carry `other`, `last_message`, `unread`,
// messages carry `body` (+ `content` for older clients) and `read_at`.

type MessageHandler struct {
	DB *sql.DB
}

func NewMessageHandler(db *sql.DB) *MessageHandler {
	return &MessageHandler{DB: db}
}

// Job statuses in which the chat stays open.
const chatClosedStatuses = `('completed_paid','dispute_upheld','cancelled_by_client','cancelled_by_contractor','quote_declined','expired')`

// ensureConversations creates the missing conversation rows for every assigned job of the user and
// re-points a conversation to the current contractor after a reassignment.
func (h *MessageHandler) ensureConversations(userID string) {
	h.DB.Exec(`UPDATE conversations cv SET contractor_id=j.contractor_id FROM jobs j
        WHERE j.id=cv.job_id AND j.contractor_id IS NOT NULL AND cv.contractor_id<>j.contractor_id AND (j.consumer_id=$1 OR j.contractor_id=$1)`, userID)
	h.DB.Exec(`INSERT INTO conversations (job_id, consumer_id, contractor_id)
        SELECT j.id, j.consumer_id, j.contractor_id FROM jobs j
        WHERE (j.consumer_id=$1 OR j.contractor_id=$1) AND j.contractor_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM conversations cv WHERE cv.job_id=j.id)`, userID)
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
	} else if err == nil && conv.ContractorID != *contractorID {
		h.DB.Exec(`UPDATE conversations SET contractor_id=$1 WHERE id=$2`, *contractorID, conv.ID)
		conv.ContractorID = *contractorID
	}
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to open conversation")
		return
	}

	utils.Success(c, http.StatusOK, "", conv)
}

// GET /conversations — caller's conversations with the other party, last message and unread count
func (h *MessageHandler) List(c *gin.Context) {
	userID := c.GetString("user_id")
	h.ensureConversations(userID)

	rows, err := h.DB.Query(
		`SELECT cv.id, cv.job_id, cv.is_active, cv.created_at, j.title, j.request_code, j.status::text,
		 CASE WHEN cv.consumer_id=$1 THEN uc.id ELSE us.id END,
		 CASE WHEN cv.consumer_id=$1 THEN uc.first_name ELSE us.first_name END,
		 CASE WHEN cv.consumer_id=$1 THEN uc.last_name ELSE us.last_name END,
		 CASE WHEN cv.consumer_id=$1 THEN uc.avatar_url ELSE us.avatar_url END,
		 lm.content, lm.file_url, lm.created_at, lm.sender_id,
		 (SELECT COUNT(*) FROM messages m WHERE m.conversation_id=cv.id AND m.is_read=FALSE AND m.sender_id<>$1)
		 FROM conversations cv
		 JOIN jobs j ON j.id = cv.job_id
		 JOIN users uc ON uc.id = cv.contractor_id
		 JOIN users us ON us.id = cv.consumer_id
		 LEFT JOIN LATERAL (SELECT content, file_url, created_at, sender_id FROM messages m WHERE m.conversation_id=cv.id ORDER BY m.created_at DESC LIMIT 1) lm ON TRUE
		 WHERE cv.consumer_id=$1 OR cv.contractor_id=$1
		 ORDER BY COALESCE(lm.created_at, cv.created_at) DESC`,
		userID,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list conversations")
		return
	}
	defer rows.Close()

	list := []gin.H{}
	for rows.Next() {
		var id, jobID, title, status, oid, first, lastName string
		var code, avatar, lmContent, lmFile, lmSender *string
		var lmAt *time.Time
		var active bool
		var created time.Time
		var unread int
		if err := rows.Scan(&id, &jobID, &active, &created, &title, &code, &status, &oid, &first, &lastName, &avatar, &lmContent, &lmFile, &lmAt, &lmSender, &unread); err != nil {
			continue
		}
		closed := jobStatusClosed(status)
		var last gin.H
		updated := created
		if lmAt != nil {
			body := strOr(lmContent, "")
			if body == "" && lmFile != nil {
				body = "📎 Attachment"
			}
			last = gin.H{"body": body, "created_at": *lmAt, "sender_id": strOr(lmSender, "")}
			updated = *lmAt
		}
		list = append(list, gin.H{
			"id": id, "job_id": jobID, "job_title": title, "request_code": code, "job_status": status,
			"other":        gin.H{"id": oid, "first_name": first, "last_name": lastName, "avatar_url": avatar},
			"last_message": last, "unread": unread, "is_active": active && !closed, "closed": closed, "updated_at": updated,
		})
	}
	utils.Success(c, http.StatusOK, "", list)
}

func jobStatusClosed(status string) bool {
	switch status {
	case "completed_paid", "dispute_upheld", "cancelled_by_client", "cancelled_by_contractor", "quote_declined", "expired":
		return true
	}
	return false
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

func (h *MessageHandler) convClosed(convID string) bool {
	var status string
	if h.DB.QueryRow(`SELECT j.status::text FROM conversations cv JOIN jobs j ON j.id=cv.job_id WHERE cv.id=$1`, convID).Scan(&status) != nil {
		return false
	}
	return jobStatusClosed(status)
}

func messageJSON(id, convID, sender, mtype string, content, fileURL, fileName *string, fileSize, duration *int, read bool, at time.Time) gin.H {
	body := strOr(content, "")
	var attachments []gin.H
	if fileURL != nil && *fileURL != "" {
		attachments = []gin.H{{"url": *fileURL, "kind": mtype, "name": fileName, "size": fileSize, "duration_seconds": duration}}
	}
	var readAt *time.Time
	if read {
		readAt = &at
	}
	return gin.H{"id": id, "conversation_id": convID, "sender_id": sender, "message_type": mtype, "body": body, "content": body,
		"attachments": attachments, "file_url": fileURL, "is_read": read, "read_at": readAt, "created_at": at}
}

// GET /conversations/:id/messages — oldest first; marks incoming as read
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
		`SELECT id, conversation_id, sender_id, message_type::text, content, file_url, file_name, file_size,
		 duration_seconds, is_read, created_at
		 FROM (SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3) x ORDER BY created_at ASC`,
		convID, limit, (page-1)*limit,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list messages")
		return
	}
	defer rows.Close()

	msgs := []gin.H{}
	for rows.Next() {
		var id, cid, sender, mtype string
		var content, fileURL, fileName *string
		var fileSize, duration *int
		var read bool
		var at time.Time
		if err := rows.Scan(&id, &cid, &sender, &mtype, &content, &fileURL, &fileName, &fileSize, &duration, &read, &at); err == nil {
			msgs = append(msgs, messageJSON(id, cid, sender, mtype, content, fileURL, fileName, fileSize, duration, read, at))
		}
	}

	// Mark messages from the other side as read
	h.DB.Exec(`UPDATE messages SET is_read=TRUE WHERE conversation_id=$1 AND sender_id<>$2 AND is_read=FALSE`, convID, userID)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": msgs, "meta": gin.H{"total": total, "page": page, "limit": limit, "closed": h.convClosed(convID)}})
}

type sendMessageReq struct {
	Body            *string `json:"body"`
	Content         *string `json:"content"`
	MessageType     string  `json:"message_type"`
	FileURL         *string `json:"file_url"`
	FileName        *string `json:"file_name"`
	FileSize        *int    `json:"file_size"`
	DurationSeconds *int    `json:"duration_seconds"`
	Attachments     []struct {
		URL  string `json:"url"`
		Kind string `json:"kind"`
		Name string `json:"name"`
	} `json:"attachments"`
}

// POST /conversations/:id/messages — accepts {body} (apps) or {content, message_type, file_url} (older clients)
func (h *MessageHandler) Send(c *gin.Context) {
	userID := c.GetString("user_id")
	convID := c.Param("id")

	consumerID, contractorID, ok := h.memberOf(convID, userID)
	if !ok {
		utils.Error(c, http.StatusForbidden, "Not your conversation")
		return
	}
	if h.convClosed(convID) {
		utils.Error(c, http.StatusConflict, "This chat is closed — the request is no longer active")
		return
	}

	var req sendMessageReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	content := req.Content
	if req.Body != nil && *req.Body != "" {
		content = req.Body
	}
	if len(req.Attachments) > 0 && (req.FileURL == nil || *req.FileURL == "") {
		a := req.Attachments[0]
		req.FileURL = &a.URL
		if a.Name != "" {
			req.FileName = &a.Name
		}
		if req.MessageType == "" {
			if a.Kind == "image" || a.Kind == "voice" {
				req.MessageType = a.Kind
			} else {
				req.MessageType = "file"
			}
		}
	}
	if req.MessageType == "" {
		req.MessageType = "text"
	}
	if req.MessageType == "text" && (content == nil || *content == "") {
		utils.Error(c, http.StatusBadRequest, "Message can't be empty")
		return
	}
	if req.MessageType != "text" && (req.FileURL == nil || *req.FileURL == "") {
		utils.Error(c, http.StatusBadRequest, "File/voice/image message requires file_url")
		return
	}

	var id, cid, sender, mtype string
	var outContent, fileURL, fileName *string
	var fileSize, duration *int
	var read bool
	var at time.Time
	err := h.DB.QueryRow(
		`INSERT INTO messages (conversation_id, sender_id, message_type, content, file_url, file_name, file_size, duration_seconds)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 RETURNING id, conversation_id, sender_id, message_type::text, content, file_url, file_name, file_size, duration_seconds, is_read, created_at`,
		convID, userID, req.MessageType, content, req.FileURL, req.FileName, req.FileSize, req.DurationSeconds,
	).Scan(&id, &cid, &sender, &mtype, &outContent, &fileURL, &fileName, &fileSize, &duration, &read, &at)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to send message")
		return
	}

	// Notify the other party (push/in-app via notify, which respects the app's deep links)
	recipient := consumerID
	target := "requestDetail"
	if userID == consumerID {
		recipient = contractorID
		target = "job"
	}
	var jobID string
	var code *string
	h.DB.QueryRow(`SELECT cv.job_id, j.request_code FROM conversations cv JOIN jobs j ON j.id=cv.job_id WHERE cv.id=$1`, convID).Scan(&jobID, &code)
	preview := strOr(outContent, "Sent an attachment")
	if len(preview) > 80 {
		preview = preview[:77] + "…"
	}
	notify(h.DB, recipient, "new_message", "New message · "+strOr(code, "MrBuilder"), preview, jobID, target, gin.H{"conversation_id": convID})

	utils.Success(c, http.StatusCreated, "Message sent", messageJSON(id, cid, sender, mtype, outContent, fileURL, fileName, fileSize, duration, read, at))
}
