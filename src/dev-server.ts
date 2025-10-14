#!/usr/bin/env bun

/**
 * Development Server for Hamsoya Backend
 *
 * This server:
 * - Loads environment variables from .env files
 * - Runs the Hono app with Node.js adapter
 * - Provides proper database and Redis connections
 * - Enables hot reloading for development
 */

import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import { resolve } from 'path';
import { testDbConnection } from './db/index';
import app from './index';
import { getRedis } from './lib/redis';

// Load environment variables from .env files
// Load in order: .env.local, .env.dev, .env
const envFiles = ['.env.local', '.env.dev', '.env'];

for (const envFile of envFiles) {
  const envPath = resolve(process.cwd(), envFile);
  try {
    config({ path: envPath });
    console.log(`✅ Loaded environment variables from ${envFile}`);
  } catch (error) {
    // File doesn't exist, continue to next
    console.log(`⚠️  ${envFile} not found, skipping...`);
  }
}

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SMTP_USER',
  'SMTP_PASSWORD',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Please create a .env.local file with the required variables.');
  console.error('   You can copy from .env.example and update the values.');
  process.exit(1);
}

console.log('✅ All required environment variables are set');

// Debug environment variables
console.log('🔍 Environment variable debugging:');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20) || 'undefined');

// Test database connection
async function testDatabase() {
  console.log('🔍 Testing database connection...');
  const isConnected = await testDbConnection(process.env.DATABASE_URL!);
  if (!isConnected) {
    console.error('❌ Database connection failed. Please check your DATABASE_URL.');
    console.error('💡 Make sure your Neon database is running and accessible.');
    process.exit(1);
  }
  console.log('✅ Database connection successful');
}

// Test and initialize Redis connection
async function initializeRedis() {
  try {
    console.log('🔍 Initializing Redis connection...');
    const redis = getRedis();

    // Force connection by running a simple command
    await redis.ping();
    console.log('✅ Redis connection successful');

    return redis;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    console.error('💡 Make sure your Redis server is running and REDIS_URL is correct.');
    process.exit(1);
  }
}

// Set default values for optional environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
process.env.SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
process.env.SMTP_PORT = process.env.SMTP_PORT || '465';
process.env.SMTP_SERVICE = process.env.SMTP_SERVICE || 'gmail';

// Start the server
async function startServer() {
  // Initialize connections in parallel for faster startup
  console.log('🚀 Starting Hamsoya Backend Development Server...');
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🔗 Backend URL: ${process.env.BACKEND_URL}`);

  // Test database and Redis connections in parallel
  await Promise.all([testDatabase(), initializeRedis()]);

  const port = parseInt(process.env.PORT || '5000', 10);

  serve(
    {
      fetch: app.fetch,
      port,
    },
    info => {
      console.log(`✨ Server is running on http://localhost:${info.port}`);
      console.log(`🔗 API endpoints available at http://localhost:${info.port}/api`);
      console.log(`🔗 tRPC endpoints available at http://localhost:${info.port}/trpc`);
      console.log(`📊 Health check: http://localhost:${info.port}/api/health`);
      console.log('\n🎯 Ready for development!');
    }
  );
}

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development server...');
  process.exit(0);
});
