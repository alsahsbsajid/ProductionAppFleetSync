# 🚀 FleetSync Dashboard VPS Deployment Guide

Deploy your FleetSync Dashboard to any VPS (Hostinger, DigitalOcean, AWS EC2, etc.) with this comprehensive guide.

## ✅ Prerequisites

- **VPS with Ubuntu 22.04+** (Hostinger VPS recommended)
- **Domain name** pointed to your VPS IP
- **SSH access** to your VPS
- **Local environment** with Docker (optional)

## 🎯 Deployment Options

### Option 1: Automated Script Deployment (Recommended)

**Pros:**
- ✅ Fully automated process
- ✅ Includes Nginx setup
- ✅ PM2 process management
- ✅ Firewall configuration

**Steps:**
1. **Configure the deployment script:**
   ```bash
   # Edit deploy-to-vps.sh
   VPS_IP="your.vps.ip.address"
   DOMAIN="yourdomain.com"
   ```

2. **Run deployment:**
   ```bash
   ./deploy-to-vps.sh
   ```

3. **Setup SSL (after DNS propagation):**
   ```bash
   ssh root@your-vps-ip
   apt install certbot python3-certbot-nginx -y
   certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

### Option 2: Docker Deployment

**Pros:**
- ✅ Better isolation
- ✅ Easy scaling
- ✅ Consistent environments

**Steps:**
1. **Upload project to VPS:**
   ```bash
   scp -r . root@your-vps-ip:/var/www/fleetsync
   ```

2. **Install Docker on VPS:**
   ```bash
   ssh root@your-vps-ip
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

3. **Deploy with Docker Compose:**
   ```bash
   cd /var/www/fleetsync
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Option 3: Manual PM2 Deployment

**Steps:**
1. **Install Node.js & PM2:**
   ```bash
   ssh root@your-vps-ip
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt install nodejs -y
   npm install -g pm2
   ```

2. **Upload & Build:**
   ```bash
   scp -r . root@your-vps-ip:/var/www/fleetsync
   ssh root@your-vps-ip "cd /var/www/fleetsync && npm install && npm run build"
   ```

3. **Start with PM2:**
   ```bash
   ssh root@your-vps-ip "cd /var/www/fleetsync && pm2 start npm --name 'fleetsync' -- start"
   ```

## 🔧 Nginx Configuration

If using Option 2 or 3, you'll need to setup Nginx manually:

```bash
# Install Nginx
apt install nginx -y

# Create site configuration
nano /etc/nginx/sites-available/fleetsync
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

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
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/fleetsync /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 🌐 Domain & DNS Setup

1. **Point your domain to VPS:**
   - **A Record:** `@` → `your.vps.ip.address`
   - **A Record:** `www` → `your.vps.ip.address`

2. **Wait for DNS propagation** (5-30 minutes)

3. **Test access:** `http://yourdomain.com`

## 🔒 SSL Certificate Setup

**Using Let's Encrypt (Free):**
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
echo "0 3 * * * certbot renew --quiet" | crontab -
```

## 🔥 Firewall Configuration

```bash
# Allow necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

## 📊 Monitoring & Maintenance

**PM2 Management:**
```bash
# View running processes
pm2 list

# View logs
pm2 logs fleetsync

# Restart application
pm2 restart fleetsync

# Stop application
pm2 stop fleetsync
```

**Docker Management:**
```bash
# View running containers
docker ps

# View logs
docker logs fleetsync_app_1

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

## 🚨 Troubleshooting

### Common Issues:

**1. App not accessible:**
- Check if application is running: `pm2 status` or `docker ps`
- Verify Nginx configuration: `nginx -t`
- Check firewall: `ufw status`

**2. SSL issues:**
- Ensure DNS is properly configured
- Check domain ownership: `dig yourdomain.com`
- Verify Nginx configuration before running Certbot

**3. Performance issues:**
- Monitor resources: `htop`
- Check application logs: `pm2 logs fleetsync`
- Optimize Nginx configuration for your traffic

## 📈 Production Optimizations

**1. Environment Variables:**
Create `/var/www/fleetsync/.env.production`:
```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**2. PM2 Ecosystem File:**
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'fleetsync',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

**3. Nginx Optimizations:**
Add to your Nginx config:
```nginx
# Gzip compression
gzip on;
gzip_types text/plain application/json application/javascript text/css;

# Cache static assets
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🎉 Success Checklist

- [ ] Application builds successfully locally
- [ ] VPS is accessible via SSH
- [ ] Domain DNS is pointing to VPS IP
- [ ] Application is running on VPS (port 3000)
- [ ] Nginx is configured and running
- [ ] Domain is accessible via HTTP
- [ ] SSL certificate is installed and HTTPS works
- [ ] Firewall is properly configured
- [ ] PM2/Docker is managing the application process

## 📞 Support

If you encounter issues:
1. Check the logs first (`pm2 logs` or `docker logs`)
2. Verify all configuration files
3. Test each component individually
4. Ensure all environment variables are set correctly

Your FleetSync Dashboard should now be running smoothly on your VPS! 🚀 