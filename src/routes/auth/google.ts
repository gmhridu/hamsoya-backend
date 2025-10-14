import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { successResponse, errorResponse } from '../../utils/response-builder';
import {
  validateOAuthCallback,
  checkOAuthRateLimit,
  setOAuthSecurityHeaders,
  logOAuthEvent,
  handleOAuthError
} from '../../lib/oauth-security';

const app = new Hono();

/**
 * Get role-based redirect URL - matches login.ts logic
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

// GET /auth/google - Initiate Google OAuth
app.get('/', async (c) => {
  try {
    // Set security headers (without config to avoid validation)
    setOAuthSecurityHeaders(c);

    // Rate limiting
    const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    if (!checkOAuthRateLimit(clientIP)) {
      logOAuthEvent('rate_limit_exceeded', { clientIP }, clientIP);
      return c.json(errorResponse('Too many requests. Please try again later.'), 429 as any);
    }

    // Store the original URL for redirect after authentication
    const redirectTo = c.req.query('redirectTo');

    // Generate secure state parameter
    const stateData = { redirectTo, timestamp: Date.now() };
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Log OAuth initiation
    logOAuthEvent('oauth_initiated', { redirectTo, clientIP }, clientIP);

    // Redirect to Google OAuth with secure state parameter
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
    googleAuthUrl.searchParams.set('redirect_uri', process.env.GOOGLE_CALLBACK_URL!);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'profile email');
    googleAuthUrl.searchParams.set('state', encodedState);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');

    return c.redirect(googleAuthUrl.toString());
  } catch (error) {
    const errorInfo = handleOAuthError(error, 'oauth_initiation');
    logOAuthEvent('oauth_initiation_error', { error: errorInfo.logMessage });
    return c.json(errorResponse(errorInfo.userMessage), errorInfo.statusCode as any);
  }
});

// GET /auth/google/callback - Handle Google OAuth callback
app.get('/callback', async (c) => {
  try {
    // Set security headers
    setOAuthSecurityHeaders(c);

    const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

    // Validate OAuth callback parameters
    const validation = validateOAuthCallback(c);
    if (!validation.isValid) {
      logOAuthEvent('oauth_callback_validation_failed', { error: validation.error, clientIP }, clientIP);
      return c.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_error&message=${encodeURIComponent(validation.error || 'Invalid callback')}`);
    }

    const { code, state } = validation;

    // Parse and validate state to get redirect URL
    let requestedRedirectTo: string | undefined;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
        requestedRedirectTo = stateData.redirectTo;

        // Validate state timestamp (10 minutes max)
        const stateAge = Date.now() - (stateData.timestamp || 0);
        if (stateAge > 10 * 60 * 1000) {
          throw new Error('State parameter expired');
        }
      } catch (parseError) {
        logOAuthEvent('oauth_state_parse_error', { error: parseError, clientIP }, clientIP);
        return c.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_error&message=Invalid state parameter`);
      }
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code!,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_CALLBACK_URL!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();

    // Get user profile from Google
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${(tokens as any).access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const profile = await profileResponse.json();

    // Use GoogleAuthService to create/update user
    const { GoogleAuthService } = await import('../../services/google-auth.service');
    const googleAuthService = new GoogleAuthService(c.env);

    const userProfile = {
      id: (profile as any).id,
      email: (profile as any).email,
      name: (profile as any).name,
      picture: (profile as any).picture,
      verified_email: (profile as any).verified_email,
    };

    const userTokens = {
      access_token: (tokens as any).access_token,
      refresh_token: (tokens as any).refresh_token,
      expires_in: (tokens as any).expires_in || 3600,
      token_type: (tokens as any).token_type || 'Bearer',
    };

    const result = await googleAuthService.findOrCreateUser(userProfile, userTokens);

    // Set secure cookies
    const isProduction = (c.env as any)?.NODE_ENV === 'production';

    setCookie(c, 'accessToken', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    setCookie(c, 'refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // Set user info cookie for client-side access (non-sensitive data only)
    setCookie(c, 'userInfo', JSON.stringify({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      profile_image_url: result.user.profile_image_url,
      is_verified: result.user.is_verified,
    }), {
      httpOnly: false, // Allow client-side access
      secure: isProduction,
      sameSite: 'Strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    // Get role-based redirect URL
    const finalRedirectUrl = getRoleBasedRedirectUrl(result.user.role, requestedRedirectTo);

    // Set cookies for the frontend (following login route pattern)
    setCookie(c, 'accessToken', result.accessToken, {
      httpOnly: false, // Allow JavaScript access for API calls
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes (match backend)
      path: '/',
    });

    setCookie(c, 'refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // Set user info cookie
    const userInfo = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      profileImage: result.user.profile_image_url,
      isVerified: result.user.is_verified,
      authMethod: 'oauth',
    };

    setCookie(c, 'userInfo', JSON.stringify(userInfo), {
      httpOnly: false, // Allow client access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    // Redirect to frontend with success
    const successUrl = `${process.env.FRONTEND_URL}${finalRedirectUrl}?auth=success${result.isNewUser ? '&new_user=true' : ''}`;

    console.log(`[GOOGLE-OAUTH] Role-based redirect: ${result.user.role} -> ${finalRedirectUrl}`);
    return c.redirect(successUrl);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    return c.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_error&message=${encodeURIComponent(errorMessage)}`);
  }
});

// POST /auth/google/link - Link Google account to existing user
app.post('/link', async (c) => {
  try {
    // This would be called from the frontend after user is already authenticated
    // Implementation would be similar to callback but for linking existing accounts
    return c.json(successResponse({ message: 'Google account linking not yet implemented' }));
  } catch (error) {
    console.error('Google account linking error:', error);
    return c.json(errorResponse('Failed to link Google account'), 500 as any);
  }
});

// POST /auth/google/unlink - Unlink Google account
app.post('/unlink', async (c) => {
  try {
    // This would require authentication middleware
    return c.json(successResponse({ message: 'Google account unlinking not yet implemented' }));
  } catch (error) {
    console.error('Google account unlinking error:', error);
    return c.json(errorResponse('Failed to unlink Google account'), 500 as any);
  }
});

export default app;
