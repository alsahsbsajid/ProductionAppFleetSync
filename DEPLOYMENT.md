# FleetSync Dashboard - Deployment Guide

This guide covers various deployment options for the FleetSync Dashboard application.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker (optional, for containerized deployment)
- Vercel CLI (optional, for Vercel deployment)
- Git

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fleetsync-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your actual values:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Stripe Configuration
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   
   # Database
   DATABASE_URL=your_database_url
   
   # NextAuth
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

## 🏠 Local Development

### Standard Development

```bash
# Start development server
npm run dev

# Run with type checking
npm run type-check

# Run linting
npm run lint

# Format code
npm run format
```

### Docker Development

```bash
# Start all services (app, database, redis)
npm run docker:dev

# Stop services
npm run docker:down
```

## 🐳 Docker Deployment

### Build and Run

```bash
# Build Docker image
npm run docker:build

# Run container
npm run docker:run
```

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Docker Setup

1. **Create production environment file**
   ```bash
   cp .env.example .env.production
   ```

2. **Update docker-compose.yml for production**
   ```yaml
   # Use production environment
   env_file:
     - .env.production
   
   # Enable restart policy
   restart: unless-stopped
   ```

3. **Deploy**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

## ☁️ Cloud Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # Development deployment
   vercel
   
   # Production deployment
   vercel --prod
   ```

4. **Configure environment variables in Vercel dashboard**
   - Go to your project settings
   - Add all environment variables from `.env.example`
   - Ensure production URLs are used

### Railway

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login and deploy**
   ```bash
   railway login
   railway link
   railway up
   ```

### Netlify

1. **Build command**: `npm run build`
2. **Publish directory**: `.next`
3. **Environment variables**: Add all from `.env.example`

## 🔧 Automated Deployment

### Using Deployment Script

```bash
# Local deployment
node scripts/deploy.js local

# Docker deployment
node scripts/deploy.js docker

# Vercel deployment
node scripts/deploy.js vercel
```

### GitHub Actions (CI/CD)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 🏥 Health Monitoring

### Health Check Endpoint

The application includes a health check endpoint at `/api/health`:

```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "responseTime": "45ms",
  "services": {
    "database": "healthy",
    "api": "healthy"
  }
}
```

### Monitoring Setup

1. **Uptime monitoring** (UptimeRobot, Pingdom)
   - Monitor: `https://your-domain.com/api/health`
   - Frequency: Every 5 minutes
   - Alert on: Status code != 200

2. **Error tracking** (Sentry)
   ```bash
   npm install @sentry/nextjs
   ```

3. **Performance monitoring** (Vercel Analytics)
   - Enable in Vercel dashboard
   - Monitor Core Web Vitals

## 🔒 Security Considerations

### Environment Variables

- Never commit `.env.local` or `.env.production`
- Use different keys for development and production
- Rotate secrets regularly
- Use secret management services in production

### Security Headers

The application includes security headers in `next.config.mjs`:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### HTTPS

- Always use HTTPS in production
- Configure SSL certificates
- Enable HSTS headers

## 🐛 Troubleshooting

### Common Issues

1. **Build failures**
   ```bash
   # Clear cache and rebuild
   npm run clean
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Environment variable issues**
   ```bash
   # Check if variables are loaded
   node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
   ```

3. **Database connection issues**
   ```bash
   # Test database connection
   curl http://localhost:3000/api/health
   ```

4. **Docker issues**
   ```bash
   # Check container logs
   docker logs fleetsync-dashboard
   
   # Rebuild without cache
   docker build --no-cache -t fleetsync-dashboard .
   ```

### Performance Issues

1. **Bundle analysis**
   ```bash
   npm run analyze
   ```

2. **Memory usage**
   ```bash
   # Check memory usage
   curl http://localhost:3000/api/health | jq '.memory'
   ```

3. **Database optimization**
   - Check slow queries
   - Add database indexes
   - Enable query caching

## 📊 Performance Optimization

### Caching Strategy

- **Memory cache**: Fast access for frequently used data
- **Redis cache**: Distributed caching for production
- **CDN**: Static asset caching

### Database Optimization

- Add indexes for frequently queried columns
- Use connection pooling
- Implement query optimization

### Image Optimization

- Use Next.js Image component
- Enable WebP/AVIF formats
- Implement lazy loading

## 🔄 Rollback Procedures

### Vercel Rollback

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

### Docker Rollback

```bash
# Keep previous image tagged
docker tag fleetsync-dashboard:latest fleetsync-dashboard:previous

# Rollback
docker stop fleetsync-dashboard
docker run -d --name fleetsync-dashboard -p 3000:3000 fleetsync-dashboard:previous
```

## 📞 Support

For deployment issues:

1. Check the health endpoint: `/api/health`
2. Review application logs
3. Check environment variables
4. Verify database connectivity
5. Contact the development team

---

**Last updated**: January 2024
**Version**: 1.0.0