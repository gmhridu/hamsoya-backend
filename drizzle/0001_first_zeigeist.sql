ALTER TABLE "order_items" ADD COLUMN "product_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "billing_address" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_transaction_id" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancellation_reason" text;