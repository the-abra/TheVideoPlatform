package handlers

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"titan-backend/internal/models"
	"titan-backend/internal/services"
)

// MockFileService is a mock implementation of FileService for testing
type MockFileService struct {
	mock.Mock
}

func (m *MockFileService) SaveFileToPath(file multipart.File, header *multipart.FileHeader, folderPath string) (string, string, error) {
	args := m.Called(file, header, folderPath)
	return args.String(0), args.String(1), args.Error(2)
}

func (m *MockFileService) GetStoragePath() string {
	args := m.Called()
	return args.String(0)
}

func (m *MockFileService) FileExists(filename string) bool {
	args := m.Called(filename)
	return args.Bool(0)
}

func (m *MockFileService) GetFilePath(filename string) string {
	args := m.Called(filename)
	return args.String(0)
}

func (m *MockFileService) GetMimeType(filename string) string {
	args := m.Called(filename)
	return args.String(0)
}

func (m *MockFileService) GetFileIcon(mimeType string) string {
	args := m.Called(mimeType)
	return args.String(0)
}

func (m *MockFileService) FormatFileSize(size int64) string {
	args := m.Called(size)
	return args.String(0)
}

func (m *MockFileService) DeleteFile(filename string) error {
	args := m.Called(filename)
	return args.Error(0)
}

func (m *MockFileService) ScanDirectory(folderPath string) ([]services.FileEntry, []services.FolderEntry, error) {
	args := m.Called(folderPath)
	return args.Get(0).([]services.FileEntry), args.Get(1).([]services.FolderEntry), args.Error(2)
}

// Test helper to create a multipart file upload request
func createMultipartRequest(t *testing.T, filename string, content []byte) *http.Request {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", filename)
	assert.NoError(t, err)

	_, err = part.Write(content)
	assert.NoError(t, err)

	err = writer.Close()
	assert.NoError(t, err)

	req := httptest.NewRequest("POST", "/api/files/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	return req
}

func TestFileOperations_Upload_Success(t *testing.T) {
	// Arrange
	mockFileService := new(MockFileService)
	mockFileRepo := &models.FileRepository{} // We're not testing repo here

	handler := NewFileOperations(mockFileRepo, mockFileService)

	// Set up mock expectations
	mockFileService.On("SaveFileToPath", mock.Anything, mock.Anything, "").
		Return("test.txt", "test.txt", nil)
	mockFileService.On("GetMimeType", "test.txt").Return("text/plain")
	mockFileService.On("GetFileIcon", "text/plain").Return("📄")
	mockFileService.On("FormatFileSize", mock.AnythingOfType("int64")).Return("12 B")

	// Create request
	req := createMultipartRequest(t, "test.txt", []byte("test content"))
	w := httptest.NewRecorder()

	// Act
	handler.Upload(w, req)

	// Assert
	assert.Equal(t, http.StatusCreated, w.Code)
	mockFileService.AssertExpectations(t)

	// Verify response contains file info
	assert.Contains(t, w.Body.String(), "test.txt")
	assert.Contains(t, w.Body.String(), "success")
}

func TestFileOperations_Upload_InvalidForm(t *testing.T) {
	// Arrange
	mockFileService := new(MockFileService)
	handler := NewFileOperations(nil, mockFileService)

	// Create invalid request (no multipart form)
	req := httptest.NewRequest("POST", "/api/files/upload", nil)
	w := httptest.NewRecorder()

	// Act
	handler.Upload(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to parse form")
}

func TestFileOperations_List_Success(t *testing.T) {
	// Arrange
	mockFileService := new(MockFileService)
	handler := NewFileOperations(nil, mockFileService)

	// Mock file list
	mockFiles := []services.FileEntry{
		{
			Name:     "video.mp4",
			Path:     "video.mp4",
			Size:     1024000,
			MimeType: "video/mp4",
		},
	}
	mockFolders := []services.FolderEntry{
		{
			Name: "Documents",
			Path: "Documents",
		},
	}

	mockFileService.On("ScanDirectory", ".").Return(mockFiles, mockFolders, nil)

	// Create request
	req := httptest.NewRequest("GET", "/api/files", nil)
	w := httptest.NewRecorder()

	// Act
	handler.List(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	mockFileService.AssertExpectations(t)
	assert.Contains(t, w.Body.String(), "video.mp4")
	assert.Contains(t, w.Body.String(), "Documents")
}

func TestFileOperations_Delete_Success(t *testing.T) {
	// Arrange
	mockFileService := new(MockFileService)
	handler := NewFileOperations(nil, mockFileService)

	mockFileService.On("FileExists", "test.txt").Return(true)
	mockFileService.On("DeleteFile", "test.txt").Return(nil)

	// Create request
	req := httptest.NewRequest("DELETE", "/api/files/test.txt", nil)
	w := httptest.NewRecorder()

	// Act
	handler.Delete(w, req, "test.txt")

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	mockFileService.AssertExpectations(t)
	assert.Contains(t, w.Body.String(), "deleted successfully")
}

func TestFileOperations_Delete_FileNotFound(t *testing.T) {
	// Arrange
	mockFileService := new(MockFileService)
	handler := NewFileOperations(nil, mockFileService)

	mockFileService.On("FileExists", "nonexistent.txt").Return(false)

	// Create request
	req := httptest.NewRequest("DELETE", "/api/files/nonexistent.txt", nil)
	w := httptest.NewRecorder()

	// Act
	handler.Delete(w, req, "nonexistent.txt")

	// Assert
	assert.Equal(t, http.StatusNotFound, w.Code)
	mockFileService.AssertExpectations(t)
	assert.Contains(t, w.Body.String(), "not found")
}

// Table-driven test for BulkDelete
func TestFileOperations_BulkDelete(t *testing.T) {
	tests := []struct {
		name           string
		fileNames      []string
		existingFiles  []string
		expectedDeleted int
		expectedFailed  int
	}{
		{
			name:           "Delete all existing files",
			fileNames:      []string{"file1.txt", "file2.txt", "file3.txt"},
			existingFiles:  []string{"file1.txt", "file2.txt", "file3.txt"},
			expectedDeleted: 3,
			expectedFailed:  0,
		},
		{
			name:           "Some files don't exist",
			fileNames:      []string{"file1.txt", "file2.txt", "nonexistent.txt"},
			existingFiles:  []string{"file1.txt", "file2.txt"},
			expectedDeleted: 2,
			expectedFailed:  0,
		},
		{
			name:           "Empty file list",
			fileNames:      []string{},
			existingFiles:  []string{},
			expectedDeleted: 0,
			expectedFailed:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			mockFileService := new(MockFileService)
			handler := NewFileOperations(nil, mockFileService)

			// Set up mocks
			for _, filename := range tt.fileNames {
				exists := contains(tt.existingFiles, filename)
				mockFileService.On("FileExists", filename).Return(exists)
				if exists {
					mockFileService.On("DeleteFile", filename).Return(nil)
				}
			}

			// Create request
			body := bytes.NewBufferString(`{"fileNames":["` + joinStrings(tt.fileNames, `","`) + `"]}`)
			req := httptest.NewRequest("DELETE", "/api/files/bulk", body)
			w := httptest.NewRecorder()

			// Act
			handler.BulkDelete(w, req)

			// Assert
			assert.Equal(t, http.StatusOK, w.Code)
			mockFileService.AssertExpectations(t)
		})
	}
}

// Helper functions
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func joinStrings(slice []string, sep string) string {
	if len(slice) == 0 {
		return ""
	}
	result := slice[0]
	for i := 1; i < len(slice); i++ {
		result += sep + slice[i]
	}
	return result
}

// Integration test (requires actual file system)
func TestFileOperations_Integration_UploadAndDelete(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Arrange
	tempDir := t.TempDir() // Automatically cleaned up
	fileService := services.NewFileService(tempDir)
	handler := NewFileOperations(nil, fileService)

	// Create upload request
	testContent := []byte("integration test content")
	req := createMultipartRequest(t, "test.txt", testContent)
	w := httptest.NewRecorder()

	// Act - Upload
	handler.Upload(w, req)

	// Assert - Upload successful
	assert.Equal(t, http.StatusCreated, w.Code)

	// Verify file exists on disk
	uploadedPath := filepath.Join(tempDir, "test.txt")
	assert.FileExists(t, uploadedPath)

	// Read and verify content
	content, err := os.ReadFile(uploadedPath)
	assert.NoError(t, err)
	assert.Equal(t, testContent, content)

	// Act - Delete
	reqDelete := httptest.NewRequest("DELETE", "/api/files/test.txt", nil)
	wDelete := httptest.NewRecorder()
	handler.Delete(wDelete, reqDelete, "test.txt")

	// Assert - Delete successful
	assert.Equal(t, http.StatusOK, wDelete.Code)
	assert.NoFileExists(t, uploadedPath)
}
