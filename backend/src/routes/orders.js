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
    const whereClause = normalizedStatus ? " WHERE o.status = $1" : "";
    const params = normalizedStatus ? [normalizedStatus] : [];
    const { rows } = await pool.query(
      `${listOrdersBaseQuery}${whereClause} GROUP BY o.id, c.id ORDER BY o.created_at DESC`,
      params,
    );

    res.json(rows.map(mapOrderRow));
  } catch (error) {
    console.error("GET /orders failed:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch orders",
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
    console.error(`GET /orders/${orderId} failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch order",
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
        RETURNING id
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
    console.error(`PATCH /orders/${orderId}/status failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update order status",
      },
    });
  } finally {
    client.release();
  }
});

router.post("/", async (req, res) => {
  const validationError = validateOrderPayload(req.body);
  if (validationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validationError,
      },
    });
  }

  const { customer, shippingAddress, city, items } = req.body;
  const shippingFee = Number(req.body.shippingFee ?? 0);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customerResult = await client.query(
      `
        INSERT INTO customers (full_name, phone, email)
        VALUES ($1, $2, $3)
        ON CONFLICT (phone) DO UPDATE
        SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          updated_at = NOW()
        RETURNING id, full_name, phone, email
      `,
      [customer.fullName.trim(), customer.phone.trim(), customer.email.trim().toLowerCase()],
    );
    const customerRow = customerResult.rows[0];

    const productIds = items.map((item) => item.productId);
    const productResult = await client.query(
      `
        SELECT
          p.id,
          i.id AS inventory_id,
          p.base_price,
          COALESCE(i.stock_qty, 0) AS stock_qty,
          COALESCE(i.reserved_qty, 0) AS reserved_qty
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.id = ANY($1::bigint[])
      `,
      [productIds],
    );

    const productMap = new Map(productResult.rows.map((row) => [Number(row.id), row]));
    let subtotal = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new ValidationError(`Product ${item.productId} not found`);
      }

      const availableQty = Number(product.stock_qty) - Number(product.reserved_qty);
      if (item.quantity > availableQty) {
        throw new ValidationError(`Insufficient stock for product ${item.productId}`);
      }

      subtotal += Number(product.base_price) * item.quantity;
    }

    const totalAmount = subtotal + shippingFee;
    const orderResult = await client.query(
      `
        INSERT INTO orders (
          customer_id,
          status,
          total_amount,
          shipping_fee,
          shipping_address,
          city,
          payment_expires_at
        )
        VALUES ($1, 'pending', $2, $3, $4, $5, NOW() + INTERVAL '24 hours')
        RETURNING *
      `,
      [customerRow.id, totalAmount, shippingFee, shippingAddress.trim(), city.trim()],
    );
    const orderRow = orderResult.rows[0];

    const orderItems = [];
    for (const item of items) {
      const product = productMap.get(item.productId);
      const priceAtPurchase = Number(product.base_price);

      const orderItemResult = await client.query(
        `
          INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
          VALUES ($1, $2, $3, $4)
          RETURNING id, product_id, quantity, price_at_purchase
        `,
        [orderRow.id, item.productId, item.quantity, priceAtPurchase],
      );
      orderItems.push(orderItemResult.rows[0]);

      await client.query(
        `
          UPDATE inventory
          SET
            reserved_qty = reserved_qty + $1,
            updated_at = NOW()
          WHERE product_id = $2
        `,
        [item.quantity, item.productId],
      );

      await client.query(
        `
          INSERT INTO inventory_transactions (
            inventory_id,
            change_amount,
            type,
            order_id,
            created_by,
            reference_id
          )
          VALUES ($1, $2, 'RESERVE', $3, 'SYSTEM', $4)
        `,
        [product.inventory_id, -item.quantity, orderRow.id, `ORDER_${orderRow.id}`],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      id: orderRow.id,
      status: orderRow.status,
      totalAmount: Number(orderRow.total_amount),
      shippingFee: Number(orderRow.shipping_fee),
      paymentExpiresAt: orderRow.payment_expires_at,
      failCount: orderRow.fail_count,
      shippingAddress: orderRow.shipping_address,
      city: orderRow.city,
      createdAt: orderRow.created_at,
      updatedAt: orderRow.updated_at,
      customer: {
        id: customerRow.id,
        fullName: customerRow.full_name,
        phone: customerRow.phone,
        email: customerRow.email,
      },
      items: orderItems.map(mapOrderItemRow),
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
        },
      });
    }

    console.error("POST /orders failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create order",
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
    o.shipping_address,
    o.city,
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

function validateOrderPayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!body.customer || typeof body.customer !== "object") {
    return "Customer information is required";
  }

  if (!body.customer.fullName?.trim()) {
    return "Customer fullName is required";
  }

  if (!body.customer.phone?.trim()) {
    return "Customer phone is required";
  }

  if (!body.customer.email?.trim()) {
    return "Customer email is required";
  }

  if (!body.shippingAddress?.trim()) {
    return "Shipping address is required";
  }

  if (!body.city?.trim()) {
    return "City is required";
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return "Items must not be empty";
  }

  for (const item of body.items) {
    if (!Number.isInteger(item.productId) || item.productId <= 0) {
      return "Each item must have a valid productId";
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return "Each item must have a quantity greater than 0";
    }
  }

  if (
    body.shippingFee != null &&
    (Number.isNaN(Number(body.shippingFee)) || Number(body.shippingFee) < 0)
  ) {
    return "Shipping fee must be a non-negative number";
  }

  return null;
}

function mapOrderRow(row) {
  return {
    id: row.id,
    status: row.status,
    totalAmount: Number(row.total_amount),
    shippingFee: Number(row.shipping_fee),
    paymentExpiresAt: row.payment_expires_at,
    failCount: row.fail_count,
    shippingAddress: row.shipping_address,
    city: row.city,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: {
      id: row.customer_id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
    },
    items: row.items.map(mapOrderItemRow),
  };
}

function normalizeStatusFilter(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  return ORDER_STATUSES.includes(normalizedValue) ? normalizedValue : null;
}

function mapOrderItemRow(item) {
  return {
    id: item.id,
    productId: item.productId ?? item.product_id,
    quantity: Number(item.quantity),
    priceAtPurchase: Number(item.priceAtPurchase ?? item.price_at_purchase),
  };
}

class ValidationError extends Error {}

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
