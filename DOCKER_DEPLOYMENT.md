# Docker Deployment Guide

Complete guide for deploying TheVideoPlatform using Docker.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Health Checks](#health-checks)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+ (or docker-compose 1.29+)
- Minimum 2GB RAM available
- Ports 3000, 5000, 5432, 6379 available

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Important:** Change these in production:
- `POSTGRES_PASSWORD` - Strong database password
- `JWT_SECRET` - Cryptographically secure random string
- `ADMIN_PASSWORD` - Strong admin password

### 2. Start Services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Check service status
docker compose ps
```

### 3. Verify Deployment

Backend health checks:
```bash
# Basic health
curl http://localhost:5000/health

# Detailed readiness
curl http://localhost:5000/health/ready

# Liveness probe
curl http://localhost:5000/health/live
```

Frontend health check:
```bash
curl http://localhost:3000/api/health
```

### 4. Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Admin Login:**
  - Username: `admin`
  - Password: (from `ADMIN_PASSWORD` in `.env`)

## Architecture

### Services

#### PostgreSQL
- **Image:** `postgres:15-alpine`
- **Port:** 5432
- **Volume:** `postgres_data`
- **Health Check:** `pg_isready`

#### Redis
- **Image:** `redis:7-alpine`
- **Port:** 6379
- **Volume:** `redis_data`
- **Persistence:** AOF enabled
- **Health Check:** `redis-cli ping`

#### Backend (Go)
- **Build:** Multi-stage Dockerfile
- **Port:** 5000
- **Volume:** `backend_storage` mounted at `/root/storage`
- **Dependencies:** PostgreSQL, Redis
- **Health Check:** `wget http://localhost:5000/health`

#### Frontend (Next.js)
- **Build:** Multi-stage Dockerfile with standalone output
- **Port:** 3000
- **Dependencies:** Backend
- **Health Check:** `wget http://localhost:3000/api/health`

#### Migrator
- **Image:** `migrate/migrate`
- **Purpose:** Database schema initialization
- **Runs:** Once on startup
- **Source:** `backend/migrations/`

### Network

All services run on a custom bridge network `titan-network` for service discovery and isolation.

### Volumes

- `postgres_data` - PostgreSQL database files
- `redis_data` - Redis persistence
- `backend_storage` - Uploaded videos, thumbnails, ads, files

## Configuration

### Environment Variables

#### Database
```bash
POSTGRES_PASSWORD=titan_dev_password  # Change in production
```

#### JWT Authentication
```bash
JWT_SECRET=your-secret-key-change-in-production  # 32+ random characters
JWT_EXPIRY_HOURS=72
```

#### Admin Credentials
```bash
ADMIN_PASSWORD=admin123  # Change in production
```

#### Optional Ports (if defaults conflict)
```bash
POSTGRES_PORT=5432
REDIS_PORT=6379
BACKEND_PORT=5000
FRONTEND_PORT=3000
```

### Custom Configuration

Edit `docker-compose.yml` to customize:

**Backend environment:**
```yaml
backend:
  environment:
    MAX_VIDEO_SIZE_MB: 2048
    MAX_IMAGE_SIZE_MB: 5
```

**PostgreSQL settings:**
```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=256MB"
```

## Health Checks

### Backend Endpoints

#### `/health` - Basic Health
```json
{
  "status": "healthy",
  "timestamp": "2025-12-29T00:00:00Z",
  "uptime": "1h23m45s"
}
```

#### `/health/ready` - Readiness Check
```json
{
  "status": "ready",
  "timestamp": "2025-12-29T00:00:00Z",
  "uptime": "1h23m45s",
  "database": {
    "status": "connected",
    "ping_time_ms": 2,
    "open_conns": 10,
    "in_use": 2,
    "idle": 8
  },
  "system": {
    "goroutines": 25,
    "memory_mb": 45,
    "sys_memory_mb": 120,
    "gc_cycles": 5
  },
  "environment": {
    "env": "production",
    "hostname": "titan-backend"
  }
}
```

#### `/health/live` - Liveness Probe
Simple text response: `OK`

### Frontend Endpoint

#### `/api/health`
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-12-29T00:00:00Z",
  "version": "1.0.0"
}
```

### Docker Health Check Status

```bash
# Check all service health
docker compose ps

# Expected output:
# NAME              STATUS                    PORTS
# titan-backend     Up (healthy)              0.0.0.0:5000->5000/tcp
# titan-frontend    Up (healthy)              0.0.0.0:3000->3000/tcp
# titan-postgres    Up (healthy)              0.0.0.0:5432->5432/tcp
# titan-redis       Up (healthy)              0.0.0.0:6379->6379/tcp
# titan-migrator    Exited (0)
```

## Production Deployment

### Security Checklist

- [ ] Change `POSTGRES_PASSWORD` to strong password
- [ ] Change `JWT_SECRET` to cryptographically secure random string (32+ chars)
- [ ] Change `ADMIN_PASSWORD` to strong password
- [ ] Set `ENV=production` in backend environment
- [ ] Configure `ALLOWED_ORIGINS` to specific frontend domain
- [ ] Set `FRONTEND_URL` to actual frontend URL
- [ ] Enable HTTPS/TLS (use reverse proxy like nginx or Traefik)
- [ ] Configure firewall rules
- [ ] Set up backup strategy for volumes
- [ ] Configure log aggregation
- [ ] Set up monitoring and alerts

### Reverse Proxy Example (nginx)

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Docker Compose Production Override

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    restart: always
    environment:
      ENV: production
      ALLOWED_ORIGINS: https://yourdomain.com
      FRONTEND_URL: https://yourdomain.com
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    restart: always
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api.yourdomain.com
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Deploy with:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Backup Strategy

#### Database Backup
```bash
# Create backup
docker compose exec postgres pg_dump -U titan titan > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
cat backup.sql | docker compose exec -T postgres psql -U titan titan
```

#### Volume Backup
```bash
# Backup all volumes
docker run --rm \
  -v titan_backend_storage:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/storage_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### Monitoring Setup

Add Prometheus exporters:

```yaml
# docker-compose.monitoring.yml
services:
  postgres-exporter:
    image: quay.io/prometheuscommunity/postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://titan:${POSTGRES_PASSWORD}@postgres:5432/titan?sslmode=disable"
    ports:
      - "9187:9187"

  redis-exporter:
    image: oliver006/redis_exporter
    command: --redis.addr=redis://redis:6379
    ports:
      - "9121:9121"
```

## Troubleshooting

### Service Won't Start

**Check logs:**
```bash
docker compose logs backend
docker compose logs frontend
docker compose logs postgres
```

**Common issues:**
1. **Port conflicts** - Change ports in docker-compose.yml
2. **Insufficient memory** - Increase Docker memory limit
3. **Permission errors** - Check volume ownership

### Database Connection Issues

**Test PostgreSQL:**
```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U titan

# Check connections
docker compose exec postgres psql -U titan -c "SELECT * FROM pg_stat_activity;"
```

**Reset database:**
```bash
docker compose down -v  # WARNING: Deletes all data
docker compose up -d
```

### Migration Failures

**Check migration status:**
```bash
docker compose logs migrator
```

**Manual migration:**
```bash
# Run migrations manually
docker compose run --rm migrator \
  -path /migrations \
  -database "postgresql://titan:password@postgres:5432/titan?sslmode=disable" \
  up
```

**Rollback migration:**
```bash
docker compose run --rm migrator \
  -path /migrations \
  -database "postgresql://titan:password@postgres:5432/titan?sslmode=disable" \
  down 1
```

### Frontend Build Issues

**Check build logs:**
```bash
docker compose build frontend --no-cache
```

**Common issues:**
- Node memory limit - Add `NODE_OPTIONS=--max_old_space_size=4096` to build args
- TypeScript errors - Already ignored in next.config.mjs

### Storage Issues

**Check storage volume:**
```bash
docker volume inspect titan_backend_storage
```

**Fix permissions:**
```bash
docker compose exec backend chown -R root:root /root/storage
```

### Health Check Failures

**Increase timeouts:**
```yaml
backend:
  healthcheck:
    timeout: 10s
    interval: 60s
    start_period: 60s
```

**Disable health checks (not recommended for production):**
```yaml
backend:
  healthcheck:
    disable: true
```

### Performance Tuning

**PostgreSQL:**
```bash
# Edit postgresql.conf
docker compose exec postgres vi /var/lib/postgresql/data/postgresql.conf

# Recommended settings:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
```

**Backend connection pool:**
Edit `backend/internal/database/db.go`:
```go
db.SetMaxOpenConns(100)  // Increase for high traffic
db.SetMaxIdleConns(20)   // Keep more connections ready
```

### Useful Commands

```bash
# Restart specific service
docker compose restart backend

# View real-time logs
docker compose logs -f --tail=100 backend

# Execute command in container
docker compose exec backend /bin/sh

# Check resource usage
docker stats

# Clean up unused resources
docker system prune -a

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Support

For issues and questions:
- Check logs: `docker compose logs`
- Review health checks: `curl localhost:5000/health/ready`
- Inspect database: `docker compose exec postgres psql -U titan`
- Check GitHub Issues: [Project Repository]

## License

See LICENSE file in repository.
