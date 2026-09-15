package integrations

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/smtp"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var (
	db     *sql.DB
	encKey []byte
	cache  = map[string]cached{}
	mu     sync.Mutex
)

type cached struct {
	cfg     map[string]string
	enabled bool
	at      time.Time
}

// Providers and their fields (secret fields are masked when read back by admins)
var Providers = map[string][]string{
	"stripe":       {"secret_key", "publishable_key", "webhook_secret", "connect_enabled"},
	"smtp":         {"host", "port", "username", "password", "from_email", "from_name", "tls"},
	"twilio":       {"account_sid", "auth_token", "from_number", "messaging_service_sid"},
	"storage":      {"endpoint", "region", "bucket", "access_key", "secret_key", "public_base_url", "use_ssl"},
	"google_oauth": {"client_ids", "client_secret"},
	"apple_oauth":  {"client_id", "team_id", "key_id", "private_key"},
	"push":         {"provider", "expo_access_token", "fcm_server_key"},
	"maps":         {"google_api_key"},
}

func IsSecret(field string) bool {
	f := strings.ToLower(field)
	if f == "publishable_key" {
		return false
	}
	return strings.HasSuffix(f, "_key") || strings.HasSuffix(f, "secret") || strings.HasSuffix(f, "password") || strings.HasSuffix(f, "token") || f == "private_key"
}

func Mask(v string) string {
	if v == "" {
		return ""
	}
	if len(v) <= 4 {
		return "••••"
	}
	return "••••" + v[len(v)-4:]
}

func Init(database *sql.DB, key string) {
	db = database
	if key != "" {
		k := sha256.Sum256([]byte(key))
		encKey = k[:]
	}
}

func Ready() bool { return encKey != nil }

func encrypt(plain []byte) (string, error) {
	if encKey == nil {
		return "", errors.New("SETTINGS_ENC_KEY is not configured on the server")
	}
	block, err := aes.NewCipher(encKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	rand.Read(nonce)
	return base64.StdEncoding.EncodeToString(append(nonce, gcm.Seal(nil, nonce, plain, nil)...)), nil
}

func decrypt(enc string) ([]byte, error) {
	if encKey == nil {
		return nil, errors.New("SETTINGS_ENC_KEY is not configured on the server")
	}
	raw, err := base64.StdEncoding.DecodeString(enc)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(encKey)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(raw) < gcm.NonceSize() {
		return nil, errors.New("ciphertext too short")
	}
	return gcm.Open(nil, raw[:gcm.NonceSize()], raw[gcm.NonceSize():], nil)
}

// Get returns the provider config (decrypted) and whether it is enabled. Cached for 60s.
func Get(provider string) (map[string]string, bool) {
	mu.Lock()
	if c, ok := cache[provider]; ok && time.Since(c.at) < 60*time.Second {
		mu.Unlock()
		return c.cfg, c.enabled
	}
	mu.Unlock()
	var enc *string
	var enabled bool
	if err := db.QueryRow(`SELECT config_enc, is_enabled FROM integration_settings WHERE provider=$1`, provider).Scan(&enc, &enabled); err != nil {
		return map[string]string{}, false
	}
	cfg := map[string]string{}
	if enc != nil && *enc != "" {
		if plain, err := decrypt(*enc); err == nil {
			json.Unmarshal(plain, &cfg)
		}
	}
	mu.Lock()
	cache[provider] = cached{cfg: cfg, enabled: enabled, at: time.Now()}
	mu.Unlock()
	return cfg, enabled
}

// Set merges cfg into the stored config (masked values keep the old value) and stores it encrypted.
func Set(provider string, cfg map[string]string, enabled *bool, by string) error {
	fields, ok := Providers[provider]
	if !ok {
		return errors.New("unknown provider")
	}
	allowed := map[string]bool{}
	for _, f := range fields {
		allowed[f] = true
	}
	cur, curEnabled := Get(provider)
	for k, v := range cfg {
		if !allowed[k] {
			return fmt.Errorf("unknown field %q for %s", k, provider)
		}
		if strings.Contains(v, "••••") {
			continue // masked → keep existing
		}
		cur[k] = strings.TrimSpace(v)
	}
	plain, _ := json.Marshal(cur)
	enc, err := encrypt(plain)
	if err != nil {
		return err
	}
	en := curEnabled
	if enabled != nil {
		en = *enabled
	}
	var byArg interface{} = by
	if by == "" {
		byArg = nil
	}
	_, err = db.Exec(`INSERT INTO integration_settings (provider, config_enc, is_enabled, updated_by, updated_at) VALUES ($1,$2,$3,$4,NOW())
        ON CONFLICT (provider) DO UPDATE SET config_enc=$2, is_enabled=$3, updated_by=$4, updated_at=NOW()`, provider, enc, en, byArg)
	mu.Lock()
	delete(cache, provider)
	mu.Unlock()
	return err
}

func need(provider string, fields ...string) (map[string]string, error) {
	cfg, enabled := Get(provider)
	if !enabled {
		return nil, fmt.Errorf("%s integration is disabled", provider)
	}
	for _, f := range fields {
		if cfg[f] == "" {
			return nil, fmt.Errorf("%s: %s is not configured", provider, f)
		}
	}
	return cfg, nil
}

// ---------- email (SMTP) ----------

func SendEmail(to, subject, htmlBody string) error {
	cfg, err := need("smtp", "host", "port", "from_email")
	if err != nil {
		return err
	}
	from := cfg["from_email"]
	fromHdr := from
	if cfg["from_name"] != "" {
		fromHdr = fmt.Sprintf("%s <%s>", cfg["from_name"], from)
	}
	msg := []byte("From: " + fromHdr + "\r\nTo: " + to + "\r\nSubject: " + subject + "\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n" + htmlBody)
	addr := cfg["host"] + ":" + cfg["port"]
	var auth smtp.Auth
	if cfg["username"] != "" {
		auth = smtp.PlainAuth("", cfg["username"], cfg["password"], cfg["host"])
	}
	if cfg["port"] == "465" || cfg["tls"] == "implicit" {
		conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: cfg["host"]})
		if err != nil {
			return err
		}
		c, err := smtp.NewClient(conn, cfg["host"])
		if err != nil {
			return err
		}
		defer c.Close()
		if auth != nil {
			if err := c.Auth(auth); err != nil {
				return err
			}
		}
		if err := c.Mail(from); err != nil {
			return err
		}
		if err := c.Rcpt(to); err != nil {
			return err
		}
		w, err := c.Data()
		if err != nil {
			return err
		}
		w.Write(msg)
		w.Close()
		return c.Quit()
	}
	return smtp.SendMail(addr, auth, from, []string{to}, msg) // STARTTLS when offered
}

// ---------- SMS (Twilio) ----------

func SendSMS(to, body string) error {
	cfg, err := need("twilio", "account_sid", "auth_token")
	if err != nil {
		return err
	}
	form := url.Values{"To": {to}, "Body": {body}}
	if cfg["messaging_service_sid"] != "" {
		form.Set("MessagingServiceSid", cfg["messaging_service_sid"])
	} else if cfg["from_number"] != "" {
		form.Set("From", cfg["from_number"])
	} else {
		return errors.New("twilio: from_number or messaging_service_sid required")
	}
	req, _ := http.NewRequest("POST", "https://api.twilio.com/2010-04-01/Accounts/"+cfg["account_sid"]+"/Messages.json", strings.NewReader(form.Encode()))
	req.SetBasicAuth(cfg["account_sid"], cfg["auth_token"])
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("twilio %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

// ---------- push (Expo) ----------

type PushMessage struct {
	To    []string               `json:"to"`
	Title string                 `json:"title"`
	Body  string                 `json:"body"`
	Data  map[string]interface{} `json:"data,omitempty"`
	Sound string                 `json:"sound,omitempty"`
}

func SendPush(tokens []string, title, body string, data map[string]interface{}) error {
	if len(tokens) == 0 {
		return nil
	}
	cfg, enabled := Get("push")
	if !enabled {
		return errors.New("push integration is disabled")
	}
	payload, _ := json.Marshal(PushMessage{To: tokens, Title: title, Body: body, Data: data, Sound: "default"})
	req, _ := http.NewRequest("POST", "https://exp.host/--/api/v2/push/send", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	if cfg["expo_access_token"] != "" {
		req.Header.Set("Authorization", "Bearer "+cfg["expo_access_token"])
	}
	resp, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("expo push %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

// ---------- storage (S3-compatible) ----------

func storageClient() (*minio.Client, map[string]string, error) {
	cfg, err := need("storage", "endpoint", "bucket", "access_key", "secret_key")
	if err != nil {
		return nil, nil, err
	}
	ssl := cfg["use_ssl"] != "false"
	cl, err := minio.New(cfg["endpoint"], &minio.Options{Creds: credentials.NewStaticV4(cfg["access_key"], cfg["secret_key"], ""), Secure: ssl, Region: cfg["region"]})
	if err != nil {
		return nil, nil, err
	}
	return cl, cfg, nil
}

// PresignUpload returns a PUT URL the app uploads to directly, plus the public URL to store.
func PresignUpload(key, contentType string) (uploadURL, publicURL string, err error) {
	cl, cfg, err := storageClient()
	if err != nil {
		return "", "", err
	}
	u, err := cl.PresignHeader(context.Background(), "PUT", cfg["bucket"], key, 15*time.Minute, nil, http.Header{"Content-Type": {contentType}})
	if err != nil {
		return "", "", err
	}
	base := strings.TrimRight(cfg["public_base_url"], "/")
	if base == "" {
		scheme := "https"
		if cfg["use_ssl"] == "false" {
			scheme = "http"
		}
		base = scheme + "://" + cfg["endpoint"] + "/" + cfg["bucket"]
	}
	return u.String(), base + "/" + key, nil
}

func StorageTest() error {
	cl, cfg, err := storageClient()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	key := "healthcheck/" + fmt.Sprint(time.Now().Unix()) + ".txt"
	if _, err := cl.PutObject(ctx, cfg["bucket"], key, strings.NewReader("ok"), 2, minio.PutObjectOptions{ContentType: "text/plain"}); err != nil {
		return err
	}
	return cl.RemoveObject(ctx, cfg["bucket"], key, minio.RemoveObjectOptions{})
}

// ---------- Stripe (raw HTTP) ----------

func StripeRequest(method, path string, form url.Values) (map[string]interface{}, error) {
	cfg, err := need("stripe", "secret_key")
	if err != nil {
		return nil, err
	}
	var body io.Reader
	if form != nil {
		body = strings.NewReader(form.Encode())
	}
	req, _ := http.NewRequest(method, "https://api.stripe.com"+path, body)
	req.Header.Set("Authorization", "Bearer "+cfg["secret_key"])
	if form != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}
	resp, err := (&http.Client{Timeout: 20 * time.Second}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var out map[string]interface{}
	b, _ := io.ReadAll(resp.Body)
	json.Unmarshal(b, &out)
	if resp.StatusCode >= 300 {
		msg := string(b)
		if e, ok := out["error"].(map[string]interface{}); ok {
			if m, ok := e["message"].(string); ok {
				msg = m
			}
		}
		return out, fmt.Errorf("stripe %d: %s", resp.StatusCode, msg)
	}
	return out, nil
}

// ---------- Google geocoding ----------

func Geocode(address string) (lat, lng float64, formatted string, err error) {
	cfg, err := need("maps", "google_api_key")
	if err != nil {
		return 0, 0, "", err
	}
	resp, err := (&http.Client{Timeout: 10 * time.Second}).Get("https://maps.googleapis.com/maps/api/geocode/json?address=" + url.QueryEscape(address) + "&key=" + cfg["google_api_key"])
	if err != nil {
		return 0, 0, "", err
	}
	defer resp.Body.Close()
	var out struct {
		Status  string `json:"status"`
		Results []struct {
			Formatted string `json:"formatted_address"`
			Geometry  struct {
				Location struct {
					Lat float64 `json:"lat"`
					Lng float64 `json:"lng"`
				} `json:"location"`
			} `json:"geometry"`
		} `json:"results"`
	}
	json.NewDecoder(resp.Body).Decode(&out)
	if out.Status != "OK" || len(out.Results) == 0 {
		return 0, 0, "", fmt.Errorf("geocode: %s", out.Status)
	}
	r := out.Results[0]
	return r.Geometry.Location.Lat, r.Geometry.Location.Lng, r.Formatted, nil
}
