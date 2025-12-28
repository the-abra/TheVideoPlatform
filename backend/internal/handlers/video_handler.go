package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"titan-backend/internal/models"
	"titan-backend/internal/services"
	"titan-backend/internal/utils"
)

type VideoHandler struct {
	videoRepo      *models.VideoRepository
	viewLogRepo    *models.ViewLogRepository
	storageService *services.StorageService
}

func NewVideoHandler(
	videoRepo *models.VideoRepository,
	viewLogRepo *models.ViewLogRepository,
	storageService *services.StorageService,
) *VideoHandler {
	return &VideoHandler{
		videoRepo:      videoRepo,
		viewLogRepo:    viewLogRepo,
		storageService: storageService,
	}
}

func (h *VideoHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	pagination := utils.GetPaginationParams(r)
	sort := r.URL.Query().Get("sort")
	order := r.URL.Query().Get("order")
	category := r.URL.Query().Get("category")

	if sort == "" {
		sort = "created_at"
	}
	if order == "" {
		order = "desc"
	}

	videos, total, err := h.videoRepo.GetAll(pagination.Page, pagination.Limit, sort, order, category)
	if err != nil {
		models.RespondError(w, "Failed to fetch videos", http.StatusInternalServerError)
		return
	}

	meta := utils.CalculatePaginationMeta(pagination.Page, pagination.Limit, total)

	models.RespondSuccess(w, "", map[string]interface{}{
		"videos":     videos,
		"pagination": meta,
	}, http.StatusOK)
}

func (h *VideoHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		models.RespondError(w, "Invalid video ID", http.StatusBadRequest)
		return
	}

	video, err := h.videoRepo.GetByID(id)
	if err != nil {
		models.RespondError(w, "Failed to fetch video", http.StatusInternalServerError)
		return
	}

	if video == nil {
		models.RespondError(w, "Video not found", http.StatusNotFound)
		return
	}

	// Get related videos
	relatedVideos, _ := h.videoRepo.GetRelated(id, video.Category, 6)

	models.RespondSuccess(w, "", map[string]interface{}{
		"video":         video,
		"relatedVideos": relatedVideos,
	}, http.StatusOK)
}

func (h *VideoHandler) Create(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 2GB)
	if err := r.ParseMultipartForm(2 << 30); err != nil {
		models.RespondError(w, "Failed to parse form or file too large", http.StatusBadRequest)
		return
	}

	// Get form values
	title := r.FormValue("title")
	creator := r.FormValue("creator")
	category := r.FormValue("category")
	duration := r.FormValue("duration")
	description := r.FormValue("description")

	// Check for required fields
	if title == "" || creator == "" {
		models.RespondError(w, "Title and creator are required", http.StatusBadRequest)
		return
	}

	// Set default category if not provided
	if category == "" {
		category = "other"
	}

	var videoURL string

	// First, check if a URL was provided (for external video links)
	urlValue := r.FormValue("url")
	if urlValue != "" {
		// Use the provided URL directly (external video link)
		videoURL = urlValue
	} else {
		// Try to get video file upload
		videoFile, videoHeader, err := r.FormFile("video")
		if err != nil {
			models.RespondError(w, "Either a video URL or video file is required", http.StatusBadRequest)
			return
		}
		defer videoFile.Close()

		// Save video file
		videoURL, err = h.storageService.SaveVideo(videoFile, videoHeader)
		if err != nil {
			models.RespondError(w, "Failed to save video: "+err.Error(), http.StatusBadRequest)
			return
		}
	}

	// Handle thumbnail - can be URL or file
	var thumbnailURL string
	thumbnailValue := r.FormValue("thumbnail")
	if thumbnailValue != "" {
		// Use provided thumbnail URL
		thumbnailURL = thumbnailValue
	} else {
		// Try to get thumbnail file upload
		thumbnailFile, thumbnailHeader, err := r.FormFile("thumbnail_file")
		if err == nil {
			defer thumbnailFile.Close()
			thumbnailURL, err = h.storageService.SaveThumbnail(thumbnailFile, thumbnailHeader)
			if err != nil {
				// Log error but don't fail the request
				thumbnailURL = ""
			}
		}
	}

	// Normalize URLs to relative paths for portability
	videoURL = utils.NormalizeStorageURL(videoURL)
	thumbnailURL = utils.NormalizeStorageURL(thumbnailURL)

	// Create video record
	video := &models.Video{
		Title:       title,
		Creator:     creator,
		URL:         videoURL,
		Thumbnail:   thumbnailURL,
		Category:    category,
		Duration:    duration,
		Description: description,
	}

	if err := h.videoRepo.Create(video); err != nil {
		// Clean up uploaded files only if we uploaded them (not external URLs)
		if urlValue == "" {
			h.storageService.DeleteFile(videoURL)
		}
		if thumbnailValue == "" && thumbnailURL != "" {
			h.storageService.DeleteFile(thumbnailURL)
		}
		models.RespondError(w, "Failed to create video record", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "Video created successfully", map[string]interface{}{
		"video": video,
	}, http.StatusCreated)
}

func (h *VideoHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		models.RespondError(w, "Invalid video ID", http.StatusBadRequest)
		return
	}

	// Get existing video
	existingVideo, err := h.videoRepo.GetByID(id)
	if err != nil {
		models.RespondError(w, "Failed to fetch video", http.StatusInternalServerError)
		return
	}
	if existingVideo == nil {
		models.RespondError(w, "Video not found", http.StatusNotFound)
		return
	}

	// Parse request body
	var updateData struct {
		Title       string `json:"title"`
		Creator     string `json:"creator"`
		Category    string `json:"category"`
		Duration    string `json:"duration"`
		Description string `json:"description"`
		Verified    *bool  `json:"verified"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		models.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update fields
	if updateData.Title != "" {
		existingVideo.Title = updateData.Title
	}
	if updateData.Creator != "" {
		existingVideo.Creator = updateData.Creator
	}
	if updateData.Category != "" {
		existingVideo.Category = updateData.Category
	}
	if updateData.Duration != "" {
		existingVideo.Duration = updateData.Duration
	}
	if updateData.Description != "" {
		existingVideo.Description = updateData.Description
	}
	if updateData.Verified != nil {
		existingVideo.Verified = *updateData.Verified
	}

	if err := h.videoRepo.Update(existingVideo); err != nil {
		models.RespondError(w, "Failed to update video", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "Video updated successfully", map[string]interface{}{
		"video": existingVideo,
	}, http.StatusOK)
}

func (h *VideoHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		models.RespondError(w, "Invalid video ID", http.StatusBadRequest)
		return
	}

	// Get existing video to delete files
	video, err := h.videoRepo.GetByID(id)
	if err != nil {
		models.RespondError(w, "Failed to fetch video", http.StatusInternalServerError)
		return
	}
	if video == nil {
		models.RespondError(w, "Video not found", http.StatusNotFound)
		return
	}

	// Delete from database
	if err := h.videoRepo.Delete(id); err != nil {
		models.RespondError(w, "Failed to delete video", http.StatusInternalServerError)
		return
	}

	// Delete files
	h.storageService.DeleteFile(video.URL)
	if video.Thumbnail != "" {
		h.storageService.DeleteFile(video.Thumbnail)
	}

	models.RespondSuccess(w, "Video deleted successfully", map[string]interface{}{
		"deletedId": id,
	}, http.StatusOK)
}

func (h *VideoHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		models.RespondError(w, "Search query is required", http.StatusBadRequest)
		return
	}

	category := r.URL.Query().Get("category")
	pagination := utils.GetPaginationParams(r)

	videos, total, err := h.videoRepo.Search(query, category, pagination.Page, pagination.Limit)
	if err != nil {
		models.RespondError(w, "Search failed", http.StatusInternalServerError)
		return
	}

	meta := utils.CalculatePaginationMeta(pagination.Page, pagination.Limit, total)

	filters := map[string]interface{}{}
	if category != "" {
		filters["category"] = category
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"results":    videos,
		"query":      query,
		"filters":    filters,
		"pagination": meta,
	}, http.StatusOK)
}

func (h *VideoHandler) IncrementView(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		models.RespondError(w, "Invalid video ID", http.StatusBadRequest)
		return
	}

	// Check if video exists
	video, err := h.videoRepo.GetByID(id)
	if err != nil {
		models.RespondError(w, "Failed to fetch video", http.StatusInternalServerError)
		return
	}
	if video == nil {
		models.RespondError(w, "Video not found", http.StatusNotFound)
		return
	}

	// Get IP address
	ipAddress := r.Header.Get("X-Forwarded-For")
	if ipAddress == "" {
		ipAddress = r.RemoteAddr
	}

	userAgent := r.Header.Get("User-Agent")

	// Check for recent view (throttle: 1 view per IP per video per 24 hours)
	hasRecentView, err := h.viewLogRepo.HasRecentView(id, ipAddress, 24)
	if err != nil {
		models.RespondError(w, "Failed to check view history", http.StatusInternalServerError)
		return
	}

	viewCounted := false
	if !hasRecentView {
		// Log the view
		viewLog := &models.ViewLog{
			VideoID:   id,
			IPAddress: ipAddress,
			UserAgent: userAgent,
		}
		if err := h.viewLogRepo.Create(viewLog); err == nil {
			// Increment view count
			if err := h.videoRepo.IncrementViews(id); err == nil {
				viewCounted = true
			}
		}
	}

	// Get updated view count
	updatedVideo, _ := h.videoRepo.GetByID(id)
	views := 0
	if updatedVideo != nil {
		views = updatedVideo.Views
	}

	models.RespondSuccess(w, "View counted", map[string]interface{}{
		"videoId":     id,
		"views":       views,
		"viewCounted": viewCounted,
	}, http.StatusOK)
}
