import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { AuthService } from '../../services/auth.service';
import { errorResponse, successResponse } from '../../utils/response-builder';

// Type for environment variables
type Env = {
  Bindings: {
    NODE_ENV?: string;
    [key: string]: any;
  };
};

const app = new Hono<Env>();

// POST /api/auth/refresh-token
app.post('/', async c => {
  try {
    // Get refresh token from cookie
    const refreshToken = getCookie(c, 'refreshToken');

    if (!refreshToken) {
      return c.json(errorResponse('Refresh token not found'), 401);
    }

    const authService = new AuthService(c.env);
    const result = await authService.refreshToken(refreshToken);

    // Get user data from the access token payload
    const { verifyAccessToken } = await import('../../lib/jwt');
    const payload = verifyAccessToken(result.accessToken, c.env);

    const user = {
      id: payload.userId,
      email: payload.email,
      name: payload.name || '',
      role: payload.role,
      profile_image_url: payload.profile_image_url,
      is_verified: payload.is_verified || false,
    };

    // Set new secure HTTP-only cookies
    const isProduction = c.env?.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

    setCookie(c, 'accessToken', result.accessToken, {
      httpOnly: true, // Enhanced security - no JavaScript access
      secure: isProduction,
      sameSite: 'Strict',
      maxAge: 5 * 60, // 5 minutes = 300 seconds
      path: '/',
    });

    setCookie(c, 'refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days = 2,592,000 seconds
      path: '/',
    });

    return c.json(
      successResponse({
        message: 'Tokens refreshed successfully',
        user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }),
      200
    );
  } catch (error) {
    if (error instanceof Error) {
      return c.json(errorResponse(error.message), 401);
    }

    return c.json(errorResponse('Failed to refresh token'), 500);
  }
});

export default app;
