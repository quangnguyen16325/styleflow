import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          p.id,
          p.sku,
          p.name,
          p.base_price,
          p.category,
          p.created_at,
          COALESCE(i.stock_qty, 0) AS stock_qty,
          COALESCE(i.reserved_qty, 0) AS reserved_qty,
          COALESCE(i.min_stock_level, 0) AS min_stock_level
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        ORDER BY p.id ASC
      `,
    );

    res.json(rows.map(mapProductRow));
  } catch (error) {
    console.error("GET /products failed:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch products",
      },
    });
  }
});

router.get("/:id", async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Product id must be a positive integer",
      },
    });
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT
          p.id,
          p.sku,
          p.name,
          p.base_price,
          p.category,
          p.created_at,
          COALESCE(i.stock_qty, 0) AS stock_qty,
          COALESCE(i.reserved_qty, 0) AS reserved_qty,
          COALESCE(i.min_stock_level, 0) AS min_stock_level
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.id = $1
      `,
      [productId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Product not found",
        },
      });
    }

    return res.json(mapProductRow(rows[0]));
  } catch (error) {
    console.error(`GET /products/${productId} failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch product",
      },
    });
  }
});

export default router;

function mapProductRow(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    basePrice: Number(row.base_price),
    category: row.category,
    stockQty: Number(row.stock_qty),
    reservedQty: Number(row.reserved_qty),
    availableQty: Number(row.stock_qty) - Number(row.reserved_qty),
    minStockLevel: Number(row.min_stock_level),
    createdAt: row.created_at,
  };
}
