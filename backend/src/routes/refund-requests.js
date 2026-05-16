import { Router } from "express";
import { pool } from "../db/pool.js";
import {
  createRefundEvidenceUploadUrl,
  getR2Config,
  isAllowedImageContentType,
  isValidImageUrl,
} from "../r2.js";

const router = Router();

router.post("/uploads/presign", async (req, res) => {
  const config = getR2Config();
  if (!config) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "R2 upload is not configured",
      },
    });
  }

  const validationError = validateRefundUploadPresignPayload(req.body);
  if (validationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validationError,
      },
    });
  }

  const orderId = Number(req.body.orderId);
  const customerId = req.authCustomer.id;
  const fileName = req.body.fileName.trim();
  const contentType = req.body.contentType.trim().toLowerCase();

  try {
    const { rows } = await pool.query(
      `
        SELECT id
        FROM orders
        WHERE id = $1 AND customer_id = $2
        LIMIT 1
      `,
      [orderId, customerId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Order not found",
        },
      });
    }

    const upload = await createRefundEvidenceUploadUrl({
      customerId,
      orderId,
      fileName,
      contentType,
    });

    return res.status(201).json(upload);
  } catch (error) {
    console.error("POST /refund-requests/uploads/presign failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create upload URL",
      },
    });
  }
});

router.post("/", async (req, res) => {
  const validationError = validateRefundRequestPayload(req.body);
  if (validationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validationError,
      },
    });
  }

  const orderId = Number(req.body.orderId);
  const imageUrl = req.body.imageUrl?.trim() || null;
  const reason = req.body.reason.trim();
  const customerId = req.authCustomer.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        SELECT id, customer_id
        FROM orders
        WHERE id = $1 AND customer_id = $2
        LIMIT 1
      `,
      [orderId, customerId],
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Order not found",
        },
      });
    }

    const existingRequestResult = await client.query(
      `
        SELECT id
        FROM refund_requests
        WHERE order_id = $1
          AND customer_id = $2
          AND status IN ('pending', 'manual_review_required', 'approved')
        LIMIT 1
      `,
      [orderId, customerId],
    );

    if (existingRequestResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "A refund request is already active for this order",
        },
      });
    }

    const customerResult = await client.query(
      `
        SELECT abuse_score
        FROM customers
        WHERE id = $1
        LIMIT 1
      `,
      [customerId],
    );
    const abuseScore = Number(customerResult.rows[0]?.abuse_score ?? 0);
    const initialStatus =
      abuseScore > ABUSE_SCORE_MANUAL_REVIEW_THRESHOLD ? "manual_review_required" : "pending";

    const { rows } = await client.query(
      `
        INSERT INTO refund_requests (
          order_id,
          customer_id,
          image_url,
          reason,
          status,
          abuse_score_snapshot
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          order_id,
          customer_id,
          image_url,
          reason,
          status,
          abuse_score_snapshot,
          abuse_score_applied,
          review_note,
          created_at,
          updated_at
      `,
      [orderId, customerId, imageUrl, reason, initialStatus, abuseScore],
    );

    if (initialStatus === "manual_review_required") {
      await client.query(
        `
          INSERT INTO issues (
            order_id,
            type,
            severity,
            status,
            log_history
          )
          VALUES (
            $1,
            'ABUSE_RISK',
            'high',
            'open',
            jsonb_build_array(
              jsonb_build_object(
                'timestamp', NOW(),
                'message', $2::text
              )
            )
          )
        `,
        [orderId, `Refund request flagged for manual review. abuse_score=${abuseScore}`],
      );
    }

    await client.query("COMMIT");
    return res.status(201).json(mapRefundRequestRow(rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /refund-requests failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create refund request",
      },
    });
  } finally {
    client.release();
  }
});

export default router;

function validateRefundRequestPayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!Number.isInteger(body.orderId) || body.orderId <= 0) {
    return "orderId must be a positive integer";
  }

  if (body.imageUrl != null && body.imageUrl.trim() && !isValidImageUrl(body.imageUrl)) {
    return "imageUrl must be a valid http or https URL";
  }

  if (!body.reason?.trim()) {
    return "reason is required";
  }

  return null;
}

function validateRefundUploadPresignPayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!Number.isInteger(body.orderId) || body.orderId <= 0) {
    return "orderId must be a positive integer";
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

export function mapRefundRequestRow(row) {
  const mapped = {
    id: Number(row.id),
    orderId: Number(row.order_id),
    customerId: Number(row.customer_id),
    imageUrl: row.image_url,
    reason: row.reason,
    status: row.status,
    abuseScoreSnapshot: Number(row.abuse_score_snapshot),
    reviewNote: row.review_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.abuse_score_applied != null) {
    mapped.abuseScoreApplied = Boolean(row.abuse_score_applied);
  }

  if (row.order_total_amount != null) {
    mapped.orderAmount = Number(row.order_total_amount);
  }

  if (row.customer_email != null) {
    mapped.customerEmail = row.customer_email;
  }

  return mapped;
}

const ABUSE_SCORE_MANUAL_REVIEW_THRESHOLD = 3;
