package models

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"time"
)

type File struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	OriginalName string   `json:"originalName"`
	Path        string    `json:"path"`
	Size        int64     `json:"size"`
	MimeType    string    `json:"mimeType"`
	Extension   string    `json:"extension"`
	FolderID    *int      `json:"folderId"`
	ShareToken  string    `json:"shareToken,omitempty"`
	ShareExpiry *time.Time `json:"shareExpiry,omitempty"`
	IsPublic    bool      `json:"isPublic"`
	Downloads   int       `json:"downloads"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Folder struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	ParentID  *int      `json:"parentId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type FileShare struct {
	ID        int        `json:"id"`
	FileID    int        `json:"fileId"`
	Token     string     `json:"token"`
	ExpiresAt *time.Time `json:"expiresAt"`
	MaxDownloads *int    `json:"maxDownloads"`
	Downloads int        `json:"downloads"`
	CreatedAt time.Time  `json:"createdAt"`
}

type FileRepository struct {
	db *sql.DB
}

func NewFileRepository(db *sql.DB) *FileRepository {
	return &FileRepository{db: db}
}

// Generate a random token for sharing
func GenerateShareToken() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// File CRUD operations
func (r *FileRepository) Create(file *File) error {
	result, err := r.db.Exec(
		`INSERT INTO files (name, original_name, path, size, mime_type, extension, folder_id, is_public, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		file.Name, file.OriginalName, file.Path, file.Size, file.MimeType, file.Extension, file.FolderID, file.IsPublic, time.Now(), time.Now(),
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	file.ID = int(id)
	return nil
}

func (r *FileRepository) GetByID(id int) (*File, error) {
	file := &File{}
	var shareToken sql.NullString
	var shareExpiry sql.NullTime
	err := r.db.QueryRow(
		`SELECT id, name, original_name, path, size, mime_type, extension, folder_id, share_token, share_expiry, is_public, downloads, created_at, updated_at
		 FROM files WHERE id = ?`, id,
	).Scan(&file.ID, &file.Name, &file.OriginalName, &file.Path, &file.Size, &file.MimeType, &file.Extension, &file.FolderID, &shareToken, &shareExpiry, &file.IsPublic, &file.Downloads, &file.CreatedAt, &file.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if shareToken.Valid {
		file.ShareToken = shareToken.String
	}
	if shareExpiry.Valid {
		file.ShareExpiry = &shareExpiry.Time
	}
	return file, nil
}

func (r *FileRepository) GetByShareToken(token string) (*File, error) {
	file := &File{}
	var shareToken sql.NullString
	var shareExpiry sql.NullTime
	err := r.db.QueryRow(
		`SELECT id, name, original_name, path, size, mime_type, extension, folder_id, share_token, share_expiry, is_public, downloads, created_at, updated_at
		 FROM files WHERE share_token = ?`, token,
	).Scan(&file.ID, &file.Name, &file.OriginalName, &file.Path, &file.Size, &file.MimeType, &file.Extension, &file.FolderID, &shareToken, &shareExpiry, &file.IsPublic, &file.Downloads, &file.CreatedAt, &file.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if shareToken.Valid {
		file.ShareToken = shareToken.String
	}
	if shareExpiry.Valid {
		file.ShareExpiry = &shareExpiry.Time
	}
	return file, nil
}

func (r *FileRepository) GetAll(folderID *int) ([]File, error) {
	var rows *sql.Rows
	var err error

	if folderID == nil {
		rows, err = r.db.Query(
			`SELECT id, name, original_name, path, size, mime_type, extension, folder_id, share_token, share_expiry, is_public, downloads, created_at, updated_at
			 FROM files WHERE folder_id IS NULL ORDER BY created_at DESC`,
		)
	} else {
		rows, err = r.db.Query(
			`SELECT id, name, original_name, path, size, mime_type, extension, folder_id, share_token, share_expiry, is_public, downloads, created_at, updated_at
			 FROM files WHERE folder_id = ? ORDER BY created_at DESC`, *folderID,
		)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	files := []File{}
	for rows.Next() {
		var file File
		var shareToken sql.NullString
		var shareExpiry sql.NullTime
		if err := rows.Scan(&file.ID, &file.Name, &file.OriginalName, &file.Path, &file.Size, &file.MimeType, &file.Extension, &file.FolderID, &shareToken, &shareExpiry, &file.IsPublic, &file.Downloads, &file.CreatedAt, &file.UpdatedAt); err != nil {
			return nil, err
		}
		if shareToken.Valid {
			file.ShareToken = shareToken.String
		}
		if shareExpiry.Valid {
			file.ShareExpiry = &shareExpiry.Time
		}
		files = append(files, file)
	}
	return files, nil
}

func (r *FileRepository) Update(file *File) error {
	_, err := r.db.Exec(
		`UPDATE files SET name = ?, is_public = ?, share_token = ?, share_expiry = ?, updated_at = ? WHERE id = ?`,
		file.Name, file.IsPublic, file.ShareToken, file.ShareExpiry, time.Now(), file.ID,
	)
	return err
}

func (r *FileRepository) Delete(id int) error {
	_, err := r.db.Exec(`DELETE FROM files WHERE id = ?`, id)
	return err
}

func (r *FileRepository) IncrementDownloads(id int) error {
	_, err := r.db.Exec(`UPDATE files SET downloads = downloads + 1 WHERE id = ?`, id)
	return err
}

func (r *FileRepository) SetShareToken(id int, token string, expiry *time.Time) error {
	_, err := r.db.Exec(
		`UPDATE files SET share_token = ?, share_expiry = ?, updated_at = ? WHERE id = ?`,
		token, expiry, time.Now(), id,
	)
	return err
}

func (r *FileRepository) GetStorageStats() (totalFiles int, totalSize int64, err error) {
	err = r.db.QueryRow(`SELECT COUNT(*), COALESCE(SUM(size), 0) FROM files`).Scan(&totalFiles, &totalSize)
	return
}

// Folder operations
func (r *FileRepository) CreateFolder(folder *Folder) error {
	result, err := r.db.Exec(
		`INSERT INTO folders (name, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?)`,
		folder.Name, folder.ParentID, time.Now(), time.Now(),
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	folder.ID = int(id)
	return nil
}

func (r *FileRepository) GetFolders(parentID *int) ([]Folder, error) {
	var rows *sql.Rows
	var err error

	if parentID == nil {
		rows, err = r.db.Query(
			`SELECT id, name, parent_id, created_at, updated_at FROM folders WHERE parent_id IS NULL ORDER BY name`,
		)
	} else {
		rows, err = r.db.Query(
			`SELECT id, name, parent_id, created_at, updated_at FROM folders WHERE parent_id = ? ORDER BY name`, *parentID,
		)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	folders := []Folder{}
	for rows.Next() {
		var folder Folder
		if err := rows.Scan(&folder.ID, &folder.Name, &folder.ParentID, &folder.CreatedAt, &folder.UpdatedAt); err != nil {
			return nil, err
		}
		folders = append(folders, folder)
	}
	return folders, nil
}

func (r *FileRepository) GetFolderByID(id int) (*Folder, error) {
	folder := &Folder{}
	err := r.db.QueryRow(
		`SELECT id, name, parent_id, created_at, updated_at FROM folders WHERE id = ?`, id,
	).Scan(&folder.ID, &folder.Name, &folder.ParentID, &folder.CreatedAt, &folder.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return folder, nil
}

func (r *FileRepository) DeleteFolder(id int) error {
	// Delete all files in folder first
	_, err := r.db.Exec(`DELETE FROM files WHERE folder_id = ?`, id)
	if err != nil {
		return err
	}
	// Delete subfolder files recursively would be complex, for now just delete the folder
	_, err = r.db.Exec(`DELETE FROM folders WHERE id = ?`, id)
	return err
}

// FileShare operations - persistent share links

// CreateFileShare creates a new share link for a file path
func (r *FileRepository) CreateFileShare(token, filePath string, expiresAt *time.Time, maxDownloads *int) error {
	_, err := r.db.Exec(
		`INSERT INTO file_shares (token, file_path, expires_at, max_downloads, downloads, created_at)
		 VALUES (?, ?, ?, ?, 0, ?)`,
		token, filePath, expiresAt, maxDownloads, time.Now(),
	)
	return err
}

// GetFileShareByToken retrieves a share by its token
func (r *FileRepository) GetFileShareByToken(token string) (*FileShare, string, error) {
	share := &FileShare{}
	var filePath string
	var expiresAt sql.NullTime
	var maxDownloads sql.NullInt64

	err := r.db.QueryRow(
		`SELECT id, token, file_path, expires_at, max_downloads, downloads, created_at
		 FROM file_shares WHERE token = ?`, token,
	).Scan(&share.ID, &share.Token, &filePath, &expiresAt, &maxDownloads, &share.Downloads, &share.CreatedAt)

	if err != nil {
		return nil, "", err
	}

	if expiresAt.Valid {
		share.ExpiresAt = &expiresAt.Time
	}
	if maxDownloads.Valid {
		md := int(maxDownloads.Int64)
		share.MaxDownloads = &md
	}

	return share, filePath, nil
}

// GetFileShareByPath retrieves a share by file path (to check if already shared)
func (r *FileRepository) GetFileShareByPath(filePath string) (*FileShare, error) {
	share := &FileShare{}
	var expiresAt sql.NullTime
	var maxDownloads sql.NullInt64

	err := r.db.QueryRow(
		`SELECT id, token, expires_at, max_downloads, downloads, created_at
		 FROM file_shares WHERE file_path = ? ORDER BY created_at DESC LIMIT 1`, filePath,
	).Scan(&share.ID, &share.Token, &expiresAt, &maxDownloads, &share.Downloads, &share.CreatedAt)

	if err != nil {
		return nil, err
	}

	if expiresAt.Valid {
		share.ExpiresAt = &expiresAt.Time
	}
	if maxDownloads.Valid {
		md := int(maxDownloads.Int64)
		share.MaxDownloads = &md
	}

	return share, nil
}

// IncrementShareDownloads increments the download count for a share
func (r *FileRepository) IncrementShareDownloads(token string) error {
	_, err := r.db.Exec(
		`UPDATE file_shares SET downloads = downloads + 1 WHERE token = ?`, token,
	)
	return err
}

// DeleteFileShare deletes a share by token
func (r *FileRepository) DeleteFileShare(token string) error {
	_, err := r.db.Exec(`DELETE FROM file_shares WHERE token = ?`, token)
	return err
}

// DeleteFileShareByPath deletes all shares for a file path
func (r *FileRepository) DeleteFileShareByPath(filePath string) error {
	_, err := r.db.Exec(`DELETE FROM file_shares WHERE file_path = ?`, filePath)
	return err
}

// CleanupExpiredShares removes expired share links
func (r *FileRepository) CleanupExpiredShares() (int64, error) {
	result, err := r.db.Exec(
		`DELETE FROM file_shares WHERE expires_at IS NOT NULL AND expires_at < ?`, time.Now(),
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
