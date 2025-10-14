import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

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

// Simple test routes
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    message: 'Backend is running!',
    timestamp: new Date().toISOString(),
    cors: 'fixed'
  });
});

app.get('/api/test-cors', (c) => {
  return c.json({ 
    message: 'CORS is working!',
    origin: c.req.header('Origin') || 'no-origin',
    userAgent: c.req.header('User-Agent'),
  });
});

// Simple products endpoint for testing
app.get('/api/products', (c) => {
  const mockProducts = [
    {
      id: '1',
      name: 'Pure Ghee',
      price: 850,
      category: 'ghee',
      inStock: true,
      description: 'Premium quality pure ghee made from cow milk'
    },
    {
      id: '2', 
      name: 'Kalo Jira Honey',
      price: 650,
      category: 'honey',
      inStock: true,
      description: 'Natural honey from black cumin flowers'
    }
  ];
  
  return c.json({ products: mockProducts });
});

// tRPC-like endpoint for testing
app.all('/trpc/*', (c) => {
  return c.json({ 
    message: 'tRPC endpoint placeholder',
    path: c.req.path,
    method: c.req.method
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
