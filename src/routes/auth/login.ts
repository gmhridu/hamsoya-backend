import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { zValidator } from '../../lib/zod-validator-fix';
import { AuthService } from '../../services/auth.service';
import { LoginSchema } from '../../types/auth';
import { errorResponse, successResponse } from '../../utils/response-builder';

// Type for environment variables
type Env = {
  NODE_ENV?: string;
  FRONTEND_URL?: string;
  [key: string]: any;
};

const app = new Hono<{ Bindings: Env }>();

/**
 * Get role-based redirect URL
 */
function getRoleBasedRedirectUrl(role: string, requestedRedirect?: string): string {
  // Validate requested redirect for security
  if (requestedRedirect && requestedRedirect !== '/login') {
    // Basic security check - ensure it's a relative path
    if (requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')) {
      // Additional role-based validation
      if (role === 'ADMIN' && requestedRedirect.startsWith('/admin')) {
        return requestedRedirect;
      } else if (role !== 'ADMIN' && !requestedRedirect.startsWith('/admin')) {
        return requestedRedirect;
      }
    }
  }

  // Default role-based redirects
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'SELLER':
      return '/dashboard';
    default:
      return '/';
  }
}

// POST /api/auth/login - Enhanced with server-side redirects
app.post('/', zValidator('json', LoginSchema), async c => {
  try {
    const input = c.req.valid('json');
    const authService = new AuthService(c.env);

    console.log(`[LOGIN] Attempting login for email: ${input.email}`);

    const result = await authService.login(input);

    console.log(`[LOGIN] Login successful for email: ${input.email}, role: ${result.user.role}`);

    // Set secure cookies with enhanced security
    const isProduction = c.env?.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

    // Access token: Allow JavaScript access for API calls
    setCookie(c, 'accessToken', result.accessToken, {
      httpOnly: false, // Allow JavaScript access for API calls
      secure: isProduction,
      sameSite: 'Strict',
      maxAge: 5 * 60, // 5 minutes = 300 seconds
      path: '/',
    });

    // Refresh token: Keep httpOnly for security
    setCookie(c, 'refreshToken', result.refreshToken, {
      httpOnly: true, // Secure, no JavaScript access
      secure: isProduction,
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days = 2,592,000 seconds
      path: '/',
    });

    // Check if client wants server-side redirect
    const acceptHeader = c.req.header('Accept') || '';
    const redirectParam = c.req.query('redirect');
    const wantsRedirect = acceptHeader.includes('text/html') || redirectParam === 'true';

    if (wantsRedirect) {
      // Server-side redirect for instant navigation
      const requestedRedirect = c.req.query('redirectTo');
      const redirectUrl = getRoleBasedRedirectUrl(result.user.role, requestedRedirect);

      const frontendUrl = c.env?.FRONTEND_URL || 'http://localhost:3000';
      const fullRedirectUrl = `${frontendUrl}${redirectUrl}`;

      console.log(`[LOGIN-API] Server-side redirect: ${result.user.role} -> ${fullRedirectUrl}`);

      return c.redirect(fullRedirectUrl, 302);
    }

    // Return JSON response for API clients
    return c.json(
      successResponse({
        user: result.user,
        message: 'Login successful',
        redirectUrl: getRoleBasedRedirectUrl(result.user.role),
      }),
      200
    );
  } catch (error) {
    console.error(`[LOGIN] Login failed for email: ${c.req.valid('json')?.email || 'unknown'}`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      env: {
        NODE_ENV: (c.env as any)?.NODE_ENV || process.env.NODE_ENV,
        hasJWTSecrets: !!((c.env as any)?.JWT_ACCESS_SECRET && (c.env as any)?.JWT_REFRESH_SECRET),
      }
    });

    if (error instanceof Error) {
      return c.json(errorResponse(error.message), 401);
    }

    return c.json(errorResponse('Login failed'), 500);
  }
});

export default app;
