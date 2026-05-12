import { Router } from "express";

export const moodboardCommentsRouter = Router();

// GET    /moodboard-comments?moodboard_id=...   list comments
// POST   /moodboard-comments                    add a comment
// PATCH  /moodboard-comments/:id                edit / mark resolved
// DELETE /moodboard-comments/:id                delete

moodboardCommentsRouter.all("*", (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});
