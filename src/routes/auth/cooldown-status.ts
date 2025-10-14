import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../../lib/zod-validator-fix';
import { AuthService } from '../../services/auth.service';
import { errorResponse, successResponse } from '../../utils/response-builder';

const app = new Hono();

// Schema for cooldown status request (POST)
const CooldownStatusSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Schema for cooldown status query (GET)
const CooldownStatusQuerySchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Cache for cooldown status to reduce Redis load
const cooldownCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2000; // 2 seconds cache

// Shared cooldown status handler with caching
async function handleCooldownStatus(c: any, email: string) {
  try {
    // Check cache first
    const cacheKey = `cooldown:${email}`;
    const cached = cooldownCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL) {
      console.log(`📋 Cooldown status served from cache for ${email}`);
      return c.json(successResponse(cached.data, 'Cooldown status retrieved from cache'), 200);
    }

    // Fetch from service
    const authService = new AuthService(c.env);
    const result = await authService.getOTPCooldownStatus(email);

    // Cache the result
    cooldownCache.set(cacheKey, { data: result, timestamp: now });

    // Clean up old cache entries (simple cleanup)
    if (cooldownCache.size > 1000) {
      const cutoff = now - CACHE_TTL * 2;
      for (const [key, value] of cooldownCache.entries()) {
        if (value.timestamp < cutoff) {
          cooldownCache.delete(key);
        }
      }
    }

    console.log(`📋 Cooldown status fetched and cached for ${email}`);
    return c.json(successResponse(result, 'Cooldown status retrieved successfully'), 200);
  } catch (error) {
    console.error('Cooldown status error:', error);

    if (error instanceof Error) {
      return c.json(errorResponse(error.message), 400);
    }

    return c.json(errorResponse('Failed to get cooldown status'), 500);
  }
}

// GET /api/auth/cooldown-status?email=...
app.get('/', zValidator('query', CooldownStatusQuerySchema), async c => {
  const input = c.req.valid('query');
  return handleCooldownStatus(c, input.email);
});

// POST /api/auth/cooldown-status (backward compatibility)
app.post('/', zValidator('json', CooldownStatusSchema), async c => {
  const input = c.req.valid('json');
  return handleCooldownStatus(c, input.email);
});

export default app;
