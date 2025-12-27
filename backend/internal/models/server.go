package models

import (
	"database/sql"
	"time"
)

type ServerStatus string

const (
	ServerStatusOnline  ServerStatus = "online"
	ServerStatusOffline ServerStatus = "offline"
	ServerStatusError   ServerStatus = "error"
	ServerStatusStarting ServerStatus = "starting"
	ServerStatusStopping ServerStatus = "stopping"
)

type ServerLog struct {
	ID        int       `json:"id"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	Source    string    `json:"source"`
	Timestamp time.Time `json:"timestamp"`
}

type ServerMetrics struct {
	CPUUsage     float64 `json:"cpuUsage"`
	MemoryUsage  float64 `json:"memoryUsage"`
	MemoryTotal  uint64  `json:"memoryTotal"`
	MemoryUsed   uint64  `json:"memoryUsed"`
	DiskUsage    float64 `json:"diskUsage"`
	DiskTotal    uint64  `json:"diskTotal"`
	DiskUsed     uint64  `json:"diskUsed"`
	Uptime       int64   `json:"uptime"`
	GoRoutines   int     `json:"goRoutines"`
	RequestCount int64   `json:"requestCount"`
	ActiveConns  int     `json:"activeConnections"`
	Timestamp    time.Time `json:"timestamp"`
}

type ServerInfo struct {
	Name        string       `json:"name"`
	Version     string       `json:"version"`
	GoVersion   string       `json:"goVersion"`
	OS          string       `json:"os"`
	Arch        string       `json:"arch"`
	Status      ServerStatus `json:"status"`
	StartedAt   time.Time    `json:"startedAt"`
	Environment string       `json:"environment"`
	Port        string       `json:"port"`
	DatabaseStatus string    `json:"databaseStatus"`
}

type ConsoleCommand struct {
	Command   string    `json:"command"`
	Output    string    `json:"output"`
	Success   bool      `json:"success"`
	Timestamp time.Time `json:"timestamp"`
}

type ServerLogRepository struct {
	db *sql.DB
}

func NewServerLogRepository(db *sql.DB) *ServerLogRepository {
	return &ServerLogRepository{db: db}
}

func (r *ServerLogRepository) Create(log *ServerLog) error {
	result, err := r.db.Exec(
		`INSERT INTO server_logs (level, message, source, timestamp) VALUES (?, ?, ?, ?)`,
		log.Level, log.Message, log.Source, log.Timestamp,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	log.ID = int(id)
	return nil
}

func (r *ServerLogRepository) GetRecent(limit int) ([]ServerLog, error) {
	rows, err := r.db.Query(
		`SELECT id, level, message, source, timestamp FROM server_logs
		 ORDER BY timestamp DESC LIMIT ?`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := []ServerLog{}
	for rows.Next() {
		var log ServerLog
		if err := rows.Scan(&log.ID, &log.Level, &log.Message, &log.Source, &log.Timestamp); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	return logs, nil
}

func (r *ServerLogRepository) GetByLevel(level string, limit int) ([]ServerLog, error) {
	rows, err := r.db.Query(
		`SELECT id, level, message, source, timestamp FROM server_logs
		 WHERE level = ? ORDER BY timestamp DESC LIMIT ?`,
		level, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := []ServerLog{}
	for rows.Next() {
		var log ServerLog
		if err := rows.Scan(&log.ID, &log.Level, &log.Message, &log.Source, &log.Timestamp); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	return logs, nil
}

func (r *ServerLogRepository) ClearOld(daysToKeep int) error {
	_, err := r.db.Exec(
		`DELETE FROM server_logs WHERE timestamp < datetime('now', ? || ' days')`,
		-daysToKeep,
	)
	return err
}

func (r *ServerLogRepository) Search(query string, limit int) ([]ServerLog, error) {
	rows, err := r.db.Query(
		`SELECT id, level, message, source, timestamp FROM server_logs
		 WHERE message LIKE ? ORDER BY timestamp DESC LIMIT ?`,
		"%"+query+"%", limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := []ServerLog{}
	for rows.Next() {
		var log ServerLog
		if err := rows.Scan(&log.ID, &log.Level, &log.Message, &log.Source, &log.Timestamp); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	return logs, nil
}
