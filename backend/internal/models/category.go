package models

import (
	"database/sql"
	"time"
)

type Category struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Icon       string    `json:"icon"`
	VideoCount int       `json:"videoCount,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type CategoryRepository struct {
	db *sql.DB
}

func NewCategoryRepository(db *sql.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) GetAll() ([]Category, error) {
	rows, err := r.db.Query(`
		SELECT c.id, c.name, c.icon, c.created_at, COUNT(v.id) as video_count
		FROM categories c
		LEFT JOIN videos v ON c.id = v.category
		GROUP BY c.id
		ORDER BY c.name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := []Category{}
	for rows.Next() {
		var c Category
		err := rows.Scan(&c.ID, &c.Name, &c.Icon, &c.CreatedAt, &c.VideoCount)
		if err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}

	return categories, nil
}

func (r *CategoryRepository) GetByID(id string) (*Category, error) {
	c := &Category{}
	err := r.db.QueryRow(
		`SELECT c.id, c.name, c.icon, c.created_at, COUNT(v.id) as video_count
		 FROM categories c
		 LEFT JOIN videos v ON c.id = v.category
		 WHERE c.id = ?
		 GROUP BY c.id`,
		id,
	).Scan(&c.ID, &c.Name, &c.Icon, &c.CreatedAt, &c.VideoCount)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CategoryRepository) Create(c *Category) error {
	_, err := r.db.Exec(
		"INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)",
		c.ID, c.Name, c.Icon,
	)
	if err != nil {
		return err
	}
	c.CreatedAt = time.Now()
	return nil
}

func (r *CategoryRepository) Update(c *Category) error {
	_, err := r.db.Exec(
		"UPDATE categories SET name = ?, icon = ? WHERE id = ?",
		c.Name, c.Icon, c.ID,
	)
	return err
}

func (r *CategoryRepository) Delete(id string) error {
	// First, update all videos in this category to 'other'
	_, err := r.db.Exec("UPDATE videos SET category = 'other' WHERE category = ?", id)
	if err != nil {
		return err
	}

	// Then delete the category
	_, err = r.db.Exec("DELETE FROM categories WHERE id = ?", id)
	return err
}
