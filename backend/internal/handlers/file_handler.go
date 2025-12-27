package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"titan-backend/internal/models"
	"titan-backend/internal/services"
)

// ShareInfo stores information about shared files
type ShareInfo struct {
	FileName    string     `json:"fileName"`
	Expiry      *time.Time `json:"expiry"`
	CreatedAt   time.Time  `json:"createdAt"`
	Downloads   int        `json:"downloads"`
}

type FileHandler struct {
	fileRepo    *models.FileRepository
	fileService *services.FileService
	shareTokens map[string]*ShareInfo // In-memory store for share tokens
	shareMutex  sync.RWMutex          // Mutex to protect the shareTokens map
}

func NewFileHandler(fileRepo *models.FileRepository, fileService *services.FileService) *FileHandler {
	return &FileHandler{
		fileRepo:    fileRepo,
		fileService: fileService,
		shareTokens: make(map[string]*ShareInfo),
	}
}

// Upload a file
func (h *FileHandler) Upload(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 100MB)
	if err := r.ParseMultipartForm(100 << 20); err != nil {
		models.RespondError(w, "Failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		models.RespondError(w, "Failed to get file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Get folder path if provided
	folderPath := r.FormValue("folderPath")

	// Save file to storage
	savedName, savedPath, err := h.fileService.SaveFileToPath(file, header, folderPath)
	if err != nil {
		models.RespondError(w, "Failed to save file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get file info
	ext := filepath.Ext(header.Filename)
	mimeType := h.fileService.GetMimeType(header.Filename)

	// Create file entry for response
	fileEntry := services.FileEntry{
		Name:          savedName,
		Path:          savedPath, // relative path
		Size:          header.Size,
		MimeType:      mimeType,
		Extension:     ext,
		CreatedAt:     time.Now(),
		Icon:          h.fileService.GetFileIcon(mimeType),
		FormattedSize: h.fileService.FormatFileSize(header.Size),
	}

	models.RespondSuccess(w, "File uploaded successfully", map[string]interface{}{
		"file": fileEntry,
	}, http.StatusCreated)
}

// List files
func (h *FileHandler) List(w http.ResponseWriter, r *http.Request) {
	// Get folder path from query parameter instead of folder ID
	folderPath := r.URL.Query().Get("folderPath")
	if folderPath == "" {
		folderPath = "." // Root directory
	}

	// Log the endpoint access
	log.Printf("%s %s %s?folderPath=%s", time.Now().Format("2006/01/02 15:04:05"), r.Method, r.URL.Path, folderPath)

	// Debug logging - detailed request information
	log.Printf("[DEBUG] List - Request details:")
	log.Printf("[DEBUG]   - Raw folderPath parameter: %s", folderPath)
	log.Printf("[DEBUG]   - Full request URL: %s", r.URL.String())
	log.Printf("[DEBUG]   - Storage path: %s", h.fileService.GetStoragePath())
	// Get absolute path for debugging
	absStoragePath, _ := filepath.Abs(h.fileService.GetStoragePath())
	log.Printf("[DEBUG]   - Absolute storage path: %s", absStoragePath)

	// Use file system scanning instead of database
	log.Printf("[DEBUG]   - About to scan directory: %s", folderPath)
	files, folders, err := h.fileService.ScanDirectory(folderPath)
	if err != nil {
		log.Printf("[DEBUG]   - Error scanning directory %s: %v", folderPath, err)
		models.RespondError(w, "Failed to list files: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Calculate total files and size from file system
	totalFiles := len(files)
	var totalSize int64
	for _, file := range files {
		totalSize += file.Size
	}

	log.Printf("[DEBUG]   - Found %d files and %d folders in path %s", len(files), len(folders), folderPath)
	if len(files) == 0 && len(folders) == 0 {
		log.Printf("[DEBUG]   - Directory may be empty or there might be a path resolution issue")
		// Check if the directory exists
		testPath := filepath.Join(h.fileService.GetStoragePath(), folderPath)
		if _, err := os.Stat(testPath); os.IsNotExist(err) {
			log.Printf("[DEBUG]   - Directory does not exist: %s", testPath)
		} else {
			log.Printf("[DEBUG]   - Directory exists: %s", testPath)
			// Try to list what's actually in the directory
			entries, readErr := os.ReadDir(testPath)
			if readErr == nil {
				log.Printf("[DEBUG]   - Directory contains %d entries: %v", len(entries), entries)
				for _, entry := range entries {
					log.Printf("[DEBUG]   - Entry: %s, IsDir: %t", entry.Name(), entry.IsDir())
				}
			} else {
				log.Printf("[DEBUG]   - Error reading directory: %v", readErr)
			}
		}
	}
	log.Printf("[DEBUG]   - Total size: %d bytes", totalSize)

	models.RespondSuccess(w, "", map[string]interface{}{
		"files":      files,
		"folders":    folders,
		"totalFiles": totalFiles,
		"totalSize":  totalSize,
		"folderPath": folderPath,
	}, http.StatusOK)
}

// Get single file info
func (h *FileHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	// For file system approach, we'll get the file by name/path
	// Get the file name from the URL parameter
	filename := chi.URLParam(r, "id")

	// Check if file exists in the file system
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Get file info from the file system
	filePath := h.fileService.GetFilePath(filename)
	info, err := os.Stat(filePath)
	if err != nil {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Create a FileEntry based on file system info
	mimeType := h.fileService.GetMimeType(filename)
	fileEntry := services.FileEntry{
		Name:          filename,
		Path:          filename, // relative path
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

// Download file
func (h *FileHandler) Download(w http.ResponseWriter, r *http.Request) {
	// Get the file name from the URL parameter
	filename := chi.URLParam(r, "id")

	// Check if file exists on disk
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found on disk", http.StatusNotFound)
		return
	}

	// Get file info for the original name and mime type
	filePath := h.fileService.GetFilePath(filename)
	info, err := os.Stat(filePath)
	if err != nil {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Serve file
	w.Header().Set("Content-Disposition", "attachment; filename=\""+info.Name()+"\"")
	mimeType := h.fileService.GetMimeType(filename)
	w.Header().Set("Content-Type", mimeType)
	http.ServeFile(w, r, filePath)
}

// Delete file
func (h *FileHandler) Delete(w http.ResponseWriter, r *http.Request) {
	// Get the file name from the URL parameter
	filename := chi.URLParam(r, "id")

	// Check if file exists on disk
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Delete from disk
	if err := h.fileService.DeleteFile(filename); err != nil {
		models.RespondError(w, "Failed to delete file from disk", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "File deleted successfully", nil, http.StatusOK)
}

// Rename file
func (h *FileHandler) Rename(w http.ResponseWriter, r *http.Request) {
	// Get the file name from the URL parameter
	filename := chi.URLParam(r, "id")

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check if file exists on disk
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Get the current file path
	oldPath := h.fileService.GetFilePath(filename)

	// Get the extension from the old filename to preserve it
	ext := filepath.Ext(filename)
	newName := strings.TrimSuffix(req.Name, filepath.Ext(req.Name)) + ext
	newPath := h.fileService.GetFilePath(newName)

	// Rename the file
	if err := os.Rename(oldPath, newPath); err != nil {
		models.RespondError(w, "Failed to rename file", http.StatusInternalServerError)
		return
	}

	// Create a FileEntry based on the new file system info
	info, err := os.Stat(newPath)
	if err != nil {
		models.RespondError(w, "File not found after rename", http.StatusInternalServerError)
		return
	}

	mimeType := h.fileService.GetMimeType(newName)
	fileEntry := services.FileEntry{
		Name:          newName,
		Path:          newName, // relative path
		Size:          info.Size(),
		MimeType:      mimeType,
		Extension:     filepath.Ext(newName),
		CreatedAt:     info.ModTime(),
		Icon:          h.fileService.GetFileIcon(mimeType),
		FormattedSize: h.fileService.FormatFileSize(info.Size()),
	}

	models.RespondSuccess(w, "File renamed successfully", map[string]interface{}{
		"file": fileEntry,
	}, http.StatusOK)
}

// Create share link
func (h *FileHandler) CreateShareLink(w http.ResponseWriter, r *http.Request) {
	// Get the file name from the URL parameter
	filename := chi.URLParam(r, "id")

	// Check if file exists on disk
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	var req struct {
		ExpiryHours int `json:"expiryHours"` // 0 means no expiry
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Default no expiry
		req.ExpiryHours = 0
	}

	// Generate share token
	token := models.GenerateShareToken()

	var expiry *time.Time
	if req.ExpiryHours > 0 {
		exp := time.Now().Add(time.Duration(req.ExpiryHours) * time.Hour)
		expiry = &exp
	}

	// Store share info in memory
	h.shareMutex.Lock()
	h.shareTokens[token] = &ShareInfo{
		FileName:  filename,
		Expiry:    expiry,
		CreatedAt: time.Now(),
		Downloads: 0,
	}
	h.shareMutex.Unlock()

	models.RespondSuccess(w, "Share link created", map[string]interface{}{
		"fileName":   filename,
		"shareToken": token,
		"shareUrl":   "/api/share/" + token,
	}, http.StatusOK)
}

// Remove share link
func (h *FileHandler) RemoveShareLink(w http.ResponseWriter, r *http.Request) {
	// For file system approach, we'll just acknowledge the request
	// since we're not persisting share links in the database
	// In a production system, you'd remove the share token from your storage

	models.RespondSuccess(w, "Share link removed", nil, http.StatusOK)
}

// Download shared file (public endpoint)
func (h *FileHandler) DownloadShared(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		models.RespondError(w, "Invalid share token", http.StatusBadRequest)
		return
	}

	h.shareMutex.RLock()
	shareInfo, exists := h.shareTokens[token]
	h.shareMutex.RUnlock()

	if !exists {
		models.RespondError(w, "Shared file not found", http.StatusNotFound)
		return
	}

	// Check expiry
	if shareInfo.Expiry != nil && time.Now().After(*shareInfo.Expiry) {
		models.RespondError(w, "Share link has expired", http.StatusGone)
		return
	}

	// Check if file exists on disk
	if !h.fileService.FileExists(shareInfo.FileName) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Increment download count
	h.shareMutex.Lock()
	shareInfo.Downloads++
	h.shareTokens[token] = shareInfo
	h.shareMutex.Unlock()

	// Serve file
	filePath := h.fileService.GetFilePath(shareInfo.FileName)
	info, err := os.Stat(filePath)
	if err != nil {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Disposition", "attachment; filename=\""+info.Name()+"\"")
	mimeType := h.fileService.GetMimeType(shareInfo.FileName)
	w.Header().Set("Content-Type", mimeType)
	http.ServeFile(w, r, filePath)
}

// Get shared file info (public endpoint)
func (h *FileHandler) GetSharedInfo(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		models.RespondError(w, "Invalid share token", http.StatusBadRequest)
		return
	}

	h.shareMutex.RLock()
	shareInfo, exists := h.shareTokens[token]
	h.shareMutex.RUnlock()

	if !exists {
		models.RespondError(w, "Shared file not found", http.StatusNotFound)
		return
	}

	// Check expiry
	if shareInfo.Expiry != nil && time.Now().After(*shareInfo.Expiry) {
		models.RespondError(w, "Share link has expired", http.StatusGone)
		return
	}

	// Get file info from the file system
	filePath := h.fileService.GetFilePath(shareInfo.FileName)
	info, err := os.Stat(filePath)
	if err != nil {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Return limited info for public
	models.RespondSuccess(w, "", map[string]interface{}{
		"name":      info.Name(),
		"size":      info.Size(),
		"mimeType":  h.fileService.GetMimeType(shareInfo.FileName),
		"downloads": shareInfo.Downloads,
	}, http.StatusOK)
}

// Create folder
func (h *FileHandler) CreateFolder(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
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
		models.RespondError(w, "Failed to create folder: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get the relative path from storage root
	relPath, err := filepath.Rel(h.fileService.GetStoragePath(), fullPath)
	if err != nil {
		models.RespondError(w, "Failed to create folder", http.StatusInternalServerError)
		return
	}

	// Get folder info
	info, err := os.Stat(fullPath)
	if err != nil {
		models.RespondError(w, "Failed to get folder info", http.StatusInternalServerError)
		return
	}

	folderEntry := services.FolderEntry{
		Name:      req.Name,
		Path:      relPath,
		CreatedAt: info.ModTime(),
		Size:      0, // Folders don't have a meaningful size
	}

	models.RespondSuccess(w, "Folder created successfully", map[string]interface{}{
		"folder": folderEntry,
	}, http.StatusCreated)
}

// Delete folder
func (h *FileHandler) DeleteFolder(w http.ResponseWriter, r *http.Request) {
	folderPath := chi.URLParam(r, "id")
	if folderPath == "" {
		models.RespondError(w, "Invalid folder path", http.StatusBadRequest)
		return
	}

	// Build the full path for the folder
	fullPath := filepath.Join(h.fileService.GetStoragePath(), folderPath)

	// Remove the directory and all its contents
	if err := os.RemoveAll(fullPath); err != nil {
		models.RespondError(w, "Failed to delete folder: "+err.Error(), http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "Folder deleted successfully", nil, http.StatusOK)
}

// Get folder path (breadcrumb)
func (h *FileHandler) GetFolderPath(w http.ResponseWriter, r *http.Request) {
	folderPath := chi.URLParam(r, "id")
	if folderPath == "" {
		models.RespondError(w, "Invalid folder path", http.StatusBadRequest)
		return
	}

	// Log the endpoint access
	log.Printf("%s %s %s", time.Now().Format("2006/01/02 15:04:05"), r.Method, r.URL.Path)

	// Debug logging - detailed request information
	log.Printf("[DEBUG] GetFolderPath - Request details:")
	log.Printf("[DEBUG]   - Raw folderPath parameter: %s", folderPath)
	log.Printf("[DEBUG]   - Storage path: %s", h.fileService.GetStoragePath())
	// Get absolute path for debugging
	absStoragePath, _ := filepath.Abs(h.fileService.GetStoragePath())
	log.Printf("[DEBUG]   - Absolute storage path: %s", absStoragePath)
	log.Printf("[DEBUG]   - Full request URL: %s", r.URL.String())

	// Build the full path
	fullPath := filepath.Join(h.fileService.GetStoragePath(), folderPath)
	log.Printf("[DEBUG]   - Full path constructed: %s", fullPath)

	// Check if the path exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		log.Printf("[DEBUG]   - Folder not found at path: %s", fullPath)
		models.RespondError(w, "Folder not found", http.StatusNotFound)
		return
	}

	// Build the path hierarchy by splitting the path
	relPath, err := filepath.Rel(h.fileService.GetStoragePath(), fullPath)
	if err != nil {
		log.Printf("[DEBUG]   - Error getting relative path: %v", err)
		models.RespondError(w, "Invalid folder path", http.StatusBadRequest)
		return
	}

	log.Printf("[DEBUG]   - Relative path: %s", relPath)

	// Split the path into components
	components := strings.Split(filepath.Clean(relPath), string(filepath.Separator))
	log.Printf("[DEBUG]   - Path components: %v", components)

	// Build the path hierarchy
	path := []services.FolderEntry{}
	currentPath := ""

	for i, component := range components {
		log.Printf("[DEBUG]   - Processing component %d: %s", i, component)

		if component == "" || component == "." {
			log.Printf("[DEBUG]   - Skipping empty or root component: %s", component)
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
			log.Printf("[DEBUG]   - Error accessing folder %s: %v", fullComponentPath, err)
			continue // Skip if we can't access the folder
		}

		folderEntry := services.FolderEntry{
			Name:      component,
			Path:      currentPath,
			CreatedAt: info.ModTime(),
			Size:      0, // Folders don't have a meaningful size
		}
		log.Printf("[DEBUG]   - Added folder entry: %s at path %s", folderEntry.Name, folderEntry.Path)
		path = append(path, folderEntry)
	}

	log.Printf("[DEBUG]   - Final path hierarchy contains %d entries", len(path))
	log.Printf("[DEBUG]   - Path hierarchy: %v", path)

	models.RespondSuccess(w, "", map[string]interface{}{
		"path": path,
	}, http.StatusOK)
}

// Preview file (for images, PDFs, etc.)
func (h *FileHandler) Preview(w http.ResponseWriter, r *http.Request) {
	filename := chi.URLParam(r, "id")

	// Check if file exists on disk
	if !h.fileService.FileExists(filename) {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Get file info for the original name and mime type
	filePath := h.fileService.GetFilePath(filename)
	info, err := os.Stat(filePath)
	if err != nil {
		models.RespondError(w, "File not found", http.StatusNotFound)
		return
	}

	// Serve file inline for preview
	mimeType := h.fileService.GetMimeType(filename)
	w.Header().Set("Content-Disposition", "inline; filename=\""+info.Name()+"\"")
	w.Header().Set("Content-Type", mimeType)
	http.ServeFile(w, r, filePath)
}

// Bulk delete files
func (h *FileHandler) BulkDelete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FileNames []string `json:"fileNames"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	deleted := 0
	for _, filename := range req.FileNames {
		if h.fileService.FileExists(filename) {
			if err := h.fileService.DeleteFile(filename); err == nil {
				deleted++
			}
		}
	}

	models.RespondSuccess(w, "Files deleted", map[string]interface{}{
		"deleted": deleted,
	}, http.StatusOK)
}

// Get file from disk for serving via /storage/drive/
func (h *FileHandler) ServeFile(w http.ResponseWriter, r *http.Request) {
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

// RegisterRoutes registers all file management routes
func (h *FileHandler) RegisterRoutes(r chi.Router) {
	r.Post("/files/upload", h.Upload)
	r.Get("/files", h.List)
	r.Get("/files/{id}", h.GetByID)
	r.Get("/files/{id}/download", h.Download)
	r.Get("/files/{id}/preview", h.Preview)
	r.Delete("/files/{id}", h.Delete)
	r.Put("/files/{id}/rename", h.Rename)
	r.Post("/files/{id}/share", h.CreateShareLink)
	r.Delete("/files/{id}/share", h.RemoveShareLink)
	r.Delete("/files/bulk", h.BulkDelete)

	r.Post("/folders", h.CreateFolder)
	r.Delete("/folders/{id}", h.DeleteFolder)
	r.Get("/folders/{id}/path", h.GetFolderPath)
}

// RegisterPublicRoutes registers public file sharing routes
func (h *FileHandler) RegisterPublicRoutes(r chi.Router) {
	r.Get("/share/{token}", h.GetSharedInfo)
	r.Get("/share/{token}/download", h.DownloadShared)
}
