import { Router } from "express";
import { pool } from "../db/pool.js";
import { createProductImageUploadUrl, getR2Config, isAllowedImageContentType } from "../r2.js";

const router = Router();

router.post("/presign", async (req, res) => {
  const config = getR2Config();
  if (!config) {
    return res.status(500).json(internalError("R2 upload is not configured"));
  }

  const validationMessage = validatePresignBody(req.body);
  if (validationMessage) {
    return res.status(400).json(validationError(validationMessage));
  }

  const productId = Number(req.body.productId);
  const fileName = req.body.fileName.trim();
  const contentType = req.body.contentType.trim().toLowerCase();

  try {
    const { rows } = await pool.query(
      `
        SELECT id
        FROM products
        WHERE id = $1
        LIMIT 1
      `,
      [productId],
    );

    if (rows.length === 0) {
      return res.status(404).json(notFound("Product not found"));
    }

    const upload = await createProductImageUploadUrl({
      productId,
      fileName,
      contentType,
    });

    return res.status(201).json(upload);
  } catch (error) {
    console.error("POST /admin/uploads/presign failed:", error);
    return res.status(500).json(internalError("Failed to create upload URL"));
  }
});

export default router;

function validatePresignBody(body) {
  const productId = Number(body?.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return "productId must be a positive integer";
  }

  if (!body?.fileName?.trim()) {
    return "fileName is required";
  }

  if (!body?.contentType?.trim()) {
    return "contentType is required";
  }

  if (!isAllowedImageContentType(body.contentType)) {
    return "contentType must be one of image/jpeg, image/png, image/webp, image/gif";
  }

  return null;
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
