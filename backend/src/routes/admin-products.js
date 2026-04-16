import { Router } from "express";
import { pool } from "../db/pool.js";
import { isValidImageUrl } from "../r2.js";

const router = Router();

router.patch("/:id/image", async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0) {
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
        RETURNING id, sku, name, base_price, category, image_url, created_at
      `,
      [productId, imageUrl],
    );

    if (rows.length === 0) {
      return res.status(404).json(notFound("Product not found"));
    }

    return res.json(mapProductRow(rows[0]));
  } catch (error) {
    console.error(`PATCH /admin/products/${productId}/image failed:`, error);
    return res.status(500).json(internalError("Failed to update product image"));
  }
});

export default router;

function validateImageBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!isValidImageUrl(body.imageUrl)) {
    return "imageUrl must be a valid http or https URL";
  }

  return null;
}

function mapProductRow(row) {
  return {
    id: Number(row.id),
    sku: row.sku,
    name: row.name,
    basePrice: Number(row.base_price),
    category: row.category,
    imageUrl: row.image_url,
    createdAt: row.created_at,
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

function notFound(message) {
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
