import bcrypt from "bcryptjs";
import { Router } from "express";
import { pool } from "../db/pool.js";
import { mapCustomer } from "./auth.js";

const router = Router();

const USER_ROLES = ["customer", "shipper", "staff", "admin"];
const STAFF_MANAGED_ROLES = ["customer", "shipper"];

router.get("/", async (req, res) => {
  try {
    const manageableRoles = getManageableRoles(req.authCustomer.role);
    const { rows } = await pool.query(
      `
        SELECT
          id,
          full_name,
          phone,
          email,
          role,
          abuse_score,
          is_blacklisted,
          last_login_at,
          created_at,
          updated_at
        FROM customers
        WHERE role = ANY($1::text[])
        ORDER BY created_at DESC, id DESC
      `,
      [manageableRoles],
    );

    return res.json(rows.map(mapAdminUser));
  } catch (error) {
    console.error("GET /admin/users failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch users",
      },
    });
  }
});

router.post("/", async (req, res) => {
  const payload = normalizeUserPayload(req.body, { requirePassword: true });
  const validationError = validateUserPayload(payload, { requirePassword: true });
  if (validationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validationError,
      },
    });
  }

  if (!canManageRole(req.authCustomer.role, payload.role)) {
    return forbiddenRoleResponse(res);
  }

  try {
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const { rows } = await pool.query(
      `
        INSERT INTO customers (
          full_name,
          phone,
          email,
          password_hash,
          role,
          abuse_score,
          is_blacklisted
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          full_name,
          phone,
          email,
          role,
          abuse_score,
          is_blacklisted,
          last_login_at,
          created_at,
          updated_at
      `,
      [
        payload.fullName,
        payload.phone,
        payload.email,
        passwordHash,
        payload.role,
        payload.abuseScore,
        payload.isBlacklisted,
      ],
    );

    return res.status(201).json(mapAdminUser(rows[0]));
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "Email or phone already exists",
        },
      });
    }

    console.error("POST /admin/users failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create user",
      },
    });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = parseUserId(req.params.id);
  if (!userId) {
    return invalidUserIdResponse(res);
  }

  const payload = normalizeUserPayload(req.body, { partial: true });
  const validationError = validateUserPayload(payload, { partial: true });
  if (validationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validationError,
      },
    });
  }

  try {
    const existingUser = await findUserById(userId);
    if (!existingUser) {
      return notFoundResponse(res);
    }

    if (!canManageRole(req.authCustomer.role, existingUser.role)) {
      return forbiddenRoleResponse(res);
    }

    const nextRole = payload.role ?? existingUser.role;
    if (!canManageRole(req.authCustomer.role, nextRole)) {
      return forbiddenRoleResponse(res);
    }

    if (userId === req.authCustomer.id && payload.role && payload.role !== existingUser.role) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "You cannot change your own role",
        },
      });
    }

    const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : null;
    const { rows } = await pool.query(
      `
        UPDATE customers
        SET
          full_name = COALESCE($2, full_name),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          role = COALESCE($5, role),
          abuse_score = COALESCE($6, abuse_score),
          is_blacklisted = COALESCE($7, is_blacklisted),
          password_hash = COALESCE($8, password_hash),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          full_name,
          phone,
          email,
          role,
          abuse_score,
          is_blacklisted,
          last_login_at,
          created_at,
          updated_at
      `,
      [
        userId,
        payload.fullName ?? null,
        payload.phone ?? null,
        payload.email ?? null,
        payload.role ?? null,
        payload.abuseScore ?? null,
        payload.isBlacklisted ?? null,
        passwordHash,
      ],
    );

    return res.json(mapAdminUser(rows[0]));
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "Email or phone already exists",
        },
      });
    }

    console.error(`PATCH /admin/users/${userId} failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update user",
      },
    });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = parseUserId(req.params.id);
  if (!userId) {
    return invalidUserIdResponse(res);
  }

  if (userId === req.authCustomer.id) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "You cannot delete your own account",
      },
    });
  }

  try {
    const existingUser = await findUserById(userId);
    if (!existingUser) {
      return notFoundResponse(res);
    }

    if (!canManageRole(req.authCustomer.role, existingUser.role)) {
      return forbiddenRoleResponse(res);
    }

    const usage = await getUserUsage(userId);
    if (usage.total > 0) {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message:
            "User has related orders, assigned deliveries, or refund requests. Blacklist the user instead of deleting to preserve history.",
          details: usage,
        },
      });
    }

    await pool.query("DELETE FROM customers WHERE id = $1", [userId]);
    return res.status(204).send();
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "User has related records and cannot be deleted safely",
        },
      });
    }

    console.error(`DELETE /admin/users/${userId} failed:`, error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to delete user",
      },
    });
  }
});

export default router;

function getManageableRoles(actorRole) {
  return actorRole === "admin" ? USER_ROLES : STAFF_MANAGED_ROLES;
}

function canManageRole(actorRole, targetRole) {
  if (actorRole === "admin") {
    return USER_ROLES.includes(targetRole);
  }

  if (actorRole === "staff") {
    return STAFF_MANAGED_ROLES.includes(targetRole);
  }

  return false;
}

function normalizeUserPayload(body, options = {}) {
  const payload = {};
  const source = body && typeof body === "object" ? body : {};

  if (!options.partial || source.fullName != null) {
    payload.fullName = getTrimmedString(source.fullName);
  }

  if (!options.partial || source.phone != null) {
    payload.phone = getTrimmedString(source.phone);
  }

  if (!options.partial || source.email != null) {
    payload.email = getTrimmedString(source.email)?.toLowerCase() ?? null;
  }

  if (!options.partial || source.role != null) {
    payload.role = getTrimmedString(source.role)?.toLowerCase() ?? null;
  }

  if (!options.partial || source.password != null) {
    payload.password = typeof source.password === "string" ? source.password : null;
  }

  if (!options.partial || source.abuseScore != null) {
    const abuseScore = Number(source.abuseScore ?? 0);
    payload.abuseScore = Number.isInteger(abuseScore) ? abuseScore : null;
  }

  if (!options.partial || source.isBlacklisted != null) {
    payload.isBlacklisted = Boolean(source.isBlacklisted);
  }

  return payload;
}

function validateUserPayload(payload, options = {}) {
  if (!options.partial || payload.fullName != null) {
    if (!payload.fullName) return "fullName is required";
  }

  if (!options.partial || payload.phone != null) {
    if (!payload.phone) return "phone is required";
  }

  if (!options.partial || payload.email != null) {
    if (!payload.email) return "email is required";
  }

  if (!options.partial || payload.role != null) {
    if (!USER_ROLES.includes(payload.role)) return "role is invalid";
  }

  if (options.requirePassword || payload.password != null) {
    if (!payload.password || payload.password.length < 8) {
      return "password must be at least 8 characters";
    }
  }

  if (!options.partial || payload.abuseScore != null) {
    if (payload.abuseScore == null || payload.abuseScore < 0) {
      return "abuseScore must be a non-negative integer";
    }
  }

  return null;
}

function getTrimmedString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function parseUserId(value) {
  const userId = Number(value);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

async function findUserById(userId) {
  const { rows } = await pool.query(
    `
      SELECT
        id,
        full_name,
        phone,
        email,
        role,
        abuse_score,
        is_blacklisted,
        last_login_at,
        created_at,
        updated_at
      FROM customers
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  return rows[0] ? mapAdminUser(rows[0]) : null;
}

async function getUserUsage(userId) {
  const { rows } = await pool.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM orders WHERE customer_id = $1) AS orders_count,
        (SELECT COUNT(*)::int FROM orders WHERE assigned_shipper_id = $1) AS assigned_orders_count,
        (SELECT COUNT(*)::int FROM refund_requests WHERE customer_id = $1) AS refund_requests_count
    `,
    [userId],
  );

  const usage = {
    orders: Number(rows[0]?.orders_count ?? 0),
    assignedOrders: Number(rows[0]?.assigned_orders_count ?? 0),
    refundRequests: Number(rows[0]?.refund_requests_count ?? 0),
  };

  return {
    ...usage,
    total: usage.orders + usage.assignedOrders + usage.refundRequests,
  };
}

function mapAdminUser(row) {
  return {
    ...mapCustomer(row),
    lastLoginAt: row.last_login_at,
  };
}

function invalidUserIdResponse(res) {
  return res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "User id must be a positive integer",
    },
  });
}

function notFoundResponse(res) {
  return res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "User not found",
    },
  });
}

function forbiddenRoleResponse(res) {
  return res.status(403).json({
    error: {
      code: "FORBIDDEN",
      message: "You do not have permission to manage this user role",
    },
  });
}
