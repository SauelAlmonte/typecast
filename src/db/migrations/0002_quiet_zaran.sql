CREATE TABLE "media_list" (
	"list_slug" text NOT NULL,
	"media_id" bigint NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "media_list_list_slug_media_id_pk" PRIMARY KEY("list_slug","media_id")
);
--> statement-breakpoint
ALTER TABLE "media_list" ADD CONSTRAINT "media_list_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_list_slug_position_idx" ON "media_list" USING btree ("list_slug","position");