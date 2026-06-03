import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/review-ai-alerts", async (_req, res) => {
  try {
    const [summaryResult, aspectResult, productResult, reviewResult] = await Promise.all([
      pool.query(
        `
          SELECT
            COUNT(pr.id)::int AS visible_review_count,
            COUNT(pra.id)::int AS analyzed_review_count,
            COUNT(pr.id) FILTER (WHERE pra.id IS NULL)::int AS unanalyzed_review_count,
            COUNT(pr.id) FILTER (
              WHERE ${reviewNeedsAttentionSql()}
            )::int AS needs_attention_count,
            COUNT(pr.id) FILTER (
              WHERE ${reviewNeedsAttentionSql()}
                AND pr.created_at >= NOW() - INTERVAL '7 days'
            )::int AS needs_attention_7d_count
          FROM product_reviews pr
          LEFT JOIN product_review_ai_analysis pra ON pra.review_id = pr.id
          WHERE pr.status = 'visible'
        `,
      ),
      pool.query(
        `
          SELECT
            aspect_item->>'key' AS aspect_key,
            aspect_item->>'aspect' AS aspect_name,
            COUNT(*)::int AS count,
            COALESCE(ROUND(AVG((aspect_item->>'confidence')::numeric), 4), 0) AS avg_confidence
          FROM product_review_ai_analysis pra
          JOIN product_reviews pr ON pr.id = pra.review_id
          CROSS JOIN LATERAL jsonb_array_elements(COALESCE(pra.aspects, '[]'::jsonb)) AS aspect_item
          WHERE pr.status = 'visible'
            AND aspect_item->>'label' = 'NEGATIVE'
          GROUP BY aspect_key, aspect_name
          ORDER BY count DESC, avg_confidence DESC, aspect_name ASC
          LIMIT 6
        `,
      ),
      pool.query(
        `
          SELECT
            p.id AS product_id,
            p.sku,
            p.name AS product_name,
            COUNT(pr.id)::int AS needs_attention_count,
            COUNT(pr.id) FILTER (WHERE pra.overall_label = 'NEGATIVE')::int AS negative_overall_count,
            COALESCE(ROUND(AVG(pr.rating)::numeric, 2), 0) AS rating_average,
            MAX(pr.created_at) AS latest_review_at
          FROM product_reviews pr
          JOIN product_review_ai_analysis pra ON pra.review_id = pr.id
          JOIN products p ON p.id = pr.product_id
          WHERE pr.status = 'visible'
            AND ${reviewNeedsAttentionSql()}
          GROUP BY p.id, p.sku, p.name
          ORDER BY needs_attention_count DESC, latest_review_at DESC, p.id ASC
          LIMIT 6
        `,
      ),
      pool.query(
        `
          SELECT
            pr.id,
            pr.product_id,
            pr.rating,
            pr.comment,
            pr.customer_name_snapshot,
            pr.product_name_snapshot,
            pr.created_at,
            p.name AS product_name,
            p.sku,
            pra.overall_label,
            pra.overall_confidence,
            pra.aspects,
            pra.analyzed_at
          FROM product_reviews pr
          JOIN product_review_ai_analysis pra ON pra.review_id = pr.id
          JOIN products p ON p.id = pr.product_id
          WHERE pr.status = 'visible'
            AND ${reviewNeedsAttentionSql()}
          ORDER BY pr.created_at DESC, pr.id DESC
          LIMIT 8
        `,
      ),
    ]);

    const summary = summaryResult.rows[0] || {};
    const analyzedReviewCount = Number(summary.analyzed_review_count || 0);
    const needsAttentionCount = Number(summary.needs_attention_count || 0);

    return res.json({
      generatedAt: new Date().toISOString(),
      visibleReviewCount: Number(summary.visible_review_count || 0),
      analyzedReviewCount,
      unanalyzedReviewCount: Number(summary.unanalyzed_review_count || 0),
      needsAttentionCount,
      needsAttention7dCount: Number(summary.needs_attention_7d_count || 0),
      attentionRate:
        analyzedReviewCount > 0
          ? Number((needsAttentionCount / analyzedReviewCount).toFixed(4))
          : 0,
      topNegativeAspects: aspectResult.rows.map(mapNegativeAspectRow),
      topProducts: productResult.rows.map(mapReviewAlertProductRow),
      recentReviews: reviewResult.rows.map(mapReviewAlertReviewRow),
    });
  } catch (error) {
    console.error("GET /admin/analytics/review-ai-alerts failed:", error);
    return res.status(500).json(internalError("Failed to fetch review AI alerts"));
  }
});

router.get("/sales-by-product", async (req, res) => {
  const dateRange = parseAnalyticsDateRange(req.query);
  if (dateRange.error) {
    return res.status(400).json(validationError(dateRange.error));
  }

  try {
    const { rows } = await pool.query(
      `
        WITH sales_window AS (
          SELECT
            oi.product_id,
            SUM(oi.quantity)::bigint AS sold_qty,
            SUM(oi.quantity * oi.price_at_purchase)::numeric(14, 2) AS revenue,
            COUNT(DISTINCT oi.order_id)::bigint AS order_count
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.status = 'completed'
            AND o.updated_at >= $1
            AND o.updated_at < $2
          GROUP BY oi.product_id
        )
        SELECT
          p.id,
          p.sku,
          p.name,
          p.base_price,
          p.category,
          p.category_id,
          p.image_url,
          COALESCE(i.stock_qty, 0) AS stock_qty,
          COALESCE(i.reserved_qty, 0) AS reserved_qty,
          COALESCE(i.min_stock_level, 0) AS min_stock_level,
          COALESCE(i.ads, 0) AS ads,
          COALESCE(i.doi, 0) AS doi,
          i.last_calculated_at,
          COALESCE(sw.sold_qty, 0) AS sold_qty,
          COALESCE(sw.revenue, 0) AS revenue,
          COALESCE(sw.order_count, 0) AS order_count
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        LEFT JOIN sales_window sw ON sw.product_id = p.id
        ORDER BY sold_qty DESC, revenue DESC, p.id ASC
      `,
      [dateRange.from, dateRange.toExclusive],
    );

    return res.json({
      generatedAt: new Date().toISOString(),
      from: formatDateOnly(dateRange.from),
      to: formatDateOnly(dateRange.toInclusive),
      items: rows.map(mapSalesAnalyticsRow),
    });
  } catch (error) {
    console.error("GET /admin/analytics/sales-by-product failed:", error);
    return res.status(500).json(internalError("Failed to fetch product sales analytics"));
  }
});

export default router;

function parseAnalyticsDateRange(query) {
  const toInclusive = query.to == null ? startOfUtcDay(new Date()) : parseDateOnly(query.to);
  if (query.to != null && !toInclusive) {
    return { error: "to must be in YYYY-MM-DD format" };
  }

  const from =
    query.from == null
      ? new Date(toInclusive.getTime() - 6 * DAY_IN_MS)
      : parseDateOnly(query.from);
  if (query.from != null && !from) {
    return { error: "from must be in YYYY-MM-DD format" };
  }

  if (from.getTime() > toInclusive.getTime()) {
    return { error: "from must be earlier than or equal to to" };
  }

  return {
    from,
    toInclusive,
    toExclusive: new Date(toInclusive.getTime() + DAY_IN_MS),
  };
}

function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return null;
  }

  const parsed = new Date(`${value.trim()}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfUtcDay(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function mapSalesAnalyticsRow(row) {
  const stockQty = Number(row.stock_qty);
  const reservedQty = Number(row.reserved_qty);
  const availableQty = stockQty - reservedQty;
  const minStockLevel = Number(row.min_stock_level);

  return {
    productId: Number(row.id),
    sku: row.sku,
    productName: row.name,
    categoryId: row.category_id == null ? null : Number(row.category_id),
    category: row.category,
    imageUrl: row.image_url,
    basePrice: Number(row.base_price),
    stockQty,
    reservedQty,
    availableQty,
    minStockLevel,
    ads: Number(row.ads),
    doi: Number(row.doi),
    lastCalculatedAt: row.last_calculated_at,
    soldQty: Number(row.sold_qty),
    revenue: Number(row.revenue),
    orderCount: Number(row.order_count),
  };
}

function reviewNeedsAttentionSql() {
  return `
    (
      pra.overall_label = 'NEGATIVE'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(pra.aspects, '[]'::jsonb)) AS attention_aspect
        WHERE attention_aspect->>'label' = 'NEGATIVE'
      )
    )
  `;
}

function mapNegativeAspectRow(row) {
  return {
    key: row.aspect_key || "",
    aspect: row.aspect_name || row.aspect_key || "Unknown",
    count: Number(row.count || 0),
    averageConfidence: Number(row.avg_confidence || 0),
  };
}

function mapReviewAlertProductRow(row) {
  return {
    productId: Number(row.product_id),
    sku: row.sku,
    productName: row.product_name,
    needsAttentionCount: Number(row.needs_attention_count || 0),
    negativeOverallCount: Number(row.negative_overall_count || 0),
    ratingAverage: Number(row.rating_average || 0),
    latestReviewAt: row.latest_review_at,
  };
}

function mapReviewAlertReviewRow(row) {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    productName: row.product_name_snapshot || row.product_name,
    sku: row.sku,
    customerName: row.customer_name_snapshot,
    rating: Number(row.rating),
    comment: row.comment || "",
    createdAt: row.created_at,
    aiAnalysis: {
      overall: {
        label: row.overall_label,
        confidence: Number(row.overall_confidence || 0),
      },
      aspects: Array.isArray(row.aspects) ? row.aspects : [],
      analyzedAt: row.analyzed_at,
    },
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

function internalError(message) {
  return {
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  };
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
