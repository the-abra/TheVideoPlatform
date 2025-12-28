# Development Guide - TheVideoPlatform

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Backend Structure](#backend-structure)
3. [Frontend Structure](#frontend-structure)
4. [Development Workflow](#development-workflow)
5. [Error Handling](#error-handling)
6. [Logging](#logging)
7. [Security](#security)
8. [Testing](#testing)

## Architecture Overview

TheVideoPlatform is a full-stack video streaming platform built with:

**Backend:**
- **Language:** Go 1.21+
- **Framework:** Chi router
- **Database:** SQLite (can be swapped for PostgreSQL/MySQL)
- **Architecture:** Layered architecture (handlers → services → repositories)

**Frontend:**
- **Framework:** Next.js 16+ (React 19)
- **Language:** TypeScript (strict mode)
- **UI Library:** Radix UI components
- **Styling:** TailwindCSS 4.x

## Backend Structure

### Directory Layout

```
backend/
├── cmd/
│   ├── server/           # Main application entry point
│   └── migrate-urls/     # URL migration utility
├── internal/
│   ├── cache/           # Caching layer
│   ├── database/        # Database initialization and migrations
│   ├── errors/          # Structured error handling
│   ├── handlers/        # HTTP request handlers
│   ├── logger/          # Structured logging system
│   ├── middleware/      # HTTP middleware (auth, rate limiting, validation)
│   ├── models/          # Data models and repositories
│   ├── services/        # Business logic layer
│   └── utils/           # Utility functions
└── storage/             # File storage (videos, thumbnails, etc.)
```

### Layer Responsibilities

#### 1. Handlers Layer (`internal/handlers/`)

**Purpose:** Handle HTTP requests/responses, input validation, authentication

**Files:**
- `file_operations.go` - Core file CRUD operations
- `share_handler.go` - File sharing functionality
- `directory_handler.go` - Folder management
- `video_handler.go` - Video management
- `auth_handler.go` - Authentication
- `category_handler.go` - Category management
- `ad_handler.go` - Advertisement system
- `terminal_handler.go` - WebSocket terminal access
- `server_handler.go` - Server monitoring and management

**Best Practices:**
- Keep handlers thin - delegate business logic to services
- Use structured logging with component tags
- Return structured errors using the `errors` package
- Validate and sanitize all user input using `middleware` package

**Example:**
```go
func (h *FileOperations) Upload(w http.ResponseWriter, r *http.Request) {
    logger := logger.New("FileOps", false)

    // Parse and validate input
    if err := r.ParseMultipartForm(100 << 20); err != nil {
        logger.Error("Failed to parse upload form", map[string]interface{}{
            "ip": r.RemoteAddr,
            "error": err.Error(),
        })
        models.RespondError(w, "Failed to parse form", http.StatusBadRequest)
        return
    }

    // Delegate to service layer
    savedName, savedPath, err := h.fileService.SaveFileToPath(file, header, folderPath)
    if err != nil {
        appErr := errors.FileSystem("Failed to save file", err)
        logger.Error(appErr.Message, map[string]interface{}{
            "filename": header.Filename,
            "error": err.Error(),
        })
        models.RespondError(w, appErr.Message, appErr.HTTPStatus)
        return
    }

    logger.Info("File uploaded", map[string]interface{}{
        "filename": savedName,
        "size": header.Size,
        "path": savedPath,
    })

    models.RespondSuccess(w, "File uploaded successfully", data, http.StatusCreated)
}
```

#### 2. Services Layer (`internal/services/`)

**Purpose:** Business logic, data transformation, orchestration

**Files:**
- `file_service.go` - File operations (save, delete, scan directories)
- `auth_service.go` - JWT token generation/validation
- `storage_service.go` - Storage management
- `analytics_service.go` - Analytics and metrics

**Best Practices:**
- Encapsulate business rules
- Return structured errors
- Don't handle HTTP directly
- Use dependency injection

#### 3. Repositories/Models Layer (`internal/models/`)

**Purpose:** Data access, database queries

**Files:**
- `file_repository.go` - File share database operations
- `user_repository.go` - User management
- `video_repository.go` - Video database operations

**Best Practices:**
- One repository per entity
- Return domain models, not database rows
- Handle database errors gracefully

### Middleware

#### Available Middleware (`internal/middleware/`)

1. **Authentication** (`auth.go`)
   - JWT token validation
   - User context injection

2. **Rate Limiting** (`rate_limit.go`)
   - Configurable rate limits per endpoint
   - IP-based limiting

3. **Validation** (`validation.go`)
   - Input sanitization (SQL injection, XSS prevention)
   - Filename validation
   - Path traversal prevention

4. **Security** (`security.go`)
   - VPN detection
   - Ad blocker detection
   - CORS configuration

5. **Logging** (`logger.go`)
   - Request/response logging
   - Performance metrics

6. **Recovery** (`recovery.go`)
   - Panic recovery
   - Graceful error responses

## Error Handling

### New Structured Error System

Location: `internal/errors/errors.go`

#### Error Codes

```go
const (
    // Client errors
    ErrBadRequest       = "BAD_REQUEST"
    ErrUnauthorized     = "UNAUTHORIZED"
    ErrForbidden        = "FORBIDDEN"
    ErrNotFound         = "NOT_FOUND"

    // Server errors
    ErrInternal         = "INTERNAL_ERROR"
    ErrDatabase         = "DATABASE_ERROR"
    ErrFileSystem       = "FILESYSTEM_ERROR"

    // Business logic errors
    ErrFileNotFound     = "FILE_NOT_FOUND"
    ErrShareExpired     = "SHARE_EXPIRED"
)
```

#### Usage Examples

```go
// Simple error
return errors.NotFound("Video not found")

// Error with details
return errors.FileNotFoundError(filename)

// Wrapping errors
if err := os.Remove(filePath); err != nil {
    return errors.FileSystem("Failed to delete file", err).
        WithDetails("filename", filename)
}

// In handlers
if err != nil {
    appErr := errors.Internal("Unexpected error", err)
    models.RespondError(w, appErr.Message, appErr.HTTPStatus)
    return
}
```

## Logging

### Structured Logger

Location: `internal/logger/logger.go`

#### Log Levels

- **DEBUG** - Detailed diagnostic information
- **INFO** - General informational messages
- **WARN** - Warning messages for potentially harmful situations
- **ERROR** - Error events that might still allow the application to continue
- **FATAL** - Severe error events that lead the application to abort

#### Usage

```go
import "titan-backend/internal/logger"

// Initialize logger (typically in main.go)
logger.Init("app", false) // false = pretty print, true = JSON
logger.SetGlobalLevel(logger.INFO)

// Create component-specific logger
log := logger.New("FileOps", false)

// Log messages
log.Debug("Processing file upload")
log.Info("File uploaded", map[string]interface{}{
    "filename": "video.mp4",
    "size": 12345,
    "user_id": userID,
})
log.Warn("Deprecated API called", map[string]interface{}{
    "endpoint": "/api/old",
})
log.Error("Failed to save file", map[string]interface{}{
    "filename": "video.mp4",
    "error": err.Error(),
})
log.Fatal("Database connection failed") // Exits program
```

#### Output Format

**Development (pretty print):**
```
2025-12-28T23:00:00Z [INFO] [FileOps] File uploaded | filename=video.mp4, size=12345
2025-12-28T23:01:00Z [ERROR] [FileOps] Failed to save | error=disk full (file_operations.go:120)
```

**Production (JSON):**
```json
{
  "timestamp": "2025-12-28T23:00:00Z",
  "level": "INFO",
  "component": "FileOps",
  "message": "File uploaded",
  "fields": {
    "filename": "video.mp4",
    "size": 12345
  }
}
```

## Security

### Security Measures Implemented

1. **Input Validation**
   - SQL injection prevention
   - XSS protection via sanitization
   - Path traversal protection
   - Filename validation

2. **Authentication**
   - JWT-based authentication
   - Secure password hashing (bcrypt)
   - Token expiry

3. **Rate Limiting**
   - IP-based rate limits
   - Different limits per endpoint type:
     - General API: 100 req/min
     - Login: 5 req/min
     - Upload: 10 req/hour

4. **CORS**
   - Environment-aware configuration
   - Whitelist-based origin validation
   - Development vs production modes

5. **VPN/Ad-blocker Detection**
   - Optional VPN blocking
   - Ad-blocker detection

### Security Best Practices

1. **Never log sensitive data**
   ```go
   // Bad
   log.Info("Login attempt", map[string]interface{}{
       "password": password, // DON'T DO THIS
   })

   // Good
   log.Info("Login attempt", map[string]interface{}{
       "username": username,
       "ip": r.RemoteAddr,
   })
   ```

2. **Always validate input**
   ```go
   filename = middleware.SanitizeString(filename)
   if valid, msg := middleware.ValidateVideoTitle(title); !valid {
       return errors.Validation(msg)
   }
   ```

3. **Use prepared statements** (already handled by repository layer)

4. **Check authentication**
   ```go
   r.Group(func(r chi.Router) {
       r.Use(middleware.AuthMiddleware(authService))
       // Protected routes here
   })
   ```

## Development Workflow

### Starting the Application

#### Backend

```bash
cd backend
go mod download
go run cmd/server/main.go
```

Environment variables (.env):
```env
PORT=5000
ENV=development
DATABASE_PATH=./titan.db
JWT_SECRET=your-secret-key
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASS=admin123
STORAGE_PATH=./storage
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Environment variables (.env.local):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Building for Production

#### Backend
```bash
cd backend
go build -o server cmd/server/main.go
./server
```

#### Frontend
```bash
cd frontend
npm run build
npm start
```

### Code Quality

#### Go

```bash
# Format code
go fmt ./...

# Run linter
golangci-lint run

# Run tests
go test ./...

# Check for security issues
gosec ./...
```

#### TypeScript/Frontend

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format
```

### Common Development Tasks

#### Adding a New API Endpoint

1. **Create handler method** in appropriate handler file
2. **Add business logic** in service layer if needed
3. **Register route** in `main.go`
4. **Add authentication** if required
5. **Test the endpoint**

Example:
```go
// 1. Handler (handlers/file_operations.go)
func (h *FileOperations) GetFileStats(w http.ResponseWriter, r *http.Request) {
    stats, err := h.fileService.GetStats()
    if err != nil {
        // handle error
    }
    models.RespondSuccess(w, "", stats, http.StatusOK)
}

// 2. Service (services/file_service.go)
func (s *FileService) GetStats() (*FileStats, error) {
    // business logic
}

// 3. Register route (cmd/server/main.go)
r.Get("/api/files/stats", fileOpsHandler.GetFileStats)
```

#### Adding a New Database Table

1. Create migration in `internal/database/migrations.go`
2. Add model struct in `internal/models/`
3. Create repository in `internal/models/`
4. Run migrations on next server start

## Testing

### Unit Testing

```go
// handlers/file_operations_test.go
func TestFileUpload(t *testing.T) {
    // Setup
    mockService := &MockFileService{}
    handler := NewFileOperations(nil, mockService)

    // Test
    req := httptest.NewRequest("POST", "/api/files/upload", body)
    w := httptest.NewRecorder()

    handler.Upload(w, req)

    // Assert
    assert.Equal(t, http.StatusCreated, w.Code)
}
```

### Integration Testing

```go
func TestFileUploadIntegration(t *testing.T) {
    // Setup real database and services
    db := setupTestDB(t)
    defer db.Close()

    // Run test against real handlers
    // ...
}
```

## Performance Optimization

### Caching

Location: `internal/cache/`

```go
// Use Redis or in-memory cache
cache := cache.New()
cache.Set("key", value, 5*time.Minute)
val, exists := cache.Get("key")
```

### Database Optimization

- Use indexes for frequently queried columns
- Batch operations when possible
- Use prepared statements (automatic with repository pattern)
- Connection pooling

### File Storage Optimization

- Store files outside the database
- Use CDN for static assets in production
- Implement file chunking for large uploads

## Troubleshooting

### Common Issues

1. **"CORS error"**
   - Check `ALLOWED_ORIGINS` in backend .env
   - Verify frontend URL matches allowed origins
   - Check ENV mode (development vs production)

2. **"Authentication failed"**
   - Check JWT_SECRET matches between requests
   - Verify token is not expired
   - Check token format in Authorization header

3. **"File not found"**
   - Verify STORAGE_PATH is correct
   - Check file permissions
   - Ensure directory exists

4. **"Rate limit exceeded"**
   - Wait for rate limit window to reset
   - Adjust rate limits in main.go if needed for development

## Additional Resources

- [Go Chi Router Docs](https://github.com/go-chi/chi)
- [Next.js Documentation](https://nextjs.org/docs)
- [Radix UI Components](https://www.radix-ui.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

## Contributing

1. Follow the existing code structure
2. Use the structured logger for all logging
3. Use the errors package for error handling
4. Add tests for new features
5. Update documentation
6. Run linters before committing

## License

[Your License Here]
