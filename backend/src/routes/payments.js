import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.post("/payment-events", async (req, res) => {
  const payloadError = validatePaymentEventPayload(req.body);
  if (payloadError) {
    return res.status(400).json(validationError(payloadError));
  }

  const event = normalizePaymentEvent(req.body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let orderExists = false;
    if (event.orderId != null) {
      const { rows } = await client.query(
        `
          SELECT id
          FROM orders
          WHERE id = $1
          LIMIT 1
        `,
        [event.orderId],
      );

      if (rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json(notFoundError("Order not found"));
      }

      orderExists = true;
    }

    const insertedLogResult = await client.query(
      `
        INSERT INTO payment_logs (
          order_id,
          incident_id,
          external_event_id,
          gateway_name,
          transaction_ref,
          source,
          http_status,
          error_code,
          payment_status,
          raw_response
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
        ON CONFLICT (external_event_id) DO NOTHING
        RETURNING id
      `,
      [
        event.orderId,
        event.incidentId,
        event.externalEventId,
        event.gateway,
        event.transactionRef,
        event.source,
        event.httpStatus,
        event.errorCode,
        event.paymentStatus,
        JSON.stringify(req.body),
      ],
    );

    if (event.externalEventId && insertedLogResult.rows.length === 0) {
      await client.query("COMMIT");
      return res.json({
        status: inferOutageStatus(event),
        action: "duplicate_ignored",
        paymentStatus: inferPaymentStatus(event),
      });
    }

    if (orderExists) {
      const nextPaymentStatus = inferPaymentStatus(event);
      await client.query(
        `
          UPDATE orders
          SET
            payment_gateway = COALESCE($2, payment_gateway),
            transaction_ref = COALESCE($3, transaction_ref),
            incident_id = COALESCE($4, incident_id),
            payment_status = COALESCE($5, payment_status),
            updated_at = NOW()
          WHERE id = $1
        `,
        [event.orderId, event.gateway, event.transactionRef, event.incidentId, nextPaymentStatus],
      );

      if (nextPaymentStatus === "payment_failed") {
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
              'PAYMENT_ERROR',
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
          [
            event.orderId,
            `Payment event detected from ${event.source} on ${event.gateway}: ${event.errorCode ?? "UNKNOWN"}`,
          ],
        );
      }
    }

    await client.query("COMMIT");
    return res.json({
      status: inferOutageStatus(event),
      action: "logged",
      paymentStatus: inferPaymentStatus(event),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /payment-events failed:", error);
    return res.status(500).json(internalError("Failed to process payment event"));
  } finally {
    client.release();
  }
});

export default router;

function validatePaymentEventPayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!["payment_service", "app_client", "schedule"].includes(body.source)) {
    return "source is invalid";
  }

  if (!String(body.gateway ?? "").trim()) {
    return "gateway is required";
  }

  if (body.orderId != null && (!Number.isInteger(body.orderId) || body.orderId <= 0)) {
    return "orderId must be a positive integer";
  }

  return null;
}

function normalizePaymentEvent(body) {
  return {
    source: body.source,
    gateway: String(body.gateway).trim().toUpperCase(),
    httpStatus: Number.isInteger(body.httpStatus) ? body.httpStatus : null,
    errorCode: String(body.errorCode ?? body.error ?? "").trim() || null,
    orderId: body.orderId ?? null,
    transactionRef: String(body.transactionRef ?? "").trim() || null,
    incidentId: String(body.incidentId ?? "").trim() || null,
    externalEventId: String(body.externalEventId ?? "").trim() || null,
    paymentStatus:
      String(body.paymentStatus ?? "")
        .trim()
        .toLowerCase() || null,
  };
}

function inferPaymentStatus(event) {
  if (event.paymentStatus) {
    return event.paymentStatus;
  }

  if (event.source === "payment_service" && [502, 503, 504].includes(event.httpStatus)) {
    return "payment_unknown";
  }

  if (
    event.errorCode &&
    /TIMEOUT|UNAVAILABLE|NETWORK|FAILED|DECLINED|REJECTED/i.test(event.errorCode)
  ) {
    return event.source === "app_client" ? "payment_unknown" : "payment_failed";
  }

  return null;
}

function inferOutageStatus(event) {
  if (event.source === "payment_service" && [502, 503, 504].includes(event.httpStatus)) {
    return "outage_suspected";
  }

  if (event.source === "schedule") {
    return "schedule_logged";
  }

  return "event_logged";
}

function validationError(message) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  };
}

function notFoundError(message) {
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
