import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

const ISSUE_STATUSES = ["open", "investigating", "resolved", "ignored"];
const ISSUE_SEVERITIES = ["low", "medium", "high", "critical"];

router.get("/", async (req, res) => {
  const status = normalizeIssueStatus(req.query.status);
  const severity = normalizeIssueSeverity(req.query.severity);
  const type = typeof req.query.type === "string" ? req.query.type.trim().toUpperCase() : null;

  if (req.query.status != null && !status) {
    return res.status(400).json(validationError("Invalid issue status filter"));
  }

  if (req.query.severity != null && !severity) {
    return res.status(400).json(validationError("Invalid issue severity filter"));
  }

  try {
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`i.status = $${params.length}`);
    }

    if (severity) {
      params.push(severity);
      conditions.push(`i.severity = $${params.length}`);
    }

    if (type) {
      params.push(type);
      conditions.push(`i.type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `
        SELECT
          i.id,
          i.order_id,
          i.product_id,
          i.type,
          i.severity,
          i.status,
          i.log_history,
          i.created_at,
          i.updated_at
        FROM issues i
        ${whereClause}
        ORDER BY i.created_at DESC, i.id DESC
      `,
      params,
    );

    return res.json(rows.map(mapIssueRow));
  } catch (error) {
    console.error("GET /admin/issues failed:", error);
    return res.status(500).json(internalError("Failed to fetch issues"));
  }
});

router.get("/:id", async (req, res) => {
  const issueId = parsePositiveInteger(req.params.id);
  if (!issueId) {
    return res.status(400).json(validationError("Issue id must be a positive integer"));
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT
          i.id,
          i.order_id,
          i.product_id,
          i.type,
          i.severity,
          i.status,
          i.log_history,
          i.created_at,
          i.updated_at
        FROM issues i
        WHERE i.id = $1
        LIMIT 1
      `,
      [issueId],
    );

    if (rows.length === 0) {
      return res.status(404).json(notFoundError("Issue not found"));
    }

    return res.json(mapIssueRow(rows[0]));
  } catch (error) {
    console.error(`GET /admin/issues/${issueId} failed:`, error);
    return res.status(500).json(internalError("Failed to fetch issue"));
  }
});

router.patch("/:id/status", async (req, res) => {
  const issueId = parsePositiveInteger(req.params.id);
  if (!issueId) {
    return res.status(400).json(validationError("Issue id must be a positive integer"));
  }

  const nextStatus = normalizeIssueStatus(req.body?.status);
  if (!nextStatus) {
    return res.status(400).json(validationError("A valid issue status is required"));
  }

  try {
    const { rows } = await pool.query(
      `
        UPDATE issues
        SET
          status = $2,
          updated_at = NOW(),
          log_history = log_history || jsonb_build_array(
            jsonb_build_object(
              'timestamp', NOW(),
              'message', $3::text
            )
          )
        WHERE id = $1
        RETURNING
          id,
          order_id,
          product_id,
          type,
          severity,
          status,
          log_history,
          created_at,
          updated_at
      `,
      [issueId, nextStatus, `Issue status changed to ${nextStatus}`],
    );

    if (rows.length === 0) {
      return res.status(404).json(notFoundError("Issue not found"));
    }

    return res.json(mapIssueRow(rows[0]));
  } catch (error) {
    console.error(`PATCH /admin/issues/${issueId}/status failed:`, error);
    return res.status(500).json(internalError("Failed to update issue status"));
  }
});

export default router;

function normalizeIssueStatus(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return ISSUE_STATUSES.includes(normalized) ? normalized : null;
}

function normalizeIssueSeverity(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return ISSUE_SEVERITIES.includes(normalized) ? normalized : null;
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function mapIssueRow(row) {
  return {
    id: Number(row.id),
    orderId: row.order_id == null ? null : Number(row.order_id),
    productId: row.product_id == null ? null : Number(row.product_id),
    type: row.type,
    severity: row.severity,
    status: row.status,
    logHistory: row.log_history,
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
