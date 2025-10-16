import { serve } from '@hono/node-server';
import app from './index';

// Start server on port 5000
const port = 5000;
console.log(`🚀 Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
