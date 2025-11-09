#!/bin/bash

# FleetSync Dashboard - Docker VPS Deployment Script
# Run this script directly on your VPS via SSH

set -e

echo "🐳 FleetSync Dashboard Docker Deployment"
echo "========================================"

# Configuration
VPS_IP="45.80.181.18"
APP_DIR="/var/www/fleetsync-docker"
GITHUB_REPO_URL="https://github.com/your-username/fleetsync-dashboard.git"  # Update with your repo

echo "Starting Docker deployment process..."

# Step 1: Update system and install Docker
echo "📦 Installing Docker and dependencies..."
apt update && apt upgrade -y
apt install -y curl wget unzip git

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker root
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Start Docker service
systemctl start docker
systemctl enable docker

# Step 2: Create application directory and setup
echo "📁 Setting up application directory..."
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# Step 3: Create Docker files directly on server
echo "🚀 Setting up FleetSync Docker configuration..."

# Create Dockerfile
cat > Dockerfile << 'DOCKEREOF'
# FleetSync Dashboard - Production Dockerfile
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN apk add --no-cache dumb-init curl

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["dumb-init", "node", "server.js"]
DOCKEREOF

# Create docker-compose.yml
cat > docker-compose.yml << 'COMPOSEEOF'
version: '3.8'

services:
  fleetsync-app:
    build: .
    container_name: fleetsync-dashboard
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXTAUTH_URL=http://45.80.181.18:3000
      - NEXT_PUBLIC_APP_URL=http://45.80.181.18:3000
    networks:
      - fleetsync-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: fleetsync-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - fleetsync-app
    networks:
      - fleetsync-network

networks:
  fleetsync-network:
    driver: bridge
COMPOSEEOF

# Create nginx.conf for Docker
cat > nginx.conf << 'NGINXEOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server fleetsync-dashboard:3000;
    }

    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name 45.80.181.18;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
NGINXEOF

# Create basic Next.js app structure
echo "📁 Creating basic Next.js application..."

# Create package.json
cat > package.json << 'PACKAGEEOF'
{
  "name": "fleetsync-dashboard",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.2.4",
    "react": "^18",
    "react-dom": "^18",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5"
  }
}
PACKAGEEOF

# Create next.config.mjs
cat > next.config.mjs << 'NEXTEOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
NEXTEOF

# Create app structure
mkdir -p app

# Create basic page
cat > app/page.tsx << 'PAGEEOF'
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-4 text-blue-600">FleetSync Dashboard</h1>
        <p className="text-xl text-gray-600 mb-8">Successfully deployed with Docker!</p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          <strong>✅ Deployment Status:</strong> Running successfully in Docker containers
        </div>
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Server IP:</strong> 45.80.181.18</div>
            <div><strong>Environment:</strong> Production</div>
            <div><strong>Container:</strong> fleetsync-dashboard</div>
            <div><strong>Proxy:</strong> Nginx</div>
          </div>
        </div>
      </div>
    </main>
  )
}
PAGEEOF

# Create layout
cat > app/layout.tsx << 'LAYOUTEOF'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FleetSync Dashboard',
  description: 'Fleet Management System - Docker Deployment',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{margin: 0, fontFamily: 'system-ui, sans-serif'}}>{children}</body>
    </html>
  )
}
LAYOUTEOF

# Create health check endpoint
mkdir -p app/api/health
cat > app/api/health/route.ts << 'HEALTHEOF'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    server: '45.80.181.18'
  })
}
HEALTHEOF

# Create .dockerignore
cat > .dockerignore << 'DOCKERIGNOREEOF'
node_modules
.next
.git
*.md
.env*
Dockerfile
docker-compose*.yml
*.log
DOCKERIGNOREEOF

# Step 4: Build and deploy with Docker
echo "🏗️ Building and starting Docker containers..."

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Build and start the application
docker-compose up --build -d

# Step 5: Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Step 6: Final checks
echo "✅ Performing final checks..."
sleep 30

echo "Docker containers status:"
docker-compose ps

echo "Testing application:"
sleep 10
curl -s http://localhost/api/health | head -5 || echo "Health check not ready yet"

echo ""
echo "🎉 FleetSync Dashboard Docker Deployment Complete!"
echo "=================================================="
echo "Your application is now running at:"
echo "🌐 http://45.80.181.18"
echo ""
echo "Docker Management Commands:"
echo "• View logs: docker-compose logs -f fleetsync-app"
echo "• Restart: docker-compose restart"
echo "• Stop: docker-compose down"
echo "• Rebuild: docker-compose up --build -d"
echo "• Status: docker-compose ps"
echo ""
echo "Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Next Steps:"
echo "1. Test the application in your browser"
echo "2. Upload your full application files to replace this minimal version"
echo "3. Update environment variables in docker-compose.yml"
echo "4. Consider setting up SSL certificate" 