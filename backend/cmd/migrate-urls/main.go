package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

// normalizeURL extracts relative path from full URL
func normalizeURL(rawURL string) string {
	if rawURL == "" {
		return ""
	}

	// Already relative
	if strings.HasPrefix(rawURL, "/") {
		return rawURL
	}

	// Parse and extract path
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}

	return parsed.Path
}

func main() {
	dbPath := "./titan.db"

	// Open database
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	log.Println("🔧 Starting URL migration...")

	// Migrate videos table
	log.Println("📹 Migrating videos...")
	rows, err := db.Query("SELECT id, url, thumbnail FROM videos")
	if err != nil {
		log.Fatalf("Failed to query videos: %v", err)
	}

	var videosUpdated int
	for rows.Next() {
		var id int
		var videoURL, thumbnail string

		if err := rows.Scan(&id, &videoURL, &thumbnail); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		normalizedURL := normalizeURL(videoURL)
		normalizedThumbnail := normalizeURL(thumbnail)

		if normalizedURL != videoURL || normalizedThumbnail != thumbnail {
			_, err := db.Exec(
				"UPDATE videos SET url = ?, thumbnail = ? WHERE id = ?",
				normalizedURL, normalizedThumbnail, id,
			)
			if err != nil {
				log.Printf("Failed to update video %d: %v", id, err)
				continue
			}
			videosUpdated++
			log.Printf("  ✓ Updated video %d: %s -> %s", id, videoURL, normalizedURL)
		}
	}
	rows.Close()

	log.Printf("✅ Videos migrated: %d updated", videosUpdated)

	// Migrate ads table
	log.Println("🎯 Migrating ads...")
	rows, err = db.Query("SELECT id, image_url FROM ads")
	if err != nil {
		log.Fatalf("Failed to query ads: %v", err)
	}

	var adsUpdated int
	for rows.Next() {
		var id int
		var imageURL string

		if err := rows.Scan(&id, &imageURL); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		// Handle share URLs specially
		var normalizedURL string
		if strings.Contains(imageURL, "/share/") {
			// Extract /share/{token}/raw
			idx := strings.Index(imageURL, "/share/")
			if idx != -1 {
				normalizedURL = imageURL[idx:]
			} else {
				normalizedURL = normalizeURL(imageURL)
			}
		} else {
			normalizedURL = normalizeURL(imageURL)
		}

		if normalizedURL != imageURL {
			_, err := db.Exec(
				"UPDATE ads SET image_url = ? WHERE id = ?",
				normalizedURL, id,
			)
			if err != nil {
				log.Printf("Failed to update ad %d: %v", id, err)
				continue
			}
			adsUpdated++
			log.Printf("  ✓ Updated ad %d: %s -> %s", id, imageURL, normalizedURL)
		}
	}
	rows.Close()

	log.Printf("✅ Ads migrated: %d updated", adsUpdated)

	// Summary
	fmt.Println("\n" + strings.Repeat("=", 50))
	fmt.Println("🎉 Migration completed successfully!")
	fmt.Printf("   Videos updated: %d\n", videosUpdated)
	fmt.Printf("   Ads updated: %d\n", adsUpdated)
	fmt.Println(strings.Repeat("=", 50))
}
