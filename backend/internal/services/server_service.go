package services

import (
	"database/sql"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"titan-backend/internal/models"
)

type ServerService struct {
	db           *sql.DB
	startedAt    time.Time
	requestCount int64
	activeConns  int
	mu           sync.RWMutex
	logRepo      *models.ServerLogRepository
	subscribers  map[chan models.ServerLog]bool
	subMu        sync.RWMutex
}

func NewServerService(db *sql.DB, logRepo *models.ServerLogRepository) *ServerService {
	return &ServerService{
		db:          db,
		startedAt:   time.Now(),
		logRepo:     logRepo,
		subscribers: make(map[chan models.ServerLog]bool),
	}
}

func (s *ServerService) GetServerInfo() *models.ServerInfo {
	dbStatus := "connected"
	if err := s.db.Ping(); err != nil {
		dbStatus = "disconnected"
	}

	return &models.ServerInfo{
		Name:           "Titan Media Backend",
		Version:        "1.0.0",
		GoVersion:      runtime.Version(),
		OS:             runtime.GOOS,
		Arch:           runtime.GOARCH,
		Status:         models.ServerStatusOnline,
		StartedAt:      s.startedAt,
		Environment:    os.Getenv("ENV"),
		Port:           os.Getenv("PORT"),
		DatabaseStatus: dbStatus,
	}
}

func (s *ServerService) GetMetrics() *models.ServerMetrics {
	s.mu.RLock()
	reqCount := s.requestCount
	activeConns := s.activeConns
	s.mu.RUnlock()

	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	// Get disk usage
	var diskTotal, diskUsed uint64
	var diskUsage float64

	if stat, err := os.Stat("."); err == nil {
		if sys := stat.Sys(); sys != nil {
			if statfs, ok := sys.(*syscall.Stat_t); ok {
				_ = statfs // Linux-specific handling would go here
			}
		}
	}

	// Get disk info using syscall (Linux)
	var stat syscall.Statfs_t
	if err := syscall.Statfs(".", &stat); err == nil {
		diskTotal = stat.Blocks * uint64(stat.Bsize)
		diskUsed = (stat.Blocks - stat.Bfree) * uint64(stat.Bsize)
		if diskTotal > 0 {
			diskUsage = float64(diskUsed) / float64(diskTotal) * 100
		}
	}

	return &models.ServerMetrics{
		CPUUsage:     getCPUUsage(),
		MemoryUsage:  float64(memStats.Alloc) / float64(memStats.Sys) * 100,
		MemoryTotal:  memStats.Sys,
		MemoryUsed:   memStats.Alloc,
		DiskUsage:    diskUsage,
		DiskTotal:    diskTotal,
		DiskUsed:     diskUsed,
		Uptime:       int64(time.Since(s.startedAt).Seconds()),
		GoRoutines:   runtime.NumGoroutine(),
		RequestCount: reqCount,
		ActiveConns:  activeConns,
		Timestamp:    time.Now(),
	}
}

func getCPUUsage() float64 {
	// Simple CPU usage estimation based on goroutines vs CPUs
	numCPU := runtime.NumCPU()
	numGoroutine := runtime.NumGoroutine()
	usage := float64(numGoroutine) / float64(numCPU) * 10
	if usage > 100 {
		usage = 100
	}
	return usage
}

func (s *ServerService) IncrementRequestCount() {
	s.mu.Lock()
	s.requestCount++
	s.mu.Unlock()
}

func (s *ServerService) IncrementActiveConns() {
	s.mu.Lock()
	s.activeConns++
	s.mu.Unlock()
}

func (s *ServerService) DecrementActiveConns() {
	s.mu.Lock()
	if s.activeConns > 0 {
		s.activeConns--
	}
	s.mu.Unlock()
}

func (s *ServerService) Log(level, message, source string) {
	log := &models.ServerLog{
		Level:     level,
		Message:   message,
		Source:    source,
		Timestamp: time.Now(),
	}

	// Save to database
	s.logRepo.Create(log)

	// Broadcast to subscribers
	s.broadcastLog(*log)
}

func (s *ServerService) Subscribe() chan models.ServerLog {
	ch := make(chan models.ServerLog, 100)
	s.subMu.Lock()
	s.subscribers[ch] = true
	s.subMu.Unlock()
	return ch
}

func (s *ServerService) Unsubscribe(ch chan models.ServerLog) {
	s.subMu.Lock()
	delete(s.subscribers, ch)
	close(ch)
	s.subMu.Unlock()
}

func (s *ServerService) broadcastLog(log models.ServerLog) {
	s.subMu.RLock()
	defer s.subMu.RUnlock()

	for ch := range s.subscribers {
		select {
		case ch <- log:
		default:
			// Channel full, skip
		}
	}
}

func (s *ServerService) ExecuteCommand(command string) *models.ConsoleCommand {
	result := &models.ConsoleCommand{
		Command:   command,
		Timestamp: time.Now(),
	}

	// Parse command
	parts := strings.Fields(command)
	if len(parts) == 0 {
		result.Output = "No command provided"
		result.Success = false
		return result
	}

	// Whitelist of allowed commands for security
	allowedCommands := map[string]bool{
		"status":   true,
		"metrics":  true,
		"uptime":   true,
		"version":  true,
		"help":     true,
		"logs":     true,
		"clear":    true,
		"gc":       true,
		"health":   true,
		"info":     true,
		"db":       true,
		"storage":  true,
	}

	cmd := strings.ToLower(parts[0])
	if !allowedCommands[cmd] {
		result.Output = "Unknown or unauthorized command: " + cmd + "\nType 'help' for available commands"
		result.Success = false
		return result
	}

	// Execute command
	switch cmd {
	case "help":
		result.Output = `Available commands:
  status   - Show server status
  metrics  - Show server metrics
  uptime   - Show server uptime
  version  - Show version information
  info     - Show server information
  logs     - Show recent logs (logs [count])
  clear    - Clear old logs (clear logs [days])
  gc       - Run garbage collection
  health   - Check server health
  db       - Database status
  storage  - Storage information
  help     - Show this help message`
		result.Success = true

	case "status":
		info := s.GetServerInfo()
		result.Output = "Server Status: " + string(info.Status) + "\n" +
			"Environment: " + info.Environment + "\n" +
			"Port: " + info.Port + "\n" +
			"Database: " + info.DatabaseStatus
		result.Success = true

	case "metrics":
		m := s.GetMetrics()
		result.Output = "=== Server Metrics ===\n" +
			"CPU Usage: " + formatFloat(m.CPUUsage) + "%\n" +
			"Memory Usage: " + formatFloat(m.MemoryUsage) + "%\n" +
			"Memory Used: " + formatBytes(m.MemoryUsed) + "\n" +
			"Goroutines: " + formatInt(m.GoRoutines) + "\n" +
			"Total Requests: " + formatInt64(m.RequestCount) + "\n" +
			"Active Connections: " + formatInt(m.ActiveConns)
		result.Success = true

	case "uptime":
		uptime := time.Since(s.startedAt)
		result.Output = "Server uptime: " + formatDuration(uptime)
		result.Success = true

	case "version":
		info := s.GetServerInfo()
		result.Output = "Version: " + info.Version + "\n" +
			"Go: " + info.GoVersion + "\n" +
			"OS/Arch: " + info.OS + "/" + info.Arch
		result.Success = true

	case "info":
		info := s.GetServerInfo()
		result.Output = "=== Server Info ===\n" +
			"Name: " + info.Name + "\n" +
			"Version: " + info.Version + "\n" +
			"Go: " + info.GoVersion + "\n" +
			"OS: " + info.OS + "\n" +
			"Arch: " + info.Arch + "\n" +
			"Started: " + info.StartedAt.Format(time.RFC3339)
		result.Success = true

	case "logs":
		limit := 10
		if len(parts) > 1 {
			if n, err := parseInt(parts[1]); err == nil && n > 0 {
				limit = n
			}
		}
		logs, err := s.logRepo.GetRecent(limit)
		if err != nil {
			result.Output = "Error fetching logs: " + err.Error()
			result.Success = false
		} else {
			var sb strings.Builder
			sb.WriteString("=== Recent Logs ===\n")
			for _, log := range logs {
				sb.WriteString("[" + log.Timestamp.Format("15:04:05") + "] ")
				sb.WriteString("[" + log.Level + "] ")
				sb.WriteString(log.Message + "\n")
			}
			result.Output = sb.String()
			result.Success = true
		}

	case "clear":
		if len(parts) > 1 && parts[1] == "logs" {
			days := 7
			if len(parts) > 2 {
				if n, err := parseInt(parts[2]); err == nil && n > 0 {
					days = n
				}
			}
			err := s.logRepo.ClearOld(days)
			if err != nil {
				result.Output = "Error clearing logs: " + err.Error()
				result.Success = false
			} else {
				result.Output = "Cleared logs older than " + formatInt(days) + " days"
				result.Success = true
			}
		} else {
			result.Output = "Usage: clear logs [days]"
			result.Success = false
		}

	case "gc":
		runtime.GC()
		result.Output = "Garbage collection completed"
		result.Success = true

	case "health":
		dbStatus := "OK"
		if err := s.db.Ping(); err != nil {
			dbStatus = "ERROR: " + err.Error()
		}
		result.Output = "=== Health Check ===\n" +
			"Server: OK\n" +
			"Database: " + dbStatus + "\n" +
			"Goroutines: " + formatInt(runtime.NumGoroutine())
		result.Success = true

	case "db":
		var count int
		s.db.QueryRow("SELECT COUNT(*) FROM videos").Scan(&count)
		videoCount := formatInt(count)
		s.db.QueryRow("SELECT COUNT(*) FROM categories").Scan(&count)
		catCount := formatInt(count)
		s.db.QueryRow("SELECT COUNT(*) FROM ads").Scan(&count)
		adCount := formatInt(count)

		result.Output = "=== Database Status ===\n" +
			"Videos: " + videoCount + "\n" +
			"Categories: " + catCount + "\n" +
			"Ads: " + adCount
		result.Success = true

	case "storage":
		videoDir := "./storage/videos"
		thumbDir := "./storage/thumbnails"
		adDir := "./storage/ads"

		result.Output = "=== Storage Info ===\n" +
			"Videos: " + getDirSize(videoDir) + "\n" +
			"Thumbnails: " + getDirSize(thumbDir) + "\n" +
			"Ads: " + getDirSize(adDir)
		result.Success = true

	default:
		result.Output = "Command not implemented: " + cmd
		result.Success = false
	}

	// Log the command execution
	s.Log("info", "Console command executed: "+command, "console")

	return result
}

// Helper functions
func formatFloat(f float64) string {
	return strconv.FormatFloat(f, 'f', 2, 64)
}

func formatBytes(b uint64) string {
	const unit = 1024
	if b < unit {
		return strconv.FormatUint(b, 10) + " B"
	}
	div, exp := uint64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return formatFloat(float64(b)/float64(div)) + " " + string("KMGTPE"[exp]) + "B"
}

func formatDuration(d time.Duration) string {
	days := int(d.Hours() / 24)
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60

	if days > 0 {
		return strconv.Itoa(days) + "d " + strconv.Itoa(hours) + "h " + strconv.Itoa(minutes) + "m"
	}
	if hours > 0 {
		return strconv.Itoa(hours) + "h " + strconv.Itoa(minutes) + "m " + strconv.Itoa(seconds) + "s"
	}
	if minutes > 0 {
		return strconv.Itoa(minutes) + "m " + strconv.Itoa(seconds) + "s"
	}
	return strconv.Itoa(seconds) + "s"
}

func formatInt(n int) string {
	return strconv.Itoa(n)
}

func formatInt64(n int64) string {
	return strconv.FormatInt(n, 10)
}

func parseInt(s string) (int, error) {
	return strconv.Atoi(s)
}

func getDirSize(path string) string {
	var size int64
	entries, err := os.ReadDir(path)
	if err != nil {
		return "N/A"
	}
	for _, entry := range entries {
		if info, err := entry.Info(); err == nil {
			size += info.Size()
		}
	}
	return formatBytes(uint64(size)) + " (" + formatInt(len(entries)) + " files)"
}
