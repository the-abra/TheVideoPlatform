package main

import (
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"titan-backend/internal/database"
	"titan-backend/internal/handlers"
	"titan-backend/internal/middleware"
	"titan-backend/internal/models"
	"titan-backend/internal/services"
	"titan-backend/internal/utils"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load configuration
	config := utils.LoadConfig()

	// Initialize database
	db, err := database.InitDB(config.DatabasePath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Seed default data
	if err := database.SeedDefaultData(db, config.DefaultAdminUser, config.DefaultAdminPass); err != nil {
		log.Fatalf("Failed to seed default data: %v", err)
	}

	// Initialize repositories
	userRepo := models.NewUserRepository(db)
	videoRepo := models.NewVideoRepository(db)
	viewLogRepo := models.NewViewLogRepository(db)
	categoryRepo := models.NewCategoryRepository(db)
	adRepo := models.NewAdRepository(db)
	settingsRepo := models.NewSettingsRepository(db)
	serverLogRepo := models.NewServerLogRepository(db)
	fileRepo := models.NewFileRepository(db)

	// Initialize services
	authService := services.NewAuthService(config.JWTSecret, config.JWTExpiryHours)
	storageService := services.NewStorageService(config.VideoPath, config.ThumbnailPath, config.AdPath)
	analyticsService := services.NewAnalyticsService(db)
	serverService := services.NewServerService(db, serverLogRepo)
	fileService := services.NewFileService(config.StoragePath)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(db)
	authHandler := handlers.NewAuthHandler(userRepo, authService)
	videoHandler := handlers.NewVideoHandler(videoRepo, viewLogRepo, storageService)
	categoryHandler := handlers.NewCategoryHandler(categoryRepo)
	adHandler := handlers.NewAdHandler(adRepo, storageService)
	settingsHandler := handlers.NewSettingsHandler(settingsRepo)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService)
	serverHandler := handlers.NewServerHandler(serverService, serverLogRepo)
	fileHandler := handlers.NewFileHandler(fileRepo, fileService)
	terminalHandler := handlers.NewTerminalHandler()

	// Create router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Recovery)
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   strings.Split(config.AllowedOrigins, ","),
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Request counting middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			serverService.IncrementRequestCount()
			next.ServeHTTP(w, r)
		})
	})

	// Health check
	r.Get("/health", healthHandler.HealthCheck)

	// WebSocket routes (no auth required for real-time streaming)
	serverHandler.RegisterWebSocketRoutes(r)

	// Terminal WebSocket (for interactive shell)
	r.Get("/ws/terminal", terminalHandler.HandleTerminal)

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Public auth routes
		r.Post("/auth/login", authHandler.Login)

		// Public video routes
		r.Get("/videos", videoHandler.GetAll)
		r.Get("/videos/search", videoHandler.Search)
		r.Get("/videos/{id}", videoHandler.GetByID)
		r.Post("/videos/{id}/view", videoHandler.IncrementView)

		// Public category routes
		r.Get("/categories", categoryHandler.GetAll)

		// Public ad routes
		r.Get("/ads", adHandler.GetAll)
		r.Get("/ads/stats", adHandler.GetStats)
		r.Get("/ads/{id}", adHandler.GetByID)
		r.Post("/ads/{id}/click", adHandler.TrackClick)
		r.Post("/ads/{id}/impression", adHandler.TrackImpression)

		// Public settings routes
		r.Get("/settings", settingsHandler.Get)

		// Public file sharing routes
		fileHandler.RegisterPublicRoutes(r)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(authService))

			// Auth verification
			r.Get("/auth/verify", authHandler.Verify)

			// Video management
			r.Post("/videos", videoHandler.Create)
			r.Put("/videos/{id}", videoHandler.Update)
			r.Delete("/videos/{id}", videoHandler.Delete)

			// Category management
			r.Post("/categories", categoryHandler.Create)
			r.Put("/categories/{id}", categoryHandler.Update)
			r.Delete("/categories/{id}", categoryHandler.Delete)

			// Ad management
			r.Post("/ads", adHandler.Create)
			r.Put("/ads/{id}", adHandler.Update)
			r.Patch("/ads/{id}/toggle", adHandler.Toggle)
			r.Delete("/ads/{id}", adHandler.Delete)

			// Settings management
			r.Put("/settings", settingsHandler.Update)

			// Analytics
			r.Get("/analytics", analyticsHandler.GetAnalytics)

			// Server management (protected)
			serverHandler.RegisterRoutes(r)

			// File management (protected)
			fileHandler.RegisterRoutes(r)
		})
	})

	// Serve static files from storage directory
	fileServer := http.FileServer(http.Dir("./storage"))
	r.Handle("/storage/*", http.StripPrefix("/storage/", fileServer))

	// Log server startup
	serverService.Log("info", "Server starting on port "+config.Port, "main")

	// Start server
	addr := ":" + config.Port
	log.Printf("Server starting on http://localhost%s", addr)
	log.Printf("Environment: %s", config.Env)
	log.Printf("Database: %s", config.DatabasePath)
	log.Printf("Admin user: %s", config.DefaultAdminUser)

	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
