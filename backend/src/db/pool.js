import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL env");
}

export const pool = new pg.Pool({ connectionString: DATABASE_URL });
