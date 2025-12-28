package utils

import (
	"net/url"
	"strings"
)

// NormalizeStorageURL ensures URLs are stored as relative paths only
// This makes them portable across different environments (localhost, IPs, domains)
func NormalizeStorageURL(rawURL string) string {
	if rawURL == "" {
		return ""
	}

	// If it's already a relative path, return as-is
	if strings.HasPrefix(rawURL, "/") {
		return rawURL
	}

	// Parse the URL
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		// If parsing fails, assume it's a relative path
		return rawURL
	}

	// Extract just the path component
	// This handles: http://localhost:5000/storage/videos/video.mp4 -> /storage/videos/video.mp4
	return parsedURL.Path
}

// NormalizeShareURL ensures share URLs are stored as relative paths
func NormalizeShareURL(rawURL string) string {
	if rawURL == "" {
		return ""
	}

	// Already relative
	if strings.HasPrefix(rawURL, "/share/") {
		return rawURL
	}

	// Extract share token from full URL
	if strings.Contains(rawURL, "/share/") {
		idx := strings.Index(rawURL, "/share/")
		return rawURL[idx:]
	}

	return rawURL
}

// IsRelativePath checks if a URL is already a relative path
func IsRelativePath(path string) bool {
	return strings.HasPrefix(path, "/")
}
