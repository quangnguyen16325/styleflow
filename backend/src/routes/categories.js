import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT id, name, slug, created_at, updated_at
        FROM categories
        ORDER BY name ASC, id ASC
      `,
    );

    return res.json(rows.map(mapCategoryRow));
  } catch (error) {
    console.error("GET /categories failed:", error);
    return res.status(500).json(internalError("Failed to fetch categories"));
  }
});

export default router;

function mapCategoryRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function internalError(message) {
  return {
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  };
}
