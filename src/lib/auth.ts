import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not set. Copy .env.example to .env and configure it.",
  );
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export const jwtPlugin = new Elysia({ name: "jwt-plugin" }).use(
  jwt({
    name: "jwt",
    secret: JWT_SECRET,
    exp: "7d",
  }),
);

/**
 * Derives `user` (nullable) from a `Bearer <token>` Authorization header.
 * This never rejects a request by itself - it only makes `user` available.
 * Pair it with the `requireAuth` beforeHandle on routes that must be
 * authenticated.
 */
export const authContext = new Elysia({ name: "auth-context" })
  .use(jwtPlugin)
  .derive({ as: "global" }, async ({ jwt, headers }) => {
    const header = headers.authorization;
    const token = header?.toLowerCase().startsWith("bearer ")
      ? header.slice(7).trim()
      : undefined;

    if (!token) return { user: null as AuthUser | null };

    const payload = (await jwt.verify(token)) as JwtPayload | false;
    if (!payload) return { user: null as AuthUser | null };

    return { user: { id: payload.sub, email: payload.email } as AuthUser };
  });

/**
 * Route-level `beforeHandle` guard: rejects with 401 unless a valid bearer
 * token was supplied. Used explicitly per-route (rather than as a reusable
 * plugin) so its effect never leaks to unrelated routes composed elsewhere
 * in the app.
 */
export function requireAuth({
  user,
  set,
}: {
  user: AuthUser | null;
  set: { status?: number | string };
}) {
  if (!user) {
    set.status = 401;
    return { error: "Unauthorized" };
  }
}
