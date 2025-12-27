package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

type StorageService struct {
	videoPath     string
	thumbnailPath string
	adPath        string
}

func NewStorageService(videoPath, thumbnailPath, adPath string) *StorageService {
	// Ensure directories exist
	os.MkdirAll(videoPath, 0755)
	os.MkdirAll(thumbnailPath, 0755)
	os.MkdirAll(adPath, 0755)

	return &StorageService{
		videoPath:     videoPath,
		thumbnailPath: thumbnailPath,
		adPath:        adPath,
	}
}

func (s *StorageService) SaveVideo(file multipart.File, header *multipart.FileHeader) (string, error) {
	return s.saveFile(file, header, s.videoPath, []string{".mp4", ".webm", ".mov", ".avi"})
}

func (s *StorageService) SaveThumbnail(file multipart.File, header *multipart.FileHeader) (string, error) {
	return s.saveFile(file, header, s.thumbnailPath, []string{".jpg", ".jpeg", ".png", ".gif", ".webp"})
}

func (s *StorageService) SaveAdImage(file multipart.File, header *multipart.FileHeader) (string, error) {
	return s.saveFile(file, header, s.adPath, []string{".jpg", ".jpeg", ".png", ".gif", ".webp"})
}

func (s *StorageService) saveFile(file multipart.File, header *multipart.FileHeader, basePath string, allowedExts []string) (string, error) {
	// Get file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))

	// Validate extension
	valid := false
	for _, allowed := range allowedExts {
		if ext == allowed {
			valid = true
			break
		}
	}
	if !valid {
		return "", fmt.Errorf("invalid file type: %s", ext)
	}

	// Generate unique filename
	filename := uuid.New().String() + ext
	filePath := filepath.Join(basePath, filename)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	// Copy file contents
	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(filePath)
		return "", err
	}

	// Return relative URL path
	return "/" + filePath, nil
}

func (s *StorageService) DeleteFile(filePath string) error {
	// Remove leading slash if present
	if strings.HasPrefix(filePath, "/") {
		filePath = filePath[1:]
	}

	// Only delete if file exists
	if _, err := os.Stat(filePath); err == nil {
		return os.Remove(filePath)
	}
	return nil
}

func (s *StorageService) GetVideoPath() string {
	return s.videoPath
}

func (s *StorageService) GetThumbnailPath() string {
	return s.thumbnailPath
}

func (s *StorageService) GetAdPath() string {
	return s.adPath
}
