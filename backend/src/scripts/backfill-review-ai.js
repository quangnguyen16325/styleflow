import { pool } from "../db/pool.js";
import { runReviewAiBackfill } from "../services/review-ai-backfill.js";

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log(
    [
      "Starting review AI backfill",
      `limit=${options.limit || "default"}`,
      `batchSize=${options.batchSize || "default"}`,
      `force=${options.force}`,
      `dryRun=${options.dryRun}`,
      `includeDeleted=${options.includeDeleted}`,
    ].join(" | "),
  );

  const result = await runReviewAiBackfill(options);

  console.log(
    [
      "Review AI backfill completed",
      `scanned=${result.scanned}`,
      `analyzed=${result.analyzed}`,
      `skipped=${result.skipped}`,
      `failed=${result.failed}`,
      `durationMs=${result.durationMs}`,
    ].join(" | "),
  );

  result.errors.forEach((error) => {
    console.error(`failed review=${error.reviewId}: ${error.message}`);
  });
}

function parseArgs(args) {
  const options = {
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
