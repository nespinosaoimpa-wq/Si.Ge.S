/**
 * Si.Ge.S API Client Utility
 * Unified fetcher for tactical modules
 */

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`/api/${endpoint}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Si no es JSON, capturamos el texto para depuración
      const text = await response.text();
      throw new Error(`SERVER_ERROR: Status ${response.status}. ${text.slice(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `API_ERROR: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error(`Fetch failure on ${endpoint}:`, error);
    // Propagamos un error más útil que "fetch failed"
    if (error.name === 'TypeError' && error.message === 'fetch failed') {
      throw new Error('NETWORK_ERROR: No se pudo conectar con el servidor. Verifica las variables de entorno en Vercel.');
    }
    throw error;
  }
}

export const api = {
  auth: {
    login: (credentials: any) => apiFetch('auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  },
  dashboard: {
    getMapData: () => apiFetch('dashboard/map'),
  },
  staff: {
    create: (data: any) => apiFetch('employees', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch(`employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    list: () => apiFetch('employees'),
  },
  objectives: {
    create: (data: any) => apiFetch('objectives', { method: 'POST', body: JSON.stringify(data) }),
    list: () => apiFetch('objectives'),
    delete: (id: string) => apiFetch(`objectives/${id}`, { method: 'DELETE' }),
  },
  judicial: {
    freeze: (params: any) => apiFetch('judicial/freeze', { method: 'POST', body: JSON.stringify(params) }),
  },
  shifts: {
    checkin: (params: any) => apiFetch('shifts/checkin', { method: 'POST', body: JSON.stringify(params) }),
    checkout: (params: any) => apiFetch('shifts/checkout', { method: 'POST', body: JSON.stringify(params) }),
    program: (params: any) => apiFetch('shifts/program', { method: 'POST', body: JSON.stringify(params) }),
    delete: (id: string) => apiFetch(`shifts/${id}`, { method: 'DELETE' }),
  },
  incidents: {
    report: (params: any) => apiFetch('incidents/report', { method: 'POST', body: JSON.stringify(params) }),
    update: (id: string, data: any) => apiFetch(`incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  tickets: {
    create: (params: any) => apiFetch('tickets', { method: 'POST', body: JSON.stringify(params) }),
    list: (clientId?: string) => apiFetch(`tickets${clientId ? `?client_id=${clientId}` : ''}`),
  },
  cameras: {
    list: () => apiFetch('cameras'),
    findEscape: (params: any) => apiFetch('cameras', { method: 'POST', body: JSON.stringify(params) }),
  },
  feedback: {
    submit: (params: any) => apiFetch('feedback', { method: 'POST', body: JSON.stringify(params) }),
  },
  patrols: {
    validateCheckpoint: (params: any) => apiFetch('patrols/checkpoint', { method: 'POST', body: JSON.stringify(params) }),
  },
  guardBook: {
    list: (params?: { objective_id?: string; date?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.objective_id) q.set('objective_id', params.objective_id);
      if (params?.date) q.set('date', params.date);
      if (params?.limit) q.set('limit', String(params.limit));
      return apiFetch(`guard-book?${q}`);
    },
    create: (data: any) => apiFetch('guard-book', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch(`guard-book/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  payroll: {
    getSummary: (params?: { from?: string; to?: string; operator_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      if (params?.operator_id) q.set('operator_id', params.operator_id);
      return apiFetch(`payroll?${q}`);
    },
  },
  notifications: {
    list: (resourceId: string, unreadOnly = false) => {
      const q = new URLSearchParams({ resource_id: resourceId });
      if (unreadOnly) q.set('unread_only', 'true');
      return apiFetch(`notifications?${q}`);
    },
    create: (data: { resource_id: string; type: string; title: string; body?: string; data?: any }) =>
      apiFetch('notifications', { method: 'POST', body: JSON.stringify(data) }),
    markRead: (notificationIds?: string[], resourceId?: string, markAll = false) =>
      apiFetch('notifications', { method: 'PATCH', body: JSON.stringify({ notification_ids: notificationIds, resource_id: resourceId, mark_all: markAll }) }),
  },
};
