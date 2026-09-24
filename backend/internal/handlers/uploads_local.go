package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

// Local file storage fallback: when no S3 storage integration is configured, the app PUTs the file to
// /uploads/put/:id?sig=… on our own API; files are written under UPLOAD_DIR and served by nginx at PUBLIC_BASE_URL/files/<key>.
func uploadDir() string {
	if d := os.Getenv("UPLOAD_DIR"); d != "" {
		return d
	}
	return "/data/uploads"
}
func publicBase() string {
	if b := os.Getenv("PUBLIC_BASE_URL"); b != "" {
		return strings.TrimRight(b, "/")
	}
	return "https://new.mrbuilder.com"
}
func uploadSig(id string) string {
	m := hmac.New(sha256.New, []byte(os.Getenv("JWT_SECRET")+"upload"))
	m.Write([]byte(id))
	return hex.EncodeToString(m.Sum(nil))[:32]
}
func localUploadURLs(id, key string) (string, string) {
	return fmt.Sprintf("%s/api/v1/uploads/put/%s?sig=%s", publicBase(), id, uploadSig(id)), publicBase() + "/files/" + key
}

// PUT /uploads/put/:id?sig= — body is the raw file
func (h *IntegrationsHandler) PutLocalUpload(c *gin.Context) {
	id := c.Param("id")
	if !hmac.Equal([]byte(c.Query("sig")), []byte(uploadSig(id))) {
		utils.Error(c, http.StatusForbidden, "Bad signature")
		return
	}
	var key string
	var done bool
	if err := h.DB.QueryRow(`SELECT object_key, COALESCE(uploaded_at IS NOT NULL,false) FROM uploads WHERE id=$1`, id).Scan(&key, &done); err != nil {
		utils.Error(c, http.StatusNotFound, "Unknown upload")
		return
	}
	if done {
		utils.Error(c, http.StatusConflict, "Already uploaded")
		return
	}
	if strings.Contains(key, "..") {
		utils.Error(c, http.StatusBadRequest, "Bad key")
		return
	}
	dst := filepath.Join(uploadDir(), filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Storage error")
		return
	}
	f, err := os.Create(dst)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Storage error")
		return
	}
	defer f.Close()
	n, err := io.Copy(f, io.LimitReader(c.Request.Body, 25*1024*1024+1))
	if err != nil || n > 25*1024*1024 {
		os.Remove(dst)
		utils.Error(c, http.StatusBadRequest, "Upload failed or too large (max 25 MB)")
		return
	}
	h.DB.Exec(`UPDATE uploads SET size_bytes=$2, uploaded_at=NOW() WHERE id=$1`, id, n)
	c.Status(http.StatusOK)
}
