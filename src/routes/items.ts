import { Elysia, t } from "elysia";
import { sql } from "../db";
import { authContext, requireAuth } from "../lib/auth";

const itemBody = t.Object({
  title: t.String({ minLength: 1, maxLength: 160 }),
  description: t.Optional(t.String({ maxLength: 4000 })),
  image_url: t.Optional(t.String({ maxLength: 2_000_000 })),
});

export const itemRoutes = new Elysia({ prefix: "/api" })
  .use(authContext)
  .get(
    "/catalogues/:id/items",
    async ({ user, params, set }) => {
      const [catalogue] = await sql`
        SELECT id FROM catalogues WHERE id = ${params.id} AND user_id = ${user!.id}
      `;
      if (!catalogue) {
        set.status = 404;
        return { error: "Catalogue not found" };
      }

      const items = await sql`
        SELECT i.*,
          COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0)::int AS upvotes,
          COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0)::int AS downvotes
        FROM items i
        LEFT JOIN votes v ON v.item_id = i.id
        WHERE i.catalogue_id = ${params.id}
        GROUP BY i.id
        ORDER BY i.position ASC, i.created_at ASC
      `;
      return { items };
    },
    { beforeHandle: requireAuth },
  )
  .post(
    "/catalogues/:id/items",
    async ({ user, params, body, set }) => {
      const [catalogue] = await sql`
        SELECT id FROM catalogues WHERE id = ${params.id} AND user_id = ${user!.id}
      `;
      if (!catalogue) {
        set.status = 404;
        return { error: "Catalogue not found" };
      }

      const [item] = await sql`
        INSERT INTO items (catalogue_id, title, description, image_url)
        VALUES (${params.id}, ${body.title.trim()}, ${body.description?.trim() ?? ""}, ${body.image_url?.trim() || null})
        RETURNING *
      `;
      set.status = 201;
      return { item: { ...item, upvotes: 0, downvotes: 0 } };
    },
    { beforeHandle: requireAuth, body: itemBody },
  )
  .get(
    "/items/:id",
    async ({ user, params, set }) => {
      const [item] = await sql`
        SELECT i.*,
          COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0)::int AS upvotes,
          COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0)::int AS downvotes
        FROM items i
        JOIN catalogues c ON c.id = i.catalogue_id
        LEFT JOIN votes v ON v.item_id = i.id
        WHERE i.id = ${params.id} AND c.user_id = ${user!.id}
        GROUP BY i.id
      `;
      if (!item) {
        set.status = 404;
        return { error: "Item not found" };
      }
      return { item };
    },
    { beforeHandle: requireAuth },
  )
  .put(
    "/items/:id",
    async ({ user, params, body, set }) => {
      const [item] = await sql`
        UPDATE items AS i
        SET title = ${body.title.trim()},
            description = ${body.description?.trim() ?? ""},
            image_url = ${body.image_url?.trim() || null},
            updated_at = now()
        FROM catalogues AS c
        WHERE i.catalogue_id = c.id AND i.id = ${params.id} AND c.user_id = ${user!.id}
        RETURNING i.*
      `;
      if (!item) {
        set.status = 404;
        return { error: "Item not found" };
      }
      return { item };
    },
    { beforeHandle: requireAuth, body: itemBody },
  )
  .delete(
    "/items/:id",
    async ({ user, params, set }) => {
      const [item] = await sql`
        DELETE FROM items AS i
        USING catalogues AS c
        WHERE i.catalogue_id = c.id AND i.id = ${params.id} AND c.user_id = ${user!.id}
        RETURNING i.id
      `;
      if (!item) {
        set.status = 404;
        return { error: "Item not found" };
      }
      return { success: true };
    },
    { beforeHandle: requireAuth },
  );
