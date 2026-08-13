DROP INDEX "media_title_trgm_idx";--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "title_search" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "media_title_search_trgm_idx" ON "media" USING gin ("title_search" gin_trgm_ops);