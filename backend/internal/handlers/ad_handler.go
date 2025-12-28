package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"titan-backend/internal/models"
	"titan-backend/internal/services"
)

// AdHandler handles ad-related HTTP requests
type AdHandler struct {
	adRepo         *models.AdRepository
	storageService *services.StorageService
}

// NewAdHandler creates a new ad handler
func NewAdHandler(adRepo *models.AdRepository, storageService *services.StorageService) *AdHandler {
	return &AdHandler{
		adRepo:         adRepo,
		storageService: storageService,
	}
}

// GetAll retrieves all ads with optional filtering
// GET /api/ads?placement=home-banner&enabled=true
func (h *AdHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	placement := r.URL.Query().Get("placement")

	var enabled *bool
	if enabledStr := r.URL.Query().Get("enabled"); enabledStr != "" {
		e := enabledStr == "true"
		enabled = &e
	}

	ads, err := h.adRepo.GetAll(placement, enabled)
	if err != nil {
		models.RespondError(w, "Failed to fetch ads", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"ads": ads,
	}, http.StatusOK)
}

// GetByID retrieves a single ad by ID
// GET /api/ads/{id}
func (h *AdHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	ad, err := h.adRepo.GetByID(id)
	if err != nil {
		models.RespondError(w, "Failed to fetch ad", http.StatusInternalServerError)
		return
	}
	if ad == nil {
		models.RespondError(w, "Ad not found", http.StatusNotFound)
		return
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"ad": ad,
	}, http.StatusOK)
}

// Create creates a new ad
// POST /api/ads (multipart/form-data)
func (h *AdHandler) Create(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 5MB)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		models.RespondError(w, "Failed to parse form or file too large (max 5MB)", http.StatusBadRequest)
		return
	}

	title := r.FormValue("title")
	targetURL := r.FormValue("targetUrl")
	placement := r.FormValue("placement")
	enabledStr := r.FormValue("enabled")

	// Validate required fields
	if title == "" || targetURL == "" || placement == "" {
		models.RespondError(w, "Title, targetUrl, and placement are required", http.StatusBadRequest)
		return
	}

	// Validate placement
	if !models.ValidPlacements[placement] {
		models.RespondError(w, "Invalid placement. Must be one of: home-banner, home-sidebar, video-top, video-sidebar, video-random", http.StatusBadRequest)
		return
	}

	// Parse enabled flag (default true)
	enabled := true
	if enabledStr != "" {
		enabled = enabledStr == "true" || enabledStr == "1"
	}

	var imageURL string

	// Check if imageUrl was provided (from drive)
	if imgURL := r.FormValue("imageUrl"); imgURL != "" {
		imageURL = imgURL
	} else {
		// Get image file
		imageFile, imageHeader, err := r.FormFile("image")
		if err != nil {
			models.RespondError(w, "Image file or imageUrl is required", http.StatusBadRequest)
			return
		}
		defer imageFile.Close()

		// Save image file
		imageURL, err = h.storageService.SaveAdImage(imageFile, imageHeader)
		if err != nil {
			models.RespondError(w, "Failed to save image: "+err.Error(), http.StatusBadRequest)
			return
		}
	}

	// Create ad
	ad := &models.Ad{
		ID:        uuid.New().String(),
		Title:     title,
		ImageURL:  imageURL,
		TargetURL: targetURL,
		Placement: placement,
		Enabled:   enabled,
	}

	if err := h.adRepo.Create(ad); err != nil {
		// Clean up saved image on failure
		h.storageService.DeleteFile(imageURL)
		models.RespondError(w, "Failed to create ad", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "Ad created successfully", map[string]interface{}{
		"ad": ad,
	}, http.StatusCreated)
}

// Update updates an existing ad
// PUT /api/ads/{id} (supports both JSON and multipart/form-data)
func (h *AdHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get existing ad
	existing, err := h.adRepo.GetByID(id)
	if err != nil {
		models.RespondError(w, "Failed to fetch ad", http.StatusInternalServerError)
		return
	}
	if existing == nil {
		models.RespondError(w, "Ad not found", http.StatusNotFound)
		return
	}

	contentType := r.Header.Get("Content-Type")

	// Handle JSON request (for simple updates like toggling enabled)
	if strings.HasPrefix(contentType, "application/json") {
		var updateReq struct {
			Title     *string `json:"title"`
			TargetURL *string `json:"targetUrl"`
			Placement *string `json:"placement"`
			Enabled   *bool   `json:"enabled"`
		}

		if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
			models.RespondError(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		// Update only provided fields
		if updateReq.Title != nil {
			existing.Title = *updateReq.Title
		}
		if updateReq.TargetURL != nil {
			existing.TargetURL = *updateReq.TargetURL
		}
		if updateReq.Placement != nil {
			if !models.ValidPlacements[*updateReq.Placement] {
				models.RespondError(w, "Invalid placement", http.StatusBadRequest)
				return
			}
			existing.Placement = *updateReq.Placement
		}
		if updateReq.Enabled != nil {
			existing.Enabled = *updateReq.Enabled
		}

		if err := h.adRepo.Update(existing); err != nil {
			models.RespondError(w, "Failed to update ad", http.StatusInternalServerError)
			return
		}

		// Fetch updated ad to get current timestamps
		updated, _ := h.adRepo.GetByID(id)
		if updated != nil {
			existing = updated
		}

		models.RespondSuccess(w, "Ad updated successfully", map[string]interface{}{
			"ad": existing,
		}, http.StatusOK)
		return
	}

	// Handle multipart/form-data request (for updates with image)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		models.RespondError(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// Update fields if provided
	if title := r.FormValue("title"); title != "" {
		existing.Title = title
	}
	if targetURL := r.FormValue("targetUrl"); targetURL != "" {
		existing.TargetURL = targetURL
	}
	if placement := r.FormValue("placement"); placement != "" {
		if !models.ValidPlacements[placement] {
			models.RespondError(w, "Invalid placement", http.StatusBadRequest)
			return
		}
		existing.Placement = placement
	}
	if enabledStr := r.FormValue("enabled"); enabledStr != "" {
		existing.Enabled = enabledStr == "true" || enabledStr == "1"
	}

	// Handle new image/media - check for URL first, then file upload
	if imgURL := r.FormValue("imageUrl"); imgURL != "" {
		// URL provided from drive - only delete old if it's a local file
		if !strings.HasPrefix(existing.ImageURL, "http") && !strings.HasPrefix(existing.ImageURL, "/share") {
			h.storageService.DeleteFile(existing.ImageURL)
		}
		existing.ImageURL = imgURL
	} else {
		// Handle file upload
		imageFile, imageHeader, err := r.FormFile("image")
		if err == nil {
			defer imageFile.Close()
			newImageURL, err := h.storageService.SaveAdImage(imageFile, imageHeader)
			if err == nil {
				// Delete old image only if it's a local file
				if !strings.HasPrefix(existing.ImageURL, "http") && !strings.HasPrefix(existing.ImageURL, "/share") {
					h.storageService.DeleteFile(existing.ImageURL)
				}
				existing.ImageURL = newImageURL
			}
		}
	}

	if err := h.adRepo.Update(existing); err != nil {
		models.RespondError(w, "Failed to update ad", http.StatusInternalServerError)
		return
	}

	// Fetch updated ad to get current timestamps
	updated, _ := h.adRepo.GetByID(id)
	if updated != nil {
		existing = updated
	}

	models.RespondSuccess(w, "Ad updated successfully", map[string]interface{}{
		"ad": existing,
	}, http.StatusOK)
}

// Toggle enables or disables an ad
// PATCH /api/ads/{id}/toggle
func (h *AdHandler) Toggle(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get existing ad
	existing, err := h.adRepo.GetByID(id)
	if err != nil {
		models.RespondError(w, "Failed to fetch ad", http.StatusInternalServerError)
		return
	}
	if existing == nil {
		models.RespondError(w, "Ad not found", http.StatusNotFound)
		return
	}

	// Toggle enabled status
	newEnabled := !existing.Enabled
	if err := h.adRepo.UpdateEnabled(id, newEnabled); err != nil {
		models.RespondError(w, "Failed to toggle ad", http.StatusInternalServerError)
		return
	}

	existing.Enabled = newEnabled

	status := "disabled"
	if newEnabled {
		status = "enabled"
	}

	models.RespondSuccess(w, "Ad "+status+" successfully", map[string]interface{}{
		"ad": existing,
	}, http.StatusOK)
}

// Delete removes an ad
// DELETE /api/ads/{id}
func (h *AdHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get existing ad
	existing, err := h.adRepo.GetByID(id)
	if err != nil {
		models.RespondError(w, "Failed to fetch ad", http.StatusInternalServerError)
		return
	}
	if existing == nil {
		models.RespondError(w, "Ad not found", http.StatusNotFound)
		return
	}

	if err := h.adRepo.Delete(id); err != nil {
		models.RespondError(w, "Failed to delete ad", http.StatusInternalServerError)
		return
	}

	// Delete image file
	h.storageService.DeleteFile(existing.ImageURL)

	models.RespondSuccess(w, "Ad deleted successfully", map[string]interface{}{
		"deletedId": id,
	}, http.StatusOK)
}

// TrackClick records a click on an ad
// POST /api/ads/{id}/click
func (h *AdHandler) TrackClick(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Check if ad exists
	existing, err := h.adRepo.GetByID(id)
	if err != nil || existing == nil {
		models.RespondError(w, "Ad not found", http.StatusNotFound)
		return
	}

	if err := h.adRepo.IncrementClicks(id); err != nil {
		models.RespondError(w, "Failed to track click", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "Click tracked", nil, http.StatusOK)
}

// TrackImpression records an impression for an ad
// POST /api/ads/{id}/impression
func (h *AdHandler) TrackImpression(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Check if ad exists
	existing, err := h.adRepo.GetByID(id)
	if err != nil || existing == nil {
		models.RespondError(w, "Ad not found", http.StatusNotFound)
		return
	}

	if err := h.adRepo.IncrementImpressions(id); err != nil {
		models.RespondError(w, "Failed to track impression", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "Impression tracked", nil, http.StatusOK)
}

// GetStats returns ad statistics
// GET /api/ads/stats
func (h *AdHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	totalAds, totalClicks, totalImpressions, err := h.adRepo.GetStats()
	if err != nil {
		models.RespondError(w, "Failed to get ad stats", http.StatusInternalServerError)
		return
	}

	ctr := 0.0
	if totalImpressions > 0 {
		ctr = float64(totalClicks) / float64(totalImpressions) * 100
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"totalAds":         totalAds,
		"totalClicks":      totalClicks,
		"totalImpressions": totalImpressions,
		"clickThroughRate": ctr,
	}, http.StatusOK)
}
