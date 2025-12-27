package handlers

import (
	"net/http"

	"titan-backend/internal/models"
	"titan-backend/internal/services"
)

type AnalyticsHandler struct {
	analyticsService *services.AnalyticsService
}

func NewAnalyticsHandler(analyticsService *services.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsService: analyticsService,
	}
}

func (h *AnalyticsHandler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	analytics, err := h.analyticsService.GetAnalytics()
	if err != nil {
		models.RespondError(w, "Failed to fetch analytics", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "", analytics, http.StatusOK)
}
