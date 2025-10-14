import { Context } from 'hono';
import { getConfig } from './env';

// OAuth state validation
export function generateOAuthState(): string {
  const timestamp = Date.now().toString();
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const randomString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return Buffer.from(`${timestamp}:${randomString}`).toString('base64url');
}

export function validateOAuthState(state: string, maxAgeMs: number = 10 * 60 * 1000): boolean {
  try {
    const decoded = Buffer.from(state, 'base64url').toString();
    const [timestamp, randomString] = decoded.split(':');

    if (!timestamp || !randomString) {
      return false;
    }

    const stateAge = Date.now() - parseInt(timestamp, 10);
    return stateAge <= maxAgeMs;
  } catch (error) {
    return false;
  }
}

// CSRF protection for OAuth flows
export function generateCSRFToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken && token.length === 64;
}

// Rate limiting for OAuth endpoints
const oauthAttempts = new Map<string, { count: number; resetTime: number }>();

export function checkOAuthRateLimit(clientIP: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const key = `oauth:${clientIP}`;

  const attempt = oauthAttempts.get(key);

  if (!attempt || now > attempt.resetTime) {
    oauthAttempts.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (attempt.count >= maxAttempts) {
    return false;
  }

  attempt.count++;
  return true;
}

// OAuth callback validation
export interface OAuthCallbackValidation {
  isValid: boolean;
  error?: string;
  code?: string;
  state?: string;
}

export function validateOAuthCallback(c: Context): OAuthCallbackValidation {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');
  const errorDescription = c.req.query('error_description');

  // Check for OAuth errors
  if (error) {
    return {
      isValid: false,
      error: `OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`,
    };
  }

  // Validate required parameters
  if (!code) {
    return {
      isValid: false,
      error: 'Missing authorization code',
    };
  }

  if (!state) {
    return {
      isValid: false,
      error: 'Missing state parameter',
    };
  }

  // Note: State format validation is handled by individual OAuth routes
  // since different OAuth providers may use different state formats
  return {
    isValid: true,
    code,
    state,
  };
}

// Secure token storage helpers
export function encryptOAuthToken(token: string, secret: string): string {
  // Simple XOR encryption for demonstration - use proper encryption in production
  const key = Buffer.from(secret).subarray(0, 32);
  const tokenBuffer = Buffer.from(token);
  const encrypted = Buffer.alloc(tokenBuffer.length);

  for (let i = 0; i < tokenBuffer.length; i++) {
    encrypted[i] = tokenBuffer[i] ^ key[i % key.length];
  }

  return encrypted.toString('base64');
}

export function decryptOAuthToken(encryptedToken: string, secret: string): string {
  // Simple XOR decryption for demonstration - use proper decryption in production
  const key = Buffer.from(secret).subarray(0, 32);
  const encrypted = Buffer.from(encryptedToken, 'base64');
  const decrypted = Buffer.alloc(encrypted.length);

  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }

  return decrypted.toString();
}

// OAuth session security
export function createSecureOAuthSession(user: any, env: any) {
  const config = getConfig(env);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    profile_image_url: user.profile_image_url,
    is_verified: user.is_verified,
    authMethod: 'oauth',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + config.session.maxAge).toISOString(),
  };
}

// OAuth security headers
export function setOAuthSecurityHeaders(c: Context, config?: any) {
  const oauthConfig = config || { session: { secure: process.env.NODE_ENV === 'production' } };

  // Prevent clickjacking
  c.header('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // XSS protection
  c.header('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy for OAuth pages
  c.header('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' accounts.google.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' accounts.google.com oauth2.googleapis.com; " +
    "frame-src accounts.google.com;"
  );

  // HSTS in production
  if (oauthConfig.session.secure) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

// OAuth audit logging
export function logOAuthEvent(event: string, details: any, clientIP?: string) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    clientIP,
    details: {
      ...details,
      // Remove sensitive data
      access_token: details.access_token ? '[REDACTED]' : undefined,
      refresh_token: details.refresh_token ? '[REDACTED]' : undefined,
      client_secret: undefined,
    },
  };

  console.log(`[OAUTH-AUDIT] ${JSON.stringify(logEntry)}`);
}

// OAuth error handling
export function handleOAuthError(error: any, context: string): {
  userMessage: string;
  logMessage: string;
  statusCode: number
} {
  const timestamp = new Date().toISOString();

  if (error.message?.includes('invalid_grant')) {
    return {
      userMessage: 'Authentication expired. Please try again.',
      logMessage: `[${timestamp}] OAuth invalid_grant error in ${context}: ${error.message}`,
      statusCode: 401,
    };
  }

  if (error.message?.includes('access_denied')) {
    return {
      userMessage: 'Access was denied. Please grant the necessary permissions.',
      logMessage: `[${timestamp}] OAuth access_denied in ${context}: ${error.message}`,
      statusCode: 403,
    };
  }

  if (error.message?.includes('rate_limit')) {
    return {
      userMessage: 'Too many requests. Please try again later.',
      logMessage: `[${timestamp}] OAuth rate limit exceeded in ${context}: ${error.message}`,
      statusCode: 429,
    };
  }

  return {
    userMessage: 'Authentication failed. Please try again.',
    logMessage: `[${timestamp}] OAuth error in ${context}: ${error.message || error}`,
    statusCode: 500,
  };
}
