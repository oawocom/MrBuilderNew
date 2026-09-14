package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"strconv"

	"github.com/mrbuilder/backend/internal/models"
	"github.com/mrbuilder/backend/internal/utils"
)

type ProfileHandler struct {
	DB *sql.DB
}

func NewProfileHandler(db *sql.DB) *ProfileHandler {
	return &ProfileHandler{DB: db}
}

func (h *ProfileHandler) loadContractorLists(profileID string, p *models.ContractorProfile) {
	p.Skills = []string{}
	p.PergolaSystems = []string{}

	rows, err := h.DB.Query(`SELECT skill_name FROM contractor_skills WHERE contractor_id=$1 ORDER BY skill_name`, profileID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var s string
			if rows.Scan(&s) == nil {
				p.Skills = append(p.Skills, s)
			}
		}
	}

	rows2, err := h.DB.Query(`SELECT system_name FROM contractor_pergola_systems WHERE contractor_id=$1 ORDER BY system_name`, profileID)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var s string
			if rows2.Scan(&s) == nil {
				p.PergolaSystems = append(p.PergolaSystems, s)
			}
		}
	}
}

func (h *ProfileHandler) getContractorByUserID(userID string) (*models.ContractorProfile, error) {
	var p models.ContractorProfile
	err := h.DB.QueryRow(
		`SELECT id, user_id, role, business_name, business_type, years_of_experience,
		 professional_title, hourly_rate, bio, address_line1, address_line2, city, state,
		 zip_code, country, insurance_certificate_url, contractor_license_url,
		 background_check_passed, rating_avg, jobs_completed, is_verified, created_at, updated_at
		 FROM contractor_profiles WHERE user_id=$1`,
		userID,
	).Scan(&p.ID, &p.UserID, &p.Role, &p.BusinessName, &p.BusinessType, &p.YearsOfExperience,
		&p.ProfessionalTitle, &p.HourlyRate, &p.Bio, &p.AddressLine1, &p.AddressLine2, &p.City,
		&p.State, &p.ZipCode, &p.Country, &p.InsuranceCertificateURL, &p.ContractorLicenseURL,
		&p.BackgroundCheckPassed, &p.RatingAvg, &p.JobsCompleted, &p.IsVerified, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	h.loadContractorLists(p.ID, &p)
	return &p, nil
}

// GET /profile — returns the caller's profile based on their role
func (h *ProfileHandler) GetMyProfile(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")

	if role == "contractor" {
		p, err := h.getContractorByUserID(userID)
		if err != nil {
			utils.Error(c, http.StatusNotFound, "Profile not found")
			return
		}
		utils.Success(c, http.StatusOK, "", p)
		return
	}

	var p models.ConsumerProfile
	err := h.DB.QueryRow(
		`SELECT id, user_id, address_line1, address_line2, city, state, zip_code, country, created_at, updated_at
		 FROM consumer_profiles WHERE user_id=$1`,
		userID,
	).Scan(&p.ID, &p.UserID, &p.AddressLine1, &p.AddressLine2, &p.City, &p.State,
		&p.ZipCode, &p.Country, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Profile not found")
		return
	}
	utils.Success(c, http.StatusOK, "", p)
}

// PUT /profile — updates the caller's profile based on their role
func (h *ProfileHandler) UpdateMyProfile(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("user_role")

	if role == "contractor" {
		var req models.UpdateContractorProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}

		set := []string{}
		args := []interface{}{}
		add := func(col string, val interface{}) {
			args = append(args, val)
			set = append(set, col+"=$"+itoa(len(args)))
		}

		if req.Role != nil {
			add("role", *req.Role)
		}
		if req.BusinessName != nil {
			add("business_name", *req.BusinessName)
		}
		if req.BusinessType != nil {
			add("business_type", *req.BusinessType)
		}
		if req.YearsOfExperience != nil {
			add("years_of_experience", *req.YearsOfExperience)
		}
		if req.ProfessionalTitle != nil {
			add("professional_title", *req.ProfessionalTitle)
		}
		if req.HourlyRate != nil {
			add("hourly_rate", *req.HourlyRate)
		}
		if req.Bio != nil {
			add("bio", *req.Bio)
		}
		if req.AddressLine1 != nil {
			add("address_line1", *req.AddressLine1)
		}
		if req.AddressLine2 != nil {
			add("address_line2", *req.AddressLine2)
		}
		if req.City != nil {
			add("city", *req.City)
		}
		if req.State != nil {
			add("state", *req.State)
		}
		if req.ZipCode != nil {
			add("zip_code", *req.ZipCode)
		}
		if req.Country != nil {
			add("country", *req.Country)
		}

		if len(set) == 0 {
			utils.Error(c, http.StatusBadRequest, "No fields to update")
			return
		}

		args = append(args, userID)
		query := "UPDATE contractor_profiles SET " + strings.Join(set, ", ") +
			", updated_at=NOW() WHERE user_id=$" + itoa(len(args))
		if _, err := h.DB.Exec(query, args...); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update profile")
			return
		}

		p, err := h.getContractorByUserID(userID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load profile")
			return
		}
		utils.Success(c, http.StatusOK, "Profile updated", p)
		return
	}

	var req models.UpdateConsumerProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	set := []string{}
	args := []interface{}{}
	add := func(col string, val interface{}) {
		args = append(args, val)
		set = append(set, col+"=$"+itoa(len(args)))
	}

	if req.AddressLine1 != nil {
		add("address_line1", *req.AddressLine1)
	}
	if req.AddressLine2 != nil {
		add("address_line2", *req.AddressLine2)
	}
	if req.City != nil {
		add("city", *req.City)
	}
	if req.State != nil {
		add("state", *req.State)
	}
	if req.ZipCode != nil {
		add("zip_code", *req.ZipCode)
	}
	if req.Country != nil {
		add("country", *req.Country)
	}

	if len(set) == 0 {
		utils.Error(c, http.StatusBadRequest, "No fields to update")
		return
	}

	args = append(args, userID)
	query := "UPDATE consumer_profiles SET " + strings.Join(set, ", ") +
		", updated_at=NOW() WHERE user_id=$" + itoa(len(args))
	if _, err := h.DB.Exec(query, args...); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to update profile")
		return
	}

	var p models.ConsumerProfile
	err := h.DB.QueryRow(
		`SELECT id, user_id, address_line1, address_line2, city, state, zip_code, country, created_at, updated_at
		 FROM consumer_profiles WHERE user_id=$1`,
		userID,
	).Scan(&p.ID, &p.UserID, &p.AddressLine1, &p.AddressLine2, &p.City, &p.State,
		&p.ZipCode, &p.Country, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load profile")
		return
	}
	utils.Success(c, http.StatusOK, "Profile updated", p)
}

// PUT /profile/skills — replaces the contractor's skill list
func (h *ProfileHandler) UpdateSkills(c *gin.Context) {
	h.replaceList(c, "contractor_skills", "skill_name")
}

// PUT /profile/pergola-systems — replaces the contractor's pergola system list
func (h *ProfileHandler) UpdatePergolaSystems(c *gin.Context) {
	h.replaceList(c, "contractor_pergola_systems", "system_name")
}

func (h *ProfileHandler) replaceList(c *gin.Context, table, column string) {
	userID := c.GetString("user_id")

	var req models.UpdateListRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var profileID string
	if err := h.DB.QueryRow(`SELECT id FROM contractor_profiles WHERE user_id=$1`, userID).Scan(&profileID); err != nil {
		utils.Error(c, http.StatusNotFound, "Contractor profile not found")
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Transaction failed")
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM "+table+" WHERE contractor_id=$1", profileID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to update list")
		return
	}

	for _, item := range req.Items {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		if _, err := tx.Exec(
			"INSERT INTO "+table+" (contractor_id, "+column+") VALUES ($1, $2) ON CONFLICT DO NOTHING",
			profileID, item,
		); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update list")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		utils.Error(c, http.StatusInternalServerError, "Transaction commit failed")
		return
	}

	p, err := h.getContractorByUserID(userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to load profile")
		return
	}
	utils.Success(c, http.StatusOK, "List updated", p)
}

// GET /contractors/:id — public contractor profile (by user id)
func (h *ProfileHandler) GetContractorPublic(c *gin.Context) {
	targetUserID := c.Param("id")

	p, err := h.getContractorByUserID(targetUserID)
	if err != nil {
		utils.Error(c, http.StatusNotFound, "Contractor not found")
		return
	}

	var firstName, lastName string
	var avatarURL *string
	h.DB.QueryRow(`SELECT first_name, last_name, avatar_url FROM users WHERE id=$1`, targetUserID).
		Scan(&firstName, &lastName, &avatarURL)

	utils.Success(c, http.StatusOK, "", gin.H{
		"first_name": firstName,
		"last_name":  lastName,
		"avatar_url": avatarURL,
		"profile":    p,
	})
}

// GET /contractors — list verified contractors (public, paginated)
func (h *ProfileHandler) ListContractors(c *gin.Context) {
	page, limit := utils.Pagination(c)

	var total int64
	h.DB.QueryRow(`SELECT COUNT(*) FROM contractor_profiles`).Scan(&total)

	rows, err := h.DB.Query(
		`SELECT cp.user_id, u.first_name, u.last_name, u.avatar_url, cp.role,
		 cp.professional_title, cp.city, cp.state, cp.rating_avg, cp.jobs_completed, cp.is_verified
		 FROM contractor_profiles cp
		 JOIN users u ON u.id = cp.user_id
		 WHERE u.status = 'active'
		 ORDER BY cp.rating_avg DESC, cp.jobs_completed DESC
		 LIMIT $1 OFFSET $2`,
		limit, (page-1)*limit,
	)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to list contractors")
		return
	}
	defer rows.Close()

	list := []gin.H{}
	for rows.Next() {
		var userID, firstName, lastName, role string
		var avatarURL, title, city, state *string
		var rating float64
		var jobsDone int
		var verified bool
		if err := rows.Scan(&userID, &firstName, &lastName, &avatarURL, &role,
			&title, &city, &state, &rating, &jobsDone, &verified); err != nil {
			continue
		}
		list = append(list, gin.H{
			"user_id":            userID,
			"first_name":         firstName,
			"last_name":          lastName,
			"avatar_url":         avatarURL,
			"role":               role,
			"professional_title": title,
			"city":               city,
			"state":              state,
			"rating_avg":         rating,
			"jobs_completed":     jobsDone,
			"is_verified":        verified,
		})
	}

	utils.Paginated(c, http.StatusOK, list, total, page, limit)
}

func itoa(n int) string {
	return strconv.Itoa(n)
}
