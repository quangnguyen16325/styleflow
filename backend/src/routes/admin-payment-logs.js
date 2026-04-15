import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const filters = buildPaymentLogFilters(req.query);
  if (filters.error) {
    return res.status(400).json(validationError(filters.error));
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT
          id,
          order_id,
          incident_id,
          external_event_id,
          gateway_name,
          transaction_ref,
          source,
          http_status,
          error_code,
          payment_status,
          raw_response,
          created_at
        FROM payment_logs
        ${filters.whereClause}
        ORDER BY created_at DESC, id DESC
      `,
      filters.params,
    );

    return res.json(rows.map(mapPaymentLogRow));
  } catch (error) {
    console.error("GET /admin/payment-logs failed:", error);
    return res.status(500).json(internalError("Failed to fetch payment logs"));
  }
});

export default router;

function buildPaymentLogFilters(query) {
  const conditions = [];
  const params = [];

  if (query.gateway != null) {
    params.push(String(query.gateway).trim().toUpperCase());
    conditions.push(`gateway_name = $${params.length}`);
  }

  if (query.transactionRef != null) {
    params.push(String(query.transactionRef).trim());
    conditions.push(`transaction_ref = $${params.length}`);
  }

  if (query.incidentId != null) {
    params.push(String(query.incidentId).trim());
    conditions.push(`incident_id = $${params.length}`);
  }

  if (query.orderId != null) {
    const orderId = Number(query.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return { error: "orderId must be a positive integer" };
    }

    params.push(orderId);
    conditions.push(`order_id = $${params.length}`);
  }

  return {
    params,
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
  };
}

function mapPaymentLogRow(row) {
  return {
    id: Number(row.id),
    orderId: row.order_id == null ? null : Number(row.order_id),
    incidentId: row.incident_id,
    externalEventId: row.external_event_id,
    gatewayName: row.gateway_name,
    transactionRef: row.transaction_ref,
    source: row.source,
    httpStatus: row.http_status,
    errorCode: row.error_code,
    paymentStatus: row.payment_status,
    rawResponse: row.raw_response,
    createdAt: row.created_at,
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
