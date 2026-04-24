import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/sales-by-product", async (req, res) => {
  const dateRange = parseAnalyticsDateRange(req.query);
  if (dateRange.error) {
    return res.status(400).json(validationError(dateRange.error));
  }

  try {
    const { rows } = await pool.query(
      `
        WITH sales_window AS (
          SELECT
            oi.product_id,
            SUM(oi.quantity)::bigint AS sold_qty,
            SUM(oi.quantity * oi.price_at_purchase)::numeric(14, 2) AS revenue,
            COUNT(DISTINCT oi.order_id)::bigint AS order_count
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.status = 'completed'
            AND o.updated_at >= $1
            AND o.updated_at < $2
          GROUP BY oi.product_id
        )
        SELECT
          p.id,
          p.sku,
          p.name,
          p.base_price,
          p.category,
          p.category_id,
          p.image_url,
          COALESCE(i.stock_qty, 0) AS stock_qty,
          COALESCE(i.reserved_qty, 0) AS reserved_qty,
          COALESCE(i.min_stock_level, 0) AS min_stock_level,
          COALESCE(i.ads, 0) AS ads,
          COALESCE(i.doi, 0) AS doi,
          i.last_calculated_at,
          COALESCE(sw.sold_qty, 0) AS sold_qty,
          COALESCE(sw.revenue, 0) AS revenue,
          COALESCE(sw.order_count, 0) AS order_count
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        LEFT JOIN sales_window sw ON sw.product_id = p.id
        ORDER BY sold_qty DESC, revenue DESC, p.id ASC
      `,
      [dateRange.from, dateRange.toExclusive],
    );

    return res.json({
      generatedAt: new Date().toISOString(),
      from: formatDateOnly(dateRange.from),
      to: formatDateOnly(dateRange.toInclusive),
      items: rows.map(mapSalesAnalyticsRow),
    });
  } catch (error) {
    console.error("GET /admin/analytics/sales-by-product failed:", error);
    return res.status(500).json(internalError("Failed to fetch product sales analytics"));
  }
});

export default router;

function parseAnalyticsDateRange(query) {
  const toInclusive = query.to == null ? startOfUtcDay(new Date()) : parseDateOnly(query.to);
  if (query.to != null && !toInclusive) {
    return { error: "to must be in YYYY-MM-DD format" };
  }

  const from =
    query.from == null
      ? new Date(toInclusive.getTime() - 6 * DAY_IN_MS)
      : parseDateOnly(query.from);
  if (query.from != null && !from) {
    return { error: "from must be in YYYY-MM-DD format" };
  }

  if (from.getTime() > toInclusive.getTime()) {
    return { error: "from must be earlier than or equal to to" };
  }

  return {
    from,
    toInclusive,
    toExclusive: new Date(toInclusive.getTime() + DAY_IN_MS),
  };
}

function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return null;
  }

  const parsed = new Date(`${value.trim()}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfUtcDay(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function mapSalesAnalyticsRow(row) {
  const stockQty = Number(row.stock_qty);
  const reservedQty = Number(row.reserved_qty);
  const availableQty = stockQty - reservedQty;
  const minStockLevel = Number(row.min_stock_level);

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
    soldQty: Number(row.sold_qty),
    revenue: Number(row.revenue),
    orderCount: Number(row.order_count),
  };
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

const DAY_IN_MS = 24 * 60 * 60 * 1000;
