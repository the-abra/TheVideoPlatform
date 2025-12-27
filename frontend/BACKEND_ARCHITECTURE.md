# Titan Media Platform - Backend Architecture Document
**Target Stack: Go (Golang) + SQLite + Local Video Storage**

---

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Schema (SQLite)](#database-schema-sqlite)
5. [API Endpoints Specification](#api-endpoints-specification)
6. [Authentication & Security](#authentication--security)
7. [File Storage System](#file-storage-system)
8. [Error Handling & Response Format](#error-handling--response-format)
9. [Implementation Checklist](#implementation-checklist)
10. [Testing Strategy](#testing-strategy)

---

## 🎯 System Overview

Titan is a video streaming platform with the following core features:
- Video management (upload, edit, delete, view)
- Category management (dynamic categories)
- Advertisement system (multiple placements)
- Search and filtering
- View tracking with analytics
- Admin authentication
- Site settings management
- Local video file storage

**Frontend URL**: http://localhost:3000
**Backend URL**: http://localhost:5000

---

## 🛠 Technology Stack

### Core Technologies
- **Language**: Go 1.21+
- **Database**: SQLite3 (embedded, file-based)
- **Router**: Chi Router (lightweight, idiomatic)
- **Authentication**: JWT (golang-jwt/jwt)
- **Validation**: go-playground/validator
- **File Storage**: Local filesystem
- **CORS**: rs/cors middleware

### Required Go Packages
```bash
go get -u github.com/go-chi/chi/v5
go get -u github.com/go-chi/cors
go get -u github.com/golang-jwt/jwt/v5
go get -u github.com/mattn/go-sqlite3
go get -u github.com/go-playground/validator/v10
go get -u golang.org/x/crypto/bcrypt
go get -u github.com/joho/godotenv
```

---

## 📁 Project Structure

```
titan-backend/
├── cmd/
│   └── server/
│       └── main.go                 # Application entry point
├── internal/
│   ├── handlers/
│   │   ├── video_handler.go       # Video CRUD endpoints
│   │   ├── category_handler.go    # Category management
│   │   ├── ad_handler.go          # Advertisement management
│   │   ├── auth_handler.go        # Authentication endpoints
│   │   ├── settings_handler.go    # Site settings management
│   │   └── health_handler.go      # Health check endpoint
│   ├── models/
│   │   ├── video.go               # Video model & DB operations
│   │   ├── category.go            # Category model
│   │   ├── ad.go                  # Advertisement model
│   │   ├── user.go                # User/Admin model
│   │   ├── settings.go            # Site settings model
│   │   └── response.go            # Standard response structures
│   ├── middleware/
│   │   ├── auth.go                # JWT authentication middleware
│   │   ├── cors.go                # CORS configuration
│   │   ├── logger.go              # Request logging
│   │   └── recovery.go            # Panic recovery
│   ├── database/
│   │   ├── db.go                  # Database connection & initialization
│   │   ├── migrations.go          # Schema migrations
│   │   └── seed.go                # Optional seed data
│   ├── services/
│   │   ├── video_service.go       # Business logic for videos
│   │   ├── storage_service.go     # File upload/storage handling
│   │   ├── auth_service.go        # JWT generation/validation
│   │   └── analytics_service.go   # View counting, stats
│   └── utils/
│       ├── validator.go           # Input validation helpers
│       ├── pagination.go          # Pagination utilities
│       ├── errors.go              # Error definitions
│       └── config.go              # Configuration loader
├── storage/
│   ├── videos/                    # Uploaded video files
│   ├── thumbnails/                # Video thumbnails
│   └── ads/                       # Advertisement images
├── titan.db                       # SQLite database file
├── .env                           # Environment variables
├── .env.example                   # Environment template
├── go.mod
├── go.sum
└── README.md
```

---

## 🗄 Database Schema (SQLite)

### 1. Videos Table
```sql
CREATE TABLE IF NOT EXISTS videos (
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
);

CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_creator ON videos(creator);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views DESC);
```

### 2. Categories Table
```sql
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
```

### 3. Ads Table
```sql
CREATE TABLE IF NOT EXISTS ads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    placement TEXT NOT NULL CHECK(placement IN ('home-banner', 'home-sidebar', 'video-top', 'video-sidebar')),
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ads_placement ON ads(placement, enabled);
```

### 4. Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);
```

### 5. Settings Table
```sql
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES 
    ('site_name', 'MEDIAHUB'),
    ('site_description', 'Your premium streaming platform'),
    ('maintenance_mode', 'false'),
    ('allow_new_uploads', 'true'),
    ('featured_video_id', '');
```

### 6. View Tracking Table
```sql
CREATE TABLE IF NOT EXISTS view_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_view_logs_video ON view_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_ip ON view_logs(ip_address, video_id, viewed_at);
```

---

## 🔌 API Endpoints Specification

### Base Response Format
```go
type APIResponse struct {
    Success bool        `json:"success"`
    Message string      `json:"message,omitempty"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

type PaginationMeta struct {
    Page       int  `json:"page"`
    Limit      int  `json:"limit"`
    Total      int  `json:"total"`
    TotalPages int  `json:"totalPages"`
    HasNext    bool `json:"hasNext"`
    HasPrev    bool `json:"hasPrev"`
}
```

---

### 1. Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

**Implementation Notes**:
- Check SQLite connection
- Return server uptime
- No authentication required

---

### 2. Authentication

#### 2.1 Login
**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "username": "admin",
  "password": "your_password"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

**Implementation**:
```go
// Validate credentials with bcrypt
// Generate JWT with user ID and role
// Token expiry: 24 hours
// Return 401 for invalid credentials
```

#### 2.2 Verify Token
**Endpoint**: `GET /api/auth/verify`

**Headers**: `Authorization: Bearer {token}`

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": 1,
      "username": "admin"
    }
  }
}
```

---

### 3. Videos

#### 3.1 Get All Videos
**Endpoint**: `GET /api/videos`

**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `sort` (string: "views", "created_at", default: "created_at")
- `order` (string: "asc", "desc", default: "desc")
- `category` (string, optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": 1,
        "title": "Example Video",
        "creator": "Creator Name",
        "url": "/storage/videos/video-uuid.mp4",
        "thumbnail": "/storage/thumbnails/thumb-uuid.jpg",
        "views": 12453,
        "likes": 234,
        "dislikes": 12,
        "category": "technology",
        "duration": "10:45",
        "description": "Video description",
        "verified": true,
        "createdAt": "2025-01-15T10:30:00Z",
        "updatedAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### 3.2 Get Video by ID
**Endpoint**: `GET /api/videos/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "video": {
      "id": 1,
      "title": "Example Video",
      "creator": "Creator Name",
      "url": "/storage/videos/video-uuid.mp4",
      "thumbnail": "/storage/thumbnails/thumb-uuid.jpg",
      "views": 12453,
      "likes": 234,
      "dislikes": 12,
      "category": "technology",
      "duration": "10:45",
      "description": "Full video description here...",
      "verified": true,
      "createdAt": "2025-01-15T10:30:00Z"
    },
    "relatedVideos": [
      {
        "id": 2,
        "title": "Related Video",
        "thumbnail": "/storage/thumbnails/thumb-2.jpg",
        "creator": "Another Creator",
        "views": 5432
      }
    ]
  }
}
```

**Error Response** (404):
```json
{
  "success": false,
  "error": "Video not found"
}
```

#### 3.3 Create Video
**Endpoint**: `POST /api/videos`

**Authentication**: Required (Bearer token)

**Request Body** (multipart/form-data):
```
title: "Video Title" (required)
creator: "Creator Name" (required)
category: "technology" (required)
duration: "10:45" (optional)
description: "Description" (optional)
video: [file] (required, max 2GB)
thumbnail: [file] (optional, max 5MB)
```

**Response**:
```json
{
  "success": true,
  "message": "Video created successfully",
  "data": {
    "video": {
      "id": 10,
      "title": "Video Title",
      "creator": "Creator Name",
      "url": "/storage/videos/550e8400-e29b-41d4-a716-446655440000.mp4",
      "thumbnail": "/storage/thumbnails/550e8400-e29b-41d4-a716-446655440000.jpg",
      "category": "technology",
      "createdAt": "2025-01-15T14:22:00Z"
    }
  }
}
```

**Implementation Notes**:
- Generate UUID for file names
- Validate file types (video: mp4, webm; thumbnail: jpg, png)
- Store in `/storage/videos/` and `/storage/thumbnails/`
- Extract video duration if not provided (use FFmpeg or similar)
- Sanitize inputs to prevent XSS

#### 3.4 Update Video
**Endpoint**: `PUT /api/videos/:id`

**Authentication**: Required

**Request Body**:
```json
{
  "title": "Updated Title",
  "creator": "Updated Creator",
  "category": "gaming",
  "description": "Updated description"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Video updated successfully",
  "data": {
    "video": {
      "id": 1,
      "title": "Updated Title",
      "updatedAt": "2025-01-15T15:00:00Z"
    }
  }
}
```

#### 3.5 Delete Video
**Endpoint**: `DELETE /api/videos/:id`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Video deleted successfully",
  "data": {
    "deletedId": 1
  }
}
```

**Implementation Notes**:
- Delete video file from storage
- Delete thumbnail file
- Delete associated view logs (cascade)
- Return 404 if not found

#### 3.6 Search Videos
**Endpoint**: `GET /api/videos/search`

**Query Parameters**:
- `q` (string, required) - search query
- `category` (string, optional)
- `page` (int, default: 1)
- `limit` (int, default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 1,
        "title": "Matching Video",
        "creator": "Creator Name",
        "thumbnail": "/storage/thumbnails/thumb.jpg",
        "category": "technology",
        "views": 12453
      }
    ],
    "query": "search term",
    "filters": {
      "category": "technology"
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**Implementation**:
```sql
SELECT * FROM videos 
WHERE (title LIKE ? OR creator LIKE ? OR description LIKE ?)
  AND (? = '' OR category = ?)
ORDER BY views DESC
LIMIT ? OFFSET ?
```

#### 3.7 Increment View Count
**Endpoint**: `POST /api/videos/:id/view`

**Request Body** (optional):
```json
{
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "View counted",
  "data": {
    "videoId": 1,
    "views": 12454,
    "viewCounted": true
  }
}
```

**Implementation Notes**:
- Throttle: Same IP can only count 1 view per video per 24 hours
- Check view_logs table for recent views
- Increment video views count
- Log view with IP and timestamp

---

### 4. Categories

#### 4.1 Get All Categories
**Endpoint**: `GET /api/categories`

**Response**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "technology",
        "name": "Technology",
        "icon": "code",
        "videoCount": 24,
        "createdAt": "2025-01-10T10:00:00Z"
      },
      {
        "id": "gaming",
        "name": "Gaming",
        "icon": "gamepad",
        "videoCount": 18,
        "createdAt": "2025-01-10T10:00:00Z"
      }
    ],
    "total": 8
  }
}
```

**Implementation**:
```sql
SELECT c.*, COUNT(v.id) as video_count
FROM categories c
LEFT JOIN videos v ON c.id = v.category
GROUP BY c.id
ORDER BY c.name ASC
```

#### 4.2 Create Category
**Endpoint**: `POST /api/categories`

**Authentication**: Required

**Request Body**:
```json
{
  "id": "wellness",
  "name": "Wellness",
  "icon": "spa"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "category": {
      "id": "wellness",
      "name": "Wellness",
      "icon": "spa",
      "createdAt": "2025-01-15T16:00:00Z"
    }
  }
}
```

#### 4.3 Update Category
**Endpoint**: `PUT /api/categories/:id`

**Authentication**: Required

**Request Body**:
```json
{
  "name": "Updated Name",
  "icon": "new-icon"
}
```

#### 4.4 Delete Category
**Endpoint**: `DELETE /api/categories/:id`

**Authentication**: Required

**Implementation Notes**:
- Set all videos in this category to 'other' category
- Then delete the category

---

### 5. Advertisements

#### 5.1 Get All Ads
**Endpoint**: `GET /api/ads`

**Query Parameters**:
- `placement` (string, optional) - filter by placement
- `enabled` (boolean, optional) - filter by enabled status

**Response**:
```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "id": "ad-uuid-1",
        "title": "Summer Sale",
        "imageUrl": "/storage/ads/ad-image.jpg",
        "targetUrl": "https://example.com/sale",
        "placement": "home-banner",
        "enabled": true,
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

#### 5.2 Create Ad
**Endpoint**: `POST /api/ads`

**Authentication**: Required

**Request Body** (multipart/form-data):
```
title: "Ad Title" (required)
targetUrl: "https://example.com" (required)
placement: "home-banner" (required)
enabled: true (optional, default: true)
image: [file] (required, max 2MB)
```

**Response**:
```json
{
  "success": true,
  "message": "Ad created successfully",
  "data": {
    "ad": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Ad Title",
      "imageUrl": "/storage/ads/550e8400-e29b-41d4-a716-446655440000.jpg",
      "targetUrl": "https://example.com",
      "placement": "home-banner",
      "enabled": true
    }
  }
}
```

#### 5.3 Update Ad
**Endpoint**: `PUT /api/ads/:id`

**Authentication**: Required

#### 5.4 Delete Ad
**Endpoint**: `DELETE /api/ads/:id`

**Authentication**: Required

**Implementation Notes**:
- Delete ad image file from storage

---

### 6. Site Settings

#### 6.1 Get Settings
**Endpoint**: `GET /api/settings`

**Response**:
```json
{
  "success": true,
  "data": {
    "settings": {
      "siteName": "MEDIAHUB",
      "siteDescription": "Your premium streaming platform",
      "maintenanceMode": false,
      "allowNewUploads": true,
      "featuredVideoId": "5"
    }
  }
}
```

#### 6.2 Update Settings
**Endpoint**: `PUT /api/settings`

**Authentication**: Required

**Request Body**:
```json
{
  "siteName": "New Site Name",
  "maintenanceMode": true,
  "allowNewUploads": false,
  "featuredVideoId": "10"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "settings": {
      "siteName": "New Site Name",
      "maintenanceMode": true,
      "allowNewUploads": false,
      "featuredVideoId": "10"
    }
  }
}
```

**Implementation**:
```sql
INSERT OR REPLACE INTO settings (key, value, updated_at) 
VALUES (?, ?, CURRENT_TIMESTAMP)
```

---

### 7. Analytics

#### 7.1 Get Analytics Dashboard
**Endpoint**: `GET /api/analytics`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "totalVideos": 45,
    "totalViews": 1245367,
    "totalCategories": 8,
    "avgViewsPerVideo": 27674,
    "topVideos": [
      {
        "id": 1,
        "title": "Most Viewed Video",
        "views": 245876,
        "creator": "Creator Name"
      }
    ],
    "viewsByCategory": [
      {
        "category": "technology",
        "views": 456789,
        "videoCount": 18
      }
    ],
    "recentViews": [
      {
        "date": "2025-01-15",
        "views": 5432
      }
    ]
  }
}
```

**SQL Queries**:
```sql
-- Total videos
SELECT COUNT(*) FROM videos

-- Total views
SELECT SUM(views) FROM videos

-- Top videos
SELECT id, title, views, creator 
FROM videos 
ORDER BY views DESC 
LIMIT 10

-- Views by category
SELECT category, SUM(views) as total_views, COUNT(*) as video_count
FROM videos
GROUP BY category
ORDER BY total_views DESC

-- Recent views (last 7 days)
SELECT DATE(viewed_at) as date, COUNT(*) as views
FROM view_logs
WHERE viewed_at >= datetime('now', '-7 days')
GROUP BY DATE(viewed_at)
ORDER BY date ASC
```

---

## 🔐 Authentication & Security

### JWT Implementation

**Token Structure**:
```go
type JWTClaims struct {
    UserID   int    `json:"user_id"`
    Username string `json:"username"`
    Role     string `json:"role"`
    jwt.RegisteredClaims
}
```

**Token Generation**:
```go
func GenerateToken(user *User) (string, error) {
    claims := JWTClaims{
        UserID:   user.ID,
        Username: user.Username,
        Role:     user.Role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "titan-backend",
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}
```

**Middleware**:
```go
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            respondError(w, "Missing authorization header", 401)
            return
        }
        
        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        claims, err := ValidateToken(tokenString)
        if err != nil {
            respondError(w, "Invalid token", 401)
            return
        }
        
        // Add claims to context
        ctx := context.WithValue(r.Context(), "user", claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### Password Hashing
```go
import "golang.org/x/crypto/bcrypt"

func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
    return string(bytes), err
}

func CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

### CORS Configuration
```go
import "github.com/go-chi/cors"

corsHandler := cors.New(cors.Options{
    AllowedOrigins:   []string{"http://localhost:3000"},
    AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
    ExposedHeaders:   []string{"Link"},
    AllowCredentials: true,
    MaxAge:           300,
})
```

---

## 💾 File Storage System

### Directory Structure
```
storage/
├── videos/
│   └── {uuid}.mp4
├── thumbnails/
│   └── {uuid}.jpg
└── ads/
    └── {uuid}.jpg
```

### File Upload Handler
```go
func HandleVideoUpload(w http.ResponseWriter, r *http.Request) {
    // Parse multipart form (max 2GB)
    err := r.ParseMultipartForm(2 << 30) // 2GB
    if err != nil {
        respondError(w, "File too large", 400)
        return
    }
    
    // Get video file
    videoFile, videoHeader, err := r.FormFile("video")
    if err != nil {
        respondError(w, "No video file provided", 400)
        return
    }
    defer videoFile.Close()
    
    // Validate file type
    if !isValidVideoType(videoHeader.Header.Get("Content-Type")) {
        respondError(w, "Invalid video format", 400)
        return
    }
    
    // Generate UUID filename
    videoUUID := uuid.New().String()
    videoPath := filepath.Join("storage", "videos", videoUUID+".mp4")
    
    // Save file
    destFile, err := os.Create(videoPath)
    if err != nil {
        respondError(w, "Failed to save file", 500)
        return
    }
    defer destFile.Close()
    
    _, err = io.Copy(destFile, videoFile)
    if err != nil {
        respondError(w, "Failed to save file", 500)
        return
    }
    
    // Process thumbnail if provided, or generate one
    thumbnailPath := processThumbnail(r, videoUUID)
    
    // Save to database
    video := &Video{
        Title:     r.FormValue("title"),
        Creator:   r.FormValue("creator"),
        URL:       "/storage/videos/" + videoUUID + ".mp4",
        Thumbnail: thumbnailPath,
        Category:  r.FormValue("category"),
        Duration:  r.FormValue("duration"),
    }
    
    err = db.CreateVideo(video)
    if err != nil {
        respondError(w, "Failed to create video record", 500)
        return
    }
    
    respondSuccess(w, "Video uploaded successfully", video, 201)
}
```

### File Serving
```go
// Serve static files from storage directory
r.Handle("/storage/*", http.StripPrefix("/storage/", 
    http.FileServer(http.Dir("./storage"))))
```

---

## 🚨 Error Handling & Response Format

### Standard Error Response
```go
type ErrorResponse struct {
    Success bool   `json:"success"`
    Error   string `json:"error"`
    Code    int    `json:"code,omitempty"`
}

func respondError(w http.ResponseWriter, message string, statusCode int) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(ErrorResponse{
        Success: false,
        Error:   message,
        Code:    statusCode,
    })
}
```

### Error Codes
- **400**: Bad Request (validation errors, invalid input)
- **401**: Unauthorized (missing or invalid token)
- **403**: Forbidden (valid token but insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **409**: Conflict (duplicate entry, constraint violation)
- **500**: Internal Server Error (unexpected errors)

### Validation Errors
```go
type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

type ValidationErrorResponse struct {
    Success bool              `json:"success"`
    Error   string            `json:"error"`
    Details []ValidationError `json:"details"`
}
```

---

## 📝 Implementation Checklist

### Phase 1: Project Setup
- [ ] Initialize Go module (`go mod init titan-backend`)
- [ ] Install required dependencies
- [ ] Create project structure (handlers, models, middleware, etc.)
- [ ] Set up `.env` file with configuration
- [ ] Create `storage/` directories (videos, thumbnails, ads)

### Phase 2: Database Setup
- [ ] Create database connection in `internal/database/db.go`
- [ ] Implement migration system in `internal/database/migrations.go`
- [ ] Create all table schemas (videos, categories, ads, users, settings, view_logs)
- [ ] Create indexes for performance
- [ ] Add seed admin user (username: "admin", password: hashed "admin")

### Phase 3: Models
- [ ] Implement Video model with CRUD operations
- [ ] Implement Category model with CRUD operations
- [ ] Implement Ad model with CRUD operations
- [ ] Implement User model with authentication methods
- [ ] Implement Settings model (key-value store)
- [ ] Implement ViewLog model for analytics

### Phase 4: Authentication
- [ ] Create JWT generation and validation functions
- [ ] Implement password hashing with bcrypt
- [ ] Create auth middleware
- [ ] Implement login endpoint
- [ ] Implement token verification endpoint

### Phase 5: API Endpoints
- [ ] Health check endpoint (`GET /health`)
- [ ] Video endpoints (GET, POST, PUT, DELETE)
- [ ] Video search endpoint
- [ ] Video view tracking endpoint
- [ ] Category endpoints (GET, POST, PUT, DELETE)
- [ ] Ad endpoints (GET, POST, PUT, DELETE)
- [ ] Settings endpoints (GET, PUT)
- [ ] Analytics endpoint

### Phase 6: File Handling
- [ ] Implement video file upload handler
- [ ] Implement thumbnail upload/generation
- [ ] Implement ad image upload handler
- [ ] Set up static file serving for `/storage/*`
- [ ] Add file type validation
- [ ] Add file size limits

### Phase 7: Middleware
- [ ] CORS middleware configuration
- [ ] Request logging middleware
- [ ] Panic recovery middleware
- [ ] Rate limiting middleware (optional)

### Phase 8: Testing
- [ ] Write unit tests for models
- [ ] Write integration tests for API endpoints
- [ ] Test authentication flow
- [ ] Test file upload functionality
- [ ] Test error handling

### Phase 9: Documentation
- [ ] Update README.md with setup instructions
- [ ] Document environment variables
- [ ] Add API examples with curl commands
- [ ] Create deployment guide

---

## 🧪 Testing Strategy

### Unit Tests Example
```go
func TestVideoModel(t *testing.T) {
    db := setupTestDB()
    defer db.Close()
    
    video := &Video{
        Title:    "Test Video",
        Creator:  "Test Creator",
        URL:      "/test.mp4",
        Category: "technology",
    }
    
    err := db.CreateVideo(video)
    if err != nil {
        t.Fatalf("Failed to create video: %v", err)
    }
    
    if video.ID == 0 {
        t.Error("Video ID should be set after creation")
    }
    
    retrieved, err := db.GetVideoByID(video.ID)
    if err != nil {
        t.Fatalf("Failed to retrieve video: %v", err)
    }
    
    if retrieved.Title != video.Title {
        t.Errorf("Expected title %s, got %s", video.Title, retrieved.Title)
    }
}
```

### Integration Tests Example
```go
func TestCreateVideoEndpoint(t *testing.T) {
    r := setupTestRouter()
    
    // Create multipart form
    body := &bytes.Buffer{}
    writer := multipart.NewWriter(body)
    writer.WriteField("title", "Test Video")
    writer.WriteField("creator", "Test Creator")
    writer.WriteField("category", "technology")
    
    // Add video file
    videoFile, _ := os.Open("testdata/sample.mp4")
    defer videoFile.Close()
    part, _ := writer.CreateFormFile("video", "sample.mp4")
    io.Copy(part, videoFile)
    writer.Close()
    
    req := httptest.NewRequest("POST", "/api/videos", body)
    req.Header.Set("Content-Type", writer.FormDataContentType())
    req.Header.Set("Authorization", "Bearer "+getTestToken())
    
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)
    
    if w.Code != 201 {
        t.Errorf("Expected status 201, got %d", w.Code)
    }
}
```

---

## 🔧 Environment Configuration

### .env.example
```env
# Server Configuration
PORT=5000
HOST=localhost
ENV=development

# Database
DATABASE_PATH=./titan.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY_HOURS=24

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# File Upload Limits
MAX_VIDEO_SIZE_MB=2048
MAX_IMAGE_SIZE_MB=5

# Storage Paths
STORAGE_PATH=./storage
VIDEO_PATH=./storage/videos
THUMBNAIL_PATH=./storage/thumbnails
AD_PATH=./storage/ads

# Admin Default Credentials (change after first login)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin
```

---

## 🚀 Startup Instructions

### main.go Example
```go
package main

import (
    "log"
    "net/http"
    "os"
    
    "titan-backend/internal/database"
    "titan-backend/internal/handlers"
    "titan-backend/internal/middleware"
    
    "github.com/go-chi/chi/v5"
    "github.com/go-chi/cors"
    "github.com/joho/godotenv"
)

func main() {
    // Load environment variables
    godotenv.Load()
    
    // Initialize database
    db, err := database.InitDB(os.Getenv("DATABASE_PATH"))
    if err != nil {
        log.Fatalf("Failed to initialize database: %v", err)
    }
    defer db.Close()
    
    // Run migrations
    if err := database.RunMigrations(db); err != nil {
        log.Fatalf("Failed to run migrations: %v", err)
    }
    
    // Create router
    r := chi.NewRouter()
    
    // Middleware
    r.Use(middleware.Logger)
    r.Use(middleware.Recovery)
    r.Use(cors.Handler(cors.Options{
        AllowedOrigins:   []string{os.Getenv("ALLOWED_ORIGINS")},
        AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
        AllowCredentials: true,
        MaxAge:           300,
    }))
    
    // Health check
    r.Get("/health", handlers.HealthCheck)
    
    // Public routes
    r.Post("/api/auth/login", handlers.Login(db))
    r.Get("/api/videos", handlers.GetVideos(db))
    r.Get("/api/videos/search", handlers.SearchVideos(db))
    r.Get("/api/videos/{id}", handlers.GetVideo(db))
    r.Post("/api/videos/{id}/view", handlers.IncrementView(db))
    r.Get("/api/categories", handlers.GetCategories(db))
    r.Get("/api/ads", handlers.GetAds(db))
    r.Get("/api/settings", handlers.GetSettings(db))
    
    // Protected routes
    r.Group(func(r chi.Router) {
        r.Use(middleware.AuthMiddleware)
        
        r.Post("/api/videos", handlers.CreateVideo(db))
        r.Put("/api/videos/{id}", handlers.UpdateVideo(db))
        r.Delete("/api/videos/{id}", handlers.DeleteVideo(db))
        
        r.Post("/api/categories", handlers.CreateCategory(db))
        r.Put("/api/categories/{id}", handlers.UpdateCategory(db))
        r.Delete("/api/categories/{id}", handlers.DeleteCategory(db))
        
        r.Post("/api/ads", handlers.CreateAd(db))
        r.Put("/api/ads/{id}", handlers.UpdateAd(db))
        r.Delete("/api/ads/{id}", handlers.DeleteAd(db))
        
        r.Put("/api/settings", handlers.UpdateSettings(db))
        r.Get("/api/analytics", handlers.GetAnalytics(db))
    })
    
    // Serve static files
    r.Handle("/storage/*", http.StripPrefix("/storage/", 
        http.FileServer(http.Dir("./storage"))))
    
    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "5000"
    }
    
    log.Printf("Server starting on http://localhost:%s", port)
    log.Fatal(http.ListenAndServe(":"+port, r))
}
```

---

## 📚 Additional Resources

### Go Packages Documentation
- Chi Router: https://github.com/go-chi/chi
- SQLite3: https://github.com/mattn/go-sqlite3
- JWT Go: https://github.com/golang-jwt/jwt
- Validator: https://github.com/go-playground/validator
- Bcrypt: https://pkg.go.dev/golang.org/x/crypto/bcrypt

### Frontend Integration
The frontend at `http://localhost:3000` expects:
- All API endpoints at `http://localhost:5000/api/*`
- Static files served at `http://localhost:5000/storage/*`
- JWT tokens in `Authorization: Bearer {token}` header
- JSON request/response format
- CORS enabled for localhost:3000

---

## 🎯 Success Criteria

The backend is complete when:
1. All API endpoints return correct responses
2. Authentication works with JWT tokens
3. Video upload and storage functions properly
4. Database queries are optimized with indexes
5. File serving works for videos, thumbnails, and ads
6. Error handling covers all edge cases
7. CORS is properly configured
8. View tracking with IP throttling works
9. Analytics endpoint returns accurate data
10. Frontend can successfully integrate with all endpoints

---

## 📞 Frontend-Backend Contract

### Expected by Frontend:
- Base URL: `http://localhost:5000`
- Response format: Always JSON with `success`, `message`, `data`, or `error`
- Authentication: JWT in `Authorization: Bearer {token}` header
- File paths: Relative URLs like `/storage/videos/filename.mp4`
- Pagination: Standard format with `page`, `limit`, `total`, `totalPages`
- Date format: ISO 8601 (e.g., `2025-01-15T10:30:00Z`)

### Frontend localStorage Keys:
- `adminAuth`: "true" when admin is logged in
- `titanVideos`: Array of video objects
- `titanCategories`: Array of category objects
- `titanAds`: Array of ad objects
- `titan_site_settings`: Site settings object

**Note**: The frontend currently uses localStorage for demo purposes. The backend should be the source of truth, and the frontend will be updated to fetch all data from API endpoints.

---

## 🏁 Quick Start Commands

```bash
# Clone/Create project
mkdir titan-backend && cd titan-backend
go mod init titan-backend

# Install dependencies
go get -u github.com/go-chi/chi/v5
go get -u github.com/go-chi/cors
go get -u github.com/golang-jwt/jwt/v5
go get -u github.com/mattn/go-sqlite3
go get -u github.com/go-playground/validator/v10
go get -u golang.org/x/crypto/bcrypt
go get -u github.com/joho/godotenv
go get -u github.com/google/uuid

# Create directories
mkdir -p internal/{handlers,models,middleware,database,services,utils}
mkdir -p storage/{videos,thumbnails,ads}
mkdir -p cmd/server

# Create .env file
cp .env.example .env

# Build and run
go build -o bin/titan-backend cmd/server/main.go
./bin/titan-backend

# Or run directly
go run cmd/server/main.go
```

---

**END OF BACKEND ARCHITECTURE DOCUMENT**

This document provides complete specifications for building a production-ready Go backend for the Titan media streaming platform. All endpoint specifications, database schemas, authentication flows, and implementation details are included for another AI assistant to build the complete system.
