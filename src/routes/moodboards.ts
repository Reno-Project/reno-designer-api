import { Router } from "express";

export const moodboardsRouter = Router();

// GET    /moodboards?project_id=...        list moodboards for a project
// POST   /moodboards                       create a moodboard
// GET    /moodboards/:id                   fetch one
// PATCH  /moodboards/:id                   update
// DELETE /moodboards/:id                   delete
// GET    /moodboards/shared/:token         public shared view (no auth — wire separately)

moodboardsRouter.all("*", (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});
