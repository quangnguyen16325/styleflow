// API Client — Mobile App
// Contract: https://github.com/quangnguyen16325/styleflow (docs/api-contract.md)
// Production: https://api.ecloria.co.uk
//
// RULES (from contract):
// - Do NOT send priceAtPurchase or totalAmount from client
// - Do NOT rename fields from contract
// - Backend computes totalAmount and priceAtPurchase

const BASE_URL = 'https://api.ecloria.co.uk';

// ── Generic fetch wrapper ────────────────────────────────────────────────────

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Chuẩn hóa error theo contract: { error: { code, message } }
      const err = data?.error || { code: 'UNKNOWN_ERROR', message: 'Something went wrong' };
      throw { ...err, status: response.status };
    }

    return data;
  } catch (error) {
    // Network error (no internet)
    if (error instanceof TypeError) {
      throw { code: 'NETWORK_ERROR', message: 'Không thể kết nối đến máy chủ', status: 0 };
    }
    throw error;
  }
}

// ── Health ───────────────────────────────────────────────────────────────────

export async function checkHealth() {
  return request('/health');
}

// ── Products ─────────────────────────────────────────────────────────────────

/**
 * GET /products
 * @returns {Promise<Array<Product>>}
 */
export async function getProducts() {
  return request('/products');
}

/**
 * GET /products/:id
 * @param {number|string} id
 * @returns {Promise<Product>}
 */
export async function getProductById(id) {
  return request(`/products/${id}`);
}

// ── Orders ───────────────────────────────────────────────────────────────────

/**
 * POST /orders
 * @param {{
 *   customer: { fullName: string, phone: string, email: string },
 *   shippingAddress: string,
 *   city: string,
 *   shippingFee?: number,
 *   items: Array<{ productId: number, quantity: number }>
 * }} orderPayload
 * @returns {Promise<Order>}
 */
export async function createOrder(orderPayload) {
  // Safety: strip any client-side computed fields before sending
  const { items, ...rest } = orderPayload;
  const cleanItems = items.map(({ productId, quantity }) => ({ productId, quantity }));
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify({ ...rest, items: cleanItems }),
  });
}

/**
 * GET /orders
 * @returns {Promise<Array<Order>>}
 */
export async function getOrders() {
  return request('/orders');
}

/**
 * GET /orders/:id
 * @param {number|string} id
 * @returns {Promise<Order>}
 */
export async function getOrderById(id) {
  return request(`/orders/${id}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format price in VND (e.g. 199000 → "199.000đ")
 */
export function formatPrice(amount) {
  if (!amount && amount !== 0) return '—';
  return amount.toLocaleString('vi-VN') + 'đ';
}

/**
 * Map order status to Vietnamese display
 */
export const ORDER_STATUS_LABEL = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};
