import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.PGLITE_PORT || 54329);

const db = new PGlite({ extensions: { btree_gist } });
for (const file of ["db/schema.sql", "db/seed.sql", "db/002_runtime.sql", "db/seed_runtime.sql", "db/003_desk.sql"]) {
  const sql = fs.readFileSync(path.join(repo, file), "utf8");
  await db.exec(sql);
  console.log("loaded", file);
}
const personas = await db.query("SELECT key FROM caller_personas ORDER BY 1");
console.log("personas", personas.rows.map((row) => row.key).join(","));

const server = new PGLiteSocketServer({
  db,
  port,
  host: "127.0.0.1",
  maxConnections: 20,
});
await server.start();
const ready = server.getServerConn();
console.log("pglite-ready", ready);
fs.mkdirSync(path.join(repo, "data"), { recursive: true });
fs.writeFileSync(path.join(repo, "data", "pglite.ready"), ready || "ok");

process.on("SIGINT", async () => {
  await server.stop();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await server.stop();
  process.exit(0);
});
