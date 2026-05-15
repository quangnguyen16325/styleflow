import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Prefer the shared repo env name, keep the older key as fallback for compatibility.
const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "https://api.ecloria.co.uk";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn("Failed to get token from storage", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor: Error Handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;
      let errorMessage = data?.error?.message || "An unexpected error occurred.";

      switch (status) {
        case 400:
          console.warn("Validation Error: 400", errorMessage);
          break;
        case 401:
          console.warn("Unauthorized: 401", errorMessage);
          // logout() logic should be handled in AuthContext or Navigation integration
          // to redirect to Login
          break;
        case 403:
          console.warn("Forbidden: 403", errorMessage);
          break;
        case 404:
          console.warn("Not Found: 404", errorMessage);
          break;
        default:
          console.warn(`Error: ${status}`, errorMessage);
      }

      return Promise.reject(data?.error || { message: errorMessage, code: status });
    }

    return Promise.reject({ message: "Network error or server is down", code: "NETWORK_ERROR" });
  },
);

// ── Auth ───────────────────────────────────────────────────────────────────

export async function loginApi(email, password) {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
}

export async function registerApi(fullName, phone, email, password) {
  const res = await api.post("/auth/register", { fullName, phone, email, password });
  return res.data;
}

export async function getMeApi() {
  const res = await api.get("/me"); // Required by Checklist
  return res.data;
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function getProducts() {
  const res = await api.get("/products");
  return res.data;
}

export async function getProductById(id) {
  const res = await api.get(`/products/${id}`);
  return res.data;
}

export async function getCategories() {
  const res = await api.get("/categories");
  return res.data;
}

export async function getVietnamProvinces() {
  const res = await api.get("/locations/provinces");
  return res.data;
}

export async function getVietnamDistricts(provinceCode) {
  const res = await api.get(`/locations/provinces/${provinceCode}/districts`);
  return res.data;
}

export async function getVietnamWards(districtCode) {
  const res = await api.get(`/locations/districts/${districtCode}/wards`);
  return res.data;
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(orderPayload) {
  const { items, ...rest } = orderPayload;
  const cleanItems = items.map(({ productId, quantity }) => ({ productId, quantity }));
  const res = await api.post("/orders", { ...rest, items: cleanItems });
  return res.data;
}

export async function getShippingQuote(payload) {
  const res = await api.post("/orders/shipping-quote", payload);
  return res.data;
}

export async function getOrders() {
  const res = await api.get("/orders");
  return res.data;
}

export async function getOrderById(id) {
  const res = await api.get(`/orders/${id}`);
  return res.data;
}

export async function createRefundEvidenceUpload(orderId, fileName, contentType) {
  const res = await api.post("/refund-requests/uploads/presign", {
    orderId,
    fileName,
    contentType,
  });
  return res.data;
}

export async function uploadFileToSignedUrl(uploadUrl, fileUri, contentType) {
  const fileResponse = await fetch(fileUri);
  const fileBlob = await fileResponse.blob();

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: fileBlob,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload image");
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatPrice(amount) {
  if (!amount && amount !== 0) return "—";
  return amount.toLocaleString("vi-VN") + "đ";
}

export const ORDER_STATUS_LABEL = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  failed: "Thất bại",
};

export const PAYMENT_STATUS_LABEL = {
  unpaid: "Chưa thanh toán",
  payment_pending: "Chờ thanh toán",
  payment_unknown: "Chưa xác nhận thanh toán",
  paid: "Đã thanh toán",
  paid_held: "Thanh toán tạm giữ",
  payment_failed: "Thanh toán thất bại",
  refunded: "Đã hoàn tiền",
  refund_pending: "Chờ hoàn tiền",
};

export const PAYMENT_GATEWAY_LABEL = {
  COD: "Thanh toán khi nhận hàng",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  MOMO: "Ví MoMo",
};

export const DELIVERY_STATUS_LABEL = {
  pending: "Chờ bàn giao",
  ready_to_ship: "Sẵn sàng giao",
  handover: "Đã bàn giao",
  in_transit: "Đang vận chuyển",
  delivery_failed: "Giao thất bại",
  retry_pending: "Chờ giao lại",
  returning: "Đang hoàn về",
  returned: "Đã hoàn về",
  delivered: "Đã giao",
};

export default api;
