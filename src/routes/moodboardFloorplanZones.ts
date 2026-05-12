import { Router } from "express";

export const moodboardFloorplanZonesRouter = Router();

// GET    /moodboard-floorplan-zones?item_id=...   list zones for an item
// POST   /moodboard-floorplan-zones               create one
// PATCH  /moodboard-floorplan-zones/:id           update
// DELETE /moodboard-floorplan-zones/:id           delete

moodboardFloorplanZonesRouter.all("*", (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});
