import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          id,
          full_name,
          phone,
          email,
          role,
          created_at,
          updated_at
        FROM customers
        WHERE role = 'shipper'
        ORDER BY full_name ASC, id ASC
      `,
    );

    return res.json(
      rows.map((row) => ({
        id: Number(row.id),
        fullName: row.full_name,
        phone: row.phone,
        email: row.email,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    );
  } catch (error) {
    console.error("GET /admin/shippers failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch shippers",
      },
    });
  }
});

export default router;
