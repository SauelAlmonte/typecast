CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "media" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "media_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tmdb_id" integer NOT NULL,
	"media_type" text NOT NULL,
	"title" text NOT NULL,
	"release_date" date,
	"popularity" real DEFAULT 0 NOT NULL,
	"vote_average" real,
	"poster_path" text,
	"backdrop_path" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_media_type_tmdb_id_unique" UNIQUE("media_type","tmdb_id"),
	CONSTRAINT "media_media_type_check" CHECK ("media"."media_type" in ('movie', 'tv'))
);
--> statement-breakpoint
CREATE INDEX "media_title_trgm_idx" ON "media" USING gin ("title" gin_trgm_ops);