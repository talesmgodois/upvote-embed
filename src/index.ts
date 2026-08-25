import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { authRoutes } from "./routes/auth";
import { catalogueRoutes } from "./routes/catalogues";
import { itemRoutes } from "./routes/items";
import { publicRoutes } from "./routes/public";

const PORT = Number(process.env.PORT ?? 3000);
const publicDir = new URL("../public", import.meta.url).pathname;

const app = new Elysia()
  .use(cors())
  .use(staticPlugin({ assets: publicDir, prefix: "" }))
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 422;
      return { error: error.message };
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not found" };
    }
    console.error(error);
    set.status = 500;
    return { error: "Internal server error" };
  })
  .use(authRoutes)
  .use(catalogueRoutes)
  .use(itemRoutes)
  .use(publicRoutes)
  .get("/", () => Bun.file(`${publicDir}/index.html`))
  .get("/embed/catalogue/:id", () => Bun.file(`${publicDir}/embed-catalogue.html`))
  .get("/embed/item/:id", () => Bun.file(`${publicDir}/embed-item.html`))
  .listen(PORT);

console.log(
  `upvote-embed running at http://${app.server?.hostname}:${app.server?.port}`,
);
