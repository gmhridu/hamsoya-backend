import type { Context as HonoContext } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyAccessToken } from '../lib/jwt';
import { UserService } from '../services/user.service';
import type { AuthContext } from '../types/auth';
import { db } from '@/db/db';

// Create context for tRPC
export const createContext = async (c: HonoContext) => {
  // Get environment variables from Hono context
  const env = c.env;

  // Initialize database
  const dbInstance = db;

  // Initialize services
  const userService = new UserService();

  // Try to get user from token
  let authContext: AuthContext = { user: null };

  try {
    // Get access token from cookie or Authorization header
    let token: string | undefined;

    // First try to get from cookie
    token = getCookie(c, 'accessToken');

    // If not in cookie, try Authorization header
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      // Verify token
      const payload = verifyAccessToken(token, env);

      // Get user details
      const user = await userService.getUserById(payload.userId);

      if (user) {
        authContext.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as any,
          isVerified: user.is_verified,
        };
      }
    }
  } catch (error) {
    // Token is invalid or expired, but we don't throw here
    // Let the procedures handle authentication as needed
    console.log('Token verification failed:', error);
  }

  return {
    dbInstance,
    env,
    auth: authContext,
    userService,
    // Add request context for IP, user agent, etc.
    req: {
      ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown',
    },
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
