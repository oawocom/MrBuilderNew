package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/mrbuilder/backend/internal/config"
	"github.com/mrbuilder/backend/internal/handlers"
	"github.com/mrbuilder/backend/internal/integrations"
	"github.com/mrbuilder/backend/internal/middleware"
	"github.com/mrbuilder/backend/internal/routes"
)

func main() {
	cfg := config.Load()

	db := config.ConnectDB(cfg.DatabaseURL)
	defer db.Close()

	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(middleware.CORS())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "mrbuilder-api"})
	})

	integrations.Init(db, os.Getenv("SETTINGS_ENC_KEY"))
	routes.Setup(r, db, cfg.JWTSecret)
	handlers.StartAutoConfirm(db)

	fmt.Printf("🚀 MrBuilder API running on port %s\n", cfg.Port)
	log.Fatal(r.Run(":" + cfg.Port))
}
