import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(listCategoriesQuery);
    return res.json(rows.map(mapCategoryRow));
  } catch (error) {
    console.error("GET /admin/categories failed:", error);
    return res.status(500).json(internalError("Failed to fetch categories"));
  }
});

router.get("/:id", async (req, res) => {
  const categoryId = parsePositiveInteger(req.params.id);
  if (!categoryId) {
    return res.status(400).json(validationError("Category id must be a positive integer"));
  }

  try {
    const { rows } = await pool.query(`${listCategoriesQuery} WHERE c.id = $1`, [categoryId]);
    if (rows.length === 0) {
      return res.status(404).json(notFound("Category not found"));
    }

    return res.json(mapCategoryRow(rows[0]));
  } catch (error) {
    console.error(`GET /admin/categories/${categoryId} failed:`, error);
    return res.status(500).json(internalError("Failed to fetch category"));
  }
});

router.post("/", async (req, res) => {
  const validationMessage = validateCreateCategoryBody(req.body);
  if (validationMessage) {
    return res.status(400).json(validationError(validationMessage));
  }

  const input = normalizeCreateCategoryBody(req.body);

  try {
    const { rows } = await pool.query(
      `
        INSERT INTO categories (name, slug, updated_at)
        VALUES ($1, $2, NOW())
        RETURNING id, name, slug, created_at, updated_at
      `,
      [input.name, input.slug],
    );

    return res.status(201).json(mapCategoryRow(rows[0]));
  } catch (error) {
    console.error("POST /admin/categories failed:", error);

    if (error.code === "23505") {
      return res.status(409).json(conflictError("Category slug already exists"));
    }

    return res.status(500).json(internalError("Failed to create category"));
  }
});

router.patch("/:id", async (req, res) => {
  const categoryId = parsePositiveInteger(req.params.id);
  if (!categoryId) {
    return res.status(400).json(validationError("Category id must be a positive integer"));
  }

  const validationMessage = validateUpdateCategoryBody(req.body);
  if (validationMessage) {
    return res.status(400).json(validationError(validationMessage));
  }

  const updates = normalizeUpdateCategoryBody(req.body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `
        SELECT id, name, slug
        FROM categories
        WHERE id = $1
        LIMIT 1
      `,
      [categoryId],
    );

    if (currentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json(notFound("Category not found"));
    }

    const current = currentResult.rows[0];
    const nextName = updates.name ?? current.name;
    const nextSlug = updates.slug ?? current.slug;

    const { rows } = await client.query(
      `
        UPDATE categories
        SET
          name = $2,
          slug = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, slug, created_at, updated_at
      `,
      [categoryId, nextName, nextSlug],
    );

    await client.query(
      `
        UPDATE products
        SET category = $2
        WHERE category_id = $1
      `,
      [categoryId, nextSlug],
    );

    await client.query("COMMIT");
    return res.json(mapCategoryRow(rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`PATCH /admin/categories/${categoryId} failed:`, error);

    if (error.code === "23505") {
      return res.status(409).json(conflictError("Category slug already exists"));
    }

    return res.status(500).json(internalError("Failed to update category"));
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  const categoryId = parsePositiveInteger(req.params.id);
  if (!categoryId) {
    return res.status(400).json(validationError("Category id must be a positive integer"));
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productReferenceResult = await client.query(
      `
        SELECT 1
        FROM products
        WHERE category_id = $1
        LIMIT 1
      `,
      [categoryId],
    );

    if (productReferenceResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json(conflictError("Category cannot be deleted because products still reference it"));
    }

    const deleteResult = await client.query(
      `
        DELETE FROM categories
        WHERE id = $1
        RETURNING id
      `,
      [categoryId],
    );

    if (deleteResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json(notFound("Category not found"));
    }

    await client.query("COMMIT");
    return res.status(204).send();
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`DELETE /admin/categories/${categoryId} failed:`, error);
    return res.status(500).json(internalError("Failed to delete category"));
  } finally {
    client.release();
  }
});

export default router;

const listCategoriesQuery = `
  SELECT c.id, c.name, c.slug, c.created_at, c.updated_at
  FROM categories c
`;

function validateCreateCategoryBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!body.name?.trim()) {
    return "name is required";
  }

  if (!body.slug?.trim()) {
    return "slug is required";
  }

  return null;
}

function validateUpdateCategoryBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (body.name == null && body.slug == null) {
    return "At least one updatable field is required";
  }

  if (body.name != null && !String(body.name).trim()) {
    return "name cannot be empty";
  }

  if (body.slug != null && !String(body.slug).trim()) {
    return "slug cannot be empty";
  }

  return null;
}

function normalizeCreateCategoryBody(body) {
  return {
    name: String(body.name).trim(),
    slug: normalizeSlug(body.slug),
  };
}

function normalizeUpdateCategoryBody(body) {
  const normalized = {};

  if (body.name != null) {
    normalized.name = String(body.name).trim();
  }

  if (body.slug != null) {
    normalized.slug = normalizeSlug(body.slug);
  }

  return normalized;
}

function normalizeSlug(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, "-");
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function mapCategoryRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

function conflictError(message) {
  return {
    error: {
      code: "CONFLICT",
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
