package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type FileService struct {
	storagePath string
}

func NewFileService(storagePath string) *FileService {
	// Create storage directory if it doesn't exist
	os.MkdirAll(storagePath, 0755)
	return &FileService{storagePath: storagePath}
}

func (s *FileService) SaveFile(file multipart.File, header *multipart.FileHeader) (string, string, error) {
	// Get the original filename without extension
	ext := filepath.Ext(header.Filename)
	originalName := strings.TrimSuffix(header.Filename, ext)

	// Sanitize the filename (remove special characters, spaces, etc.)
	sanitizedName := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		if r == ' ' {
			return '_'
		}
		return -1
	}, originalName)

	// If sanitization removed all characters, use a default name
	if sanitizedName == "" {
		sanitizedName = "file"
	}

	// Generate unique filename with original name: originalname_uuid.ext
	uniqueID := uuid.New().String()[:8] // Use first 8 chars of UUID for brevity
	uniqueName := fmt.Sprintf("%s_%s%s", sanitizedName, uniqueID, ext)

	// Create file path
	filePath := filepath.Join(s.storagePath, uniqueName)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(filePath)
		return "", "", fmt.Errorf("failed to save file: %w", err)
	}

	return uniqueName, filePath, nil
}

func (s *FileService) DeleteFile(filename string) error {
	// The filename might be a relative path, so we need to join it with the storage path
	filePath := filepath.Join(s.storagePath, filename)
	return os.Remove(filePath)
}

func (s *FileService) GetFilePath(filename string) string {
	// The filename might be a relative path, so we need to join it with the storage path
	return filepath.Join(s.storagePath, filename)
}

func (s *FileService) FileExists(filename string) bool {
	// The filename might be a relative path, so we need to join it with the storage path
	filePath := filepath.Join(s.storagePath, filename)
	_, err := os.Stat(filePath)
	return err == nil
}

func (s *FileService) GetMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	mimeTypes := map[string]string{
		".pdf":  "application/pdf",
		".doc":  "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xls":  "application/vnd.ms-excel",
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".ppt":  "application/vnd.ms-powerpoint",
		".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
		".txt":  "text/plain",
		".csv":  "text/csv",
		".json": "application/json",
		".xml":  "application/xml",
		".zip":  "application/zip",
		".rar":  "application/x-rar-compressed",
		".7z":   "application/x-7z-compressed",
		".tar":  "application/x-tar",
		".gz":   "application/gzip",
		".png":  "image/png",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".gif":  "image/gif",
		".webp": "image/webp",
		".svg":  "image/svg+xml",
		".ico":  "image/x-icon",
		".mp3":  "audio/mpeg",
		".wav":  "audio/wav",
		".ogg":  "audio/ogg",
		".mp4":  "video/mp4",
		".webm": "video/webm",
		".avi":  "video/x-msvideo",
		".mkv":  "video/x-matroska",
		".html": "text/html",
		".css":  "text/css",
		".js":   "application/javascript",
		".go":   "text/plain",
		".py":   "text/plain",
		".java": "text/plain",
		".c":    "text/plain",
		".cpp":  "text/plain",
		".h":    "text/plain",
		".md":   "text/markdown",
	}

	if mime, ok := mimeTypes[ext]; ok {
		return mime
	}
	return "application/octet-stream"
}

func (s *FileService) GetFileIcon(mimeType string) string {
	if strings.HasPrefix(mimeType, "image/") {
		return "image"
	}
	if strings.HasPrefix(mimeType, "video/") {
		return "video"
	}
	if strings.HasPrefix(mimeType, "audio/") {
		return "audio"
	}
	if strings.HasPrefix(mimeType, "text/") {
		return "text"
	}
	if strings.Contains(mimeType, "pdf") {
		return "pdf"
	}
	if strings.Contains(mimeType, "word") || strings.Contains(mimeType, "document") {
		return "document"
	}
	if strings.Contains(mimeType, "sheet") || strings.Contains(mimeType, "excel") {
		return "spreadsheet"
	}
	if strings.Contains(mimeType, "presentation") || strings.Contains(mimeType, "powerpoint") {
		return "presentation"
	}
	if strings.Contains(mimeType, "zip") || strings.Contains(mimeType, "compressed") || strings.Contains(mimeType, "tar") || strings.Contains(mimeType, "gzip") {
		return "archive"
	}
	return "file"
}

func (s *FileService) FormatFileSize(size int64) string {
	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%d B", size)
	}
	div, exp := int64(unit), 0
	for n := size / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(size)/float64(div), "KMGTPE"[exp])
}

func (s *FileService) IsShareExpired(expiry *time.Time) bool {
	if expiry == nil {
		return false
	}
	return time.Now().After(*expiry)
}

// GetStoragePath returns the storage path for the service
func (s *FileService) GetStoragePath() string {
	return s.storagePath
}

// SaveFileToPath saves a file to a specific path within the storage directory
func (s *FileService) SaveFileToPath(file multipart.File, header *multipart.FileHeader, folderPath string) (string, string, error) {
	// Get the original filename without extension
	ext := filepath.Ext(header.Filename)
	originalName := strings.TrimSuffix(header.Filename, ext)

	// Sanitize the filename (remove special characters, spaces, etc.)
	sanitizedName := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		if r == ' ' {
			return '_'
		}
		return -1
	}, originalName)

	// If sanitization removed all characters, use a default name
	if sanitizedName == "" {
		sanitizedName = "file"
	}

	// Generate unique filename with original name: originalname_uuid.ext
	uniqueID := uuid.New().String()[:8] // Use first 8 chars of UUID for brevity
	uniqueName := fmt.Sprintf("%s_%s%s", sanitizedName, uniqueID, ext)

	var targetPath string
	if folderPath != "" && folderPath != "." {
		// Create the target directory if it doesn't exist
		targetDir := filepath.Join(s.storagePath, folderPath)
		if err := os.MkdirAll(targetDir, 0755); err != nil {
			return "", "", fmt.Errorf("failed to create directory: %w", err)
		}
		targetPath = filepath.Join(targetDir, uniqueName)
	} else {
		// Save in root directory
		targetPath = filepath.Join(s.storagePath, uniqueName)
	}

	// Create destination file
	dst, err := os.Create(targetPath)
	if err != nil {
		return "", "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(targetPath)
		return "", "", fmt.Errorf("failed to save file: %w", err)
	}

	// Return the relative path from storage root
	relPath, err := filepath.Rel(s.storagePath, targetPath)
	if err != nil {
		// If we can't get relative path, return the full path
		return uniqueName, targetPath, nil
	}

	return uniqueName, relPath, nil
}

// ScanDirectory scans a directory and returns file and folder information
func (s *FileService) ScanDirectory(folderPath string) ([]FileEntry, []FolderEntry, error) {
	var scanPath string

	// Get the absolute storage path for consistent path calculations
	storageAbs, err := filepath.Abs(s.storagePath)
	if err != nil {
		return nil, nil, err
	}

	// If folderPath is empty or root, scan the main storage directory
	if folderPath == "" || folderPath == "." || folderPath == "/" {
		scanPath = storageAbs
	} else {
		// Clean the folder path to normalize it
		cleanPath := filepath.Clean(folderPath)
		// Ensure the path is within the storage directory for security
		scanPath = filepath.Join(storageAbs, cleanPath)
		// Resolve any relative paths to prevent directory traversal
		absPath, err := filepath.Abs(scanPath)
		if err != nil {
			return nil, nil, err
		}
		// Check that the requested path is within the storage directory
		if !strings.HasPrefix(absPath, storageAbs) {
			return nil, nil, fmt.Errorf("path traversal detected")
		}
		scanPath = absPath
	}

	// Make sure the directory exists before trying to read it
	if _, err := os.Stat(scanPath); os.IsNotExist(err) {
		return nil, nil, fmt.Errorf("directory does not exist: %s", scanPath)
	}

	entries, err := os.ReadDir(scanPath)
	if err != nil {
		return nil, nil, err
	}

	var files []FileEntry
	var folders []FolderEntry

	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue // Skip entries that can't be accessed
		}

		// Create relative path from storage root
		joinedPath := filepath.Join(scanPath, entry.Name())
		relPath, err := filepath.Rel(storageAbs, joinedPath)
		if err != nil {
			continue
		}
		// Convert Windows path separators to forward slashes for consistency
		relPath = filepath.ToSlash(relPath)

		if entry.IsDir() {
			folders = append(folders, FolderEntry{
				Name:      entry.Name(),
				Path:      relPath,
				CreatedAt: info.ModTime(),
				Size:      0, // Folders don't have a meaningful size
			})
		} else {
			mimeType := s.GetMimeType(entry.Name())
			files = append(files, FileEntry{
				Name:      entry.Name(),
				Path:      relPath,
				Size:      info.Size(),
				MimeType:  mimeType,
				Extension: filepath.Ext(entry.Name()),
				CreatedAt: info.ModTime(),
				Icon:      s.GetFileIcon(mimeType),
				FormattedSize: s.FormatFileSize(info.Size()),
			})
		}
	}

	return files, folders, nil
}

// FileEntry represents a file in the file system
type FileEntry struct {
	Name          string    `json:"name"`
	Path          string    `json:"path"`
	Size          int64     `json:"size"`
	MimeType      string    `json:"mimeType"`
	Extension     string    `json:"extension"`
	CreatedAt     time.Time `json:"createdAt"`
	Icon          string    `json:"icon"`
	FormattedSize string    `json:"formattedSize"`
}

// FolderEntry represents a folder in the file system
type FolderEntry struct {
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	CreatedAt time.Time `json:"createdAt"`
	Size      int64     `json:"size"`
}
