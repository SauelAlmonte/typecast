CREATE TABLE "people" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "people_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tmdb_id" integer NOT NULL,
	"name" text NOT NULL,
	"name_search" text DEFAULT '' NOT NULL,
	"known_for_department" text,
	"popularity" real DEFAULT 0 NOT NULL,
	"profile_path" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_tmdb_id_unique" UNIQUE("tmdb_id")
);
--> statement-breakpoint
CREATE INDEX "people_name_search_trgm_idx" ON "people" USING gin ("name_search" gin_trgm_ops);