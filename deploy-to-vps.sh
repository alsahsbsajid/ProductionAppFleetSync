#!/bin/bash

# FleetSync Dashboard VPS Deployment Script
# Based on guides from Sandeep Singh and Zay kyoy

set -e  # Exit on any error

echo "🚀 FleetSync Dashboard VPS Deployment Script"
echo "=============================================="

# Configuration (update these values)
VPS_IP="45.80.181.18"
VPS_USER="root"
DOMAIN="45.80.181.18"
APP_DIR="/var/www/fleetsync"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if configuration is set
if [ "$VPS_IP" = "YOUR_VPS_IP" ]; then
    echo_error "Please update VPS_IP in the script first!"
    exit 1
fi

echo_info "Deploying to VPS: $VPS_IP"
echo_info "Domain: $DOMAIN"
echo_info "App directory: $APP_DIR"

# Step 1: Build the application locally
echo_info "Building application locally..."
npm run build

# Step 2: Create deployment package (excluding unnecessary files)
echo_info "Creating deployment package..."
tar -czf fleetsync-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=.git \
    --exclude=*.log \
    --exclude=.env.local \
    .

# Step 3: Upload to VPS
echo_info "Uploading to VPS..."
scp fleetsync-deploy.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/

# Step 4: Deploy on VPS
echo_info "Deploying on VPS..."
ssh ${VPS_USER}@${VPS_IP} << EOF
set -e

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install nodejs -y
fi

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Create app directory
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# Extract and setup
tar -xzf /tmp/fleetsync-deploy.tar.gz
npm install --production
npm run build

# Stop existing PM2 process if running
pm2 stop fleetsync || true
pm2 delete fleetsync || true

# Start application with PM2
pm2 start npm --name "fleetsync" -- start
pm2 save
pm2 startup systemd -u ${VPS_USER} --hp /root

# Setup Nginx if not configured
if [ ! -f /etc/nginx/sites-available/fleetsync ]; then
    echo "Configuring Nginx..."
    apt update && apt install nginx -y
    
    cat > /etc/nginx/sites-available/fleetsync << 'NGINXCONF'
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXCONF

    ln -sf /etc/nginx/sites-available/fleetsync /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
fi

# Setup UFW firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "Deployment completed!"
echo "Your app should be accessible at: http://${DOMAIN}"
EOF

# Cleanup
rm fleetsync-deploy.tar.gz

echo_info "🎉 Deployment completed successfully!"
echo_info "Your FleetSync Dashboard is now running on: http://$DOMAIN"
echo ""
echo_warn "Next steps:"
echo "1. Point your domain DNS to your VPS IP: $VPS_IP"
echo "2. Setup SSL with: ssh $VPS_USER@$VPS_IP 'certbot --nginx -d $DOMAIN'"
echo "3. Update your environment variables in: $APP_DIR/.env.production" 