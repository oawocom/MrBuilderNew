package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/integrations"
	"github.com/mrbuilder/backend/internal/utils"
)

type PaymentsHandler struct {
	DB *sql.DB
}

func NewPaymentsHandler(db *sql.DB) *PaymentsHandler {
	return &PaymentsHandler{DB: db}
}

func stripeEnabled() bool {
	_, on := integrations.Get("stripe")
	return on
}

func cents(f float64) string { return strconv.FormatInt(int64(f*100+0.5), 10) }

// ensureStripeCustomer returns the Stripe customer id for a user, creating it if needed.
func ensureStripeCustomer(db *sql.DB, userID string) (string, error) {
	var cust *string
	var email, first, last string
	if err := db.QueryRow(`SELECT stripe_customer_id, email, first_name, last_name FROM users WHERE id=$1`, userID).Scan(&cust, &email, &first, &last); err != nil {
		return "", err
	}
	if cust != nil && *cust != "" {
		return *cust, nil
	}
	out, err := integrations.StripeRequest("POST", "/v1/customers", url.Values{"email": {email}, "name": {first + " " + last}, "metadata[user_id]": {userID}})
	if err != nil {
		return "", err
	}
	id, _ := out["id"].(string)
	db.Exec(`UPDATE users SET stripe_customer_id=$1 WHERE id=$2`, id, userID)
	return id, nil
}

// defaultStripePM returns the user's default saved Stripe payment method.
func defaultStripePM(db *sql.DB, userID string) (string, error) {
	var pm *string
	db.QueryRow(`SELECT stripe_payment_method_id FROM payment_methods WHERE user_id=$1 AND stripe_payment_method_id IS NOT NULL ORDER BY is_default DESC, created_at LIMIT 1`, userID).Scan(&pm)
	if pm == nil || *pm == "" {
		return "", fmt.Errorf("no saved card — add a payment method first")
	}
	return *pm, nil
}

// ChargeCustomer creates and confirms an off-session PaymentIntent. Returns the intent id.
// When Stripe is disabled it returns "" and nil so flows keep working in simulated mode.
func ChargeCustomer(db *sql.DB, userID string, amount float64, description string, meta map[string]string) (string, error) {
	if !stripeEnabled() || amount <= 0 {
		return "", nil
	}
	cust, err := ensureStripeCustomer(db, userID)
	if err != nil {
		return "", err
	}
	pm, err := defaultStripePM(db, userID)
	if err != nil {
		return "", err
	}
	form := url.Values{"amount": {cents(amount)}, "currency": {"usd"}, "customer": {cust}, "payment_method": {pm}, "confirm": {"true"}, "off_session": {"true"}, "description": {description}}
	for k, v := range meta {
		form.Set("metadata["+k+"]", v)
	}
	out, err := integrations.StripeRequest("POST", "/v1/payment_intents", form)
	if err != nil {
		return "", err
	}
	id, _ := out["id"].(string)
	if st, _ := out["status"].(string); st != "succeeded" && st != "processing" {
		return id, fmt.Errorf("payment %s", st)
	}
	return id, nil
}

// RefundPayment refunds a PaymentIntent (full or partial).
func RefundPayment(intentID string, amount float64) (string, error) {
	if !stripeEnabled() || intentID == "" {
		return "", nil
	}
	form := url.Values{"payment_intent": {intentID}}
	if amount > 0 {
		form.Set("amount", cents(amount))
	}
	out, err := integrations.StripeRequest("POST", "/v1/refunds", form)
	if err != nil {
		return "", err
	}
	id, _ := out["id"].(string)
	return id, nil
}

// TransferToContractor sends a Connect transfer for a payout. Returns transfer id.
func TransferToContractor(db *sql.DB, contractorID string, amount float64, payoutID string) (string, error) {
	if !stripeEnabled() {
		return "", fmt.Errorf("stripe disabled")
	}
	var acct *string
	var enabled bool
	db.QueryRow(`SELECT stripe_account_id, stripe_payouts_enabled FROM contractor_profiles WHERE user_id=$1`, contractorID).Scan(&acct, &enabled)
	if acct == nil || *acct == "" || !enabled {
		return "", fmt.Errorf("contractor has not completed Stripe onboarding")
	}
	out, err := integrations.StripeRequest("POST", "/v1/transfers", url.Values{"amount": {cents(amount)}, "currency": {"usd"}, "destination": {*acct}, "metadata[payout_id]": {payoutID}})
	if err != nil {
		return "", err
	}
	id, _ := out["id"].(string)
	return id, nil
}

// ---------- cards ----------

// POST /payments/setup-intent — client confirms with Stripe SDK, then calls /payment-methods/attach
func (h *PaymentsHandler) SetupIntent(c *gin.Context) {
	userID := c.GetString("user_id")
	cfg, on := integrations.Get("stripe")
	if !on {
		utils.Error(c, http.StatusServiceUnavailable, "Card payments are not enabled yet")
		return
	}
	cust, err := ensureStripeCustomer(h.DB, userID)
	if err != nil {
		utils.Error(c, http.StatusBadGateway, err.Error())
		return
	}
	out, err := integrations.StripeRequest("POST", "/v1/setup_intents", url.Values{"customer": {cust}, "usage": {"off_session"}, "payment_method_types[]": {"card"}})
	if err != nil {
		utils.Error(c, http.StatusBadGateway, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "", gin.H{"client_secret": out["client_secret"], "publishable_key": cfg["publishable_key"], "customer_id": cust})
}

// POST /payment-methods/attach {payment_method_id} — after SetupIntent succeeded on the client
func (h *PaymentsHandler) AttachPaymentMethod(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		PaymentMethodID string `json:"payment_method_id" binding:"required"`
		IsDefault       bool   `json:"is_default"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	out, err := integrations.StripeRequest("GET", "/v1/payment_methods/"+req.PaymentMethodID, nil)
	if err != nil {
		utils.Error(c, http.StatusBadGateway, err.Error())
		return
	}
	card, _ := out["card"].(map[string]interface{})
	brand, _ := card["brand"].(string)
	last4, _ := card["last4"].(string)
	expM, _ := card["exp_month"].(float64)
	expY, _ := card["exp_year"].(float64)
	var count int
	h.DB.QueryRow(`SELECT COUNT(*) FROM payment_methods WHERE user_id=$1`, userID).Scan(&count)
	def := req.IsDefault || count == 0
	if def {
		h.DB.Exec(`UPDATE payment_methods SET is_default=FALSE WHERE user_id=$1`, userID)
		if cust, err := ensureStripeCustomer(h.DB, userID); err == nil {
			integrations.StripeRequest("POST", "/v1/customers/"+cust, url.Values{"invoice_settings[default_payment_method]": {req.PaymentMethodID}})
		}
	}
	var id string
	if err := h.DB.QueryRow(`INSERT INTO payment_methods (user_id, method_type, card_brand, card_last_four, exp_month, exp_year, is_default, stripe_payment_method_id, label)
        VALUES ($1,'credit_card',$2,$3,$4,$5,$6,$7,$8) RETURNING id`, userID, brand, last4, int(expM), int(expY), def, req.PaymentMethodID, strings.Title(brand)+" •••• "+last4).Scan(&id); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to save card: "+err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "Card saved", gin.H{"id": id, "brand": brand, "last4": last4, "is_default": def})
}

// ---------- Connect (contractor payouts) ----------

// POST /payouts/connect — create Express account if needed and return an onboarding link
func (h *PaymentsHandler) ConnectOnboard(c *gin.Context) {
	userID := c.GetString("user_id")
	if !stripeEnabled() {
		utils.Error(c, http.StatusServiceUnavailable, "Payouts via Stripe are not enabled yet")
		return
	}
	var acct *string
	var email string
	h.DB.QueryRow(`SELECT cp.stripe_account_id, u.email FROM users u LEFT JOIN contractor_profiles cp ON cp.user_id=u.id WHERE u.id=$1`, userID).Scan(&acct, &email)
	if acct == nil || *acct == "" {
		out, err := integrations.StripeRequest("POST", "/v1/accounts", url.Values{"type": {"express"}, "email": {email}, "capabilities[transfers][requested]": {"true"}, "metadata[user_id]": {userID}})
		if err != nil {
			utils.Error(c, http.StatusBadGateway, err.Error())
			return
		}
		id, _ := out["id"].(string)
		acct = &id
		h.DB.Exec(`UPDATE contractor_profiles SET stripe_account_id=$1 WHERE user_id=$2`, id, userID)
	}
	base := GetSettingString(h.DB, "web_base_url", "https://new.mrbuilder.com")
	out, err := integrations.StripeRequest("POST", "/v1/account_links", url.Values{"account": {*acct}, "type": {"account_onboarding"}, "refresh_url": {base + "/profile/contractor?connect=refresh"}, "return_url": {base + "/profile/contractor?connect=done"}})
	if err != nil {
		utils.Error(c, http.StatusBadGateway, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "", gin.H{"url": out["url"], "account_id": *acct})
}

// GET /payouts/connect/status
func (h *PaymentsHandler) ConnectStatus(c *gin.Context) {
	userID := c.GetString("user_id")
	var acct *string
	var enabled bool
	h.DB.QueryRow(`SELECT stripe_account_id, stripe_payouts_enabled FROM contractor_profiles WHERE user_id=$1`, userID).Scan(&acct, &enabled)
	if acct != nil && *acct != "" && !enabled && stripeEnabled() {
		if out, err := integrations.StripeRequest("GET", "/v1/accounts/"+*acct, nil); err == nil {
			if pe, _ := out["payouts_enabled"].(bool); pe {
				enabled = true
				h.DB.Exec(`UPDATE contractor_profiles SET stripe_payouts_enabled=TRUE, stripe_onboarded_at=NOW() WHERE user_id=$1`, userID)
			}
		}
	}
	utils.Success(c, http.StatusOK, "", gin.H{"stripe_enabled": stripeEnabled(), "has_account": acct != nil && *acct != "", "payouts_enabled": enabled})
}

// ---------- webhook ----------

func verifyStripeSignature(payload []byte, header, secret string) bool {
	var ts, sig string
	for _, part := range strings.Split(header, ",") {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) != 2 {
			continue
		}
		if kv[0] == "t" {
			ts = kv[1]
		} else if kv[0] == "v1" && sig == "" {
			sig = kv[1]
		}
	}
	if ts == "" || sig == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(ts + "."))
	mac.Write(payload)
	return hmac.Equal([]byte(hex.EncodeToString(mac.Sum(nil))), []byte(sig))
}

// POST /webhooks/stripe
func (h *PaymentsHandler) Webhook(c *gin.Context) {
	cfg, on := integrations.Get("stripe")
	if !on {
		c.Status(http.StatusServiceUnavailable)
		return
	}
	body, _ := io.ReadAll(c.Request.Body)
	if cfg["webhook_secret"] != "" && !verifyStripeSignature(body, c.GetHeader("Stripe-Signature"), cfg["webhook_secret"]) {
		c.Status(http.StatusBadRequest)
		return
	}
	var ev struct {
		Type string `json:"type"`
		Data struct {
			Object map[string]interface{} `json:"object"`
		} `json:"data"`
	}
	if json.Unmarshal(body, &ev) != nil {
		c.Status(http.StatusBadRequest)
		return
	}
	obj := ev.Data.Object
	id, _ := obj["id"].(string)
	switch ev.Type {
	case "payment_intent.succeeded":
		h.DB.Exec(`UPDATE transactions SET status='completed' WHERE stripe_payment_intent_id=$1 AND status='pending'`, id)
		h.DB.Exec(`UPDATE invoices SET status='paid', paid_at=COALESCE(paid_at,NOW()) WHERE stripe_payment_intent_id=$1`, id)
		h.DB.Exec(`UPDATE supply_orders SET status='paid', paid_at=COALESCE(paid_at,NOW()) WHERE stripe_payment_intent_id=$1 AND status='pending'`, id)
	case "payment_intent.payment_failed":
		h.DB.Exec(`UPDATE transactions SET status='failed' WHERE stripe_payment_intent_id=$1 AND status='pending'`, id)
	case "account.updated":
		if pe, _ := obj["payouts_enabled"].(bool); pe {
			h.DB.Exec(`UPDATE contractor_profiles SET stripe_payouts_enabled=TRUE, stripe_onboarded_at=COALESCE(stripe_onboarded_at,NOW()) WHERE stripe_account_id=$1`, id)
		}
	case "charge.refunded":
		if pi, ok := obj["payment_intent"].(string); ok {
			h.DB.Exec(`UPDATE transactions SET status='refunded' WHERE stripe_payment_intent_id=$1`, pi)
		}
	}
	c.JSON(http.StatusOK, gin.H{"received": true, "at": time.Now()})
}
