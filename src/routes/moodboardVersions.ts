import { Router } from "express";

export const moodboardVersionsRouter = Router();

// GET    /moodboard-versions?moodboard_id=...  list versions for a moodboard
// POST   /moodboard-versions                   create a snapshot
// GET    /moodboard-versions/:id               fetch one
// PATCH  /moodboard-versions/:id               update (name / approval_status / locked)
// DELETE /moodboard-versions/:id               delete

moodboardVersionsRouter.all("*", (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});
