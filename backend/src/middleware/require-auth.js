import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { getJwtSecret, mapCustomer } from "../routes/auth.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authorization token is required",
      },
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authorization token is required",
      },
    });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const customerId = Number(payload.sub);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid authorization token",
        },
      });
    }

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
          created_at,
          updated_at
        FROM customers
        WHERE id = $1
        LIMIT 1
      `,
      [customerId],
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Customer not found for token",
        },
      });
    }

    if (rows[0].is_blacklisted) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Customer is blacklisted",
        },
      });
    }

    req.authCustomer = mapCustomer(rows[0]);
    req.authToken = payload;
    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid authorization token",
      },
    });
  }
}

export function attachAuthCustomerId(req, _res, next) {
  req.params.customerId = String(req.authCustomer.id);
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.authCustomer) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authorization token is required",
        },
      });
    }

    if (!allowedRoles.includes(req.authCustomer.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        },
      });
    }

    return next();
  };
}
