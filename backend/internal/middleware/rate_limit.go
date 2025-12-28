package middleware

import (
	"log"
	"net/http"
	"sync"
	"time"

	"titan-backend/internal/models"
)

// RateLimiter implements a simple token bucket rate limiter
type RateLimiter struct {
	visitors map[string]*Visitor
	mu       sync.RWMutex
	rate     int           // requests per window
	window   time.Duration // time window
}

// Visitor represents a client's rate limit state
type Visitor struct {
	tokens     int
	lastSeen   time.Time
	mu         sync.Mutex
}

// NewRateLimiter creates a new rate limiter
// rate: maximum requests allowed per window
// window: time duration for the rate limit window
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*Visitor),
		rate:     rate,
		window:   window,
	}

	// Cleanup stale visitors every 5 minutes
	go rl.cleanupStaleVisitors()

	return rl
}

// cleanupStaleVisitors removes visitors that haven't been seen in 10 minutes
func (rl *RateLimiter) cleanupStaleVisitors() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		for ip, visitor := range rl.visitors {
			visitor.mu.Lock()
			if time.Since(visitor.lastSeen) > 10*time.Minute {
				delete(rl.visitors, ip)
			}
			visitor.mu.Unlock()
		}
		rl.mu.Unlock()
	}
}

// getVisitor retrieves or creates a visitor for the given IP
func (rl *RateLimiter) getVisitor(ip string) *Visitor {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	visitor, exists := rl.visitors[ip]
	if !exists {
		visitor = &Visitor{
			tokens:   rl.rate,
			lastSeen: time.Now(),
		}
		rl.visitors[ip] = visitor
	}

	return visitor
}

// Allow checks if a request from the given IP should be allowed
func (rl *RateLimiter) Allow(ip string) bool {
	visitor := rl.getVisitor(ip)
	visitor.mu.Lock()
	defer visitor.mu.Unlock()

	// Refill tokens based on time elapsed
	elapsed := time.Since(visitor.lastSeen)
	if elapsed > rl.window {
		visitor.tokens = rl.rate
	} else {
		// Linear refill based on elapsed time
		tokensToAdd := int(float64(rl.rate) * (elapsed.Seconds() / rl.window.Seconds()))
		visitor.tokens = min(visitor.tokens+tokensToAdd, rl.rate)
	}

	visitor.lastSeen = time.Now()

	// Check if request is allowed
	if visitor.tokens > 0 {
		visitor.tokens--
		return true
	}

	return false
}

// RateLimitMiddleware creates a middleware that limits requests per IP
func RateLimitMiddleware(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := getIPAddress(r)

			if !limiter.Allow(ip) {
				log.Printf("[RateLimit] SECURITY: Rate limit exceeded for IP: %s on %s %s", ip, r.Method, r.URL.Path)
				models.RespondError(w, "Rate limit exceeded. Please try again later.", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// getIPAddress extracts the real IP address from the request
func getIPAddress(r *http.Request) string {
	// Check X-Forwarded-For header (if behind proxy)
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		return forwarded
	}

	// Check X-Real-IP header
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fall back to RemoteAddr
	return r.RemoteAddr
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
