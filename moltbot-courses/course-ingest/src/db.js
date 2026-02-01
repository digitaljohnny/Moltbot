import pg from "pg";

const { Pool } = pg;

export function makePool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  return new Pool({ connectionString: url });
}

export async function ensureSchema(pool, log = console) {
  // Ultra-simple migrations: run bundled SQL file(s) once at startup.
  // For production, you might switch to a migration tool, but this keeps it tiny.
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const sqlDir = path.join(process.cwd(), "sql");
  const files = await fs.readdir(sqlDir);
  const sqlFiles = files
    .filter(f => f.endsWith(".sql"))
    .sort(); // Apply migrations in order (001_init.sql, 002_children.sql, etc.)

  for (const file of sqlFiles) {
    const sqlPath = path.join(sqlDir, file);
    const sql = await fs.readFile(sqlPath, "utf8");
    log.info?.({ sqlPath }, "Applying schema (idempotent)");
    await pool.query(sql);
  }
}