import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
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

router.post("/", requireAuth, async (req, res) => {
  const validationError = validateOrderPayload(req.body);
  if (validationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validationError,
      },
    });
  }

  const { items } = req.body;
  const shippingFee = Number(req.body.shippingFee ?? 0);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customerRow = await resolveAuthenticatedCustomerForOrder(client, req.authCustomer.id);
    const shippingSnapshot = await resolveShippingSnapshot(client, req.body, customerRow);

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
          customer_address_id,
          status,
          total_amount,
          shipping_fee,
          shipping_receiver_name,
          shipping_receiver_phone,
          shipping_address_line,
          shipping_ward,
          shipping_district,
          shipping_address,
          city,
          shipping_country,
          shipping_postal_code,
          payment_expires_at
        )
        VALUES (
          $1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW() + INTERVAL '24 hours'
        )
        RETURNING *
      `,
      [
        customerRow.id,
        shippingSnapshot.customerAddressId,
        totalAmount,
        shippingFee,
        shippingSnapshot.receiverName,
        shippingSnapshot.receiverPhone,
        shippingSnapshot.addressLine,
        shippingSnapshot.ward,
        shippingSnapshot.district,
        shippingSnapshot.fullAddress,
        shippingSnapshot.city,
        shippingSnapshot.country,
        shippingSnapshot.postalCode,
      ],
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
      id: Number(orderRow.id),
      status: orderRow.status,
      totalAmount: Number(orderRow.total_amount),
      shippingFee: Number(orderRow.shipping_fee),
      paymentExpiresAt: orderRow.payment_expires_at,
      failCount: orderRow.fail_count,
      customerAddressId:
        orderRow.customer_address_id == null ? null : Number(orderRow.customer_address_id),
      shippingAddress: orderRow.shipping_address,
      city: orderRow.city,
      shipping: mapShippingRow(orderRow),
      createdAt: orderRow.created_at,
      updatedAt: orderRow.updated_at,
      customer: {
        id: Number(customerRow.id),
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

function validateOrderPayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const hasAddressId = body.addressId != null;
  const hasNewAddress = body.newAddress != null;

  if (hasAddressId && hasNewAddress) {
    return "Use either addressId or newAddress, not both";
  }

  if (hasAddressId) {
    if (!Number.isInteger(body.addressId) || body.addressId <= 0) {
      return "addressId must be a positive integer";
    }
  }

  if (hasNewAddress) {
    const addressError = validateShippingAddressPayload(body.newAddress);
    if (addressError) {
      return addressError;
    }
  }

  if (!hasAddressId && !hasNewAddress) {
    return "Shipping information is required";
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

class ValidationError extends Error {}

async function resolveAuthenticatedCustomerForOrder(client, customerId) {
  const { rows } = await client.query(
    `
      SELECT id, full_name, phone, email
      FROM customers
      WHERE id = $1
      LIMIT 1
    `,
    [customerId],
  );

  if (rows.length === 0) {
    throw new ValidationError("Customer not found");
  }

  return rows[0];
}

async function resolveShippingSnapshot(client, body, customerRow) {
  if (body.addressId != null) {
    const { rows } = await client.query(
      `
        SELECT
          id,
          customer_id,
          receiver_name,
          receiver_phone,
          address_line,
          ward,
          district,
          city,
          country,
          postal_code
        FROM customer_addresses
        WHERE id = $1 AND customer_id = $2
        LIMIT 1
      `,
      [body.addressId, customerRow.id],
    );

    if (rows.length === 0) {
      throw new ValidationError("Address not found for customer");
    }

    return mapShippingAddressRecord(rows[0]);
  }

  if (body.newAddress) {
    return mapShippingAddressRecord({
      id: null,
      receiver_name: body.newAddress.receiverName.trim(),
      receiver_phone: body.newAddress.receiverPhone.trim(),
      address_line: body.newAddress.addressLine.trim(),
      ward: body.newAddress.ward?.trim() || null,
      district: body.newAddress.district?.trim() || null,
      city: body.newAddress.city.trim(),
      country: body.newAddress.country?.trim() || "Vietnam",
      postal_code: body.newAddress.postalCode?.trim() || null,
    });
  }
}

function mapShippingAddressRecord(row) {
  const parts = [row.address_line, row.ward, row.district, row.city, row.country].filter(Boolean);

  return {
    customerAddressId: row.id,
    receiverName: row.receiver_name,
    receiverPhone: row.receiver_phone,
    addressLine: row.address_line,
    ward: row.ward,
    district: row.district,
    city: row.city,
    country: row.country,
    postalCode: row.postal_code,
    fullAddress: parts.join(", "),
  };
}

function validateShippingAddressPayload(address) {
  if (!address || typeof address !== "object") {
    return "newAddress is invalid";
  }

  if (!address.receiverName?.trim()) {
    return "newAddress.receiverName is required";
  }

  if (!address.receiverPhone?.trim()) {
    return "newAddress.receiverPhone is required";
  }

  if (!address.addressLine?.trim()) {
    return "newAddress.addressLine is required";
  }

  if (!address.city?.trim()) {
    return "newAddress.city is required";
  }

  return null;
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
