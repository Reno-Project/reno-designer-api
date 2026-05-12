import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { moodboards } from "../db/schema";
import { asyncHandler } from "../lib/asyncHandler";
import { fromDb, fromDbMany, stripProtected, toDb } from "../lib/serialize";
import type { AuthedRequest } from "../middleware/auth";

export const moodboardsRouter = Router();

const uuid = z.string().uuid();

const moodboardSchema = z
  .object({
    project_id: uuid,
    room_id: uuid.nullable().optional(),
    team_id: uuid.nullable().optional(),
    shared_version_id: uuid.nullable().optional(),
    name: z.string().optional(),
    ai_image_url: z.string().nullable().optional(),
    approval_status: z.string().nullable().optional(),
    approval_note: z.string().nullable().optional(),
    bg_color: z.string().nullable().optional(),
    light_x: z.number().nullable().optional(),
    light_y: z.number().nullable().optional(),
    onboarding_complete: z.boolean().optional(),
    share_settings: z.unknown().nullable().optional(),
    share_token: z.string().nullable().optional(),
    slide_bg_colors: z.unknown().optional(),
    slide_hidden: z.unknown().optional(),
    slide_names: z.unknown().nullable().optional(),
    slide_rooms: z.unknown().optional(),
    tab_kind: z.string().optional(),
    tab_label: z.string().nullable().optional(),
    tab_order: z.number().int().optional(),
  })
  .passthrough();

const moodboardUpdateSchema = moodboardSchema.partial();

// GET /api/v1/moodboards?project_id=...
moodboardsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const projectId = uuid.safeParse(req.query.project_id);
    if (!projectId.success) {
      res.status(400).json({ error: "project_id (uuid) query param required" });
      return;
    }
    const userId = (req as AuthedRequest).auth.userId;
    const rows = await db
      .select()
      .from(moodboards)
      .where(and(eq(moodboards.projectId, projectId.data), eq(moodboards.createdBy, userId)));
    res.json(fromDbMany(rows));
  }),
);

// POST /api/v1/moodboards
moodboardsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const body = stripProtected(moodboardSchema.parse(req.body));
    const values = { ...toDb(body), createdBy: userId };
    const [row] = await db.insert(moodboards).values(values as never).returning();
    res.status(201).json(fromDb(row!));
  }),
);

// GET /api/v1/moodboards/:id
moodboardsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const [row] = await db
      .select()
      .from(moodboards)
      .where(and(eq(moodboards.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fromDb(row));
  }),
);

// PATCH /api/v1/moodboards/:id
moodboardsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const body = stripProtected(moodboardUpdateSchema.parse(req.body));
    const values = { ...toDb(body), updatedAt: new Date() };

    const [row] = await db
      .update(moodboards)
      .set(values as never)
      .where(and(eq(moodboards.id, id), eq(moodboards.createdBy, userId)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fromDb(row));
  }),
);

// DELETE /api/v1/moodboards/:id
moodboardsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const deleted = await db
      .delete(moodboards)
      .where(and(eq(moodboards.id, id), eq(moodboards.createdBy, userId)))
      .returning({ id: moodboards.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  }),
);
