# TheVideoPlatform

A modern, full-stack video streaming platform built with Go and Next.js, featuring integrated file storage, real-time server monitoring, and comprehensive content management.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/go-1.21%2B-00ADD8)
![Next.js](https://img.shields.io/badge/next.js-16%2B-black)

## ✨ Features

### Core Functionality
- 🎥 **Video Management** - Upload, organize, and stream videos with support for external sources
- 📁 **File Drive** - Integrated file storage system with folder hierarchy and file preview
- 🔗 **Secure File Sharing** - Share files with expiry dates, download limits, and unique tokens
- 📊 **Analytics Dashboard** - Track views, popular content, and engagement metrics
- 💬 **Category System** - Organize content with customizable categories and icons
- 📺 **Advertisement Management** - Built-in ad system with click/impression tracking

### Advanced Features
- 🔐 **JWT Authentication** - Secure user authentication with role-based access
- 🖥️ **Server Management** - Real-time monitoring with WebSocket-based metrics
- 🔒 **Security** - Rate limiting, input validation, VPN/ad-blocker detection
- 🎨 **Modern UI** - Beautiful, responsive interface built with Next.js and Radix UI
- 🛠️ **Web Terminal** - Browser-based terminal access for server administration
- 📈 **Real-time Updates** - WebSocket support for live metrics and logs

### Recent Improvements ✨
- ✅ **Refactored Backend** - Split large handlers into focused, maintainable modules
- ✅ **Structured Logging** - Production-ready logging with component tags and JSON output
- ✅ **Error Handling** - Type-safe error codes with proper HTTP status mapping
- ✅ **Comprehensive Docs** - Complete API reference and development guide

## 🚀 Quick Start

### Option 1: Docker (Recommended)

**Prerequisites:** Docker and Docker Compose

```bash
# 1. Clone repository
git clone <repository-url>
cd TheVideoPlatform

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings (change passwords!)

# 3. Start all services
docker compose up -d

# 4. Check status
docker compose ps

# 5. Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Admin Panel: http://localhost:3000/admin
```

**Services included:** PostgreSQL, Redis, Backend API, Frontend

See **[Docker Deployment Guide](./DOCKER_DEPLOYMENT.md)** for detailed instructions.

### Option 2: Local Development

**Prerequisites:** Go 1.21+, Node.js 18+, npm/yarn

```bash
# 1. Clone the repository
git clone <repository-url>
cd TheVideoPlatform

# 2. Set up the backend
cd backend
cp .env.example .env  # Edit with your configuration
go mod download
go run cmd/server/main.go

# 3. Set up the frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local  # Edit with your backend URL
npm run dev

# 4. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Admin Panel: http://localhost:3000/admin
```

### Default Credentials

```
Username: admin
Password: admin123
```

⚠️ **IMPORTANT:** Change these credentials immediately in production!

## 📚 Documentation

- **[Docker Deployment Guide](./DOCKER_DEPLOYMENT.md)** - Production deployment with Docker (recommended)
- **[API Reference](./API_REFERENCE.md)** - Complete API endpoint documentation
- **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Architecture, best practices, and development workflow

## 🏗️ Architecture

### Tech Stack

**Backend:**
- **Language:** Go 1.21+
- **Framework:** Chi Router
- **Database:** PostgreSQL (production) / SQLite (local dev)
- **Cache:** Redis
- **Authentication:** JWT
- **WebSockets:** Native Go support

**Frontend:**
- **Framework:** Next.js 16+ (React 19)
- **Language:** TypeScript (strict mode)
- **UI Library:** Radix UI
- **Styling:** TailwindCSS 4.x
- **State:** React Hooks

### Project Structure

```
TheVideoPlatform/
├── backend/
│   ├── cmd/
│   │   └── server/          # Application entry point
│   ├── internal/
│   │   ├── cache/           # Caching layer
│   │   ├── database/        # Database & migrations
│   │   ├── errors/          # Structured error handling
│   │   ├── handlers/        # HTTP handlers (modular)
│   │   ├── logger/          # Structured logging
│   │   ├── middleware/      # Auth, rate limiting, validation
│   │   ├── models/          # Data models & repositories
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities
│   ├── migrations/          # Database migrations
│   ├── storage/             # File storage
│   ├── Dockerfile           # Backend container
│   └── .env.example         # Environment template
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities
│   ├── public/              # Static assets
│   ├── Dockerfile           # Frontend container
│   └── .env.example         # Environment template
├── docker-compose.yml       # Container orchestration
├── .env.example             # Docker environment template
├── DOCKER_DEPLOYMENT.md     # Deployment guide
├── API_REFERENCE.md         # API documentation
├── DEVELOPMENT_GUIDE.md     # Development guide
└── README.md                # This file
```

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Server
PORT=5000
ENV=development  # or production

# Database
DATABASE_PATH=./titan.db

# Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY_HOURS=72
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASS=admin123

# Storage
STORAGE_PATH=./storage
VIDEO_PATH=./storage/videos
THUMBNAIL_PATH=./storage/thumbnails
AD_PATH=./storage/ads

# CORS
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### Frontend Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 🛠️ Development

### Running Tests

```bash
# Backend
cd backend
go test ./...

# Frontend
cd frontend
npm test
```

### Building for Production

```bash
# Backend
cd backend
go build -o server cmd/server/main.go

# Frontend
cd frontend
npm run build
npm start
```

## 📖 API Examples

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Upload File
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@video.mp4"

# Create Share Link
curl -X POST http://localhost:5000/api/files/path/to/file.mp4/share \
  -H "Authorization: Bearer <token>" \
  -d '{"expiryHours": 24}'
```

For complete API documentation, see [API_REFERENCE.md](./API_REFERENCE.md).

## 🔒 Security Features

- ✅ JWT Authentication & Authorization
- ✅ Rate Limiting (configurable per endpoint)
- ✅ Input Validation (SQL injection, XSS, path traversal protection)
- ✅ CORS Protection (environment-aware)
- ✅ Secure Password Hashing (bcrypt)
- ✅ VPN Detection (optional)
- ✅ Structured Error Messages (no system info leakage)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow existing code style and use structured logging/errors
4. Add tests for new features
5. Update documentation
6. Commit changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for detailed guidelines.

## 🐛 Troubleshooting

**"CORS error"** - Check `ALLOWED_ORIGINS` in backend `.env`
**"Authentication failed"** - Verify `JWT_SECRET` consistency and token format
**"File upload fails"** - Check `STORAGE_PATH` permissions and disk space
**"WebSocket connection fails"** - Verify protocol and authentication token

For more help, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#troubleshooting).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Go Chi](https://github.com/go-chi/chi) - HTTP router
- [Next.js](https://nextjs.org/) - React framework
- [Radix UI](https://www.radix-ui.com/) - UI components
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [SQLite](https://www.sqlite.org/) - Database