import { Hono } from 'hono';
import { getCookie, deleteCookie } from 'hono/cookie';
import { AuthService } from '../../services/auth.service';
import { authMiddleware } from '../../middleware/auth';
import { errorResponse, successResponse } from '../../utils/response-builder';

type Env = {
  Bindings: {
    NODE_ENV?: string;
    [key: string]: any;
  };
};

const app = new Hono<Env>();

// POST /api/auth/logout
app.post('/', authMiddleware, async c => {
  try {
    const user = c.get('user') as any;
    const refreshToken = getCookie(c, 'refreshToken');

    if (!user || !user.id) {
      return c.json(errorResponse('User not found'), 401);
    }

    const authService = new AuthService(c.env);
    await authService.logout(user.id, refreshToken);

    // Clear all authentication cookies (JWT and OAuth)
    deleteCookie(c, 'accessToken', {
      path: '/',
    });

    deleteCookie(c, 'refreshToken', {
      path: '/',
    });

    // Clear OAuth userInfo cookie
    deleteCookie(c, 'userInfo', {
      path: '/',
    });

    return c.json(successResponse({ message: 'Logged out successfully' }), 200);
  } catch (error) {
    console.error('Logout error:', error);

    // Clear cookies even if there's an error
    deleteCookie(c, 'accessToken', {
      path: '/',
    });

    deleteCookie(c, 'refreshToken', {
      path: '/',
    });

    // Clear OAuth userInfo cookie
    deleteCookie(c, 'userInfo', {
      path: '/',
    });

    return c.json(successResponse({ message: 'Logged out successfully' }), 200);
  }
});

export default app;
