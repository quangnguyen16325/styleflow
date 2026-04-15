import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const normalizedStatus = normalizeStatusFilter(req.query.status);
  if (req.query.status != null && !normalizedStatus) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid order status filter",
      },
    });
  }

  try {
    const params = [];
    let whereClause = "";
    if (normalizedStatus) {
      params.push(normalizedStatus);
      whereClause = ` WHERE o.status = $1`;
    }

    const { rows } = await pool.query(
      `${listOrdersBaseQuery}${whereClause} GROUP BY o.id, c.id ORDER BY o.created_at DESC`,
      params,
    );

    return res.json(rows.map(mapOrderRow));
  } catch (error) {
    console.error("GET /admin/orders failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch admin orders",
      },
    });
  }
});

router.get("/:id", async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Order id must be a positive integer",
      },
    });
  }

  try {
    const { rows } = await pool.query(
      `${listOrdersBaseQuery} WHERE o.id = $1 GROUP BY o.id, c.id ORDER BY o.created_at DESC`,
      [orderId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Order not found",
        },
      });
    }

    return res.json(mapOrderRow(rows[0]));
  } catch (error) {
    console.error(`GET /admin/orders/${orderId} failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch admin order",
      },
    });
  }
});

router.get("/:id/delivery-events", async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Order id must be a positive integer",
      },
    });
  }

  try {
    const orderResult = await pool.query(
      `
        SELECT id
        FROM orders
        WHERE id = $1
        LIMIT 1
      `,
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Order not found",
        },
      });
    }

    const { rows } = await pool.query(
      `
        SELECT
          id,
          order_id,
          partner,
          external_event_id,
          status,
          reason,
          payload,
          created_at
        FROM delivery_events
        WHERE order_id = $1
        ORDER BY created_at DESC, id DESC
      `,
      [orderId],
    );

    return res.json(
      rows.map((row) => ({
        id: Number(row.id),
        orderId: Number(row.order_id),
        partner: row.partner,
        externalEventId: row.external_event_id,
        status: row.status,
        reason: row.reason,
        payload: row.payload,
        createdAt: row.created_at,
      })),
    );
  } catch (error) {
    console.error(`GET /admin/orders/${orderId}/delivery-events failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch delivery events",
      },
    });
  }
});

router.patch("/:id/status", async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Order id must be a positive integer",
      },
    });
  }

  const nextStatus = normalizeStatusFilter(req.body?.status);
  if (!nextStatus) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "A valid order status is required",
      },
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const currentOrderResult = await client.query(
      `
        SELECT id, status
        FROM orders
        WHERE id = $1
      `,
      [orderId],
    );

    if (currentOrderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Order not found",
        },
      });
    }

    const previousStatus = currentOrderResult.rows[0].status;
    await client.query(
      `
        UPDATE orders
        SET
          status = $2,
          updated_at = NOW()
        WHERE id = $1
      `,
      [orderId, nextStatus],
    );

    if (previousStatus !== "failed" && nextStatus === "failed") {
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
            'ORDER_FAILED',
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
        [orderId, `Order status changed from ${previousStatus} to failed`],
      );
    }

    await client.query("COMMIT");

    const { rows } = await pool.query(
      `${listOrdersBaseQuery} WHERE o.id = $1 GROUP BY o.id, c.id ORDER BY o.created_at DESC`,
      [orderId],
    );

    return res.json(mapOrderRow(rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`PATCH /admin/orders/${orderId}/status failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update admin order status",
      },
    });
  } finally {
    client.release();
  }
});

router.post("/:id/address-change-decision", async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Order id must be a positive integer",
      },
    });
  }

  const decision = normalizeAddressChangeDecision(req.body?.decision);
  if (!decision) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "A valid address change decision is required",
      },
    });
  }

  if (
    req.body?.approvedShippingFee != null &&
    (Number.isNaN(Number(req.body.approvedShippingFee)) || Number(req.body.approvedShippingFee) < 0)
  ) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "approvedShippingFee must be a non-negative number",
      },
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        SELECT
          id,
          address_change_status,
          address_change_payload,
          shipping_fee
        FROM orders
        WHERE id = $1
        LIMIT 1
      `,
      [orderId],
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

    const orderRow = orderResult.rows[0];
    if (orderRow.address_change_status !== "requested") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "Order does not have a pending address change request",
        },
      });
    }

    if (decision === "approved") {
      const payload = orderRow.address_change_payload;
      if (!payload || typeof payload !== "object") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: {
            code: "CONFLICT",
            message: "Pending address change payload is missing",
          },
        });
      }

      const approvedShippingFee =
        req.body?.approvedShippingFee == null
          ? Number(payload.requestedShippingFee ?? orderRow.shipping_fee)
          : Number(req.body.approvedShippingFee);

      await client.query(
        `
          UPDATE orders
          SET
            customer_address_id = $2,
            shipping_receiver_name = $3,
            shipping_receiver_phone = $4,
            shipping_address_line = $5,
            shipping_ward = $6,
            shipping_district = $7,
            shipping_address = $8,
            city = $9,
            shipping_country = $10,
            shipping_postal_code = $11,
            shipping_fee = $12,
            address_change_status = 'approved',
            address_change_payload = NULL,
            address_change_fee_delta = NULL,
            shipping_fee_approved = TRUE,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          orderId,
          payload.customerAddressId,
          payload.receiverName,
          payload.receiverPhone,
          payload.addressLine,
          payload.ward,
          payload.district,
          payload.fullAddress,
          payload.city,
          payload.country,
          payload.postalCode,
          approvedShippingFee,
        ],
      );

      await client.query("COMMIT");
      return res.json({ success: true, action: "approved" });
    }

    await client.query(
      `
        UPDATE orders
        SET
          address_change_status = $2,
          address_change_payload = NULL,
          address_change_fee_delta = NULL,
          shipping_fee_approved = FALSE,
          updated_at = NOW()
        WHERE id = $1
      `,
      [orderId, decision],
    );

    await client.query("COMMIT");
    return res.json({ success: true, action: decision });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`POST /admin/orders/${orderId}/address-change-decision failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to process address change decision",
      },
    });
  } finally {
    client.release();
  }
});

export default router;

const listOrdersBaseQuery = `
  SELECT
    o.id,
    o.status,
    o.total_amount,
    o.shipping_fee,
    o.payment_expires_at,
    o.fail_count,
    o.customer_address_id,
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
    COALESCE(
      json_agg(
        json_build_object(
          'id', oi.id,
          'productId', oi.product_id,
          'quantity', oi.quantity,
          'priceAtPurchase', oi.price_at_purchase
        )
        ORDER BY oi.id
      ) FILTER (WHERE oi.id IS NOT NULL),
      '[]'::json
    ) AS items
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN order_items oi ON oi.order_id = o.id
`;

function normalizeStatusFilter(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  return ORDER_STATUSES.includes(normalizedValue) ? normalizedValue : null;
}

function normalizeAddressChangeDecision(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  return ADDRESS_CHANGE_DECISIONS.includes(normalizedValue) ? normalizedValue : null;
}

function mapOrderRow(row) {
  return {
    id: Number(row.id),
    status: row.status,
    totalAmount: Number(row.total_amount),
    shippingFee: Number(row.shipping_fee),
    paymentExpiresAt: row.payment_expires_at,
    failCount: row.fail_count,
    customerAddressId: row.customer_address_id == null ? null : Number(row.customer_address_id),
    shippingAddress: row.shipping_address,
    city: row.city,
    shipping: mapShippingRow(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: {
      id: Number(row.customer_id),
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
    },
    items: row.items.map(mapOrderItemRow),
  };
}

function mapOrderItemRow(item) {
  return {
    id: Number(item.id),
    productId: Number(item.productId ?? item.product_id),
    quantity: Number(item.quantity),
    priceAtPurchase: Number(item.priceAtPurchase ?? item.price_at_purchase),
  };
}

function mapShippingRow(row) {
  return {
    receiverName: row.shipping_receiver_name,
    receiverPhone: row.shipping_receiver_phone,
    addressLine: row.shipping_address_line,
    ward: row.shipping_ward,
    district: row.shipping_district,
    city: row.city,
    country: row.shipping_country,
    postalCode: row.shipping_postal_code,
    fullAddress: row.shipping_address,
  };
}

const ORDER_STATUSES = [
  "pending",
  "awaiting_payment",
  "paid",
  "processing",
  "shipping",
  "completed",
  "cancelled",
  "failed",
];

const ADDRESS_CHANGE_DECISIONS = ["approved", "rejected", "rejected_timeout"];
