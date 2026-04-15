import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer Token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
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
    
    // Auth redirection for Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    } 
    // Alert for Forbidden
    else if (error.response?.status === 403) {
      alert(`Access Denied: ${message}`);
    }
    
    return Promise.reject({ code, message });
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

  // ORDERS
  static async getOrders(status = null) {
    const params = {};
    if (status && status !== 'ALL') {
      params.status = status.toLowerCase();
    }
    return client.get('/orders', { params });
  }
  static async getOrder(id) {
    return client.get(`/orders/${id}`);
  }
  static async updateOrderStatus(id, status) {
    return client.patch(`/orders/${id}/status`, { status });
  }

  // ISSUES
  static async getIssues(params = {}) {
    return client.get('/admin/issues', { params });
  }
  static async getIssue(id) {
    return client.get(`/admin/issues/${id}`);
  }
  static async updateIssueStatus(id, status) {
    return client.patch(`/admin/issues/${id}/status`, { status });
  }
}

export default ApiService;
