import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

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
  const imageUrl = req.body.imageUrl.trim();
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

  if (!body.imageUrl?.trim()) {
    return "imageUrl is required";
  }

  if (!body.reason?.trim()) {
    return "reason is required";
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

  if (row.order_total_amount != null) {
    mapped.orderAmount = Number(row.order_total_amount);
  }

  if (row.customer_email != null) {
    mapped.customerEmail = row.customer_email;
  }

  return mapped;
}

const ABUSE_SCORE_MANUAL_REVIEW_THRESHOLD = 3;
