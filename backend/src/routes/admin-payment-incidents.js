import { Router } from "express";
import { pool } from "../db/pool.js";
import { ensurePaymentConfigDefaults } from "./admin-system-config.js";

const router = Router();

router.get("/active", async (_req, res) => {
  try {
    await ensurePaymentConfigDefaults();

    const [configResult, recentLogsResult, pendingOrdersResult] = await Promise.all([
      pool.query(
        `
          SELECT config_key, config_value, config_type
          FROM system_config
          WHERE config_key IN ('payment.active_gateway', 'payment.maintenance_mode')
        `,
      ),
      pool.query(
        `
          SELECT
            id,
            order_id,
            incident_id,
            gateway_name,
            transaction_ref,
            source,
            http_status,
            error_code,
            payment_status,
            raw_response,
            created_at
          FROM payment_logs
          WHERE created_at >= NOW() - INTERVAL '15 minutes'
          ORDER BY created_at DESC, id DESC
        `,
      ),
      pool.query(
        `
          SELECT COUNT(*)::int AS pending_count
          FROM orders
          WHERE payment_status IN ('payment_pending', 'payment_unknown')
            AND created_at < NOW() - INTERVAL '10 minutes'
        `,
      ),
    ]);

    const configMap = new Map(
      configResult.rows.map((row) => [
        row.config_key,
        parseConfigValue(row.config_value, row.config_type),
      ]),
    );

    const recentLogs = recentLogsResult.rows.map(mapPaymentLogRow);
    const outageSignals = recentLogs.filter(isOutageSignal);
    const activeIncident =
      Boolean(configMap.get("payment.maintenance_mode")) || outageSignals.length > 0;

    return res.json({
      active: activeIncident,
      activeGateway: configMap.get("payment.active_gateway") ?? "PAYPAL",
      maintenanceMode: Boolean(configMap.get("payment.maintenance_mode")),
      pendingCount: Number(pendingOrdersResult.rows[0]?.pending_count ?? 0),
      outageSignalCount: outageSignals.length,
      recentSignals: outageSignals.slice(0, 20),
    });
  } catch (error) {
    console.error("GET /admin/payment-incidents/active failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch active payment incident summary",
      },
    });
  }
});

export default router;

function mapPaymentLogRow(row) {
  return {
    id: Number(row.id),
    orderId: row.order_id == null ? null : Number(row.order_id),
    incidentId: row.incident_id,
    gatewayName: row.gateway_name,
    transactionRef: row.transaction_ref,
    source: row.source,
    httpStatus: row.http_status,
    errorCode: row.error_code,
    paymentStatus: row.payment_status,
    rawResponse: row.raw_response,
    createdAt: row.created_at,
  };
}

function isOutageSignal(log) {
  if (log.source === "payment_service" && [502, 503, 504].includes(log.httpStatus)) {
    return true;
  }

  if (typeof log.errorCode === "string" && /TIMEOUT|UNAVAILABLE|NETWORK/i.test(log.errorCode)) {
    return true;
  }

  return false;
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
