package models

import (
	"database/sql"
	"time"
)

type ViewLog struct {
	ID        int       `json:"id"`
	VideoID   int       `json:"videoId"`
	IPAddress string    `json:"ipAddress"`
	UserAgent string    `json:"userAgent"`
	ViewedAt  time.Time `json:"viewedAt"`
}

type ViewLogRepository struct {
	db *sql.DB
}

func NewViewLogRepository(db *sql.DB) *ViewLogRepository {
	return &ViewLogRepository{db: db}
}

func (r *ViewLogRepository) Create(log *ViewLog) error {
	result, err := r.db.Exec(
		"INSERT INTO view_logs (video_id, ip_address, user_agent) VALUES (?, ?, ?)",
		log.VideoID, log.IPAddress, log.UserAgent,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	log.ID = int(id)
	log.ViewedAt = time.Now()
	return nil
}

func (r *ViewLogRepository) HasRecentView(videoID int, ipAddress string, hours int) (bool, error) {
	var count int
	err := r.db.QueryRow(
		`SELECT COUNT(*) FROM view_logs
		 WHERE video_id = ? AND ip_address = ?
		 AND viewed_at > datetime('now', ? || ' hours')`,
		videoID, ipAddress, -hours,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *ViewLogRepository) GetRecentViewsByDay(days int) ([]DailyViews, error) {
	rows, err := r.db.Query(`
		SELECT DATE(viewed_at) as date, COUNT(*) as views
		FROM view_logs
		WHERE viewed_at >= datetime('now', ? || ' days')
		GROUP BY DATE(viewed_at)
		ORDER BY date ASC
	`, -days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	views := []DailyViews{}
	for rows.Next() {
		var v DailyViews
		if err := rows.Scan(&v.Date, &v.Views); err != nil {
			return nil, err
		}
		views = append(views, v)
	}

	return views, nil
}

type DailyViews struct {
	Date  string `json:"date"`
	Views int    `json:"views"`
}
