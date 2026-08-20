import { supabase } from './supabase';

/**
 * SIGPAD API Client Utility — Supabase Direct Hybrid Architecture
 * ZERO VERCEL FUNCTION CONSUMPTION OPTIMIZATION:
 * Queries Supabase JS SDK directly from client browser for 0 Vercel function invocations!
 */

// Endpoints que REQUIEREN tiempo real (sin caché)
const REALTIME_ENDPOINTS = [
  'auth/',
  'shifts/checkin',
  'shifts/checkout',
  'tracking/update',
  'tracking/alert',
  'notifications',
  'guard-book',
  'incidents/',
  'patrols/',
  'keep-alive',
  'upload',
  'feedback',
];

// Endpoints que PUEDEN tener cache de 60 segundos (ISR)
const CACHEABLE_ENDPOINTS = [
  'employees',
  'objectives',
  'cameras',
  'inventory',
  'authorized-users',
  'dashboard/map',
];

function buildFetchOptions(endpoint: string, options: RequestInit): RequestInit {
  if (options.cache || options.next) return options;

  const isRealtime = REALTIME_ENDPOINTS.some(ep => endpoint.includes(ep));
  const isCacheable = CACHEABLE_ENDPOINTS.some(ep => endpoint.includes(ep));

  if (isRealtime) {
    return { ...options, cache: 'no-store' };
  }

  if (isCacheable && typeof window === 'undefined') {
    return { ...options, next: { revalidate: 60 } } as RequestInit;
  }

  return { ...options, cache: 'no-store' };
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  try {
    const fetchOptions = buildFetchOptions(endpoint, options);

    const response = await fetch(`/api/${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...fetchOptions,
    });

    let data;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`SERVER_ERROR: Status ${response.status}. ${text.slice(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `API_ERROR: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error(`Fetch failure on ${endpoint}:`, error);
    if (error.name === 'TypeError' && error.message === 'fetch failed') {
      throw new Error('NETWORK_ERROR: No se pudo conectar con el servidor.');
    }
    throw error;
  }
}

export const api = {
  auth: {
    login: (credentials: any) => apiFetch('auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    session: () => apiFetch('auth/session'),
  },
  dashboard: {
    getMapData: async () => {
      if (typeof window !== 'undefined') {
        try {
          const [objsRes, resourcesRes, incidentsRes, alarmsRes, shiftsRes] = await Promise.all([
            supabase.from('objectives').select('*').order('name'),
            supabase.from('resources').select('*').neq('status', 'baja'),
            supabase.from('guard_book_entries').select('*').order('created_at', { ascending: false }).limit(20),
            supabase.from('alarms').select('*').eq('status', 'activa').order('created_at', { ascending: false }).limit(20),
            supabase.from('guard_shifts').select('*').in('status', ['activo', 'active'])
          ]);

          if (!objsRes.error && !resourcesRes.error) {
            const objectives = objsRes.data || [];
            const resources = resourcesRes.data || [];
            const recentIncidents = [
              ...(incidentsRes.data || []),
              ...(alarmsRes.data || []).map((a: any) => ({
                id: a.id,
                entry_type: 'emergencia',
                content: `🚨 ALERTA: ${a.alarm_type || 'Pánico en puesto'}`,
                latitude: a.latitude,
                longitude: a.longitude,
                created_at: a.created_at,
                urgency: 'critica',
                status: a.status
              }))
            ];
            const activeShifts = shiftsRes.data || [];

            return { objectives, resources, recentIncidents, activeShifts };
          }
        } catch (e) {}
      }
      return apiFetch('dashboard/map');
    },
  },
  staff: {
    create: async (data: any) => {
      if (typeof window !== 'undefined') {
        try {
          const { data: res, error } = await supabase.from('resources').insert(data).select().single();
          if (!error && res) return res;
        } catch (e) {}
      }
      return apiFetch('employees', { method: 'POST', body: JSON.stringify(data) });
    },
    update: async (id: string, data: any) => {
      if (typeof window !== 'undefined') {
        try {
          const { data: res, error } = await supabase.from('resources').update(data).eq('id', id).select().single();
          if (!error && res) return res;
        } catch (e) {}
      }
      return apiFetch(`employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    },
    list: async () => {
      if (typeof window !== 'undefined') {
        try {
          const { data, error } = await supabase.from('resources').select('*').neq('status', 'baja').order('name');
          if (!error && data) return data;
        } catch (e) {}
      }
      return apiFetch('employees');
    },
  },
  authorizedUsers: {
    list: async () => {
      if (typeof window !== 'undefined') {
        try {
          const { data, error } = await supabase.from('authorized_users').select('*').order('created_at', { ascending: false });
          if (!error && data) return data;
        } catch (e) {}
      }
      return apiFetch('authorized-users');
    },
    create: async (data: any) => {
      if (typeof window !== 'undefined') {
        try {
          const { data: res, error } = await supabase.from('authorized_users').insert(data).select().single();
          if (!error && res) return res;
        } catch (e) {}
      }
      return apiFetch('authorized-users', { method: 'POST', body: JSON.stringify(data) });
    },
    update: async (id: string, status: string) => {
      if (typeof window !== 'undefined') {
        try {
          const { data: res, error } = await supabase.from('authorized_users').update({ status }).eq('id', id).select().single();
          if (!error && res) return res;
        } catch (e) {}
      }
      return apiFetch(`authorized-users/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    },
    delete: async (id: string) => {
      if (typeof window !== 'undefined') {
        try {
          const { error } = await supabase.from('authorized_users').delete().eq('id', id);
          if (!error) return { success: true };
        } catch (e) {}
      }
      return apiFetch(`authorized-users/${id}`, { method: 'DELETE' });
    },
  },
  objectives: {
    create: async (data: any) => {
      if (typeof window !== 'undefined') {
        try {
          const { data: res, error } = await supabase.from('objectives').insert(data).select().single();
          if (!error && res) return res;
        } catch (e) {}
      }
      return apiFetch('objectives', { method: 'POST', body: JSON.stringify(data) });
    },
    list: async () => {
      if (typeof window !== 'undefined') {
        try {
          const { data, error } = await supabase.from('objectives').select('*').order('name');
          if (!error && data) return data;
        } catch (e) {}
      }
      return apiFetch('objectives');
    },
    delete: async (id: string) => {
      if (typeof window !== 'undefined') {
        try {
          const { error } = await supabase.from('objectives').delete().eq('id', id);
          if (!error) return { success: true };
        } catch (e) {}
      }
      return apiFetch(`objectives/${id}`, { method: 'DELETE' });
    },
  },
  judicial: {
    freeze: (params: any) => apiFetch('judicial/freeze', { method: 'POST', body: JSON.stringify(params) }),
  },
  shifts: {
    checkin: async (params: any) => {
      if (typeof window !== 'undefined') {
        try {
          const payload = {
            operator_id: params.operator_id || params.resource_id,
            objective_id: params.objective_id,
            start_time: new Date().toISOString(),
            status: 'activo',
            latitude: params.latitude,
            longitude: params.longitude
          };
          const { data: res, error } = await supabase.from('guard_shifts').insert(payload).select().single();
          if (!error && res) {
            await supabase.from('resources').update({
              current_objective_id: params.objective_id,
              status: 'activo',
              latitude: params.latitude,
              longitude: params.longitude,
              last_gps_update: new Date().toISOString()
            }).or(`id.eq.${payload.operator_id},assigned_to.eq.${payload.operator_id}`);

            return res;
          }
        } catch (e) {}
      }
      return apiFetch('shifts/checkin', { method: 'POST', body: JSON.stringify(params) });
    },
    checkout: async (params: any) => {
      if (typeof window !== 'undefined') {
        try {
          const shiftId = params.shift_id || params.id;
          const { data: res, error } = await supabase.from('guard_shifts').update({
            end_time: new Date().toISOString(),
            status: 'completado'
          }).eq('id', shiftId).select().single();

          if (!error && res) {
            if (params.operator_id) {
              await supabase.from('resources').update({
                current_objective_id: null
              }).or(`id.eq.${params.operator_id},assigned_to.eq.${params.operator_id}`);
            }
            return res;
          }
        } catch (e) {}
      }
      return apiFetch('shifts/checkout', { method: 'POST', body: JSON.stringify(params) });
    },
    program: (params: any) => apiFetch('shifts/program', { method: 'POST', body: JSON.stringify(params) }),
    delete: async (id: string) => {
      if (typeof window !== 'undefined') {
        try {
          const { error } = await supabase.from('guard_shifts').delete().eq('id', id);
          if (!error) return { success: true };
        } catch (e) {}
      }
      return apiFetch(`shifts/${id}`, { method: 'DELETE' });
    },
  },
  incidents: {
    report: async (params: any) => {
      if (typeof window !== 'undefined') {
        try {
          const { data: res, error } = await supabase.from('incidents').insert(params).select().single();
          if (!error && res) return res;
        } catch (e) {}
      }
      return apiFetch('incidents/report', { method: 'POST', body: JSON.stringify(params) });
    },
    update: async (id: string, data: any) => {
      if (typeof window !== 'undefined') {
        try {
          const { data: res, error } = await supabase.from('incidents').update(data).eq('id', id).select().single();
          if (!error && res) return res;
        } catch (e) {}
      }
      return apiFetch(`incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    },
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
    list: async (params?: { objective_id?: string; date?: string; limit?: number }) => {
      if (typeof window !== 'undefined') {
        try {
          let query = supabase.from('guard_book_entries').select('*').order('created_at', { ascending: false });
          if (params?.objective_id) query = query.eq('objective_id', params.objective_id);
          if (params?.limit) query = query.limit(params.limit);
          const { data, error } = await query;
          if (!error && data) return data;
        } catch (e) {}
      }
      const q = new URLSearchParams();
      if (params?.objective_id) q.set('objective_id', params.objective_id);
      if (params?.date) q.set('date', params.date);
      if (params?.limit) q.set('limit', String(params.limit));
      return apiFetch(`guard-book?${q}`);
    },
    create: async (data: any) => {
      if (typeof window !== 'undefined') {
        try {
          const { data: res, error } = await supabase.from('guard_book_entries').insert(data).select().single();
          if (!error && res) return res;
        } catch (e) {}
      }
      return apiFetch('guard-book', { method: 'POST', body: JSON.stringify(data) });
    },
    update: async (id: string, data: any) => {
      if (typeof window !== 'undefined') {
        try {
          const { data: res, error } = await supabase.from('guard_book_entries').update(data).eq('id', id).select().single();
          if (!error && res) return res;
        } catch (e) {}
      }
      return apiFetch(`guard-book/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    },
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
    list: async (resourceId: string, unreadOnly = false) => {
      if (typeof window !== 'undefined') {
        try {
          let q = supabase.from('notifications').select('*').eq('resource_id', resourceId).order('created_at', { ascending: false });
          if (unreadOnly) q = q.eq('read', false);
          const { data, error } = await q;
          if (!error && data) return data;
        } catch (e) {}
      }
      const q = new URLSearchParams({ resource_id: resourceId });
      if (unreadOnly) q.set('unread_only', 'true');
      return apiFetch(`notifications?${q}`);
    },
    create: async (data: { resource_id: string; type: string; title: string; body?: string; data?: any }) => {
      if (typeof window !== 'undefined') {
        try {
          const { data: res, error } = await supabase.from('notifications').insert(data).select().single();
          if (!error && res) return res;
        } catch (e) {}
      }
      return apiFetch('notifications', { method: 'POST', body: JSON.stringify(data) });
    },
    markRead: async (notificationIds?: string[], resourceId?: string, markAll = false) => {
      if (typeof window !== 'undefined') {
        try {
          if (markAll && resourceId) {
            await supabase.from('notifications').update({ read: true }).eq('resource_id', resourceId);
            return { success: true };
          }
          if (notificationIds && notificationIds.length > 0) {
            await supabase.from('notifications').update({ read: true }).in('id', notificationIds);
            return { success: true };
          }
        } catch (e) {}
      }
      return apiFetch('notifications', { method: 'PATCH', body: JSON.stringify({ notification_ids: notificationIds, resource_id: resourceId, mark_all: markAll }) });
    },
  },
};

