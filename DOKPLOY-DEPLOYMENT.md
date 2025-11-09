# 🚀 Dokploy Deployment Guide

Complete guide for deploying FleetSync Dashboard using Dokploy's Docker source provider.

## Overview

Dokploy is a self-hosted platform for streamlined Docker container management. This guide covers deploying FleetSync Dashboard using Dokploy's **Docker** source provider with **Dockerfile** build type.

## Prerequisites

- Dokploy installed and running on your server
- Access to Dokploy dashboard
- Your project files ready for upload
- Environment variables prepared (see `.env.example`)

## Deployment Steps

### Step 1: Access Dokploy Dashboard

1. Navigate to your Dokploy dashboard (typically `http://your-server-ip` or your domain)
2. Log in with your credentials
3. Click on **"New Application"** or **"Deploy"** button

### Step 2: Configure Provider (Source)

1. In the **Provider** section, select **"Docker"** as your source
   - You'll see options: GitHub, Gitlab, Bitbucket, Gitea, **Docker**, Git, Drop
   - Click on the **Docker** icon (it will be highlighted with a blue border)

2. **Upload Your Project Files**
   - Dokploy will provide an option to upload your project files
   - You can either:
     - **Option A**: Upload a ZIP/TAR archive of your project
     - **Option B**: Use the file upload interface to select your project directory
   - Ensure all project files are included (especially `Dockerfile`, `package.json`, source code)

3. **Build Context** (if prompted)
   - Set to `.` (root directory) - this is usually the default
   - This tells Dokploy where to find your Dockerfile

4. Click **"Save"** in the Provider section

### Step 3: Configure Build Type

1. In the **Build Type** section, select **"Dockerfile"**
   - You'll see options: Dockerfile, Railpack, Nixpacks, Heroku Buildpacks, Paketo Buildpacks, Static
   - Select **"Dockerfile"** (radio button)

2. **Dockerfile Configuration**
   - **Dockerfile Path**: `./Dockerfile` (default - should auto-detect)
   - Dokploy will automatically find your Dockerfile in the root directory

3. **Publish Directory** (Leave Empty)
   - This field is for static sites served via NGINX
   - **Leave this empty** - Next.js handles routing internally
   - The Dockerfile already configures the correct output directory

4. Click **"Save"** in the Build Type section

### Step 4: Configure Application Settings

#### Port Configuration
- **Port**: `3000`
- This is the internal container port (Next.js default)
- Dokploy will automatically map this to an external port

#### Health Check
- **Health Check Endpoint**: `/api/health`
- The Dockerfile already includes a health check, but you can verify:
  ```bash
  curl http://localhost:3000/api/health
  ```

#### Resource Limits (Recommended)
Based on Dokploy's recommendations:
- **Memory (RAM)**: 4GB minimum (recommended: 4-8GB)
- **CPU Cores**: 2+ cores
- These can be configured in Dokploy's advanced settings

#### Restart Policy
- Set to **"unless-stopped"** (default in Dokploy)
- This ensures the container restarts automatically if it crashes

### Step 5: Environment Variables

Add all required environment variables in Dokploy's environment variables section:

#### Required Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=FleetSync Dashboard
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### How to Add Environment Variables in Dokploy

1. Navigate to your application settings
2. Find the **"Environment Variables"** section
3. Click **"Add Variable"** for each variable
4. Enter the **Name** and **Value**
5. Mark sensitive variables (like API keys) as **"Secret"** if Dokploy supports it
6. Save each variable

**Important**: 
- Never commit actual values to version control
- Use Dokploy's secure environment variable storage
- Reference `.env.example` for all required variables

### Step 6: Deploy

1. Review all settings:
   - ✅ Provider: Docker
   - ✅ Build Type: Dockerfile
   - ✅ Port: 3000
   - ✅ Environment variables added
   - ✅ Resource limits configured

2. Click **"Deploy"** or **"Save & Deploy"**

3. Monitor the deployment:
   - Watch the build logs in Dokploy's interface
   - The build process will:
     - Install dependencies
     - Build the Next.js application
     - Create the Docker image
     - Start the container

4. Wait for deployment to complete (typically 3-5 minutes)

### Step 7: Verify Deployment

1. **Check Application Status**
   - In Dokploy dashboard, verify the application shows as "Running"
   - Check the container status (should be green/healthy)

2. **Test Health Endpoint**
   ```bash
   curl http://your-domain:port/api/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "timestamp": "2024-...",
     "uptime": 123.45,
     "environment": "production"
   }
   ```

3. **Access Your Application**
   - Dokploy will provide a URL (either auto-generated or your custom domain)
   - Open the URL in your browser
   - You should see the FleetSync Dashboard login page

## Dockerfile Optimization (Already Configured)

Your Dockerfile is already optimized for Dokploy with:

✅ **Multi-stage build** - Reduces final image size (~150MB vs ~1GB)
✅ **Alpine Linux base** - Lightweight and secure
✅ **Health checks** - Automatic container health monitoring
✅ **Non-root user** - Runs as `nextjs:nodejs` for security
✅ **Standalone output** - Next.js standalone mode for optimal Docker deployment
✅ **Production optimizations** - All production best practices included

## Troubleshooting

### Build Fails

**Issue**: Build process fails during Docker image creation

**Solutions**:
1. Check build logs in Dokploy for specific error messages
2. Verify all files were uploaded correctly (especially `Dockerfile`, `package.json`)
3. Ensure `package-lock.json` or `pnpm-lock.yaml` is included
4. Check if Node.js version in Dockerfile matches your requirements
5. Verify build context is set to root directory (`.`)

### Container Won't Start

**Issue**: Container builds but fails to start

**Solutions**:
1. Check container logs in Dokploy
2. Verify environment variables are set correctly
3. Ensure port 3000 is not conflicting with other services
4. Check if health check endpoint is accessible
5. Verify `NODE_ENV=production` is set

### Application Not Accessible

**Issue**: Build succeeds but can't access the application

**Solutions**:
1. Verify the port mapping in Dokploy (external port → 3000)
2. Check firewall rules on your server
3. Ensure Dokploy's reverse proxy is configured correctly
4. Test health endpoint: `curl http://localhost:3000/api/health`
5. Check application logs for runtime errors

### Environment Variables Not Working

**Issue**: Application can't access environment variables

**Solutions**:
1. Verify all variables are added in Dokploy's environment section
2. Check variable names match exactly (case-sensitive)
3. Ensure `NEXT_PUBLIC_*` variables are set for client-side access
4. Restart the container after adding new variables
5. Check logs for "undefined" or "missing" variable errors

### High Memory Usage

**Issue**: Container uses too much memory

**Solutions**:
1. Increase memory limit in Dokploy (recommended: 4GB+)
2. Check for memory leaks in application code
3. Monitor memory usage over time
4. Consider enabling swap if available
5. Review Next.js build optimizations

## Advanced Configuration

### Custom Domain Setup

1. In Dokploy, navigate to your application
2. Find **"Domain"** or **"Custom Domain"** settings
3. Add your domain name
4. Configure DNS records as instructed by Dokploy
5. SSL/TLS certificates are usually auto-configured

### Scaling

Dokploy supports horizontal scaling:
1. Navigate to scaling settings
2. Set desired number of replicas
3. Dokploy will distribute load across containers
4. Ensure your application is stateless for best results

### Monitoring

Dokploy provides built-in monitoring:
- CPU usage
- Memory consumption
- Network traffic
- Container logs
- Health check status

Access these metrics in the Dokploy dashboard.

## Best Practices

1. **Resource Allocation**
   - Allocate at least 4GB RAM and 2 CPU cores
   - Monitor usage and adjust as needed

2. **Environment Variables**
   - Use Dokploy's secure variable storage
   - Never hardcode secrets in code
   - Rotate API keys regularly

3. **Backups**
   - Configure database backups (if using Dokploy's database services)
   - Export environment variables regularly
   - Keep deployment configurations documented

4. **Updates**
   - Test updates in a staging environment first
   - Use Dokploy's rollback feature if available
   - Monitor logs after updates

5. **Security**
   - Keep Dokploy updated
   - Use strong passwords
   - Enable SSL/TLS for all domains
   - Regularly review container logs for suspicious activity

## Quick Reference

### Deployment Checklist

- [ ] Dokploy installed and accessible
- [ ] Project files uploaded
- [ ] Provider set to "Docker"
- [ ] Build type set to "Dockerfile"
- [ ] Port configured (3000)
- [ ] All environment variables added
- [ ] Resource limits set (4GB RAM, 2+ CPU)
- [ ] Health check endpoint verified
- [ ] Application deployed successfully
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active (if using domain)

### Required Files

Ensure these files are uploaded:
- ✅ `Dockerfile` (required)
- ✅ `package.json` (required)
- ✅ `package-lock.json` or `pnpm-lock.yaml` (required)
- ✅ `next.config.mjs` (required)
- ✅ `tsconfig.json` (required)
- ✅ All source code in `app/`, `components/`, `lib/` directories
- ✅ `public/` directory with static assets

### Support Resources

- [Dokploy Documentation](https://docs.dokploy.com)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)

## Summary

Your FleetSync Dashboard is now ready for Dokploy deployment! The Dockerfile is production-ready and follows all best practices. Simply:

1. Upload your project files to Dokploy
2. Select "Docker" as provider and "Dockerfile" as build type
3. Add environment variables
4. Deploy and monitor

The application will be accessible via Dokploy's provided URL or your custom domain.

