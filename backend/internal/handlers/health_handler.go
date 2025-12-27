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

func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	dbStatus := "connected"

	// Check database connection
	if err := h.db.Ping(); err != nil {
		dbStatus = "disconnected"
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"status":    "healthy",
		"database":  dbStatus,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}, http.StatusOK)
}
