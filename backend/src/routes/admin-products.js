import express, { Router } from "express";
import { pool } from "../db/pool.js";
import { isAllowedImageContentType, isValidImageUrl, uploadProductImageObject } from "../r2.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(listProductsQuery);
    return res.json(rows.map(mapAdminProductRow));
  } catch (error) {
    console.error("GET /admin/products failed:", error);
    return res.status(500).json(internalError("Failed to fetch admin products"));
  }
});

router.get("/:id", async (req, res) => {
  const productId = parsePositiveInteger(req.params.id);
  if (!productId) {
    return res.status(400).json(validationError("Product id must be a positive integer"));
  }

  try {
    const { rows } = await pool.query(`${listProductsQuery} WHERE p.id = $1`, [productId]);
    if (rows.length === 0) {
      return res.status(404).json(notFound("Product not found"));
    }

    return res.json(mapAdminProductRow(rows[0]));
  } catch (error) {
    console.error(`GET /admin/products/${productId} failed:`, error);
    return res.status(500).json(internalError("Failed to fetch product"));
  }
});

router.get("/:id/inventory-transactions", async (req, res) => {
  const productId = parsePositiveInteger(req.params.id);
  if (!productId) {
    return res.status(400).json(validationError("Product id must be a positive integer"));
  }

  const limit = parsePaginationLimit(req.query.limit);
  const offset = parsePaginationOffset(req.query.offset);

  try {
    const { rows } = await pool.query(
      `
        SELECT
          it.id,
          it.change_amount,
          it.type,
          it.order_id,
          it.created_by,
          it.reference_id,
          it.note,
          it.created_at
        FROM inventory_transactions it
        JOIN inventory i ON i.id = it.inventory_id
        WHERE i.product_id = $1
        ORDER BY it.created_at DESC, it.id DESC
        LIMIT $2 OFFSET $3
      `,
      [productId, limit, offset],
    );

    const countResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM inventory_transactions it
        JOIN inventory i ON i.id = it.inventory_id
        WHERE i.product_id = $1
      `,
      [productId],
    );

    return res.json({
      items: rows.map(mapInventoryTransactionRow),
      total: Number(countResult.rows[0]?.total ?? 0),
      limit,
      offset,
    });
  } catch (error) {
    console.error(`GET /admin/products/${productId}/inventory-transactions failed:`, error);
    return res.status(500).json(internalError("Failed to fetch inventory transactions"));
  }
});

router.post("/", async (req, res) => {
  const validationMessage = validateCreateProductBody(req.body);
  if (validationMessage) {
    return res.status(400).json(validationError(validationMessage));
  }

  const productInput = normalizeCreateProductBody(req.body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const resolvedCategory = await resolveCategorySelection(client, productInput);

    const productResult = await client.query(
      `
        INSERT INTO products (
          sku,
          name,
          base_price,
          category,
          category_id,
          image_url
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        productInput.sku,
        productInput.name,
        productInput.basePrice,
        resolvedCategory.category,
        resolvedCategory.categoryId,
        productInput.imageUrl,
      ],
    );

    const productId = Number(productResult.rows[0].id);
    await client.query(
      `
        INSERT INTO inventory (
          product_id,
          stock_qty,
          reserved_qty,
          min_stock_level,
          ads,
          doi
        )
        VALUES ($1, $2, 0, $3, 0, 0)
      `,
      [productId, productInput.stockQty, productInput.minStockLevel],
    );

    const createdProduct = await client.query(`${listProductsQuery} WHERE p.id = $1`, [productId]);
    await client.query("COMMIT");
    return res.status(201).json(mapAdminProductRow(createdProduct.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /admin/products failed:", error);

    if (error instanceof ValidationException) {
      return res.status(400).json(validationError(error.message));
    }

    if (error.code === "23505") {
      return res.status(409).json(conflictError("Product sku already exists"));
    }

    return res.status(500).json(internalError("Failed to create product"));
  } finally {
    client.release();
  }
});

router.post("/:id/stock-in", async (req, res) => {
  const productId = parsePositiveInteger(req.params.id);
  if (!productId) {
    return res.status(400).json(validationError("Product id must be a positive integer"));
  }

  const validationMessage = validateStockInBody(req.body);
  if (validationMessage) {
    return res.status(400).json(validationError(validationMessage));
  }

  const quantity = Number(req.body.quantity);
  const note = String(req.body.note ?? "").trim() || null;
  const createdBy = formatInventoryActor(req.authCustomer);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      `
        SELECT id
        FROM products
        WHERE id = $1
        FOR UPDATE
      `,
      [productId],
    );

    if (productResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json(notFound("Product not found"));
    }

    let inventoryResult = await client.query(
      `
        SELECT
          id,
          stock_qty
        FROM inventory
        WHERE product_id = $1
        FOR UPDATE
      `,
      [productId],
    );

    if (inventoryResult.rows.length === 0) {
      inventoryResult = await client.query(
        `
          INSERT INTO inventory (
            product_id,
            stock_qty,
            reserved_qty,
            min_stock_level,
            ads,
            doi
          )
          VALUES ($1, 0, 0, 5, 0, 0)
          RETURNING id, stock_qty
        `,
        [productId],
      );
    }

    const inventory = inventoryResult.rows[0];
    const previousStockQty = Number(inventory.stock_qty);
    const nextStockQty = previousStockQty + quantity;
    const referenceId = `ADMIN_STOCK_IN_${productId}_${Date.now()}`;

    await client.query(
      `
        UPDATE inventory
        SET
          stock_qty = $2,
          updated_at = NOW()
        WHERE id = $1
      `,
      [inventory.id, nextStockQty],
    );

    const transactionResult = await client.query(
      `
        INSERT INTO inventory_transactions (
          inventory_id,
          change_amount,
          type,
          order_id,
          created_by,
          reference_id,
          note
        )
        VALUES ($1, $2, 'RESTOCK', NULL, $3, $4, $5)
        RETURNING
          id,
          change_amount,
          type,
          order_id,
          created_by,
          reference_id,
          note,
          created_at
      `,
      [inventory.id, quantity, createdBy, referenceId, note],
    );

    const updatedProduct = await client.query(`${listProductsQuery} WHERE p.id = $1`, [productId]);
    await client.query("COMMIT");

    return res.status(201).json({
      product: mapAdminProductRow(updatedProduct.rows[0]),
      transaction: {
        ...mapInventoryTransactionRow(transactionResult.rows[0]),
        previousStockQty,
        nextStockQty,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`POST /admin/products/${productId}/stock-in failed:`, error);
    return res.status(500).json(internalError("Failed to stock in product"));
  } finally {
    client.release();
  }
});

router.patch("/:id", async (req, res) => {
  const productId = parsePositiveInteger(req.params.id);
  if (!productId) {
    return res.status(400).json(validationError("Product id must be a positive integer"));
  }

  const validationMessage = validateUpdateProductBody(req.body);
  if (validationMessage) {
    return res.status(400).json(validationError(validationMessage));
  }

  const updates = normalizeUpdateProductBody(req.body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `
        SELECT
          p.id,
          p.sku,
          p.name,
          p.base_price,
          p.category,
          p.category_id,
          p.image_url,
          COALESCE(i.stock_qty, 0) AS stock_qty,
          COALESCE(i.reserved_qty, 0) AS reserved_qty,
          COALESCE(i.min_stock_level, 0) AS min_stock_level
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.id = $1
        LIMIT 1
      `,
      [productId],
    );

    if (currentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json(notFound("Product not found"));
    }

    const current = currentResult.rows[0];
    const resolvedCategory = await resolveCategorySelection(client, updates, {
      category: current.category,
      categoryId: current.category_id == null ? null : Number(current.category_id),
    });
    const nextStockQty = updates.stockQty ?? Number(current.stock_qty);
    const reservedQty = Number(current.reserved_qty);

    if (nextStockQty < reservedQty) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json(validationError("stockQty cannot be less than current reservedQty"));
    }

    await client.query(
      `
        UPDATE products
        SET
          sku = $2,
          name = $3,
          base_price = $4,
          category = $5,
          category_id = $6,
          image_url = $7
        WHERE id = $1
      `,
      [
        productId,
        updates.sku ?? current.sku,
        updates.name ?? current.name,
        updates.basePrice ?? Number(current.base_price),
        resolvedCategory.category,
        resolvedCategory.categoryId,
        Object.prototype.hasOwnProperty.call(updates, "imageUrl")
          ? updates.imageUrl
          : current.image_url,
      ],
    );

    await client.query(
      `
        UPDATE inventory
        SET
          stock_qty = $2,
          min_stock_level = $3,
          updated_at = NOW()
        WHERE product_id = $1
      `,
      [productId, nextStockQty, updates.minStockLevel ?? Number(current.min_stock_level)],
    );

    const updatedResult = await client.query(`${listProductsQuery} WHERE p.id = $1`, [productId]);
    await client.query("COMMIT");
    return res.json(mapAdminProductRow(updatedResult.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`PATCH /admin/products/${productId} failed:`, error);

    if (error instanceof ValidationException) {
      return res.status(400).json(validationError(error.message));
    }

    if (error.code === "23505") {
      return res.status(409).json(conflictError("Product sku already exists"));
    }

    return res.status(500).json(internalError("Failed to update product"));
  } finally {
    client.release();
  }
});

router.patch("/:id/image", async (req, res) => {
  const productId = parsePositiveInteger(req.params.id);
  if (!productId) {
    return res.status(400).json(validationError("Product id must be a positive integer"));
  }

  const validationMessage = validateImageBody(req.body);
  if (validationMessage) {
    return res.status(400).json(validationError(validationMessage));
  }

  const imageUrl = req.body.imageUrl.trim();

  try {
    const { rows } = await pool.query(
      `
        UPDATE products
        SET image_url = $2
        WHERE id = $1
        RETURNING id
      `,
      [productId, imageUrl],
    );

    if (rows.length === 0) {
      return res.status(404).json(notFound("Product not found"));
    }

    const updatedProduct = await pool.query(`${listProductsQuery} WHERE p.id = $1`, [productId]);
    return res.json(mapAdminProductRow(updatedProduct.rows[0]));
  } catch (error) {
    console.error(`PATCH /admin/products/${productId}/image failed:`, error);
    return res.status(500).json(internalError("Failed to update product image"));
  }
});

router.put(
  "/:id/image-upload",
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    limit: "5mb",
  }),
  async (req, res) => {
    const productId = parsePositiveInteger(req.params.id);
    if (!productId) {
      return res.status(400).json(validationError("Product id must be a positive integer"));
    }

    const contentType = String(req.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!isAllowedImageContentType(contentType)) {
      return res
        .status(400)
        .json(
          validationError(
            "contentType must be one of image/jpeg, image/png, image/webp, image/gif",
          ),
        );
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json(validationError("Image body is required"));
    }

    const fileName = String(req.get("x-file-name") || `product-${productId}`).trim();

    try {
      const existingProduct = await pool.query("SELECT id FROM products WHERE id = $1 LIMIT 1", [
        productId,
      ]);
      if (existingProduct.rows.length === 0) {
        return res.status(404).json(notFound("Product not found"));
      }

      const upload = await uploadProductImageObject({
        productId,
        fileName,
        contentType,
        body: req.body,
      });

      await pool.query(
        `
          UPDATE products
          SET image_url = $2
          WHERE id = $1
        `,
        [productId, upload.publicUrl],
      );

      const updatedProduct = await pool.query(`${listProductsQuery} WHERE p.id = $1`, [productId]);
      return res.json({
        ...mapAdminProductRow(updatedProduct.rows[0]),
        objectKey: upload.objectKey,
      });
    } catch (error) {
      console.error(`PUT /admin/products/${productId}/image-upload failed:`, error);
      return res.status(500).json(internalError("Failed to upload product image"));
    }
  },
);

router.delete("/:id", async (req, res) => {
  const productId = parsePositiveInteger(req.params.id);
  if (!productId) {
    return res.status(400).json(validationError("Product id must be a positive integer"));
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const deleteResult = await client.query(
      `
        DELETE FROM products
        WHERE id = $1
        RETURNING id
      `,
      [productId],
    );

    if (deleteResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json(notFound("Product not found"));
    }

    await client.query("COMMIT");
    return res.status(204).send();
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`DELETE /admin/products/${productId} failed:`, error);

    if (error.code === "23503") {
      return res
        .status(409)
        .json(
          conflictError("Product cannot be deleted because it is referenced by existing records"),
        );
    }

    return res.status(500).json(internalError("Failed to delete product"));
  } finally {
    client.release();
  }
});

export default router;

const listProductsQuery = `
  SELECT
    p.id,
    p.sku,
    p.name,
    p.base_price,
    p.category,
    p.category_id,
    p.image_url,
    p.created_at,
    COALESCE(i.stock_qty, 0) AS stock_qty,
    COALESCE(i.reserved_qty, 0) AS reserved_qty,
    COALESCE(i.min_stock_level, 0) AS min_stock_level,
    COALESCE(rs.review_count, 0) AS review_count,
    COALESCE(rs.rating_average, 0) AS rating_average
  FROM products p
  LEFT JOIN inventory i ON i.product_id = p.id
  LEFT JOIN (
    SELECT
      product_id,
      COUNT(*)::int AS review_count,
      ROUND(AVG(rating)::numeric, 2) AS rating_average
    FROM product_reviews
    WHERE status = 'visible'
    GROUP BY product_id
  ) rs ON rs.product_id = p.id
`;

function validateCreateProductBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!body.sku?.trim()) {
    return "sku is required";
  }

  if (!body.name?.trim()) {
    return "name is required";
  }

  if (!isNonNegativeNumber(body.basePrice)) {
    return "basePrice must be a non-negative number";
  }

  if (!body.category?.trim()) {
    if (!isPositiveIntegerLike(body.categoryId)) {
      return "category or categoryId is required";
    }
  }

  if (body.imageUrl != null && body.imageUrl !== "" && !isValidImageUrl(body.imageUrl)) {
    return "imageUrl must be a valid http or https URL";
  }

  if (body.stockQty != null && !isNonNegativeInteger(body.stockQty)) {
    return "stockQty must be a non-negative integer";
  }

  if (body.minStockLevel != null && !isNonNegativeInteger(body.minStockLevel)) {
    return "minStockLevel must be a non-negative integer";
  }

  return null;
}

function validateUpdateProductBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const allowedKeys = [
    "sku",
    "name",
    "basePrice",
    "category",
    "categoryId",
    "imageUrl",
    "stockQty",
    "minStockLevel",
  ];
  const providedKeys = Object.keys(body).filter((key) => allowedKeys.includes(key));
  if (providedKeys.length === 0) {
    return "At least one updatable field is required";
  }

  if (body.sku != null && !String(body.sku).trim()) {
    return "sku cannot be empty";
  }

  if (body.name != null && !String(body.name).trim()) {
    return "name cannot be empty";
  }

  if (body.basePrice != null && !isNonNegativeNumber(body.basePrice)) {
    return "basePrice must be a non-negative number";
  }

  if (body.category != null && !String(body.category).trim()) {
    return "category cannot be empty";
  }

  if (body.categoryId != null && !isPositiveIntegerLike(body.categoryId)) {
    return "categoryId must be a positive integer";
  }

  if (body.imageUrl != null && body.imageUrl !== "" && !isValidImageUrl(body.imageUrl)) {
    return "imageUrl must be a valid http or https URL";
  }

  if (body.stockQty != null && !isNonNegativeInteger(body.stockQty)) {
    return "stockQty must be a non-negative integer";
  }

  if (body.minStockLevel != null && !isNonNegativeInteger(body.minStockLevel)) {
    return "minStockLevel must be a non-negative integer";
  }

  return null;
}

function validateStockInBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!isPositiveIntegerLike(body.quantity)) {
    return "quantity must be a positive integer";
  }

  if (Number(body.quantity) > 1_000_000) {
    return "quantity is too large";
  }

  if (body.note != null && String(body.note).length > 500) {
    return "note cannot exceed 500 characters";
  }

  return null;
}

function normalizeCreateProductBody(body) {
  return {
    sku: body.sku.trim(),
    name: body.name.trim(),
    basePrice: Number(body.basePrice),
    category: body.category?.trim().toLowerCase() || null,
    categoryId: body.categoryId != null ? Number(body.categoryId) : null,
    imageUrl: body.imageUrl?.trim() || null,
    stockQty: Number(body.stockQty ?? 0),
    minStockLevel: Number(body.minStockLevel ?? 5),
  };
}

function normalizeUpdateProductBody(body) {
  const normalized = {};

  if (body.sku != null) {
    normalized.sku = String(body.sku).trim();
  }
  if (body.name != null) {
    normalized.name = String(body.name).trim();
  }
  if (body.basePrice != null) {
    normalized.basePrice = Number(body.basePrice);
  }
  if (body.category != null) {
    normalized.category = String(body.category).trim().toLowerCase();
  }
  if (body.categoryId != null) {
    normalized.categoryId = Number(body.categoryId);
  }
  if (Object.prototype.hasOwnProperty.call(body, "imageUrl")) {
    normalized.imageUrl = body.imageUrl?.trim() || null;
  }
  if (body.stockQty != null) {
    normalized.stockQty = Number(body.stockQty);
  }
  if (body.minStockLevel != null) {
    normalized.minStockLevel = Number(body.minStockLevel);
  }

  return normalized;
}

async function resolveCategorySelection(client, input, fallback = {}) {
  if (input.categoryId != null) {
    const { rows } = await client.query(
      `
        SELECT id, slug
        FROM categories
        WHERE id = $1
        LIMIT 1
      `,
      [input.categoryId],
    );

    if (rows.length === 0) {
      throw new ValidationException("categoryId does not exist");
    }

    return {
      categoryId: Number(rows[0].id),
      category: rows[0].slug,
    };
  }

  if (input.category != null) {
    const categorySlug = String(input.category).trim().toLowerCase();
    const { rows } = await client.query(
      `
        SELECT id, slug
        FROM categories
        WHERE slug = $1
        LIMIT 1
      `,
      [categorySlug],
    );

    if (rows.length === 0) {
      throw new ValidationException("category does not exist");
    }

    return {
      categoryId: Number(rows[0].id),
      category: rows[0].slug,
    };
  }

  return {
    categoryId: fallback.categoryId ?? null,
    category: fallback.category ?? null,
  };
}

function validateImageBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!isValidImageUrl(body.imageUrl)) {
    return "imageUrl must be a valid http or https URL";
  }

  return null;
}

function mapAdminProductRow(row) {
  return {
    id: Number(row.id),
    sku: row.sku,
    name: row.name,
    basePrice: Number(row.base_price),
    categoryId: row.category_id == null ? null : Number(row.category_id),
    category: row.category,
    imageUrl: row.image_url,
    stockQty: Number(row.stock_qty),
    reservedQty: Number(row.reserved_qty),
    availableQty: Number(row.stock_qty) - Number(row.reserved_qty),
    minStockLevel: Number(row.min_stock_level),
    reviewCount: Number(row.review_count ?? 0),
    ratingAverage: Number(row.rating_average ?? 0),
    createdAt: row.created_at,
  };
}

function mapInventoryTransactionRow(row) {
  return {
    id: Number(row.id),
    changeAmount: Number(row.change_amount),
    type: row.type,
    orderId: row.order_id == null ? null : Number(row.order_id),
    createdBy: row.created_by,
    referenceId: row.reference_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

function formatInventoryActor(customer) {
  if (!customer) {
    return "SYSTEM";
  }

  const email = customer.email ? `:${customer.email}` : "";
  return `${customer.role || "admin"}:${customer.id}${email}`.slice(0, 100);
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePaginationLimit(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 50;
  }

  return Math.min(parsed, 100);
}

function parsePaginationOffset(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 0;
}

function isNonNegativeNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function isPositiveIntegerLike(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function validationError(message) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  };
}

function notFound(message) {
  return {
    error: {
      code: "NOT_FOUND",
      message,
    },
  };
}

function conflictError(message) {
  return {
    error: {
      code: "CONFLICT",
      message,
    },
  };
}

class ValidationException extends Error {}

function internalError(message) {
  return {
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  };
}
