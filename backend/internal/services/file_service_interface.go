package services

import "mime/multipart"

// FileServiceInterface defines the contract for file operations
// This allows for easy mocking in tests
type FileServiceInterface interface {
	SaveFileToPath(file multipart.File, header *multipart.FileHeader, folderPath string) (string, string, error)
	GetStoragePath() string
	FileExists(filename string) bool
	GetFilePath(filename string) string
	GetMimeType(filename string) string
	GetFileIcon(mimeType string) string
	FormatFileSize(size int64) string
	DeleteFile(filename string) error
	ScanDirectory(folderPath string) ([]FileEntry, []FolderEntry, error)
}

// Ensure FileService implements the interface
var _ FileServiceInterface = (*FileService)(nil)
