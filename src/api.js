const API_URL = 'https://your-domain.com';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    throw new Error('Unauthorized');
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
}

export const api = {
  auth: {
    login: (username, password) => request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
    me: () => request('/api/auth/me'),
  },
  tasks: {
    list: () => request('/api/tasks'),
    create: (data) => request('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    reorder: (data) => request('/api/tasks/reorder', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
    history: (id) => request(`/api/tasks/${id}/history`),
  },
  customers: {
    list: () => request('/api/customers'),
    create: (data) => request('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/api/customers/${id}`, { method: 'DELETE' }),
  },
  users: {
    list: () => request('/api/users'),
    create: (data) => request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
  },
  invoices: {
    list: () => request('/api/invoices'),
    get: (id) => request(`/api/invoices/${id}`),
    create: (data) => request('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/api/invoices/${id}`, { method: 'DELETE' }),
    getTasks: (id) => request(`/api/invoices/${id}/tasks`),
    fill: (id, data) => request(`/api/invoices/${id}/fill`, { method: 'POST', body: JSON.stringify(data) }),
    save: (id, data) => request(`/api/invoices/${id}/save`, { method: 'PUT', body: JSON.stringify(data) }),
    removeTask: (invoiceId, taskId) => request(`/api/invoices/${invoiceId}/tasks/${taskId}`, { method: 'DELETE' }),
  },
};