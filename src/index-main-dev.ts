import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { errorHandler } from './middleware/error';
import routes from './routes';
import { createContext } from './trpc/context';
import { appRouter } from './trpc/router';

// Type for Hono context with environment variables
type HonoEnv = {
  Variables: {
    user?: any;
  };
  Bindings: {
    NODE_ENV?: string;
    FRONTEND_URL?: string;
    BACKEND_URL?: string;
    [key: string]: any;
  };
};

// Create Hono app with typed environment
const app = new Hono<HonoEnv>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());

// CORS configuration for same-domain deployment
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      // Allow same domain and localhost for development
      const allowedOrigins = [
        'https://hamsoya.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];

      // If no origin (same-origin requests) or origin is in allowed list, return it
      if (!origin || allowedOrigins.includes(origin)) {
        return origin || 'https://hamsoya.com';
      }

      // For development, also allow any localhost origin
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return origin;
      }

      // Default fallback for disallowed origins
      return 'https://hamsoya.com';
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// Health check endpoint
app.get('/api/health', c => {
  return c.json({
    status: 'ok',
    message: 'Main backend is running!',
    timestamp: new Date().toISOString(),
    cors: 'fixed',
    environment: c.env?.NODE_ENV || process.env.NODE_ENV || 'development',
  });
});

// REST API routes with error handling
app.route('/api', routes);

// Enhanced context creator with error handling
const createContextWithErrorHandling = async (c: any) => {
  try {
    return await createContext(c);
  } catch (error) {
    console.warn('Context creation failed, falling back to development router');
    throw error; // Let it fail and use the development router instead
  }
};

// tRPC handler with enhanced error handling
app.use('/trpc/*', async c => {
  try {
    return fetchRequestHandler({
      endpoint: '/trpc',
      req: c.req.raw,
      router: appRouter,
      createContext: () => createContextWithErrorHandling(c),
      onError: ({ error, path }) => {
        console.error(`❌ tRPC failed on ${path}:`, error);
      },
    });
  } catch (error) {
    console.error('tRPC handler error:', error);
    return c.json(
      {
        error: 'tRPC handler error',
        message: error instanceof Error ? error.message : 'Unknown error',
        path: c.req.path,
      },
      500
    );
  }
});

// Global error handler
app.onError(errorHandler);

// 404 handler
app.notFound(c => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

export default app;
