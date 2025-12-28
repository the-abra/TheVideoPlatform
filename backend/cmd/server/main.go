package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

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
	db, err := database.InitDB(config.DatabaseURL, config.DatabasePath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Run migrations only for SQLite (PostgreSQL uses migrate tool in Docker)
	if config.DatabaseURL == "" {
		log.Println("Running SQLite migrations...")
		if err := database.RunMigrations(db); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
	} else {
		log.Println("Using PostgreSQL - migrations handled by migrate tool")
	}

	// Seed default data (admin user creation)
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
	fileOpsHandler := handlers.NewFileOperations(fileRepo, fileService)
	directoryHandler := handlers.NewDirectoryHandler(fileService)
	terminalHandler := handlers.NewTerminalHandler(authService) // Pass authService for authentication
	securityHandler := handlers.NewSecurityHandler()

	// Create router
	r := chi.NewRouter()

	// Initialize rate limiters
	generalLimiter := middleware.NewRateLimiter(100, 1*time.Minute)      // 100 req/min for general API
	loginLimiter := middleware.NewRateLimiter(5, 1*time.Minute)          // 5 req/min for login
	uploadLimiter := middleware.NewRateLimiter(10, 1*time.Hour)          // 10 req/hour for uploads

	// Middleware
	r.Use(middleware.Recovery)
	r.Use(middleware.Logger)
	r.Use(middleware.SecurityValidationMiddleware()) // Security validation
	r.Use(middleware.RateLimitMiddleware(generalLimiter)) // General rate limiting

	// CORS Middleware - Environment-aware security configuration
	r.Use(cors.Handler(cors.Options{
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			// Get environment mode
			env := os.Getenv("ENV")

			// Development mode: Allow localhost and local network
			if env == "development" {
				if origin == "" {
					return true // Allow same-origin requests
				}
				// Allow localhost and local IPs
				if strings.HasPrefix(origin, "http://localhost:") ||
					strings.HasPrefix(origin, "http://127.0.0.1:") ||
					strings.HasPrefix(origin, "http://10.") ||
					strings.HasPrefix(origin, "http://192.168.") ||
					strings.HasPrefix(origin, "http://172.") {
					return true
				}
			}

			// Production mode: Only allow configured origins
			allowedOrigins := strings.Split(config.AllowedOrigins, ",")
			for _, allowed := range allowedOrigins {
				allowed = strings.TrimSpace(allowed)
				if allowed != "" && allowed != "*" && origin == allowed {
					return true
				}
			}

			// Also check FRONTEND_URL environment variable
			frontendURL := os.Getenv("FRONTEND_URL")
			if frontendURL != "" && origin == frontendURL {
				return true
			}

			log.Printf("[CORS] SECURITY: Blocked request from unauthorized origin: %s", origin)
			return false
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Requested-With"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Request counting middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			serverService.IncrementRequestCount()
			next.ServeHTTP(w, r)
		})
	})

	// Health check endpoints
	r.Get("/health", healthHandler.HealthCheck)           // Basic health check
	r.Get("/health/ready", healthHandler.ReadinessCheck)  // Detailed readiness check
	r.Get("/health/live", healthHandler.LivenessCheck)    // Kubernetes liveness probe

	// WebSocket routes (no auth required for real-time streaming)
	serverHandler.RegisterWebSocketRoutes(r)

	// Terminal WebSocket (for interactive shell)
	r.Get("/ws/terminal", terminalHandler.HandleTerminal)

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Public auth routes - with stricter rate limiting
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimitMiddleware(loginLimiter))
			r.Post("/auth/login", authHandler.Login)
		})

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

		// Public security routes
		r.Get("/check-vpn", securityHandler.CheckVPN)

		// Public file sharing routes
		fileOpsHandler.RegisterPublicRoutes(r)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(authService))

			// Auth verification
			r.Get("/auth/verify", authHandler.Verify)

			// Video management - with upload rate limiting
			r.Group(func(r chi.Router) {
				r.Use(middleware.RateLimitMiddleware(uploadLimiter))
				r.Post("/videos", videoHandler.Create)
			})
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
			fileOpsHandler.RegisterRoutes(r)

			// Directory management (protected)
			directoryHandler.RegisterRoutes(r)
		})
	})

	// Serve static files from storage directory
	fileServer := http.FileServer(http.Dir("./storage"))
	r.Handle("/storage/*", http.StripPrefix("/storage/", fileServer))

	// Log server startup
	serverService.Log("info", "Server starting on port "+config.Port, "main")

	// Start server with graceful shutdown
	addr := "0.0.0.0:" + config.Port
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Server startup info
	log.Printf("Server starting on http://0.0.0.0:%s", config.Port)
	log.Printf("Server accessible at http://<your-ip>:%s", config.Port)
	log.Printf("Environment: %s", config.Env)
	if config.DatabaseURL != "" {
		log.Printf("Database: PostgreSQL")
	} else {
		log.Printf("Database: SQLite (%s)", config.DatabasePath)
	}
	log.Printf("Admin user: %s", config.DefaultAdminUser)
	log.Printf("Health endpoints:")
	log.Printf("  - /health (basic)")
	log.Printf("  - /health/ready (detailed)")
	log.Printf("  - /health/live (liveness)")

	// Start server in goroutine
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Server is shutting down gracefully...")
	serverService.Log("info", "Server shutdown initiated", "main")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown server
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
		serverService.Log("error", "Server forced shutdown: "+err.Error(), "main")
	}

	log.Println("Server stopped")
	serverService.Log("info", "Server stopped successfully", "main")
}
