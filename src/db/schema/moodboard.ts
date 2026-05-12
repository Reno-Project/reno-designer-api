import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { env } from "../../env";

export const designers = pgSchema(env.DATABASE_SCHEMA);

/**
 * moodboards — top-level board attached to a project (and optionally a room).
 * project_id / room_id / shared_version_id are unenforced UUIDs because the
 * referenced tables still live in Supabase during the slice-by-slice migration.
 * created_by is stamped from the Supabase JWT by the API layer.
 */
export const moodboards = designers.table("moodboards", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // ownership — added in this migration, did not exist in Supabase schema
  createdBy: uuid("created_by").notNull(),
  teamId: uuid("team_id"),

  // unenforced cross-slice references
  projectId: uuid("project_id").notNull(),
  roomId: uuid("room_id"),
  sharedVersionId: uuid("shared_version_id"),

  name: text("name").notNull().default("Untitled Moodboard"),
  aiImageUrl: text("ai_image_url"),

  approvalStatus: text("approval_status"),
  approvalNote: text("approval_note"),

  bgColor: text("bg_color"),
  lightX: doublePrecision("light_x"),
  lightY: doublePrecision("light_y"),

  onboardingComplete: boolean("onboarding_complete").notNull().default(false),

  shareSettings: jsonb("share_settings"),
  shareToken: text("share_token").unique(),

  slideBgColors: jsonb("slide_bg_colors").notNull().default(sql`'{}'::jsonb`),
  slideHidden: jsonb("slide_hidden").notNull().default(sql`'{}'::jsonb`),
  slideNames: jsonb("slide_names"),
  slideRooms: jsonb("slide_rooms").notNull().default(sql`'{}'::jsonb`),

  tabKind: text("tab_kind").notNull().default("main"),
  tabLabel: text("tab_label"),
  tabOrder: integer("tab_order").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * moodboard_items — every visual element on the canvas (image, text, shape, frame...).
 * Coordinates / dimensions use double precision (vs. NUMERIC in the legacy schema)
 * so the frontend receives native JS numbers without conversion.
 */
export const moodboardItems = designers.table("moodboard_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  moodboardId: uuid("moodboard_id")
    .notNull()
    .references(() => moodboards.id, { onDelete: "cascade" }),

  // self-reference for grouped/parented items
  parentFrameId: uuid("parent_frame_id"),

  // cross-slice reference — products table not migrated yet
  productId: uuid("product_id"),

  // type discriminators
  itemType: text("item_type"),
  elementType: text("element_type"),
  shapeType: text("shape_type"),

  // grouping
  groupId: uuid("group_id"),

  // canvas placement
  slideIndex: integer("slide_index").notNull().default(0),
  zIndex: integer("z_index"),
  x: doublePrecision("x").notNull().default(0),
  y: doublePrecision("y").notNull().default(0),
  width: doublePrecision("width").notNull().default(200),
  height: doublePrecision("height").notNull().default(200),
  rotation: doublePrecision("rotation"),
  opacity: doublePrecision("opacity"),

  // transforms
  scaleX: doublePrecision("scale_x"),
  scaleY: doublePrecision("scale_y"),
  skewX: doublePrecision("skew_x"),
  skewY: doublePrecision("skew_y"),
  mirrorX: boolean("mirror_x"),
  mirrorY: boolean("mirror_y"),
  lockRatio: boolean("lock_ratio"),

  // image / crop
  customImageUrl: text("custom_image_url"),
  cropData: jsonb("crop_data"),
  filter: text("filter"),
  feather: doublePrecision("feather"),

  // fill / border / shadow
  fillColor: text("fill_color"),
  fillGradient: jsonb("fill_gradient"),
  borderColor: text("border_color"),
  borderGradient: jsonb("border_gradient"),
  borderPosition: text("border_position"),
  borderRadius: doublePrecision("border_radius"),
  borderWidth: doublePrecision("border_width"),
  shadowEnabled: boolean("shadow_enabled"),
  shadowColor: text("shadow_color"),
  shadowBlur: doublePrecision("shadow_blur"),
  shadowX: doublePrecision("shadow_x"),
  shadowY: doublePrecision("shadow_y"),

  // text
  textContent: text("text_content"),
  textStyle: jsonb("text_style"),

  // misc
  colorValue: text("color_value"),
  pinCorner: text("pin_corner"),
  depth: doublePrecision("depth"),
  thickness: doublePrecision("thickness"),
  visible: boolean("visible"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * moodboard_versions — named snapshots of a moodboard for approval / history.
 */
export const moodboardVersions = designers.table("moodboard_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  moodboardId: uuid("moodboard_id")
    .notNull()
    .references(() => moodboards.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Untitled version"),
  approvalStatus: text("approval_status").notNull().default("draft"),
  locked: boolean("locked").default(false),
  majorVersion: integer("major_version").notNull().default(1),
  versionNumber: integer("version_number").notNull().default(1),
  snapshot: jsonb("snapshot").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * moodboard_comments — pin-style comments anchored to a slide or item.
 */
export const moodboardComments = designers.table("moodboard_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  moodboardId: uuid("moodboard_id")
    .notNull()
    .references(() => moodboards.id, { onDelete: "cascade" }),
  itemId: uuid("item_id"),
  authorName: text("author_name").notNull().default("Anonymous"),
  content: text("content").notNull(),
  slideIndex: integer("slide_index"),
  x: doublePrecision("x"),
  y: doublePrecision("y"),
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * slide_templates — saved slide layouts that the moodboard can apply.
 * `user_id IS NULL` denotes a global preset visible to every user; non-null
 * means a personal template owned by that user.
 */
export const slideTemplates = designers.table("slide_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id"),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  isPreset: boolean("is_preset").notNull().default(false),
  positions: jsonb("positions").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * moodboard_floorplan_zones — coloured polygon zones drawn over a floorplan item.
 */
export const moodboardFloorplanZones = designers.table("moodboard_floorplan_zones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: uuid("item_id")
    .notNull()
    .references(() => moodboardItems.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  points: jsonb("points").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Moodboard = typeof moodboards.$inferSelect;
export type NewMoodboard = typeof moodboards.$inferInsert;
export type MoodboardItem = typeof moodboardItems.$inferSelect;
export type NewMoodboardItem = typeof moodboardItems.$inferInsert;
export type MoodboardVersion = typeof moodboardVersions.$inferSelect;
export type NewMoodboardVersion = typeof moodboardVersions.$inferInsert;
export type MoodboardComment = typeof moodboardComments.$inferSelect;
export type NewMoodboardComment = typeof moodboardComments.$inferInsert;
export type MoodboardFloorplanZone = typeof moodboardFloorplanZones.$inferSelect;
export type NewMoodboardFloorplanZone = typeof moodboardFloorplanZones.$inferInsert;
export type SlideTemplate = typeof slideTemplates.$inferSelect;
export type NewSlideTemplate = typeof slideTemplates.$inferInsert;
