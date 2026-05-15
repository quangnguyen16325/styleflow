import { Router } from "express";
import { pool } from "../db/pool.js";
import { applyOrderLifecycleTransition, applyOrderReturn } from "./order-lifecycle.js";

const router = Router();

router.post("/delivery-callback", async (req, res) => {
  const secretError = validateInternalWebhookSecret(req);
  if (secretError) {
    return res.status(secretError.status).json(secretError.body);
  }

  const payloadError = validateDeliveryPayload(req.body);
  if (payloadError) {
    return res.status(400).json(validationError(payloadError));
  }

  const { orderId, status, reason, partner, externalEventId } = normalizeDeliveryPayload(req.body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await applyDeliveryStatusUpdate(client, {
      orderId,
      status,
      reason,
      partner,
      externalEventId,
      payload: req.body,
    });

    await client.query("COMMIT");
    return res.json({
      success: true,
      action: result.action,
      failCount: result.failCount,
      customerEmail: result.customerEmail,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof DeliveryNotFoundError) {
      return res.status(404).json(notFoundError("Order not found"));
    }

    console.error("POST /delivery-callback failed:", error);
    return res.status(500).json(internalError("Failed to process delivery callback"));
  } finally {
    client.release();
  }
});

export default router;

export class DeliveryNotFoundError extends Error {}

export async function applyDeliveryStatusUpdate(
  client,
  { orderId, status, reason = null, partner = null, externalEventId = null, payload = {} },
) {
  const orderResult = await client.query(
    `
      SELECT
        o.id,
        o.status,
        o.payment_status,
        o.payment_gateway,
        o.delivery_fail_count,
        o.delivery_status,
        latest_rr.status AS latest_refund_request_status,
        c.email AS customer_email
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN LATERAL (
        SELECT rr.status
        FROM refund_requests rr
        WHERE rr.order_id = o.id
        ORDER BY rr.created_at DESC, rr.id DESC
        LIMIT 1
      ) latest_rr ON TRUE
      WHERE o.id = $1
      LIMIT 1
    `,
    [orderId],
  );

  if (orderResult.rows.length === 0) {
    throw new DeliveryNotFoundError("Order not found");
  }

  const order = orderResult.rows[0];
  if (isDeliveryUpdateIgnored(order, status)) {
    return {
      action: "terminal_ignored",
      failCount: Number(order.delivery_fail_count),
      customerEmail: order.customer_email,
    };
  }

  const deliveryEventResult = await client.query(
    `
      INSERT INTO delivery_events (
        order_id,
        partner,
        external_event_id,
        status,
        reason,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT (external_event_id) DO NOTHING
      RETURNING id
    `,
    [orderId, partner, externalEventId, status, reason, JSON.stringify(payload)],
  );

  if (externalEventId && deliveryEventResult.rows.length === 0) {
    return {
      action: "duplicate_ignored",
      failCount: Number(order.delivery_fail_count),
      customerEmail: order.customer_email,
    };
  }

  let action = "updated";
  let failCount = Number(order.delivery_fail_count);
  if (status === "DELIVERED") {
    await client.query(
      `
        UPDATE orders
        SET
          status = 'completed',
          delivery_status = 'delivered',
          delivery_partner = COALESCE($2, delivery_partner),
          delivery_fail_count = 0,
          last_delivery_failed_reason = NULL,
          payment_status = CASE
            WHEN payment_gateway = 'COD' THEN 'paid'
            ELSE payment_status
          END,
          updated_at = NOW()
        WHERE id = $1
      `,
      [orderId, partner],
    );

    if (order.payment_gateway === "COD" && order.payment_status !== "paid") {
      await client.query(
        `
          INSERT INTO payment_logs (
            order_id,
            external_event_id,
            gateway_name,
            source,
            payment_status,
            raw_response
          )
          VALUES ($1, $2, 'COD', 'delivery_callback', 'paid', $3::jsonb)
          ON CONFLICT (external_event_id) DO NOTHING
        `,
        [
          orderId,
          `cod-delivered-${orderId}`,
          JSON.stringify({
            orderId,
            status,
            partner,
            reason,
            source: "delivery_callback",
          }),
        ],
      );
    }

    await applyOrderLifecycleTransition(client, orderId, order.status, "completed");
    action = "delivered";
    failCount = 0;
  } else if (status === "FAILED" && isApprovedReturnFlow(order)) {
    await client.query(
      `
        UPDATE orders
        SET
          delivery_partner = COALESCE($2, delivery_partner),
          last_delivery_failed_reason = $3,
          updated_at = NOW()
        WHERE id = $1
      `,
      [orderId, partner, reason],
    );
    action = "return_pickup_failed";
    failCount = Number(order.delivery_fail_count);
  } else if (status === "RETURNED") {
    if (order.status === "completed" && order.delivery_status !== "returned") {
      await applyOrderReturn(client, orderId);
    }

    await client.query(
      `
        UPDATE orders
        SET
          status = CASE WHEN status = 'completed' THEN 'failed' ELSE status END,
          delivery_status = 'returned',
          delivery_partner = COALESCE($2, delivery_partner),
          updated_at = NOW()
        WHERE id = $1
      `,
      [orderId, partner],
    );
    action = "returned";
    failCount = Number(order.delivery_fail_count);
  } else if (status === "FAILED") {
    const nextFailCount = Number(order.delivery_fail_count) + 1;
    const nextDeliveryStatus = nextFailCount >= 3 ? "returning" : "retry_pending";
    const nextOrderStatus = nextFailCount >= 3 ? "failed" : order.status;

    await client.query(
      `
        UPDATE orders
        SET
          status = $2,
          delivery_status = $3,
          delivery_partner = COALESCE($4, delivery_partner),
          delivery_fail_count = $5,
          last_delivery_failed_reason = $6,
          updated_at = NOW()
        WHERE id = $1
      `,
      [orderId, nextOrderStatus, nextDeliveryStatus, partner, nextFailCount, reason],
    );

    await applyOrderLifecycleTransition(client, orderId, order.status, nextOrderStatus);

    if (nextFailCount >= 3) {
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
            'DELIVERY_FAILED',
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
        [orderId, `Delivery failed ${nextFailCount} times. Reason: ${reason}`],
      );
    }

    action = nextFailCount >= 3 ? "returning" : "retry_pending";
    failCount = nextFailCount;
  } else {
    const nextDeliveryStatus = mapCallbackStatusToDeliveryStatus(status);
    const nextOrderStatus =
      ["handover", "in_transit"].includes(nextDeliveryStatus) &&
      ["pending", "processing"].includes(order.status)
        ? "shipping"
        : order.status;

    await client.query(
      `
        UPDATE orders
        SET
          status = $2,
          delivery_status = $3,
          delivery_partner = COALESCE($4, delivery_partner),
          updated_at = NOW()
        WHERE id = $1
      `,
      [orderId, nextOrderStatus, nextDeliveryStatus, partner],
    );
    failCount = Number(order.delivery_fail_count);
  }

  return {
    action,
    failCount,
    customerEmail: order.customer_email,
  };
}

function isDeliveryUpdateIgnored(order, nextCallbackStatus) {
  const currentDeliveryStatus = String(order.delivery_status || "").toLowerCase();
  const currentOrderStatus = String(order.status || "").toLowerCase();
  const latestRefundStatus = String(order.latest_refund_request_status || "").toLowerCase();

  if (currentDeliveryStatus === "returned") {
    return true;
  }

  if (currentDeliveryStatus === "returning" && nextCallbackStatus !== "RETURNED") {
    return true;
  }

  if (
    (currentOrderStatus === "completed" || currentDeliveryStatus === "delivered") &&
    !(
      latestRefundStatus === "approved" &&
      ["HANDOVER", "FAILED", "RETURNED"].includes(nextCallbackStatus)
    )
  ) {
    return true;
  }

  return false;
}

function isApprovedReturnFlow(order) {
  const currentOrderStatus = String(order.status || "").toLowerCase();
  const latestRefundStatus = String(order.latest_refund_request_status || "").toLowerCase();

  return currentOrderStatus === "completed" && latestRefundStatus === "approved";
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

function validateDeliveryPayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!Number.isInteger(body.orderId) || body.orderId <= 0) {
    return "orderId must be a positive integer";
  }

  const status = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
  if (
    !["FAILED", "DELIVERED", "IN_TRANSIT", "READY_TO_SHIP", "HANDOVER", "RETURNED"].includes(status)
  ) {
    return "status is invalid";
  }

  if (status === "FAILED" && !String(body.reason ?? "").trim()) {
    return "reason is required when status is FAILED";
  }

  return null;
}

function normalizeDeliveryPayload(body) {
  return {
    orderId: body.orderId,
    status: body.status.trim().toUpperCase(),
    reason: String(body.reason ?? "").trim() || null,
    partner: String(body.partner ?? "").trim() || null,
    externalEventId: String(body.externalEventId ?? "").trim() || null,
  };
}

function mapCallbackStatusToDeliveryStatus(status) {
  switch (status) {
    case "DELIVERED":
      return "delivered";
    case "FAILED":
      return "delivery_failed";
    case "IN_TRANSIT":
      return "in_transit";
    case "READY_TO_SHIP":
      return "ready_to_ship";
    case "HANDOVER":
      return "handover";
    case "RETURNED":
      return "returned";
    default:
      return "pending";
  }
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

function unauthorizedError(message) {
  return {
    error: {
      code: "UNAUTHORIZED",
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
