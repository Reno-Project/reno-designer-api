import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { moodboardComments, moodboards } from "../db/schema";
import { asyncHandler } from "../lib/asyncHandler";
import { fromDb, fromDbMany, stripProtected, toDb } from "../lib/serialize";
import { userOwnsMoodboard } from "../lib/ownership";
import type { AuthedRequest } from "../middleware/auth";

export const moodboardCommentsRouter = Router();

const uuid = z.string().uuid();

const commentSchema = z
  .object({
    moodboard_id: uuid,
    item_id: uuid.nullable().optional(),
    author_name: z.string().optional(),
    content: z.string().min(1),
    slide_index: z.number().int().nullable().optional(),
    x: z.number().nullable().optional(),
    y: z.number().nullable().optional(),
    resolved: z.boolean().nullable().optional(),
  })
  .passthrough();

const commentUpdateSchema = commentSchema
  .omit({ moodboard_id: true })
  .partial();

// GET /api/v1/moodboard-comments?moodboard_id=...
moodboardCommentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const moodboardId = uuid.safeParse(req.query.moodboard_id);
    if (!moodboardId.success) {
      res.status(400).json({ error: "moodboard_id (uuid) query param required" });
      return;
    }
    const userId = (req as AuthedRequest).auth.userId;
    if (!(await userOwnsMoodboard(userId, moodboardId.data))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const rows = await db
      .select()
      .from(moodboardComments)
      .where(eq(moodboardComments.moodboardId, moodboardId.data))
      .orderBy(asc(moodboardComments.createdAt));
    res.json(fromDbMany(rows));
  }),
);

// POST /api/v1/moodboard-comments
moodboardCommentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const body = stripProtected(commentSchema.parse(req.body));
    if (!(await userOwnsMoodboard(userId, body.moodboard_id as string))) {
      res.status(404).json({ error: "moodboard not found" });
      return;
    }
    const [row] = await db.insert(moodboardComments).values(toDb(body) as never).returning();
    res.status(201).json(fromDb(row!));
  }),
);

// PATCH /api/v1/moodboard-comments/:id
moodboardCommentsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const body = stripProtected(commentUpdateSchema.parse(req.body));
    delete (body as Record<string, unknown>).moodboard_id; // reparenting not allowed

    const owned = await db
      .select({ id: moodboardComments.id })
      .from(moodboardComments)
      .innerJoin(moodboards, eq(moodboards.id, moodboardComments.moodboardId))
      .where(and(eq(moodboardComments.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [row] = await db
      .update(moodboardComments)
      .set(toDb(body) as never)
      .where(eq(moodboardComments.id, id))
      .returning();
    res.json(fromDb(row!));
  }),
);

// DELETE /api/v1/moodboard-comments/:id
moodboardCommentsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const owned = await db
      .select({ id: moodboardComments.id })
      .from(moodboardComments)
      .innerJoin(moodboards, eq(moodboards.id, moodboardComments.moodboardId))
      .where(and(eq(moodboardComments.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db.delete(moodboardComments).where(eq(moodboardComments.id, id));
    res.status(204).end();
  }),
);
