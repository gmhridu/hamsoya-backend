CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"image" text,
	"slug" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"total_price" integer NOT NULL,
	"product_name" text NOT NULL,
	"product_image" text,
	"product_weight" text,
	"product_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"total_amount" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"shipping_amount" integer DEFAULT 0 NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"billing_address" jsonb,
	"payment_method" varchar(50),
	"payment_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"payment_id" varchar(255),
	"payment_transaction_id" varchar(255),
	"notes" text,
	"tracking_number" varchar(100),
	"estimated_delivery" timestamp,
	"delivered_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"original_price" integer,
	"category_id" uuid NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb,
	"weight" varchar(50),
	"origin" varchar(100),
	"benefits" jsonb,
	"in_stock" boolean DEFAULT true NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"slug" varchar(255),
	"meta_title" varchar(255),
	"meta_description" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token" text NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"role" varchar(20) DEFAULT 'USER' NOT NULL,
	"phone_number" varchar(20),
	"profile_image_url" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"google_id" varchar(255),
	"oauth_provider" varchar(50),
	"oauth_access_token" text,
	"oauth_refresh_token" text,
	"oauth_token_expires_at" timestamp,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookmarks_user_product" ON "bookmarks" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_cart_items_user_product" ON "cart_items" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_categories_name_active_not_deleted" ON "categories" USING btree ("name") WHERE "categories"."is_active" = true AND "categories"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_email_verification_tokens_user_id" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_email_verification_tokens_expires_at" ON "email_verification_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_product_id" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_orders_user_id" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status_not_deleted" ON "orders" USING btree ("status") WHERE "orders"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_payment_status_not_deleted" ON "orders" USING btree ("payment_status") WHERE "orders"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_created_at_not_deleted" ON "orders" USING btree ("created_at") WHERE "orders"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_expires_at" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_products_category_id" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_products_created_at_active_not_deleted" ON "products" USING btree ("created_at") WHERE "products"."is_active" = true AND "products"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_products_price_active_not_deleted" ON "products" USING btree ("price") WHERE "products"."is_active" = true AND "products"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_products_featured_created_active_not_deleted" ON "products" USING btree ("featured","created_at") WHERE "products"."is_active" = true AND "products"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_products_name" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_token_user" ON "refresh_tokens" USING btree ("token_hash","user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_reviews_product_id_created_at" ON "reviews" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_expires_at" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_users_name" ON "users" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role_not_deleted" ON "users" USING btree ("role") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_users_is_verified_not_deleted" ON "users" USING btree ("is_verified") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_users_created_at_not_deleted" ON "users" USING btree ("created_at") WHERE "users"."deleted_at" IS NULL;