import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ALLOWED_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function getR2Config() {
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
      ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`
      : "");
  const publicBaseUrl =
    process.env.R2_PUBLIC_BASE_URL?.trim() || process.env.BASE_URL_IMAGE?.trim() || "";

  if (!bucketName || !accessKeyId || !secretAccessKey || !endpoint || !publicBaseUrl) {
    return null;
  }

  return {
    bucketName,
    endpoint,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
  };
}

export function isAllowedImageContentType(contentType) {
  return ALLOWED_IMAGE_CONTENT_TYPES.has(
    String(contentType || "")
      .trim()
      .toLowerCase(),
  );
}

export function buildProductImageKey(productId, fileName) {
  const ext = normalizeImageExtension(fileName);
  return `products/${productId}/main-${Date.now()}.${ext}`;
}

export function buildRefundEvidenceKey({ customerId, orderId, fileName }) {
  const ext = normalizeImageExtension(fileName);
  return `refund-evidence/customer-${customerId}/order-${orderId}-${Date.now()}.${ext}`;
}

export async function createProductImageUploadUrl({ productId, fileName, contentType }) {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2 upload is not configured");
  }

  const key = buildProductImageKey(productId, fileName);
  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  return {
    uploadUrl,
    objectKey: key,
    publicUrl: `${config.publicBaseUrl}/${key}`,
    expiresIn: 300,
  };
}

export async function uploadProductImageObject({ productId, fileName, contentType, body }) {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2 upload is not configured");
  }

  const key = buildProductImageKey(productId, fileName);
  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      ContentType: contentType,
      Body: body,
    }),
  );

  return {
    objectKey: key,
    publicUrl: `${config.publicBaseUrl}/${key}`,
  };
}

export async function createRefundEvidenceUploadUrl({
  customerId,
  orderId,
  fileName,
  contentType,
}) {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2 upload is not configured");
  }

  const key = buildRefundEvidenceKey({ customerId, orderId, fileName });
  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  return {
    uploadUrl,
    objectKey: key,
    publicUrl: `${config.publicBaseUrl}/${key}`,
    expiresIn: 300,
  };
}

export function isValidImageUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeImageExtension(fileName) {
  const rawExt = path
    .extname(String(fileName || ""))
    .toLowerCase()
    .replace(/^\./, "");
  if (rawExt === "jpg") {
    return "jpeg";
  }

  if (["jpeg", "png", "webp", "gif"].includes(rawExt)) {
    return rawExt;
  }

  return "jpeg";
}
