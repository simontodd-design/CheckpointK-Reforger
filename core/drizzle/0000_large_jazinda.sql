CREATE TABLE IF NOT EXISTS "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"map_id" text NOT NULL,
	"alive" boolean DEFAULT true NOT NULL,
	"hours_played" double precision DEFAULT 0 NOT NULL,
	"last_played_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"steam_id" text NOT NULL,
	"persona_name" text NOT NULL,
	"avatar_url" text NOT NULL,
	"profile_url" text DEFAULT '' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"first_signed_in_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_steam_id_unique" UNIQUE("steam_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "servers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"map_id" text NOT NULL,
	"host_id" text NOT NULL,
	"port" integer NOT NULL,
	"capacity" integer NOT NULL,
	"mods_count" integer DEFAULT 0 NOT NULL,
	"version" text DEFAULT '0.1.0+r190084' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "characters_user_idx" ON "characters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "characters_alive_idx" ON "characters" USING btree ("user_id","alive");