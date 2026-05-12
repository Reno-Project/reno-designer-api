import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { moodboardFloorplanZones, moodboardItems, moodboards } from "../db/schema";
import { asyncHandler } from "../lib/asyncHandler";
import { fromDb, fromDbMany, stripProtected, toDb } from "../lib/serialize";
import { userOwnsItem } from "../lib/ownership";
import type { AuthedRequest } from "../middleware/auth";

export const moodboardFloorplanZonesRouter = Router();

const uuid = z.string().uuid();

const zoneSchema = z
  .object({
    item_id: uuid,
    name: z.string().min(1),
    color: z.string().min(1),
    points: z.unknown(),
  })
  .passthrough();

const zoneUpdateSchema = zoneSchema.omit({ item_id: true }).partial();

// GET /api/v1/moodboard-floorplan-zones?item_id=...
moodboardFloorplanZonesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const itemId = uuid.safeParse(req.query.item_id);
    if (!itemId.success) {
      res.status(400).json({ error: "item_id (uuid) query param required" });
      return;
    }
    const userId = (req as AuthedRequest).auth.userId;
    if (!(await userOwnsItem(userId, itemId.data))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const rows = await db
      .select()
      .from(moodboardFloorplanZones)
      .where(eq(moodboardFloorplanZones.itemId, itemId.data));
    res.json(fromDbMany(rows));
  }),
);

// POST /api/v1/moodboard-floorplan-zones
moodboardFloorplanZonesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const body = stripProtected(zoneSchema.parse(req.body));
    if (!(await userOwnsItem(userId, body.item_id as string))) {
      res.status(404).json({ error: "item not found" });
      return;
    }
    const [row] = await db
      .insert(moodboardFloorplanZones)
      .values(toDb(body) as never)
      .returning();
    res.status(201).json(fromDb(row!));
  }),
);

// PATCH /api/v1/moodboard-floorplan-zones/:id
moodboardFloorplanZonesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const body = stripProtected(zoneUpdateSchema.parse(req.body));
    delete (body as Record<string, unknown>).item_id; // reparenting not allowed

    // Ownership via two-hop join: zone → item → moodboard → user.
    const owned = await db
      .select({ id: moodboardFloorplanZones.id })
      .from(moodboardFloorplanZones)
      .innerJoin(moodboardItems, eq(moodboardItems.id, moodboardFloorplanZones.itemId))
      .innerJoin(moodboards, eq(moodboards.id, moodboardItems.moodboardId))
      .where(and(eq(moodboardFloorplanZones.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [row] = await db
      .update(moodboardFloorplanZones)
      .set(toDb(body) as never)
      .where(eq(moodboardFloorplanZones.id, id))
      .returning();
    res.json(fromDb(row!));
  }),
);

// DELETE /api/v1/moodboard-floorplan-zones/:id
moodboardFloorplanZonesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const owned = await db
      .select({ id: moodboardFloorplanZones.id })
      .from(moodboardFloorplanZones)
      .innerJoin(moodboardItems, eq(moodboardItems.id, moodboardFloorplanZones.itemId))
      .innerJoin(moodboards, eq(moodboards.id, moodboardItems.moodboardId))
      .where(and(eq(moodboardFloorplanZones.id, id), eq(moodboards.createdBy, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db.delete(moodboardFloorplanZones).where(eq(moodboardFloorplanZones.id, id));
    res.status(204).end();
  }),
);
