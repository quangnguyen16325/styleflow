import { pool } from "../db/pool.js";
import { analyzeAndStoreProductReview } from "../services/review-ai.js";

const DEFAULT_LIMIT = 100;
const DEFAULT_BATCH_SIZE = 20;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();

  console.log(
    [
      "Starting review AI backfill",
      `limit=${options.limit}`,
      `batchSize=${options.batchSize}`,
      `force=${options.force}`,
      `dryRun=${options.dryRun}`,
      `includeDeleted=${options.includeDeleted}`,
    ].join(" | "),
  );

  let lastId = 0;
  let scanned = 0;
  let analyzed = 0;
  let skipped = 0;
  let failed = 0;

  while (scanned < options.limit) {
    const remaining = options.limit - scanned;
    const batchLimit = Math.min(options.batchSize, remaining);
    const reviews = await loadReviewBatch({ ...options, lastId, limit: batchLimit });

    if (reviews.length === 0) {
      break;
    }

    for (const review of reviews) {
      lastId = Math.max(lastId, Number(review.id));
      scanned += 1;

      if (options.dryRun) {
        skipped += 1;
        console.log(`[dry-run] review=${review.id} product=${review.product_id}`);
        continue;
      }

      try {
        const analysis = await analyzeAndStoreProductReview(review);
        if (analysis) {
          analyzed += 1;
          console.log(
            `analyzed review=${review.id} product=${review.product_id} overall=${analysis.overall.label}`,
          );
        } else {
          skipped += 1;
          console.log(`skipped review=${review.id} product=${review.product_id}`);
        }
      } catch (error) {
        failed += 1;
        console.error(`failed review=${review.id}:`, error.message);
      }
    }
  }

  console.log(
    [
      "Review AI backfill completed",
      `scanned=${scanned}`,
      `analyzed=${analyzed}`,
      `skipped=${skipped}`,
      `failed=${failed}`,
      `durationMs=${Date.now() - startedAt}`,
    ].join(" | "),
  );
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

function parseArgs(args) {
  const options = {
    limit: DEFAULT_LIMIT,
    batchSize: DEFAULT_BATCH_SIZE,
    force: false,
    dryRun: false,
    includeDeleted: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--include-deleted") {
      options.includeDeleted = true;
      continue;
    }

    if (arg === "--limit") {
      options.limit = parsePositiveInteger(args[index + 1], "limit");
      index += 1;
      continue;
    }

    if (arg === "--batch-size") {
      options.batchSize = parsePositiveInteger(args[index + 1], "batch-size");
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function parsePositiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return parsed;
}

main()
  .catch((error) => {
    console.error("Review AI backfill failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
