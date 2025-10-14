import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getCookie } from 'hono/cookie';
import { createHash, randomBytes } from 'crypto';

// Security headers middleware
export const securityHeaders = async (c: Context, next: Next) => {
  await next();

  // Set security headers
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Only set HSTS in production
  if (c.env?.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
};

// Request size limiting middleware
export const requestSizeLimit = (maxSize: number = 1024 * 1024) => {
  // Default 1MB
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header('content-length');

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      throw new HTTPException(413, { message: 'Request entity too large' });
    }

    await next();
  };
};

// IP whitelist/blacklist middleware
export const ipFilter = (options: {
  whitelist?: string[];
  blacklist?: string[];
  message?: string;
}) => {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header('CF-Connecting-IP') ||
      c.req.header('X-Forwarded-For') ||
      c.req.header('X-Real-IP') ||
      'unknown';

    // Check blacklist first
    if (options.blacklist && options.blacklist.includes(ip)) {
      throw new HTTPException(403, {
        message: options.message || 'Access denied from this IP address',
      });
    }

    // Check whitelist if provided
    if (options.whitelist && !options.whitelist.includes(ip)) {
      throw new HTTPException(403, {
        message: options.message || 'Access denied from this IP address',
      });
    }

    await next();
  };
};

// User agent validation middleware
export const userAgentValidation = async (c: Context, next: Next) => {
  const userAgent = c.req.header('User-Agent');

  // Block requests without user agent (potential bots)
  if (!userAgent) {
    throw new HTTPException(400, { message: 'User-Agent header is required' });
  }

  // Block known malicious user agents
  const maliciousPatterns = [/sqlmap/i, /nikto/i, /nessus/i, /masscan/i, /nmap/i, /zap/i, /burp/i];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(userAgent)) {
      throw new HTTPException(403, { message: 'Access denied' });
    }
  }

  await next();
};

// Request method validation
export const methodValidation = (allowedMethods: string[]) => {
  return async (c: Context, next: Next) => {
    if (!allowedMethods.includes(c.req.method)) {
      throw new HTTPException(405, { message: 'Method not allowed' });
    }

    await next();
  };
};

// Content type validation for POST/PUT requests
export const contentTypeValidation = async (c: Context, next: Next) => {
  const method = c.req.method;

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentType = c.req.header('Content-Type');

    if (!contentType) {
      throw new HTTPException(400, { message: 'Content-Type header is required' });
    }

    // Allow only JSON and form data
    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
    ];

    const isAllowed = allowedTypes.some(type => contentType.includes(type));

    if (!isAllowed) {
      throw new HTTPException(415, { message: 'Unsupported Media Type' });
    }
  }

  await next();
};

// Request timeout middleware
export const requestTimeout = (timeoutMs: number = 30000) => {
  // Default 30 seconds
  return async (c: Context, next: Next) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new HTTPException(408, { message: 'Request timeout' }));
      }, timeoutMs);
    });

    try {
      await Promise.race([next(), timeoutPromise]);
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: 'Internal server error' });
    }
  };
};

// CSRF protection for state-changing operations
export const csrfProtection = async (c: Context, next: Next) => {
  const method = c.req.method;

  // Only check CSRF for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = c.req.header('Origin');
    const referer = c.req.header('Referer');

    // In production, ensure requests come from allowed origins
    if (c.env?.NODE_ENV === 'production') {
      const allowedOrigins = ['https://hamsoya.com', 'https://www.hamsoya.com'];

      if (origin && !allowedOrigins.includes(origin)) {
        throw new HTTPException(403, { message: 'CSRF protection: Invalid origin' });
      }

      if (referer) {
        const refererUrl = new URL(referer);
        if (!allowedOrigins.includes(refererUrl.origin)) {
          throw new HTTPException(403, { message: 'CSRF protection: Invalid referer' });
        }
      }
    }
  }

  await next();
};

// Combine all security middlewares
export const applySecurity = () => {
  return [
    securityHeaders,
    requestSizeLimit(2 * 1024 * 1024), // 2MB limit
    userAgentValidation,
    contentTypeValidation,
    requestTimeout(30000), // 30 second timeout
    csrfProtection,
    enhancedSessionValidation,
    enhancedRateLimit(),
  ];
};

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Enhanced Rate Limiting Middleware
 */
export const enhancedRateLimit = (options: { windowMs: number; maxRequests: number } = { windowMs: 15 * 60 * 1000, maxRequests: 100 }) => {
  return async (c: Context, next: Next) => {
    const clientIP = c.req.header('CF-Connecting-IP') ||
                    c.req.header('X-Forwarded-For') ||
                    c.req.header('X-Real-IP') ||
                    'unknown';

    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Clean up old entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < windowStart) {
        rateLimitStore.delete(key);
      }
    }

    // Check current rate limit
    const current = rateLimitStore.get(clientIP);

    if (!current) {
      rateLimitStore.set(clientIP, { count: 1, resetTime: now + options.windowMs });
    } else if (current.resetTime < now) {
      rateLimitStore.set(clientIP, { count: 1, resetTime: now + options.windowMs });
    } else if (current.count >= options.maxRequests) {
      throw new HTTPException(429, {
        message: 'Too many requests',
        cause: { retryAfter: Math.ceil((current.resetTime - now) / 1000) }
      });
    } else {
      current.count++;
    }

    await next();
  };
};

/**
 * Enhanced Session Validation Middleware
 */
export const enhancedSessionValidation = async (c: Context, next: Next) => {
  const accessToken = getCookie(c, 'accessToken');
  const refreshToken = getCookie(c, 'refreshToken');

  // If we have tokens, validate them
  if (accessToken || refreshToken) {
    try {
      // Basic token format validation
      if (accessToken && !isValidJWTFormat(accessToken)) {
        // Clear invalid access token
        c.header('Set-Cookie', 'accessToken=; Path=/; Max-Age=0; HttpOnly=false; Secure; SameSite=Strict');
      }

      if (refreshToken && !isValidJWTFormat(refreshToken)) {
        // Clear invalid refresh token
        c.header('Set-Cookie', 'refreshToken=; Path=/; Max-Age=0; HttpOnly=true; Secure; SameSite=Strict');
      }
    } catch (error) {
      console.error('Session validation error:', error);
    }
  }

  await next();
};

/**
 * Utility function to validate JWT format
 */
function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    // Try to decode each part
    atob(parts[0]); // header
    atob(parts[1]); // payload
    // Don't decode signature as it's binary
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, expected: string): boolean {
  if (!token || !expected) return false;

  // Use constant-time comparison to prevent timing attacks
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expectedHash = createHash('sha256').update(expected).digest('hex');

  return tokenHash === expectedHash;
}
