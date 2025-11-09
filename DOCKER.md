# 🐳 Docker Deployment Guide

This guide covers Docker deployment for FleetSync Dashboard.

## Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- Environment variables configured (see `.env.example`)

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd fleetsync-dashboard
cp .env.example .env.local
# Edit .env.local with your actual values
```

### 2. Build and Run with Docker Compose

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Development with hot reload
docker-compose up -d
```

### 3. Access Application

- **Production**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## Docker Commands

### Build Image

```bash
docker build -t fleetsync-dashboard .
```

### Run Container

```bash
docker run -d \
  --name fleetsync-app \
  -p 3000:3000 \
  --env-file .env.local \
  fleetsync-dashboard
```

### View Logs

```bash
# Docker Compose
docker-compose logs -f app

# Docker
docker logs -f fleetsync-app
```

### Stop and Remove

```bash
# Docker Compose
docker-compose down

# Docker
docker stop fleetsync-app
docker rm fleetsync-app
```

## Environment Variables

Required environment variables (see `.env.example` for full list):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

## Production Deployment

### Using Docker Compose (Recommended)

1. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with production values
   ```

2. **Start services**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verify deployment**:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   curl http://localhost:3000/api/health
   ```

### Using Dockerfile Directly

```bash
# Build
docker build -t fleetsync-dashboard:latest .

# Run
docker run -d \
  --name fleetsync-dashboard \
  -p 3000:3000 \
  --env-file .env.local \
  --restart unless-stopped \
  fleetsync-dashboard:latest
```

## Health Checks

The Dockerfile includes a health check that monitors the application:

```bash
# Check container health
docker ps

# Manual health check
curl http://localhost:3000/api/health
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs fleetsync-app

# Check environment variables
docker exec fleetsync-app env
```

### Build fails

```bash
# Clear Docker cache
docker builder prune

# Rebuild without cache
docker build --no-cache -t fleetsync-dashboard .
```

### Port already in use

```bash
# Change port in docker-compose.yml
ports:
  - '3001:3000'  # Use port 3001 instead
```

## Multi-stage Build

The Dockerfile uses a multi-stage build for optimization:

1. **deps**: Installs dependencies
2. **builder**: Builds the Next.js application
3. **runner**: Production image with minimal footprint

This results in a smaller final image (~150MB vs ~1GB).

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use secrets management** - Consider Docker secrets or environment variable injection
3. **Run as non-root user** - The Dockerfile already does this
4. **Keep images updated** - Regularly update base images
5. **Scan for vulnerabilities**:
   ```bash
   docker scan fleetsync-dashboard
   ```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t fleetsync-dashboard .
      - name: Run tests
        run: docker run --rm fleetsync-dashboard npm test
```

## Additional Resources

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

