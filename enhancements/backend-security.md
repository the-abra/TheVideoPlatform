# Backend Security Enhancements for Titan UI/UX Design Platform

## Overview
This document outlines security enhancements for the Go-based backend of the Titan UI/UX Design Platform. These improvements will strengthen the application's security posture and protect against common vulnerabilities.

## Authentication & Authorization

### 1. Stronger Password Requirements
- Implement minimum 12-character passwords with special character requirements
- Add password strength validation using libraries like `password-validator`
- Example implementation:
```go
func validatePassword(password string) error {
    if len(password) < 12 {
        return errors.New("password must be at least 12 characters")
    }
    hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
    hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
    hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
    hasSpecial := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).MatchString(password)
    
    if !hasUpper || !hasLower || !hasNumber || !hasSpecial {
        return errors.New("password must contain uppercase, lowercase, number, and special character")
    }
    return nil
}
```

### 2. Enhanced Password Hashing
- Upgrade bcrypt cost factor to 12 or higher
- Example implementation:
```go
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12) // Increased cost
    return string(bytes), err
}
```

### 3. Rate Limiting for Login Attempts
- Implement rate limiting using libraries like `golang.org/x/time/rate`
- Example implementation:
```go
import "golang.org/x/time/rate"

var loginLimiter = make(map[string]*rate.Limiter)
var mu sync.RWMutex

func getLoginLimiter(key string) *rate.Limiter {
    mu.Lock()
    defer mu.Unlock()
    
    limiter, exists := loginLimiter[key]
    if !exists {
        limiter = rate.NewLimiter(5, 5) // 5 attempts per 15 minutes
        loginLimiter[key] = limiter
    }
    return limiter
}
```

### 4. JWT Refresh Token Implementation
- Implement refresh token rotation
- Store refresh tokens in a secure database
- Example implementation:
```go
type RefreshToken struct {
    ID        int       `json:"id"`
    Token     string    `json:"token"`
    UserID    int       `json:"userId"`
    ExpiresAt time.Time `json:"expiresAt"`
    Revoked   bool      `json:"revoked"`
}

func (s *AuthService) GenerateRefreshToken(userID int) (string, error) {
    refreshToken := uuid.New().String()
    expiry := time.Now().Add(7 * 24 * time.Hour) // 7 days
    
    // Store in database
    _, err := s.db.Exec(
        "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)",
        refreshToken, userID, expiry,
    )
    if err != nil {
        return "", err
    }
    
    return refreshToken, nil
}
```

## Input Validation & Sanitization

### 1. Comprehensive Input Validation
- Implement validation for all API endpoints using a validation library
- Example implementation:
```go
import "github.com/go-playground/validator/v10"

type LoginRequest struct {
    Username string `json:"username" validate:"required,min=3,max=50,alphanum"`
    Password string `json:"password" validate:"required,min=8,max=100"`
}

func validateStruct(s interface{}) []*ErrorResponse {
    var errors []*ErrorResponse
    validate := validator.New()
    err := validate.Struct(s)
    if err != nil {
        for _, err := range err.(validator.ValidationErrors) {
            var element ErrorResponse
            element.FailedField = err.StructNamespace()
            element.Tag = err.Tag()
            element.Value = err.Param()
            errors = append(errors, &element)
        }
    }
    return errors
}
```

### 2. File Upload Security
- Implement strict file type validation by checking actual file content
- Example implementation:
```go
import (
    "github.com/h2non/filetype"
    "io"
)

func ValidateFileContent(file multipart.File) error {
    buffer := make([]byte, 512)
    _, err := file.Read(buffer)
    if err != nil {
        return err
    }
    
    // Reset file pointer
    file.Seek(0, 0)
    
    // Detect file type
    kind, err := filetype.Match(buffer)
    if err != nil {
        return err
    }
    
    // Define allowed file types
    allowedTypes := []string{"image/jpeg", "image/png", "image/gif", "video/mp4", "video/avi"}
    for _, allowedType := range allowedTypes {
        if kind.MIME.Value == allowedType {
            return nil
        }
    }
    
    return fmt.Errorf("file type not allowed: %s", kind.MIME.Value)
}
```

## API Security

### 1. Rate Limiting Implementation
- Add API request rate limiting per user/IP
- Example implementation:
```go
type RateLimiter struct {
    requests map[string]*rate.Limiter
    mu       sync.RWMutex
}

func NewRateLimiter() *RateLimiter {
    rl := &RateLimiter{
        requests: make(map[string]*rate.Limiter),
    }
    return rl
}

func (rl *RateLimiter) Allow(key string) bool {
    rl.mu.Lock()
    limiter, exists := rl.requests[key]
    if !exists {
        limiter = rate.NewLimiter(10, 30) // 10 requests per second, burst of 30
        rl.requests[key] = limiter
    }
    rl.mu.Unlock()
    
    return limiter.Allow()
}

func RateLimitMiddleware(rl *RateLimiter) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            key := r.RemoteAddr // Use IP address as key
            if !rl.Allow(key) {
                models.RespondError(w, "Rate limit exceeded", http.StatusTooManyRequests)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

### 2. Enhanced CORS Configuration
- Implement proper CORS for production environments
- Example implementation:
```go
func configureCORS(env string) cors.Options {
    if env == "production" {
        return cors.Options{
            AllowedOrigins: []string{
                "https://yourdomain.com",
                "https://www.yourdomain.com",
            },
            AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
            AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
            ExposedHeaders:   []string{"Link"},
            AllowCredentials: true,
            MaxAge:           300,
        }
    }
    // Development configuration
    return cors.Options{
        AllowedOrigins: []string{"*"},
        AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
        AllowCredentials: true,
        MaxAge:           300,
    }
}
```

## Database Security

### 1. Data Encryption at Rest
- Implement encryption for sensitive data in the database
- Example implementation:
```go
import "crypto/aes"

type EncryptedData struct {
    Encrypted []byte
    IV        []byte
}

func encryptData(data string, key []byte) (*EncryptedData, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }
    
    plaintext := []byte(data)
    // Pad the plaintext to be a multiple of the block size
    padding := aes.BlockSize - len(plaintext)%aes.BlockSize
    padtext := bytes.Repeat([]byte{byte(padding)}, padding)
    plaintext = append(plaintext, padtext...)
    
    // Generate a random IV
    iv := make([]byte, aes.BlockSize)
    if _, err := io.ReadFull(rand.Reader, iv); err != nil {
        return nil, err
    }
    
    // Encrypt the data
    ciphertext := make([]byte, len(plaintext))
    mode := cipher.NewCBCEncrypter(block, iv)
    mode.CryptBlocks(ciphertext, plaintext)
    
    return &EncryptedData{
        Encrypted: ciphertext,
        IV:        iv,
    }, nil
}
```

### 2. Secure Database Connection
- Implement proper connection pooling and security
- Example implementation:
```go
func InitSecureDB(dsn string) (*sql.DB, error) {
    db, err := sql.Open("sqlite3", dsn)
    if err != nil {
        return nil, err
    }
    
    // Set connection pool parameters
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(25)
    db.SetConnMaxLifetime(5 * time.Minute)
    
    // Test the connection
    if err := db.Ping(); err != nil {
        return nil, err
    }
    
    return db, nil
}
```

## Environment Security

### 1. Secure JWT Secret Handling
- Implement secure JWT secret management
- Example implementation:
```go
func GetSecureJWTSecret() (string, error) {
    // First, try to get from environment
    secret := os.Getenv("JWT_SECRET")
    if secret != "" {
        return secret, nil
    }
    
    // If not in environment, try to read from a secure file
    secretFile := os.Getenv("JWT_SECRET_FILE")
    if secretFile != "" {
        data, err := os.ReadFile(secretFile)
        if err != nil {
            return "", fmt.Errorf("failed to read JWT secret file: %v", err)
        }
        return strings.TrimSpace(string(data)), nil
    }
    
    // If no secret is provided, return an error
    return "", errors.New("no JWT secret provided")
}
```

### 2. Configuration Management
- Implement secure configuration management
- Example implementation:
```go
type SecureConfig struct {
    Port          string `env:"PORT" envDefault:"5000"`
    DatabasePath  string `env:"DATABASE_PATH" envDefault:"./titan.db"`
    JWTSecret     string `env:"JWT_SECRET"`
    JWTExpiryHours int   `env:"JWT_EXPIRY_HOURS" envDefault:"24"`
    AllowedOrigins string `env:"ALLOWED_ORIGINS" envDefault:"http://localhost:3000"`
    MaxVideoSizeMB int64 `env:"MAX_VIDEO_SIZE_MB" envDefault:"2048"`
    MaxImageSizeMB int64 `env:"MAX_IMAGE_SIZE_MB" envDefault:"5"`
    StoragePath   string `env:"STORAGE_PATH" envDefault:"./storage"`
    VideoPath     string `env:"VIDEO_PATH" envDefault:"./storage/videos"`
    ThumbnailPath string `env:"THUMBNAIL_PATH" envDefault:"./storage/thumbnails"`
    ADPath        string `env:"AD_PATH" envDefault:"./storage/ads"`
    DefaultAdminUsername string `env:"DEFAULT_ADMIN_USERNAME" envDefault:"admin"`
    DefaultAdminPassword string `env:"DEFAULT_ADMIN_PASSWORD" envDefault:"admin"`
}

func LoadSecureConfig() (*SecureConfig, error) {
    cfg := &SecureConfig{}
    if err := env.Parse(cfg); err != nil {
        return nil, fmt.Errorf("failed to parse config: %v", err)
    }
    
    // Validate required fields
    if cfg.JWTSecret == "" {
        return nil, errors.New("JWT_SECRET is required")
    }
    
    return cfg, nil
}
```

## Additional Security Measures

### 1. Secure File Storage
- Implement secure file storage with proper access controls
- Example implementation:
```go
type SecureFileService struct {
    storagePath string
    allowedExtensions map[string]bool
}

func NewSecureFileService(storagePath string) *SecureFileService {
    allowedExts := map[string]bool{
        ".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
        ".mp4": true, ".avi": true, ".mov": true, ".mkv": true,
        ".pdf": true, ".doc": true, ".docx": true,
    }
    
    // Create storage directory if it doesn't exist
    drivePath := filepath.Join(storagePath, "drive")
    os.MkdirAll(drivePath, 0750) // More restrictive permissions
    
    return &SecureFileService{
        storagePath: drivePath,
        allowedExtensions: allowedExts,
    }
}

func (s *SecureFileService) SaveSecureFile(file multipart.File, header *multipart.FileHeader) (string, string, error) {
    // Validate file extension
    ext := strings.ToLower(filepath.Ext(header.Filename))
    if !s.allowedExtensions[ext] {
        return "", "", fmt.Errorf("file extension not allowed: %s", ext)
    }
    
    // Validate file content
    if err := ValidateFileContent(file); err != nil {
        return "", "", fmt.Errorf("file content validation failed: %v", err)
    }
    
    // Generate secure filename
    uniqueName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
    filePath := filepath.Join(s.storagePath, uniqueName)
    
    // Create destination file with restricted permissions
    dst, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
    if err != nil {
        return "", "", fmt.Errorf("failed to create file: %w", err)
    }
    defer dst.Close()
    
    // Copy file content
    if _, err := io.Copy(dst, file); err != nil {
        os.Remove(filePath)
        return "", "", fmt.Errorf("failed to save file: %w", err)
    }
    
    return uniqueName, filePath, nil
}
```

### 2. Security Headers Middleware
- Add security headers to HTTP responses
- Example implementation:
```go
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Set security headers
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("X-XSS-Protection", "1; mode=block")
        w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
        w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;")
        
        next.ServeHTTP(w, r)
    })
}
```

## Implementation Checklist

- [ ] Implement stronger password requirements and validation
- [ ] Upgrade bcrypt cost factor to 12+
- [ ] Add rate limiting for login attempts
- [ ] Implement JWT refresh token mechanism
- [ ] Add comprehensive input validation
- [ ] Implement file type validation by content
- [ ] Add API request rate limiting
- [ ] Configure proper CORS for production
- [ ] Implement data encryption at rest
- [ ] Secure database connections
- [ ] Implement secure JWT secret handling
- [ ] Add security headers middleware
- [ ] Implement secure file storage
- [ ] Add comprehensive logging for security events
- [ ] Implement proper error handling without information disclosure
- [ ] Add session management and logout functionality