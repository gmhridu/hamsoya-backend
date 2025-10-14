import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table (base table without self-references)
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(), // you can also use uniqueIndex
    password_hash: text("password_hash"),
    role: varchar("role", { length: 20 }).notNull().default("USER"),
    phone_number: varchar("phone_number", { length: 20 }),
    profile_image_url: text("profile_image_url"),
    is_verified: boolean("is_verified").notNull().default(false),

    // OAuth
    google_id: varchar("google_id", { length: 255 }),
    oauth_provider: varchar("oauth_provider", { length: 50 }),
    oauth_access_token: text("oauth_access_token"),
    oauth_refresh_token: text("oauth_refresh_token"),
    oauth_token_expires_at: timestamp("oauth_token_expires_at"),

    // Audit
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),

    // Soft delete
    deleted_at: timestamp("deleted_at"),
    deleted_by: uuid("deleted_by"),
  },
  (table) => [
    index("users_name_idx").on(table.name),
    uniqueIndex("users_email_idx").on(table.email),
    index("users_role_idx").on(table.role),
    index("users_deleted_at_idx").on(table.deleted_at),
    index("users_created_at_idx").on(table.created_at),
    index("users_verified_idx").on(table.is_verified),
    uniqueIndex("users_google_id_idx").on(table.google_id),
    index("users_oauth_provider_idx").on(table.oauth_provider),
  ]
);

// Refresh tokens table for JWT management
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull(),
    expires_at: timestamp("expires_at").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    revoked_at: timestamp("revoked_at"),
  },
  (table) => [
    index("refresh_tokens_user_id_idx").on(table.user_id),
    index("refresh_tokens_token_hash_idx").on(table.token_hash),
  ]
);

// Password reset tokens table
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull(),
    expires_at: timestamp("expires_at").notNull(),
    used_at: timestamp("used_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("password_reset_tokens_user_id_idx").on(table.user_id),
    index("password_reset_tokens_token_hash_idx").on(table.token_hash),
  ]
);

// Email verification tokens table
export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token_hash: text('token_hash').notNull(),
    expires_at: timestamp('expires_at').notNull(),
    used_at: timestamp('used_at'),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('email_verification_tokens_user_id_idx').on(table.user_id),
    index('email_verification_tokens_token_hash_idx').on(table.token_hash),
  ]
);

// User sessions table for tracking active sessions
export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    session_token: text('session_token').notNull().unique(),
    ip_address: varchar('ip_address', { length: 45 }),
    user_agent: text('user_agent'),
    expires_at: timestamp('expires_at').notNull(),
    created_at: timestamp('created_at').notNull().defaultNow(),
    last_accessed: timestamp('last_accessed').notNull().defaultNow(),
  },
  (table) => [
    index('user_sessions_user_id_idx').on(table.user_id),
    index('user_sessions_session_token_idx').on(table.session_token),
  ]
);

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  name: z.string().min(2).max(255),
  role: z.enum(['USER', 'SELLER', 'ADMIN']),
  phone_number: z.string().optional(),
  profile_image_url: z.string().url().optional(),
  password_hash: z.string().optional(), // Optional for OAuth users
  google_id: z.string().optional(),
  oauth_provider: z.enum(['google', 'facebook', 'twitter', 'github']).optional(),
  oauth_access_token: z.string().optional(),
  oauth_refresh_token: z.string().optional(),
  oauth_token_expires_at: z.date().optional(),
  is_verified: z.boolean().optional(),
  created_by: z.string().optional(),
});

export const selectUserSchema = createSelectSchema(users);



export const insertRefreshTokenSchema = createInsertSchema(refreshTokens);
export const selectRefreshTokenSchema = createSelectSchema(refreshTokens);

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);
export const selectPasswordResetTokenSchema = createSelectSchema(passwordResetTokens);

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens);
export const selectEmailVerificationTokenSchema = createSelectSchema(emailVerificationTokens);

export const insertUserSessionSchema = createInsertSchema(userSessions);
export const selectUserSessionSchema = createSelectSchema(userSessions);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

// Categories table
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    image: text('image'),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    is_active: boolean('is_active').notNull().default(true),

    // Audit fields
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),

    // Soft delete fields
    deleted_at: timestamp('deleted_at'),
    deleted_by: uuid('deleted_by'),
  },
  (table) => [
    index('categories_name_idx').on(table.name),
    index('categories_slug_idx').on(table.slug),
    index('categories_active_idx').on(table.is_active),
    index('categories_deleted_at_idx').on(table.deleted_at),
    index('categories_created_at_idx').on(table.created_at),
  ]
);

// Products table
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull(),
    price: integer('price').notNull(), // Price in cents/paisa
    original_price: integer('original_price'), // Original price for discounts
    category_id: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    images: jsonb('images').$type<string[]>().notNull().default([]),
    tags: jsonb('tags').$type<string[]>().default([]),
    weight: varchar('weight', { length: 50 }),
    origin: varchar('origin', { length: 100 }),
    benefits: jsonb('benefits').$type<string[]>().default([]),
    in_stock: boolean('in_stock').notNull().default(true),
    stock_quantity: integer('stock_quantity').default(0),
    featured: boolean('featured').notNull().default(false),
    is_active: boolean('is_active').notNull().default(true),

    // SEO and metadata
    slug: varchar('slug', { length: 255 }).unique(),
    meta_title: varchar('meta_title', { length: 255 }),
    meta_description: text('meta_description'),

    // Audit fields
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),

    // Soft delete fields
    deleted_at: timestamp('deleted_at'),
    deleted_by: uuid('deleted_by'),
  },
  (table) => [
    index('products_name_idx').on(table.name),
    index('products_slug_idx').on(table.slug),
    index('products_category_idx').on(table.category_id),
    index('products_featured_idx').on(table.featured),
    index('products_active_idx').on(table.is_active),
    index('products_stock_idx').on(table.in_stock),
    index('products_price_idx').on(table.price),
    index('products_deleted_at_idx').on(table.deleted_at),
    index('products_created_at_idx').on(table.created_at),
  ]
);

// Reviews table
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    product_id: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(), // 1-5 stars
    comment: text('comment'),
    is_verified: boolean('is_verified').notNull().default(false),

    // Audit fields
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),

    // Soft delete fields
    deleted_at: timestamp('deleted_at'),
    deleted_by: uuid('deleted_by'),
  },
  (table) => [
    index('reviews_product_idx').on(table.product_id),
    index('reviews_user_idx').on(table.user_id),
    index('reviews_rating_idx').on(table.rating),
    index('reviews_verified_idx').on(table.is_verified),
    index('reviews_deleted_at_idx').on(table.deleted_at),
    index('reviews_created_at_idx').on(table.created_at),
  ]
);

// Zod schemas for new tables
export const insertCategorySchema = createInsertSchema(categories, {
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional(),
  image: z.string().url().optional(),
});

export const selectCategorySchema = createSelectSchema(categories);

export const insertProductSchema = createInsertSchema(products, {
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  price: z.number().int().positive(),
  original_price: z.number().int().positive().optional(),
  images: z.array(z.string().url()),
  tags: z.array(z.string()).optional(),
  weight: z.string().optional(),
  origin: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  stock_quantity: z.number().int().min(0).optional(),
});

export const selectProductSchema = createSelectSchema(products);

export const insertReviewSchema = createInsertSchema(reviews, {
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const selectReviewSchema = createSelectSchema(reviews);



// Orders table
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    order_number: varchar('order_number', { length: 50 }).notNull().unique(),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    total_amount: integer('total_amount').notNull(),
    subtotal: integer('subtotal').notNull(),
    tax_amount: integer('tax_amount').default(0),
    shipping_amount: integer('shipping_amount').default(0),
    discount_amount: integer('discount_amount').default(0),
    shipping_address: jsonb('shipping_address').$type<{
      name: string;
      phone: string;
      address_line_1: string;
      address_line_2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    }>().notNull(),
    billing_address: jsonb('billing_address').$type<{
      name: string;
      phone: string;
      address_line_1: string;
      address_line_2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    }>(),
    payment_method: varchar('payment_method', { length: 50 }),
    payment_status: varchar('payment_status', { length: 20 }).default('PENDING'),
    payment_id: varchar('payment_id', { length: 255 }),
    payment_transaction_id: varchar('payment_transaction_id', { length: 255 }),
    notes: text('notes'),
    tracking_number: varchar('tracking_number', { length: 100 }),
    estimated_delivery: timestamp('estimated_delivery'),
    delivered_at: timestamp('delivered_at'),
    cancelled_at: timestamp('cancelled_at'),
    cancellation_reason: text('cancellation_reason'),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
    deleted_at: timestamp('deleted_at'),
    deleted_by: uuid('deleted_by'),
  },
  (table) => [
    index('orders_user_idx').on(table.user_id),
    index('orders_order_number_idx').on(table.order_number),
    index('orders_status_idx').on(table.status),
    index('orders_payment_status_idx').on(table.payment_status),
    index('orders_deleted_at_idx').on(table.deleted_at),
    index('orders_created_at_idx').on(table.created_at),
  ]
);

// Order items table
export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    order_id: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    product_id: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    unit_price: integer('unit_price').notNull(),
    total_price: integer('total_price').notNull(),
    product_name: text('product_name').notNull(),
    product_image: text('product_image'),
    product_weight: text('product_weight'),
    product_snapshot: jsonb('product_snapshot'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('order_items_order_idx').on(table.order_id),
    index('order_items_product_idx').on(table.product_id),
  ]
);

// Cart items table
export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    product_id: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('cart_items_user_idx').on(table.user_id),
    index('cart_items_product_idx').on(table.product_id),
    index('cart_items_user_product_idx').on(table.user_id, table.product_id),
  ]
);

// Bookmarks table
export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    product_id: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('bookmarks_user_idx').on(table.user_id),
    index('bookmarks_product_idx').on(table.product_id),
    index('bookmarks_user_product_idx').on(table.user_id, table.product_id),
  ]
);

// Additional schema definitions
export const updateCategorySchema = createInsertSchema(categories, {
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  is_active: z.boolean().optional(),
  updated_at: z.date().optional(),
  deleted_at: z.date().nullable().optional(),
}).partial();

export const updateProductSchema = createInsertSchema(products, {
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  price: z.number().int().positive().optional(),
  original_price: z.number().int().positive().optional(),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  weight: z.string().optional(),
  origin: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  stock_quantity: z.number().int().min(0).optional(),
  in_stock: z.boolean().optional(),
  featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
  slug: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  updated_at: z.date().optional(),
  deleted_at: z.date().nullable().optional(),
}).partial();

export const updateUserSchema = createInsertSchema(users, {
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'SELLER', 'ADMIN']).optional(),
  phone_number: z.string().optional(),
  profile_image_url: z.string().url().optional(),
  is_verified: z.boolean().optional(),
  password_hash: z.string().optional(),
  google_id: z.string().optional(),
  oauth_provider: z.string().optional(),
  oauth_access_token: z.string().optional(),
  oauth_refresh_token: z.string().optional(),
  oauth_token_expires_at: z.date().optional(),
  updated_at: z.date().optional(),
  deleted_at: z.date().nullable().optional(),
}).partial();

export const updateOrderSchema = createInsertSchema(orders, {
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  payment_status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  notes: z.string().optional(),
  tracking_number: z.string().optional(),
  updated_at: z.date().optional(),
  deleted_at: z.date().nullable().optional(),
}).partial();

// Type exports for new tables
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;

// All Zod schemas defined after table definitions to avoid circular references
// Order schemas
export const insertOrderSchema = createInsertSchema(orders, {
  order_number: z.string().min(1).max(50),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  total_amount: z.number().int().positive(),
  subtotal: z.number().int().positive(),
  tax_amount: z.number().int().min(0).optional(),
  shipping_amount: z.number().int().min(0).optional(),
  discount_amount: z.number().int().min(0).optional(),
  shipping_address: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    address_line_1: z.string().min(1),
    address_line_2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().min(1),
  }),
  payment_method: z.string().optional(),
  payment_status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  payment_id: z.string().optional(),
  notes: z.string().optional(),
  tracking_number: z.string().optional(),
});

export const selectOrderSchema = createSelectSchema(orders);

// Order item schemas
export const insertOrderItemSchema = createInsertSchema(orderItems, {
  quantity: z.number().int().positive(),
  unit_price: z.number().int().positive(),
  total_price: z.number().int().positive(),
  product_name: z.string().min(1).max(255),
  product_image: z.string().url().optional(),
  product_weight: z.string().optional(),
});

export const selectOrderItemSchema = createSelectSchema(orderItems);

// Cart item schemas
export const insertCartItemSchema = createInsertSchema(cartItems, {
  quantity: z.number().int().positive(),
});

export const selectCartItemSchema = createSelectSchema(cartItems);

// Bookmark schemas
export const insertBookmarkSchema = createInsertSchema(bookmarks);
export const selectBookmarkSchema = createSelectSchema(bookmarks);
