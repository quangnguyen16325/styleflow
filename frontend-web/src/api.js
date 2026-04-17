import axios from 'axios';
import { clearAdminSession, getStoredAdminToken } from './utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer Token
client.interceptors.request.use((config) => {
  const token = getStoredAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Uniform error handling & 401/403 rules
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API call failed:', error.response?.data || error.message);
    const code = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
    const message = error.response?.data?.error?.message || 'Unknown error occurred';
    const status = error.response?.status;
    const requestPath = String(error.config?.url || '');
    const isLoginRequest = requestPath.includes('/auth/login');

    // Force logout on token expiration / unauthorized calls.
    if (!isLoginRequest && (status === 401 || (status === 403 && code === 'FORBIDDEN'))) {
      clearAdminSession();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject({ code, message, status });
  }
);

class ApiService {
  // AUTH
  static async login(email, password) {
    return client.post('/auth/login', { email, password });
  }

  // PRODUCTS
  static async getProducts() {
    return client.get('/products');
  }
  static async getProduct(id) {
    return client.get(`/products/${id}`);
  }
  static async createProductUploadPresign(productId, fileName, contentType) {
    return client.post('/admin/uploads/presign', {
      productId,
      fileName,
      contentType,
    });
  }
  static async updateProductImage(id, imageUrl) {
    return client.patch(`/admin/products/${id}/image`, { imageUrl });
  }
  static async createProduct(productData) {
    return client.post('/admin/products', productData);
  }
  static async updateProduct(id, productData) {
    return client.patch(`/admin/products/${id}`, productData);
  }
  static async deleteProduct(id) {
    return client.delete(`/admin/products/${id}`);
  }

  // ORDERS (admin routes per contract)
  static async getOrders(status = null) {
    const params = {};
    if (status && status !== 'ALL') {
      params.status = status.toLowerCase();
    }
    return client.get('/admin/orders', { params });
  }
  static async getOrder(id) {
    return client.get(`/admin/orders/${id}`);
  }
  static async updateOrderStatus(id, status) {
    return client.patch(`/admin/orders/${id}/status`, { status });
  }
  static async getOrderDeliveryEvents(id) {
    return client.get(`/admin/orders/${id}/delivery-events`);
  }
  static async submitAddressChangeDecision(id, decision, approvedShippingFee = null) {
    const payload = { decision };
    if (approvedShippingFee != null && approvedShippingFee !== '') {
      payload.approvedShippingFee = Number(approvedShippingFee);
    }

    return client.post(`/admin/orders/${id}/address-change-decision`, payload);
  }

  // ISSUES
  static async getIssues(params = {}) {
    // Clean out empty/ALL values
    const cleanParams = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val && val !== 'ALL') {
        cleanParams[key] = val;
      }
    });
    return client.get('/admin/issues', { params: cleanParams });
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
    if (status && status !== 'ALL') {
      params.status = status.toLowerCase();
    }

    return client.get('/admin/refund-requests', { params });
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
