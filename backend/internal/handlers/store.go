package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/mrbuilder/backend/internal/utils"
)

type StoreHandler struct {
	DB *sql.DB
}

func NewStoreHandler(db *sql.DB) *StoreHandler {
	return &StoreHandler{DB: db}
}

// ---------- catalogue ----------

// GET /store/categories
func (h *StoreHandler) Categories(c *gin.Context) {
	rows, err := h.DB.Query(`SELECT c.slug, c.name, c.image_url, (SELECT COUNT(*) FROM supply_products p WHERE p.category=c.slug AND p.is_active)
        FROM supply_categories c WHERE c.is_active ORDER BY c.sort_order`)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load categories")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var slug, name string
		var img *string
		var n int
		if rows.Scan(&slug, &name, &img, &n) == nil {
			out = append(out, gin.H{"slug": slug, "name": name, "image_url": img, "product_count": n})
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

const productColumns = `p.id, p.sku, p.name, p.description, p.category, p.price, p.image_url, p.images, p.is_top_seller, p.in_stock, p.stock_qty, p.compatible_types, p.rating_avg, p.specs, p.is_active`

func scanProduct(row interface{ Scan(...interface{}) error }, fav *bool) (gin.H, error) {
	var id, name string
	var sku, desc, cat, img *string
	var price, rating float64
	var images, specs []byte
	var top, inStock, active bool
	var stock int
	var types []string
	args := []interface{}{&id, &sku, &name, &desc, &cat, &price, &img, &images, &top, &inStock, &stock, pq.Array(&types), &rating, &specs, &active}
	if fav != nil {
		args = append(args, fav)
	}
	if err := row.Scan(args...); err != nil {
		return nil, err
	}
	out := gin.H{"id": id, "sku": sku, "name": name, "description": desc, "category": cat, "price": price, "image_url": img, "images": json.RawMessage(images),
		"is_top_seller": top, "in_stock": inStock && stock > 0, "stock_qty": stock, "compatible_types": types, "rating_avg": rating, "specs": json.RawMessage(specs), "is_active": active}
	if fav != nil {
		out["is_favorite"] = *fav
	}
	return out, nil
}

// GET /store/products?category=&q=&pergola_type=&top=1&favorites=1
func (h *StoreHandler) Products(c *gin.Context) {
	userID := c.GetString("user_id")
	page, limit := utils.Pagination(c)
	where := []string{"p.is_active"}
	args := []interface{}{userID}
	arg := func(v interface{}) string { args = append(args, v); return fmt.Sprintf("$%d", len(args)) }
	if v := c.Query("category"); v != "" {
		where = append(where, "p.category="+arg(v))
	}
	if v := strings.TrimSpace(c.Query("q")); v != "" {
		a := arg("%" + v + "%")
		where = append(where, "(p.name ILIKE "+a+" OR p.description ILIKE "+a+" OR p.sku ILIKE "+a+")")
	}
	if v := c.Query("pergola_type"); v != "" {
		where = append(where, "("+arg(v)+" = ANY(p.compatible_types) OR 'any' = ANY(p.compatible_types))")
	}
	if c.Query("top") != "" {
		where = append(where, "p.is_top_seller")
	}
	if c.Query("favorites") != "" {
		where = append(where, "f.user_id IS NOT NULL")
	}
	w := strings.Join(where, " AND ")
	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM supply_products p LEFT JOIN supply_favorites f ON f.product_id=p.id AND f.user_id=$1 WHERE `+w, args...).Scan(&total)
	lim, off := arg(limit), arg((page-1)*limit)
	rows, err := h.DB.Query(`SELECT `+productColumns+`, (f.user_id IS NOT NULL) FROM supply_products p
        LEFT JOIN supply_favorites f ON f.product_id=p.id AND f.user_id=$1 WHERE `+w+` ORDER BY p.is_top_seller DESC, p.name LIMIT `+lim+` OFFSET `+off, args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load products: "+err.Error())
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var fav bool
		if p, e := scanProduct(rows, &fav); e == nil {
			out = append(out, p)
		}
	}
	utils.Paginated(c, http.StatusOK, out, total, page, limit)
}

// GET /store/products/:id
func (h *StoreHandler) Product(c *gin.Context) {
	userID := c.GetString("user_id")
	var fav bool
	p, err := scanProduct(h.DB.QueryRow(`SELECT `+productColumns+`, EXISTS(SELECT 1 FROM supply_favorites f WHERE f.product_id=p.id AND f.user_id=$2)
        FROM supply_products p WHERE p.id=$1`, c.Param("id"), userID), &fav)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Product not found")
		return
	}
	utils.Success(c, http.StatusOK, "", p)
}

// PUT /store/favorites/:id  · DELETE /store/favorites/:id
func (h *StoreHandler) AddFavorite(c *gin.Context) {
	if _, err := h.DB.Exec(`INSERT INTO supply_favorites (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, c.GetString("user_id"), c.Param("id")); err != nil {
		utils.Error(c, http.StatusNotFound, "Product not found")
		return
	}
	utils.Success(c, http.StatusOK, "Added to favorites", nil)
}
func (h *StoreHandler) RemoveFavorite(c *gin.Context) {
	h.DB.Exec(`DELETE FROM supply_favorites WHERE user_id=$1 AND product_id=$2`, c.GetString("user_id"), c.Param("id"))
	utils.Success(c, http.StatusOK, "Removed from favorites", nil)
}

// ---------- addresses ----------

type AddressRequest struct {
	Label     *string  `json:"label"`
	Recipient *string  `json:"recipient"`
	Phone     *string  `json:"phone"`
	Line1     *string  `json:"line1"`
	Line2     *string  `json:"line2"`
	City      *string  `json:"city"`
	State     *string  `json:"state"`
	ZipCode   *string  `json:"zip_code"`
	Country   *string  `json:"country"`
	Lat       *float64 `json:"lat"`
	Lng       *float64 `json:"lng"`
	IsDefault *bool    `json:"is_default"`
}

const addressColumns = `id, label, recipient, phone, line1, line2, city, state, zip_code, country, lat, lng, is_default`

func scanAddress(row interface{ Scan(...interface{}) error }) (gin.H, error) {
	var id, line1, city string
	var label, recipient, phone, line2, state, zip, country *string
	var lat, lng *float64
	var def bool
	if err := row.Scan(&id, &label, &recipient, &phone, &line1, &line2, &city, &state, &zip, &country, &lat, &lng, &def); err != nil {
		return nil, err
	}
	return gin.H{"id": id, "label": label, "recipient": recipient, "phone": phone, "line1": line1, "line2": line2, "city": city, "state": state,
		"zip_code": zip, "country": country, "lat": lat, "lng": lng, "is_default": def}, nil
}

func (h *StoreHandler) ListAddresses(c *gin.Context) {
	rows, err := h.DB.Query(`SELECT `+addressColumns+` FROM user_addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at`, c.GetString("user_id"))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load addresses")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		if a, e := scanAddress(rows); e == nil {
			out = append(out, a)
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

func (h *StoreHandler) CreateAddress(c *gin.Context) {
	userID := c.GetString("user_id")
	var req AddressRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Line1 == nil || req.City == nil {
		utils.Error(c, http.StatusBadRequest, "line1 and city are required")
		return
	}
	var n int
	h.DB.QueryRow(`SELECT COUNT(*) FROM user_addresses WHERE user_id=$1`, userID).Scan(&n)
	def := n == 0 || (req.IsDefault != nil && *req.IsDefault)
	if def {
		h.DB.Exec(`UPDATE user_addresses SET is_default=FALSE WHERE user_id=$1`, userID)
	}
	a, err := scanAddress(h.DB.QueryRow(`INSERT INTO user_addresses (user_id, label, recipient, phone, line1, line2, city, state, zip_code, country, lat, lng, is_default)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'US'),$11,$12,$13) RETURNING `+addressColumns,
		userID, req.Label, req.Recipient, req.Phone, *req.Line1, req.Line2, *req.City, req.State, req.ZipCode, req.Country, req.Lat, req.Lng, def))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to save address: "+err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "Address added", a)
}

func (h *StoreHandler) UpdateAddress(c *gin.Context) {
	userID := c.GetString("user_id")
	var req AddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.IsDefault != nil && *req.IsDefault {
		h.DB.Exec(`UPDATE user_addresses SET is_default=FALSE WHERE user_id=$1`, userID)
	}
	a, err := scanAddress(h.DB.QueryRow(`UPDATE user_addresses SET label=COALESCE($1,label), recipient=COALESCE($2,recipient), phone=COALESCE($3,phone), line1=COALESCE($4,line1),
        line2=COALESCE($5,line2), city=COALESCE($6,city), state=COALESCE($7,state), zip_code=COALESCE($8,zip_code), country=COALESCE($9,country), lat=COALESCE($10,lat), lng=COALESCE($11,lng),
        is_default=COALESCE($12,is_default), updated_at=NOW() WHERE id=$13 AND user_id=$14 RETURNING `+addressColumns,
		req.Label, req.Recipient, req.Phone, req.Line1, req.Line2, req.City, req.State, req.ZipCode, req.Country, req.Lat, req.Lng, req.IsDefault, c.Param("id"), userID))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Address not found")
		return
	}
	utils.Success(c, http.StatusOK, "Address updated", a)
}

func (h *StoreHandler) DeleteAddress(c *gin.Context) {
	userID := c.GetString("user_id")
	res, _ := h.DB.Exec(`DELETE FROM user_addresses WHERE id=$1 AND user_id=$2`, c.Param("id"), userID)
	if n, _ := res.RowsAffected(); n == 0 {
		utils.Error(c, http.StatusNotFound, "Address not found")
		return
	}
	h.DB.Exec(`UPDATE user_addresses SET is_default=TRUE WHERE id=(SELECT id FROM user_addresses WHERE user_id=$1 ORDER BY created_at LIMIT 1)
        AND NOT EXISTS (SELECT 1 FROM user_addresses WHERE user_id=$1 AND is_default)`, userID)
	utils.Success(c, http.StatusOK, "Address removed", nil)
}

// ---------- cart ----------

func (h *StoreHandler) openCart(userID string, jobID *string) string {
	var id string
	if jobID != nil {
		h.DB.QueryRow(`SELECT id FROM supply_carts WHERE user_id=$1 AND job_id=$2 AND status='open'`, userID, *jobID).Scan(&id)
	} else {
		h.DB.QueryRow(`SELECT id FROM supply_carts WHERE user_id=$1 AND job_id IS NULL AND status='open'`, userID).Scan(&id)
	}
	if id == "" {
		h.DB.QueryRow(`INSERT INTO supply_carts (user_id, job_id) VALUES ($1,$2) RETURNING id`, userID, jobID).Scan(&id)
	}
	return id
}

func (h *StoreHandler) cartView(cartID string) gin.H {
	var jobID *string
	var code *string
	h.DB.QueryRow(`SELECT c.job_id, j.request_code FROM supply_carts c LEFT JOIN jobs j ON j.id=c.job_id WHERE c.id=$1`, cartID).Scan(&jobID, &code)
	rows, _ := h.DB.Query(`SELECT i.id, i.product_id, p.name, p.image_url, p.in_stock AND p.stock_qty>0, i.qty, i.unit_price, i.parts_request_id, pr.job_id, jj.request_code, u.first_name
        FROM supply_cart_items i JOIN supply_products p ON p.id=i.product_id
        LEFT JOIN job_parts_requests pr ON pr.id=i.parts_request_id LEFT JOIN jobs jj ON jj.id=pr.job_id LEFT JOIN users u ON u.id=pr.contractor_id
        WHERE i.cart_id=$1 ORDER BY i.created_at`, cartID)
	items := []gin.H{}
	subtotal := 0.0
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var id, pid, name string
			var img, prID, prJob, prCode, prBy *string
			var inStock bool
			var qty int
			var price float64
			if rows.Scan(&id, &pid, &name, &img, &inStock, &qty, &price, &prID, &prJob, &prCode, &prBy) == nil {
				line := money(price * float64(qty))
				subtotal += line
				it := gin.H{"id": id, "product_id": pid, "name": name, "image_url": img, "in_stock": inStock, "qty": qty, "unit_price": price, "amount": line}
				if prID != nil {
					it["parts_request"] = gin.H{"id": *prID, "job_id": prJob, "request_code": prCode, "from": prBy, "label": "Parts for " + strOr(prCode, "job") + " from " + strOr(prBy, "contractor")}
				}
				items = append(items, it)
			}
		}
	}
	subtotal = money(subtotal)
	shipping := 0.0
	if subtotal > 0 && subtotal < GetSettingFloat(h.DB, "store_free_shipping_over", 150) {
		shipping = GetSettingFloat(h.DB, "store_shipping_fee", 12.99)
	}
	return gin.H{"id": cartID, "job_id": jobID, "request_code": code, "items": items, "subtotal": subtotal, "shipping_fee": shipping, "total": money(subtotal + shipping),
		"cod_enabled": GetSettingBool(h.DB, "cod_enabled", true), "cod_max_change": GetSettingFloat(h.DB, "cod_max_change", 20)}
}

// GET /store/cart?job_id=
func (h *StoreHandler) GetCart(c *gin.Context) {
	var jobID *string
	if v := c.Query("job_id"); v != "" {
		jobID = &v
	}
	utils.Success(c, http.StatusOK, "", h.cartView(h.openCart(c.GetString("user_id"), jobID)))
}

type CartItemRequest struct {
	ProductID string  `json:"product_id" binding:"required"`
	Qty       int     `json:"qty" binding:"required,min=1"`
	JobID     *string `json:"job_id"`
}

// POST /store/cart/items
func (h *StoreHandler) AddCartItem(c *gin.Context) {
	userID := c.GetString("user_id")
	var req CartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var price float64
	var ok bool
	if h.DB.QueryRow(`SELECT price, is_active AND in_stock AND stock_qty>0 FROM supply_products WHERE id=$1`, req.ProductID).Scan(&price, &ok) != nil || !ok {
		utils.Error(c, http.StatusConflict, "Product unavailable")
		return
	}
	cartID := h.openCart(userID, req.JobID)
	h.DB.Exec(`INSERT INTO supply_cart_items (cart_id, product_id, qty, unit_price) VALUES ($1,$2,$3,$4)
        ON CONFLICT (cart_id, product_id) DO UPDATE SET qty=supply_cart_items.qty+EXCLUDED.qty, unit_price=EXCLUDED.unit_price`, cartID, req.ProductID, req.Qty, price)
	h.DB.Exec(`UPDATE supply_carts SET updated_at=NOW() WHERE id=$1`, cartID)
	utils.Success(c, http.StatusOK, "Added to cart", h.cartView(cartID))
}

// PATCH /store/cart/items/:id {qty}
func (h *StoreHandler) UpdateCartItem(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		Qty int `json:"qty" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var cartID string
	if h.DB.QueryRow(`UPDATE supply_cart_items i SET qty=$1 FROM supply_carts c WHERE i.id=$2 AND c.id=i.cart_id AND c.user_id=$3 AND c.status='open' AND i.parts_request_id IS NULL RETURNING c.id`, req.Qty, c.Param("id"), userID).Scan(&cartID) != nil {
		utils.Error(c, http.StatusNotFound, "Cart item not found (parts-request lines can't be edited)")
		return
	}
	utils.Success(c, http.StatusOK, "Cart updated", h.cartView(cartID))
}

// DELETE /store/cart/items/:id
func (h *StoreHandler) RemoveCartItem(c *gin.Context) {
	userID := c.GetString("user_id")
	var cartID string
	var prID *string
	if h.DB.QueryRow(`DELETE FROM supply_cart_items i USING supply_carts c WHERE i.id=$1 AND c.id=i.cart_id AND c.user_id=$2 AND c.status='open' RETURNING c.id, i.parts_request_id`, c.Param("id"), userID).Scan(&cartID, &prID) != nil {
		utils.Error(c, http.StatusNotFound, "Cart item not found")
		return
	}
	if prID != nil {
		h.declinePartsRequest(*prID, userID, "Removed from cart")
	}
	utils.Success(c, http.StatusOK, "Removed", h.cartView(cartID))
}

// ---------- checkout ----------

type CheckoutRequest struct {
	PaymentMethod   string  `json:"payment_method" binding:"omitempty,oneof=card cash"`
	PaymentMethodID *string `json:"payment_method_id"`
	AddressID       *string `json:"address_id"`
	JobID           *string `json:"job_id"` // contractor job cart
	PayMode         string  `json:"pay_mode" binding:"omitempty,oneof=contractor customer_cart customer_account"`
	Notes           *string `json:"notes"`
}

func (h *StoreHandler) jobAddress(jobID string) gin.H {
	var addr, city, state, zip, code *string
	var lat, lng *float64
	var consumerID string
	h.DB.QueryRow(`SELECT location_address, location_city, location_state, location_zip, location_lat, location_lng, request_code, consumer_id FROM jobs WHERE id=$1`, jobID).
		Scan(&addr, &city, &state, &zip, &lat, &lng, &code, &consumerID)
	p := loadParty(h.DB, &consumerID)
	name := ""
	if p != nil {
		name = p.FirstName + " " + p.LastName
	}
	return gin.H{"label": "Job site · " + strOr(code, ""), "recipient": name, "line1": strOr(addr, ""), "city": strOr(city, ""), "state": strOr(state, ""), "zip_code": strOr(zip, ""), "lat": lat, "lng": lng}
}

func (h *StoreHandler) userAddress(userID string, addressID *string) (gin.H, error) {
	var row *sql.Row
	if addressID != nil {
		row = h.DB.QueryRow(`SELECT `+addressColumns+` FROM user_addresses WHERE id=$1 AND user_id=$2`, *addressID, userID)
	} else {
		row = h.DB.QueryRow(`SELECT `+addressColumns+` FROM user_addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at LIMIT 1`, userID)
	}
	return scanAddress(row)
}

type cartLine struct {
	productID, name string
	image           *string
	qty             int
	price           float64
	partsRequestID  *string
}

func (h *StoreHandler) cartLines(cartID string) []cartLine {
	rows, err := h.DB.Query(`SELECT i.product_id, p.name, p.image_url, i.qty, i.unit_price, i.parts_request_id FROM supply_cart_items i JOIN supply_products p ON p.id=i.product_id WHERE i.cart_id=$1`, cartID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []cartLine
	for rows.Next() {
		var l cartLine
		if rows.Scan(&l.productID, &l.name, &l.image, &l.qty, &l.price, &l.partsRequestID) == nil {
			out = append(out, l)
		}
	}
	return out
}

// createOrder writes supply_orders + items from lines, decrements stock, closes the cart.
func (h *StoreHandler) createOrder(tx *sql.Tx, userID, payerID string, lines []cartLine, payment string, pmID *string, address gin.H, jobID, partsReqID *string, cartID string) (string, string, float64, error) {
	subtotal := 0.0
	for _, l := range lines {
		subtotal += l.price * float64(l.qty)
	}
	subtotal = money(subtotal)
	shipping := 0.0
	if subtotal < GetSettingFloat(h.DB, "store_free_shipping_over", 150) {
		shipping = GetSettingFloat(h.DB, "store_shipping_fee", 12.99)
	}
	total := money(subtotal + shipping)
	status := "paid"
	var paidAt interface{} = time.Now()
	intentID := ""
	if payment == "cash" {
		status, paidAt = "pending", nil
	} else {
		pid, err := ChargeCustomer(h.DB, payerID, total, "Mr Supply order", map[string]string{"type": "store"})
		if err != nil {
			return "", "", 0, fmt.Errorf("payment failed: %v", err)
		}
		intentID = pid
	}
	var orderID, number string
	if err := tx.QueryRow(`INSERT INTO supply_orders (user_id, payer_id, total_amount, subtotal, shipping_fee, status, payment_method, payment_method_id, address, job_id, parts_request_id, paid_at, stripe_payment_intent_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13) RETURNING id, order_number`,
		userID, payerID, total, subtotal, shipping, status, payment, pmID, toJSON(address), jobID, partsReqID, paidAt, nilIfEmpty(intentID)).Scan(&orderID, &number); err != nil {
		return "", "", 0, err
	}
	for _, l := range lines {
		tx.Exec(`INSERT INTO supply_order_items (order_id, product_id, quantity, price, product_name, product_image) VALUES ($1,$2,$3,$4,$5,$6)`, orderID, l.productID, l.qty, l.price, l.name, l.image)
		tx.Exec(`UPDATE supply_products SET stock_qty=GREATEST(stock_qty-$1,0), in_stock=(stock_qty-$1)>0, updated_at=NOW() WHERE id=$2`, l.qty, l.productID)
	}
	if payment == "card" {
		tx.Exec(`INSERT INTO transactions (user_id, transaction_type, status, amount, description) VALUES ($1,'job_payment','completed',$2,$3)`, payerID, total, "Mr Supply order "+number)
	}
	tx.Exec(`UPDATE supply_carts SET status='checked_out', updated_at=NOW() WHERE id=$1`, cartID)
	addDocument(tx, payerID, "order_receipt", "Order "+number, jobID, nil, &orderID, nil, gin.H{"total": total, "items": len(lines), "payment": payment})
	return orderID, number, total, nil
}

// POST /store/orders — checkout the caller's cart (personal, or job-linked with pay_mode)
func (h *StoreHandler) Checkout(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	var req CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.PaymentMethod == "" {
		req.PaymentMethod = "card"
	}
	if req.PaymentMethod == "cash" && !GetSettingBool(h.DB, "cod_enabled", true) {
		utils.Error(c, http.StatusBadRequest, "Cash on delivery is not available")
		return
	}
	cartID := h.openCart(userID, req.JobID)
	lines := h.cartLines(cartID)
	if len(lines) == 0 {
		utils.Error(c, http.StatusConflict, "Cart is empty")
		return
	}

	// ----- job-linked contractor cart: who pays -----
	if req.JobID != nil && role == "contractor" {
		var contractorID *string
		var consumerID string
		if h.DB.QueryRow(`SELECT contractor_id, consumer_id FROM jobs WHERE id=$1`, *req.JobID).Scan(&contractorID, &consumerID) != nil || contractorID == nil || *contractorID != userID {
			utils.Error(c, http.StatusForbidden, "You are not assigned to this job")
			return
		}
		mode := req.PayMode
		if mode == "" {
			mode = "contractor"
		}
		if mode != "contractor" {
			h.createPartsRequest(c, userID, consumerID, *req.JobID, mode, lines, cartID)
			return
		}
		// contractor pays now, ships to the job address
		tx, _ := h.DB.Begin()
		defer tx.Rollback()
		oid, num, total, err := h.createOrder(tx, userID, userID, lines, req.PaymentMethod, req.PaymentMethodID, h.jobAddress(*req.JobID), req.JobID, nil, cartID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to place order: "+err.Error())
			return
		}
		tx.Commit()
		logEvent(h.DB, *req.JobID, userID, "contractor", "parts_ordered", "", "", gin.H{"order": num, "total": total, "pay_mode": "contractor"})
		utils.Success(c, http.StatusCreated, "Order placed", h.orderView(oid))
		return
	}

	// ----- personal cart (consumer or contractor) -----
	address, err := h.userAddress(userID, req.AddressID)
	var jobID, partsReqID *string
	// customer paying a contractor's parts request: ship to the job address
	for _, l := range lines {
		if l.partsRequestID != nil {
			partsReqID = l.partsRequestID
			h.DB.QueryRow(`SELECT job_id FROM job_parts_requests WHERE id=$1`, *partsReqID).Scan(&jobID)
		}
	}
	if jobID != nil {
		address = h.jobAddress(*jobID)
		err = nil
	}
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Add a delivery address first")
		return
	}
	tx, _ := h.DB.Begin()
	defer tx.Rollback()
	oid, num, total, err := h.createOrder(tx, userID, userID, lines, req.PaymentMethod, req.PaymentMethodID, address, jobID, partsReqID, cartID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to place order: "+err.Error())
		return
	}
	if partsReqID != nil {
		tx.Exec(`UPDATE job_parts_requests SET status='paid', order_id=$1, responded_at=NOW(), updated_at=NOW() WHERE id=$2`, oid, *partsReqID)
	}
	tx.Commit()
	if partsReqID != nil {
		var contractorID string
		h.DB.QueryRow(`SELECT contractor_id FROM job_parts_requests WHERE id=$1`, *partsReqID).Scan(&contractorID)
		logEvent(h.DB, *jobID, userID, "consumer", "parts_paid", "", "", gin.H{"order": num, "total": total})
		notify(h.DB, contractorID, "parts_paid", "Customer paid for parts", num+" · shipping to the job address", *jobID, "job", gin.H{"stage": "parts"})
	}
	notify(h.DB, userID, "order_placed", "Order placed", num+fmt.Sprintf(" · $%.2f", total), "", "orders", gin.H{"order_id": oid})
	utils.Success(c, http.StatusCreated, "Order placed", h.orderView(oid))
}

// ---------- job parts requests ----------

func (h *StoreHandler) createPartsRequest(c *gin.Context, contractorID, consumerID, jobID, mode string, lines []cartLine, cartID string) {
	items := []gin.H{}
	subtotal := 0.0
	for _, l := range lines {
		amt := money(l.price * float64(l.qty))
		subtotal += amt
		items = append(items, gin.H{"product_id": l.productID, "name": l.name, "image_url": l.image, "qty": l.qty, "unit_price": l.price, "amount": amt})
	}
	subtotal = money(subtotal)
	shipping := 0.0
	if subtotal < GetSettingFloat(h.DB, "store_free_shipping_over", 150) {
		shipping = GetSettingFloat(h.DB, "store_shipping_fee", 12.99)
	}
	total := money(subtotal + shipping)
	tx, _ := h.DB.Begin()
	defer tx.Rollback()
	var prID string
	if err := tx.QueryRow(`INSERT INTO job_parts_requests (job_id, contractor_id, consumer_id, pay_mode, items, subtotal, shipping_fee, total) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8) RETURNING id`,
		jobID, contractorID, consumerID, mode, toJSON(items), subtotal, shipping, total).Scan(&prID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to create parts request: "+err.Error())
		return
	}
	if mode == "customer_cart" {
		var custCart string
		tx.QueryRow(`SELECT id FROM supply_carts WHERE user_id=$1 AND job_id IS NULL AND status='open'`, consumerID).Scan(&custCart)
		if custCart == "" {
			tx.QueryRow(`INSERT INTO supply_carts (user_id) VALUES ($1) RETURNING id`, consumerID).Scan(&custCart)
		}
		for _, l := range lines {
			tx.Exec(`INSERT INTO supply_cart_items (cart_id, product_id, qty, unit_price, parts_request_id) VALUES ($1,$2,$3,$4,$5)
                ON CONFLICT (cart_id, product_id) DO UPDATE SET qty=EXCLUDED.qty, unit_price=EXCLUDED.unit_price, parts_request_id=EXCLUDED.parts_request_id`, custCart, l.productID, l.qty, l.price, prID)
		}
	}
	tx.Exec(`UPDATE supply_carts SET status='checked_out', updated_at=NOW() WHERE id=$1`, cartID)
	tx.Commit()
	var code *string
	h.DB.QueryRow(`SELECT request_code FROM jobs WHERE id=$1`, jobID).Scan(&code)
	name := partyName(h.DB, &contractorID)
	logEvent(h.DB, jobID, contractorID, "contractor", "parts_requested", "", "", gin.H{"parts_request_id": prID, "pay_mode": mode, "total": total})
	if mode == "customer_cart" {
		notify(h.DB, consumerID, "parts_request", name+" added parts for "+strOr(code, "your job"), fmt.Sprintf("$%.2f · review and pay in your cart", total), jobID, "cart", gin.H{"parts_request_id": prID})
	} else {
		notify(h.DB, consumerID, "parts_request", name+" requests parts for "+strOr(code, "your job"), fmt.Sprintf("$%.2f · approve to add to your job invoice", total), jobID, "requestDetail", gin.H{"stage": "parts", "parts_request_id": prID})
	}
	utils.Success(c, http.StatusCreated, "Parts request sent to customer", h.partsRequestView(prID))
}

func (h *StoreHandler) partsRequestView(id string) gin.H {
	var jobID, contractorID, consumerID, mode, status string
	var items []byte
	var subtotal, shipping, total float64
	var orderID *string
	var reminded, responded sql.NullTime
	var created time.Time
	if h.DB.QueryRow(`SELECT job_id, contractor_id, consumer_id, pay_mode, items, subtotal, shipping_fee, total, status, order_id, reminded_at, responded_at, created_at FROM job_parts_requests WHERE id=$1`, id).
		Scan(&jobID, &contractorID, &consumerID, &mode, &items, &subtotal, &shipping, &total, &status, &orderID, &reminded, &responded, &created) != nil {
		return nil
	}
	out := gin.H{"id": id, "job_id": jobID, "contractor_id": contractorID, "consumer_id": consumerID, "pay_mode": mode, "items": json.RawMessage(items), "subtotal": subtotal, "shipping_fee": shipping,
		"total": total, "status": status, "order_id": orderID, "reminded_at": nullTime(reminded), "responded_at": nullTime(responded), "created_at": created}
	if orderID != nil {
		var num, ostatus string
		if h.DB.QueryRow(`SELECT order_number, status FROM supply_orders WHERE id=$1`, *orderID).Scan(&num, &ostatus) == nil {
			out["order"] = gin.H{"number": num, "status": ostatus}
		}
	}
	return out
}

// GET /jobs/:id/parts-requests — both parties + admin
func (h *StoreHandler) ListPartsRequests(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")
	rows, err := h.DB.Query(`SELECT pr.id FROM job_parts_requests pr JOIN jobs j ON j.id=pr.job_id WHERE pr.job_id=$1 AND ($2='admin' OR j.consumer_id=$3 OR j.contractor_id=$3 OR pr.contractor_id=$3) ORDER BY pr.created_at DESC`,
		c.Param("id"), role, userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load parts requests")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			if v := h.partsRequestView(id); v != nil {
				out = append(out, v)
			}
		}
	}
	utils.Success(c, http.StatusOK, "", out)
}

func (h *StoreHandler) declinePartsRequest(id, userID, reason string) {
	var jobID, contractorID string
	if h.DB.QueryRow(`UPDATE job_parts_requests SET status='declined', responded_at=NOW(), updated_at=NOW() WHERE id=$1 AND consumer_id=$2 AND status='pending_customer' RETURNING job_id, contractor_id`, id, userID).Scan(&jobID, &contractorID) != nil {
		return
	}
	h.DB.Exec(`DELETE FROM supply_cart_items WHERE parts_request_id=$1`, id)
	logEvent(h.DB, jobID, userID, "consumer", "parts_declined", "", "", gin.H{"parts_request_id": id, "reason": reason})
	notify(h.DB, contractorID, "parts_declined", "Customer declined the parts request", reason, jobID, "job", gin.H{"stage": "parts"})
}

// POST /parts-requests/:id/decline (consumer)
func (h *StoreHandler) DeclinePartsRequest(c *gin.Context) {
	var req struct {
		Reason *string `json:"reason"`
	}
	c.ShouldBindJSON(&req)
	h.declinePartsRequest(c.Param("id"), c.GetString("user_id"), strOr(req.Reason, "Declined by customer"))
	utils.Success(c, http.StatusOK, "Parts request declined", h.partsRequestView(c.Param("id")))
}

// POST /parts-requests/:id/approve (consumer, customer_account mode) → invoice line + order shipped to job
func (h *StoreHandler) ApprovePartsRequest(c *gin.Context) {
	userID := c.GetString("user_id")
	var jobID, contractorID, mode string
	var items []byte
	var total float64
	if h.DB.QueryRow(`SELECT job_id, contractor_id, pay_mode, items, total FROM job_parts_requests WHERE id=$1 AND consumer_id=$2 AND status='pending_customer'`, c.Param("id"), userID).
		Scan(&jobID, &contractorID, &mode, &items, &total) != nil {
		utils.Error(c, http.StatusNotFound, "No pending parts request")
		return
	}
	if mode != "customer_account" {
		utils.Error(c, http.StatusConflict, "This request is paid through your cart")
		return
	}
	var raw []struct {
		ProductID string  `json:"product_id"`
		Name      string  `json:"name"`
		Image     *string `json:"image_url"`
		Qty       int     `json:"qty"`
		UnitPrice float64 `json:"unit_price"`
	}
	json.Unmarshal(items, &raw)
	lines := []cartLine{}
	for _, r := range raw {
		lines = append(lines, cartLine{productID: r.ProductID, name: r.Name, image: r.Image, qty: r.Qty, price: r.UnitPrice})
	}
	tx, _ := h.DB.Begin()
	defer tx.Rollback()
	prID := c.Param("id")
	var cartID string
	tx.QueryRow(`INSERT INTO supply_carts (user_id, job_id, status) VALUES ($1,$2,'checked_out') RETURNING id`, userID, jobID).Scan(&cartID)
	oid, num, orderTotal, err := h.createOrder(tx, userID, userID, lines, "card", nil, h.jobAddress(jobID), &jobID, &prID, cartID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to place order: "+err.Error())
		return
	}
	var code *string
	tx.QueryRow(`SELECT request_code FROM jobs WHERE id=$1`, jobID).Scan(&code)
	tx.Exec(`INSERT INTO invoices (job_id, consumer_id, contractor_id, amount, description, status, line_type, paid_at) VALUES ($1,$2,$3,$4,$5,'paid','parts',NOW())`,
		jobID, userID, contractorID, orderTotal, "Parts for "+strOr(code, "")+" · "+num)
	tx.Exec(`UPDATE job_parts_requests SET status='approved', order_id=$1, responded_at=NOW(), updated_at=NOW() WHERE id=$2`, oid, prID)
	tx.Commit()
	logEvent(h.DB, jobID, userID, "consumer", "parts_approved", "", "", gin.H{"order": num, "total": orderTotal})
	notify(h.DB, contractorID, "parts_paid", "Customer approved the parts", num+" · charged to their account, shipping to the job", jobID, "job", gin.H{"stage": "parts"})
	utils.Success(c, http.StatusOK, "Parts approved", h.partsRequestView(prID))
}

// POST /parts-requests/:id/remind (contractor)
func (h *StoreHandler) RemindPartsRequest(c *gin.Context) {
	userID := c.GetString("user_id")
	var jobID, consumerID string
	var total float64
	var reminded sql.NullTime
	if h.DB.QueryRow(`SELECT job_id, consumer_id, total, reminded_at FROM job_parts_requests WHERE id=$1 AND contractor_id=$2 AND status='pending_customer'`, c.Param("id"), userID).Scan(&jobID, &consumerID, &total, &reminded) != nil {
		utils.Error(c, http.StatusNotFound, "No pending parts request")
		return
	}
	if reminded.Valid && time.Since(reminded.Time) < 12*time.Hour {
		utils.Error(c, http.StatusTooManyRequests, "You can remind once every 12 hours")
		return
	}
	h.DB.Exec(`UPDATE job_parts_requests SET reminded_at=NOW() WHERE id=$1`, c.Param("id"))
	notify(h.DB, consumerID, "parts_reminder", "Reminder: parts waiting for your approval", fmt.Sprintf("$%.2f from %s", total, partyName(h.DB, &userID)), jobID, "requestDetail", gin.H{"stage": "parts", "parts_request_id": c.Param("id")})
	utils.Success(c, http.StatusOK, "Reminder sent", nil)
}

// ---------- orders ----------

func (h *StoreHandler) orderView(id string) gin.H {
	var number, status, payment string
	var userID, payerID string
	var total, subtotal, shipping float64
	var address []byte
	var jobID, prID, tracking, courierName, courierPhone, cancelReason, reportReason *string
	var eta, packed, shipped, delivered, cancelled, paid sql.NullTime
	var created time.Time
	var code *string
	if h.DB.QueryRow(`SELECT o.order_number, o.status, o.payment_method, o.user_id, COALESCE(o.payer_id,o.user_id), o.total_amount, o.subtotal, o.shipping_fee, o.address, o.job_id, j.request_code, o.parts_request_id,
            o.tracking_number, o.courier_name, o.courier_phone, o.eta_at, o.packed_at, o.shipped_at, o.delivered_at, o.cancelled_at, o.cancel_reason, o.report_reason, o.paid_at, o.created_at
        FROM supply_orders o LEFT JOIN jobs j ON j.id=o.job_id WHERE o.id=$1`, id).
		Scan(&number, &status, &payment, &userID, &payerID, &total, &subtotal, &shipping, &address, &jobID, &code, &prID, &tracking, &courierName, &courierPhone, &eta, &packed, &shipped, &delivered, &cancelled, &cancelReason, &reportReason, &paid, &created) != nil {
		return nil
	}
	items := []gin.H{}
	rows, _ := h.DB.Query(`SELECT product_id, COALESCE(product_name,''), product_image, quantity, price FROM supply_order_items WHERE order_id=$1`, id)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var pid, name string
			var img *string
			var qty int
			var price float64
			if rows.Scan(&pid, &name, &img, &qty, &price) == nil {
				items = append(items, gin.H{"product_id": pid, "name": name, "image_url": img, "qty": qty, "unit_price": price, "amount": money(price * float64(qty))})
			}
		}
	}
	timeline := []gin.H{{"step": "placed", "at": created}}
	if paid.Valid {
		timeline = append(timeline, gin.H{"step": "paid", "at": paid.Time})
	}
	if packed.Valid {
		timeline = append(timeline, gin.H{"step": "packing", "at": packed.Time})
	}
	if shipped.Valid {
		timeline = append(timeline, gin.H{"step": "shipped", "at": shipped.Time})
	}
	if delivered.Valid {
		timeline = append(timeline, gin.H{"step": "delivered", "at": delivered.Time})
	}
	if cancelled.Valid {
		timeline = append(timeline, gin.H{"step": "cancelled", "at": cancelled.Time})
	}
	var courier interface{}
	if courierName != nil {
		courier = gin.H{"name": courierName, "phone": courierPhone}
	}
	return gin.H{"id": id, "order_number": number, "status": status, "payment_method": payment, "user_id": userID, "payer_id": payerID, "total": total, "subtotal": subtotal, "shipping_fee": shipping,
		"address": json.RawMessage(address), "job_id": jobID, "request_code": code, "parts_request_id": prID, "items": items,
		"tracking":      gin.H{"number": tracking, "courier": courier, "eta_at": nullTime(eta), "timeline": timeline},
		"cancel_reason": cancelReason, "report_reason": reportReason, "created_at": created}
}

// GET /store/orders
func (h *StoreHandler) ListOrders(c *gin.Context) {
	userID := c.GetString("user_id")
	page, limit := utils.Pagination(c)
	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM supply_orders WHERE user_id=$1 OR payer_id=$1`, userID).Scan(&total)
	rows, err := h.DB.Query(`SELECT id FROM supply_orders WHERE user_id=$1 OR payer_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, userID, limit, (page-1)*limit)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load orders")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			if v := h.orderView(id); v != nil {
				out = append(out, v)
			}
		}
	}
	utils.Paginated(c, http.StatusOK, out, total, page, limit)
}

func (h *StoreHandler) ownOrder(c *gin.Context) (string, bool) {
	userID := c.GetString("user_id")
	var id string
	if h.DB.QueryRow(`SELECT id FROM supply_orders WHERE id=$1 AND (user_id=$2 OR payer_id=$2 OR $3='admin')`, c.Param("id"), userID, c.GetString("user_role")).Scan(&id) != nil {
		utils.Error(c, http.StatusNotFound, "Order not found")
		return "", false
	}
	return id, true
}

// GET /store/orders/:id
func (h *StoreHandler) GetOrder(c *gin.Context) {
	id, ok := h.ownOrder(c)
	if !ok {
		return
	}
	utils.Success(c, http.StatusOK, "", h.orderView(id))
}

// POST /store/orders/:id/cancel
func (h *StoreHandler) CancelOrder(c *gin.Context) {
	id, ok := h.ownOrder(c)
	if !ok {
		return
	}
	var req struct {
		Reason *string `json:"reason"`
	}
	c.ShouldBindJSON(&req)
	var status, payment string
	h.DB.QueryRow(`SELECT status, payment_method FROM supply_orders WHERE id=$1`, id).Scan(&status, &payment)
	switch {
	case inList(status, "shipped", "delivered", "cancelled"):
		utils.Error(c, http.StatusConflict, "Order can no longer be cancelled ("+status+")")
		return
	case status == "packing" && payment == "cash" && !GetSettingBool(h.DB, "cod_cancel_after_packing", false):
		utils.Error(c, http.StatusConflict, "Cash orders can't be cancelled after packing")
		return
	}
	tx, _ := h.DB.Begin()
	defer tx.Rollback()
	tx.Exec(`UPDATE supply_orders SET status='cancelled', cancelled_at=NOW(), cancel_reason=$1, updated_at=NOW() WHERE id=$2`, req.Reason, id)
	tx.Exec(`UPDATE supply_products p SET stock_qty=p.stock_qty+i.quantity, in_stock=TRUE FROM supply_order_items i WHERE i.order_id=$1 AND i.product_id=p.id`, id)
	if payment == "card" {
		var pi *string
		h.DB.QueryRow(`SELECT stripe_payment_intent_id FROM supply_orders WHERE id=$1`, id).Scan(&pi)
		if pi != nil {
			if rid, err := RefundPayment(*pi, 0); err == nil {
				tx.Exec(`UPDATE supply_orders SET stripe_refund_id=$1 WHERE id=$2`, rid, id)
			}
		}
		tx.Exec(`INSERT INTO transactions (user_id, transaction_type, status, amount, description) SELECT COALESCE(payer_id,user_id), 'job_payment', 'refunded', -total_amount, 'Refund ' || order_number FROM supply_orders WHERE id=$1`, id)
	}
	tx.Commit()
	utils.Success(c, http.StatusOK, "Order cancelled", h.orderView(id))
}

// POST /store/orders/:id/reorder — puts the items back in the cart
func (h *StoreHandler) Reorder(c *gin.Context) {
	id, ok := h.ownOrder(c)
	if !ok {
		return
	}
	userID := c.GetString("user_id")
	cartID := h.openCart(userID, nil)
	h.DB.Exec(`INSERT INTO supply_cart_items (cart_id, product_id, qty, unit_price)
        SELECT $1, i.product_id, i.quantity, p.price FROM supply_order_items i JOIN supply_products p ON p.id=i.product_id WHERE i.order_id=$2 AND p.is_active AND p.in_stock
        ON CONFLICT (cart_id, product_id) DO UPDATE SET qty=supply_cart_items.qty+EXCLUDED.qty`, cartID, id)
	utils.Success(c, http.StatusOK, "Items added to cart", h.cartView(cartID))
}

// POST /store/orders/:id/report {reason}
func (h *StoreHandler) ReportOrder(c *gin.Context) {
	id, ok := h.ownOrder(c)
	if !ok {
		return
	}
	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.DB.Exec(`UPDATE supply_orders SET report_reason=$1, reported_at=NOW(), updated_at=NOW() WHERE id=$2`, req.Reason, id)
	var num string
	h.DB.QueryRow(`SELECT order_number FROM supply_orders WHERE id=$1`, id).Scan(&num)
	notifyAdmins(h.DB, "order_reported", "Order problem: "+num, req.Reason, "", gin.H{"order_id": id})
	utils.Success(c, http.StatusOK, "Report sent", nil)
}

// ---------- admin ----------

type OrderStatusRequest struct {
	Status         string  `json:"status" binding:"required,oneof=paid packing shipped delivered cancelled"`
	TrackingNumber *string `json:"tracking_number"`
	CourierName    *string `json:"courier_name"`
	CourierPhone   *string `json:"courier_phone"`
	EtaAt          *string `json:"eta_at"`
}

// PATCH /admin/store/orders/:id
func (h *StoreHandler) AdminOrderStatus(c *gin.Context) {
	var req OrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	var userID, num, payment string
	if h.DB.QueryRow(`SELECT COALESCE(payer_id,user_id), order_number, payment_method FROM supply_orders WHERE id=$1`, c.Param("id")).Scan(&userID, &num, &payment) != nil {
		utils.Error(c, http.StatusNotFound, "Order not found")
		return
	}
	if _, err := h.DB.Exec(`UPDATE supply_orders SET status=$1::text, tracking_number=COALESCE($2,tracking_number), courier_name=COALESCE($3,courier_name), courier_phone=COALESCE($4,courier_phone),
        eta_at=COALESCE($5::timestamptz,eta_at),
        paid_at=CASE WHEN $1::text='paid' THEN COALESCE(paid_at,NOW()) ELSE paid_at END,
        packed_at=CASE WHEN $1::text='packing' THEN COALESCE(packed_at,NOW()) ELSE packed_at END,
        shipped_at=CASE WHEN $1::text='shipped' THEN COALESCE(shipped_at,NOW()) ELSE shipped_at END,
        delivered_at=CASE WHEN $1::text='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END,
        cancelled_at=CASE WHEN $1::text='cancelled' THEN COALESCE(cancelled_at,NOW()) ELSE cancelled_at END, updated_at=NOW() WHERE id=$6`,
		req.Status, req.TrackingNumber, req.CourierName, req.CourierPhone, req.EtaAt, c.Param("id")); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to update order: "+err.Error())
		return
	}
	if req.Status == "delivered" && payment == "cash" {
		h.DB.Exec(`UPDATE supply_orders SET paid_at=COALESCE(paid_at,NOW()) WHERE id=$1`, c.Param("id"))
		h.DB.Exec(`INSERT INTO transactions (user_id, transaction_type, status, amount, description) SELECT $1,'job_payment','completed',total_amount,'Mr Supply order ' || order_number || ' (cash)' FROM supply_orders WHERE id=$2`, userID, c.Param("id"))
	}
	titles := map[string]string{"packing": "Your order is being packed", "shipped": "Your order is on the way", "delivered": "Order delivered", "cancelled": "Order cancelled", "paid": "Payment received"}
	notify(h.DB, userID, "order_"+req.Status, titles[req.Status], num, "", "orderDetail", gin.H{"order_id": c.Param("id")})
	utils.Success(c, http.StatusOK, "Order updated", h.orderView(c.Param("id")))
}

// GET /admin/store/orders?status=
func (h *StoreHandler) AdminListOrders(c *gin.Context) {
	page, limit := utils.Pagination(c)
	where, args := "1=1", []interface{}{}
	if v := c.Query("status"); v != "" {
		args = append(args, v)
		where = "status=$1"
	}
	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM supply_orders WHERE `+where, args...).Scan(&total)
	args = append(args, limit, (page-1)*limit)
	rows, err := h.DB.Query(`SELECT id FROM supply_orders WHERE `+where+` ORDER BY created_at DESC LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load orders")
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			if v := h.orderView(id); v != nil {
				out = append(out, v)
			}
		}
	}
	utils.Paginated(c, http.StatusOK, out, total, page, limit)
}

type ProductUpsert struct {
	SKU             string           `json:"sku" binding:"required"`
	Name            string           `json:"name" binding:"required"`
	Description     *string          `json:"description"`
	Category        *string          `json:"category"`
	Price           float64          `json:"price" binding:"required"`
	ImageURL        *string          `json:"image_url"`
	Images          *json.RawMessage `json:"images"`
	IsTopSeller     *bool            `json:"is_top_seller"`
	StockQty        *int             `json:"stock_qty"`
	CompatibleTypes []string         `json:"compatible_types"`
	Specs           *json.RawMessage `json:"specs"`
	IsActive        *bool            `json:"is_active"`
}

// PUT /admin/store/products/:sku
func (h *StoreHandler) AdminUpsertProduct(c *gin.Context) {
	var req ProductUpsert
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	images, specs := "[]", "{}"
	if req.Images != nil {
		images = string(*req.Images)
	}
	if req.Specs != nil {
		specs = string(*req.Specs)
	}
	types := req.CompatibleTypes
	if types == nil {
		types = []string{"any"}
	}
	_, err := h.DB.Exec(`INSERT INTO supply_products (sku, name, description, category, price, image_url, images, is_top_seller, stock_qty, in_stock, compatible_types, specs, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,COALESCE($8,FALSE),COALESCE($9,0),COALESCE($9,0)>0,$10,$11::jsonb,COALESCE($12,TRUE))
        ON CONFLICT (sku) DO UPDATE SET name=$2, description=COALESCE($3,supply_products.description), category=COALESCE($4,supply_products.category), price=$5,
            image_url=COALESCE($6,supply_products.image_url), images=CASE WHEN $13 THEN $7::jsonb ELSE supply_products.images END, is_top_seller=COALESCE($8,supply_products.is_top_seller),
            stock_qty=COALESCE($9,supply_products.stock_qty), in_stock=COALESCE($9,supply_products.stock_qty)>0, compatible_types=$10,
            specs=CASE WHEN $14 THEN $11::jsonb ELSE supply_products.specs END, is_active=COALESCE($12,supply_products.is_active), updated_at=NOW()`,
		c.Param("sku"), req.Name, req.Description, req.Category, req.Price, req.ImageURL, images, req.IsTopSeller, req.StockQty, pq.Array(types), specs, req.IsActive, req.Images != nil, req.Specs != nil)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Failed to save product: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "Product saved", nil)
}
