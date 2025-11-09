# 🐳 FleetSync Dashboard - Docker Deployment Guide

## 🚀 Quick Docker Deployment (SSH Only)

Since you only have SSH access to your VPS, here's the easiest way to deploy FleetSync Dashboard using Docker:

### VPS Connection Details:
- **IP:** YOUR_VPS_IP_ADDRESS
- **User:** YOUR_VPS_USERNAME
- **Password:** YOUR_VPS_PASSWORD

## 📋 One-Command Deployment

### Step 1: SSH into Your VPS
```bash
ssh root@45.80.181.18
```

### Step 2: Run the Docker Deployment Script
Copy and paste this entire command block into your SSH session:

```bash
# Download and run Docker deployment script
curl -fsSL https://raw.githubusercontent.com/yourusername/fleetsync-dashboard/main/docker-deploy-vps.sh | bash
```

**OR** if you don't have the script online, copy and paste this complete script:

```bash
#!/bin/bash
set -e

echo "🐳 FleetSync Dashboard Docker Deployment"
echo "========================================"

APP_DIR="/var/www/fleetsync-docker"
echo "Starting Docker deployment process..."

# Install Docker and dependencies
echo "📦 Installing Docker..."
apt update && apt upgrade -y
apt install -y curl wget git

# Install Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

systemctl start docker && systemctl enable docker

# Setup application
mkdir -p ${APP_DIR} && cd ${APP_DIR}

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
RUN apk add --no-cache dumb-init curl
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["dumb-init", "node", "server.js"]
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  app:
    build: .
    container_name: fleetsync-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    networks:
      - fleetsync
  nginx:
    image: nginx:alpine
    container_name: fleetsync-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
    networks:
      - fleetsync
networks:
  fleetsync:
EOF

# Create nginx.conf
cat > nginx.conf << 'EOF'
events { worker_connections 1024; }
http {
  upstream app { server fleetsync-app:3000; }
  server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;
    location / {
      proxy_pass http://app;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
  }
}
EOF

# Create basic Next.js app
cat > package.json << 'EOF'
{
  "name": "fleetsync-dashboard",
  "scripts": { "build": "next build", "start": "next start" },
  "dependencies": { "next": "15.2.4", "react": "^18", "react-dom": "^18" }
}
EOF

cat > next.config.mjs << 'EOF'
const nextConfig = { output: 'standalone', eslint: { ignoreDuringBuilds: true } };
export default nextConfig;
EOF

mkdir -p app
cat > app/page.tsx << 'EOF'
export default function Home() {
  return (
    <div style={{padding: '2rem', textAlign: 'center'}}>
      <h1>FleetSync Dashboard</h1>
      <p>🐳 Successfully deployed with Docker!</p>
      <p>Server: 45.80.181.18</p>
    </div>
  )
}
EOF

cat > app/layout.tsx << 'EOF'
export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html><body>{children}</body></html>
}
EOF

# Build and start
echo "🏗️ Building and starting containers..."
docker-compose up --build -d

# Configure firewall
ufw allow 22/tcp && ufw allow 80/tcp && ufw --force enable

echo "✅ Deployment complete! Visit: http://YOUR_DOMAIN_OR_IP"
docker-compose ps
```

## 🔧 Docker Management Commands

After deployment, use these commands to manage your application:

### View Application Status
```bash
cd /var/www/fleetsync-docker
docker-compose ps
```

### View Logs
```bash
# Application logs
docker-compose logs -f app

# Nginx logs
docker-compose logs -f nginx

# All logs
docker-compose logs -f
```

### Restart Application
```bash
docker-compose restart
```

### Stop Application
```bash
docker-compose down
```

### Rebuild and Restart
```bash
docker-compose up --build -d
```

### Update Application Files
```bash
# If you want to upload your full application later
cd /var/www/fleetsync-docker

# Stop containers
docker-compose down

# Replace files with your application
# (upload via file hosting service and extract here)

# Rebuild and start
docker-compose up --build -d
```

## 🌐 Access Your Application

Once deployed, your FleetSync Dashboard will be available at:
- **http://YOUR_DOMAIN_OR_IP**

## 🔒 Environment Variables

To add your database and API credentials, edit the docker-compose.yml file:

```bash
cd /var/www/fleetsync-docker
nano docker-compose.yml
```

Add your environment variables under the `app` service:
```yaml
environment:
  - NODE_ENV=production
  - NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
  - SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
  - NEXTAUTH_SECRET=your-nextauth-secret
  - STRIPE_SECRET_KEY=your-stripe-secret-key
```

Then restart: `docker-compose restart`

## 🆙 Upload Your Full Application

If you want to replace the basic app with your full FleetSync Dashboard:

1. **Upload your files via file hosting:**
   - Upload `fleetsync-deploy.zip` to Google Drive/Dropbox
   - Get download link

2. **Download on VPS:**
   ```bash
   cd /var/www/fleetsync-docker
   docker-compose down
   wget "YOUR_DOWNLOAD_LINK" -O fleetsync.zip
   unzip fleetsync.zip
   docker-compose up --build -d
   ```

## 🔧 Troubleshooting

### Check Container Status
```bash
docker ps
docker-compose logs app
```

### Restart Services
```bash
systemctl restart docker
docker-compose restart
```

### Free Up Space
```bash
docker system prune -a
```

## ✅ Benefits of Docker Deployment

Based on the [Next.js deployment documentation](https://nextjs.org/docs/app/getting-started/deploying) and [Docker containerization guide](https://dev.to/pulkit30/containerizing-nextjs-app-with-docker-quick-guide-51ml), Docker provides:

✅ **All Next.js features supported**  
✅ **Consistent deployment environment**  
✅ **Easy scaling and management**  
✅ **Isolated application environment**  
✅ **Simple rollbacks and updates**  
✅ **Built-in health checks**  

Your FleetSync Dashboard is now running in production-ready Docker containers! 🚀 