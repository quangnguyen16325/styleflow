import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const categoryId =
    req.query.categoryId == null ? null : parsePositiveInteger(req.query.categoryId);
  if (req.query.categoryId != null && !categoryId) {
    return res.status(400).json(validationError("categoryId must be a positive integer"));
  }

  const lowStockOnly = parseBooleanQuery(req.query.lowStockOnly);
  if (req.query.lowStockOnly != null && lowStockOnly == null) {
    return res.status(400).json(validationError("lowStockOnly must be true or false"));
  }

  try {
    const params = [];
    const conditions = [];

    if (categoryId) {
      params.push(categoryId);
      conditions.push(`p.category_id = $${params.length}`);
    }

    if (lowStockOnly === true) {
      conditions.push(
        `(COALESCE(i.stock_qty, 0) - COALESCE(i.reserved_qty, 0)) <= COALESCE(i.min_stock_level, 0)`,
      );
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `
        SELECT
          p.id,
          p.sku,
          p.name,
          p.base_price,
          p.category,
          p.category_id,
          p.image_url,
          p.created_at,
          COALESCE(i.stock_qty, 0) AS stock_qty,
          COALESCE(i.reserved_qty, 0) AS reserved_qty,
          COALESCE(i.min_stock_level, 0) AS min_stock_level,
          COALESCE(i.ads, 0) AS ads,
          COALESCE(i.doi, 0) AS doi,
          i.last_calculated_at
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        ${whereClause}
        ORDER BY p.id ASC
      `,
      params,
    );

    return res.json({
      generatedAt: new Date().toISOString(),
      items: rows.map(mapInventoryRow),
    });
  } catch (error) {
    console.error("GET /admin/inventory failed:", error);
    return res.status(500).json(internalError("Failed to fetch inventory snapshot"));
  }
});

export default router;

function mapInventoryRow(row) {
  const stockQty = Number(row.stock_qty);
  const reservedQty = Number(row.reserved_qty);
  const minStockLevel = Number(row.min_stock_level);
  const availableQty = stockQty - reservedQty;

  return {
    productId: Number(row.id),
    sku: row.sku,
    productName: row.name,
    categoryId: row.category_id == null ? null : Number(row.category_id),
    category: row.category,
    imageUrl: row.image_url,
    basePrice: Number(row.base_price),
    stockQty,
    reservedQty,
    availableQty,
    minStockLevel,
    ads: Number(row.ads),
    doi: Number(row.doi),
    lastCalculatedAt: row.last_calculated_at,
    isLowStock: availableQty <= minStockLevel,
    isOutOfStock: availableQty <= 0,
    createdAt: row.created_at,
  };
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseBooleanQuery(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return null;
}

function validationError(message) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
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
