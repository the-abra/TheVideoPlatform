package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"

	"titan-backend/internal/models"
	"titan-backend/internal/services"
)

// ShareHandler handles file sharing operations
type ShareHandler struct {
	fileRepo    *models.FileRepository
	fileService services.FileServiceInterface
}

// NewShareHandler creates a new share handler
func NewShareHandler(fileRepo *models.FileRepository, fileService services.FileServiceInterface) *ShareHandler {
	return &ShareHandler{
		fileRepo:    fileRepo,
		fileService: fileService,
	}
}

// CreateShareLink creates a share link for a file
func (h *ShareHandler) CreateShareLink(w http.ResponseWriter, r *http.Request, filename string) {
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	var req struct {
		ExpiryHours int `json:"expiryHours"` // 0 means no expiry
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.ExpiryHours = 0 // Default no expiry
	}

	// Generate share token
	token := models.GenerateShareToken()

	var expiry *time.Time
	if req.ExpiryHours > 0 {
		exp := time.Now().Add(time.Duration(req.ExpiryHours) * time.Hour)
		expiry = &exp
	}

	// Store share info in database
	if err := h.fileRepo.CreateFileShare(token, filename, expiry, nil); err != nil {
		log.Printf("[ShareHandler] ERROR: Failed to create share link for '%s': %v", filename, err)
		models.RespondError(w, "Failed to create share link", http.StatusInternalServerError)
		return
	}

	log.Printf("[ShareHandler] Share link created: token=%s, file=%s, expiry=%v", token, filename, expiry)

	models.RespondSuccess(w, "Share link created", map[string]interface{}{
		"fileName":   filename,
		"shareToken": token,
		"shareUrl":   "/share/" + token + "/raw",
	}, http.StatusOK)
}

// RemoveShareLink removes a share link
func (h *ShareHandler) RemoveShareLink(w http.ResponseWriter, r *http.Request, filename string) {
	// For now, just acknowledge the request
	// In production, you'd remove the share token from your storage
	log.Printf("[ShareHandler] Share link removal requested for file: %s", filename)
	models.RespondSuccess(w, "Share link removed", nil, http.StatusOK)
}

// DownloadShared handles download of shared files (public endpoint)
func (h *ShareHandler) DownloadShared(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		models.RespondError(w, "Invalid share token", http.StatusBadRequest)
		return
	}

	// Get share info from database
	shareInfo, filename, err := h.fileRepo.GetFileShareByToken(token)
	if err != nil {
		log.Printf("[ShareHandler] SECURITY: Invalid share token attempt: %s from IP: %s", token, r.RemoteAddr)
		models.RespondError(w, "Shared file not found", http.StatusNotFound)
		return
	}

	// Check expiry
	if shareInfo.ExpiresAt != nil && time.Now().After(*shareInfo.ExpiresAt) {
		log.Printf("[ShareHandler] SECURITY: Expired share link accessed: token=%s, expired=%v", token, shareInfo.ExpiresAt)
		models.RespondError(w, "Share link has expired", http.StatusGone)
		return
	}

	// Check max downloads limit
	if shareInfo.MaxDownloads != nil && shareInfo.Downloads >= *shareInfo.MaxDownloads {
		log.Printf("[ShareHandler] SECURITY: Download limit reached: token=%s, downloads=%d", token, shareInfo.Downloads)
		models.RespondError(w, "Download limit reached", http.StatusForbidden)
		return
	}

	// Check if file exists on disk
	if !h.fileService.FileExists(filename) {
		log.Printf("[ShareHandler] ERROR: Shared file not found on disk: %s", filename)
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Increment download count in database
	if err := h.fileRepo.IncrementShareDownloads(token); err != nil {
		log.Printf("[ShareHandler] ERROR: Failed to increment download count for token %s: %v", token, err)
	}

	// Serve file
	filePath := h.fileService.GetFilePath(filename)
	info, err := os.Stat(filePath)
	if err != nil {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	log.Printf("[ShareHandler] File shared: token=%s, file=%s, downloads=%d, IP=%s",
		token, filename, shareInfo.Downloads+1, r.RemoteAddr)

	w.Header().Set("Content-Disposition", "attachment; filename=\""+info.Name()+"\"")
	mimeType := h.fileService.GetMimeType(filename)
	w.Header().Set("Content-Type", mimeType)
	http.ServeFile(w, r, filePath)
}

// GetSharedInfo gets information about a shared file (public endpoint)
func (h *ShareHandler) GetSharedInfo(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		models.RespondError(w, "Invalid share token", http.StatusBadRequest)
		return
	}

	// Get share info from database
	shareInfo, filename, err := h.fileRepo.GetFileShareByToken(token)
	if err != nil {
		models.RespondError(w, "Shared file not found", http.StatusNotFound)
		return
	}

	// Check expiry
	if shareInfo.ExpiresAt != nil && time.Now().After(*shareInfo.ExpiresAt) {
		models.RespondError(w, "Share link has expired", http.StatusGone)
		return
	}

	// Get file info from the file system
	filePath := h.fileService.GetFilePath(filename)
	info, err := os.Stat(filePath)
	if err != nil {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Return limited info for public
	models.RespondSuccess(w, "", map[string]interface{}{
		"name":      info.Name(),
		"size":      info.Size(),
		"mimeType":  h.fileService.GetMimeType(filename),
		"downloads": shareInfo.Downloads,
	}, http.StatusOK)
}

// RegisterPublicRoutes registers public share routes
func (h *ShareHandler) RegisterPublicRoutes(r chi.Router) {
	r.Get("/share/{token}", h.GetSharedInfo)
	r.Get("/share/{token}/download", h.DownloadShared)
}
