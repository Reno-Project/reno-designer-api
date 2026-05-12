import { Router } from "express";

export const moodboardItemsRouter = Router();

// GET    /moodboard-items?moodboard_id=...   list items for a moodboard
// POST   /moodboard-items                    insert one
// POST   /moodboard-items/batch              insert many (matches existing UI batching)
// PATCH  /moodboard-items/:id                update one
// PATCH  /moodboard-items                    batch update (positions / z-index / etc.)
// DELETE /moodboard-items/:id                delete one
// DELETE /moodboard-items                    batch delete (?ids=a,b,c)

moodboardItemsRouter.all("*", (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});
