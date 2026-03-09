import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrate() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const seedPath = path.join(__dirname, "seed.sql");

  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const seedSql = fs.readFileSync(seedPath, "utf8");
  const schemaExecutable = stripSqlComments(schemaSql).trim();
  const seedExecutable = stripSqlComments(seedSql).trim();

  if (schemaExecutable) {
    await pool.query(schemaSql);
  }

  if (seedExecutable) {
    await pool.query(seedSql);
  }
}

function stripSqlComments(sql) {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}
