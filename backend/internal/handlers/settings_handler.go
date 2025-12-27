package handlers

import (
	"encoding/json"
	"net/http"

	"titan-backend/internal/models"
)

type SettingsHandler struct {
	settingsRepo *models.SettingsRepository
}

func NewSettingsHandler(settingsRepo *models.SettingsRepository) *SettingsHandler {
	return &SettingsHandler{
		settingsRepo: settingsRepo,
	}
}

func (h *SettingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settingsRepo.GetAll()
	if err != nil {
		models.RespondError(w, "Failed to fetch settings", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"settings": settings,
	}, http.StatusOK)
}

func (h *SettingsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var req models.Settings
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get current settings to merge
	current, err := h.settingsRepo.GetAll()
	if err != nil {
		models.RespondError(w, "Failed to fetch current settings", http.StatusInternalServerError)
		return
	}

	// Update only provided fields
	if req.SiteName != "" {
		current.SiteName = req.SiteName
	}
	if req.SiteDescription != "" {
		current.SiteDescription = req.SiteDescription
	}
	// These are booleans, so we need to check for explicit setting
	current.MaintenanceMode = req.MaintenanceMode
	current.AllowNewUploads = req.AllowNewUploads
	current.FeaturedVideoID = req.FeaturedVideoID

	if err := h.settingsRepo.Update(current); err != nil {
		models.RespondError(w, "Failed to update settings", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "Settings updated successfully", map[string]interface{}{
		"settings": current,
	}, http.StatusOK)
}
