package database

import (
	"database/sql"
	"log"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib" // PostgreSQL driver
	_ "github.com/mattn/go-sqlite3"     // SQLite driver
)

// InitDB initializes database connection
// Supports both PostgreSQL (via DATABASE_URL) and SQLite (via databasePath)
// PostgreSQL is preferred for production, SQLite for local development
func InitDB(databaseURL, databasePath string) (*sql.DB, error) {
	var db *sql.DB
	var err error
	var driver string

	// Prefer PostgreSQL if DATABASE_URL is provided
	if databaseURL != "" {
		driver = "pgx"
		log.Println("Using PostgreSQL database")
		db, err = sql.Open(driver, databaseURL)
		if err != nil {
			return nil, err
		}

		// PostgreSQL connection pool settings (optimized for production)
		db.SetMaxOpenConns(50)                 // Higher concurrency for PostgreSQL
		db.SetMaxIdleConns(10)                 // More idle connections
		db.SetConnMaxLifetime(30 * time.Minute) // Recycle connections
		db.SetConnMaxIdleTime(5 * time.Minute)  // Close idle connections

		log.Printf("PostgreSQL connection pool: MaxOpen=%d, MaxIdle=%d", 50, 10)
	} else {
		// Fallback to SQLite for local development
		driver = "sqlite3"
		log.Println("Using SQLite database (local development)")
		connStr := databasePath + "?_foreign_keys=on&_journal_mode=WAL&_synchronous=NORMAL&_cache_size=2000&_temp_store=MEMORY"

		db, err = sql.Open(driver, connStr)
		if err != nil {
			return nil, err
		}

		// SQLite connection pool settings
		db.SetMaxOpenConns(25)                 // SQLite limit
		db.SetMaxIdleConns(5)                  // Keep 5 connections ready
		db.SetConnMaxLifetime(30 * time.Minute)
		db.SetConnMaxIdleTime(5 * time.Minute)

		// SQLite performance optimizations
		pragmas := []string{
			"PRAGMA journal_mode=WAL",
			"PRAGMA synchronous=NORMAL",
			"PRAGMA cache_size=2000",
			"PRAGMA temp_store=MEMORY",
			"PRAGMA mmap_size=268435456",
			"PRAGMA page_size=4096",
			"PRAGMA foreign_keys=ON",
			"PRAGMA busy_timeout=5000",
			"PRAGMA wal_autocheckpoint=1000",
			"PRAGMA optimize",
		}

		for _, pragma := range pragmas {
			if _, err := db.Exec(pragma); err != nil {
				log.Printf("Warning: Could not execute %s: %v", pragma, err)
			}
		}

		log.Printf("SQLite connection pool: MaxOpen=%d, MaxIdle=%d", 25, 5)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	log.Printf("Database connection established successfully (driver: %s)", driver)
	return db, nil
}

// GetDBDriver returns the database driver being used
func GetDBDriver(db *sql.DB) string {
	// Check if database supports PostgreSQL-specific features
	var version string
	err := db.QueryRow("SELECT version()").Scan(&version)
	if err == nil && strings.Contains(strings.ToLower(version), "postgres") {
		return "postgres"
	}
	return "sqlite"
}
