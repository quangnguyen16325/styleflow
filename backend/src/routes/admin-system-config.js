import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    await ensurePaymentConfigDefaults();

    const { rows } = await pool.query(
      `
        SELECT
          id,
          config_group,
          config_key,
          config_value,
          config_type,
          description,
          created_at,
          updated_at
        FROM system_config
        ORDER BY config_group ASC, config_key ASC
      `,
    );

    return res.json(rows.map(mapSystemConfigRow));
  } catch (error) {
    console.error("GET /admin/system-config failed:", error);
    return res.status(500).json(internalError("Failed to fetch system config"));
  }
});

router.patch("/", async (req, res) => {
  if (!Array.isArray(req.body?.items) || req.body.items.length === 0) {
    return res.status(400).json(validationError("items must be a non-empty array"));
  }

  const normalizedItems = [];
  for (const item of req.body.items) {
    const normalizedItem = normalizeSystemConfigItem(item);
    if (!normalizedItem) {
      return res.status(400).json(validationError("Each config item is invalid"));
    }

    if (!ALLOWED_SYSTEM_CONFIG_KEYS.has(normalizedItem.configKey)) {
      return res
        .status(400)
        .json(validationError(`configKey ${normalizedItem.configKey} is not allowed`));
    }

    normalizedItems.push(normalizedItem);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensurePaymentConfigDefaults(client);

    const updatedRows = [];
    for (const item of normalizedItems) {
      const { rows } = await client.query(
        `
          INSERT INTO system_config (
            config_group,
            config_key,
            config_value,
            config_type,
            description
          )
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (config_key)
          DO UPDATE SET
            config_value = EXCLUDED.config_value,
            config_type = EXCLUDED.config_type,
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING
            id,
            config_group,
            config_key,
            config_value,
            config_type,
            description,
            created_at,
            updated_at
        `,
        [item.configGroup, item.configKey, item.configValue, item.configType, item.description],
      );
      updatedRows.push(rows[0]);
    }

    await client.query("COMMIT");
    return res.json(updatedRows.map(mapSystemConfigRow));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PATCH /admin/system-config failed:", error);
    return res.status(500).json(internalError("Failed to update system config"));
  } finally {
    client.release();
  }
});

export default router;

export async function ensurePaymentConfigDefaults(client = pool) {
  await client.query(
    `
      INSERT INTO system_config (
        config_group,
        config_key,
        config_value,
        config_type,
        description
      )
      VALUES
        (
          'payment',
          'payment.active_gateway',
          'PAYPAL',
          'string',
          'Currently active payment gateway for checkout'
        ),
        (
          'payment',
          'payment.maintenance_mode',
          'false',
          'boolean',
          'Whether payment maintenance mode is enabled'
        )
      ON CONFLICT (config_key) DO NOTHING
    `,
  );
}

function normalizeSystemConfigItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const configKey = String(item.configKey ?? "").trim();
  const configType = String(item.configType ?? "")
    .trim()
    .toLowerCase();
  const description = String(item.description ?? "").trim() || null;
  if (!configKey || !SYSTEM_CONFIG_TYPES.has(configType)) {
    return null;
  }

  return {
    configGroup: deriveConfigGroup(configKey),
    configKey,
    configValue: normalizeConfigValue(item.configValue, configType),
    configType,
    description,
  };
}

function deriveConfigGroup(configKey) {
  const [configGroup] = configKey.split(".");
  return configGroup || "general";
}

function normalizeConfigValue(value, configType) {
  switch (configType) {
    case "boolean":
      return String(value === true || value === "true");
    case "number":
      return String(Number(value));
    default:
      return value == null ? "" : String(value);
  }
}

function mapSystemConfigRow(row) {
  return {
    id: Number(row.id),
    configGroup: row.config_group,
    configKey: row.config_key,
    configValue: parseConfigValue(row.config_value, row.config_type),
    configType: row.config_type,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseConfigValue(value, configType) {
  switch (configType) {
    case "boolean":
      return value === "true";
    case "number":
      return Number(value);
    default:
      return value;
  }
}

function validationError(message) {
  return {
    error: {
      code: "VALIDATION_ERROR",
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

const SYSTEM_CONFIG_TYPES = new Set(["string", "boolean", "number"]);
const ALLOWED_SYSTEM_CONFIG_KEYS = new Set(["payment.active_gateway", "payment.maintenance_mode"]);
