import { Elysia, t } from "elysia";
import { sql } from "../db";
import { hashPassword, verifyPassword } from "../lib/password";
import { authContext, jwtPlugin } from "../lib/auth";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(jwtPlugin)
  .use(authContext)
  .post(
    "/register",
    async ({ body, jwt, set }) => {
      const email = body.email.trim().toLowerCase();

      const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existing.length > 0) {
        set.status = 409;
        return { error: "An account with that email already exists" };
      }

      const passwordHash = await hashPassword(body.password);
      const [user] = await sql`
        INSERT INTO users (email, password_hash, name)
        VALUES (${email}, ${passwordHash}, ${body.name?.trim() || null})
        RETURNING id, email, name, created_at
      `;

      const token = await jwt.sign({ sub: user.id, email: user.email });
      set.status = 201;
      return { token, user };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
        name: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      const email = body.email.trim().toLowerCase();
      const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;

      if (!user || !(await verifyPassword(body.password, user.password_hash))) {
        set.status = 401;
        return { error: "Invalid email or password" };
      }

      const token = await jwt.sign({ sub: user.id, email: user.email });
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    },
  )
  .get("/me", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const [profile] = await sql`
      SELECT id, email, name, created_at FROM users WHERE id = ${user.id}
    `;
    if (!profile) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    return { user: profile };
  });
