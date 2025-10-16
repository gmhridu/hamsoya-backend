import { serve } from '@hono/node-server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { smartCache } from './middleware/cache';
import { errorHandler } from './middleware/error';
import routes from './routes';
import { createContext } from './trpc/context';
import { appRouter } from './trpc/router';

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', smartCache);

// Environment middleware for development
app.use('*', async (c, next) => {
  // In Node.js environment, populate c.env with process.env
  if (!c.env || Object.keys(c.env).length === 0) {
    c.env = process.env as any;
  }
  await next();
});

// CORS configuration for same-domain deployment
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      // Allow same domain and localhost for development
      const allowedOrigins = [
        'https://hamsoya.com',
        'https://hamsoya.vercel.app',
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

// REST API routes
app.route('/api', routes);

// tRPC handler
app.use('/trpc/*', async c => {
  return fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext(c),
    onError: ({ error, path }) => {
      console.error(`❌ tRPC failed on ${path}:`, error);
    },
  });
});

// Global error handler
app.onError(errorHandler);

// 404 handler
app.notFound(c => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Export the Hono app without starting the server
// This allows for Cloudflare Workers deployment while still supporting Node.js server
// The server is started in src/server.ts for local development
export default app;
