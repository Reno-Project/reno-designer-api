import { Router } from "express";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { slideTemplates } from "../db/schema";
import { asyncHandler } from "../lib/asyncHandler";
import { fromDb, fromDbMany, stripProtected, toDb } from "../lib/serialize";
import type { AuthedRequest } from "../middleware/auth";

export const slideTemplatesRouter = Router();

const uuid = z.string().uuid();

const templateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    positions: z.unknown(),
  })
  .passthrough();

const templateUpdateSchema = templateSchema.partial();

// GET /api/v1/slide-templates
// Returns global presets (user_id IS NULL) + the caller's own templates.
slideTemplatesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const rows = await db
      .select()
      .from(slideTemplates)
      .where(or(isNull(slideTemplates.userId), eq(slideTemplates.userId, userId)));
    res.json(fromDbMany(rows));
  }),
);

// POST /api/v1/slide-templates — always saves a personal (non-preset) template.
slideTemplatesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const body = stripProtected(templateSchema.parse(req.body));
    const values = {
      ...toDb(body),
      userId,
      isPreset: false, // server-controlled — clients can't create presets via this route
    };
    const [row] = await db.insert(slideTemplates).values(values as never).returning();
    res.status(201).json(fromDb(row!));
  }),
);

// PATCH /api/v1/slide-templates/:id  (own templates only — presets are read-only)
slideTemplatesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const body = stripProtected(templateUpdateSchema.parse(req.body));

    const [row] = await db
      .update(slideTemplates)
      .set(toDb(body) as never)
      .where(and(eq(slideTemplates.id, id), eq(slideTemplates.userId, userId)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fromDb(row));
  }),
);

// DELETE /api/v1/slide-templates/:id  (own templates only)
slideTemplatesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthedRequest).auth.userId;
    const id = uuid.parse(req.params.id);
    const deleted = await db
      .delete(slideTemplates)
      .where(and(eq(slideTemplates.id, id), eq(slideTemplates.userId, userId)))
      .returning({ id: slideTemplates.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  }),
);
