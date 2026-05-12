CREATE SCHEMA IF NOT EXISTS "designers";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "designers"."moodboard_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moodboard_id" uuid NOT NULL,
	"item_id" uuid,
	"author_name" text DEFAULT 'Anonymous' NOT NULL,
	"content" text NOT NULL,
	"slide_index" integer,
	"x" double precision,
	"y" double precision,
	"resolved" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "designers"."moodboard_floorplan_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"points" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "designers"."moodboard_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moodboard_id" uuid NOT NULL,
	"parent_frame_id" uuid,
	"product_id" uuid,
	"item_type" text,
	"element_type" text,
	"shape_type" text,
	"group_id" uuid,
	"slide_index" integer DEFAULT 0 NOT NULL,
	"z_index" integer,
	"x" double precision DEFAULT 0 NOT NULL,
	"y" double precision DEFAULT 0 NOT NULL,
	"width" double precision DEFAULT 200 NOT NULL,
	"height" double precision DEFAULT 200 NOT NULL,
	"rotation" double precision,
	"opacity" double precision,
	"scale_x" double precision,
	"scale_y" double precision,
	"skew_x" double precision,
	"skew_y" double precision,
	"mirror_x" boolean,
	"mirror_y" boolean,
	"lock_ratio" boolean,
	"custom_image_url" text,
	"crop_data" jsonb,
	"filter" text,
	"feather" double precision,
	"fill_color" text,
	"fill_gradient" jsonb,
	"border_color" text,
	"border_gradient" jsonb,
	"border_position" text,
	"border_radius" double precision,
	"border_width" double precision,
	"shadow_enabled" boolean,
	"shadow_color" text,
	"shadow_blur" double precision,
	"shadow_x" double precision,
	"shadow_y" double precision,
	"text_content" text,
	"text_style" jsonb,
	"color_value" text,
	"pin_corner" text,
	"depth" double precision,
	"thickness" double precision,
	"visible" boolean,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "designers"."moodboard_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moodboard_id" uuid NOT NULL,
	"name" text DEFAULT 'Untitled version' NOT NULL,
	"approval_status" text DEFAULT 'draft' NOT NULL,
	"locked" boolean DEFAULT false,
	"major_version" integer DEFAULT 1 NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "designers"."moodboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"team_id" uuid,
	"project_id" uuid NOT NULL,
	"room_id" uuid,
	"shared_version_id" uuid,
	"name" text DEFAULT 'Untitled Moodboard' NOT NULL,
	"ai_image_url" text,
	"approval_status" text,
	"approval_note" text,
	"bg_color" text,
	"light_x" double precision,
	"light_y" double precision,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"share_settings" jsonb,
	"share_token" text,
	"slide_bg_colors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"slide_hidden" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"slide_names" jsonb,
	"slide_rooms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tab_kind" text DEFAULT 'main' NOT NULL,
	"tab_label" text,
	"tab_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moodboards_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "designers"."moodboard_comments" ADD CONSTRAINT "moodboard_comments_moodboard_id_moodboards_id_fk" FOREIGN KEY ("moodboard_id") REFERENCES "designers"."moodboards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "designers"."moodboard_floorplan_zones" ADD CONSTRAINT "moodboard_floorplan_zones_item_id_moodboard_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "designers"."moodboard_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "designers"."moodboard_items" ADD CONSTRAINT "moodboard_items_moodboard_id_moodboards_id_fk" FOREIGN KEY ("moodboard_id") REFERENCES "designers"."moodboards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "designers"."moodboard_versions" ADD CONSTRAINT "moodboard_versions_moodboard_id_moodboards_id_fk" FOREIGN KEY ("moodboard_id") REFERENCES "designers"."moodboards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
