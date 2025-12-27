package services

import (
	"database/sql"
)

type AnalyticsService struct {
	db *sql.DB
}

type Analytics struct {
	TotalVideos     int                `json:"totalVideos"`
	TotalViews      int                `json:"totalViews"`
	TotalCategories int                `json:"totalCategories"`
	AvgViewsPerVideo int               `json:"avgViewsPerVideo"`
	TopVideos       []TopVideo         `json:"topVideos"`
	ViewsByCategory []CategoryViews    `json:"viewsByCategory"`
	RecentViews     []DailyViewStats   `json:"recentViews"`
}

type TopVideo struct {
	ID      int    `json:"id"`
	Title   string `json:"title"`
	Views   int    `json:"views"`
	Creator string `json:"creator"`
}

type CategoryViews struct {
	Category   string `json:"category"`
	Views      int    `json:"views"`
	VideoCount int    `json:"videoCount"`
}

type DailyViewStats struct {
	Date  string `json:"date"`
	Views int    `json:"views"`
}

func NewAnalyticsService(db *sql.DB) *AnalyticsService {
	return &AnalyticsService{db: db}
}

func (s *AnalyticsService) GetAnalytics() (*Analytics, error) {
	analytics := &Analytics{}

	// Total videos
	err := s.db.QueryRow("SELECT COUNT(*) FROM videos").Scan(&analytics.TotalVideos)
	if err != nil {
		return nil, err
	}

	// Total views
	err = s.db.QueryRow("SELECT COALESCE(SUM(views), 0) FROM videos").Scan(&analytics.TotalViews)
	if err != nil {
		return nil, err
	}

	// Total categories
	err = s.db.QueryRow("SELECT COUNT(*) FROM categories").Scan(&analytics.TotalCategories)
	if err != nil {
		return nil, err
	}

	// Average views per video
	if analytics.TotalVideos > 0 {
		analytics.AvgViewsPerVideo = analytics.TotalViews / analytics.TotalVideos
	}

	// Top videos
	rows, err := s.db.Query(`
		SELECT id, title, views, creator
		FROM videos
		ORDER BY views DESC
		LIMIT 10
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var v TopVideo
		if err := rows.Scan(&v.ID, &v.Title, &v.Views, &v.Creator); err != nil {
			return nil, err
		}
		analytics.TopVideos = append(analytics.TopVideos, v)
	}

	// Views by category
	rows, err = s.db.Query(`
		SELECT category, SUM(views) as total_views, COUNT(*) as video_count
		FROM videos
		GROUP BY category
		ORDER BY total_views DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var cv CategoryViews
		if err := rows.Scan(&cv.Category, &cv.Views, &cv.VideoCount); err != nil {
			return nil, err
		}
		analytics.ViewsByCategory = append(analytics.ViewsByCategory, cv)
	}

	// Recent views (last 7 days)
	rows, err = s.db.Query(`
		SELECT DATE(viewed_at) as date, COUNT(*) as views
		FROM view_logs
		WHERE viewed_at >= datetime('now', '-7 days')
		GROUP BY DATE(viewed_at)
		ORDER BY date ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var dv DailyViewStats
		if err := rows.Scan(&dv.Date, &dv.Views); err != nil {
			return nil, err
		}
		analytics.RecentViews = append(analytics.RecentViews, dv)
	}

	return analytics, nil
}
