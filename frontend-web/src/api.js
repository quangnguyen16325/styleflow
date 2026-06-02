import axios from "axios";
import { clearAdminSession, getStoredAdminToken } from "./utils/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request Interceptor: Attach Bearer Token
client.interceptors.request.use(
  (config) => {
    const token = getStoredAdminToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Uniform error handling & 401/403 rules
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject({ code: "CANCELLED", message: "Request cancelled", status: 0 });
    }

    console.error("API call failed:", error.response?.data || error.message);

    const code = error.response?.data?.error?.code || "UNKNOWN_ERROR";
    const message = error.response?.data?.error?.message || "Unknown error occurred";
    const status = error.response?.status;
    const requestPath = String(error.config?.url || "");
    const isLoginRequest = requestPath.includes("/auth/login");

    // Force logout on token expiration / unauthorized calls
    if (!isLoginRequest && (status === 401 || (status === 403 && code === "FORBIDDEN"))) {
      clearAdminSession();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject({ code, message, status });
  },
);

class ApiService {
  // AUTH
  static async login(email, password) {
    return client.post("/auth/login", { email, password });
  }

  // PRODUCTS
  static async getProducts() {
    return client.get("/products");
  }
  static async getProduct(id) {
    return client.get(`/admin/products/${id}`);
  }
  static async createProductUploadPresign(productId, fileName, contentType) {
    return client.post("/admin/uploads/presign", {
      productId,
      fileName,
      contentType,
    });
  }
  static async updateProductImage(id, imageUrl) {
    return client.patch(`/admin/products/${id}/image`, { imageUrl });
  }
  static async uploadProductImage(productId, file, contentType) {
    const uploadBody = file.type === contentType ? file : file.slice(0, file.size, contentType);
    const encodedFileName = encodeURIComponent(file.name || `product-${productId}`);

    return client.put(`/admin/products/${productId}/image-upload`, uploadBody, {
      cache: "no-store",
      headers: {
        "Content-Type": contentType,
        "X-File-Name": encodedFileName,
      },
      timeout: 60000,
    });
  }
  static async createProduct(productData) {
    return client.post("/admin/products", productData);
  }
  static async updateProduct(id, productData) {
    return client.patch(`/admin/products/${id}`, productData);
  }
  static async deleteProduct(id) {
    return client.delete(`/admin/products/${id}`);
  }
  static async stockInProduct(id, payload) {
    return client.post(`/admin/products/${id}/stock-in`, payload);
  }
  static async getProductInventoryTransactions(id, params = {}) {
    return client.get(`/admin/products/${id}/inventory-transactions`, { params });
  }

  // PRODUCT REVIEWS
  static async getReviews(params = {}) {
    const cleanParams = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "" && value !== "ALL") {
        cleanParams[key] = value;
      }
    });
    return client.get("/admin/reviews", { params: cleanParams });
  }
  static async updateReviewStatus(id, payload) {
    return client.patch(`/admin/reviews/${id}/status`, payload);
  }

  // CATEGORIES
  static async getCategories() {
    return client.get("/categories");
  }
  static async getAdminCategories() {
    return client.get("/admin/categories");
  }
  static async getCategory(id) {
    return client.get(`/admin/categories/${id}`);
  }
  static async createCategory(categoryData) {
    return client.post("/admin/categories", categoryData);
  }
  static async updateCategory(id, categoryData) {
    return client.patch(`/admin/categories/${id}`, categoryData);
  }
  static async deleteCategory(id) {
    return client.delete(`/admin/categories/${id}`);
  }

  // ORDERS (admin routes per contract)
  static async getOrders(status = null) {
    const params = {};
    if (status && status !== "ALL") {
      params.status = status.toLowerCase();
    }
    return client.get("/admin/orders", { params });
  }
  static async getOrder(id) {
    return client.get(`/admin/orders/${id}`);
  }
  static async getShippers() {
    return client.get("/admin/shippers");
  }
  static async assignOrderShipper(id, shipperId) {
    return client.post(`/admin/orders/${id}/assign-shipper`, { shipperId });
  }
  static async updateOrderStatus(id, status) {
    return client.patch(`/admin/orders/${id}/status`, { status });
  }
  static async updateOrderDeliveryStatus(id, payload) {
    return client.post(`/admin/orders/${id}/delivery-status`, payload);
  }
  static async getOrderDeliveryEvents(id) {
    return client.get(`/admin/orders/${id}/delivery-events`);
  }
  static async submitAddressChangeDecision(id, decision, approvedShippingFee = null) {
    const payload = { decision };
    if (approvedShippingFee != null && approvedShippingFee !== "") {
      payload.approvedShippingFee = Number(approvedShippingFee);
    }

    return client.post(`/admin/orders/${id}/address-change-decision`, payload);
  }

  // USERS
  static async getUsers() {
    return client.get("/admin/users");
  }
  static async createUser(payload) {
    return client.post("/admin/users", payload);
  }
  static async updateUser(id, payload) {
    return client.patch(`/admin/users/${id}`, payload);
  }
  static async deleteUser(id) {
    return client.delete(`/admin/users/${id}`);
  }

  // SHIPPER
  static async getShipperOrders() {
    return client.get("/shipper/orders");
  }
  static async getShipperOrder(id) {
    return client.get(`/shipper/orders/${id}`);
  }
  static async updateShipperOrderDeliveryStatus(id, payload) {
    return client.post(`/shipper/orders/${id}/delivery-status`, payload);
  }

  // ISSUES
  static async getIssues(params = {}) {
    // Clean out empty/ALL values
    const cleanParams = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val && val !== "ALL") {
        cleanParams[key] = val;
      }
    });
    return client.get("/admin/issues", { params: cleanParams });
  }
  static async getIssue(id) {
    return client.get(`/admin/issues/${id}`);
  }
  static async updateIssueStatus(id, status) {
    return client.patch(`/admin/issues/${id}/status`, { status });
  }

  // REFUND REQUESTS
  static async getRefundRequests(status = null) {
    const params = {};
    if (status && status !== "ALL") {
      params.status = status.toLowerCase();
    }

    return client.get("/admin/refund-requests", { params });
  }
  static async getRefundRequest(id) {
    return client.get(`/admin/refund-requests/${id}`);
  }
  static async updateRefundRequestStatus(id, status, reviewNote = null) {
    const payload = { status };
    if (reviewNote != null) {
      payload.reviewNote = reviewNote;
    }

    return client.patch(`/admin/refund-requests/${id}/status`, payload);
  }
}

export default ApiService;
