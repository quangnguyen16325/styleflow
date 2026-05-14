import { Router } from "express";
import { pool } from "../db/pool.js";
import { applyOrderLifecycleTransition } from "./order-lifecycle.js";
import { parseMomoOrderId, verifyMomoIpnSignature } from "../lib/momo.js";

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

    let currentOrderStatus = null;
    if (event.orderId != null) {
      const { rows } = await client.query(
        `
          SELECT id, status
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

      currentOrderStatus = rows[0].status;
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

    if (currentOrderStatus) {
      const nextPaymentStatus = inferPaymentStatus(event);
      const nextOrderStatus = deriveOrderStatusFromPayment(nextPaymentStatus, currentOrderStatus);
      await client.query(
        `
          UPDATE orders
          SET
            payment_gateway = COALESCE($2, payment_gateway),
            transaction_ref = COALESCE($3, transaction_ref),
            incident_id = COALESCE($4, incident_id),
            payment_status = COALESCE($5, payment_status),
            status = COALESCE($6, status),
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          event.orderId,
          event.gateway,
          event.transactionRef,
          event.incidentId,
          nextPaymentStatus,
          nextOrderStatus,
        ],
      );

      if (nextOrderStatus && nextOrderStatus !== currentOrderStatus) {
        await applyOrderLifecycleTransition(
          client,
          event.orderId,
          currentOrderStatus,
          nextOrderStatus,
        );
      }

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

router.post("/payments/momo/ipn", async (req, res) => {
  if (!verifyMomoIpnSignature(req.body)) {
    console.warn("POST /payments/momo/ipn invalid signature:", req.body?.orderId);
    return res.status(400).json(validationError("Invalid MoMo signature"));
  }

  const orderId = parseMomoOrderId(req.body.orderId);
  if (!orderId) {
    return res.status(400).json(validationError("Invalid MoMo orderId"));
  }

  const momoAmount = Math.round(Number(req.body.amount));
  if (!Number.isInteger(momoAmount) || momoAmount <= 0) {
    return res.status(400).json(validationError("Invalid MoMo amount"));
  }

  const resultCode = Number(req.body.resultCode);
  const nextPaymentStatus =
    resultCode === 0 ? "paid" : resultCode === 9000 ? "paid_held" : "payment_failed";
  const externalEventId = `momo-ipn-${req.body.requestId || orderId}-${req.body.transId || resultCode}`;
  const transactionRef = req.body.transId
    ? String(req.body.transId)
    : String(req.body.requestId || "");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
        SELECT id, status, payment_status, total_amount
        FROM orders
        WHERE id = $1 AND payment_gateway = 'MOMO'
        FOR UPDATE
      `,
      [orderId],
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json(notFoundError("Order not found"));
    }

    const order = rows[0];
    const expectedAmount = Math.round(Number(order.total_amount));
    if (expectedAmount !== momoAmount) {
      await insertMomoPaymentLog(client, {
        orderId,
        externalEventId,
        transactionRef,
        paymentStatus: "payment_unknown",
        body: req.body,
        errorCode: "AMOUNT_MISMATCH",
      });
      await client.query(
        `
          UPDATE orders
          SET payment_status = 'payment_unknown', updated_at = NOW()
          WHERE id = $1
        `,
        [orderId],
      );
      await client.query("COMMIT");
      return res.status(400).json(validationError("MoMo amount does not match order total"));
    }

    const inserted = await insertMomoPaymentLog(client, {
      orderId,
      externalEventId,
      transactionRef,
      paymentStatus: nextPaymentStatus,
      body: req.body,
      errorCode: resultCode === 0 ? null : String(resultCode),
    });

    if (!inserted) {
      await client.query("COMMIT");
      return res.status(204).send();
    }

    const nextOrderStatus = deriveOrderStatusFromPayment(nextPaymentStatus, order.status);
    await client.query(
      `
        UPDATE orders
        SET
          transaction_ref = COALESCE($2, transaction_ref),
          payment_status = $3,
          status = COALESCE($4, status),
          updated_at = NOW()
        WHERE id = $1
      `,
      [orderId, transactionRef || null, nextPaymentStatus, nextOrderStatus],
    );

    if (nextOrderStatus && nextOrderStatus !== order.status) {
      await applyOrderLifecycleTransition(client, orderId, order.status, nextOrderStatus);
    }

    await client.query("COMMIT");
    return res.status(204).send();
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /payments/momo/ipn failed:", error);
    return res.status(500).json(internalError("Failed to process MoMo IPN"));
  } finally {
    client.release();
  }
});

router.post("/payment-events/expire-pending", async (req, res) => {
  const secretError = validateInternalWebhookSecret(req);
  if (secretError) {
    return res.status(secretError.status).json(secretError.body);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const expiredOrdersResult = await client.query(
      `
        SELECT id, status, payment_gateway
        FROM orders
        WHERE
          payment_gateway IN ('BANK_TRANSFER', 'MOMO')
          AND payment_status = 'payment_pending'
          AND status = 'pending'
          AND payment_expires_at <= NOW()
        FOR UPDATE
      `,
    );

    const expiredOrders = expiredOrdersResult.rows;
    for (const order of expiredOrders) {
      await client.query(
        `
          UPDATE orders
          SET
            status = 'failed',
            payment_status = 'payment_failed',
            updated_at = NOW()
          WHERE id = $1
        `,
        [order.id],
      );

      await applyOrderLifecycleTransition(client, Number(order.id), order.status, "failed");

      await client.query(
        `
          INSERT INTO payment_logs (
            order_id,
            external_event_id,
            gateway_name,
            source,
            error_code,
            payment_status,
            raw_response
          )
          VALUES ($1, $2, $3, 'schedule', 'PAYMENT_EXPIRED', 'payment_failed', $4::jsonb)
          ON CONFLICT (external_event_id) DO NOTHING
        `,
        [
          order.id,
          `${String(order.payment_gateway).toLowerCase()}-expired-${order.id}`,
          order.payment_gateway,
          JSON.stringify({
            orderId: Number(order.id),
            reason: `${order.payment_gateway} payment expired`,
          }),
        ],
      );
    }

    await client.query("COMMIT");
    return res.json({
      success: true,
      expiredCount: expiredOrders.length,
      orderIds: expiredOrders.map((order) => Number(order.id)),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /payment-events/expire-pending failed:", error);
    return res.status(500).json(internalError("Failed to expire pending payments"));
  } finally {
    client.release();
  }
});

export default router;

async function insertMomoPaymentLog(client, options) {
  const result = await client.query(
    `
      INSERT INTO payment_logs (
        order_id,
        external_event_id,
        gateway_name,
        transaction_ref,
        source,
        error_code,
        payment_status,
        raw_response
      )
      VALUES ($1, $2, 'MOMO', $3, 'payment_service', $4, $5, $6::jsonb)
      ON CONFLICT (external_event_id) DO NOTHING
      RETURNING id
    `,
    [
      options.orderId,
      options.externalEventId,
      options.transactionRef || null,
      options.errorCode || null,
      options.paymentStatus,
      JSON.stringify(options.body),
    ],
  );

  return result.rows.length > 0;
}

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

function validateInternalWebhookSecret(req) {
  const configuredSecret = process.env.INTERNAL_WEBHOOK_SECRET?.trim();
  if (!configuredSecret) {
    return {
      status: 500,
      body: internalError("Missing INTERNAL_WEBHOOK_SECRET env"),
    };
  }

  const receivedSecret = req.get("X-Internal-Webhook-Secret")?.trim();
  if (!receivedSecret) {
    return {
      status: 401,
      body: unauthorizedError("X-Internal-Webhook-Secret header is required"),
    };
  }

  if (receivedSecret !== configuredSecret) {
    return {
      status: 401,
      body: unauthorizedError("Invalid internal webhook secret"),
    };
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

function deriveOrderStatusFromPayment(paymentStatus, currentStatus) {
  if (!paymentStatus || ["completed", "cancelled", "failed"].includes(currentStatus)) {
    return null;
  }

  if (paymentStatus === "paid") {
    return currentStatus === "pending" ? "processing" : null;
  }

  if (paymentStatus === "payment_failed") {
    return "failed";
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

function unauthorizedError(message) {
  return {
    error: {
      code: "UNAUTHORIZED",
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
