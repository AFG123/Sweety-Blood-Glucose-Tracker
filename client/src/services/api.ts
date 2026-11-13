let cachedCsrfToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string | null) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/v1/auth/csrf-token', {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedCsrfToken = data.data?.csrfToken || null;
    return cachedCsrfToken;
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err);
    return null;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isStateChanging = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (isStateChanging) {
    if (!cachedCsrfToken) {
      await fetchCsrfToken();
    }
    if (cachedCsrfToken) {
      headers.set('X-CSRF-Token', cachedCsrfToken);
    }
  }

  const config: RequestInit = {
    ...options,
    method,
    headers,
    credentials: 'include',
  };

  let response = await fetch(endpoint, config);

  // Handle silent token refresh on 401 Unauthorized
  if (
    response.status === 401 &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/register')
  ) {
    if (!isRefreshing) {
      isRefreshing = true;

      try {
        if (!cachedCsrfToken) await fetchCsrfToken();
        const refreshRes = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': cachedCsrfToken || '',
          },
          credentials: 'include',
        });

        if (refreshRes.ok) {
          isRefreshing = false;
          processQueue(null, cachedCsrfToken);
          // Retry original request
          response = await fetch(endpoint, config);
        } else {
          isRefreshing = false;
          processQueue(new Error('Refresh failed'));
          cachedCsrfToken = null;
          throw new Error('Session expired');
        }
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(refreshErr);
        throw refreshErr;
      }
    } else {
      // Wait for ongoing refresh
      await new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      });
      response = await fetch(endpoint, config);
    }
  }

  // Parse 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(data.message || 'API request failed');
    error.status = response.status;
    error.errors = data.errors || [];
    throw error;
  }

  return data;
}

export interface Reading {
  id: number;
  user_id?: number;
  reading_date: string;
  slot: 'MORNING_FASTING' | 'AFTER_BREAKFAST' | 'AFTER_LUNCH' | 'AFTER_DINNER';
  value: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReportSummary {
  highest: number | null;
  lowest: number | null;
  average: number | null;
  total_readings: number;
}

export interface ReportResponse {
  report_type: 'daily' | 'month_to_date' | 'monthly';
  start_date: string;
  end_date: string;
  summary: ReportSummary;
  readings?: Reading[];
}

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData: { name: string; email: string; password: string }) =>
    apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: () =>
    apiRequest('/api/v1/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    apiRequest('/api/v1/auth/me', {
      method: 'GET',
    }),
};

export const readingsApi = {
  getAll: () =>
    apiRequest<{ success: boolean; data: { readings: Reading[] } }>('/api/v1/readings', {
      method: 'GET',
    }),

  create: (readingData: { reading_date: string; slot: string; value: number }) =>
    apiRequest<{ success: boolean; message: string; data: { reading: Reading } }>(
      '/api/v1/readings',
      {
        method: 'POST',
        body: JSON.stringify(readingData),
      }
    ),

  update: (
    id: number,
    readingData: { reading_date?: string; slot?: string; value?: number }
  ) =>
    apiRequest<{ success: boolean; message: string; data: { reading: Reading } }>(
      `/api/v1/readings/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(readingData),
      }
    ),

  delete: (id: number) =>
    apiRequest<void>(`/api/v1/readings/${id}`, {
      method: 'DELETE',
    }),
};

export const reportsApi = {
  getDaily: (date: string) =>
    apiRequest<{ success: boolean; data: ReportResponse }>(
      `/api/v1/reports/daily?date=${date}`,
      { method: 'GET' }
    ),

  getMonthToDate: (date: string) =>
    apiRequest<{ success: boolean; data: ReportResponse }>(
      `/api/v1/reports/month-to-date?date=${date}`,
      { method: 'GET' }
    ),

  getMonthly: (date: string) =>
    apiRequest<{ success: boolean; data: ReportResponse }>(
      `/api/v1/reports/monthly?date=${date}`,
      { method: 'GET' }
    ),
};
