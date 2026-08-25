import { Elysia, t } from "elysia";
import { sql } from "../db";
import { authContext, requireAuth } from "../lib/auth";

export const catalogueRoutes = new Elysia({ prefix: "/api/catalogues" })
  .use(authContext)
  .get(
    "/",
    async ({ user }) => {
      const catalogues = await sql`
        SELECT c.*,
          (SELECT COUNT(*)::int FROM items i WHERE i.catalogue_id = c.id) AS item_count
        FROM catalogues c
        WHERE c.user_id = ${user!.id}
        ORDER BY c.created_at DESC
      `;
      return { catalogues };
    },
    { beforeHandle: requireAuth },
  )
  .post(
    "/",
    async ({ user, body, set }) => {
      const [catalogue] = await sql`
        INSERT INTO catalogues (user_id, name, description)
        VALUES (${user!.id}, ${body.name.trim()}, ${body.description?.trim() ?? ""})
        RETURNING *
      `;
      set.status = 201;
      return { catalogue: { ...catalogue, item_count: 0 } };
    },
    {
      beforeHandle: requireAuth,
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 120 }),
        description: t.Optional(t.String({ maxLength: 2000 })),
      }),
    },
  )
  .get(
    "/:id",
    async ({ user, params, set }) => {
      const [catalogue] = await sql`
        SELECT * FROM catalogues WHERE id = ${params.id} AND user_id = ${user!.id}
      `;
      if (!catalogue) {
        set.status = 404;
        return { error: "Catalogue not found" };
      }
      return { catalogue };
    },
    { beforeHandle: requireAuth },
  )
  .put(
    "/:id",
    async ({ user, params, body, set }) => {
      const [catalogue] = await sql`
        UPDATE catalogues
        SET name = ${body.name.trim()}, description = ${body.description?.trim() ?? ""}, updated_at = now()
        WHERE id = ${params.id} AND user_id = ${user!.id}
        RETURNING *
      `;
      if (!catalogue) {
        set.status = 404;
        return { error: "Catalogue not found" };
      }
      return { catalogue };
    },
    {
      beforeHandle: requireAuth,
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 120 }),
        description: t.Optional(t.String({ maxLength: 2000 })),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ user, params, set }) => {
      const [catalogue] = await sql`
        DELETE FROM catalogues WHERE id = ${params.id} AND user_id = ${user!.id} RETURNING id
      `;
      if (!catalogue) {
        set.status = 404;
        return { error: "Catalogue not found" };
      }
      return { success: true };
    },
    { beforeHandle: requireAuth },
  );
