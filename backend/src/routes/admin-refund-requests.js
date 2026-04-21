import { Router } from "express";
import { pool } from "../db/pool.js";
import { mapRefundRequestRow } from "./refund-requests.js";

const router = Router();

router.get("/", async (req, res) => {
  const status = normalizeRefundStatus(req.query.status);
  if (req.query.status != null && !status) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid refund request status filter",
      },
    });
  }

  try {
    const params = [];
    let whereClause = "";
    if (status) {
      params.push(status);
      whereClause = "WHERE rr.status = $1";
    }

    const { rows } = await pool.query(
      `
        SELECT
          rr.id,
          rr.order_id,
          rr.customer_id,
          rr.image_url,
          rr.reason,
          rr.status,
          rr.abuse_score_snapshot,
          rr.review_note,
          rr.created_at,
          rr.updated_at
        FROM refund_requests rr
        ${whereClause}
        ORDER BY rr.created_at DESC, rr.id DESC
      `,
      params,
    );

    return res.json(rows.map(mapRefundRequestRow));
  } catch (error) {
    console.error("GET /admin/refund-requests failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch refund requests",
      },
    });
  }
});

router.get("/:id", async (req, res) => {
  const refundRequestId = parsePositiveInteger(req.params.id);
  if (!refundRequestId) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Refund request id must be a positive integer",
      },
    });
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT
          rr.id,
          rr.order_id,
          rr.customer_id,
          o.total_amount AS order_total_amount,
          c.email AS customer_email,
          rr.image_url,
          rr.reason,
          rr.status,
          rr.abuse_score_snapshot,
          rr.review_note,
          rr.created_at,
          rr.updated_at
        FROM refund_requests rr
        JOIN orders o ON o.id = rr.order_id
        JOIN customers c ON c.id = rr.customer_id
        WHERE rr.id = $1
        LIMIT 1
      `,
      [refundRequestId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Refund request not found",
        },
      });
    }

    return res.json(mapRefundRequestRow(rows[0]));
  } catch (error) {
    console.error(`GET /admin/refund-requests/${refundRequestId} failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch refund request",
      },
    });
  }
});

router.patch("/:id/status", async (req, res) => {
  const refundRequestId = parsePositiveInteger(req.params.id);
  if (!refundRequestId) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Refund request id must be a positive integer",
      },
    });
  }

  const nextStatus = normalizeRefundStatus(req.body?.status);
  if (!nextStatus) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "A valid refund request status is required",
      },
    });
  }

  const reviewNote =
    req.body?.reviewNote == null ? null : String(req.body.reviewNote).trim() || null;

  try {
    const { rows } = await pool.query(
      `
        UPDATE refund_requests
        SET
          status = $2,
          review_note = $3,
          updated_at = NOW()
        WHERE id = $1
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
      [refundRequestId, nextStatus, reviewNote],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Refund request not found",
        },
      });
    }

    return res.json(mapRefundRequestRow(rows[0]));
  } catch (error) {
    console.error(`PATCH /admin/refund-requests/${refundRequestId}/status failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update refund request status",
      },
    });
  }
});

export default router;

function normalizeRefundStatus(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return REFUND_REQUEST_STATUSES.includes(normalized) ? normalized : null;
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

const REFUND_REQUEST_STATUSES = [
  "pending",
  "manual_review_required",
  "approved",
  "rejected",
  "refunded",
];
