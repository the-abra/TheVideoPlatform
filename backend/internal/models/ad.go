package models

import (
	"database/sql"
	"time"
)

// Ad placements - defines where ads can appear
const (
	PlacementHomeBanner   = "home-banner"
	PlacementHomeSidebar  = "home-sidebar"
	PlacementVideoTop     = "video-top"
	PlacementVideoSidebar = "video-sidebar"
	PlacementVideoRandom  = "video-random" // Random placement between videos
)

// ValidPlacements is a map of valid ad placement values
var ValidPlacements = map[string]bool{
	PlacementHomeBanner:   true,
	PlacementHomeSidebar:  true,
	PlacementVideoTop:     true,
	PlacementVideoSidebar: true,
	PlacementVideoRandom:  true,
}

// Ad represents an advertisement in the system
type Ad struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	ImageURL   string    `json:"imageUrl"`
	TargetURL  string    `json:"targetUrl"`
	Placement  string    `json:"placement"`
	Enabled    bool      `json:"enabled"`
	Clicks     int       `json:"clicks"`
	Impressions int      `json:"impressions"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// AdRepository handles database operations for ads
type AdRepository struct {
	db *sql.DB
}

// NewAdRepository creates a new ad repository
func NewAdRepository(db *sql.DB) *AdRepository {
	return &AdRepository{db: db}
}

// GetAll retrieves all ads with optional filtering
func (r *AdRepository) GetAll(placement string, enabled *bool) ([]Ad, error) {
	query := `SELECT id, title, image_url, target_url, placement, enabled,
			  COALESCE(clicks, 0), COALESCE(impressions, 0), created_at, updated_at
			  FROM ads WHERE 1=1`
	args := []interface{}{}

	if placement != "" {
		query += " AND placement = ?"
		args = append(args, placement)
	}

	if enabled != nil {
		query += " AND enabled = ?"
		if *enabled {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
	}

	query += " ORDER BY created_at DESC"

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ads := []Ad{}
	for rows.Next() {
		var a Ad
		var enabled int
		err := rows.Scan(&a.ID, &a.Title, &a.ImageURL, &a.TargetURL, &a.Placement,
			&enabled, &a.Clicks, &a.Impressions, &a.CreatedAt, &a.UpdatedAt)
		if err != nil {
			return nil, err
		}
		a.Enabled = enabled == 1
		ads = append(ads, a)
	}

	return ads, nil
}

// GetByID retrieves a single ad by its ID
func (r *AdRepository) GetByID(id string) (*Ad, error) {
	a := &Ad{}
	var enabled int
	err := r.db.QueryRow(
		`SELECT id, title, image_url, target_url, placement, enabled,
		 COALESCE(clicks, 0), COALESCE(impressions, 0), created_at, updated_at
		 FROM ads WHERE id = ?`,
		id,
	).Scan(&a.ID, &a.Title, &a.ImageURL, &a.TargetURL, &a.Placement,
		&enabled, &a.Clicks, &a.Impressions, &a.CreatedAt, &a.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	a.Enabled = enabled == 1
	return a, nil
}

// GetByPlacement retrieves all enabled ads for a specific placement
func (r *AdRepository) GetByPlacement(placement string) ([]Ad, error) {
	enabled := true
	return r.GetAll(placement, &enabled)
}

// Create inserts a new ad into the database
func (r *AdRepository) Create(a *Ad) error {
	enabled := 0
	if a.Enabled {
		enabled = 1
	}

	now := time.Now()
	_, err := r.db.Exec(
		`INSERT INTO ads (id, title, image_url, target_url, placement, enabled, clicks, impressions, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
		a.ID, a.Title, a.ImageURL, a.TargetURL, a.Placement, enabled, now, now,
	)
	if err != nil {
		return err
	}
	a.CreatedAt = now
	a.UpdatedAt = now
	a.Clicks = 0
	a.Impressions = 0
	return nil
}

// Update modifies an existing ad
func (r *AdRepository) Update(a *Ad) error {
	enabled := 0
	if a.Enabled {
		enabled = 1
	}

	_, err := r.db.Exec(
		`UPDATE ads SET title = ?, image_url = ?, target_url = ?, placement = ?,
		 enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		a.Title, a.ImageURL, a.TargetURL, a.Placement, enabled, a.ID,
	)
	return err
}

// UpdateEnabled toggles the enabled status of an ad
func (r *AdRepository) UpdateEnabled(id string, enabled bool) error {
	enabledInt := 0
	if enabled {
		enabledInt = 1
	}

	_, err := r.db.Exec(
		`UPDATE ads SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		enabledInt, id,
	)
	return err
}

// IncrementClicks increments the click count for an ad
func (r *AdRepository) IncrementClicks(id string) error {
	_, err := r.db.Exec(
		`UPDATE ads SET clicks = COALESCE(clicks, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		id,
	)
	return err
}

// IncrementImpressions increments the impression count for an ad
func (r *AdRepository) IncrementImpressions(id string) error {
	_, err := r.db.Exec(
		`UPDATE ads SET impressions = COALESCE(impressions, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		id,
	)
	return err
}

// Delete removes an ad from the database
func (r *AdRepository) Delete(id string) error {
	_, err := r.db.Exec("DELETE FROM ads WHERE id = ?", id)
	return err
}

// GetStats retrieves aggregated statistics for all ads
func (r *AdRepository) GetStats() (totalAds int, totalClicks int, totalImpressions int, err error) {
	err = r.db.QueryRow(
		`SELECT COUNT(*), COALESCE(SUM(clicks), 0), COALESCE(SUM(impressions), 0) FROM ads`,
	).Scan(&totalAds, &totalClicks, &totalImpressions)
	return
}
