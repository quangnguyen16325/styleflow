import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.post("/register", async (req, res) => {
  const validationError = validateRegisterPayload(req.body);
  if (validationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validationError,
      },
    });
  }

  const { fullName, phone, email, password } = req.body;

  try {
    const existingCustomerResult = await pool.query(
      `
        SELECT id
        FROM customers
        WHERE email = $1 OR phone = $2
        LIMIT 1
      `,
      [email.trim().toLowerCase(), phone.trim()],
    );

    if (existingCustomerResult.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "Customer already exists",
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `
        INSERT INTO customers (
          full_name,
          phone,
          email,
          password_hash,
          role
        )
        VALUES ($1, $2, $3, $4, 'customer')
        RETURNING id, full_name, phone, email, role, abuse_score, is_blacklisted, created_at, updated_at
      `,
      [fullName.trim(), phone.trim(), email.trim().toLowerCase(), passwordHash],
    );

    return res.status(201).json({
      customer: mapCustomer(rows[0]),
    });
  } catch (error) {
    console.error("POST /auth/register failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to register customer",
      },
    });
  }
});

router.post("/login", async (req, res) => {
  const validationError = validateLoginPayload(req.body);
  if (validationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validationError,
      },
    });
  }

  const { email, password } = req.body;

  try {
    const { rows } = await pool.query(
      `
        SELECT
          id,
          full_name,
          phone,
          email,
          password_hash,
          role,
          abuse_score,
          is_blacklisted,
          created_at,
          updated_at
        FROM customers
        WHERE email = $1
        LIMIT 1
      `,
      [email.trim().toLowerCase()],
    );

    if (rows.length === 0 || !rows[0].password_hash) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        },
      });
    }

    const customer = rows[0];
    const passwordMatches = await bcrypt.compare(password, customer.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        },
      });
    }

    if (customer.is_blacklisted) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Customer is blacklisted",
        },
      });
    }

    const token = jwt.sign(
      {
        sub: customer.id,
        role: customer.role,
        email: customer.email,
      },
      getJwtSecret(),
      { expiresIn: "7d" },
    );

    await pool.query(
      `
        UPDATE customers
        SET
          last_login_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `,
      [customer.id],
    );

    return res.json({
      token,
      customer: mapCustomer(customer),
    });
  } catch (error) {
    console.error("POST /auth/login failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to login",
      },
    });
  }
});

export default router;

function validateRegisterPayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!body.fullName?.trim()) {
    return "fullName is required";
  }

  if (!body.phone?.trim()) {
    return "phone is required";
  }

  if (!body.email?.trim()) {
    return "email is required";
  }

  if (!body.password || String(body.password).length < 8) {
    return "password must be at least 8 characters";
  }

  return null;
}

function validateLoginPayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!body.email?.trim()) {
    return "email is required";
  }

  if (!body.password) {
    return "password is required";
  }

  return null;
}

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("Missing JWT_SECRET env");
  }

  return jwtSecret;
}

function mapCustomer(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    abuseScore: row.abuse_score,
    isBlacklisted: row.is_blacklisted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
