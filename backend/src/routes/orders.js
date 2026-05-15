import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/require-auth.js";
import { pool } from "../db/pool.js";
import {
  applyOrderLifecycleTransition,
  insertInventoryTransactionOnce,
} from "./order-lifecycle.js";
import {
  calculateAddressChangeFeeBreakdown,
  calculateShippingFeeFromDaNang,
} from "../lib/shipping-fee.js";
import { createMomoPaymentRequest, getMomoConfig } from "../lib/momo.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
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
    const conditions = [];
    const params = [];

    if (!isPrivilegedRole(req.authCustomer.role)) {
      params.push(req.authCustomer.id);
      conditions.push(`o.customer_id = $${params.length}`);
    }

    if (normalizedStatus) {
      params.push(normalizedStatus);
      conditions.push(`o.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `${listOrdersBaseQuery}${whereClause} GROUP BY o.id, c.id, latest_rr.status ORDER BY o.created_at DESC`,
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

router.get("/:id", requireAuth, async (req, res) => {
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
    const params = [orderId];
    let accessClause = "";
    if (!isPrivilegedRole(req.authCustomer.role)) {
      params.push(req.authCustomer.id);
      accessClause = ` AND o.customer_id = $${params.length}`;
    }

    const { rows } = await pool.query(
      `${listOrdersBaseQuery} WHERE o.id = $1${accessClause} GROUP BY o.id, c.id, latest_rr.status ORDER BY o.created_at DESC`,
      params,
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

router.patch("/:id/status", requireAuth, requireRole("admin", "staff"), async (req, res) => {
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

    await applyOrderLifecycleTransition(client, orderId, previousStatus, nextStatus);

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
      `${listOrdersBaseQuery} WHERE o.id = $1 GROUP BY o.id, c.id, latest_rr.status ORDER BY o.created_at DESC`,
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

router.post("/shipping-quote", requireAuth, async (req, res) => {
  const validationError = validateShippingQuotePayload(req.body);
  if (validationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validationError,
      },
    });
  }

  const client = await pool.connect();
  try {
    const customerRow = await resolveAuthenticatedCustomerForOrder(client, req.authCustomer.id);
    const shippingSnapshot = await resolveShippingSnapshot(client, req.body, customerRow);
    const shippingFee = calculateShippingFeeFromDaNang({
      provinceCode: shippingSnapshot.provinceCode,
      city: shippingSnapshot.city,
    });

    return res.json({
      shippingFee,
      destination: {
        provinceCode: shippingSnapshot.provinceCode,
        districtCode: shippingSnapshot.districtCode,
        wardCode: shippingSnapshot.wardCode,
        city: shippingSnapshot.city,
        district: shippingSnapshot.district,
        ward: shippingSnapshot.ward,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
        },
      });
    }

    console.error("POST /orders/shipping-quote failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to calculate shipping fee",
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
  const paymentGateway = normalizePaymentGateway(req.body.paymentGateway ?? req.body.paymentMethod);
  if (paymentGateway === "MOMO" && !getMomoConfig()) {
    return res.status(503).json({
      error: {
        code: "PAYMENT_GATEWAY_UNAVAILABLE",
        message: "MoMo payment is not configured",
      },
    });
  }

  const paymentStatus = getInitialPaymentStatus(paymentGateway);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customerRow = await resolveAuthenticatedCustomerForOrder(client, req.authCustomer.id);
    const shippingSnapshot = await resolveShippingSnapshot(client, req.body, customerRow);
    const shippingFee = calculateShippingFeeFromDaNang({
      provinceCode: shippingSnapshot.provinceCode,
      city: shippingSnapshot.city,
    });

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
    const paymentExpiresAt = getPaymentExpiresAt(paymentGateway);
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
          shipping_province_code,
          shipping_district_code,
          shipping_ward_code,
          shipping_ward,
          shipping_district,
          shipping_address,
          city,
          shipping_country,
          shipping_postal_code,
          payment_status,
          payment_gateway,
          payment_expires_at
        )
        VALUES (
          $1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
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
        shippingSnapshot.provinceCode,
        shippingSnapshot.districtCode,
        shippingSnapshot.wardCode,
        shippingSnapshot.ward,
        shippingSnapshot.district,
        shippingSnapshot.fullAddress,
        shippingSnapshot.city,
        shippingSnapshot.country,
        shippingSnapshot.postalCode,
        paymentStatus,
        paymentGateway,
        paymentExpiresAt,
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

      const inserted = await insertInventoryTransactionOnce(client, {
        inventoryId: Number(product.inventory_id),
        changeAmount: -item.quantity,
        type: "RESERVE",
        orderId: Number(orderRow.id),
        referenceId: `ORDER_${orderRow.id}_RESERVE`,
      });

      if (inserted) {
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
      }
    }

    let momoPayment = null;
    if (paymentGateway === "MOMO") {
      momoPayment = await createMomoPaymentRequest({
        order: {
          id: Number(orderRow.id),
          totalAmount: Number(orderRow.total_amount),
          customerId: Number(customerRow.id),
        },
        customer: customerRow,
        items: orderItems.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity,
          priceAtPurchase: item.price_at_purchase,
        })),
      });

      await client.query(
        `
          UPDATE orders
          SET transaction_ref = $2, updated_at = NOW()
          WHERE id = $1
        `,
        [orderRow.id, momoPayment.requestId],
      );

      await client.query(
        `
          INSERT INTO payment_logs (
            order_id,
            external_event_id,
            gateway_name,
            transaction_ref,
            source,
            payment_status,
            raw_response
          )
          VALUES ($1, $2, 'MOMO', $3, 'app_client', 'payment_pending', $4::jsonb)
          ON CONFLICT (external_event_id) DO NOTHING
        `,
        [
          orderRow.id,
          `momo-create-${momoPayment.requestId}`,
          momoPayment.requestId,
          JSON.stringify(momoPayment.rawResponse),
        ],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      id: Number(orderRow.id),
      status: orderRow.status,
      paymentStatus: orderRow.payment_status,
      paymentGateway: orderRow.payment_gateway,
      payment: momoPayment,
      deliveryStatus: orderRow.delivery_status,
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

router.post("/:id/momo-payment", requireAuth, async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Order id must be a positive integer",
      },
    });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `
        SELECT
          o.id,
          o.customer_id,
          o.status,
          o.payment_status,
          o.payment_gateway,
          o.total_amount,
          c.full_name,
          c.phone,
          c.email
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        WHERE o.id = $1 AND o.customer_id = $2
        LIMIT 1
      `,
      [orderId, req.authCustomer.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Order not found",
        },
      });
    }

    const order = rows[0];
    if (
      order.payment_gateway !== "MOMO" ||
      order.payment_status !== "payment_pending" ||
      order.status !== "pending"
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Order is not waiting for MoMo payment",
        },
      });
    }

    const orderItemsResult = await client.query(
      `
        SELECT
          oi.product_id AS "productId",
          oi.quantity,
          oi.price_at_purchase AS "priceAtPurchase",
          p.name
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1
      `,
      [orderId],
    );

    const momoPayment = await createMomoPaymentRequest({
      order: {
        id: Number(order.id),
        totalAmount: Number(order.total_amount),
        customerId: Number(order.customer_id),
      },
      customer: order,
      items: orderItemsResult.rows,
    });

    const paymentExpiresAt = getPaymentExpiresAt("MOMO");
    await client.query(
      `
        UPDATE orders
        SET
          transaction_ref = $2,
          payment_expires_at = $3,
          updated_at = NOW()
        WHERE id = $1
      `,
      [orderId, momoPayment.requestId, paymentExpiresAt],
    );

    await client.query(
      `
        INSERT INTO payment_logs (
          order_id,
          external_event_id,
          gateway_name,
          transaction_ref,
          source,
          payment_status,
          raw_response
        )
        VALUES ($1, $2, 'MOMO', $3, 'app_client', 'payment_pending', $4::jsonb)
        ON CONFLICT (external_event_id) DO NOTHING
      `,
      [
        orderId,
        `momo-create-${momoPayment.requestId}`,
        momoPayment.requestId,
        JSON.stringify(momoPayment.rawResponse),
      ],
    );

    return res.json({
      ...momoPayment,
      paymentExpiresAt,
    });
  } catch (error) {
    console.error(`POST /orders/${orderId}/momo-payment failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create MoMo payment",
      },
    });
  } finally {
    client.release();
  }
});

router.post("/:id/address-change-request", requireAuth, async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Order id must be a positive integer",
      },
    });
  }

  const validationError = validateAddressChangePayload(req.body);
  if (validationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validationError,
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
          customer_id,
          status,
          city,
          shipping_province_code AS province_code,
          delivery_status,
          address_change_status,
          shipping_fee
        FROM orders
        WHERE id = $1 AND customer_id = $2
        LIMIT 1
      `,
      [orderId, req.authCustomer.id],
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
    if (!ALLOWED_ADDRESS_CHANGE_DELIVERY_STATUSES.includes(orderRow.delivery_status)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Order is no longer eligible for address change",
        },
      });
    }

    if (orderRow.address_change_status === "requested") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "An address change request is already pending",
        },
      });
    }

    const customerRow = await resolveAuthenticatedCustomerForOrder(client, req.authCustomer.id);
    const shippingSnapshot = await resolveShippingSnapshot(client, req.body, customerRow);
    const feeBreakdown = calculateAddressChangeFeeBreakdown({
      currentCity: orderRow.city,
      currentProvinceCode: orderRow.province_code,
      nextCity: shippingSnapshot.city,
      nextProvinceCode: shippingSnapshot.provinceCode,
      currentShippingFee: Number(orderRow.shipping_fee),
    });

    if (orderRow.status === "pending") {
      const updatedShippingFee = feeBreakdown.recalculatedShippingFee;
      const feeDelta = updatedShippingFee - Number(orderRow.shipping_fee);

      await client.query(
        `
          UPDATE orders
          SET
            customer_address_id = $2,
            shipping_receiver_name = $3,
            shipping_receiver_phone = $4,
            shipping_address_line = $5,
            shipping_province_code = $6,
            shipping_district_code = $7,
            shipping_ward_code = $8,
            shipping_ward = $9,
            shipping_district = $10,
            shipping_address = $11,
            city = $12,
            shipping_country = $13,
            shipping_postal_code = $14,
            shipping_fee = $15,
            total_amount = total_amount + $16,
            address_change_status = 'approved',
            address_change_requested_at = NOW(),
            address_change_payload = NULL,
            address_change_fee_delta = 0,
            shipping_fee_approved = TRUE,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          orderId,
          shippingSnapshot.customerAddressId,
          shippingSnapshot.receiverName,
          shippingSnapshot.receiverPhone,
          shippingSnapshot.addressLine,
          shippingSnapshot.provinceCode,
          shippingSnapshot.districtCode,
          shippingSnapshot.wardCode,
          shippingSnapshot.ward,
          shippingSnapshot.district,
          shippingSnapshot.fullAddress,
          shippingSnapshot.city,
          shippingSnapshot.country,
          shippingSnapshot.postalCode,
          updatedShippingFee,
          feeDelta,
        ],
      );

      await client.query("COMMIT");
      return res.json({
        success: true,
        action: "updated_pending_recalculated",
        shippingFee: updatedShippingFee,
        processingFee: 0,
        feeDelta,
      });
    }

    await client.query(
      `
        UPDATE orders
        SET
          address_change_status = 'requested',
          address_change_requested_at = NOW(),
          address_change_payload = $2::jsonb,
          address_change_fee_delta = $3,
          shipping_fee_approved = FALSE,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        orderId,
        JSON.stringify({
          customerAddressId: shippingSnapshot.customerAddressId,
          provinceCode: shippingSnapshot.provinceCode,
          districtCode: shippingSnapshot.districtCode,
          wardCode: shippingSnapshot.wardCode,
          receiverName: shippingSnapshot.receiverName,
          receiverPhone: shippingSnapshot.receiverPhone,
          addressLine: shippingSnapshot.addressLine,
          ward: shippingSnapshot.ward,
          district: shippingSnapshot.district,
          city: shippingSnapshot.city,
          country: shippingSnapshot.country,
          postalCode: shippingSnapshot.postalCode,
          fullAddress: shippingSnapshot.fullAddress,
          calculatedShippingFee: feeBreakdown.effectiveShippingFee,
          processingFee: feeBreakdown.processingFee,
          currentShippingFee: Number(orderRow.shipping_fee),
        }),
        feeBreakdown.feeDelta,
      ],
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      action: "pending_approval",
      calculatedShippingFee: feeBreakdown.effectiveShippingFee,
      processingFee: feeBreakdown.processingFee,
      feeDelta: feeBreakdown.feeDelta,
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

    console.error(`POST /orders/${orderId}/address-change-request failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create address change request",
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
    o.payment_status,
    o.payment_gateway,
    o.delivery_status,
    o.total_amount,
    o.shipping_fee,
    o.payment_expires_at,
    o.fail_count,
    o.customer_address_id,
    o.shipping_receiver_name,
    o.shipping_receiver_phone,
    o.shipping_address_line,
    o.shipping_province_code,
    o.shipping_district_code,
    o.shipping_ward_code,
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
    latest_rr.status AS latest_refund_request_status,
    COALESCE(
      json_agg(
        json_build_object(
          'id', oi.id,
          'productId', oi.product_id,
          'name', p.name,
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
    SELECT rr.status
    FROM refund_requests rr
    WHERE rr.order_id = o.id
    ORDER BY rr.created_at DESC, rr.id DESC
    LIMIT 1
  ) latest_rr ON true
  LEFT JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN products p ON p.id = oi.product_id
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

  if (
    (body.paymentGateway != null || body.paymentMethod != null) &&
    !normalizePaymentGateway(body.paymentGateway ?? body.paymentMethod)
  ) {
    return "paymentGateway must be COD, BANK_TRANSFER or MOMO";
  }

  return null;
}

function validateAddressChangePayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const hasAddressId = body.addressId != null;
  const hasNewAddress = body.newAddress != null;

  if (hasAddressId && hasNewAddress) {
    return "Use either addressId or newAddress, not both";
  }

  if (!hasAddressId && !hasNewAddress) {
    return "addressId or newAddress is required";
  }

  if (hasAddressId && (!Number.isInteger(body.addressId) || body.addressId <= 0)) {
    return "addressId must be a positive integer";
  }

  if (hasNewAddress) {
    const addressError = validateShippingAddressPayload(body.newAddress);
    if (addressError) {
      return addressError;
    }
  }

  return null;
}

function validateShippingQuotePayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const hasAddressId = body.addressId != null;
  const hasNewAddress = body.newAddress != null;

  if (hasAddressId && hasNewAddress) {
    return "Use either addressId or newAddress, not both";
  }

  if (!hasAddressId && !hasNewAddress) {
    return "addressId or newAddress is required";
  }

  if (hasAddressId && (!Number.isInteger(body.addressId) || body.addressId <= 0)) {
    return "addressId must be a positive integer";
  }

  if (hasNewAddress) {
    return validateShippingAddressPayload(body.newAddress);
  }

  return null;
}

function mapOrderRow(row) {
  return {
    id: Number(row.id),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentGateway: row.payment_gateway,
    deliveryStatus: row.delivery_status,
    totalAmount: Number(row.total_amount),
    shippingFee: Number(row.shipping_fee),
    paymentExpiresAt: row.payment_expires_at,
    failCount: row.fail_count,
    customerAddressId: row.customer_address_id == null ? null : Number(row.customer_address_id),
    latestRefundRequestStatus: row.latest_refund_request_status ?? null,
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
    name: item.name ?? null,
    imageUrl: item.imageUrl ?? item.image_url ?? null,
    quantity: Number(item.quantity),
    priceAtPurchase: Number(item.priceAtPurchase ?? item.price_at_purchase),
  };
}

function mapShippingRow(row) {
  return {
    receiverName: row.shipping_receiver_name,
    receiverPhone: row.shipping_receiver_phone,
    addressLine: row.shipping_address_line,
    provinceCode: row.shipping_province_code,
    districtCode: row.shipping_district_code,
    wardCode: row.shipping_ward_code,
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
          province_code,
          district_code,
          ward_code,
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
      province_code: body.newAddress.provinceCode?.trim() || null,
      district_code: body.newAddress.districtCode?.trim() || null,
      ward_code: body.newAddress.wardCode?.trim() || null,
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
    provinceCode: row.province_code,
    districtCode: row.district_code,
    wardCode: row.ward_code,
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

const ORDER_STATUSES = ["pending", "processing", "shipping", "completed", "cancelled", "failed"];
const PAYMENT_GATEWAYS = ["COD", "BANK_TRANSFER", "MOMO"];

const ALLOWED_ADDRESS_CHANGE_DELIVERY_STATUSES = [
  "pending",
  "ready_to_ship",
  "handover",
  "in_transit",
  "retry_pending",
];

function normalizePaymentGateway(value) {
  if (value == null || value === "") {
    return "COD";
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();
  return PAYMENT_GATEWAYS.includes(normalizedValue) ? normalizedValue : null;
}

function getInitialPaymentStatus(paymentGateway) {
  return ["BANK_TRANSFER", "MOMO"].includes(paymentGateway) ? "payment_pending" : "unpaid";
}

function getPaymentExpiresAt(paymentGateway) {
  if (!["BANK_TRANSFER", "MOMO"].includes(paymentGateway)) {
    return null;
  }

  const configuredMinutes = Number(
    paymentGateway === "MOMO"
      ? process.env.MOMO_PAYMENT_EXPIRY_MINUTES || 15
      : process.env.BANK_TRANSFER_PAYMENT_EXPIRY_MINUTES || 30,
  );
  const expiryMinutes =
    Number.isFinite(configuredMinutes) && configuredMinutes > 0 ? configuredMinutes : 30;
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
}

function isPrivilegedRole(role) {
  return role === "admin" || role === "staff";
}
