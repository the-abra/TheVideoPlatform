package handlers

import (
	"database/sql"
	"net/http"
	"os"
	"runtime"
	"time"

	"titan-backend/internal/models"
)

type HealthHandler struct {
	db        *sql.DB
	startTime time.Time
}

func NewHealthHandler(db *sql.DB) *HealthHandler {
	return &HealthHandler{
		db:        db,
		startTime: time.Now(),
	}
}

// HealthCheck provides basic liveness check
func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	models.RespondSuccess(w, "", map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"uptime":    time.Since(h.startTime).String(),
	}, http.StatusOK)
}

// ReadinessCheck provides detailed readiness check
func (h *HealthHandler) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	dbHealthy := true
	dbStatus := "connected"
	var dbPingTime time.Duration

	// Check database connection with timeout
	start := time.Now()
	if err := h.db.Ping(); err != nil {
		dbHealthy = false
		dbStatus = "disconnected: " + err.Error()
	}
	dbPingTime = time.Since(start)

	// Get database stats
	stats := h.db.Stats()

	// Overall health status
	status := "ready"
	httpStatus := http.StatusOK
	if !dbHealthy {
		status = "not ready"
		httpStatus = http.StatusServiceUnavailable
	}

	// Memory stats
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	models.RespondSuccess(w, "", map[string]interface{}{
		"status":    status,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"uptime":    time.Since(h.startTime).String(),
		"database": map[string]interface{}{
			"status":          dbStatus,
			"ping_time_ms":    dbPingTime.Milliseconds(),
			"open_conns":      stats.OpenConnections,
			"in_use":          stats.InUse,
			"idle":            stats.Idle,
			"wait_count":      stats.WaitCount,
			"wait_duration":   stats.WaitDuration.String(),
			"max_idle_closed": stats.MaxIdleClosed,
			"max_lifetime_closed": stats.MaxLifetimeClosed,
		},
		"system": map[string]interface{}{
			"goroutines":  runtime.NumGoroutine(),
			"memory_mb":   m.Alloc / 1024 / 1024,
			"sys_memory_mb": m.Sys / 1024 / 1024,
			"gc_cycles":   m.NumGC,
		},
		"environment": map[string]interface{}{
			"env":      os.Getenv("ENV"),
			"hostname": getHostname(),
		},
	}, httpStatus)
}

// LivenessCheck provides simple liveness check for Kubernetes
func (h *HealthHandler) LivenessCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func getHostname() string {
	hostname, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return hostname
}
