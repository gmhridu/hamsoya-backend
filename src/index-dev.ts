import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { errorHandler } from './middleware/error';
import { appRouter } from './trpc/router-dev';

// Create Hono app
const app = new Hono();

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

// Simple health check
app.get('/api/health', c => {
  return c.json({
    status: 'ok',
    message: 'Backend is running!',
    timestamp: new Date().toISOString(),
    cors: 'fixed',
    environment: 'development',
  });
});

// Simple context creator for development
const createDevContext = (c: any) => {
  return {
    env: {
      NODE_ENV: 'development',
      FRONTEND_URL: 'http://localhost:3000',
      BACKEND_URL: 'http://localhost:8787',
      ...c.env,
    },
    auth: { user: null },
    req: {
      ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown',
    },
  };
};

// tRPC handler with simplified context
app.use('/trpc/*', async c => {
  try {
    return fetchRequestHandler({
      endpoint: '/trpc',
      req: c.req.raw,
      router: appRouter,
      createContext: () => createDevContext(c),
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
      },
      500
    );
  }
});

// Simple REST API routes for testing
app.get('/api/products', c => {
  const mockProducts = [
    {
      id: '1',
      name: 'Pure Ghee',
      price: 850,
      category: 'ghee',
      inStock: true,
      description: 'Premium quality pure ghee made from cow milk',
    },
    {
      id: '2',
      name: 'Kalo Jira Honey',
      price: 650,
      category: 'honey',
      inStock: true,
      description: 'Natural honey from black cumin flowers',
    },
  ];

  return c.json({ products: mockProducts });
});

// Global error handler
app.onError(errorHandler);

// 404 handler
app.notFound(c => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

export default app;
