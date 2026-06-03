import { pool } from "../db/pool.js";

const AI_SERVICE_URL = normalizeBaseUrl(process.env.AI_SERVICE_URL);
const AI_TIMEOUT_MS = parsePositiveInteger(process.env.AI_SERVICE_TIMEOUT_MS) || 3500;
const AI_RETRY_ATTEMPTS = parseNonNegativeInteger(process.env.AI_SERVICE_RETRY_ATTEMPTS) ?? 1;

export async function analyzeAndStoreProductReview(review) {
  if (!review?.id || !review?.product_id) {
    return null;
  }

  const comment = String(review.comment || "").trim();
  if (!comment) {
    await deleteReviewAiAnalysis(review.id);
    return null;
  }

  if (!AI_SERVICE_URL) {
    return null;
  }

  try {
    const analysis = await requestReviewAnalysis(comment);
    await upsertReviewAiAnalysis(review, analysis);
    return analysis;
  } catch (error) {
    logAiPipelineWarning(`analysis skipped for review ${review.id}: ${error.message}`);
    return null;
  }
}

export async function getReviewAiServiceHealth() {
  if (!AI_SERVICE_URL) {
    return {
      configured: false,
      status: "unconfigured",
      timeoutMs: AI_TIMEOUT_MS,
      retryAttempts: AI_RETRY_ATTEMPTS,
      error: "AI_SERVICE_URL is not configured",
    };
  }

  const startedAt = Date.now();
  try {
    const data = await requestJsonWithRetry(`${AI_SERVICE_URL}/health`, {
      method: "GET",
      timeoutMs: AI_TIMEOUT_MS,
      retries: AI_RETRY_ATTEMPTS,
    });

    return {
      configured: true,
      status: data?.status === "ok" ? "ok" : "degraded",
      responseTimeMs: Date.now() - startedAt,
      timeoutMs: AI_TIMEOUT_MS,
      retryAttempts: AI_RETRY_ATTEMPTS,
      device: data?.device || null,
      modelVersion: data?.modelVersion || null,
      raw: data,
    };
  } catch (error) {
    logAiPipelineWarning(`healthcheck failed: ${error.message}`);
    return {
      configured: true,
      status: "down",
      responseTimeMs: Date.now() - startedAt,
      timeoutMs: AI_TIMEOUT_MS,
      retryAttempts: AI_RETRY_ATTEMPTS,
      error: error.message,
    };
  }
}

async function requestReviewAnalysis(text) {
  const data = await requestJsonWithRetry(`${AI_SERVICE_URL}/analyze-review`, {
    method: "POST",
    body: JSON.stringify({ text }),
    timeoutMs: AI_TIMEOUT_MS,
    retries: AI_RETRY_ATTEMPTS,
  });
  validateAnalysisResponse(data);
  return data;
}

async function requestJsonWithRetry(url, { method, body = null, timeoutMs, retries }) {
  let lastError = null;
  const attempts = retries + 1;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await requestJson(url, { method, body, timeoutMs });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        logAiPipelineWarning(
          `request attempt ${attempt}/${attempts} failed for ${url}: ${error.message}`,
        );
      }
    }
  }

  throw lastError;
}

async function requestJson(url, { method, body = null, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI service returned HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function upsertReviewAiAnalysis(review, analysis) {
  await pool.query(
    `
      INSERT INTO product_review_ai_analysis (
        review_id,
        product_id,
        overall_label,
        overall_confidence,
        aspects,
        model_version,
        raw_response
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb)
      ON CONFLICT (review_id)
      DO UPDATE SET
        product_id = EXCLUDED.product_id,
        overall_label = EXCLUDED.overall_label,
        overall_confidence = EXCLUDED.overall_confidence,
        aspects = EXCLUDED.aspects,
        model_version = EXCLUDED.model_version,
        raw_response = EXCLUDED.raw_response,
        analyzed_at = NOW(),
        updated_at = NOW()
    `,
    [
      review.id,
      review.product_id,
      analysis.overall.label,
      Number(analysis.overall.confidence || 0),
      JSON.stringify(Array.isArray(analysis.aspects) ? analysis.aspects : []),
      analysis.modelVersion || null,
      JSON.stringify(analysis),
    ],
  );
}

async function deleteReviewAiAnalysis(reviewId) {
  await pool.query("DELETE FROM product_review_ai_analysis WHERE review_id = $1", [reviewId]);
}

function validateAnalysisResponse(data) {
  if (!data || typeof data !== "object") {
    throw new Error("AI service returned an invalid response");
  }

  if (!data.overall?.label) {
    throw new Error("AI service response is missing overall label");
  }

  if (!Array.isArray(data.aspects)) {
    throw new Error("AI service response is missing aspects");
  }
}

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim();
  return normalized ? normalized.replace(/\/+$/, "") : null;
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function logAiPipelineWarning(message) {
  console.warn(`[review-ai] ${message}`);
}
