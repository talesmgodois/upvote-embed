import { Elysia, t } from "elysia";
import { sql } from "../db";

function readVoterId(headers: Record<string, string | undefined>) {
  const id = headers["x-voter-id"];
  return id && id.length > 0 && id.length <= 200 ? id : undefined;
}

async function attachUserVotes<T extends { id: string }>(
  items: T[],
  voterId: string | undefined,
) {
  if (!voterId || items.length === 0) {
    return items.map((item) => ({ ...item, userVote: null as 1 | -1 | null }));
  }

  const ids = items.map((item) => item.id);
  const votes = await sql`
    SELECT item_id, vote_type FROM votes
    WHERE voter_id = ${voterId} AND item_id = ANY(${sql.array(ids, "uuid")})
  `;
  const voteMap = new Map(
    votes.map((v: { item_id: string; vote_type: 1 | -1 }) => [v.item_id, v.vote_type]),
  );

  return items.map((item) => ({
    ...item,
    userVote: voteMap.get(item.id) ?? null,
  }));
}

export const publicRoutes = new Elysia({ prefix: "/api/public" })
  .get("/catalogues/:id", async ({ params, headers, set }) => {
    const [catalogue] = await sql`
      SELECT c.id, c.name, c.description, c.created_at, u.name AS owner_name
      FROM catalogues c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = ${params.id}
    `;
    if (!catalogue) {
      set.status = 404;
      return { error: "Catalogue not found" };
    }

    const items = await sql`
      SELECT i.id, i.title, i.description, i.image_url, i.created_at,
        COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0)::int AS upvotes,
        COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0)::int AS downvotes
      FROM items i
      LEFT JOIN votes v ON v.item_id = i.id
      WHERE i.catalogue_id = ${params.id}
      GROUP BY i.id
      ORDER BY i.position ASC, i.created_at ASC
    `;

    return {
      catalogue,
      items: await attachUserVotes(items, readVoterId(headers)),
    };
  })
  .get("/items/:id", async ({ params, headers, set }) => {
    const [item] = await sql`
      SELECT i.id, i.title, i.description, i.image_url, i.created_at, i.catalogue_id,
        c.name AS catalogue_name,
        COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0)::int AS upvotes,
        COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0)::int AS downvotes
      FROM items i
      JOIN catalogues c ON c.id = i.catalogue_id
      LEFT JOIN votes v ON v.item_id = i.id
      WHERE i.id = ${params.id}
      GROUP BY i.id, c.name
    `;
    if (!item) {
      set.status = 404;
      return { error: "Item not found" };
    }

    const [withVote] = await attachUserVotes([item], readVoterId(headers));
    return { item: withVote };
  })
  .post(
    "/items/:id/vote",
    async ({ params, body, headers, set }) => {
      const voterId = readVoterId(headers);
      if (!voterId) {
        set.status = 400;
        return { error: "Missing X-Voter-Id header" };
      }

      const [item] = await sql`SELECT id FROM items WHERE id = ${params.id}`;
      if (!item) {
        set.status = 404;
        return { error: "Item not found" };
      }

      const voteType = body.type === "up" ? 1 : -1;
      const [existing] = await sql`
        SELECT vote_type FROM votes WHERE item_id = ${params.id} AND voter_id = ${voterId}
      `;

      let userVote: 1 | -1 | null = voteType;
      if (existing && existing.vote_type === voteType) {
        await sql`DELETE FROM votes WHERE item_id = ${params.id} AND voter_id = ${voterId}`;
        userVote = null;
      } else {
        await sql`
          INSERT INTO votes (item_id, voter_id, vote_type)
          VALUES (${params.id}, ${voterId}, ${voteType})
          ON CONFLICT (item_id, voter_id)
          DO UPDATE SET vote_type = EXCLUDED.vote_type, created_at = now()
        `;
      }

      const [counts] = await sql`
        SELECT
          COALESCE(SUM(CASE WHEN vote_type = 1 THEN 1 ELSE 0 END), 0)::int AS upvotes,
          COALESCE(SUM(CASE WHEN vote_type = -1 THEN 1 ELSE 0 END), 0)::int AS downvotes
        FROM votes WHERE item_id = ${params.id}
      `;

      return { upvotes: counts.upvotes, downvotes: counts.downvotes, userVote };
    },
    {
      body: t.Object({
        type: t.Union([t.Literal("up"), t.Literal("down")]),
      }),
    },
  );
