# FleetSync Dashboard Windows Deployment Script
# VPS IP: 45.80.181.18
# Password: aDi2kEjc.MLRR7D

Write-Host "FleetSync Dashboard Windows Deployment Script" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

$VPS_IP = "45.80.181.18"
$VPS_USER = "root"
$APP_DIR = "/var/www/fleetsync"

Write-Host "Deploying to VPS: $VPS_IP" -ForegroundColor Yellow
Write-Host "App directory: $APP_DIR" -ForegroundColor Yellow

# Step 1: Create deployment package
Write-Host "Creating deployment package..." -ForegroundColor Cyan

# Create a temporary directory for deployment files
$tempDir = "deployment-temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir

# Copy necessary files (excluding node_modules, .git, etc.)
Write-Host "Copying files..." -ForegroundColor Gray
Copy-Item -Path "app" -Destination "$tempDir/app" -Recurse
Copy-Item -Path "components" -Destination "$tempDir/components" -Recurse
Copy-Item -Path "hooks" -Destination "$tempDir/hooks" -Recurse
Copy-Item -Path "lib" -Destination "$tempDir/lib" -Recurse
Copy-Item -Path "public" -Destination "$tempDir/public" -Recurse
Copy-Item -Path "styles" -Destination "$tempDir/styles" -Recurse
Copy-Item -Path ".next" -Destination "$tempDir/.next" -Recurse
Copy-Item -Path "package.json" -Destination "$tempDir/"
Copy-Item -Path "package-lock.json" -Destination "$tempDir/"
Copy-Item -Path "next.config.mjs" -Destination "$tempDir/"
Copy-Item -Path "tailwind.config.ts" -Destination "$tempDir/"
Copy-Item -Path "tsconfig.json" -Destination "$tempDir/"
Copy-Item -Path "postcss.config.mjs" -Destination "$tempDir/"
Copy-Item -Path "components.json" -Destination "$tempDir/"
Copy-Item -Path "middleware.ts" -Destination "$tempDir/"

# Create .env.production file
Write-Host "Creating .env.production file..." -ForegroundColor Gray
$envFile = Join-Path $tempDir ".env.production"
$envContent = @"
# Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://45.80.181.18:3000
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
"@
$envContent | Out-File -FilePath $envFile -Encoding UTF8

# Create archive
Write-Host "Creating archive..." -ForegroundColor Gray
Compress-Archive -Path "$tempDir\*" -DestinationPath "fleetsync-deploy.zip" -Force

# Clean up temp directory
Remove-Item -Recurse -Force $tempDir

Write-Host "Deployment package created: fleetsync-deploy.zip" -ForegroundColor Green
Write-Host ""
Write-Host "VPS Connection Details:" -ForegroundColor Yellow
Write-Host "IP: $VPS_IP"
Write-Host "User: $VPS_USER"
Write-Host "Password: aDi2kEjc.MLRR7D"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Upload fleetsync-deploy.zip to your VPS"
Write-Host "2. SSH into your VPS and run the deployment commands"
Write-Host ""
Write-Host "Upload Command (using scp):" -ForegroundColor Magenta
Write-Host "scp fleetsync-deploy.zip root@45.80.181.18:/tmp/"
Write-Host ""
Write-Host "SSH Commands to run on VPS:" -ForegroundColor Magenta
Write-Host "ssh root@45.80.181.18"
Write-Host "cd /tmp"
Write-Host "apt update && apt install unzip -y"
Write-Host "mkdir -p /var/www/fleetsync"
Write-Host "unzip fleetsync-deploy.zip -d /var/www/fleetsync"
Write-Host "cd /var/www/fleetsync"
Write-Host "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -"
Write-Host "apt install nodejs -y"
Write-Host "npm install -g pm2"
Write-Host "npm install --production"
Write-Host "pm2 stop fleetsync || true"
Write-Host "pm2 delete fleetsync || true"
Write-Host "pm2 start npm --name fleetsync -- start"
Write-Host "pm2 save"
Write-Host "pm2 startup"
Write-Host ""
Write-Host "Your app will be available at: http://45.80.181.18:3000" -ForegroundColor Green 