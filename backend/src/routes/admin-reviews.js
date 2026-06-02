import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();
const REVIEW_STATUSES = new Set(["visible", "hidden", "deleted"]);

router.get("/", async (req, res) => {
  const status = normalizeStatusFilter(req.query.status);
  if (req.query.status != null && !status) {
    return res.status(400).json(validationError("Invalid review status filter"));
  }

  const productId = req.query.productId == null ? null : parsePositiveInteger(req.query.productId);
  if (req.query.productId != null && !productId) {
    return res.status(400).json(validationError("productId must be a positive integer"));
  }

  const limit = parsePaginationLimit(req.query.limit);
  const offset = parsePaginationOffset(req.query.offset);
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`pr.status = $${params.length}`);
  }

  if (productId) {
    params.push(productId);
    conditions.push(`pr.product_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    params.push(limit, offset);
    const limitPlaceholder = `$${params.length - 1}`;
    const offsetPlaceholder = `$${params.length}`;

    const { rows } = await pool.query(
      `
        SELECT
          pr.id,
          pr.product_id,
          pr.customer_id,
          pr.order_id,
          pr.order_item_id,
          pr.rating,
          pr.comment,
          pr.images,
          pr.status,
          pr.hidden_reason,
          pr.customer_name_snapshot,
          pr.product_name_snapshot,
          pr.created_at,
          pr.updated_at,
          p.name AS product_name,
          c.full_name AS customer_name,
          c.email AS customer_email
        FROM product_reviews pr
        JOIN products p ON p.id = pr.product_id
        JOIN customers c ON c.id = pr.customer_id
        ${whereClause}
        ORDER BY pr.created_at DESC, pr.id DESC
        LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
      `,
      params,
    );

    const countParams = params.slice(0, params.length - 2);
    const countResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM product_reviews pr
        ${whereClause}
      `,
      countParams,
    );

    return res.json({
      items: rows.map(mapAdminReviewRow),
      total: Number(countResult.rows[0]?.total ?? 0),
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET /admin/reviews failed:", error);
    return res.status(500).json(internalError("Failed to fetch product reviews"));
  }
});

router.patch("/:id/status", async (req, res) => {
  const reviewId = parsePositiveInteger(req.params.id);
  if (!reviewId) {
    return res.status(400).json(validationError("Review id must be a positive integer"));
  }

  const status = normalizeStatusFilter(req.body?.status);
  if (!status) {
    return res.status(400).json(validationError("A valid review status is required"));
  }

  const hiddenReason =
    req.body?.hiddenReason == null ? null : String(req.body.hiddenReason).trim().slice(0, 500);

  try {
    const { rows } = await pool.query(
      `
        UPDATE product_reviews
        SET
          status = $2::varchar,
          hidden_reason = CASE WHEN $2::varchar = 'hidden' THEN NULLIF($3, '') ELSE NULL END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [reviewId, status, hiddenReason],
    );

    if (rows.length === 0) {
      return res.status(404).json(notFound("Review not found"));
    }

    return res.json(mapAdminReviewRow(rows[0]));
  } catch (error) {
    console.error(`PATCH /admin/reviews/${reviewId}/status failed:`, error);
    return res.status(500).json(internalError("Failed to update review status"));
  }
});

export default router;

function mapAdminReviewRow(row) {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    customerId: Number(row.customer_id),
    orderId: Number(row.order_id),
    orderItemId: Number(row.order_item_id),
    rating: Number(row.rating),
    comment: row.comment || "",
    images: Array.isArray(row.images) ? row.images : [],
    status: row.status,
    hiddenReason: row.hidden_reason,
    customerName: row.customer_name_snapshot || row.customer_name,
    customerEmail: row.customer_email,
    productName: row.product_name_snapshot || row.product_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeStatusFilter(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return REVIEW_STATUSES.has(normalized) ? normalized : null;
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePaginationLimit(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 50;
  }

  return Math.min(parsed, 100);
}

function parsePaginationOffset(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function validationError(message) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  };
}

function notFound(message) {
  return {
    error: {
      code: "NOT_FOUND",
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
