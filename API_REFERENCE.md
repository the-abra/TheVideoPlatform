# API Reference - TheVideoPlatform

## Base URL

**Development:** `http://localhost:5000`
**Production:** `https://your-domain.com`

## Authentication

Most endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": 1,
      "username": "admin"
    }
  }
}
```

### Verify Token

```http
GET /api/auth/verify
Authorization: Bearer <token>
```

## Videos

### List All Videos

```http
GET /api/videos
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": 1,
        "title": "Video Title",
        "url": "https://...",
        "creator": "Creator Name",
        "thumbnail": "https://...",
        "category": "entertainment",
        "duration": "10:30",
        "views": 1234,
        "createdAt": "2025-12-28T10:00:00Z"
      }
    ]
  }
}
```

### Get Single Video

```http
GET /api/videos/:id
```

### Create Video (Protected)

```http
POST /api/videos
Authorization: Bearer <token>
Content-Type: multipart/form-data

title=Video Title
url=https://...
creator=Creator Name
thumbnail=https://...
category=entertainment
duration=10:30
```

### Update Video (Protected)

```http
PUT /api/videos/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "url": "https://...",
  "creator": "Creator Name",
  "thumbnail": "https://...",
  "category": "education",
  "duration": "15:00"
}
```

### Delete Video (Protected)

```http
DELETE /api/videos/:id
Authorization: Bearer <token>
```

### Increment View Count

```http
POST /api/videos/:id/view
```

### Search Videos

```http
GET /api/videos/search?q=search+term
```

## Categories

### List All Categories

```http
GET /api/categories
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "Entertainment",
        "icon": "🎬"
      }
    ]
  }
}
```

### Create Category (Protected)

```http
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Education",
  "icon": "📚"
}
```

### Update Category (Protected)

```http
PUT /api/categories/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "icon": "📖"
}
```

### Delete Category (Protected)

```http
DELETE /api/categories/:id
Authorization: Bearer <token>
```

## File Management (Drive)

### List Files

```http
GET /api/files?folderPath=path/to/folder
Authorization: Bearer <token>
```

**Query Parameters:**
- `folderPath` (optional) - Path to folder, defaults to root

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "name": "video.mp4",
        "path": "path/to/video.mp4",
        "size": 1024000,
        "mimeType": "video/mp4",
        "extension": ".mp4",
        "createdAt": "2025-12-28T10:00:00Z",
        "icon": "🎥",
        "formattedSize": "1.0 MB"
      }
    ],
    "folders": [
      {
        "name": "MyFolder",
        "path": "path/to/MyFolder",
        "createdAt": "2025-12-28T10:00:00Z",
        "size": 0
      }
    ],
    "totalFiles": 10,
    "totalSize": 10240000,
    "folderPath": "path/to/folder"
  }
}
```

### Upload File

```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<binary-file-data>
folderPath=path/to/folder (optional)
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file": {
      "name": "video.mp4",
      "path": "path/to/video.mp4",
      "size": 1024000,
      "mimeType": "video/mp4",
      "extension": ".mp4",
      "createdAt": "2025-12-28T10:00:00Z",
      "icon": "🎥",
      "formattedSize": "1.0 MB"
    }
  }
}
```

### Get File Info

```http
GET /api/files/:path
Authorization: Bearer <token>
```

### Download File

```http
GET /api/files/:path/download
Authorization: Bearer <token>
```

### Preview File

```http
GET /api/files/:path/preview
Authorization: Bearer <token>
```

### Rename File

```http
PUT /api/files/:path/rename
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "new-name.mp4"
}
```

### Delete File

```http
DELETE /api/files/:path
Authorization: Bearer <token>
```

### Bulk Delete Files

```http
DELETE /api/files/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileNames": ["file1.mp4", "file2.mp4"]
}
```

### Create Share Link

```http
POST /api/files/:path/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "expiryHours": 24  // 0 for no expiry
}
```

**Response:**
```json
{
  "success": true,
  "message": "Share link created",
  "data": {
    "fileName": "video.mp4",
    "shareToken": "abc123",
    "shareUrl": "/share/abc123/raw"
  }
}
```

### Remove Share Link

```http
DELETE /api/files/:path/share
Authorization: Bearer <token>
```

## File Sharing (Public)

### Get Shared File Info

```http
GET /share/:token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "video.mp4",
    "size": 1024000,
    "mimeType": "video/mp4",
    "downloads": 5
  }
}
```

### Download Shared File

```http
GET /share/:token/download
```

## Folder Management

### Create Folder

```http
POST /api/folders
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "NewFolder",
  "parentPath": "path/to/parent"  // optional, defaults to root
}
```

### Delete Folder

```http
DELETE /api/folders/:path
Authorization: Bearer <token>
```

### Get Folder Path (Breadcrumb)

```http
GET /api/folders/:path/path
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "path": [
      {
        "name": "Folder1",
        "path": "Folder1",
        "createdAt": "2025-12-28T10:00:00Z",
        "size": 0
      },
      {
        "name": "Folder2",
        "path": "Folder1/Folder2",
        "createdAt": "2025-12-28T10:00:00Z",
        "size": 0
      }
    ]
  }
}
```

## Advertisements

### List All Ads

```http
GET /api/ads
```

### Get Ad by ID

```http
GET /api/ads/:id
```

### Get Ad Stats

```http
GET /api/ads/stats
```

### Create Ad (Protected)

```http
POST /api/ads
Authorization: Bearer <token>
Content-Type: multipart/form-data

title=Ad Title
targetUrl=https://...
placement=banner|sidebar|video
enabled=true
image=<binary-file-data>
```

### Update Ad (Protected)

```http
PUT /api/ads/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

title=Updated Title
targetUrl=https://...
placement=banner
enabled=true
image=<binary-file-data> (optional)
```

### Toggle Ad (Protected)

```http
PATCH /api/ads/:id/toggle
Authorization: Bearer <token>
```

### Delete Ad (Protected)

```http
DELETE /api/ads/:id
Authorization: Bearer <token>
```

### Track Ad Click

```http
POST /api/ads/:id/click
```

### Track Ad Impression

```http
POST /api/ads/:id/impression
```

## Analytics (Protected)

### Get Analytics

```http
GET /api/analytics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalVideos": 100,
    "totalViews": 5000,
    "totalCategories": 10,
    "recentVideos": [...],
    "popularVideos": [...],
    "viewsByCategory": {...}
  }
}
```

## Server Management (Protected)

### Get Server Info

```http
GET /api/server/info
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "os": "linux",
    "arch": "amd64",
    "goVersion": "go1.21.0",
    "uptime": 3600,
    "requestCount": 1000
  }
}
```

### Get Server Metrics (WebSocket)

```
ws://localhost:5000/ws/metrics
Authorization: Bearer <token>
```

**Messages:**
```json
{
  "cpuUsage": 25.5,
  "memoryUsage": 512000000,
  "diskUsage": 1024000000,
  "goroutines": 10,
  "timestamp": "2025-12-28T10:00:00Z"
}
```

### Get Server Logs (WebSocket)

```
ws://localhost:5000/ws/logs
Authorization: Bearer <token>
```

**Messages:**
```json
{
  "id": 1,
  "level": "info",
  "message": "Server started",
  "source": "main",
  "timestamp": "2025-12-28T10:00:00Z"
}
```

### Execute Command (Protected)

```http
POST /api/server/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "command": "ls -la"
}
```

### Restart Server (Protected)

```http
POST /api/server/restart
Authorization: Bearer <token>
```

### Shutdown Server (Protected)

```http
POST /api/server/shutdown
Authorization: Bearer <token>
```

## Settings

### Get Settings

```http
GET /api/settings
```

### Update Settings (Protected)

```http
PUT /api/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "siteName": "My Platform",
  "siteDescription": "Description",
  "maintenanceMode": false,
  "allowNewUploads": true,
  "featuredVideoId": 1
}
```

## Security

### Check VPN

```http
GET /api/check-vpn
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isVPN": false,
    "ip": "1.2.3.4"
  }
}
```

## WebSocket Endpoints

### Terminal

```
ws://localhost:5000/ws/terminal
Authorization: Bearer <token>
```

**Send:**
```json
{
  "type": "input",
  "data": "ls -la\n"
}
```

**Receive:**
```json
{
  "type": "output",
  "data": "total 64\ndrwxr-xr-x  ..."
}
```

### Server Metrics

```
ws://localhost:5000/ws/metrics
Authorization: Bearer <token>
```

### Server Logs

```
ws://localhost:5000/ws/logs
Authorization: Bearer <token>
```

## Response Format

All API responses follow this format:

### Success Response

```json
{
  "success": true,
  "message": "Optional success message",
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"  // Optional error code
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `BAD_REQUEST` | Invalid request data | 400 |
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource conflict | 409 |
| `VALIDATION_ERROR` | Validation failed | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `FILESYSTEM_ERROR` | File system operation failed | 500 |
| `FILE_NOT_FOUND` | File not found | 404 |
| `SHARE_EXPIRED` | Share link expired | 410 |
| `SHARE_LIMIT_REACHED` | Download limit reached | 403 |

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 1 minute |
| Login | 5 requests | 1 minute |
| Upload | 10 requests | 1 hour |

## File Size Limits

- **File Upload:** 100 MB
- **Video Upload:** 100 MB (configurable)

## Pagination

Currently not implemented. All list endpoints return complete results. Pagination will be added in future versions.

## Filtering & Sorting

### Search Videos

```http
GET /api/videos/search?q=search+term
```

Searches in:
- Video title
- Creator name
- Category

## Best Practices

1. **Always include Authorization header** for protected endpoints
2. **Handle rate limits** gracefully with exponential backoff
3. **Validate file types** before uploading
4. **Use share links** instead of direct file URLs for public sharing
5. **Close WebSocket connections** when not needed
6. **Check response status** and handle errors appropriately

## Example Client Code

### JavaScript/Fetch

```javascript
// Login
const login = async (username, password) => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await response.json()
  if (data.success) {
    localStorage.setItem('token', data.data.token)
    return data.data.token
  }
  throw new Error(data.error)
}

// Upload file
const uploadFile = async (file, folderPath = '') => {
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('file', file)
  if (folderPath) {
    formData.append('folderPath', folderPath)
  }

  const response = await fetch('http://localhost:5000/api/files/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  })

  return await response.json()
}

// WebSocket connection
const connectMetrics = () => {
  const token = localStorage.getItem('token')
  const ws = new WebSocket(`ws://localhost:5000/ws/metrics`)

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'auth', token }))
  }

  ws.onmessage = (event) => {
    const metrics = JSON.parse(event.data)
    console.log('Metrics:', metrics)
  }

  return ws
}
```

## Changelog

### Version 1.0.0 (2025-12-28)
- Initial API release
- File management endpoints
- Video streaming endpoints
- Authentication system
- WebSocket support for real-time features
