import { Router } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { moodboardItems, moodboards } from "../db/schema";
import { asyncHandler } from "../lib/asyncHandler";
import { fromDb, fromDbMany, stripProtected, toDb } from "../lib/serialize";
import { userOwnsMoodboard } from "../lib/ownership";
import type { AuthedRequest } from "../middleware/auth";

export const moodboardItemsRouter = Router();

const uuid = z.string().uuid();

/**
 * 48 columns is too many to enumerate strictly — accept any extra fields and
 * rely on Drizzle / DB constraints. The schema below validates the few fields
 * that matter for routing / ownership.
 */
const itemSchema = z
  .object({
    moodboard_id: uuid,
  })
  .passthrough();

const itemUpdateSchema = z.object({}).passthrough();

const batchInsertSchema = z.object({
  moodboard_id: uuid,
  items: z.array(z.record(z.unknown())).min(1),
});

// GET /api/v1/moodboard-items?moodboard_id=...
moodboardItemsRouter.get(
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
      .from(moodboardItems)
      .where(eq(moodboardItems.moodboardId, moodboardId.data));
    res.json(fromDbMany(rows));
  }),
);

// GET /api/v1/moodboard-items/:id
moodboardItemsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const [row] = await db
      .select({ item: moodboardItems })
      .from(moodboardItems)
      .innerJoin(moodboards, eq(moodboards.id, moodboardItems.moodboardId))
      .where(and(eq(moodboardItems.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fromDb(row.item));
  }),
);

// PUT /api/v1/moodboard-items/:id — upsert (insert with this id, or update if it exists)
moodboardItemsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const body = stripProtected(itemSchema.parse(req.body));
    if (!(await userOwnsMoodboard(userId, body.moodboard_id as string))) {
      res.status(404).json({ error: "moodboard not found" });
      return;
    }
    const existing = await db
      .select({ id: moodboardItems.id })
      .from(moodboardItems)
      .innerJoin(moodboards, eq(moodboards.id, moodboardItems.moodboardId))
      .where(and(eq(moodboardItems.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);

    if (existing.length === 0) {
      const values = { ...toDb(body), id };
      const [row] = await db.insert(moodboardItems).values(values as never).returning();
      res.status(201).json(fromDb(row!));
      return;
    }
    const update = { ...body };
    delete (update as Record<string, unknown>).moodboard_id;
    const [row] = await db
      .update(moodboardItems)
      .set(toDb(update) as never)
      .where(eq(moodboardItems.id, id))
      .returning();
    res.json(fromDb(row!));
  }),
);

// POST /api/v1/moodboard-items
moodboardItemsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const body = stripProtected(itemSchema.parse(req.body));
    if (!(await userOwnsMoodboard(userId, body.moodboard_id as string))) {
      res.status(404).json({ error: "moodboard not found" });
      return;
    }
    const [row] = await db.insert(moodboardItems).values(toDb(body) as never).returning();
    res.status(201).json(fromDb(row!));
  }),
);

// POST /api/v1/moodboard-items/batch — many items, all under one moodboard
moodboardItemsRouter.post(
  "/batch",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const { moodboard_id: moodboardId, items } = batchInsertSchema.parse(req.body);
    if (!(await userOwnsMoodboard(userId, moodboardId))) {
      res.status(404).json({ error: "moodboard not found" });
      return;
    }
    const values = items.map((it) => ({
      ...toDb(stripProtected({ ...it })),
      moodboardId,
    }));
    const rows = await db.insert(moodboardItems).values(values as never).returning();
    res.status(201).json(fromDbMany(rows));
  }),
);

// PATCH /api/v1/moodboard-items/:id
moodboardItemsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const body = stripProtected(itemUpdateSchema.parse(req.body));
    // Block moodboard_id changes — items can't be reparented (would break ownership semantics).
    delete (body as Record<string, unknown>).moodboard_id;

    // Verify ownership via JOIN, in the same statement.
    const owned = await db
      .select({ id: moodboardItems.id })
      .from(moodboardItems)
      .innerJoin(moodboards, eq(moodboards.id, moodboardItems.moodboardId))
      .where(and(eq(moodboardItems.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [row] = await db
      .update(moodboardItems)
      .set(toDb(body) as never)
      .where(eq(moodboardItems.id, id))
      .returning();
    res.json(fromDb(row!));
  }),
);

// DELETE /api/v1/moodboard-items/:id
moodboardItemsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    // Same ownership-via-JOIN check
    const owned = await db
      .select({ id: moodboardItems.id })
      .from(moodboardItems)
      .innerJoin(moodboards, eq(moodboards.id, moodboardItems.moodboardId))
      .where(and(eq(moodboardItems.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db.delete(moodboardItems).where(eq(moodboardItems.id, id));
    res.status(204).end();
  }),
);

// DELETE /api/v1/moodboard-items?ids=a,b,c   (batch delete)
moodboardItemsRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const raw = typeof req.query.ids === "string" ? req.query.ids.split(",") : [];
    const ids = raw.map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0 || !ids.every((s) => uuid.safeParse(s).success)) {
      res.status(400).json({ error: "ids query param required (comma-separated uuids)" });
      return;
    }

    // Keep only items that belong to moodboards owned by this user.
    const owned = await db
      .select({ id: moodboardItems.id })
      .from(moodboardItems)
      .innerJoin(moodboards, eq(moodboards.id, moodboardItems.moodboardId))
      .where(and(inArray(moodboardItems.id, ids), eq(moodboards.createdBy, userId)));
    const ownedIds = owned.map((r) => r.id);
    if (ownedIds.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db.delete(moodboardItems).where(inArray(moodboardItems.id, ownedIds));
    res.status(204).end();
  }),
);
