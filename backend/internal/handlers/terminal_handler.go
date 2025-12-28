package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
	"titan-backend/internal/services"
)

type TerminalHandler struct {
	upgrader    websocket.Upgrader
	authService *services.AuthService
}

func NewTerminalHandler(authService *services.AuthService) *TerminalHandler {
	return &TerminalHandler{
		authService: authService,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// Only allow requests from allowed origins
				origin := r.Header.Get("Origin")
				allowedOrigins := []string{
					"http://localhost:3000",
					"http://localhost:3001",
					os.Getenv("FRONTEND_URL"),
				}
				for _, allowed := range allowedOrigins {
					if allowed != "" && origin == allowed {
						return true
					}
				}
				// Allow same-origin requests (no Origin header)
				return origin == ""
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
	}
}

// TerminalMessage represents messages between client and server
type TerminalMessage struct {
	Type string `json:"type"` // "input", "resize", "ping"
	Data string `json:"data,omitempty"`
	Cols int    `json:"cols,omitempty"`
	Rows int    `json:"rows,omitempty"`
}

// HandleTerminal handles WebSocket connections for the interactive terminal
// SECURITY: Requires admin authentication via token query parameter
func (h *TerminalHandler) HandleTerminal(w http.ResponseWriter, r *http.Request) {
	// Authenticate user before allowing terminal access
	token := r.URL.Query().Get("token")
	if token == "" {
		// Try Authorization header as fallback
		authHeader := r.Header.Get("Authorization")
		token = strings.TrimPrefix(authHeader, "Bearer ")
	}

	if token == "" {
		http.Error(w, "Unauthorized: Missing authentication token", http.StatusUnauthorized)
		log.Printf("[Terminal] SECURITY: Blocked unauthenticated terminal access attempt from %s", r.RemoteAddr)
		return
	}

	// Validate token and check admin role
	claims, err := h.authService.ValidateToken(token)
	if err != nil {
		http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
		log.Printf("[Terminal] SECURITY: Blocked terminal access with invalid token from %s", r.RemoteAddr)
		return
	}

	// Only allow admin users to access terminal
	if claims.Role != "admin" {
		http.Error(w, "Forbidden: Admin access required", http.StatusForbidden)
		log.Printf("[Terminal] SECURITY: Blocked non-admin user '%s' from accessing terminal", claims.Username)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[Terminal] WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("[Terminal] New terminal connection established for admin user: %s (UserID: %d)", claims.Username, claims.UserID)

	// Determine shell to use
	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/bash"
		if _, err := os.Stat(shell); os.IsNotExist(err) {
			shell = "/bin/sh"
		}
	}

	// Start the shell with PTY
	cmd := exec.Command(shell)
	cmd.Env = append(os.Environ(),
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
	)

	ptmx, err := pty.Start(cmd)
	if err != nil {
		log.Printf("[Terminal] Failed to start PTY: %v", err)
		conn.WriteJSON(map[string]string{
			"type":  "error",
			"error": "Failed to start terminal: " + err.Error(),
		})
		return
	}
	defer func() {
		ptmx.Close()
		cmd.Process.Kill()
		cmd.Wait()
	}()

	// Set initial size
	pty.Setsize(ptmx, &pty.Winsize{
		Rows: 24,
		Cols: 80,
	})

	var wg sync.WaitGroup
	done := make(chan struct{})

	// Read from PTY and send to WebSocket
	wg.Add(1)
	go func() {
		defer wg.Done()
		buf := make([]byte, 4096)
		for {
			select {
			case <-done:
				return
			default:
				n, err := ptmx.Read(buf)
				if err != nil {
					log.Printf("[Terminal] PTY read error: %v", err)
					return
				}
				if n > 0 {
					err = conn.WriteMessage(websocket.TextMessage, buf[:n])
					if err != nil {
						log.Printf("[Terminal] WebSocket write error: %v", err)
						return
					}
				}
			}
		}
	}()

	// Read from WebSocket and write to PTY
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer close(done)
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("[Terminal] WebSocket read error: %v", err)
				}
				return
			}

			// Try to parse as JSON message
			var msg TerminalMessage
			if err := json.Unmarshal(message, &msg); err == nil {
				switch msg.Type {
				case "input":
					_, err = ptmx.Write([]byte(msg.Data))
					if err != nil {
						log.Printf("[Terminal] PTY write error: %v", err)
						return
					}
				case "resize":
					if msg.Cols > 0 && msg.Rows > 0 {
						pty.Setsize(ptmx, &pty.Winsize{
							Rows: uint16(msg.Rows),
							Cols: uint16(msg.Cols),
						})
					}
				case "ping":
					conn.WriteJSON(map[string]string{"type": "pong"})
				}
			} else {
				// Raw input (backward compatibility)
				_, err = ptmx.Write(message)
				if err != nil {
					log.Printf("[Terminal] PTY write error: %v", err)
					return
				}
			}
		}
	}()

	// Ping to keep connection alive
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()

	wg.Wait()
	log.Println("[Terminal] Terminal connection closed")
}
