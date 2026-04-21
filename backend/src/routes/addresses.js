import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const customerId = getCustomerIdFromRequest(req);
  if (!customerId) {
    return res.status(400).json(validationError("Customer id must be a positive integer"));
  }

  try {
    const customerExists = await checkCustomerExists(customerId);
    if (!customerExists) {
      return res.status(404).json(notFoundError("Customer not found"));
    }

    const { rows } = await pool.query(
      `
        SELECT
          id,
          customer_id,
          label,
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
          postal_code,
          is_default,
          created_at,
          updated_at
        FROM customer_addresses
        WHERE customer_id = $1
        ORDER BY is_default DESC, id ASC
      `,
      [customerId],
    );

    return res.json(rows.map(mapAddressRow));
  } catch (error) {
    console.error(`GET /customers/${customerId}/addresses failed:`, error);
    return res.status(500).json(internalError("Failed to fetch customer addresses"));
  }
});

router.get("/:addressId", async (req, res) => {
  const customerId = getCustomerIdFromRequest(req);
  const addressId = parsePositiveInteger(req.params.addressId);
  if (!customerId) {
    return res.status(400).json(validationError("Customer id must be a positive integer"));
  }

  if (!addressId) {
    return res.status(400).json(validationError("Address id must be a positive integer"));
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT
          id,
          customer_id,
          label,
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
          postal_code,
          is_default,
          created_at,
          updated_at
        FROM customer_addresses
        WHERE customer_id = $1 AND id = $2
        LIMIT 1
      `,
      [customerId, addressId],
    );

    if (rows.length === 0) {
      return res.status(404).json(notFoundError("Address not found"));
    }

    return res.json(mapAddressRow(rows[0]));
  } catch (error) {
    console.error(`GET /customers/${customerId}/addresses/${addressId} failed:`, error);
    return res.status(500).json(internalError("Failed to fetch address"));
  }
});

router.post("/", async (req, res) => {
  const customerId = getCustomerIdFromRequest(req);
  if (!customerId) {
    return res.status(400).json(validationError("Customer id must be a positive integer"));
  }

  const payloadError = validateAddressPayload(req.body, { partial: false });
  if (payloadError) {
    return res.status(400).json(validationError(payloadError));
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customerExists = await checkCustomerExists(customerId, client);
    if (!customerExists) {
      await client.query("ROLLBACK");
      return res.status(404).json(notFoundError("Customer not found"));
    }

    const normalizedPayload = normalizeAddressPayload(req.body);
    const shouldBeDefault =
      normalizedPayload.isDefault ?? (await countAddresses(customerId, client)) === 0;

    if (shouldBeDefault) {
      await client.query(
        `
          UPDATE customer_addresses
          SET
            is_default = FALSE,
            updated_at = NOW()
          WHERE customer_id = $1
        `,
        [customerId],
      );
    }

    const { rows } = await client.query(
      `
        INSERT INTO customer_addresses (
          customer_id,
          label,
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
          postal_code,
          is_default
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING
          id,
          customer_id,
          label,
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
          postal_code,
          is_default,
          created_at,
          updated_at
      `,
      [
        customerId,
        normalizedPayload.label,
        normalizedPayload.receiverName,
        normalizedPayload.receiverPhone,
        normalizedPayload.addressLine,
        normalizedPayload.provinceCode,
        normalizedPayload.districtCode,
        normalizedPayload.wardCode,
        normalizedPayload.ward,
        normalizedPayload.district,
        normalizedPayload.city,
        normalizedPayload.country,
        normalizedPayload.postalCode,
        shouldBeDefault,
      ],
    );

    await client.query("COMMIT");
    return res.status(201).json(mapAddressRow(rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`POST /customers/${customerId}/addresses failed:`, error);
    return res.status(500).json(internalError("Failed to create address"));
  } finally {
    client.release();
  }
});

router.patch("/:addressId", async (req, res) => {
  const customerId = getCustomerIdFromRequest(req);
  const addressId = parsePositiveInteger(req.params.addressId);
  if (!customerId) {
    return res.status(400).json(validationError("Customer id must be a positive integer"));
  }

  if (!addressId) {
    return res.status(400).json(validationError("Address id must be a positive integer"));
  }

  const payloadError = validateAddressPayload(req.body, { partial: true });
  if (payloadError) {
    return res.status(400).json(validationError(payloadError));
  }

  const normalizedPayload = normalizeAddressPayload(req.body, { partial: true });
  if (Object.keys(normalizedPayload).length === 0) {
    return res.status(400).json(validationError("At least one address field is required"));
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const addressResult = await client.query(
      `
        SELECT id, customer_id, is_default
        FROM customer_addresses
        WHERE customer_id = $1 AND id = $2
        LIMIT 1
      `,
      [customerId, addressId],
    );

    if (addressResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json(notFoundError("Address not found"));
    }

    if (normalizedPayload.isDefault === true) {
      await client.query(
        `
          UPDATE customer_addresses
          SET
            is_default = FALSE,
            updated_at = NOW()
          WHERE customer_id = $1 AND id <> $2
        `,
        [customerId, addressId],
      );
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(normalizedPayload)) {
      fields.push(`${toSnakeCase(key)} = $${paramIndex}`);
      values.push(value);
      paramIndex += 1;
    }

    fields.push(`updated_at = NOW()`);
    values.push(customerId, addressId);

    const { rows } = await client.query(
      `
        UPDATE customer_addresses
        SET ${fields.join(", ")}
        WHERE customer_id = $${paramIndex} AND id = $${paramIndex + 1}
        RETURNING
          id,
          customer_id,
          label,
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
          postal_code,
          is_default,
          created_at,
          updated_at
      `,
      values,
    );

    if (normalizedPayload.isDefault === false) {
      const defaultCount = await countDefaultAddresses(customerId, client);
      if (defaultCount === 0) {
        await assignFallbackDefaultAddress(customerId, client);
      }
    }

    await client.query("COMMIT");
    return res.json(mapAddressRow(rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`PATCH /customers/${customerId}/addresses/${addressId} failed:`, error);
    return res.status(500).json(internalError("Failed to update address"));
  } finally {
    client.release();
  }
});

router.delete("/:addressId", async (req, res) => {
  const customerId = getCustomerIdFromRequest(req);
  const addressId = parsePositiveInteger(req.params.addressId);
  if (!customerId) {
    return res.status(400).json(validationError("Customer id must be a positive integer"));
  }

  if (!addressId) {
    return res.status(400).json(validationError("Address id must be a positive integer"));
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
        DELETE FROM customer_addresses
        WHERE customer_id = $1 AND id = $2
        RETURNING id, is_default
      `,
      [customerId, addressId],
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json(notFoundError("Address not found"));
    }

    if (rows[0].is_default) {
      await assignFallbackDefaultAddress(customerId, client);
    }

    await client.query("COMMIT");
    return res.status(204).send();
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`DELETE /customers/${customerId}/addresses/${addressId} failed:`, error);
    return res.status(500).json(internalError("Failed to delete address"));
  } finally {
    client.release();
  }
});

export default router;

async function checkCustomerExists(customerId, client = pool) {
  const { rows } = await client.query(
    `
      SELECT id
      FROM customers
      WHERE id = $1
      LIMIT 1
    `,
    [customerId],
  );

  return rows.length > 0;
}

async function countAddresses(customerId, client) {
  const { rows } = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM customer_addresses
      WHERE customer_id = $1
    `,
    [customerId],
  );

  return rows[0].count;
}

async function countDefaultAddresses(customerId, client) {
  const { rows } = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM customer_addresses
      WHERE customer_id = $1 AND is_default = TRUE
    `,
    [customerId],
  );

  return rows[0].count;
}

async function assignFallbackDefaultAddress(customerId, client) {
  await client.query(
    `
      UPDATE customer_addresses
      SET
        is_default = TRUE,
        updated_at = NOW()
      WHERE id = (
        SELECT id
        FROM customer_addresses
        WHERE customer_id = $1
        ORDER BY id ASC
        LIMIT 1
      )
    `,
    [customerId],
  );
}

function validateAddressPayload(body, { partial }) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const requiredFields = ["receiverName", "receiverPhone", "addressLine", "city"];
  for (const field of requiredFields) {
    if (!partial && !getTrimmedString(body[field])) {
      return `${field} is required`;
    }
  }

  const stringFields = [
    "label",
    "receiverName",
    "receiverPhone",
    "addressLine",
    "provinceCode",
    "districtCode",
    "wardCode",
    "ward",
    "district",
    "city",
    "country",
    "postalCode",
  ];

  for (const field of stringFields) {
    if (body[field] != null && !getTrimmedString(body[field])) {
      return `${field} must not be empty`;
    }
  }

  const codeFields = ["provinceCode", "districtCode", "wardCode"];
  for (const field of codeFields) {
    if (body[field] != null && !/^\d+$/.test(String(body[field]).trim())) {
      return `${field} must be a positive integer string or number`;
    }
  }

  if (body.isDefault != null && typeof body.isDefault !== "boolean") {
    return "isDefault must be a boolean";
  }

  return null;
}

function normalizeAddressPayload(body, { partial = false } = {}) {
  const normalized = {};

  if (!partial || body.label != null) {
    normalized.label = getTrimmedString(body.label) || "home";
  }

  if (!partial || body.receiverName != null) {
    normalized.receiverName = getTrimmedString(body.receiverName);
  }

  if (!partial || body.receiverPhone != null) {
    normalized.receiverPhone = getTrimmedString(body.receiverPhone);
  }

  if (!partial || body.addressLine != null) {
    normalized.addressLine = getTrimmedString(body.addressLine);
  }

  if (body.provinceCode != null) {
    normalized.provinceCode = String(body.provinceCode).trim();
  }

  if (body.districtCode != null) {
    normalized.districtCode = String(body.districtCode).trim();
  }

  if (body.wardCode != null) {
    normalized.wardCode = String(body.wardCode).trim();
  }

  if (body.ward != null) {
    normalized.ward = getTrimmedString(body.ward);
  }

  if (body.district != null) {
    normalized.district = getTrimmedString(body.district);
  }

  if (!partial || body.city != null) {
    normalized.city = getTrimmedString(body.city);
  }

  if (!partial || body.country != null) {
    normalized.country = getTrimmedString(body.country) || "Vietnam";
  }

  if (body.postalCode != null) {
    normalized.postalCode = getTrimmedString(body.postalCode);
  }

  if (body.isDefault != null) {
    normalized.isDefault = body.isDefault;
  }

  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined));
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function getCustomerIdFromRequest(req) {
  return parsePositiveInteger(req.params.customerId ?? req.authCustomer?.id);
}

function getTrimmedString(value) {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function mapAddressRow(row) {
  return {
    id: Number(row.id),
    customerId: Number(row.customer_id),
    label: row.label,
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
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSnakeCase(key) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
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
