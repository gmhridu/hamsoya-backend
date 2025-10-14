import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { BookmarkService } from '../services/bookmark.service';
import { CartService } from '../services/cart.service';
import { ProductService } from '../services/product.service';
import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
  VerifyOTPSchema,
} from '../types/auth';
import type { Context } from './context';

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Base router and procedure
export const router = t.router;
export const publicProcedure = t.procedure;

// Authenticated procedure
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      auth: {
        ...ctx.auth,
        user: ctx.auth.user, // TypeScript knows user is not null here
      },
    },
  });
});

// Admin procedure
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.auth.user?.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({ ctx });
});

// Seller procedure
export const sellerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.auth.user?.role !== 'SELLER' && ctx.auth.user?.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Seller access required',
    });
  }

  return next({ ctx });
});

// Auth router
const authRouter = router({
  // Register
  register: publicProcedure.input(RegisterSchema).mutation(async ({ input, ctx }) => {
    const authService = new AuthService(ctx.env);
    return await authService.register(input);
  }),

  // Login
  login: publicProcedure.input(LoginSchema).mutation(async ({ input, ctx }) => {
    const authService = new AuthService(ctx.env);
    return await authService.login(input);
  }),

  // Verify OTP
  verify: publicProcedure.input(VerifyOTPSchema).mutation(async ({ input, ctx }) => {
    const authService = new AuthService(ctx.env);
    return await authService.verifyOTP(input);
  }),

  // Resend verification OTP
  resendVerification: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const authService = new AuthService(ctx.env);
      return await authService.sendVerificationOTP(input.email);
    }),

  // Get OTP cooldown status
  getCooldownStatus: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input, ctx }) => {
      const authService = new AuthService(ctx.env);
      return await authService.getOTPCooldownStatus(input.email);
    }),

  // Forgot password
  forgotPassword: publicProcedure.input(ForgotPasswordSchema).mutation(async ({ input, ctx }) => {
    const authService = new AuthService(ctx.env);
    return await authService.forgotPassword(input);
  }),

  // Verify forgot password OTP
  verifyForgotPassword: publicProcedure.input(VerifyOTPSchema).mutation(async ({ input, ctx }) => {
    const authService = new AuthService(ctx.env);
    return await authService.verifyForgotPasswordOTP(input);
  }),

  // Reset password
  resetPassword: publicProcedure.input(ResetPasswordSchema).mutation(async ({ input, ctx }) => {
    const authService = new AuthService(ctx.env);
    return await authService.resetPassword(input);
  }),

  // Refresh token
  refreshToken: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const authService = new AuthService(ctx.env);
      return await authService.refreshToken(input.refreshToken);
    }),

  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    const authService = new AuthService(ctx.env);
    return await authService.getUserProfile(ctx.auth.user.id);
  }),

  // Logout (invalidate refresh token)
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // In a real implementation, you would invalidate the refresh token
    // For now, just return success
    return { message: 'Logged out successfully' };
  }),
});

// User router
const userRouter = router({
  // Get user profile
  profile: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.userService.getUserById(ctx.auth.user.id);
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        phone_number: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.userService.updateUser(ctx.auth.user.id, input);
    }),

  // Get user stats (admin only)
  stats: adminProcedure.query(async ({ ctx }) => {
    return await ctx.userService.getUserStats();
  }),
});

// Health router
const healthRouter = router({
  check: publicProcedure.query(() => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'hamsoya-backend',
    };
  }),
});

// Product router
const productRouter = router({
  // Get all products with filters
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        featured: z.boolean().optional(),
        inStock: z.boolean().optional(),
        sortBy: z.enum(['name', 'price', 'newest', 'rating']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        limit: z.number().int().positive().max(100).optional(),
        offset: z.number().int().min(0).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const productService = new ProductService(ctx.env);
      return await productService.getProducts(input);
    }),

  // Get product by ID
  byId: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input, ctx }) => {
    const productService = new ProductService(ctx.env);
    const product = await productService.getProductById(input.id);
    if (!product) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Product not found',
      });
    }
    return product;
  }),

  // Get featured products
  featured: publicProcedure
    .input(z.object({ limit: z.number().int().positive().max(50).optional() }))
    .query(async ({ input, ctx }) => {
      const productService = new ProductService(ctx.env);
      return await productService.getFeaturedProducts(input.limit);
    }),

  // Get products by category
  byCategory: publicProcedure
    .input(
      z.object({
        categorySlug: z.string(),
        limit: z.number().int().positive().max(100).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const productService = new ProductService(ctx.env);
      return await productService.getProductsByCategory(input.categorySlug, input.limit);
    }),

  // Search products
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().positive().max(100).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const productService = new ProductService(ctx.env);
      return await productService.searchProducts(input.query, input.limit);
    }),

  // Get product reviews
  reviews: publicProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const productService = new ProductService(ctx.env);
      return await productService.getProductReviews(input.productId);
    }),
});

// Category router
const categoryRouter = router({
  // Get all categories
  list: publicProcedure.query(async ({ ctx }) => {
    const productService = new ProductService(ctx.env);
    return await productService.getCategories();
  }),

  // Get category by slug
  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input, ctx }) => {
    const productService = new ProductService(ctx.env);
    const category = await productService.getCategoryBySlug(input.slug);
    if (!category) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Category not found',
      });
    }
    return category;
  }),
});

// Cart router
const cartRouter = router({
  // Get cart data
  get: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const cartService = new CartService(ctx.env);
      const userId = ctx.auth.user?.id;
      const sessionId =
        input?.sessionId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const cart = await cartService.getCart(userId, sessionId);
      return {
        data: cart,
        count: cart.totalItems,
      };
    }),

  // Add item to cart
  addItem: publicProcedure
    .input(
      z.object({
        product: z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          price: z.number(),
          originalPrice: z.number().optional(),
          images: z.array(z.string()),
          category: z.string(),
          inStock: z.boolean(),
          featured: z.boolean().optional(),
          tags: z.array(z.string()).optional(),
          weight: z.string().optional(),
          origin: z.string().optional(),
          benefits: z.array(z.string()).optional(),
        }),
        quantity: z.number().int().positive().default(1),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cartService = new CartService(ctx.env);
      const userId = ctx.auth.user?.id;
      return await cartService.addItem(input.product, input.quantity, userId, input.sessionId);
    }),

  // Remove item from cart
  removeItem: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cartService = new CartService(ctx.env);
      const userId = ctx.auth.user?.id;
      return await cartService.removeItem(input.productId, userId, input.sessionId);
    }),

  // Update item quantity
  updateQuantity: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(0),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cartService = new CartService(ctx.env);
      const userId = ctx.auth.user?.id;
      return await cartService.updateQuantity(
        input.productId,
        input.quantity,
        userId,
        input.sessionId
      );
    }),

  // Clear cart
  clear: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const cartService = new CartService(ctx.env);
      const userId = ctx.auth.user?.id;
      return await cartService.clearCart(userId, input.sessionId);
    }),

  // Get cart count only
  getCount: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const cartService = new CartService(ctx.env);
      const userId = ctx.auth.user?.id;
      return await cartService.getCartCount(userId, input?.sessionId);
    }),

  // Migrate guest cart to user cart
  migrateGuestCart: protectedProcedure
    .input(z.object({ guestSessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const cartService = new CartService(ctx.env);
      return await cartService.migrateGuestCart(input.guestSessionId, ctx.auth.user.id);
    }),
});

// Bookmark router
const bookmarkRouter = router({
  // Get bookmarks
  get: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const bookmarkService = new BookmarkService(ctx.env);
      const userId = ctx.auth.user?.id;
      const sessionId =
        input?.sessionId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const bookmarks = await bookmarkService.getBookmarks(userId, sessionId);
      return {
        data: bookmarks,
        count: bookmarks.bookmarkCount,
      };
    }),

  // Add bookmark
  add: publicProcedure
    .input(
      z.object({
        product: z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          price: z.number(),
          originalPrice: z.number().optional(),
          images: z.array(z.string()),
          category: z.string(),
          inStock: z.boolean(),
          featured: z.boolean().optional(),
          tags: z.array(z.string()).optional(),
          weight: z.string().optional(),
          origin: z.string().optional(),
          benefits: z.array(z.string()).optional(),
        }),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const bookmarkService = new BookmarkService(ctx.env);
      const userId = ctx.auth.user?.id;
      return await bookmarkService.addBookmark(input.product, userId, input.sessionId);
    }),

  // Remove bookmark
  remove: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const bookmarkService = new BookmarkService(ctx.env);
      const userId = ctx.auth.user?.id;
      return await bookmarkService.removeBookmark(input.productId, userId, input.sessionId);
    }),

  // Toggle bookmark
  toggle: publicProcedure
    .input(
      z.object({
        product: z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          price: z.number(),
          originalPrice: z.number().optional(),
          images: z.array(z.string()),
          category: z.string(),
          inStock: z.boolean(),
          featured: z.boolean().optional(),
          tags: z.array(z.string()).optional(),
          weight: z.string().optional(),
          origin: z.string().optional(),
          benefits: z.array(z.string()).optional(),
        }),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const bookmarkService = new BookmarkService(ctx.env);
      const userId = ctx.auth.user?.id;
      return await bookmarkService.toggleBookmark(input.product, userId, input.sessionId);
    }),

  // Clear all bookmarks
  clear: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const bookmarkService = new BookmarkService(ctx.env);
      const userId = ctx.auth.user?.id;
      return await bookmarkService.clearBookmarks(userId, input.sessionId);
    }),

  // Get bookmark count only
  getCount: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const bookmarkService = new BookmarkService(ctx.env);
      const userId = ctx.auth.user?.id;
      return await bookmarkService.getBookmarkCount(userId, input?.sessionId);
    }),

  // Check if product is bookmarked
  isBookmarked: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        sessionId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const bookmarkService = new BookmarkService(ctx.env);
      const userId = ctx.auth.user?.id;
      return await bookmarkService.isBookmarked(input.productId, userId, input.sessionId);
    }),

  // Migrate guest bookmarks to user bookmarks
  migrateGuestBookmarks: protectedProcedure
    .input(z.object({ guestSessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const bookmarkService = new BookmarkService(ctx.env);
      return await bookmarkService.migrateGuestBookmarks(input.guestSessionId, ctx.auth.user.id);
    }),
});

// Main app router
export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  user: userRouter,
  products: productRouter,
  categories: categoryRouter,
  cart: cartRouter,
  bookmarks: bookmarkRouter,
});

export type AppRouter = typeof appRouter;
