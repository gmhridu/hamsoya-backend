import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { getRedis } from './redis';
import { getConfig } from './env';

export function createSessionConfig(env: any) {
  const config = getConfig(env);
  const redis = getRedis(config.redis.url);

  // Create Redis store for sessions
  const store = new RedisStore({
    client: redis,
    prefix: 'hamsoya:session:',
    ttl: config.session.maxAge / 1000, // Convert to seconds
  });

  return session({
    store,
    secret: config.session.secret,
    name: config.session.name,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiry on each request
    cookie: {
      secure: config.session.secure, // HTTPS only in production
      httpOnly: true, // Prevent XSS
      maxAge: config.session.maxAge,
      sameSite: config.session.sameSite,
    },
  });
}

// Session cleanup utility
export async function cleanupExpiredSessions(env: any) {
  try {
    const config = getConfig(env);
    const redis = getRedis(config.redis.url);

    // Get all session keys
    const sessionKeys = await redis.keys('hamsoya:session:*');

    let cleanedCount = 0;
    for (const key of sessionKeys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        // Key exists but has no expiry, set one
        await redis.expire(key, config.session.maxAge / 1000);
      } else if (ttl === -2) {
        // Key doesn't exist (already expired)
        cleanedCount++;
      }
    }

    console.log(`Session cleanup completed. Processed ${sessionKeys.length} sessions, ${cleanedCount} were expired.`);
    return { processed: sessionKeys.length, expired: cleanedCount };
  } catch (error) {
    console.error('Error during session cleanup:', error);
    throw error;
  }
}

// Get session statistics
export async function getSessionStats(env: any) {
  try {
    const config = getConfig(env);
    const redis = getRedis(config.redis.url);

    const sessionKeys = await redis.keys('hamsoya:session:*');
    const activeSessions = sessionKeys.length;

    // Get memory usage for sessions
    let totalMemory = 0;
    for (const key of sessionKeys.slice(0, 100)) { // Sample first 100 for performance
      const memory = await redis.memory('USAGE', key);
      totalMemory += memory || 0;
    }

    const avgMemoryPerSession = sessionKeys.length > 0 ? totalMemory / Math.min(sessionKeys.length, 100) : 0;
    const estimatedTotalMemory = avgMemoryPerSession * sessionKeys.length;

    return {
      activeSessions,
      estimatedTotalMemory: Math.round(estimatedTotalMemory),
      avgMemoryPerSession: Math.round(avgMemoryPerSession),
    };
  } catch (error) {
    console.error('Error getting session stats:', error);
    return {
      activeSessions: 0,
      estimatedTotalMemory: 0,
      avgMemoryPerSession: 0,
    };
  }
}

// Destroy all sessions for a specific user
export async function destroyUserSessions(userId: string, env: any) {
  try {
    const config = getConfig(env);
    const redis = getRedis(config.redis.url);

    // Get all session keys
    const sessionKeys = await redis.keys('hamsoya:session:*');

    let destroyedCount = 0;
    for (const key of sessionKeys) {
      try {
        const sessionData = await redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.passport && session.passport.user && session.passport.user.id === userId) {
            await redis.del(key);
            destroyedCount++;
          }
        }
      } catch (parseError) {
        // Skip invalid session data
        continue;
      }
    }

    console.log(`Destroyed ${destroyedCount} sessions for user ${userId}`);
    return destroyedCount;
  } catch (error) {
    console.error('Error destroying user sessions:', error);
    throw error;
  }
}

// Get active sessions for a user
export async function getUserSessions(userId: string, env: any) {
  try {
    const config = getConfig(env);
    const redis = getRedis(config.redis.url);

    const sessionKeys = await redis.keys('hamsoya:session:*');
    const userSessions = [];

    for (const key of sessionKeys) {
      try {
        const sessionData = await redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.passport && session.passport.user && session.passport.user.id === userId) {
            const ttl = await redis.ttl(key);
            userSessions.push({
              sessionId: key.replace('hamsoya:session:', ''),
              expiresIn: ttl,
              lastAccess: session.cookie?.expires ? new Date(session.cookie.expires) : null,
            });
          }
        }
      } catch (parseError) {
        continue;
      }
    }

    return userSessions;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}

// Session health check
export async function checkSessionHealth(env: any) {
  try {
    const config = getConfig(env);
    const redis = getRedis(config.redis.url);

    // Test Redis connection
    await redis.ping();

    // Get basic stats
    const stats = await getSessionStats(env);

    return {
      healthy: true,
      redisConnected: true,
      ...stats,
    };
  } catch (error) {
    console.error('Session health check failed:', error);
    return {
      healthy: false,
      redisConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
