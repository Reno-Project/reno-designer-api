import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { moodboardVersions, moodboards } from "../db/schema";
import { asyncHandler } from "../lib/asyncHandler";
import { fromDb, fromDbMany, stripProtected, toDb } from "../lib/serialize";
import { userOwnsMoodboard } from "../lib/ownership";
import type { AuthedRequest } from "../middleware/auth";

export const moodboardVersionsRouter = Router();

const uuid = z.string().uuid();

const versionSchema = z
  .object({
    moodboard_id: uuid,
    name: z.string().optional(),
    approval_status: z.string().optional(),
    locked: z.boolean().nullable().optional(),
    major_version: z.number().int().optional(),
    version_number: z.number().int().optional(),
    snapshot: z.unknown().optional(),
  })
  .passthrough();

const versionUpdateSchema = versionSchema.omit({ moodboard_id: true }).partial();

// GET /api/v1/moodboard-versions?moodboard_id=...
moodboardVersionsRouter.get(
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
      .from(moodboardVersions)
      .where(eq(moodboardVersions.moodboardId, moodboardId.data))
      .orderBy(desc(moodboardVersions.createdAt));
    res.json(fromDbMany(rows));
  }),
);

// POST /api/v1/moodboard-versions
moodboardVersionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const body = stripProtected(versionSchema.parse(req.body));
    if (!(await userOwnsMoodboard(userId, body.moodboard_id as string))) {
      res.status(404).json({ error: "moodboard not found" });
      return;
    }
    const [row] = await db.insert(moodboardVersions).values(toDb(body) as never).returning();
    res.status(201).json(fromDb(row!));
  }),
);

// GET /api/v1/moodboard-versions/:id
moodboardVersionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const [row] = await db
      .select({ v: moodboardVersions })
      .from(moodboardVersions)
      .innerJoin(moodboards, eq(moodboards.id, moodboardVersions.moodboardId))
      .where(and(eq(moodboardVersions.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fromDb(row.v));
  }),
);

// PATCH /api/v1/moodboard-versions/:id
moodboardVersionsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const body = stripProtected(versionUpdateSchema.parse(req.body));
    delete (body as Record<string, unknown>).moodboard_id; // reparenting not allowed

    const owned = await db
      .select({ id: moodboardVersions.id })
      .from(moodboardVersions)
      .innerJoin(moodboards, eq(moodboards.id, moodboardVersions.moodboardId))
      .where(and(eq(moodboardVersions.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [row] = await db
      .update(moodboardVersions)
      .set(toDb(body) as never)
      .where(eq(moodboardVersions.id, id))
      .returning();
    res.json(fromDb(row!));
  }),
);

// DELETE /api/v1/moodboard-versions/:id
moodboardVersionsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const owned = await db
      .select({ id: moodboardVersions.id })
      .from(moodboardVersions)
      .innerJoin(moodboards, eq(moodboards.id, moodboardVersions.moodboardId))
      .where(and(eq(moodboardVersions.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db.delete(moodboardVersions).where(eq(moodboardVersions.id, id));
    res.status(204).end();
  }),
);
