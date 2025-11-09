#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  healthCheckUrl:
    process.env.HEALTH_CHECK_URL || 'http://localhost:3000/api/health',
  healthCheckTimeout: 30000, // 30 seconds
  healthCheckRetries: 5,
  buildTimeout: 600000, // 10 minutes
  deploymentTimeout: 300000, // 5 minutes
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Execute command with timeout
function execWithTimeout(command, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', command], { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
    }, timeout);

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(`Command failed with code ${code}: ${command}\n${stderr}`)
        );
      }
    });
  });
}

// Health check function
async function healthCheck(url, retries = CONFIG.healthCheckRetries) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'healthy') {
          return true;
        }
      }
    } catch (error) {
      logWarning(
        `Health check attempt ${i + 1}/${retries} failed: ${error.message}`
      );
    }

    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
  }

  return false;
}

// Pre-deployment checks
async function preDeploymentChecks() {
  logStep('PRE-CHECK', 'Running pre-deployment checks...');

  // Check if required environment variables are set
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Required environment variable ${envVar} is not set`);
    }
  }

  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    throw new Error('package.json not found');
  }

  // Check if .env.local exists (for local deployment)
  if (!fs.existsSync('.env.local') && process.env.NODE_ENV !== 'production') {
    logWarning(
      '.env.local not found - make sure environment variables are properly configured'
    );
  }

  logSuccess('Pre-deployment checks passed');
}

// Build application
async function buildApplication() {
  logStep('BUILD', 'Building application...');

  try {
    // Clean previous build
    await execWithTimeout('npm run clean', 30000);

    // Install dependencies
    logStep('BUILD', 'Installing dependencies...');
    await execWithTimeout('npm ci', 120000);

    // Run linting
    logStep('BUILD', 'Running linter...');
    await execWithTimeout('npm run lint', 60000);

    // Run type checking
    logStep('BUILD', 'Running type check...');
    await execWithTimeout('npm run type-check', 60000);

    // Build application
    logStep('BUILD', 'Building Next.js application...');
    await execWithTimeout('npm run build', CONFIG.buildTimeout);

    logSuccess('Application built successfully');
  } catch (error) {
    throw new Error(`Build failed: ${error.message}`);
  }
}

// Deploy application
async function deployApplication(target = 'local') {
  logStep('DEPLOY', `Deploying to ${target}...`);

  try {
    switch (target) {
      case 'local':
        await deployLocal();
        break;
      case 'docker':
        await deployDocker();
        break;
      case 'vercel':
        await deployVercel();
        break;
      default:
        throw new Error(`Unknown deployment target: ${target}`);
    }

    logSuccess(`Deployment to ${target} completed`);
  } catch (error) {
    throw new Error(`Deployment failed: ${error.message}`);
  }
}

// Local deployment
async function deployLocal() {
  logStep('DEPLOY', 'Starting local server...');

  // Kill existing process on port 3000
  try {
    await execWithTimeout('lsof -ti:3000 | xargs kill -9', 5000);
  } catch {
    // Ignore if no process is running
  }

  // Start the application
  const child = spawn('npm', ['start'], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();

  // Wait for application to start
  await new Promise(resolve => setTimeout(resolve, 5000));
}

// Docker deployment
async function deployDocker() {
  logStep('DEPLOY', 'Building Docker image...');
  await execWithTimeout('npm run docker:build', 300000);

  logStep('DEPLOY', 'Starting Docker container...');

  // Stop existing container
  try {
    await execWithTimeout('docker stop fleetsync-dashboard', 10000);
    await execWithTimeout('docker rm fleetsync-dashboard', 10000);
  } catch {
    // Ignore if container doesn't exist
  }

  // Start new container
  await execWithTimeout(
    'docker run -d --name fleetsync-dashboard -p 3000:3000 --env-file .env.local fleetsync-dashboard',
    30000
  );
}

// Vercel deployment
async function deployVercel() {
  logStep('DEPLOY', 'Deploying to Vercel...');

  // Check if Vercel CLI is installed
  try {
    await execWithTimeout('vercel --version', 5000);
  } catch {
    throw new Error('Vercel CLI not found. Install with: npm i -g vercel');
  }

  // Deploy to Vercel
  await execWithTimeout('vercel --prod', CONFIG.deploymentTimeout);
}

// Post-deployment verification
async function postDeploymentVerification() {
  logStep('VERIFY', 'Running post-deployment verification...');

  // Wait for application to be ready
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Health check
  logStep('VERIFY', 'Performing health check...');
  const isHealthy = await healthCheck(CONFIG.healthCheckUrl);

  if (!isHealthy) {
    throw new Error(
      'Health check failed - application may not be running correctly'
    );
  }

  logSuccess('Post-deployment verification passed');
}

// Main deployment function
async function deploy() {
  const target = process.argv[2] || 'local';
  const startTime = Date.now();

  log(`🚀 Starting deployment to ${target}...`, 'blue');

  try {
    await preDeploymentChecks();
    await buildApplication();
    await deployApplication(target);
    await postDeploymentVerification();

    const duration = Math.round((Date.now() - startTime) / 1000);
    logSuccess(`Deployment completed successfully in ${duration}s`);
  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Rollback function
async function rollback() {
  logStep('ROLLBACK', 'Starting rollback...');

  try {
    // This is a simplified rollback - in production you'd want to:
    // 1. Keep track of previous deployments
    // 2. Have a proper rollback mechanism
    // 3. Database migration rollbacks if needed

    logWarning('Rollback functionality is not fully implemented');
    logWarning('Manual intervention may be required');
  } catch (error) {
    logError(`Rollback failed: ${error.message}`);
    process.exit(1);
  }
}

// CLI handling
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'rollback':
      rollback();
      break;
    default:
      deploy();
      break;
  }
}

module.exports = {
  deploy,
  rollback,
  healthCheck,
  preDeploymentChecks,
  buildApplication,
};
