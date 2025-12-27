package database

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func InitDB(databasePath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", databasePath+"?_foreign_keys=on")
	if err != nil {
		return nil, err
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Enable WAL mode for better performance
	_, err = db.Exec("PRAGMA journal_mode=WAL")
	if err != nil {
		log.Printf("Warning: Could not enable WAL mode: %v", err)
	}

	// Enable foreign keys
	_, err = db.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		log.Printf("Warning: Could not enable foreign keys: %v", err)
	}

	log.Println("Database connection established successfully")
	return db, nil
}
