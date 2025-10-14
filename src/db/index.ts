import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Connection pool for database connections
let dbConnectionPool: Map<string, ReturnType<typeof drizzle>> = new Map();

// Create the connection with pooling
export const createDbConnection = (databaseUrl: string) => {
  // Check if connection already exists in pool
  if (dbConnectionPool.has(databaseUrl)) {
    return dbConnectionPool.get(databaseUrl)!;
  }

  // Create new connection
  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  // Store in pool
  dbConnectionPool.set(databaseUrl, db);

  return db;
};

// Test database connection
export const testDbConnection = async (databaseUrl: string) => {
  try {
    const sql = neon(databaseUrl);
    await sql`SELECT 1 as test`;
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

// Default connection for development
export const getDb = (env?: any) => {
  const databaseUrl = env?.DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return createDbConnection(databaseUrl);
};

// Export schema for use in other files
export * from './schema';
