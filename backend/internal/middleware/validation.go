package middleware

import (
	"log"
	"net/http"
	"regexp"
	"strings"

	"titan-backend/internal/models"
)

var (
	// SQL injection patterns
	sqlInjectionPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|<script)`),
		regexp.MustCompile(`(?i)(--|;|\/\*|\*\/|xp_|sp_)`),
		regexp.MustCompile(`(?i)(\bor\b|\band\b).*?=.*?=`),
	}

	// XSS patterns
	xssPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`),
		regexp.MustCompile(`(?i)javascript:`),
		regexp.MustCompile(`(?i)on\w+\s*=`), // onclick, onload, etc.
		regexp.MustCompile(`(?i)<iframe`),
	}

	// Path traversal patterns
	pathTraversalPatterns = []*regexp.Regexp{
		regexp.MustCompile(`\.\.\/`),
		regexp.MustCompile(`\.\.\\`),
	}
)

// SecurityValidationMiddleware checks for common attack patterns
func SecurityValidationMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check query parameters
			for key, values := range r.URL.Query() {
				for _, value := range values {
					if isSuspicious(value) {
						log.Printf("[Validation] SECURITY: Suspicious input detected in query param '%s': %s from IP: %s",
							key, value, getIPAddress(r))
						models.RespondError(w, "Invalid input detected", http.StatusBadRequest)
						return
					}
				}
			}

			// Check URL path for traversal attempts
			if containsPathTraversal(r.URL.Path) {
				log.Printf("[Validation] SECURITY: Path traversal attempt detected: %s from IP: %s",
					r.URL.Path, getIPAddress(r))
				models.RespondError(w, "Invalid path", http.StatusBadRequest)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// isSuspicious checks if a string contains suspicious patterns
func isSuspicious(input string) bool {
	// Check for SQL injection
	for _, pattern := range sqlInjectionPatterns {
		if pattern.MatchString(input) {
			return true
		}
	}

	// Check for XSS
	for _, pattern := range xssPatterns {
		if pattern.MatchString(input) {
			return true
		}
	}

	return false
}

// containsPathTraversal checks for path traversal patterns
func containsPathTraversal(path string) bool {
	for _, pattern := range pathTraversalPatterns {
		if pattern.MatchString(path) {
			return true
		}
	}
	return false
}

// ValidateUsername checks if username is valid
func ValidateUsername(username string) bool {
	if len(username) < 3 || len(username) > 50 {
		return false
	}

	// Allow alphanumeric, underscore, and hyphen only
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9_-]+$`, username)
	return matched
}

// ValidatePassword checks if password meets minimum requirements
func ValidatePassword(password string) (bool, string) {
	if len(password) < 8 {
		return false, "Password must be at least 8 characters long"
	}

	if len(password) > 128 {
		return false, "Password must not exceed 128 characters"
	}

	// Check for at least one uppercase letter
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	if !hasUpper {
		return false, "Password must contain at least one uppercase letter"
	}

	// Check for at least one lowercase letter
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	if !hasLower {
		return false, "Password must contain at least one lowercase letter"
	}

	// Check for at least one digit
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(password)
	if !hasDigit {
		return false, "Password must contain at least one digit"
	}

	// Check for at least one special character
	hasSpecial := regexp.MustCompile(`[!@#$%^&*(),.?":{}|<>]`).MatchString(password)
	if !hasSpecial {
		return false, "Password must contain at least one special character"
	}

	return true, ""
}

// ValidateEmail checks if email format is valid
func ValidateEmail(email string) bool {
	if len(email) < 5 || len(email) > 254 {
		return false
	}

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// SanitizeString removes potentially dangerous characters
func SanitizeString(input string) string {
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")

	// Trim whitespace
	input = strings.TrimSpace(input)

	return input
}

// ValidateVideoTitle checks if video title is valid
func ValidateVideoTitle(title string) (bool, string) {
	title = SanitizeString(title)

	if len(title) < 1 {
		return false, "Title cannot be empty"
	}

	if len(title) > 200 {
		return false, "Title must not exceed 200 characters"
	}

	// Check for XSS patterns
	if isSuspicious(title) {
		return false, "Title contains invalid characters"
	}

	return true, ""
}

// ValidateCategory checks if category name is valid
func ValidateCategory(category string) bool {
	category = SanitizeString(category)

	if len(category) < 1 || len(category) > 50 {
		return false
	}

	// Allow letters, numbers, spaces, and hyphens
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9 -]+$`, category)
	return matched
}
