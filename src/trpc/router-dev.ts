import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';

// Simple context type for development
type DevContext = {
  env: any;
  auth: { user: any };
  req: { ip: string; userAgent: string };
};

// Initialize tRPC
const t = initTRPC.context<DevContext>().create({
  transformer: superjson,
});

// Base router and procedure
export const router = t.router;
export const publicProcedure = t.procedure;

// Health router
const healthRouter = router({
  check: publicProcedure.query(() => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'hamsoya-backend-dev',
      message: 'Development server running',
    };
  }),
});

// Simple auth router for testing
const authRouter = router({
  // Mock login
  login: publicProcedure
    .input(z.object({ 
      email: z.string().email(), 
      password: z.string() 
    }))
    .mutation(async ({ input }) => {
      // Mock successful login
      return {
        message: 'Login successful (mock)',
        user: {
          id: '1',
          email: input.email,
          name: 'Test User',
          role: 'USER',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };
    }),

  // Mock register
  register: publicProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Mock successful registration
      return {
        message: 'Registration successful (mock)',
        user: {
          id: '1',
          email: input.email,
          name: input.name,
          role: 'USER',
        },
      };
    }),

  // Mock me endpoint
  me: publicProcedure.query(() => {
    return {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      isVerified: true,
    };
  }),
});

// Simple products router for testing
const productsRouter = router({
  list: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(10),
      offset: z.number().default(0),
    }))
    .query(({ input }) => {
      const mockProducts = [
        {
          id: '1',
          name: 'Pure Ghee',
          price: 850,
          category: 'ghee',
          inStock: true,
          description: 'Premium quality pure ghee made from cow milk',
          image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400',
        },
        {
          id: '2',
          name: 'Kalo Jira Honey',
          price: 650,
          category: 'honey',
          inStock: true,
          description: 'Natural honey from black cumin flowers',
          image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
        },
        {
          id: '3',
          name: 'Green Chili Powder',
          price: 120,
          category: 'spices',
          inStock: true,
          description: 'Fresh ground green chili powder',
          image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
        },
      ];

      let filteredProducts = mockProducts;

      if (input.category && input.category !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === input.category);
      }

      if (input.search) {
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(input.search!.toLowerCase()) ||
          p.description.toLowerCase().includes(input.search!.toLowerCase())
        );
      }

      const total = filteredProducts.length;
      const products = filteredProducts.slice(input.offset, input.offset + input.limit);

      return {
        products,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const mockProducts = [
        {
          id: '1',
          name: 'Pure Ghee',
          price: 850,
          category: 'ghee',
          inStock: true,
          description: 'Premium quality pure ghee made from cow milk',
          image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400',
          details: 'Made from the finest cow milk using traditional methods.',
        },
        {
          id: '2',
          name: 'Kalo Jira Honey',
          price: 650,
          category: 'honey',
          inStock: true,
          description: 'Natural honey from black cumin flowers',
          image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
          details: 'Pure, unprocessed honey with natural black cumin flavor.',
        },
      ];

      const product = mockProducts.find(p => p.id === input.id);
      if (!product) {
        throw new Error('Product not found');
      }

      return product;
    }),
});

// Main app router
export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  products: productsRouter,
});

export type AppRouter = typeof appRouter;
