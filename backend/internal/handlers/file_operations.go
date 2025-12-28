package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"titan-backend/internal/middleware"
	"titan-backend/internal/models"
	"titan-backend/internal/services"
)

// FileOperations handles core file management operations
type FileOperations struct {
	fileRepo     *models.FileRepository
	fileService  *services.FileService
	shareHandler *ShareHandler
}

// NewFileOperations creates a new file operations handler
func NewFileOperations(fileRepo *models.FileRepository, fileService *services.FileService) *FileOperations {
	return &FileOperations{
		fileRepo:     fileRepo,
		fileService:  fileService,
		shareHandler: NewShareHandler(fileRepo, fileService),
	}
}

// Upload uploads a file to storage
func (h *FileOperations) Upload(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 100MB)
	if err := r.ParseMultipartForm(100 << 20); err != nil {
		log.Printf("[FileOps] ERROR: Failed to parse upload form from IP %s: %v", r.RemoteAddr, err)
		models.RespondError(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("[FileOps] ERROR: Failed to get file from form: %v", err)
		models.RespondError(w, "Failed to get file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file name
	if valid, msg := middleware.ValidateVideoTitle(header.Filename); !valid {
		log.Printf("[FileOps] SECURITY: Invalid filename attempt: %s from IP: %s - %s", header.Filename, r.RemoteAddr, msg)
		models.RespondError(w, msg, http.StatusBadRequest)
		return
	}

	// Get folder path if provided
	folderPath := middleware.SanitizeString(r.FormValue("folderPath"))

	// Save file to storage
	savedName, savedPath, err := h.fileService.SaveFileToPath(file, header, folderPath)
	if err != nil {
		log.Printf("[FileOps] ERROR: Failed to save file '%s': %v", header.Filename, err)
		models.RespondError(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	// Get file info
	ext := filepath.Ext(header.Filename)
	mimeType := h.fileService.GetMimeType(header.Filename)

	// Create file entry for response
	fileEntry := services.FileEntry{
		Name:          savedName,
		Path:          savedPath,
		Size:          header.Size,
		MimeType:      mimeType,
		Extension:     ext,
		CreatedAt:     time.Now(),
		Icon:          h.fileService.GetFileIcon(mimeType),
		FormattedSize: h.fileService.FormatFileSize(header.Size),
	}

	log.Printf("[FileOps] File uploaded: name=%s, size=%d, path=%s", savedName, header.Size, savedPath)

	models.RespondSuccess(w, "File uploaded successfully", map[string]interface{}{
		"file": fileEntry,
	}, http.StatusCreated)
}

// List lists files in a directory
func (h *FileOperations) List(w http.ResponseWriter, r *http.Request) {
	// Get folder path from query parameter
	folderPath := r.URL.Query().Get("folderPath")
	if folderPath == "" {
		folderPath = "." // Root directory
	}

	// Sanitize path to prevent directory traversal
	folderPath = middleware.SanitizeString(folderPath)

	// Use file system scanning
	files, folders, err := h.fileService.ScanDirectory(folderPath)
	if err != nil {
		log.Printf("[FileOps] ERROR: Failed to scan directory '%s': %v", folderPath, err)
		models.RespondError(w, "Failed to list files", http.StatusInternalServerError)
		return
	}

	// Calculate totals
	totalFiles := len(files)
	var totalSize int64
	for _, file := range files {
		totalSize += file.Size
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"files":      files,
		"folders":    folders,
		"totalFiles": totalFiles,
		"totalSize":  totalSize,
		"folderPath": folderPath,
	}, http.StatusOK)
}

// GetByID gets information about a single file
func (h *FileOperations) GetByID(w http.ResponseWriter, r *http.Request, filename string) {
	// Check if file exists
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Get file info from file system
	filePath := h.fileService.GetFilePath(filename)
	info, err := os.Stat(filePath)
	if err != nil {
		log.Printf("[FileOps] ERROR: Failed to stat file '%s': %v", filename, err)
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Create file entry
	mimeType := h.fileService.GetMimeType(filename)
	fileEntry := services.FileEntry{
		Name:          filepath.Base(filename),
		Path:          filename,
		Size:          info.Size(),
		MimeType:      mimeType,
		Extension:     filepath.Ext(filename),
		CreatedAt:     info.ModTime(),
		Icon:          h.fileService.GetFileIcon(mimeType),
		FormattedSize: h.fileService.FormatFileSize(info.Size()),
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"file": fileEntry,
	}, http.StatusOK)
}

// Download serves a file for download
func (h *FileOperations) Download(w http.ResponseWriter, r *http.Request, filename string) {
	// Check if file exists
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	filePath := h.fileService.GetFilePath(filename)
	mimeType := h.fileService.GetMimeType(filename)

	log.Printf("[FileOps] File downloaded: %s by IP %s", filename, r.RemoteAddr)

	w.Header().Set("Content-Disposition", "attachment; filename=\""+filepath.Base(filename)+"\"")
	w.Header().Set("Content-Type", mimeType)
	http.ServeFile(w, r, filePath)
}

// Preview serves a file for inline preview
func (h *FileOperations) Preview(w http.ResponseWriter, r *http.Request, filename string) {
	// Check if file exists
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	filePath := h.fileService.GetFilePath(filename)
	mimeType := h.fileService.GetMimeType(filename)

	w.Header().Set("Content-Type", mimeType)
	http.ServeFile(w, r, filePath)
}

// Delete deletes a file
func (h *FileOperations) Delete(w http.ResponseWriter, r *http.Request, filename string) {
	// Check if file exists
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Delete from disk
	if err := h.fileService.DeleteFile(filename); err != nil {
		log.Printf("[FileOps] ERROR: Failed to delete file '%s': %v", filename, err)
		models.RespondError(w, "Failed to delete file", http.StatusInternalServerError)
		return
	}

	log.Printf("[FileOps] File deleted: %s", filename)

	models.RespondSuccess(w, "File deleted successfully", nil, http.StatusOK)
}

// Rename renames a file
func (h *FileOperations) Rename(w http.ResponseWriter, r *http.Request, filename string) {
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate new name
	req.Name = middleware.SanitizeString(req.Name)
	if req.Name == "" {
		models.RespondError(w, "Name is required", http.StatusBadRequest)
		return
	}

	// Check if file exists
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Get paths
	oldPath := h.fileService.GetFilePath(filename)
	dir := filepath.Dir(oldPath)

	// Preserve extension
	ext := filepath.Ext(filename)
	newName := strings.TrimSuffix(req.Name, filepath.Ext(req.Name)) + ext
	newPath := filepath.Join(dir, newName)

	// Rename the file
	if err := os.Rename(oldPath, newPath); err != nil {
		log.Printf("[FileOps] ERROR: Failed to rename '%s' to '%s': %v", oldPath, newPath, err)
		models.RespondError(w, "Failed to rename file", http.StatusInternalServerError)
		return
	}

	// Get new relative path
	storagePath := h.fileService.GetStoragePath()
	newRelPath, _ := filepath.Rel(storagePath, newPath)

	fileInfo, _ := os.Stat(newPath)
	mimeType := h.fileService.GetMimeType(newRelPath)

	fileEntry := services.FileEntry{
		Name:          newName,
		Path:          newRelPath,
		Size:          fileInfo.Size(),
		MimeType:      mimeType,
		Extension:     filepath.Ext(newRelPath),
		CreatedAt:     fileInfo.ModTime(),
		Icon:          h.fileService.GetFileIcon(mimeType),
		FormattedSize: h.fileService.FormatFileSize(fileInfo.Size()),
	}

	log.Printf("[FileOps] File renamed: %s -> %s", filename, newName)

	models.RespondSuccess(w, "File renamed successfully", map[string]interface{}{
		"file": fileEntry,
	}, http.StatusOK)
}

// BulkDelete deletes multiple files at once
func (h *FileOperations) BulkDelete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FileNames []string `json:"fileNames"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	deleted := 0
	failed := 0

	for _, filename := range req.FileNames {
		filename = middleware.SanitizeString(filename)
		if h.fileService.FileExists(filename) {
			if err := h.fileService.DeleteFile(filename); err == nil {
				deleted++
			} else {
				failed++
				log.Printf("[FileOps] ERROR: Failed to delete file '%s': %v", filename, err)
			}
		}
	}

	log.Printf("[FileOps] Bulk delete: %d deleted, %d failed", deleted, failed)

	models.RespondSuccess(w, "Files deleted", map[string]interface{}{
		"deleted": deleted,
		"failed":  failed,
	}, http.StatusOK)
}

// ServeFile serves a file from storage (static file serving)
func (h *FileOperations) ServeFile(w http.ResponseWriter, r *http.Request) {
	filename := chi.URLParam(r, "*")
	if filename == "" {
		http.NotFound(w, r)
		return
	}

	filePath := h.fileService.GetFilePath(filename)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.NotFound(w, r)
		return
	}

	http.ServeFile(w, r, filePath)
}

// HandleFileRoute dispatches file operations based on path and method
func (h *FileOperations) HandleFileRoute(w http.ResponseWriter, r *http.Request) {
	rawPath := chi.URLParam(r, "*")
	// URL decode the path
	path, err := url.PathUnescape(rawPath)
	if err != nil {
		path = rawPath
	}

	// Sanitize path
	path = middleware.SanitizeString(path)

	switch r.Method {
	case "GET":
		if strings.HasSuffix(path, "/download") {
			h.Download(w, r, strings.TrimSuffix(path, "/download"))
		} else if strings.HasSuffix(path, "/preview") {
			h.Preview(w, r, strings.TrimSuffix(path, "/preview"))
		} else {
			h.GetByID(w, r, path)
		}
	case "POST":
		if strings.HasSuffix(path, "/share") {
			h.shareHandler.CreateShareLink(w, r, strings.TrimSuffix(path, "/share"))
		} else {
			models.RespondError(w, "Invalid operation", http.StatusBadRequest)
		}
	case "PUT":
		if strings.HasSuffix(path, "/rename") {
			h.Rename(w, r, strings.TrimSuffix(path, "/rename"))
		} else {
			models.RespondError(w, "Invalid operation", http.StatusBadRequest)
		}
	case "DELETE":
		if strings.HasSuffix(path, "/share") {
			h.shareHandler.RemoveShareLink(w, r, strings.TrimSuffix(path, "/share"))
		} else {
			h.Delete(w, r, path)
		}
	default:
		models.RespondError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// RegisterRoutes registers all file operation routes
func (h *FileOperations) RegisterRoutes(r chi.Router) {
	// Static routes first (before wildcards)
	r.Post("/files/upload", h.Upload)
	r.Get("/files", h.List)
	r.Delete("/files/bulk", h.BulkDelete)

	// Wildcard routes for file operations
	r.Get("/files/*", h.HandleFileRoute)
	r.Post("/files/*", h.HandleFileRoute)
	r.Put("/files/*", h.HandleFileRoute)
	r.Delete("/files/*", h.HandleFileRoute)
}

// RegisterPublicRoutes registers public share routes
func (h *FileOperations) RegisterPublicRoutes(r chi.Router) {
	h.shareHandler.RegisterPublicRoutes(r)
}
