package database

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func InitDB(databasePath string) (*sql.DB, error) {
	// SQLite connection string with optimized settings
	connStr := databasePath + "?_foreign_keys=on&_journal_mode=WAL&_synchronous=NORMAL&_cache_size=2000&_temp_store=MEMORY"

	db, err := sql.Open("sqlite3", connStr)
	if err != nil {
		return nil, err
	}

	// Configure connection pool for optimal performance
	// SQLite can handle multiple readers but only one writer
	// These settings balance read performance with write safety
	db.SetMaxOpenConns(25)                 // Maximum number of open connections (SQLite limit)
	db.SetMaxIdleConns(5)                  // Keep 5 connections ready in pool
	db.SetConnMaxLifetime(30 * time.Minute) // Recycle connections after 30 minutes
	db.SetConnMaxIdleTime(5 * time.Minute)  // Close idle connections after 5 minutes

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	// SQLite performance optimizations
	pragmas := []string{
		"PRAGMA journal_mode=WAL",           // Write-Ahead Logging for better concurrency
		"PRAGMA synchronous=NORMAL",         // Balance between safety and performance
		"PRAGMA cache_size=2000",            // Increase cache size (2000 pages ~8MB)
		"PRAGMA temp_store=MEMORY",          // Store temp tables in memory
		"PRAGMA mmap_size=268435456",        // Memory-map up to 256MB for faster reads
		"PRAGMA page_size=4096",             // Optimize page size
		"PRAGMA foreign_keys=ON",            // Enforce foreign key constraints
		"PRAGMA busy_timeout=5000",          // Wait up to 5 seconds on busy database
		"PRAGMA wal_autocheckpoint=1000",    // Checkpoint WAL after 1000 pages
		"PRAGMA optimize",                   // Analyze query planner statistics
	}

	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			log.Printf("Warning: Could not execute %s: %v", pragma, err)
		}
	}

	log.Println("Database connection established successfully")
	log.Printf("Connection pool configured: MaxOpen=%d, MaxIdle=%d, ConnMaxLifetime=%v",
		25, 5, 30*time.Minute)

	return db, nil
}
