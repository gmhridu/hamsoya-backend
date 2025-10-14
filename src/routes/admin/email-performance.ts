import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../../lib/zod-validator-fix';
import { emailPerformanceMonitor } from '../../lib/email-performance-monitor';
import { successResponse, errorResponse } from '../../utils/response-builder';
import type { HonoEnv } from '../../types/hono';

const app = new Hono<HonoEnv>();

// Schema for performance query parameters
const PerformanceQuerySchema = z.object({
  timeRange: z.string().optional().default('60'), // minutes
});

// GET /api/admin/email-performance/stats
app.get('/stats', zValidator('query', PerformanceQuerySchema), async c => {
  try {
    const { timeRange } = c.req.valid('query');
    const timeRangeMinutes = parseInt(timeRange, 10);

    if (isNaN(timeRangeMinutes) || timeRangeMinutes < 1 || timeRangeMinutes > 1440) {
      return c.json(errorResponse('Invalid time range. Must be between 1 and 1440 minutes.'), 400);
    }

    const stats = emailPerformanceMonitor.getPerformanceStats(timeRangeMinutes);

    return c.json(successResponse(stats, 'Performance statistics retrieved successfully'), 200);
  } catch (error) {
    console.error('Email performance stats error:', error);
    return c.json(errorResponse('Failed to get performance statistics'), 500);
  }
});

// GET /api/admin/email-performance/report
app.get('/report', zValidator('query', PerformanceQuerySchema), async c => {
  try {
    const { timeRange } = c.req.valid('query');
    const timeRangeMinutes = parseInt(timeRange, 10);

    if (isNaN(timeRangeMinutes) || timeRangeMinutes < 1 || timeRangeMinutes > 1440) {
      return c.json(errorResponse('Invalid time range. Must be between 1 and 1440 minutes.'), 400);
    }

    const report = emailPerformanceMonitor.generatePerformanceReport(timeRangeMinutes);

    return c.json(successResponse({ report }, 'Performance report generated successfully'), 200);
  } catch (error) {
    console.error('Email performance report error:', error);
    return c.json(errorResponse('Failed to generate performance report'), 500);
  }
});

// GET /api/admin/email-performance/status
app.get('/status', async c => {
  try {
    const status = emailPerformanceMonitor.getRealtimeStatus();

    return c.json(successResponse(status, 'Real-time status retrieved successfully'), 200);
  } catch (error) {
    console.error('Email performance status error:', error);
    return c.json(errorResponse('Failed to get real-time status'), 500);
  }
});

// GET /api/admin/email-performance/health
app.get('/health', async c => {
  try {
    const status = emailPerformanceMonitor.getRealtimeStatus();
    const stats = emailPerformanceMonitor.getPerformanceStats(5); // Last 5 minutes

    const healthData = {
      status: status.status,
      message: status.message,
      recentActivity: {
        totalEmails: stats.totalEmails,
        successRate: stats.totalEmails > 0 ? Math.round((stats.successfulEmails / stats.totalEmails) * 100) : 100,
        averageDeliveryTime: stats.averageTotalTime,
        fallbackRate: stats.fallbackRate,
      },
      timestamp: new Date().toISOString(),
    };

    // Set appropriate HTTP status based on health
    const httpStatus = status.status === 'critical' ? 503 : status.status === 'warning' ? 200 : 200;

    return c.json(successResponse(healthData, 'Email system health check completed'), httpStatus);
  } catch (error) {
    console.error('Email performance health check error:', error);
    return c.json(errorResponse('Health check failed'), 500);
  }
});

export default app;
