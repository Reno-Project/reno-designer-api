import "dotenv/config";
import { z } from "zod";

const boolish = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    const s = v.toLowerCase().trim();
    return s === "true" || s === "1" || s === "yes";
  });

const baseSchema = z.object({
  DATABASE_CLIENT: z.literal("postgres").default("postgres"),
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive().default(5432),
  DATABASE_NAME: z.string().min(1),
  DATABASE_USERNAME: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_SCHEMA: z.string().min(1).default("designers"),
  DATABASE_SSL: boolish.default("true"),

  // Auth — Supabase JWT verification.
  // Required unless AUTH_DISABLED=true (dev bypass).
  SUPABASE_JWT_SECRET: z.string().optional(),
  AUTH_DISABLED: boolish.default("false"),
  // UUID used as req.auth.userId when AUTH_DISABLED=true.
  DEV_USER_ID: z.string().uuid().default("00000000-0000-0000-0000-000000000001"),

  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:8080")
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
});

const schema = baseSchema.refine(
  (v) => v.AUTH_DISABLED || (v.SUPABASE_JWT_SECRET && v.SUPABASE_JWT_SECRET.length > 0),
  {
    message: "SUPABASE_JWT_SECRET is required unless AUTH_DISABLED=true",
    path: ["SUPABASE_JWT_SECRET"],
  },
);

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

if (env.AUTH_DISABLED) {
  console.warn(
    `[auth] AUTH_DISABLED=true — every request is stamped as user ${env.DEV_USER_ID}. NEVER enable this in production.`,
  );
}
