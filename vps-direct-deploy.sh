#!/bin/bash

# FleetSync Dashboard Direct VPS Deployment Script
# Run this script directly on your VPS via SSH

set -e

echo "FleetSync Dashboard Direct VPS Deployment"
echo "========================================"

# Configuration
VPS_IP="45.80.181.18"
APP_DIR="/var/www/fleetsync"
NODE_VERSION="18"

echo "Starting deployment process..."

# Step 1: Update system and install dependencies
echo "📦 Installing system dependencies..."
apt update && apt upgrade -y
apt install -y curl wget unzip nginx git

# Step 2: Install Node.js
echo "🟢 Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Step 3: Install PM2
echo "⚡ Installing PM2..."
npm install -g pm2

# Step 4: Create application directory
echo "📁 Setting up application directory..."
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# Step 5: Clone or create minimal Next.js app structure
echo "🚀 Setting up FleetSync application..."

# Create package.json
cat > package.json << 'EOF'
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
EOF

# Create next.config.mjs
cat > next.config.mjs << 'EOF'
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
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# Create app directory structure
mkdir -p app

# Create basic page.tsx
cat > app/page.tsx << 'EOF'
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">FleetSync Dashboard</h1>
        <p className="text-xl text-gray-600 mb-8">Successfully deployed on VPS!</p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <strong>Deployment Status:</strong> ✅ Running successfully on {process.env.NODE_ENV} mode
        </div>
      </div>
    </main>
  )
}
EOF

# Create layout.tsx
cat > app/layout.tsx << 'EOF'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FleetSync Dashboard',
  description: 'Fleet Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
EOF

# Create globals.css
mkdir -p app
cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}
EOF

# Create .env.production
cat > .env.production << 'EOF'
NODE_ENV=production
NEXTAUTH_URL=http://45.80.181.18:3000
NEXT_PUBLIC_APP_URL=http://45.80.181.18:3000
EOF

# Step 6: Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Step 7: Build application
echo "🔨 Building application..."
npm run build

# Step 8: Set proper permissions
echo "🔐 Setting permissions..."
chown -R root:root ${APP_DIR}
chmod -R 755 ${APP_DIR}

# Step 9: Stop existing PM2 processes
echo "🔄 Managing PM2 processes..."
pm2 stop fleetsync || true
pm2 delete fleetsync || true

# Step 10: Start application with PM2
echo "🚀 Starting FleetSync with PM2..."
pm2 start npm --name "fleetsync" -- start
pm2 save
pm2 startup

# Step 11: Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/fleetsync << 'NGINXEOF'
server {
    listen 80;
    server_name 45.80.181.18;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

# Enable site
ln -sf /etc/nginx/sites-available/fleetsync /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# Step 12: Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Step 13: Final checks
echo "✅ Performing final checks..."
echo "PM2 Status:"
pm2 status

echo "Nginx Status:"
systemctl status nginx --no-pager -l

echo "Testing application:"
sleep 5
curl -s http://localhost:3000 | head -10

echo ""
echo "🎉 FleetSync Dashboard Deployment Complete!"
echo "=========================================="
echo "Your application is now running at:"
echo "🌐 http://45.80.181.18"
echo "🌐 http://45.80.181.18:3000"
echo ""
echo "Management Commands:"
echo "• View logs: pm2 logs fleetsync"
echo "• Restart app: pm2 restart fleetsync"
echo "• Stop app: pm2 stop fleetsync"
echo "• Nginx status: systemctl status nginx"
echo ""
echo "Next Steps:"
echo "1. Test the application in your browser"
echo "2. Upload your full application files to replace this minimal version"
echo "3. Update environment variables in .env.production"
echo "4. Consider setting up SSL certificate" 