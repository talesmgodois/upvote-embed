import { sql } from "./index";

const path = new URL("./schema.sql", import.meta.url).pathname;

await sql.file(path);
console.log("Database migrated successfully.");

await sql.close();
