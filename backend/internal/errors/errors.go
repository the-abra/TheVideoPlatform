package errors

import (
	"fmt"
	"net/http"
)

// ErrorCode represents a specific error type
type ErrorCode string

const (
	// Client errors
	ErrBadRequest       ErrorCode = "BAD_REQUEST"
	ErrUnauthorized     ErrorCode = "UNAUTHORIZED"
	ErrForbidden        ErrorCode = "FORBIDDEN"
	ErrNotFound         ErrorCode = "NOT_FOUND"
	ErrConflict         ErrorCode = "CONFLICT"
	ErrValidation       ErrorCode = "VALIDATION_ERROR"
	ErrRateLimit        ErrorCode = "RATE_LIMIT_EXCEEDED"

	// Server errors
	ErrInternal         ErrorCode = "INTERNAL_ERROR"
	ErrDatabase         ErrorCode = "DATABASE_ERROR"
	ErrFileSystem       ErrorCode = "FILESYSTEM_ERROR"
	ErrExternal         ErrorCode = "EXTERNAL_SERVICE_ERROR"

	// Business logic errors
	ErrFileNotFound     ErrorCode = "FILE_NOT_FOUND"
	ErrFolderNotFound   ErrorCode = "FOLDER_NOT_FOUND"
	ErrShareExpired     ErrorCode = "SHARE_EXPIRED"
	ErrShareLimitReached ErrorCode = "SHARE_LIMIT_REACHED"
	ErrInvalidFilename  ErrorCode = "INVALID_FILENAME"
	ErrFileTooLarge     ErrorCode = "FILE_TOO_LARGE"
)

// AppError represents a structured application error
type AppError struct {
	Code       ErrorCode              `json:"code"`
	Message    string                 `json:"message"`
	HTTPStatus int                    `json:"-"`
	Details    map[string]interface{} `json:"details,omitempty"`
	Err        error                  `json:"-"` // Wrapped error for internal use
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (caused by: %v)", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Unwrap implements the errors.Unwrap interface
func (e *AppError) Unwrap() error {
	return e.Err
}

// WithDetails adds additional details to the error
func (e *AppError) WithDetails(key string, value interface{}) *AppError {
	if e.Details == nil {
		e.Details = make(map[string]interface{})
	}
	e.Details[key] = value
	return e
}

// New creates a new AppError
func New(code ErrorCode, message string, httpStatus int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: httpStatus,
		Details:    make(map[string]interface{}),
	}
}

// Wrap wraps an existing error with AppError context
func Wrap(err error, code ErrorCode, message string, httpStatus int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: httpStatus,
		Details:    make(map[string]interface{}),
		Err:        err,
	}
}

// Common error constructors

// BadRequest creates a bad request error
func BadRequest(message string) *AppError {
	return New(ErrBadRequest, message, http.StatusBadRequest)
}

// Unauthorized creates an unauthorized error
func Unauthorized(message string) *AppError {
	return New(ErrUnauthorized, message, http.StatusUnauthorized)
}

// Forbidden creates a forbidden error
func Forbidden(message string) *AppError {
	return New(ErrForbidden, message, http.StatusForbidden)
}

// NotFound creates a not found error
func NotFound(message string) *AppError {
	return New(ErrNotFound, message, http.StatusNotFound)
}

// Conflict creates a conflict error
func Conflict(message string) *AppError {
	return New(ErrConflict, message, http.StatusConflict)
}

// Validation creates a validation error
func Validation(message string) *AppError {
	return New(ErrValidation, message, http.StatusBadRequest)
}

// RateLimit creates a rate limit error
func RateLimit(message string) *AppError {
	return New(ErrRateLimit, message, http.StatusTooManyRequests)
}

// Internal creates an internal server error
func Internal(message string, err error) *AppError {
	return Wrap(err, ErrInternal, message, http.StatusInternalServerError)
}

// Database creates a database error
func Database(message string, err error) *AppError {
	return Wrap(err, ErrDatabase, message, http.StatusInternalServerError)
}

// FileSystem creates a filesystem error
func FileSystem(message string, err error) *AppError {
	return Wrap(err, ErrFileSystem, message, http.StatusInternalServerError)
}

// External creates an external service error
func External(message string, err error) *AppError {
	return Wrap(err, ErrExternal, message, http.StatusBadGateway)
}

// FileNotFoundError creates a file not found error
func FileNotFoundError(filename string) *AppError {
	return New(ErrFileNotFound, "File not found", http.StatusNotFound).
		WithDetails("filename", filename)
}

// FolderNotFoundError creates a folder not found error
func FolderNotFoundError(path string) *AppError {
	return New(ErrFolderNotFound, "Folder not found", http.StatusNotFound).
		WithDetails("path", path)
}

// ShareExpiredError creates a share expired error
func ShareExpiredError(token string) *AppError {
	return New(ErrShareExpired, "Share link has expired", http.StatusGone).
		WithDetails("token", token)
}

// ShareLimitReachedError creates a share limit reached error
func ShareLimitReachedError(token string, limit int) *AppError {
	return New(ErrShareLimitReached, "Download limit reached", http.StatusForbidden).
		WithDetails("token", token).
		WithDetails("limit", limit)
}

// InvalidFilenameError creates an invalid filename error
func InvalidFilenameError(filename string, reason string) *AppError {
	return New(ErrInvalidFilename, "Invalid filename", http.StatusBadRequest).
		WithDetails("filename", filename).
		WithDetails("reason", reason)
}

// FileTooLargeError creates a file too large error
func FileTooLargeError(size int64, maxSize int64) *AppError {
	return New(ErrFileTooLarge, "File size exceeds maximum allowed", http.StatusRequestEntityTooLarge).
		WithDetails("size", size).
		WithDetails("maxSize", maxSize)
}

// GetHTTPStatus returns the HTTP status code for an error
// If the error is not an AppError, returns 500
func GetHTTPStatus(err error) int {
	if appErr, ok := err.(*AppError); ok {
		return appErr.HTTPStatus
	}
	return http.StatusInternalServerError
}
