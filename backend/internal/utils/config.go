package utils

import (
	"os"
	"strconv"
)

type Config struct {
	Port             string
	Host             string
	Env              string
	DatabaseURL      string // PostgreSQL connection URL
	DatabasePath     string // SQLite path (fallback for local dev)
	JWTSecret        string
	JWTExpiryHours   int
	AllowedOrigins   string
	MaxVideoSizeMB   int
	MaxImageSizeMB   int
	StoragePath      string
	VideoPath        string
	ThumbnailPath    string
	AdPath           string
	DefaultAdminUser string
	DefaultAdminPass string
}

func LoadConfig() *Config {
	return &Config{
		Port:             getEnv("PORT", "5000"),
		Host:             getEnv("HOST", "localhost"),
		Env:              getEnv("ENV", "development"),
		DatabaseURL:      getEnv("DATABASE_URL", ""),
		DatabasePath:     getEnv("DATABASE_PATH", "./titan.db"),
		JWTSecret:        getEnv("JWT_SECRET", "default-secret-change-me"),
		JWTExpiryHours:   getEnvAsInt("JWT_EXPIRY_HOURS", 24),
		AllowedOrigins:   getEnv("ALLOWED_ORIGINS", "*"),
		MaxVideoSizeMB:   getEnvAsInt("MAX_VIDEO_SIZE_MB", 2048),
		MaxImageSizeMB:   getEnvAsInt("MAX_IMAGE_SIZE_MB", 5),
		StoragePath:      getEnv("STORAGE_PATH", "./storage"),
		VideoPath:        getEnv("VIDEO_PATH", "./storage/videos"),
		ThumbnailPath:    getEnv("THUMBNAIL_PATH", "./storage/thumbnails"),
		AdPath:           getEnv("AD_PATH", "./storage/ads"),
		DefaultAdminUser: getEnv("DEFAULT_ADMIN_USER", "admin"),
		DefaultAdminPass: getEnv("DEFAULT_ADMIN_PASS", "admin123"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
