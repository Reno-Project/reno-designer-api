import { Router } from "express";
import { requireUser } from "../middleware/auth";
import { moodboardsRouter } from "./moodboards";
import { moodboardItemsRouter } from "./moodboardItems";
import { moodboardVersionsRouter } from "./moodboardVersions";
import { moodboardCommentsRouter } from "./moodboardComments";
import { moodboardFloorplanZonesRouter } from "./moodboardFloorplanZones";
import { slideTemplatesRouter } from "./slideTemplates";
import { sharedRouter } from "./shared";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Public routes — no auth required.
apiRouter.use("/shared", sharedRouter);

// Everything below requires a valid Supabase JWT (or the AUTH_DISABLED bypass).
apiRouter.use(requireUser);

apiRouter.use("/moodboards", moodboardsRouter);
apiRouter.use("/moodboard-items", moodboardItemsRouter);
apiRouter.use("/moodboard-versions", moodboardVersionsRouter);
apiRouter.use("/moodboard-comments", moodboardCommentsRouter);
apiRouter.use("/moodboard-floorplan-zones", moodboardFloorplanZonesRouter);
apiRouter.use("/slide-templates", slideTemplatesRouter);
