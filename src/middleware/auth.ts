import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { env } from "../env";

const secret = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : null;

export type AuthedRequest = Request & {
  auth: {
    userId: string;
    email?: string;
    role: string;
  };
};

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  // Dev bypass — stamp a fixed user so routes can be built without Supabase access yet.
  if (env.AUTH_DISABLED) {
    (req as AuthedRequest).auth = {
      userId: env.DEV_USER_ID,
      role: "authenticated",
    };
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  if (!secret) {
    res.status(500).json({ error: "Server auth misconfigured" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) {
      res.status(401).json({ error: "Invalid token: missing subject" });
      return;
    }

    (req as AuthedRequest).auth = {
      userId: sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: typeof payload.role === "string" ? payload.role : "authenticated",
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
