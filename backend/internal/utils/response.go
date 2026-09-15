package utils

import "github.com/gin-gonic/gin"

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func Success(c *gin.Context, code int, message string, data interface{}) {
	c.JSON(code, APIResponse{Success: true, Message: message, Data: data})
}

func Error(c *gin.Context, code int, err string) {
	c.JSON(code, APIResponse{Success: false, Error: err})
}

func Paginated(c *gin.Context, code int, data interface{}, total int64, page, limit int) {
	c.JSON(code, gin.H{
		"success": true,
		"data":    data,
		"meta": gin.H{
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}
