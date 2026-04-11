import axios from 'axios';

// The baseUrl is defined via vite proxy or directly via VITE_API_BASE_URL env.
// Example uses Vite's env vars.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor to uniformly handle errors 
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API call failed:', error.response?.data || error.message);
    const errPayload = error.response?.data?.error || {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred',
    };
    return Promise.reject(errPayload);
  }
);

// JSDoc typing representation for Frontend usage based on Contract

/**
 * @typedef {Object} Customer
 * @property {string} fullName
 * @property {string} phone
 * @property {string} email
 */

/**
 * @typedef {Object} OrderItemPayload
 * @property {number} productId
 * @property {number} quantity
 */

class ApiService {
  // PRODUCTS
  
  static async getProducts() {
    return client.get('/products');
  }

  static async getProduct(id) {
    return client.get(`/products/${id}`);
  }

  // ORDERS

  static async getOrders() {
    return client.get('/orders');
  }

  static async getOrder(id) {
    return client.get(`/orders/${id}`);
  }

  /**
   * Create an order
   * @param {Object} payload 
   * @param {Customer} payload.customer
   * @param {string} payload.shippingAddress
   * @param {string} payload.city
   * @param {number} [payload.shippingFee]
   * @param {OrderItemPayload[]} payload.items
   */
  static async createOrder(payload) {
    return client.post('/orders', payload);
  }
}

export default ApiService;
