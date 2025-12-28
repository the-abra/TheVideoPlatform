package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"

	"titan-backend/internal/models"
	"titan-backend/internal/services"
)

// DirectoryHandler handles directory/folder operations
type DirectoryHandler struct {
	fileService *services.FileService
}

// NewDirectoryHandler creates a new directory handler
func NewDirectoryHandler(fileService *services.FileService) *DirectoryHandler {
	return &DirectoryHandler{
		fileService: fileService,
	}
}

// CreateFolder creates a new folder
func (h *DirectoryHandler) CreateFolder(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name       string `json:"name"`
		ParentPath string `json:"parentPath"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		models.RespondError(w, "Folder name is required", http.StatusBadRequest)
		return
	}

	// Build the full path for the new folder
	var fullPath string
	if req.ParentPath == "" || req.ParentPath == "." {
		fullPath = filepath.Join(h.fileService.GetStoragePath(), req.Name)
	} else {
		fullPath = filepath.Join(h.fileService.GetStoragePath(), req.ParentPath, req.Name)
	}

	// Create the directory
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		log.Printf("[DirectoryHandler] ERROR: Failed to create folder at '%s': %v", fullPath, err)
		models.RespondError(w, "Failed to create folder: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get the relative path from storage root
	relPath, err := filepath.Rel(h.fileService.GetStoragePath(), fullPath)
	if err != nil {
		log.Printf("[DirectoryHandler] ERROR: Failed to get relative path for '%s': %v", fullPath, err)
		models.RespondError(w, "Failed to create folder", http.StatusInternalServerError)
		return
	}

	// Get folder info
	info, err := os.Stat(fullPath)
	if err != nil {
		log.Printf("[DirectoryHandler] ERROR: Failed to stat folder '%s': %v", fullPath, err)
		models.RespondError(w, "Failed to get folder info", http.StatusInternalServerError)
		return
	}

	folderEntry := services.FolderEntry{
		Name:      req.Name,
		Path:      relPath,
		CreatedAt: info.ModTime(),
		Size:      0, // Folders don't have a meaningful size
	}

	log.Printf("[DirectoryHandler] Folder created: %s at path %s", req.Name, relPath)

	models.RespondSuccess(w, "Folder created successfully", map[string]interface{}{
		"folder": folderEntry,
	}, http.StatusCreated)
}

// DeleteFolder deletes a folder and all its contents
func (h *DirectoryHandler) DeleteFolder(w http.ResponseWriter, r *http.Request, folderPath string) {
	if folderPath == "" {
		models.RespondError(w, "Invalid folder path", http.StatusBadRequest)
		return
	}

	// Build the full path for the folder
	fullPath := filepath.Join(h.fileService.GetStoragePath(), folderPath)

	// Check if folder exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		models.RespondError(w, "Folder not found", http.StatusNotFound)
		return
	}

	// Remove the directory and all its contents
	if err := os.RemoveAll(fullPath); err != nil {
		log.Printf("[DirectoryHandler] ERROR: Failed to delete folder '%s': %v", fullPath, err)
		models.RespondError(w, "Failed to delete folder: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("[DirectoryHandler] Folder deleted: %s", folderPath)

	models.RespondSuccess(w, "Folder deleted successfully", nil, http.StatusOK)
}

// GetFolderPath returns the breadcrumb path for a folder
func (h *DirectoryHandler) GetFolderPath(w http.ResponseWriter, r *http.Request, folderPath string) {
	if folderPath == "" {
		models.RespondError(w, "Invalid folder path", http.StatusBadRequest)
		return
	}

	// Build the full path
	fullPath := filepath.Join(h.fileService.GetStoragePath(), folderPath)

	// Check if the path exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		log.Printf("[DirectoryHandler] Folder not found: %s", fullPath)
		models.RespondError(w, "Folder not found", http.StatusNotFound)
		return
	}

	// Build the path hierarchy by splitting the path
	relPath, err := filepath.Rel(h.fileService.GetStoragePath(), fullPath)
	if err != nil {
		log.Printf("[DirectoryHandler] ERROR: Error getting relative path: %v", err)
		models.RespondError(w, "Invalid folder path", http.StatusBadRequest)
		return
	}

	// Split the path into components
	components := strings.Split(filepath.Clean(relPath), string(filepath.Separator))

	// Build the path hierarchy
	path := []services.FolderEntry{}
	currentPath := ""

	for _, component := range components {
		if component == "" || component == "." {
			continue
		}

		if currentPath == "" {
			currentPath = component
		} else {
			currentPath = filepath.Join(currentPath, component)
		}

		// Get folder info
		fullComponentPath := filepath.Join(h.fileService.GetStoragePath(), currentPath)
		info, err := os.Stat(fullComponentPath)
		if err != nil {
			log.Printf("[DirectoryHandler] WARNING: Error accessing folder %s: %v", fullComponentPath, err)
			continue // Skip if we can't access the folder
		}

		folderEntry := services.FolderEntry{
			Name:      component,
			Path:      currentPath,
			CreatedAt: info.ModTime(),
			Size:      0,
		}
		path = append(path, folderEntry)
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"path": path,
	}, http.StatusOK)
}

// HandleFolderRoute dispatches folder operations based on path suffix
func (h *DirectoryHandler) HandleFolderRoute(w http.ResponseWriter, r *http.Request) {
	rawPath := chi.URLParam(r, "*")
	// URL decode the path since chi doesn't decode wildcard params
	path, err := url.PathUnescape(rawPath)
	if err != nil {
		path = rawPath
	}

	switch r.Method {
	case "GET":
		if strings.HasSuffix(path, "/path") {
			h.GetFolderPath(w, r, strings.TrimSuffix(path, "/path"))
		} else {
			models.RespondError(w, "Invalid operation", http.StatusBadRequest)
		}
	case "DELETE":
		h.DeleteFolder(w, r, path)
	default:
		models.RespondError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// RegisterRoutes registers all directory routes
func (h *DirectoryHandler) RegisterRoutes(r chi.Router) {
	r.Post("/folders", h.CreateFolder)
	r.Get("/folders/*", h.HandleFolderRoute)
	r.Delete("/folders/*", h.HandleFolderRoute)
}
