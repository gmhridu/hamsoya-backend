import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ----------------- USERS -----------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password_hash: text("password_hash"),
    role: varchar("role", { length: 20 }).notNull().default("USER"),
    phone_number: varchar("phone_number", { length: 20 }),
    profile_image_url: text("profile_image_url"),
    is_verified: boolean("is_verified").notNull().default(false),
    google_id: varchar("google_id", { length: 255 }).unique(),
    oauth_provider: varchar("oauth_provider", { length: 50 }),
    oauth_access_token: text("oauth_access_token"),
    oauth_refresh_token: text("oauth_refresh_token"),
    oauth_token_expires_at: timestamp("oauth_token_expires_at"),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
    deleted_by: uuid("deleted_by"),
  },
  (table) => [
    // Basic indexes
    index("idx_users_name").on(table.name),
    uniqueIndex("idx_users_email").on(table.email),

    // Partial (conditional) indexes
    index("idx_users_role_not_deleted")
      .on(table.role)
      .where(sql`${table.deleted_at} IS NULL`),

    index("idx_users_is_verified_not_deleted")
      .on(table.is_verified)
      .where(sql`${table.deleted_at} IS NULL`),

    index("idx_users_created_at_not_deleted")
      .on(table.created_at)
      .where(sql`${table.deleted_at} IS NULL`),
  ]
);

// ----------------- REFRESH TOKENS -----------------
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull(),
    expires_at: timestamp("expires_at").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    revoked_at: timestamp("revoked_at"),
  },
  // ✅ Modern array-based index syntax
  (table) => [
    index("idx_refresh_tokens_token_user").on(table.token_hash, table.user_id),
    index("idx_refresh_tokens_user_id").on(table.user_id),
    index("idx_refresh_tokens_expires_at").on(table.expires_at),
  ],
);

// ----------------- PASSWORD RESET TOKENS -----------------
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull(),
    expires_at: timestamp("expires_at").notNull(),
    used_at: timestamp("used_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  // ✅ Modern Drizzle syntax: return an array, not an object
  (table) => [
    index("idx_password_reset_tokens_user_id").on(table.user_id),
    index("idx_password_reset_tokens_expires_at").on(table.expires_at),
  ],
);

// ----------------- EMAIL VERIFICATION TOKENS -----------------
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull(),
    expires_at: timestamp("expires_at").notNull(),
    used_at: timestamp("used_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_email_verification_tokens_user_id").on(table.user_id),
    index("idx_email_verification_tokens_expires_at").on(table.expires_at),
  ]
);

// ----------------- USER SESSIONS -----------------
export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    session_token: text("session_token").notNull().unique(),
    ip_address: varchar("ip_address", { length: 45 }),
    user_agent: text("user_agent"),
    expires_at: timestamp("expires_at").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    last_accessed: timestamp("last_accessed").notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_sessions_user_id").on(table.user_id),
    index("idx_user_sessions_expires_at").on(table.expires_at),
  ]
);

// ----------------- CATEGORIES -----------------
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    image: text("image"),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    is_active: boolean("is_active").notNull().default(true),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
    deleted_by: uuid("deleted_by"),
  },
  (table) => [
    index("idx_categories_name_active_not_deleted")
      .on(table.name)
      .where(sql`${table.is_active} = true AND ${table.deleted_at} IS NULL`),
  ]
);

// ----------------- PRODUCTS -----------------
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(),
    original_price: integer("original_price"),
    category_id: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>(),
    weight: varchar("weight", { length: 50 }),
    origin: varchar("origin", { length: 100 }),
    benefits: jsonb("benefits").$type<string[]>(),
    in_stock: boolean("in_stock").notNull().default(true),
    stock_quantity: integer("stock_quantity").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    is_active: boolean("is_active").notNull().default(true),
    slug: varchar("slug", { length: 255 }).unique(),
    meta_title: varchar("meta_title", { length: 255 }),
    meta_description: text("meta_description"),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
    deleted_by: uuid("deleted_by"),
  },
  (table) => [
    index("idx_products_category_id").on(table.category_id),
    index("idx_products_created_at_active_not_deleted")
      .on(table.created_at)
      .where(sql`${table.is_active} = true AND ${table.deleted_at} IS NULL`),
    index("idx_products_price_active_not_deleted")
      .on(table.price)
      .where(sql`${table.is_active} = true AND ${table.deleted_at} IS NULL`),
    index("idx_products_featured_created_active_not_deleted")
      .on(table.featured, table.created_at)
      .where(sql`${table.is_active} = true AND ${table.deleted_at} IS NULL`),
    index("idx_products_name").on(table.name),
  ]
);

// ----------------- REVIEWS -----------------
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    is_verified: boolean("is_verified").notNull().default(false),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
    deleted_by: uuid("deleted_by"),
  },
  (table) => [
    index("idx_reviews_product_id_created_at").on(
      table.product_id,
      table.created_at
    ),
  ]
);

// ----------------- ORDERS -----------------
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    order_number: varchar("order_number", { length: 50 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull().default("PENDING"),
    total_amount: integer("total_amount").notNull(),
    subtotal: integer("subtotal").notNull(),
    tax_amount: integer("tax_amount").notNull().default(0),
    shipping_amount: integer("shipping_amount").notNull().default(0),
    discount_amount: integer("discount_amount").notNull().default(0),
    shipping_address: jsonb("shipping_address").notNull(),
    billing_address: jsonb("billing_address"),
    payment_method: varchar("payment_method", { length: 50 }),
    payment_status: varchar("payment_status", { length: 20 })
      .notNull()
      .default("PENDING"),
    payment_id: varchar("payment_id", { length: 255 }),
    payment_transaction_id: varchar("payment_transaction_id", { length: 255 }),
    notes: text("notes"),
    tracking_number: varchar("tracking_number", { length: 100 }),
    estimated_delivery: timestamp("estimated_delivery"),
    delivered_at: timestamp("delivered_at"),
    cancelled_at: timestamp("cancelled_at"),
    cancellation_reason: text("cancellation_reason"),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
    deleted_by: uuid("deleted_by"),
  },
  (table) => [
    index("idx_orders_user_id").on(table.user_id),
    index("idx_orders_status_not_deleted")
      .on(table.status)
      .where(sql`${table.deleted_at} IS NULL`),
    index("idx_orders_payment_status_not_deleted")
      .on(table.payment_status)
      .where(sql`${table.deleted_at} IS NULL`),
    index("idx_orders_created_at_not_deleted")
      .on(table.created_at)
      .where(sql`${table.deleted_at} IS NULL`),
  ]
);

// ----------------- ORDER ITEMS -----------------
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    unit_price: integer("unit_price").notNull(),
    total_price: integer("total_price").notNull(),
    product_name: text("product_name").notNull(),
    product_image: text("product_image"),
    product_weight: text("product_weight"),
    product_snapshot: jsonb("product_snapshot"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_order_items_order_id").on(table.order_id),
    index("idx_order_items_product_id").on(table.product_id),
  ]
);

// ----------------- CART ITEMS -----------------
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_cart_items_user_product").on(table.user_id, table.product_id),
  ]
);

// ----------------- BOOKMARKS -----------------
export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_bookmarks_user_product").on(table.user_id, table.product_id),
  ]
);
