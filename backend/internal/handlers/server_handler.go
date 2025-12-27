package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"

	"titan-backend/internal/models"
	"titan-backend/internal/services"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

type ServerHandler struct {
	serverService *services.ServerService
	logRepo       *models.ServerLogRepository
}

func NewServerHandler(serverService *services.ServerService, logRepo *models.ServerLogRepository) *ServerHandler {
	return &ServerHandler{
		serverService: serverService,
		logRepo:       logRepo,
	}
}

func (h *ServerHandler) GetInfo(w http.ResponseWriter, r *http.Request) {
	info := h.serverService.GetServerInfo()
	models.RespondSuccess(w, "", map[string]interface{}{
		"server": info,
	}, http.StatusOK)
}

func (h *ServerHandler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := h.serverService.GetMetrics()
	models.RespondSuccess(w, "", map[string]interface{}{
		"metrics": metrics,
	}, http.StatusOK)
}

func (h *ServerHandler) GetLogs(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
			limit = n
		}
	}

	level := r.URL.Query().Get("level")
	var logs []models.ServerLog
	var err error

	if level != "" {
		logs, err = h.logRepo.GetByLevel(level, limit)
	} else {
		logs, err = h.logRepo.GetRecent(limit)
	}

	if err != nil {
		models.RespondError(w, "Failed to fetch logs", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"logs":  logs,
		"count": len(logs),
	}, http.StatusOK)
}

func (h *ServerHandler) SearchLogs(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		models.RespondError(w, "Search query is required", http.StatusBadRequest)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
			limit = n
		}
	}

	logs, err := h.logRepo.Search(query, limit)
	if err != nil {
		models.RespondError(w, "Search failed", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"logs":  logs,
		"query": query,
		"count": len(logs),
	}, http.StatusOK)
}

func (h *ServerHandler) ExecuteCommand(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Command string `json:"command"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Command == "" {
		models.RespondError(w, "Command is required", http.StatusBadRequest)
		return
	}

	result := h.serverService.ExecuteCommand(req.Command)

	models.RespondSuccess(w, "", map[string]interface{}{
		"result": result,
	}, http.StatusOK)
}

func (h *ServerHandler) ClearLogs(w http.ResponseWriter, r *http.Request) {
	daysStr := r.URL.Query().Get("days")
	days := 7
	if daysStr != "" {
		if n, err := strconv.Atoi(daysStr); err == nil && n > 0 {
			days = n
		}
	}

	if err := h.logRepo.ClearOld(days); err != nil {
		models.RespondError(w, "Failed to clear logs", http.StatusInternalServerError)
		return
	}

	h.serverService.Log("info", "Logs cleared (older than "+strconv.Itoa(days)+" days)", "admin")

	models.RespondSuccess(w, "Logs cleared successfully", map[string]interface{}{
		"daysKept": days,
	}, http.StatusOK)
}

// WebSocket handler for real-time log streaming
func (h *ServerHandler) StreamLogs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Subscribe to log updates
	logChan := h.serverService.Subscribe()
	defer h.serverService.Unsubscribe(logChan)

	// Send initial logs
	initialLogs, _ := h.logRepo.GetRecent(50)
	for i := len(initialLogs) - 1; i >= 0; i-- {
		if err := conn.WriteJSON(initialLogs[i]); err != nil {
			return
		}
	}

	// Create done channel for cleanup
	done := make(chan struct{})
	var once sync.Once

	// Handle incoming messages (for ping/pong)
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				once.Do(func() { close(done) })
				return
			}
		}
	}()

	// Stream new logs
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case log, ok := <-logChan:
			if !ok {
				return
			}
			if err := conn.WriteJSON(log); err != nil {
				return
			}
		case <-ticker.C:
			// Send ping to keep connection alive
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case <-done:
			return
		}
	}
}

// WebSocket handler for real-time metrics streaming
func (h *ServerHandler) StreamMetrics(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Create done channel for cleanup
	done := make(chan struct{})
	var once sync.Once

	// Handle incoming messages
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				once.Do(func() { close(done) })
				return
			}
		}
	}()

	// Stream metrics every 2 seconds
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	// Send initial metrics
	if err := conn.WriteJSON(h.serverService.GetMetrics()); err != nil {
		return
	}

	for {
		select {
		case <-ticker.C:
			metrics := h.serverService.GetMetrics()
			if err := conn.WriteJSON(metrics); err != nil {
				return
			}
		case <-done:
			return
		}
	}
}

// RegisterRoutes registers all server management routes
func (h *ServerHandler) RegisterRoutes(r chi.Router) {
	r.Get("/server/info", h.GetInfo)
	r.Get("/server/metrics", h.GetMetrics)
	r.Get("/server/logs", h.GetLogs)
	r.Get("/server/logs/search", h.SearchLogs)
	r.Post("/server/command", h.ExecuteCommand)
	r.Delete("/server/logs", h.ClearLogs)
}

// RegisterWebSocketRoutes registers WebSocket routes (should be called outside auth middleware)
func (h *ServerHandler) RegisterWebSocketRoutes(r chi.Router) {
	r.Get("/ws/logs", h.StreamLogs)
	r.Get("/ws/metrics", h.StreamMetrics)
}
