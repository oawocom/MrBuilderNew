package config

import (
"os"
)

type Config struct {
Port        string
DatabaseURL string
JWTSecret   string
Environment string
}

func Load() *Config {
return &Config{
Port:        getEnv("PORT", "8080"),
DatabaseURL: getEnv("DATABASE_URL", "postgres://mrbuilder:MrB1ld3r_DB2026@db:5432/mrbuilder_db?sslmode=disable"),
JWTSecret:   getEnv("JWT_SECRET", "mrbuilder-secret-change-in-production"),
Environment: getEnv("ENVIRONMENT", "development"),
}
}

func getEnv(key, fallback string) string {
if val := os.Getenv(key); val != "" {
return val
}
return fallback
}
