package models

import (
	"database/sql"
	"time"
)

type Video struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Creator     string    `json:"creator"`
	URL         string    `json:"url"`
	Thumbnail   string    `json:"thumbnail,omitempty"`
	Views       int       `json:"views"`
	Likes       int       `json:"likes"`
	Dislikes    int       `json:"dislikes"`
	Category    string    `json:"category"`
	Duration    string    `json:"duration,omitempty"`
	Description string    `json:"description,omitempty"`
	Verified    bool      `json:"verified"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type VideoRepository struct {
	db *sql.DB
}

func NewVideoRepository(db *sql.DB) *VideoRepository {
	return &VideoRepository{db: db}
}

func (r *VideoRepository) GetAll(page, limit int, sort, order, category string) ([]Video, int, error) {
	offset := (page - 1) * limit

	// Count total
	countQuery := "SELECT COUNT(*) FROM videos"
	args := []interface{}{}

	if category != "" {
		countQuery += " WHERE category = ?"
		args = append(args, category)
	}

	var total int
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get videos
	query := `SELECT id, title, creator, url, thumbnail, views, likes, dislikes,
			  category, duration, description, verified, created_at, updated_at
			  FROM videos`

	if category != "" {
		query += " WHERE category = ?"
	}

	// Validate sort column
	validSorts := map[string]bool{"views": true, "created_at": true, "title": true}
	if !validSorts[sort] {
		sort = "created_at"
	}

	// Validate order
	if order != "asc" && order != "desc" {
		order = "desc"
	}

	query += " ORDER BY " + sort + " " + order
	query += " LIMIT ? OFFSET ?"

	if category != "" {
		args = append(args, limit, offset)
	} else {
		args = []interface{}{limit, offset}
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	videos := []Video{}
	for rows.Next() {
		var v Video
		var verified int
		err := rows.Scan(&v.ID, &v.Title, &v.Creator, &v.URL, &v.Thumbnail, &v.Views,
			&v.Likes, &v.Dislikes, &v.Category, &v.Duration, &v.Description,
			&verified, &v.CreatedAt, &v.UpdatedAt)
		if err != nil {
			return nil, 0, err
		}
		v.Verified = verified == 1
		videos = append(videos, v)
	}

	return videos, total, nil
}

func (r *VideoRepository) GetByID(id int) (*Video, error) {
	v := &Video{}
	var verified int
	err := r.db.QueryRow(
		`SELECT id, title, creator, url, thumbnail, views, likes, dislikes,
		 category, duration, description, verified, created_at, updated_at
		 FROM videos WHERE id = ?`,
		id,
	).Scan(&v.ID, &v.Title, &v.Creator, &v.URL, &v.Thumbnail, &v.Views,
		&v.Likes, &v.Dislikes, &v.Category, &v.Duration, &v.Description,
		&verified, &v.CreatedAt, &v.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	v.Verified = verified == 1
	return v, nil
}

func (r *VideoRepository) Create(v *Video) error {
	verified := 0
	if v.Verified {
		verified = 1
	}

	result, err := r.db.Exec(
		`INSERT INTO videos (title, creator, url, thumbnail, category, duration, description, verified)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		v.Title, v.Creator, v.URL, v.Thumbnail, v.Category, v.Duration, v.Description, verified,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	v.ID = int(id)
	v.CreatedAt = time.Now()
	v.UpdatedAt = time.Now()
	return nil
}

func (r *VideoRepository) Update(v *Video) error {
	verified := 0
	if v.Verified {
		verified = 1
	}

	_, err := r.db.Exec(
		`UPDATE videos SET title = ?, creator = ?, category = ?, duration = ?,
		 description = ?, verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		v.Title, v.Creator, v.Category, v.Duration, v.Description, verified, v.ID,
	)
	return err
}

func (r *VideoRepository) Delete(id int) error {
	_, err := r.db.Exec("DELETE FROM videos WHERE id = ?", id)
	return err
}

func (r *VideoRepository) Search(query, category string, page, limit int) ([]Video, int, error) {
	offset := (page - 1) * limit
	searchPattern := "%" + query + "%"

	// Count total
	countQuery := `SELECT COUNT(*) FROM videos
				   WHERE (title LIKE ? OR creator LIKE ? OR description LIKE ?)`
	args := []interface{}{searchPattern, searchPattern, searchPattern}

	if category != "" {
		countQuery += " AND category = ?"
		args = append(args, category)
	}

	var total int
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get videos
	searchQuery := `SELECT id, title, creator, url, thumbnail, views, likes, dislikes,
					category, duration, description, verified, created_at, updated_at
					FROM videos
					WHERE (title LIKE ? OR creator LIKE ? OR description LIKE ?)`

	if category != "" {
		searchQuery += " AND category = ?"
	}
	searchQuery += " ORDER BY views DESC LIMIT ? OFFSET ?"

	args = append(args, limit, offset)

	rows, err := r.db.Query(searchQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	videos := []Video{}
	for rows.Next() {
		var v Video
		var verified int
		err := rows.Scan(&v.ID, &v.Title, &v.Creator, &v.URL, &v.Thumbnail, &v.Views,
			&v.Likes, &v.Dislikes, &v.Category, &v.Duration, &v.Description,
			&verified, &v.CreatedAt, &v.UpdatedAt)
		if err != nil {
			return nil, 0, err
		}
		v.Verified = verified == 1
		videos = append(videos, v)
	}

	return videos, total, nil
}

func (r *VideoRepository) IncrementViews(id int) error {
	_, err := r.db.Exec("UPDATE videos SET views = views + 1 WHERE id = ?", id)
	return err
}

func (r *VideoRepository) GetRelated(videoID int, category string, limit int) ([]Video, error) {
	rows, err := r.db.Query(
		`SELECT id, title, creator, url, thumbnail, views, category
		 FROM videos WHERE category = ? AND id != ?
		 ORDER BY views DESC LIMIT ?`,
		category, videoID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	videos := []Video{}
	for rows.Next() {
		var v Video
		err := rows.Scan(&v.ID, &v.Title, &v.Creator, &v.URL, &v.Thumbnail, &v.Views, &v.Category)
		if err != nil {
			return nil, err
		}
		videos = append(videos, v)
	}

	return videos, nil
}
