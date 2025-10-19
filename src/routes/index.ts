import { Hono } from 'hono';
import authRoutes from './auth';
import adminRoutes from './admin';
import { renderEmailService } from '../lib/sendEmail';

const app = new Hono();

// Mount route modules
app.route('/auth', authRoutes);
app.route('/admin', adminRoutes);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hamsoya-backend',
    version: '1.0.0',
  });
});

// Email service health check
app.get('/health/email', async (c) => {
  try {
    const emailHealth = await renderEmailService.healthCheck();
    const emailInfo = renderEmailService.getServiceInfo();

    return c.json({
      status: emailHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'email-service',
      healthy: emailHealth,
      configuration: emailInfo,
    });
  } catch (error) {
    return c.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'email-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export default app;
