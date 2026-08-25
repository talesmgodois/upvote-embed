# upvote-embed

Embeddable upvote/downvote widgets for prioritizing what to build next.
Create a catalogue (e.g. "Q3 roadmap"), add items (projects/features you're
considering), and drop an embeddable link or `<iframe>` anywhere so anyone —
no account required — can upvote or downvote each one.

Built with [Bun](https://bun.sh), [Elysia](https://elysiajs.com), and
Postgres via Bun's native `Bun.sql` client. Zero frontend build step — the
UI is plain HTML/CSS/JS served straight from `public/`.

## Features

- Email/password auth with JWT bearer tokens (`@elysiajs/jwt`, `Bun.password` bcrypt hashing)
- CRUD for catalogues and their items (title, description, image URL)
- Paste a screenshot (or an image URL) straight into the item form to preview it
- Copyable direct link and `<iframe>` embed snippet for both a whole catalogue and a single item
- Public, unauthenticated upvote/downvote on items, with a per-browser anonymous voter id so a guest's vote toggles instead of stacking
- Light/dark theme (follows system preference, toggle persists via `localStorage`), Vercel-inspired blue design system

## Getting started

Requirements: [Bun](https://bun.sh) 1.2+ and a Postgres database.

```bash
bun install
cp .env.example .env   # then edit DATABASE_URL / JWT_SECRET
bun run migrate         # creates tables (safe to re-run)
bun run dev              # http://localhost:3000
```

### Environment variables

| Variable       | Description                                      |
| -------------- | ------------------------------------------------- |
| `DATABASE_URL` | Postgres connection string                        |
| `JWT_SECRET`   | Secret used to sign auth tokens - use a long random value |
| `PORT`         | HTTP port (default `3000`)                         |

## Project structure

```
src/
  db/            Bun.sql connection, schema.sql, migration runner
  lib/           auth (JWT + password hashing) helpers
  routes/        auth, catalogues, items (owner CRUD), public (embeds + voting)
  index.ts       Elysia app: static file serving + API mounting
public/
  index.html         dashboard / auth SPA shell
  embed-catalogue.html   embeddable catalogue widget (used via /embed/catalogue/:id)
  embed-item.html        embeddable single-item widget (used via /embed/item/:id)
  css/, js/
```

## Docker

```bash
docker build -t upvote-embed .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@host:5432/upvote_embed \
  -e JWT_SECRET=change-me \
  upvote-embed
```

The container runs migrations automatically on start (`bun run docker:start`
= `bun run migrate && bun run start`), so no separate migration step is
needed in production.

## CI/CD (GitHub Actions)

`.github/workflows/docker-publish.yml` builds the Docker image, pushes it to
Docker Hub, then calls a Coolify deploy webhook. It runs on every push to
`main`, on version tags (`v*`), and can be triggered manually.

Configure these under **Settings → Secrets and variables → Actions**:

**Secrets** (Repository secrets)

| Secret                 | Required | Description |
| ----------------------- | -------- | ----------- |
| `DOCKERHUB_USERNAME`    | yes      | Docker Hub username/org the image is pushed under |
| `DOCKERHUB_TOKEN`       | yes      | Docker Hub access token (Account Settings → Security → New Access Token) |
| `COOLIFY_WEBHOOK_URL`   | no       | Your Coolify application's deploy webhook URL. If unset, the deploy step is skipped. |
| `COOLIFY_WEBHOOK_TOKEN` | no       | Bearer token sent as `Authorization: Bearer <token>` when calling the webhook, if your Coolify instance requires one |

**Variables** (Repository variables)

| Variable               | Required | Description |
| ------------------------ | -------- | ----------- |
| `DOCKERHUB_IMAGE_NAME`   | no       | Image name (without the Docker Hub username). Defaults to `upvote-embed`, so the published image is `DOCKERHUB_USERNAME/upvote-embed`. |

The image is tagged with `latest` (on `main`), the branch name, the short
commit SHA, and a semver tag when the trigger is a `vX.Y.Z` tag.
