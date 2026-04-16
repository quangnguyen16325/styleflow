import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Contract: Base URL — dùng IP máy Mac khi test thật trên iPhone
const BASE_URL = "http://192.168.1.6:5000";

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

// ── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(orderPayload) {
  const { items, ...rest } = orderPayload;
  const cleanItems = items.map(({ productId, quantity }) => ({ productId, quantity }));
  const res = await api.post("/orders", { ...rest, items: cleanItems });
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

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatPrice(amount) {
  if (!amount && amount !== 0) return "—";
  return amount.toLocaleString("vi-VN") + "đ";
}

export const ORDER_STATUS_LABEL = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  failed: "Thất bại",
};

export default api;
