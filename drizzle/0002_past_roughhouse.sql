ALTER TABLE "account" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "account" CASCADE;--> statement-breakpoint
DROP TABLE "session" CASCADE;--> statement-breakpoint
DROP TABLE "user" CASCADE;--> statement-breakpoint
DROP TABLE "verification" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "oauth_provider" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "oauth_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "oauth_refresh_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "oauth_token_expires_at" timestamp;--> statement-breakpoint
CREATE INDEX "google_id_idx" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE INDEX "oauth_provider_idx" ON "users" USING btree ("oauth_provider");