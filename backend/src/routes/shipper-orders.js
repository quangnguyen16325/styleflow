import { Router } from "express";
import { pool } from "../db/pool.js";
import { applyDeliveryStatusUpdate, DeliveryNotFoundError } from "./delivery.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${shipperOrdersBaseQuery}
       WHERE o.assigned_shipper_id = $1
       ${shipperOrdersGroupByClause}
       ORDER BY o.updated_at DESC, o.created_at DESC`,
      [req.authCustomer.id],
    );

    return res.json(rows.map(mapShipperOrderRow));
  } catch (error) {
    console.error("GET /shipper/orders failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch shipper orders",
      },
    });
  }
});

router.get("/:id", async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json(validationError("Order id must be a positive integer"));
  }

  try {
    const { rows } = await pool.query(
      `${shipperOrdersBaseQuery}
       WHERE o.id = $1 AND o.assigned_shipper_id = $2
       ${shipperOrdersGroupByClause}
       ORDER BY o.updated_at DESC, o.created_at DESC`,
      [orderId, req.authCustomer.id],
    );

    if (rows.length === 0) {
      return res.status(404).json(notFoundError("Order not found"));
    }

    return res.json(mapShipperOrderRow(rows[0]));
  } catch (error) {
    console.error(`GET /shipper/orders/${orderId} failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch shipper order",
      },
    });
  }
});

router.post("/:id/delivery-status", async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json(validationError("Order id must be a positive integer"));
  }

  const status = normalizeDeliveryCallbackStatus(req.body?.status);
  if (!status) {
    return res.status(400).json(validationError("A valid delivery status is required"));
  }

  const reason = String(req.body?.reason ?? "").trim() || null;
  if (status === "FAILED" && !reason) {
    return res.status(400).json(validationError("reason is required when status is FAILED"));
  }

  const externalEventId =
    String(req.body?.externalEventId ?? "").trim() ||
    `shipper-${req.authCustomer.id}-${orderId}-${status.toLowerCase()}-${Date.now()}`;
  const partner = `shipper:${req.authCustomer.id}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const assignmentResult = await client.query(
      `
        SELECT id
        FROM orders
        WHERE id = $1 AND assigned_shipper_id = $2
        LIMIT 1
      `,
      [orderId, req.authCustomer.id],
    );

    if (assignmentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json(notFoundError("Order not found"));
    }

    const result = await applyDeliveryStatusUpdate(client, {
      orderId,
      status,
      reason,
      partner,
      externalEventId,
      payload: {
        orderId,
        status,
        reason,
        partner,
        externalEventId,
        source: "shipper",
      },
    });
    await client.query("COMMIT");

    const { rows } = await pool.query(
      `${shipperOrdersBaseQuery}
       WHERE o.id = $1 AND o.assigned_shipper_id = $2
       ${shipperOrdersGroupByClause}
       ORDER BY o.updated_at DESC, o.created_at DESC`,
      [orderId, req.authCustomer.id],
    );
    const updatedOrder = mapShipperOrderRow(rows[0]);

    if (status === "FAILED" && !["duplicate_ignored", "terminal_ignored"].includes(result.action)) {
      void notifyDeliveryCallbackWebhook({
        order: updatedOrder,
        status,
        reason,
        partner,
        externalEventId,
        action: result.action,
        failCount: result.failCount,
        shipper: req.authCustomer,
      }).catch((error) => {
        console.warn(`POST n8n delivery-callback failed for order ${orderId}:`, error);
      });
    }

    return res.json({
      success: true,
      action: result.action,
      failCount: result.failCount,
      order: updatedOrder,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof DeliveryNotFoundError) {
      return res.status(404).json(notFoundError("Order not found"));
    }

    console.error(`POST /shipper/orders/${orderId}/delivery-status failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update delivery status",
      },
    });
  } finally {
    client.release();
  }
});

export default router;

const shipperOrdersBaseQuery = `
  SELECT
    o.id,
    o.status,
    o.payment_status,
    o.payment_gateway,
    o.delivery_status,
    o.delivery_partner,
    o.delivery_fail_count,
    o.last_delivery_failed_reason,
    o.total_amount,
    o.shipping_fee,
    o.shipping_receiver_name,
    o.shipping_receiver_phone,
    o.shipping_address_line,
    o.shipping_ward,
    o.shipping_district,
    o.shipping_address,
    o.city,
    o.shipping_country,
    o.shipping_postal_code,
    o.created_at,
    o.updated_at,
    c.id AS customer_id,
    c.full_name,
    c.phone,
    c.email,
    latest_rr.id AS latest_refund_request_id,
    latest_rr.status AS latest_refund_request_status,
    COALESCE(
      json_agg(
        json_build_object(
          'id', oi.id,
          'productId', oi.product_id,
          'productName', p.name,
          'imageUrl', p.image_url,
          'quantity', oi.quantity,
          'priceAtPurchase', oi.price_at_purchase
        )
        ORDER BY oi.id
      ) FILTER (WHERE oi.id IS NOT NULL),
      '[]'::json
    ) AS items
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN LATERAL (
    SELECT rr.id, rr.status
    FROM refund_requests rr
    WHERE rr.order_id = o.id
    ORDER BY rr.created_at DESC, rr.id DESC
    LIMIT 1
  ) latest_rr ON TRUE
  LEFT JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN products p ON p.id = oi.product_id
`;

const shipperOrdersGroupByClause = `
  GROUP BY
    o.id,
    c.id,
    latest_rr.id,
    latest_rr.status
`;

function normalizeDeliveryCallbackStatus(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();
  return DELIVERY_CALLBACK_STATUSES.includes(normalizedValue) ? normalizedValue : null;
}

function mapShipperOrderRow(row) {
  return {
    id: Number(row.id),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentGateway: row.payment_gateway,
    deliveryStatus: row.delivery_status,
    deliveryPartner: row.delivery_partner,
    deliveryFailCount: row.delivery_fail_count,
    lastDeliveryFailedReason: row.last_delivery_failed_reason,
    latestRefundRequestStatus: row.latest_refund_request_status ?? null,
    latestRefundRequestId:
      row.latest_refund_request_id == null ? null : Number(row.latest_refund_request_id),
    totalAmount: Number(row.total_amount),
    shippingFee: Number(row.shipping_fee),
    shippingAddress: row.shipping_address,
    city: row.city,
    shipping: {
      receiverName: row.shipping_receiver_name,
      receiverPhone: row.shipping_receiver_phone,
      addressLine: row.shipping_address_line,
      ward: row.shipping_ward,
      district: row.shipping_district,
      city: row.city,
      country: row.shipping_country,
      postalCode: row.shipping_postal_code,
      fullAddress: row.shipping_address,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: {
      id: Number(row.customer_id),
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
    },
    items: row.items.map((item) => ({
      id: Number(item.id),
      productId: Number(item.productId ?? item.product_id),
      productName: item.productName ?? item.product_name ?? null,
      imageUrl: item.imageUrl ?? item.image_url ?? null,
      quantity: Number(item.quantity),
      priceAtPurchase: Number(item.priceAtPurchase ?? item.price_at_purchase),
    })),
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

function notFoundError(message) {
  return {
    error: {
      code: "NOT_FOUND",
      message,
    },
  };
}

async function notifyDeliveryCallbackWebhook({
  order,
  status,
  reason,
  partner,
  externalEventId,
  action,
  failCount,
  shipper,
}) {
  const webhookUrl =
    process.env.N8N_DELIVERY_CALLBACK_WEBHOOK_URL ||
    "https://n8n.ecloria.co.uk/webhook/delivery-callback";
  if (!webhookUrl) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: order.id,
        status,
        reason,
        partner,
        externalEventId,
        action,
        failCount,
        deliveryStatus: order.deliveryStatus,
        orderStatus: order.status,
        customerEmail: order.customer?.email ?? null,
        customerPhone: order.customer?.phone ?? null,
        shippingAddress: order.shipping?.fullAddress ?? null,
        shipperId: shipper.id,
        shipperName: shipper.fullName,
        shipperEmail: shipper.email,
        source: "shipper_portal",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`n8n webhook responded ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

const DELIVERY_CALLBACK_STATUSES = [
  "FAILED",
  "DELIVERED",
  "IN_TRANSIT",
  "READY_TO_SHIP",
  "HANDOVER",
  "RETURNED",
];
