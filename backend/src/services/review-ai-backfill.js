import { pool } from "../db/pool.js";
import { analyzeAndStoreProductReview } from "./review-ai.js";

export const DEFAULT_REVIEW_AI_BACKFILL_LIMIT = 100;
export const DEFAULT_REVIEW_AI_BACKFILL_BATCH_SIZE = 20;
export const MAX_REVIEW_AI_BACKFILL_LIMIT = 100;

export async function runReviewAiBackfill(options = {}) {
  const normalizedOptions = normalizeBackfillOptions(options);
  const startedAt = Date.now();
  let lastId = 0;
  let scanned = 0;
  let analyzed = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  while (scanned < normalizedOptions.limit) {
    const remaining = normalizedOptions.limit - scanned;
    const batchLimit = Math.min(normalizedOptions.batchSize, remaining);
    const reviews = await loadReviewBatch({
      ...normalizedOptions,
      lastId,
      limit: batchLimit,
    });

    if (reviews.length === 0) {
      break;
    }

    for (const review of reviews) {
      lastId = Math.max(lastId, Number(review.id));
      scanned += 1;

      if (normalizedOptions.dryRun) {
        skipped += 1;
        continue;
      }

      try {
        const analysis = await analyzeAndStoreProductReview(review);
        if (analysis) {
          analyzed += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        errors.push({
          reviewId: Number(review.id),
          message: error.message,
        });
      }
    }
  }

  return {
    scanned,
    analyzed,
    skipped,
    failed,
    errors,
    durationMs: Date.now() - startedAt,
    options: normalizedOptions,
  };
}

async function loadReviewBatch({ force, includeDeleted, lastId, limit }) {
  const conditions = ["pr.id > $1", "NULLIF(BTRIM(pr.comment), '') IS NOT NULL"];
  const params = [lastId];

  if (!force) {
    conditions.push("pra.review_id IS NULL");
  }

  if (!includeDeleted) {
    conditions.push("pr.status <> 'deleted'");
  }

  params.push(limit);

  const { rows } = await pool.query(
    `
      SELECT
        pr.id,
        pr.product_id,
        pr.comment
      FROM product_reviews pr
      LEFT JOIN product_review_ai_analysis pra ON pra.review_id = pr.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY pr.id ASC
      LIMIT $${params.length}
    `,
    params,
  );

  return rows;
}

function normalizeBackfillOptions(options) {
  return {
    limit: clampPositiveInteger(
      options.limit,
      DEFAULT_REVIEW_AI_BACKFILL_LIMIT,
      MAX_REVIEW_AI_BACKFILL_LIMIT,
    ),
    batchSize: clampPositiveInteger(
      options.batchSize,
      DEFAULT_REVIEW_AI_BACKFILL_BATCH_SIZE,
      DEFAULT_REVIEW_AI_BACKFILL_LIMIT,
    ),
    force: Boolean(options.force),
    dryRun: Boolean(options.dryRun),
    includeDeleted: Boolean(options.includeDeleted),
  };
}

function clampPositiveInteger(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}
