import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createReviewImageUploadUrl,
  getR2Config,
  isAllowedImageContentType,
  isValidImageUrl,
} from "../r2.js";

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
          p.category_id,
          p.image_url,
          p.created_at,
          COALESCE(i.stock_qty, 0) AS stock_qty,
          COALESCE(i.reserved_qty, 0) AS reserved_qty,
          COALESCE(i.min_stock_level, 0) AS min_stock_level,
          COALESCE(rs.review_count, 0) AS review_count,
          COALESCE(rs.rating_average, 0) AS rating_average
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        LEFT JOIN ${productReviewSummaryJoin} rs ON rs.product_id = p.id
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
  const productId = parsePositiveInteger(req.params.id);
  if (!productId) {
    return res.status(400).json(validationError("Product id must be a positive integer"));
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
          p.category_id,
          p.image_url,
          p.created_at,
          COALESCE(i.stock_qty, 0) AS stock_qty,
          COALESCE(i.reserved_qty, 0) AS reserved_qty,
          COALESCE(i.min_stock_level, 0) AS min_stock_level,
          COALESCE(rs.review_count, 0) AS review_count,
          COALESCE(rs.rating_average, 0) AS rating_average
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        LEFT JOIN ${productReviewSummaryJoin} rs ON rs.product_id = p.id
        WHERE p.id = $1
      `,
      [productId],
    );

    if (rows.length === 0) {
      return res.status(404).json(notFound("Product not found"));
    }

    return res.json(mapProductRow(rows[0]));
  } catch (error) {
    console.error(`GET /products/${productId} failed:`, error);
    return res.status(500).json(internalError("Failed to fetch product"));
  }
});

router.get("/:id/reviews", async (req, res) => {
  const productId = parsePositiveInteger(req.params.id);
  if (!productId) {
    return res.status(400).json(validationError("Product id must be a positive integer"));
  }

  const limit = parsePaginationLimit(req.query.limit);
  const offset = parsePaginationOffset(req.query.offset);

  try {
    const productExists = await pool.query("SELECT id FROM products WHERE id = $1 LIMIT 1", [
      productId,
    ]);
    if (productExists.rows.length === 0) {
      return res.status(404).json(notFound("Product not found"));
    }

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
          pr.customer_name_snapshot,
          pr.product_name_snapshot,
          pr.created_at,
          pr.updated_at
        FROM product_reviews pr
        WHERE pr.product_id = $1 AND pr.status = 'visible'
        ORDER BY pr.created_at DESC, pr.id DESC
        LIMIT $2 OFFSET $3
      `,
      [productId, limit, offset],
    );

    const countResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM product_reviews
        WHERE product_id = $1 AND status = 'visible'
      `,
      [productId],
    );

    return res.json({
      items: rows.map((row) => mapReviewRow(row)),
      total: Number(countResult.rows[0]?.total ?? 0),
      limit,
      offset,
    });
  } catch (error) {
    console.error(`GET /products/${productId}/reviews failed:`, error);
    return res.status(500).json(internalError("Failed to fetch product reviews"));
  }
});

router.post("/:id/reviews", requireAuth, async (req, res) => {
  const productId = parsePositiveInteger(req.params.id);
  if (!productId) {
    return res.status(400).json(validationError("Product id must be a positive integer"));
  }

  const validationMessage = validateReviewBody(req.body, { requireOrderItemId: true });
  if (validationMessage) {
    return res.status(400).json(validationError(validationMessage));
  }

  const orderItemId = parsePositiveInteger(req.body.orderItemId);
  const rating = Number(req.body.rating);
  const comment = normalizeComment(req.body.comment);
  const images = normalizeReviewImages(req.body.images);

  try {
    const reviewContext = await resolveReviewableOrderItem({
      productId,
      orderItemId,
      customerId: req.authCustomer.id,
    });

    if (!reviewContext) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "This product is not reviewable from this order item",
        },
      });
    }

    const { rows } = await pool.query(
      `
        INSERT INTO product_reviews (
          product_id,
          customer_id,
          order_id,
          order_item_id,
          rating,
          comment,
          images,
          customer_name_snapshot,
          product_name_snapshot
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
        RETURNING *
      `,
      [
        productId,
        req.authCustomer.id,
        reviewContext.order_id,
        orderItemId,
        rating,
        comment,
        JSON.stringify(images),
        req.authCustomer.fullName,
        reviewContext.product_name,
      ],
    );

    return res.status(201).json(mapReviewRow(rows[0], { includePrivate: true }));
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "This order item has already been reviewed",
        },
      });
    }

    console.error(`POST /products/${productId}/reviews failed:`, error);
    return res.status(500).json(internalError("Failed to create product review"));
  }
});

router.put("/:productId/reviews/:reviewId", requireAuth, async (req, res) => {
  const productId = parsePositiveInteger(req.params.productId);
  const reviewId = parsePositiveInteger(req.params.reviewId);
  if (!productId || !reviewId) {
    return res
      .status(400)
      .json(validationError("Product and review ids must be positive integers"));
  }

  const validationMessage = validateReviewBody(req.body, { requireOrderItemId: false });
  if (validationMessage) {
    return res.status(400).json(validationError(validationMessage));
  }

  try {
    const { rows } = await pool.query(
      `
        UPDATE product_reviews
        SET
          rating = $4,
          comment = $5,
          images = $6::jsonb,
          updated_at = NOW()
        WHERE id = $1
          AND product_id = $2
          AND customer_id = $3
          AND status <> 'deleted'
        RETURNING *
      `,
      [
        reviewId,
        productId,
        req.authCustomer.id,
        Number(req.body.rating),
        normalizeComment(req.body.comment),
        JSON.stringify(normalizeReviewImages(req.body.images)),
      ],
    );

    if (rows.length === 0) {
      return res.status(404).json(notFound("Review not found"));
    }

    return res.json(mapReviewRow(rows[0], { includePrivate: true }));
  } catch (error) {
    console.error(`PUT /products/${productId}/reviews/${reviewId} failed:`, error);
    return res.status(500).json(internalError("Failed to update product review"));
  }
});

router.delete("/:productId/reviews/:reviewId", requireAuth, async (req, res) => {
  const productId = parsePositiveInteger(req.params.productId);
  const reviewId = parsePositiveInteger(req.params.reviewId);
  if (!productId || !reviewId) {
    return res
      .status(400)
      .json(validationError("Product and review ids must be positive integers"));
  }

  try {
    const { rows } = await pool.query(
      `
        UPDATE product_reviews
        SET status = 'deleted', updated_at = NOW()
        WHERE id = $1 AND product_id = $2 AND customer_id = $3 AND status <> 'deleted'
        RETURNING id
      `,
      [reviewId, productId, req.authCustomer.id],
    );

    if (rows.length === 0) {
      return res.status(404).json(notFound("Review not found"));
    }

    return res.json({ success: true });
  } catch (error) {
    console.error(`DELETE /products/${productId}/reviews/${reviewId} failed:`, error);
    return res.status(500).json(internalError("Failed to delete product review"));
  }
});

router.post("/:id/reviews/uploads/presign", requireAuth, async (req, res) => {
  const productId = parsePositiveInteger(req.params.id);
  if (!productId) {
    return res.status(400).json(validationError("Product id must be a positive integer"));
  }

  const validationMessage = validateReviewUploadBody(req.body);
  if (validationMessage) {
    return res.status(400).json(validationError(validationMessage));
  }

  if (!getR2Config()) {
    return res.status(500).json(internalError("R2 upload is not configured"));
  }

  const orderItemId = parsePositiveInteger(req.body.orderItemId);
  const fileName = req.body.fileName.trim();
  const contentType = req.body.contentType.trim().toLowerCase();

  try {
    const reviewContext = await resolveReviewableOrderItem({
      productId,
      orderItemId,
      customerId: req.authCustomer.id,
    });

    if (!reviewContext) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "This product is not reviewable from this order item",
        },
      });
    }

    const upload = await createReviewImageUploadUrl({
      customerId: req.authCustomer.id,
      productId,
      orderItemId,
      fileName,
      contentType,
    });

    return res.status(201).json(upload);
  } catch (error) {
    console.error(`POST /products/${productId}/reviews/uploads/presign failed:`, error);
    return res.status(500).json(internalError("Failed to create review image upload URL"));
  }
});

export default router;

const productReviewSummaryJoin = `
  (
    SELECT
      product_id,
      COUNT(*)::int AS review_count,
      ROUND(AVG(rating)::numeric, 2) AS rating_average
    FROM product_reviews
    WHERE status = 'visible'
    GROUP BY product_id
  )
`;

function mapProductRow(row) {
  return {
    id: Number(row.id),
    sku: row.sku,
    name: row.name,
    basePrice: Number(row.base_price),
    categoryId: row.category_id == null ? null : Number(row.category_id),
    category: row.category,
    imageUrl: row.image_url,
    stockQty: Number(row.stock_qty),
    reservedQty: Number(row.reserved_qty),
    availableQty: Number(row.stock_qty) - Number(row.reserved_qty),
    minStockLevel: Number(row.min_stock_level),
    reviewCount: Number(row.review_count ?? 0),
    ratingAverage: Number(row.rating_average ?? 0),
    createdAt: row.created_at,
  };
}

function mapReviewRow(row, options = {}) {
  const review = {
    id: Number(row.id),
    productId: Number(row.product_id),
    rating: Number(row.rating),
    comment: row.comment || "",
    images: Array.isArray(row.images) ? row.images : [],
    status: row.status,
    customerName: row.customer_name_snapshot,
    productName: row.product_name_snapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (options.includePrivate) {
    review.customerId = Number(row.customer_id);
    review.orderId = Number(row.order_id);
    review.orderItemId = Number(row.order_item_id);
  }

  return review;
}

async function resolveReviewableOrderItem({ productId, orderItemId, customerId }) {
  const { rows } = await pool.query(
    `
      SELECT
        oi.id AS order_item_id,
        oi.order_id,
        p.name AS product_name
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE oi.id = $1
        AND oi.product_id = $2
        AND o.customer_id = $3
        AND (
          o.status = 'completed'
          OR o.delivery_status IN ('delivered', 'returned')
        )
      LIMIT 1
    `,
    [orderItemId, productId, customerId],
  );

  return rows[0] || null;
}

function validateReviewBody(body, { requireOrderItemId }) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (requireOrderItemId && !parsePositiveInteger(body.orderItemId)) {
    return "orderItemId must be a positive integer";
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "rating must be an integer from 1 to 5";
  }

  const comment = normalizeComment(body.comment);
  if (comment.length > 1000) {
    return "comment must be at most 1000 characters";
  }

  const imagesValidation = validateReviewImages(body.images);
  if (imagesValidation) {
    return imagesValidation;
  }

  return null;
}

function validateReviewUploadBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!parsePositiveInteger(body.orderItemId)) {
    return "orderItemId must be a positive integer";
  }

  if (!body.fileName?.trim()) {
    return "fileName is required";
  }

  if (!body.contentType?.trim()) {
    return "contentType is required";
  }

  if (!isAllowedImageContentType(body.contentType)) {
    return "contentType must be one of image/jpeg, image/png, image/webp, image/gif";
  }

  return null;
}

function validateReviewImages(images) {
  if (images == null) {
    return null;
  }

  if (!Array.isArray(images)) {
    return "images must be an array";
  }

  if (images.length > 4) {
    return "images must contain at most 4 URLs";
  }

  for (const image of images) {
    if (!isValidImageUrl(image)) {
      return "Each review image must be a valid http or https URL";
    }
  }

  return null;
}

function normalizeReviewImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => String(image).trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeComment(value) {
  return value == null ? "" : String(value).trim();
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePaginationLimit(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 20;
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
