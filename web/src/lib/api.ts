// ============================================
// DineBoard — API Client Library
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async get(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async post(endpoint: string, body: any) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async put(endpoint: string, body: any) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async delete(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  // Auth
  login(email: string, password: string) {
    return this.post('/auth/login', { email, password });
  }

  register(data: any) {
    return this.post('/auth/register', data);
  }

  getProfile() {
    return this.get('/auth/me');
  }

  // Dashboard
  getDashboardStats() {
    return this.get('/reports/dashboard');
  }

  // Menu
  getMenuItems() {
    return this.get('/menu/items');
  }

  createMenuItem(data: any) {
    return this.post('/menu/items', data);
  }

  updateMenuItem(id: string, data: any) {
    return this.put(`/menu/items/${id}`, data);
  }

  deleteMenuItem(id: string) {
    return this.delete(`/menu/items/${id}`);
  }

  // Tables
  getTables() {
    return this.get('/tables');
  }

  createTable(data: any) {
    return this.post('/tables', data);
  }

  updateTableStatus(id: string, status: string) {
    return this.put(`/tables/${id}/status`, { status });
  }

  // Bookings
  getBookings(params?: string) {
    return this.get(`/bookings${params ? `?${params}` : ''}`);
  }

  updateBookingStatus(id: string, status: string) {
    return this.put(`/bookings/${id}/status`, { status });
  }

  // Orders
  getOrders(params?: string) {
    return this.get(`/orders${params ? `?${params}` : ''}`);
  }

  updateOrderStatus(id: string, status: string) {
    return this.put(`/orders/${id}/status`, { status });
  }

  sendBill(orderId: string) {
    return this.post(`/orders/${orderId}/send-bill`, {});
  }

  // Staff
  getStaff() {
    return this.get('/staff');
  }

  createStaff(data: any) {
    return this.post('/staff', data);
  }

  // Promos
  getPromos() {
    return this.get('/promos');
  }

  createPromo(data: any) {
    return this.post('/promos', data);
  }

  // Reports
  getOrderReport(startDate: string, endDate: string) {
    return this.get(`/reports/orders?startDate=${startDate}&endDate=${endDate}`);
  }

  getRevenueReport(startDate: string, endDate: string) {
    return this.get(`/reports/revenue?startDate=${startDate}&endDate=${endDate}`);
  }

  // Settings
  updateSettings(data: any) {
    return this.put('/restaurants/settings', data);
  }

  // AI Logs
  getAiLogs(page: number = 1) {
    return this.get(`/ai/logs?page=${page}`);
  }
}

export const api = new ApiClient();
