// ============================================
// DineBoard — API Client Library
// ============================================

function getApiUrl(): string {
  // If env var is set and not localhost, use it
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Auto-detect: if browser is accessing from a public URL (not localhost),
  // use relative path — Next.js rewrites will proxy to the backend
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '/api'; // Proxied via Next.js rewrites
    }
  }

  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
}

const API_URL = getApiUrl();

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

  private buildQuery(params?: Record<string, any>): string {
    if (!params) return '';
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    return query ? `?${query}` : '';
  }

  async get(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`, { headers: this.getHeaders() });
    return res.json();
  }

  async post(endpoint: string, body?: any) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body || {}),
    });
    return res.json();
  }

  async put(endpoint: string, body?: any) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(body || {}),
    });
    return res.json();
  }

  async del(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE', headers: this.getHeaders(),
    });
    return res.json();
  }

  // ---- Auth ----
  login(email: string, password: string) { return this.post('/auth/login', { email, password }); }
  register(data: any) { return this.post('/auth/register', data); }
  getProfile() { return this.get('/auth/me'); }

  // ---- Dashboard ----
  getDashboardStats() { return this.get('/reports/dashboard'); }

  // ---- Menu ----
  getMenu() { return this.get('/menu/items'); }
  createMenuItem(data: any) { return this.post('/menu/items', data); }
  updateMenuItem(id: string, data: any) { return this.put(`/menu/items/${id}`, data); }
  deleteMenuItem(id: string) { return this.del(`/menu/items/${id}`); }

  // ---- Tables ----
  getTables() { return this.get('/tables'); }
  createTable(data: any) { return this.post('/tables', data); }
  updateTable(id: string, data: any) { return this.put(`/tables/${id}`, data); }
  updateTableStatus(id: string, status: string) { return this.put(`/tables/${id}/status`, { status }); }

  // ---- Bookings ----
  getBookings(params?: Record<string, any>) { return this.get(`/bookings${this.buildQuery(params)}`); }
  updateBookingStatus(id: string, status: string) { return this.put(`/bookings/${id}/status`, { status }); }

  // ---- Orders ----
  getOrders(params?: Record<string, any>) { return this.get(`/orders${this.buildQuery(params)}`); }
  updateOrderStatus(id: string, status: string) { return this.put(`/orders/${id}/status`, { status }); }
  updateOrder(id: string, data: any) { return this.put(`/orders/${id}`, data); }
  sendBill(orderId: string) { return this.post(`/orders/${orderId}/send-bill`); }

  // ---- Staff ----
  getStaff() { return this.get('/staff'); }
  createStaff(data: any) { return this.post('/staff', data); }
  updateStaff(id: string, data: any) { return this.put(`/staff/${id}`, data); }
  deleteStaff(id: string) { return this.del(`/staff/${id}`); }

  // ---- Promos ----
  getPromos() { return this.get('/promos'); }
  createPromo(data: any) { return this.post('/promos', data); }
  updatePromo(id: string, data: any) { return this.put(`/promos/${id}`, data); }

  // ---- Invoices ----
  generateInvoice(orderId: string) { return this.post(`/invoices/generate/${orderId}`); }
  sendInvoice(orderId: string) { return this.post(`/invoices/${orderId}/send`); }

  // ---- Reports ----
  getReports(params?: Record<string, any>) { return this.get(`/reports/dashboard${this.buildQuery(params)}`); }
  exportReport(params?: Record<string, any>) { return this.get(`/reports/export/pdf${this.buildQuery(params)}`); }

  // ---- Restaurant Settings ----
  getRestaurantSettings() { return this.get('/restaurants/settings'); }
  getRestaurant() { return this.getRestaurantSettings(); }
  updateRestaurant(data: any) { return this.put('/restaurants/settings', data); }
  updatePaymentConfig(data: any) { return this.put('/restaurants/payment-config', data); }
  updateBankDetails(data: any) { return this.put('/restaurants/bank-details', data); }

  async uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/restaurants/settings/logo`, {
      method: 'POST', headers, body: formData,
    });
    return res.json();
  }

  async uploadMenuImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/menu/upload-image`, {
      method: 'POST', headers, body: formData,
    });
    return res.json();
  }

  // ---- AI Logs ----
  getAiLogs(params?: Record<string, any>) { return this.get(`/ai/logs${this.buildQuery(params)}`); }

  // ---- Payment Settlements ----
  getTodaySettlement() { return this.get('/settlements/today'); }
  performSettlement(data?: any) { return this.post('/settlements/settle', data || {}); }
  getSettlementHistory() { return this.get('/settlements/history'); }
  settleBankPayout(settlementId: string) { return this.post(`/settlements/${settlementId}/bank-payout`, {}); }

  // ---- Platform (Public) ----
  getPlans() { return this.get('/platform/plans'); }
  submitContact(data: any) { return this.post('/platform/contact', data); }

  // ---- Super Admin ----
  getSuperAdminTenants() { return this.get('/superadmin/tenants'); }
  getSuperAdminRevenue() { return this.get('/superadmin/revenue'); }
  getSuperAdminCommissions() { return this.get('/superadmin/commissions'); }
  updateTenantStatus(id: string, status: string) { return this.put(`/superadmin/tenants/${id}/status`, { status }); }
  createPlan(data: any) { return this.post('/superadmin/plans', data); }
  updatePlan(id: string, data: any) { return this.put(`/superadmin/plans/${id}`, data); }
}

export const api = new ApiClient();
