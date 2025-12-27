package database

import (
	"database/sql"
	"log"

	"golang.org/x/crypto/bcrypt"
)

func RunMigrations(db *sql.DB) error {
	// Main migrations that must succeed
	migrations := []string{
		// Videos table
		`CREATE TABLE IF NOT EXISTS videos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			creator TEXT NOT NULL,
			url TEXT NOT NULL,
			thumbnail TEXT,
			views INTEGER DEFAULT 0,
			likes INTEGER DEFAULT 0,
			dislikes INTEGER DEFAULT 0,
			category TEXT DEFAULT 'other',
			duration TEXT,
			description TEXT,
			verified INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category)`,
		`CREATE INDEX IF NOT EXISTS idx_videos_creator ON videos(creator)`,
		`CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views DESC)`,

		// Categories table
		`CREATE TABLE IF NOT EXISTS categories (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			icon TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`,

		// Ads table
		`CREATE TABLE IF NOT EXISTS ads (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			image_url TEXT NOT NULL,
			target_url TEXT NOT NULL,
			placement TEXT NOT NULL CHECK(placement IN ('home-banner', 'home-sidebar', 'video-top', 'video-sidebar')),
			enabled INTEGER DEFAULT 1,
			clicks INTEGER DEFAULT 0,
			impressions INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_ads_placement ON ads(placement, enabled)`,

		// Users table
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT DEFAULT 'admin',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			last_login DATETIME
		)`,

		// Settings table
		`CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// View logs table
		`CREATE TABLE IF NOT EXISTS view_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			video_id INTEGER NOT NULL,
			ip_address TEXT NOT NULL,
			user_agent TEXT,
			viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_view_logs_video ON view_logs(video_id)`,
		`CREATE INDEX IF NOT EXISTS idx_view_logs_ip ON view_logs(ip_address, video_id, viewed_at)`,

		// Server logs table
		`CREATE TABLE IF NOT EXISTS server_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			level TEXT NOT NULL,
			message TEXT NOT NULL,
			source TEXT,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_server_logs_level ON server_logs(level)`,
		`CREATE INDEX IF NOT EXISTS idx_server_logs_timestamp ON server_logs(timestamp DESC)`,

		// Folders table (for file storage)
		`CREATE TABLE IF NOT EXISTS folders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			parent_id INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)`,

		// Files table (for file storage/drive)
		`CREATE TABLE IF NOT EXISTS files (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			original_name TEXT NOT NULL,
			path TEXT NOT NULL,
			size INTEGER NOT NULL,
			mime_type TEXT NOT NULL,
			extension TEXT,
			folder_id INTEGER,
			share_token TEXT,
			share_expiry DATETIME,
			is_public INTEGER DEFAULT 0,
			downloads INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id)`,
		`CREATE INDEX IF NOT EXISTS idx_files_share_token ON files(share_token)`,
		`CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at DESC)`,
	}

	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return err
		}
	}

	// Optional migrations - these may fail if columns already exist
	// SQLite doesn't support IF NOT EXISTS for ALTER TABLE
	optionalMigrations := []string{
		`ALTER TABLE ads ADD COLUMN clicks INTEGER DEFAULT 0`,
		`ALTER TABLE ads ADD COLUMN impressions INTEGER DEFAULT 0`,
	}

	for _, migration := range optionalMigrations {
		// Ignore errors (columns might already exist)
		db.Exec(migration)
	}

	log.Println("Database migrations completed successfully")
	return nil
}

func SeedDefaultData(db *sql.DB, adminUsername, adminPassword string) error {
	// Check if admin user exists
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users WHERE username = ?", adminUsername).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		// Create admin user
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), 14)
		if err != nil {
			return err
		}

		_, err = db.Exec(
			"INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
			adminUsername, string(hashedPassword), "admin",
		)
		if err != nil {
			return err
		}
		log.Printf("Created admin user: %s", adminUsername)
	}

	// Insert default settings
	defaultSettings := map[string]string{
		"site_name":        "MEDIAHUB",
		"site_description": "Your premium streaming platform",
		"maintenance_mode": "false",
		"allow_new_uploads": "true",
		"featured_video_id": "",
	}

	for key, value := range defaultSettings {
		_, err := db.Exec(
			"INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
			key, value,
		)
		if err != nil {
			return err
		}
	}

	// Note: Default categories removed - users should create their own categories via admin panel
	// Only insert the "other" category as a fallback for uncategorized videos
	_, err = db.Exec(
		"INSERT OR IGNORE INTO categories (id, name, icon) VALUES (?, ?, ?)",
		"other", "Other", "folder",
	)
	if err != nil {
		return err
	}

	log.Println("Default data seeded successfully")
	return nil
}
