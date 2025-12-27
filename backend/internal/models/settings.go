package models

import (
	"database/sql"
)

type Settings struct {
	SiteName        string `json:"siteName"`
	SiteDescription string `json:"siteDescription"`
	MaintenanceMode bool   `json:"maintenanceMode"`
	AllowNewUploads bool   `json:"allowNewUploads"`
	FeaturedVideoID string `json:"featuredVideoId"`
}

type SettingsRepository struct {
	db *sql.DB
}

func NewSettingsRepository(db *sql.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) GetAll() (*Settings, error) {
	rows, err := r.db.Query("SELECT key, value FROM settings")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settings := &Settings{}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}

		switch key {
		case "site_name":
			settings.SiteName = value
		case "site_description":
			settings.SiteDescription = value
		case "maintenance_mode":
			settings.MaintenanceMode = value == "true"
		case "allow_new_uploads":
			settings.AllowNewUploads = value == "true"
		case "featured_video_id":
			settings.FeaturedVideoID = value
		}
	}

	return settings, nil
}

func (r *SettingsRepository) Update(settings *Settings) error {
	updates := map[string]string{
		"site_name":        settings.SiteName,
		"site_description": settings.SiteDescription,
		"maintenance_mode": boolToString(settings.MaintenanceMode),
		"allow_new_uploads": boolToString(settings.AllowNewUploads),
		"featured_video_id": settings.FeaturedVideoID,
	}

	for key, value := range updates {
		_, err := r.db.Exec(
			"INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
			key, value,
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func boolToString(b bool) string {
	if b {
		return "true"
	}
	return "false"
}
