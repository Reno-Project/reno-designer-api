import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { moodboards, moodboardItems } from "../db/schema";

/** Returns true iff the moodboard exists AND was created by this user. */
export async function userOwnsMoodboard(userId: string, moodboardId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: moodboards.id })
    .from(moodboards)
    .where(and(eq(moodboards.id, moodboardId), eq(moodboards.createdBy, userId)))
    .limit(1);
  return !!row;
}

/** Returns the moodboard_id that owns this item, IFF the user owns that moodboard. */
export async function userOwnsItem(userId: string, itemId: string): Promise<string | null> {
  const [row] = await db
    .select({ moodboardId: moodboardItems.moodboardId, createdBy: moodboards.createdBy })
    .from(moodboardItems)
    .innerJoin(moodboards, eq(moodboards.id, moodboardItems.moodboardId))
    .where(eq(moodboardItems.id, itemId))
    .limit(1);
  if (!row || row.createdBy !== userId) return null;
  return row.moodboardId;
}
