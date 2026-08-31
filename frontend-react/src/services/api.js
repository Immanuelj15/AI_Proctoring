/**
 * API Service for FastAPI Backend Integration
 */
const API_BASE_URL = 'http://127.0.0.1:8000';

export class ApiService {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    if (options.token) {
      defaultHeaders['Authorization'] = `Bearer ${options.token}`;
    }

    const config = {
      method: options.method || 'GET',
      headers: { ...defaultHeaders, ...options.headers },
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      return {
        ok: response.ok,
        status: response.status,
        data: data
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        data: { detail: 'Backend server unavailable. Please ensure FastAPI is running.' }
      };
    }
  }

  static async checkHealth() {
    const health = await this.request('/health');
    const dbHealth = await this.request('/health/db');
    return {
      server: health.ok,
      db: dbHealth.ok && dbHealth.data.status === 'healthy'
    };
  }

  static async register(name, email, password, role) {
    return await this.request('/auth/register', {
      method: 'POST',
      body: { name, email, password, role }
    });
  }

  static async login(email, password) {
    return await this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  }

  static async getCurrentUser(token) {
    return await this.request('/users/me', { token });
  }

  static async testRole(role, token) {
    const endpointMap = {
      student: '/users/student-test',
      examiner: '/users/examiner-test',
      admin: '/users/admin-test'
    };
    const endpoint = endpointMap[role];
    if (!endpoint) return { ok: false, status: 400, data: { detail: 'Invalid test role' } };
    return await this.request(endpoint, { token });
  }
}
