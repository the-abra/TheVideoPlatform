# Backend Productivity Enhancements for Titan UI/UX Design Platform

## Overview
This document outlines productivity enhancements for the Go-based backend of the Titan UI/UX Design Platform. These improvements will enhance development efficiency, maintainability, and overall system performance.

## Code Structure & Maintainability

### 1. Error Handling Patterns
- Implement consistent error handling throughout the codebase
- Example implementation:
```go
package errors

import (
    "fmt"
    "net/http"
)

// AppError represents an application error
type AppError struct {
    Code    int
    Message string
    Err     error
}

func (e *AppError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s: %v", e.Message, e.Err)
    }
    return e.Message
}

// NewAppError creates a new AppError
func NewAppError(code int, message string, err error) *AppError {
    return &AppError{
        Code:    code,
        Message: message,
        Err:     err,
    }
}

// Common error types
var (
    ErrNotFound = &AppError{Code: http.StatusNotFound, Message: "resource not found"}
    ErrInternal = &AppError{Code: http.StatusInternalServerError, Message: "internal server error"}
    ErrBadRequest = &AppError{Code: http.StatusBadRequest, Message: "bad request"}
    ErrUnauthorized = &AppError{Code: http.StatusUnauthorized, Message: "unauthorized"}
    ErrForbidden = &AppError{Code: http.StatusForbidden, Message: "forbidden"}
)

// Error handling in handlers
func (h *VideoHandler) GetByID(w http.ResponseWriter, r *http.Request) {
    id, err := strconv.Atoi(chi.URLParam(r, "id"))
    if err != nil {
        models.RespondError(w, "Invalid video ID", http.StatusBadRequest)
        return
    }

    video, err := h.videoRepo.GetByID(id)
    if err != nil {
        if errors.Is(err, models.ErrNotFound) {
            models.RespondError(w, "Video not found", http.StatusNotFound)
            return
        }
        models.RespondError(w, "Failed to get video", http.StatusInternalServerError)
        return
    }

    models.RespondSuccess(w, "", map[string]interface{}{
        "video": video,
    }, http.StatusOK)
}
```

### 2. Structured Logging
- Implement structured logging with log levels and correlation IDs
- Example implementation:
```go
package logger

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    "github.com/rs/zerolog"
)

type contextKey string

const RequestIDKey contextKey = "request_id"

// Logger wraps zerolog for application use
type Logger struct {
    logger *zerolog.Logger
}

// New creates a new logger instance
func New() *Logger {
    output := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}
    logger := zerolog.New(output).With().Timestamp().Logger()
    
    return &Logger{
        logger: &logger,
    }
}

// WithRequestID adds request ID to the logger
func (l *Logger) WithRequestID(ctx context.Context) *zerolog.Logger {
    requestID, ok := ctx.Value(RequestIDKey).(string)
    if !ok {
        requestID = generateRequestID()
    }
    
    return l.logger.With().Str("request_id", requestID).Logger()
}

// Helper functions for different log levels
func (l *Logger) Info(ctx context.Context, msg string, fields map[string]interface{}) {
    logger := l.WithRequestID(ctx)
    event := logger.Info()
    for k, v := range fields {
        event.Interface(k, v)
    }
    event.Msg(msg)
}

func (l *Logger) Error(ctx context.Context, msg string, fields map[string]interface{}) {
    logger := l.WithRequestID(ctx)
    event := logger.Error()
    for k, v := range fields {
        event.Interface(k, v)
    }
    event.Msg(msg)
}

func (l *Logger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {
    logger := l.WithRequestID(ctx)
    event := logger.Debug()
    for k, v := range fields {
        event.Interface(k, v)
    }
    event.Msg(msg)
}

// Middleware to add request ID to context
func RequestIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestID := r.Header.Get("X-Request-ID")
        if requestID == "" {
            requestID = generateRequestID()
        }
        
        ctx := context.WithValue(r.Context(), RequestIDKey, requestID)
        w.Header().Set("X-Request-ID", requestID)
        
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func generateRequestID() string {
    return fmt.Sprintf("%d", time.Now().UnixNano())
}
```

### 3. Configuration Management
- Implement proper configuration management with validation
- Example implementation:
```go
package config

import (
    "fmt"
    "os"
    "strconv"
    "strings"
    "time"

    "github.com/kelseyhightower/envconfig"
)

type Config struct {
    Port               string        `envconfig:"PORT" default:"5000"`
    DatabasePath       string        `envconfig:"DATABASE_PATH" default:"./titan.db"`
    JWTSecret          string        `envconfig:"JWT_SECRET"`
    JWTExpiryHours     int           `envconfig:"JWT_EXPIRY_HOURS" default:"24"`
    AllowedOrigins     string        `envconfig:"ALLOWED_ORIGINS" default:"http://localhost:3000"`
    MaxVideoSizeMB     int64         `envconfig:"MAX_VIDEO_SIZE_MB" default:"2048"`
    MaxImageSizeMB     int64         `envconfig:"MAX_IMAGE_SIZE_MB" default:"5"`
    StoragePath        string        `envconfig:"STORAGE_PATH" default:"./storage"`
    VideoPath          string        `envconfig:"VIDEO_PATH" default:"./storage/videos"`
    ThumbnailPath      string        `envconfig:"THUMBNAIL_PATH" default:"./storage/thumbnails"`
    ADPath             string        `envconfig:"AD_PATH" default:"./storage/ads"`
    DefaultAdminUsername string      `envconfig:"DEFAULT_ADMIN_USERNAME" default:"admin"`
    DefaultAdminPassword string      `envconfig:"DEFAULT_ADMIN_PASSWORD" default:"admin"`
    Environment        string        `envconfig:"ENV" default:"development"`
    LogLevel           string        `envconfig:"LOG_LEVEL" default:"info"`
    RequestTimeout     time.Duration `envconfig:"REQUEST_TIMEOUT" default:"30s"`
    DBMaxOpenConns     int           `envconfig:"DB_MAX_OPEN_CONNS" default:"25"`
    DBMaxIdleConns     int           `envconfig:"DB_MAX_IDLE_CONNS" default:"25"`
    DBConnMaxLifetime  time.Duration `envconfig:"DB_CONN_MAX_LIFETIME" default:"5m"`
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        return nil, fmt.Errorf("failed to load config: %v", err)
    }

    // Validate required fields
    if cfg.JWTSecret == "" {
        return nil, fmt.Errorf("JWT_SECRET is required")
    }

    // Validate paths
    if err := validatePaths(&cfg); err != nil {
        return nil, err
    }

    return &cfg, nil
}

// GetAllowedOrigins returns a slice of allowed origins
func (c *Config) GetAllowedOrigins() []string {
    return strings.Split(c.AllowedOrigins, ",")
}

// validatePaths ensures required directories exist
func validatePaths(cfg *Config) error {
    paths := []string{cfg.StoragePath, cfg.VideoPath, cfg.ThumbnailPath, cfg.ADPath}
    
    for _, path := range paths {
        if err := os.MkdirAll(path, 0755); err != nil {
            return fmt.Errorf("failed to create directory %s: %v", path, err)
        }
    }
    
    return nil
}
```

### 4. Comprehensive Testing
- Add unit and integration tests with high coverage
- Example implementation:
```go
// video_handler_test.go
package handlers

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/go-chi/chi/v5"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"

    "titan-backend/internal/models"
    "titan-backend/internal/services"
)

// MockVideoRepository implements models.VideoRepository interface
type MockVideoRepository struct {
    mock.Mock
}

func (m *MockVideoRepository) GetByID(id int) (*models.Video, error) {
    args := m.Called(id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*models.Video), args.Error(1)
}

func (m *MockVideoRepository) GetAll() ([]models.Video, error) {
    args := m.Called()
    return args.Get(0).([]models.Video), args.Error(1)
}

func (m *MockVideoRepository) Create(video *models.Video) error {
    args := m.Called(video)
    return args.Error(0)
}

func (m *MockVideoRepository) Update(video *models.Video) error {
    args := m.Called(video)
    return args.Error(0)
}

func (m *MockVideoRepository) Delete(id int) error {
    args := m.Called(id)
    return args.Error(0)
}

func TestVideoHandler_GetByID(t *testing.T) {
    // Setup
    mockRepo := new(MockVideoRepository)
    mockAuthService := new(services.MockAuthService)
    handler := NewVideoHandler(mockRepo, nil, nil) // Assuming other dependencies

    // Create a test video
    testVideo := &models.Video{
        ID:       1,
        Title:    "Test Video",
        URL:      "http://example.com/video.mp4",
        Creator:  "Test Creator",
        Category: "Test Category",
    }

    // Test successful retrieval
    t.Run("Successful retrieval", func(t *testing.T) {
        mockRepo.On("GetByID", 1).Return(testVideo, nil)

        // Create request
        req, _ := http.NewRequest("GET", "/videos/1", nil)
        req = req.WithContext(context.WithValue(req.Context(), middleware.UserContextKey, &services.JWTClaims{
            UserID:   1,
            Username: "testuser",
            Role:     "user",
        }))

        // Create response recorder
        rr := httptest.NewRecorder()

        // Create router and register handler
        router := chi.NewRouter()
        router.Get("/videos/{id}", handler.GetByID)
        router.ServeHTTP(rr, req)

        // Assertions
        assert.Equal(t, http.StatusOK, rr.Code)

        var response map[string]interface{}
        err := json.Unmarshal(rr.Body.Bytes(), &response)
        assert.NoError(t, err)
        assert.Equal(t, true, response["success"])
        assert.Equal(t, "Test Video", response["data"].(map[string]interface{})["video"].(map[string]interface{})["title"])

        mockRepo.AssertExpectations(t)
    })

    // Test not found
    t.Run("Video not found", func(t *testing.T) {
        mockRepo.On("GetByID", 999).Return(nil, models.ErrNotFound)

        req, _ := http.NewRequest("GET", "/videos/999", nil)
        req = req.WithContext(context.WithValue(req.Context(), middleware.UserContextKey, &services.JWTClaims{
            UserID:   1,
            Username: "testuser",
            Role:     "user",
        }))

        rr := httptest.NewRecorder()

        router := chi.NewRouter()
        router.Get("/videos/{id}", handler.GetByID)
        router.ServeHTTP(rr, req)

        assert.Equal(t, http.StatusNotFound, rr.Code)

        mockRepo.AssertExpectations(t)
    })
}

func TestVideoHandler_Create(t *testing.T) {
    mockRepo := new(MockVideoRepository)
    handler := NewVideoHandler(mockRepo, nil, nil)

    testVideo := &models.Video{
        Title:    "New Video",
        URL:      "http://example.com/new-video.mp4",
        Creator:  "New Creator",
        Category: "New Category",
    }

    t.Run("Successful creation", func(t *testing.T) {
        mockRepo.On("Create", mock.MatchedBy(func(v *models.Video) bool {
            return v.Title == "New Video" && v.Creator == "New Creator"
        })).Return(nil)

        videoJSON, _ := json.Marshal(testVideo)
        req, _ := http.NewRequest("POST", "/videos", bytes.NewBuffer(videoJSON))
        req.Header.Set("Content-Type", "application/json")
        req = req.WithContext(context.WithValue(req.Context(), middleware.UserContextKey, &services.JWTClaims{
            UserID:   1,
            Username: "admin",
            Role:     "admin",
        }))

        rr := httptest.NewRecorder()

        router := chi.NewRouter()
        router.Post("/videos", handler.Create)
        router.ServeHTTP(rr, req)

        assert.Equal(t, http.StatusCreated, rr.Code)

        mockRepo.AssertExpectations(t)
    })
}
```

## Performance Improvements

### 1. Database Query Optimization
- Add proper indexing and query optimization
- Example implementation:
```go
// In database migrations
func RunMigrations(db *sql.DB) error {
    migrations := []string{
        // Add indexes for frequently queried columns
        `CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);`,
        `CREATE INDEX IF NOT EXISTS idx_videos_creator ON videos(creator);`,
        `CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);`,
        `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`,
        `CREATE INDEX IF NOT EXISTS idx_view_logs_video_id ON view_logs(video_id);`,
        `CREATE INDEX IF NOT EXISTS idx_view_logs_created_at ON view_logs(created_at);`,
        
        // Add composite indexes for common query patterns
        `CREATE INDEX IF NOT EXISTS idx_videos_category_created_at ON videos(category, created_at);`,
        `CREATE INDEX IF NOT EXISTS idx_view_logs_video_id_created_at ON view_logs(video_id, created_at);`,
    }

    for _, migration := range migrations {
        if _, err := db.Exec(migration); err != nil {
            return fmt.Errorf("failed to execute migration: %v", err)
        }
    }

    return nil
}

// Optimized queries with proper indexing
func (r *VideoRepository) GetByCategoryPaginated(category string, offset, limit int) ([]models.Video, error) {
    query := `
        SELECT id, title, url, creator, thumbnail, uploaded_at, views, category, duration, verified
        FROM videos 
        WHERE category = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    `
    
    rows, err := r.db.Query(query, category, limit, offset)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var videos []models.Video
    for rows.Next() {
        var video models.Video
        err := rows.Scan(
            &video.ID, &video.Title, &video.URL, &video.Creator,
            &video.Thumbnail, &video.UploadedAt, &video.Views,
            &video.Category, &video.Duration, &video.Verified,
        )
        if err != nil {
            return nil, err
        }
        videos = append(videos, video)
    }

    return videos, nil
}
```

### 2. Caching Implementation
- Implement caching mechanisms using Redis or in-memory
- Example implementation:
```go
package cache

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/go-redis/redis/v8"
)

type Cache struct {
    client *redis.Client
    ctx    context.Context
}

func NewRedisCache(addr, password string, db int) *Cache {
    rdb := redis.NewClient(&redis.Options{
        Addr:     addr,
        Password: password,
        DB:       db,
    })

    return &Cache{
        client: rdb,
        ctx:    context.Background(),
    }
}

func (c *Cache) Get(key string, dest interface{}) error {
    val, err := c.client.Get(c.ctx, key).Result()
    if err != nil {
        return err
    }

    return json.Unmarshal([]byte(val), dest)
}

func (c *Cache) Set(key string, value interface{}, expiration time.Duration) error {
    jsonData, err := json.Marshal(value)
    if err != nil {
        return err
    }

    return c.client.Set(c.ctx, key, jsonData, expiration).Err()
}

func (c *Cache) Delete(key string) error {
    return c.client.Del(c.ctx, key).Err()
}

func (c *Cache) Exists(key string) (bool, error) {
    count, err := c.client.Exists(c.ctx, key).Result()
    if err != nil {
        return false, err
    }
    return count > 0, nil
}

// In-memory cache implementation as alternative
type InMemoryCache struct {
    data map[string]*cacheItem
    mu   sync.RWMutex
}

type cacheItem struct {
    value      interface{}
    expiration time.Time
}

func NewInMemoryCache() *InMemoryCache {
    c := &InMemoryCache{
        data: make(map[string]*cacheItem),
    }
    
    // Start cleanup goroutine
    go c.cleanup()
    
    return c
}

func (c *InMemoryCache) Get(key string, dest interface{}) error {
    c.mu.RLock()
    item, exists := c.data[key]
    c.mu.RUnlock()
    
    if !exists || time.Now().After(item.expiration) {
        return fmt.Errorf("key not found or expired")
    }
    
    // Copy the value to dest
    jsonData, err := json.Marshal(item.value)
    if err != nil {
        return err
    }
    
    return json.Unmarshal(jsonData, dest)
}

func (c *InMemoryCache) Set(key string, value interface{}, expiration time.Duration) error {
    c.mu.Lock()
    defer c.mu.Unlock()
    
    c.data[key] = &cacheItem{
        value:      value,
        expiration: time.Now().Add(expiration),
    }
    
    return nil
}

func (c *InMemoryCache) Delete(key string) error {
    c.mu.Lock()
    defer c.mu.Unlock()
    
    delete(c.data, key)
    return nil
}

func (c *InMemoryCache) cleanup() {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()
    
    for range ticker.C {
        now := time.Now()
        c.mu.Lock()
        for key, item := range c.data {
            if now.After(item.expiration) {
                delete(c.data, key)
            }
        }
        c.mu.Unlock()
    }
}
```

### 3. Pagination Implementation
- Add pagination for large datasets
- Example implementation:
```go
// Pagination models
type Pagination struct {
    Page  int `json:"page"`
    Limit int `json:"limit"`
    Total int `json:"total"`
}

type PaginatedResult struct {
    Data       interface{} `json:"data"`
    Pagination Pagination  `json:"pagination"`
}

// In video repository
func (r *VideoRepository) GetAllPaginated(page, limit int) ([]models.Video, int, error) {
    offset := (page - 1) * limit
    
    // Get total count
    var total int
    err := r.db.QueryRow("SELECT COUNT(*) FROM videos").Scan(&total)
    if err != nil {
        return nil, 0, err
    }
    
    // Get paginated results
    query := `
        SELECT id, title, url, creator, thumbnail, uploaded_at, views, category, duration, verified
        FROM videos 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    `
    
    rows, err := r.db.Query(query, limit, offset)
    if err != nil {
        return nil, 0, err
    }
    defer rows.Close()

    var videos []models.Video
    for rows.Next() {
        var video models.Video
        err := rows.Scan(
            &video.ID, &video.Title, &video.URL, &video.Creator,
            &video.Thumbnail, &video.UploadedAt, &video.Views,
            &video.Category, &video.Duration, &video.Verified,
        )
        if err != nil {
            return nil, 0, err
        }
        videos = append(videos, video)
    }

    return videos, total, nil
}

// In video handler
func (h *VideoHandler) GetAllPaginated(w http.ResponseWriter, r *http.Request) {
    page := 1
    if pageStr := r.URL.Query().Get("page"); pageStr != "" {
        if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
            page = p
        }
    }
    
    limit := 10
    if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
        if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
            limit = l
        }
    }
    
    videos, total, err := h.videoRepo.GetAllPaginated(page, limit)
    if err != nil {
        models.RespondError(w, "Failed to fetch videos", http.StatusInternalServerError)
        return
    }
    
    pagination := Pagination{
        Page:  page,
        Limit: limit,
        Total: total,
    }
    
    result := PaginatedResult{
        Data:       videos,
        Pagination: pagination,
    }
    
    models.RespondSuccess(w, "", result, http.StatusOK)
}
```

## Monitoring & Observability

### 1. Health Check Endpoints
- Add health check endpoints for monitoring
- Example implementation:
```go
package handlers

import (
    "database/sql"
    "net/http"
    "time"

    "titan-backend/internal/models"
)

type HealthHandler struct {
    db *sql.DB
}

func NewHealthHandler(db *sql.DB) *HealthHandler {
    return &HealthHandler{db: db}
}

type HealthStatus struct {
    Status    string            `json:"status"`
    Timestamp time.Time         `json:"timestamp"`
    Services  map[string]Status `json:"services"`
}

type Status struct {
    Status  string    `json:"status"`
    Message string    `json:"message,omitempty"`
    Latency string    `json:"latency,omitempty"`
}

func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    
    // Check database connectivity
    dbStatus := h.checkDatabase()
    
    // Calculate total latency
    latency := time.Since(start).String()
    
    status := "healthy"
    if dbStatus.Status != "up" {
        status = "degraded"
    }
    
    health := HealthStatus{
        Status:    status,
        Timestamp: time.Now(),
        Services: map[string]Status{
            "database": dbStatus,
        },
    }
    
    // Add latency to response
    health.Services["total"] = Status{
        Status:  "up",
        Latency: latency,
    }
    
    models.RespondSuccess(w, "", health, http.StatusOK)
}

func (h *HealthHandler) checkDatabase() Status {
    start := time.Now()
    
    if err := h.db.Ping(); err != nil {
        return Status{
            Status:  "down",
            Message: err.Error(),
            Latency: time.Since(start).String(),
        }
    }
    
    return Status{
        Status:  "up",
        Latency: time.Since(start).String(),
    }
}

// Ready check for container orchestration
func (h *HealthHandler) ReadyCheck(w http.ResponseWriter, r *http.Request) {
    // Check if all required services are ready
    if err := h.db.Ping(); err != nil {
        http.Error(w, "Service not ready", http.StatusServiceUnavailable)
        return
    }
    
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}
```

### 2. Metrics Collection
- Implement metrics collection with Prometheus
- Example implementation:
```go
package metrics

import (
    "net/http"
    "strconv"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    // HTTP request metrics
    httpRequestTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )

    httpRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10},
        },
        []string{"method", "endpoint"},
    )

    // Database metrics
    dbQueryDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "db_query_duration_seconds",
            Help:    "Database query duration in seconds",
            Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10},
        },
        []string{"query_type", "table"},
    )

    // API metrics
    apiRateLimit = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "api_rate_limit_exceeded_total",
            Help: "Total number of rate limit exceeded events",
        },
        []string{"endpoint", "user"},
    )
)

// Middleware to collect HTTP metrics
func HTTPMetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // Wrap ResponseWriter to capture status code
        wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
        
        next.ServeHTTP(wrapped, r)
        
        // Record metrics
        duration := time.Since(start).Seconds()
        
        httpRequestTotal.WithLabelValues(
            r.Method,
            r.URL.Path,
            strconv.Itoa(wrapped.statusCode),
        ).Inc()
        
        httpRequestDuration.WithLabelValues(
            r.Method,
            r.URL.Path,
        ).Observe(duration)
    })
}

// Custom ResponseWriter to capture status code
type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

// Function to expose metrics endpoint
func RegisterMetricsHandler() {
    http.Handle("/metrics", promhttp.Handler())
}

// Example usage in database operations
func RecordDBQuery(queryType, table string, start time.Time) {
    duration := time.Since(start).Seconds()
    dbQueryDuration.WithLabelValues(queryType, table).Observe(duration)
}

// Example usage in rate limiting
func RecordRateLimit(endpoint, user string) {
    apiRateLimit.WithLabelValues(endpoint, user).Inc()
}
```

## Development Experience

### 1. API Documentation
- Add comprehensive API documentation with OpenAPI/Swagger
- Example implementation:
```go
//go:embed docs/swagger.json
var swaggerJSON embed.FS

// In main.go, add documentation endpoints
func setupDocumentation(r *chi.Mux) {
    // Swagger UI
    r.Get("/docs", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "text/html")
        w.Write([]byte(swaggerUIHTML))
    })
    
    // OpenAPI spec
    r.Get("/openapi.json", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        spec, _ := swaggerJSON.ReadFile("docs/swagger.json")
        w.Write(spec)
    })
}

const swaggerUIHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3/swagger-ui.css">
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@3/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            url: '/openapi.json',
            dom_id: '#swagger-ui'
        });
    </script>
</body>
</html>
`
```

### 2. CI/CD Pipeline
- Implement proper CI/CD pipeline with automated testing
- Example implementation (GitHub Actions workflow):
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.21'
        
    - name: Install dependencies
      run: go mod tidy
      
    - name: Run tests
      run: go test -v ./...
      
    - name: Run linter
      run: |
        go install golang.org/x/tools/cmd/goimports@latest
        go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
        golangci-lint run
      
    - name: Run security scan
      run: |
        go install github.com/securego/gosec/v2/cmd/gosec@latest
        gosec ./...
        
  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.21'
        
    - name: Build
      run: go build -o bin/server ./cmd/server/main.go
      
    - name: Upload artifact
      uses: actions/upload-artifact@v3
      with:
        name: server-binary
        path: bin/server
```

## API Improvements

### 1. API Versioning
- Implement API versioning
- Example implementation:
```go
// In main.go, add versioned routes
func setupVersionedRoutes(r *chi.Mux) {
    // v1 API routes
    r.Route("/api/v1", func(r chi.Router) {
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
    
    // Add a redirect from /api to /api/v1 for backward compatibility
    r.Get("/api/*", func(w http.ResponseWriter, r *http.Request) {
        newPath := "/api/v1" + r.URL.Path[4:] // Remove /api and add /api/v1
        http.Redirect(w, r, newPath, http.StatusMovedPermanently)
    })
}
```

### 2. Request/Response Validation
- Add comprehensive request/response validation
- Example implementation:
```go
package validation

import (
    "encoding/json"
    "fmt"
    "net/http"
    "regexp"
    "strconv"
    "strings"

    "titan-backend/internal/models"
)

type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

type ValidationErrors struct {
    Errors []ValidationError `json:"errors"`
}

func (ve *ValidationErrors) Add(field, message string) {
    ve.Errors = append(ve.Errors, ValidationError{Field: field, Message: message})
}

func (ve *ValidationErrors) HasErrors() bool {
    return len(ve.Errors) > 0
}

func (ve *ValidationErrors) Error() string {
    var messages []string
    for _, err := range ve.Errors {
        messages = append(messages, fmt.Sprintf("%s: %s", err.Field, err.Message))
    }
    return strings.Join(messages, "; ")
}

// Validation functions
func ValidateEmail(email string) bool {
    emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
    return emailRegex.MatchString(email)
}

func ValidatePassword(password string) error {
    if len(password) < 8 {
        return fmt.Errorf("password must be at least 8 characters")
    }
    if !regexp.MustCompile(`[A-Z]`).MatchString(password) {
        return fmt.Errorf("password must contain at least one uppercase letter")
    }
    if !regexp.MustCompile(`[a-z]`).MatchString(password) {
        return fmt.Errorf("password must contain at least one lowercase letter")
    }
    if !regexp.MustCompile(`[0-9]`).MatchString(password) {
        return fmt.Errorf("password must contain at least one number")
    }
    return nil
}

func ValidateVideo(video *models.Video) *ValidationErrors {
    errors := &ValidationErrors{}
    
    if video.Title == "" {
        errors.Add("title", "title is required")
    } else if len(video.Title) < 3 {
        errors.Add("title", "title must be at least 3 characters")
    } else if len(video.Title) > 200 {
        errors.Add("title", "title must be less than 200 characters")
    }
    
    if video.URL == "" {
        errors.Add("url", "url is required")
    } else if !isValidURL(video.URL) {
        errors.Add("url", "url must be a valid URL")
    }
    
    if video.Creator == "" {
        errors.Add("creator", "creator is required")
    } else if len(video.Creator) < 2 {
        errors.Add("creator", "creator must be at least 2 characters")
    } else if len(video.Creator) > 100 {
        errors.Add("creator", "creator must be less than 100 characters")
    }
    
    if video.Category != "" && len(video.Category) > 50 {
        errors.Add("category", "category must be less than 50 characters")
    }
    
    if video.Duration != "" && !isValidDuration(video.Duration) {
        errors.Add("duration", "duration must be in format MM:SS or HH:MM:SS")
    }
    
    return errors
}

func isValidURL(url string) bool {
    // Simple URL validation
    return regexp.MustCompile(`^https?://[^\s/$.?#].[^\s]*$`).MatchString(url)
}

func isValidDuration(duration string) bool {
    // Validate duration format (MM:SS or HH:MM:SS)
    durationRegex := regexp.MustCompile(`^([0-9]+:[0-5][0-9])|([0-9]+:[0-5][0-9]:[0-5][0-9])$`)
    return durationRegex.MatchString(duration)
}

// Validation middleware
func ValidateJSON(target interface{}) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if r.Header.Get("Content-Type") != "application/json" {
                models.RespondError(w, "Content-Type must be application/json", http.StatusBadRequest)
                return
            }
            
            if err := json.NewDecoder(r.Body).Decode(target); err != nil {
                models.RespondError(w, "Invalid JSON format", http.StatusBadRequest)
                return
            }
            
            next.ServeHTTP(w, r)
        })
    }
}

// Specific validation middleware for videos
func ValidateVideoRequest(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        var video models.Video
        if err := json.NewDecoder(r.Body).Decode(&video); err != nil {
            models.RespondError(w, "Invalid JSON format", http.StatusBadRequest)
            return
        }
        
        errors := ValidateVideo(&video)
        if errors.HasErrors() {
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusUnprocessableEntity)
            json.NewEncoder(w).Encode(map[string]interface{}{
                "success": false,
                "error":   "Validation failed",
                "details": errors,
            })
            return
        }
        
        // Add validated video to context
        ctx := context.WithValue(r.Context(), "validatedVideo", &video)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## Implementation Checklist

- [ ] Implement consistent error handling patterns
- [ ] Add structured logging with correlation IDs
- [ ] Implement proper configuration management
- [ ] Add comprehensive unit and integration tests
- [ ] Add database query optimization with proper indexing
- [ ] Implement caching mechanisms (Redis/in-memory)
- [ ] Add pagination for large datasets
- [ ] Create health check endpoints
- [ ] Implement metrics collection with Prometheus
- [ ] Add API documentation with OpenAPI/Swagger
- [ ] Set up CI/CD pipeline with automated testing
- [ ] Implement API versioning
- [ ] Add comprehensive request/response validation
- [ ] Add performance monitoring and profiling tools
- [ ] Implement proper database connection pooling
- [ ] Add distributed tracing capabilities
- [ ] Create comprehensive API documentation
- [ ] Add automated security scanning to CI/CD
- [ ] Implement proper backup and recovery procedures