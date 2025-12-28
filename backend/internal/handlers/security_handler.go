package handlers

import (
	"encoding/json"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"titan-backend/internal/models"
)

// SecurityHandler handles security-related HTTP requests
type SecurityHandler struct{}

// NewSecurityHandler creates a new security handler
func NewSecurityHandler() *SecurityHandler {
	return &SecurityHandler{}
}

// VPNCheckResponse represents the response from VPN detection APIs
type VPNCheckResponse struct {
	IP      string `json:"ip"`
	IsVPN   bool   `json:"isVPN"`
	IsProxy bool   `json:"isProxy"`
	IsTor   bool   `json:"isTor"`
	Country string `json:"country"`
	City    string `json:"city"`
	ISP     string `json:"isp"`
}

// getClientIP extracts the real client IP from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (common for proxies/load balancers)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if ip != "" {
				return ip
			}
		}
	}

	// Check X-Real-IP header
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		return xri
	}

	// Check CF-Connecting-IP (Cloudflare)
	cfIP := r.Header.Get("CF-Connecting-IP")
	if cfIP != "" {
		return cfIP
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// isPrivateIP checks if an IP is private/local
func isPrivateIP(ip string) bool {
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return false
	}

	// Check for loopback
	if parsedIP.IsLoopback() {
		return true
	}

	// Check for private ranges
	privateRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"fc00::/7",
		"fe80::/10",
	}

	for _, cidr := range privateRanges {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			continue
		}
		if network.Contains(parsedIP) {
			return true
		}
	}

	return false
}

// CheckVPN checks if the client is using a VPN or proxy
// GET /api/check-vpn
func (h *SecurityHandler) CheckVPN(w http.ResponseWriter, r *http.Request) {
	clientIP := getClientIP(r)

	// If it's a private/local IP, we can't check for VPN
	if isPrivateIP(clientIP) {
		models.RespondSuccess(w, "", map[string]interface{}{
			"ip":        clientIP,
			"isVPN":     false,
			"isProxy":   false,
			"isTor":     false,
			"isPrivate": true,
			"message":   "Private/local IP detected",
		}, http.StatusOK)
		return
	}

	// Use a free VPN detection API
	// You can replace this with a paid service for better accuracy
	// Options: ip-api.com, ipinfo.io, ipqualityscore.com, etc.

	result := &VPNCheckResponse{
		IP:      clientIP,
		IsVPN:   false,
		IsProxy: false,
		IsTor:   false,
	}

	// Method 1: Use ip-api.com (free, includes proxy detection)
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("http://ip-api.com/json/" + clientIP + "?fields=status,message,country,city,isp,proxy,hosting")
	if err == nil {
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		if err == nil {
			var ipAPIResponse struct {
				Status  string `json:"status"`
				Country string `json:"country"`
				City    string `json:"city"`
				ISP     string `json:"isp"`
				Proxy   bool   `json:"proxy"`
				Hosting bool   `json:"hosting"`
			}
			if json.Unmarshal(body, &ipAPIResponse) == nil && ipAPIResponse.Status == "success" {
				result.Country = ipAPIResponse.Country
				result.City = ipAPIResponse.City
				result.ISP = ipAPIResponse.ISP
				result.IsProxy = ipAPIResponse.Proxy
				// Hosting providers often indicate VPN/datacenter IPs
				result.IsVPN = ipAPIResponse.Hosting
			}
		}
	}

	// Additional heuristics for VPN detection
	// Check for common VPN provider keywords in ISP name
	vpnKeywords := []string{
		"vpn", "proxy", "tor", "exit", "relay",
		"nordvpn", "expressvpn", "surfshark", "cyberghost",
		"private internet access", "pia", "mullvad",
		"windscribe", "protonvpn", "hide.me", "ipvanish",
		"tunnelbear", "hotspot shield", "zenmate",
		"datacenter", "hosting", "cloud", "vps", "dedicated",
		"amazon", "aws", "digitalocean", "linode", "vultr",
		"google cloud", "azure", "oracle cloud",
	}

	ispLower := strings.ToLower(result.ISP)
	for _, keyword := range vpnKeywords {
		if strings.Contains(ispLower, keyword) {
			result.IsVPN = true
			break
		}
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"ip":      result.IP,
		"isVPN":   result.IsVPN,
		"isProxy": result.IsProxy,
		"isTor":   result.IsTor,
		"country": result.Country,
		"city":    result.City,
		"isp":     result.ISP,
	}, http.StatusOK)
}
