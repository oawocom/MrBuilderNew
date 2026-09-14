package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/utils"
)

type PlatformHandler struct {
	DB *sql.DB
}

func NewPlatformHandler(db *sql.DB) *PlatformHandler {
	return &PlatformHandler{DB: db}
}

// POST /waitlist — public (For contractors page)
func (h *PlatformHandler) JoinWaitlist(c *gin.Context) {
	var req struct {
		FullName       string `json:"full_name" binding:"required"`
		Email          string `json:"email" binding:"required,email"`
		Phone          string `json:"phone"`
		InterestedRole string `json:"interested_role" binding:"omitempty,oneof=inspector service_team installation_team"`
		Country        string `json:"country"`
		State          string `json:"state"`
		City           string `json:"city"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var role interface{}
	if req.InterestedRole != "" {
		role = req.InterestedRole
	}

	_, err := h.DB.Exec(
		`INSERT INTO waitlist (full_name, email, phone, interested_role, country, state, city)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		req.FullName, req.Email, req.Phone, role, req.Country, req.State, req.City,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to join waitlist")
		return
	}
	utils.Success(c, http.StatusCreated, "You have been added to the waitlist", nil)
}

// POST /partner-requests — public (Partner with us page)
func (h *PlatformHandler) CreatePartnerRequest(c *gin.Context) {
	var req struct {
		CompanyName    string `json:"company_name" binding:"required"`
		ContactPerson  string `json:"contact_person" binding:"required"`
		Email          string `json:"email" binding:"required,email"`
		Phone          string `json:"phone"`
		WebsiteURL     string `json:"website_url"`
		TypeOfBusiness string `json:"type_of_business" binding:"required,oneof=manufacturer retailer_or_reseller designer_or_builder architect_or_home_developer other"`
		Country        string `json:"country"`
		Message        string `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	_, err := h.DB.Exec(
		`INSERT INTO partner_requests (company_name, contact_person, email, phone, website_url, type_of_business, country, message)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		req.CompanyName, req.ContactPerson, req.Email, req.Phone, req.WebsiteURL, req.TypeOfBusiness, req.Country, req.Message,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to submit request")
		return
	}
	utils.Success(c, http.StatusCreated, "Partner request submitted", nil)
}
