import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { moodboardItems, moodboardVersions, moodboards } from "../db/schema";
import { asyncHandler } from "../lib/asyncHandler";
import { fromDb, fromDbMany } from "../lib/serialize";

/**
 * Public, unauthenticated routes for the "share by link" feature.
 * Anyone who knows the share_token can read the moodboard + its items.
 */
export const sharedRouter = Router();

const token = z.string().min(8);

// GET /api/v1/shared/moodboards/:token
sharedRouter.get(
  "/moodboards/:token",
  asyncHandler(async (req, res) => {
    const parsed = token.safeParse(req.params.token);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid token" });
      return;
    }

    const [board] = await db
      .select()
      .from(moodboards)
      .where(eq(moodboards.shareToken, parsed.data))
      .limit(1);
    if (!board) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const items = await db
      .select()
      .from(moodboardItems)
      .where(eq(moodboardItems.moodboardId, board.id));

    let snapshot: unknown = null;
    if (board.sharedVersionId) {
      const [v] = await db
        .select()
        .from(moodboardVersions)
        .where(eq(moodboardVersions.id, board.sharedVersionId))
        .limit(1);
      if (v) snapshot = v.snapshot;
    }

    res.json({
      moodboard: fromDb(board),
      items: fromDbMany(items),
      snapshot,
    });
  }),
);
