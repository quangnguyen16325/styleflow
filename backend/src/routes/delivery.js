import { Router } from "express";
import { pool } from "../db/pool.js";
import { applyOrderLifecycleTransition, applyOrderReturn } from "./order-lifecycle.js";

const router = Router();

router.post("/delivery-callback", async (req, res) => {
  const payloadError = validateDeliveryPayload(req.body);
  if (payloadError) {
    return res.status(400).json(validationError(payloadError));
  }

  const { orderId, status, reason, partner, externalEventId } = normalizeDeliveryPayload(req.body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        SELECT id, status, delivery_fail_count, delivery_status
        FROM orders
        WHERE id = $1
        LIMIT 1
      `,
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json(notFoundError("Order not found"));
    }

    const order = orderResult.rows[0];
    await client.query(
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
      `,
      [orderId, partner, externalEventId, status, reason, JSON.stringify(req.body)],
    );

    let action = "updated";
    if (status === "DELIVERED") {
      await client.query(
        `
          UPDATE orders
          SET
            status = 'completed',
            delivery_status = 'delivered',
            updated_at = NOW()
          WHERE id = $1
        `,
        [orderId],
      );
      await applyOrderLifecycleTransition(client, orderId, order.status, "completed");
      action = "delivered";
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
              'MANUAL_REVIEW',
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
    } else {
      await client.query(
        `
          UPDATE orders
          SET
            delivery_status = $2,
            delivery_partner = COALESCE($3, delivery_partner),
            updated_at = NOW()
          WHERE id = $1
        `,
        [orderId, mapCallbackStatusToDeliveryStatus(status), partner],
      );
    }

    await client.query("COMMIT");
    return res.json({ success: true, action });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /delivery-callback failed:", error);
    return res.status(500).json(internalError("Failed to process delivery callback"));
  } finally {
    client.release();
  }
});

export default router;

function validateDeliveryPayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!Number.isInteger(body.orderId) || body.orderId <= 0) {
    return "orderId must be a positive integer";
  }

  const status = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
  if (!["FAILED", "DELIVERED", "IN_TRANSIT", "HANDOVER", "RETURNED"].includes(status)) {
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

function internalError(message) {
  return {
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  };
}
