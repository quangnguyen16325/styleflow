import { pool } from "../db/pool.js";

const AI_SERVICE_URL = normalizeBaseUrl(process.env.AI_SERVICE_URL);
const AI_TIMEOUT_MS = parsePositiveInteger(process.env.AI_SERVICE_TIMEOUT_MS) || 3500;

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
    console.warn(`AI review analysis skipped for review ${review.id}:`, error.message);
    return null;
  }
}

async function requestReviewAnalysis(text) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/analyze-review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI service returned HTTP ${response.status}`);
    }

    const data = await response.json();
    validateAnalysisResponse(data);
    return data;
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
