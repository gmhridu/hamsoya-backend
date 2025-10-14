// Zod validator compatibility wrapper
import { zValidator as honoZValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';

// Create a wrapper that handles the Zod version compatibility
export const zValidator = (target: 'json' | 'query' | 'param', schema: ZodSchema) => {
  // Cast to any to bypass type compatibility issues between Zod versions
  return honoZValidator(target, schema as any);
};

// Alternative validator that bypasses Zod entirely for development
export const createSimpleValidator = (target: 'json' | 'query' | 'param') => {
  return (schema: ZodSchema) => {
    return async (c: any, next: any) => {
      try {
        let data;
        if (target === 'json') {
          data = await c.req.json();
        } else if (target === 'query') {
          data = c.req.query();
        } else if (target === 'param') {
          data = c.req.param();
        }

        // Validate with Zod
        const result = schema.parse(data);
        c.req.valid = () => result;

        await next();
      } catch (error) {
        return c.json({ error: 'Validation failed', details: error }, 400);
      }
    };
  };
};
