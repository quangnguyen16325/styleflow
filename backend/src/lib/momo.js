import crypto from "crypto";

const DEFAULT_MOMO_ENDPOINT = "https://test-payment.momo.vn/v2/gateway/api/create";
const DEFAULT_REQUEST_TYPE = "payWithMethod";

export function getMomoConfig() {
  const partnerCode = process.env.MOMO_PARTNER_CODE?.trim();
  const accessKey = process.env.MOMO_ACCESS_KEY?.trim();
  const secretKey = process.env.MOMO_SECRET_KEY?.trim();

  if (!partnerCode || !accessKey || !secretKey) {
    return null;
  }

  const publicApiBaseUrl =
    process.env.PUBLIC_API_BASE_URL?.trim() || process.env.API_BASE_URL?.trim();
  const normalizedPublicApiBaseUrl = publicApiBaseUrl?.replace(/\/$/, "");

  return {
    endpoint: process.env.MOMO_ENDPOINT?.trim() || DEFAULT_MOMO_ENDPOINT,
    partnerCode,
    accessKey,
    secretKey,
    storeId: process.env.MOMO_STORE_ID?.trim() || "ECLORIA",
    redirectUrl:
      process.env.MOMO_REDIRECT_URL?.trim() ||
      (normalizedPublicApiBaseUrl
        ? `${normalizedPublicApiBaseUrl}/payments/momo/return`
        : process.env.MOBILE_APP_DEEPLINK_URL?.trim() || "ecloria://payment/momo-return"),
    ipnUrl:
      process.env.MOMO_IPN_URL?.trim() ||
      (normalizedPublicApiBaseUrl ? `${normalizedPublicApiBaseUrl}/payments/momo/ipn` : ""),
  };
}

export function buildMomoOrderId(orderId) {
  return `ORD${orderId}-${Date.now()}`;
}

export function parseMomoOrderId(value) {
  const match = String(value || "").match(/^ORD(\d+)(?:-.+)?$/i);
  if (!match) return null;

  const orderId = Number(match[1]);
  return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
}

export async function createMomoPaymentRequest({ order, customer, items = [] }) {
  const config = getMomoConfig();
  if (!config) {
    throw new Error("MoMo payment is not configured");
  }

  if (!config.ipnUrl) {
    throw new Error("MOMO_IPN_URL or PUBLIC_API_BASE_URL is required");
  }

  const amount = Math.round(Number(order.totalAmount || order.total_amount || 0));
  if (!Number.isInteger(amount) || amount < 1000) {
    throw new Error("MoMo amount must be at least 1000 VND");
  }

  const orderId = buildMomoOrderId(order.id);
  const requestId = `${orderId}-${Date.now()}`;
  const requestType = process.env.MOMO_REQUEST_TYPE?.trim() || DEFAULT_REQUEST_TYPE;
  const extraData = Buffer.from(
    JSON.stringify({
      orderId: Number(order.id),
      customerId: Number(order.customerId ?? order.customer_id ?? 0) || undefined,
    }),
  ).toString("base64");
  const orderInfo = `Thanh toan don hang ${orderId}`;

  const rawSignature = [
    `accessKey=${config.accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${config.ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${config.partnerCode}`,
    `redirectUrl=${config.redirectUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join("&");

  const payload = {
    partnerCode: config.partnerCode,
    partnerName: "Ecloria",
    storeId: config.storeId,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: config.redirectUrl,
    ipnUrl: config.ipnUrl,
    requestType,
    extraData,
    items: items.map(mapMomoItem),
    userInfo: mapMomoUser(customer),
    lang: "vi",
    signature: signMomoRawString(rawSignature, config.secretKey),
  };

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(async () => ({
    message: await response.text().catch(() => ""),
  }));

  if (!response.ok) {
    const error = new Error(`MoMo create payment failed with HTTP ${response.status}`);
    error.response = responseBody;
    error.status = response.status;
    throw error;
  }

  const paymentUrl =
    responseBody.payUrl ??
    responseBody.deeplink ??
    responseBody.qrCodeUrl ??
    responseBody.shortLink;
  if (Number(responseBody.resultCode) !== 0 || !paymentUrl) {
    const error = new Error(responseBody.message || "MoMo create payment failed");
    error.response = responseBody;
    error.status = 502;
    throw error;
  }

  return {
    gateway: "MOMO",
    requestId,
    orderId,
    amount,
    payUrl: responseBody.payUrl ?? null,
    deeplink: responseBody.deeplink ?? null,
    qrCodeUrl: responseBody.qrCodeUrl ?? null,
    shortLink: responseBody.shortLink ?? null,
    resultCode: responseBody.resultCode,
    message: responseBody.message,
    rawResponse: responseBody,
  };
}

export function verifyMomoIpnSignature(body) {
  const config = getMomoConfig();
  if (!config) return false;

  const rawSignature = [
    `accessKey=${config.accessKey}`,
    `amount=${body.amount ?? ""}`,
    `extraData=${body.extraData ?? ""}`,
    `message=${body.message ?? ""}`,
    `orderId=${body.orderId ?? ""}`,
    `orderInfo=${body.orderInfo ?? ""}`,
    `orderType=${body.orderType ?? ""}`,
    `partnerCode=${body.partnerCode ?? ""}`,
    `payType=${body.payType ?? ""}`,
    `requestId=${body.requestId ?? ""}`,
    `responseTime=${body.responseTime ?? ""}`,
    `resultCode=${body.resultCode ?? ""}`,
    `transId=${body.transId ?? ""}`,
  ].join("&");

  const expected = signMomoRawString(rawSignature, config.secretKey);
  const received = String(body.signature || "");

  return timingSafeEqualHex(expected, received);
}

function signMomoRawString(rawSignature, secretKey) {
  return crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
}

function timingSafeEqualHex(expected, received) {
  if (!expected || !received || expected.length !== received.length) return false;

  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(received, "hex");
    if (expectedBuffer.length !== receivedBuffer.length) return false;

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

function mapMomoItem(item) {
  const quantity = Number(item.quantity || 1);
  const price = Math.round(Number(item.priceAtPurchase ?? item.price_at_purchase ?? 0));

  return {
    id: String(item.productId ?? item.product_id ?? item.id ?? ""),
    name: String(item.name ?? `Product ${item.productId ?? item.product_id ?? ""}`),
    price,
    currency: "VND",
    quantity,
    totalPrice: price * quantity,
  };
}

function mapMomoUser(customer) {
  return {
    name: customer?.fullName ?? customer?.full_name ?? "",
    phoneNumber: customer?.phone ?? "",
    email: customer?.email ?? "",
  };
}
