import type { Context, Next } from 'hono';

/**
 * Cache middleware for setting appropriate cache headers
 */

// Default cache headers for different types of endpoints
const CACHE_CONFIGS = {
  // No cache for authentication and sensitive endpoints
  noCache: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  // Short cache for user data that can change
  shortCache: {
    'Cache-Control': 'private, max-age=30, must-revalidate',
  },
  // Medium cache for semi-static data
  mediumCache: {
    'Cache-Control': 'public, max-age=300, must-revalidate', // 5 minutes
  },
  // Long cache for static data
  longCache: {
    'Cache-Control': 'public, max-age=3600, must-revalidate', // 1 hour
  },
};

/**
 * Apply no-cache headers for sensitive endpoints
 */
export const noCache = async (c: Context, next: Next) => {
  await next();

  Object.entries(CACHE_CONFIGS.noCache).forEach(([key, value]) => {
    c.header(key, value);
  });
};

/**
 * Apply short cache headers for user-specific data
 */
export const shortCache = async (c: Context, next: Next) => {
  await next();

  Object.entries(CACHE_CONFIGS.shortCache).forEach(([key, value]) => {
    c.header(key, value);
  });
};

/**
 * Apply medium cache headers for semi-static data
 */
export const mediumCache = async (c: Context, next: Next) => {
  await next();

  Object.entries(CACHE_CONFIGS.mediumCache).forEach(([key, value]) => {
    c.header(key, value);
  });
};

/**
 * Apply long cache headers for static data
 */
export const longCache = async (c: Context, next: Next) => {
  await next();

  Object.entries(CACHE_CONFIGS.longCache).forEach(([key, value]) => {
    c.header(key, value);
  });
};

/**
 * Smart cache middleware that applies appropriate cache headers based on the route
 */
export const smartCache = async (c: Context, next: Next) => {
  await next();

  const path = c.req.path;

  // No cache for authentication endpoints
  if (path.includes('/auth/') && (
    path.includes('/login') ||
    path.includes('/logout') ||
    path.includes('/refresh') ||
    path.includes('/verify') ||
    path.includes('/reset')
  )) {
    Object.entries(CACHE_CONFIGS.noCache).forEach(([key, value]) => {
      c.header(key, value);
    });
    return;
  }

  // Short cache for user profile endpoints
  if (path.includes('/auth/me') || path.includes('/user/profile')) {
    Object.entries(CACHE_CONFIGS.shortCache).forEach(([key, value]) => {
      c.header(key, value);
    });
    return;
  }

  // Medium cache for categories and other semi-static data
  if (path.includes('/categories') || path.includes('/health')) {
    Object.entries(CACHE_CONFIGS.mediumCache).forEach(([key, value]) => {
      c.header(key, value);
    });
    return;
  }

  // Default: no specific cache headers (let browser decide)
};

/**
 * ETag middleware for conditional requests
 */
export const etag = (generateETag: (c: Context) => string) => {
  return async (c: Context, next: Next) => {
    const etagValue = generateETag(c);
    const ifNoneMatch = c.req.header('If-None-Match');

    if (ifNoneMatch === etagValue) {
      return c.body(null, 304);
    }

    await next();
    c.header('ETag', etagValue);
    return;
  };
};
