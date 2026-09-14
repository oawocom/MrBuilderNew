package routes

import (
	"database/sql"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/handlers"
	"github.com/mrbuilder/backend/internal/middleware"
)

func Setup(r *gin.Engine, db *sql.DB, jwtSecret string) {
	auth := handlers.NewAuthHandler(db, jwtSecret)
	profile := handlers.NewProfileHandler(db)
	job := handlers.NewJobHandler(db)
	quote := handlers.NewQuoteHandler(db)
	msg := handlers.NewMessageHandler(db)
	rating := handlers.NewRatingHandler(db)
	notif := handlers.NewNotificationHandler(db)
	warranty := handlers.NewWarrantyHandler(db)
	platform := handlers.NewPlatformHandler(db)
	admin := handlers.NewAdminHandler(db)

	api := r.Group("/api/v1")
	{
		// Public routes
		api.POST("/register", auth.Register)
		api.POST("/login", auth.Login)
		api.POST("/refresh", auth.Refresh)
		api.POST("/logout", auth.Logout)
		api.GET("/contractors", profile.ListContractors)
		api.GET("/contractors/:id", profile.GetContractorPublic)
		api.POST("/waitlist", platform.JoinWaitlist)
		api.POST("/partner-requests", platform.CreatePartnerRequest)

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthRequired(jwtSecret))
		{
			protected.GET("/me", auth.Me)
			protected.GET("/profile", profile.GetMyProfile)
			protected.PUT("/profile", profile.UpdateMyProfile)
			protected.PUT("/profile/skills", middleware.RoleRequired("contractor"), profile.UpdateSkills)
			protected.PUT("/profile/pergola-systems", middleware.RoleRequired("contractor"), profile.UpdatePergolaSystems)

			// Jobs
			protected.POST("/jobs", middleware.RoleRequired("consumer"), job.Create)
			protected.GET("/jobs", middleware.RoleRequired("contractor", "admin"), job.ListOpen)
			protected.GET("/jobs/me", job.ListMine)
			protected.GET("/jobs/:id", job.Get)
			protected.PATCH("/jobs/:id/start", middleware.RoleRequired("contractor"), job.Start)
			protected.PATCH("/jobs/:id/complete", middleware.RoleRequired("contractor"), job.Complete)
			protected.PATCH("/jobs/:id/confirm", middleware.RoleRequired("consumer"), job.Confirm)
			protected.PATCH("/jobs/:id/cancel", job.Cancel)

			// Quotes & invoices
			protected.POST("/jobs/:id/quotes", middleware.RoleRequired("contractor"), quote.Create)
			protected.GET("/jobs/:id/quotes", quote.ListForJob)
			protected.GET("/quotes/me", middleware.RoleRequired("contractor"), quote.ListMine)
			protected.PATCH("/quotes/:id/accept", middleware.RoleRequired("consumer"), quote.Accept)
			protected.PATCH("/quotes/:id/reject", middleware.RoleRequired("consumer"), quote.Reject)
			protected.PATCH("/quotes/:id/withdraw", middleware.RoleRequired("contractor"), quote.Withdraw)
			protected.GET("/invoices/me", quote.ListMyInvoices)

			// Messaging
			protected.POST("/jobs/:id/conversation", msg.GetOrCreate)
			protected.GET("/conversations", msg.List)
			protected.GET("/conversations/:id/messages", msg.ListMessages)
			protected.POST("/conversations/:id/messages", msg.Send)

			// Ratings
			protected.POST("/jobs/:id/ratings", rating.Create)
			protected.GET("/jobs/:id/ratings", rating.ListForJob)
			protected.GET("/users/:id/ratings", rating.ListForUser)

			// Notifications
			protected.GET("/notifications", notif.List)
			protected.PATCH("/notifications/:id/read", notif.MarkRead)
			protected.PATCH("/notifications/read-all", notif.MarkAllRead)

			// Warranties & claims
			protected.POST("/jobs/:id/warranties", middleware.RoleRequired("contractor"), warranty.Create)
			protected.GET("/warranties/me", warranty.ListMine)
			protected.POST("/warranties/:id/claims", middleware.RoleRequired("consumer"), warranty.CreateClaim)
			protected.GET("/claims/me", middleware.RoleRequired("consumer"), warranty.ListMyClaims)

			// Admin
			adm := protected.Group("/admin")
			adm.Use(middleware.RoleRequired("admin"))
			{
				adm.GET("/stats", admin.Stats)
				adm.GET("/users", admin.ListUsers)
				adm.PATCH("/users/:id/status", admin.SetUserStatus)
				adm.GET("/jobs", admin.ListJobs)
				adm.GET("/claims", admin.ListClaims)
				adm.PATCH("/claims/:id", admin.SetClaimStatus)
				adm.GET("/waitlist", admin.ListWaitlist)
				adm.GET("/partner-requests", admin.ListPartnerRequests)
				adm.GET("/invoices", admin.ListInvoices)
				adm.GET("/warranties", admin.ListWarranties)
				adm.PATCH("/waitlist/:id/activate", admin.ActivateWaitlist)
				adm.GET("/system", admin.SystemInfo)
			}
		}
	}
}
