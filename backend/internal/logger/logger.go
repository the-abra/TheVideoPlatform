package logger

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"runtime"
	"strings"
	"time"
)

// LogLevel represents the severity of a log message
type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
	FATAL
)

// String returns the string representation of the log level
func (l LogLevel) String() string {
	switch l {
	case DEBUG:
		return "DEBUG"
	case INFO:
		return "INFO"
	case WARN:
		return "WARN"
	case ERROR:
		return "ERROR"
	case FATAL:
		return "FATAL"
	default:
		return "UNKNOWN"
	}
}

// Logger provides structured logging capabilities
type Logger struct {
	component string
	level     LogLevel
	output    io.Writer
	useJSON   bool
}

// LogEntry represents a structured log entry
type LogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Component string                 `json:"component"`
	Message   string                 `json:"message"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
	File      string                 `json:"file,omitempty"`
	Line      int                    `json:"line,omitempty"`
}

var (
	// Default logger instance
	defaultLogger *Logger
	// Global log level
	globalLevel LogLevel = INFO
)

// Init initializes the default logger
func Init(component string, useJSON bool) {
	defaultLogger = New(component, useJSON)
}

// New creates a new logger instance
func New(component string, useJSON bool) *Logger {
	return &Logger{
		component: component,
		level:     globalLevel,
		output:    os.Stdout,
		useJSON:   useJSON,
	}
}

// SetGlobalLevel sets the global log level
func SetGlobalLevel(level LogLevel) {
	globalLevel = level
	if defaultLogger != nil {
		defaultLogger.level = level
	}
}

// SetLevel sets the log level for this logger instance
func (l *Logger) SetLevel(level LogLevel) {
	l.level = level
}

// WithComponent creates a new logger with a different component name
func (l *Logger) WithComponent(component string) *Logger {
	return &Logger{
		component: component,
		level:     l.level,
		output:    l.output,
		useJSON:   l.useJSON,
	}
}

// log is the internal logging method
func (l *Logger) log(level LogLevel, message string, fields map[string]interface{}) {
	// Check if this log level should be output
	if level < l.level {
		return
	}

	entry := LogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Level:     level.String(),
		Component: l.component,
		Message:   message,
		Fields:    fields,
	}

	// Add file and line information for ERROR and FATAL levels
	if level >= ERROR {
		_, file, line, ok := runtime.Caller(2)
		if ok {
			// Get just the filename, not the full path
			parts := strings.Split(file, "/")
			entry.File = parts[len(parts)-1]
			entry.Line = line
		}
	}

	var output string
	if l.useJSON {
		// JSON output for production
		data, err := json.Marshal(entry)
		if err != nil {
			log.Printf("Failed to marshal log entry: %v", err)
			return
		}
		output = string(data)
	} else {
		// Human-readable output for development
		output = l.formatPretty(entry)
	}

	fmt.Fprintln(l.output, output)

	// Exit on FATAL
	if level == FATAL {
		os.Exit(1)
	}
}

// formatPretty formats a log entry in a human-readable format
func (l *Logger) formatPretty(entry LogEntry) string {
	var sb strings.Builder

	// Timestamp
	sb.WriteString(entry.Timestamp)
	sb.WriteString(" ")

	// Level with color coding
	levelStr := fmt.Sprintf("[%s]", entry.Level)
	switch entry.Level {
	case "DEBUG":
		levelStr = fmt.Sprintf("\033[36m%s\033[0m", levelStr) // Cyan
	case "INFO":
		levelStr = fmt.Sprintf("\033[32m%s\033[0m", levelStr) // Green
	case "WARN":
		levelStr = fmt.Sprintf("\033[33m%s\033[0m", levelStr) // Yellow
	case "ERROR", "FATAL":
		levelStr = fmt.Sprintf("\033[31m%s\033[0m", levelStr) // Red
	}
	sb.WriteString(levelStr)
	sb.WriteString(" ")

	// Component
	sb.WriteString(fmt.Sprintf("[%s]", entry.Component))
	sb.WriteString(" ")

	// Message
	sb.WriteString(entry.Message)

	// Fields
	if len(entry.Fields) > 0 {
		sb.WriteString(" | ")
		first := true
		for k, v := range entry.Fields {
			if !first {
				sb.WriteString(", ")
			}
			sb.WriteString(fmt.Sprintf("%s=%v", k, v))
			first = false
		}
	}

	// File and line for errors
	if entry.File != "" {
		sb.WriteString(fmt.Sprintf(" (%s:%d)", entry.File, entry.Line))
	}

	return sb.String()
}

// Debug logs a debug message
func (l *Logger) Debug(message string, fields ...map[string]interface{}) {
	f := make(map[string]interface{})
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(DEBUG, message, f)
}

// Info logs an info message
func (l *Logger) Info(message string, fields ...map[string]interface{}) {
	f := make(map[string]interface{})
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(INFO, message, f)
}

// Warn logs a warning message
func (l *Logger) Warn(message string, fields ...map[string]interface{}) {
	f := make(map[string]interface{})
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(WARN, message, f)
}

// Error logs an error message
func (l *Logger) Error(message string, fields ...map[string]interface{}) {
	f := make(map[string]interface{})
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(ERROR, message, f)
}

// Fatal logs a fatal message and exits the program
func (l *Logger) Fatal(message string, fields ...map[string]interface{}) {
	f := make(map[string]interface{})
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(FATAL, message, f)
}

// Package-level convenience functions using the default logger

// Debug logs a debug message using the default logger
func Debug(message string, fields ...map[string]interface{}) {
	if defaultLogger == nil {
		Init("app", false)
	}
	defaultLogger.Debug(message, fields...)
}

// Info logs an info message using the default logger
func Info(message string, fields ...map[string]interface{}) {
	if defaultLogger == nil {
		Init("app", false)
	}
	defaultLogger.Info(message, fields...)
}

// Warn logs a warning message using the default logger
func Warn(message string, fields ...map[string]interface{}) {
	if defaultLogger == nil {
		Init("app", false)
	}
	defaultLogger.Warn(message, fields...)
}

// Error logs an error message using the default logger
func Error(message string, fields ...map[string]interface{}) {
	if defaultLogger == nil {
		Init("app", false)
	}
	defaultLogger.Error(message, fields...)
}

// Fatal logs a fatal message and exits the program using the default logger
func Fatal(message string, fields ...map[string]interface{}) {
	if defaultLogger == nil {
		Init("app", false)
	}
	defaultLogger.Fatal(message, fields...)
}
