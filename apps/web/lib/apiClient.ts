import axios, { AxiosRequestConfig } from 'axios';
import { signOutAndRedirectToLogin } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const autoLogoutOn401 =
  process.env.NEXT_PUBLIC_API_AUTO_LOGOUT_ON_401 === 'true';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    if (typeof window === 'undefined') {
      return config;
    }

    const { createSupabaseBrowserClient } =
      await import('@/lib/supabase/client');
    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      autoLogoutOn401 &&
      typeof window !== 'undefined' &&
      error.response &&
      error.response.status === 401
    ) {
      void signOutAndRedirectToLogin();
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }
    return Promise.reject(error);
  },
);

export async function apiFetch<T>(
  path: string,
  options?: AxiosRequestConfig,
): Promise<T> {
  const config: AxiosRequestConfig = { ...options };

  try {
    const { data } = await apiClient.request<T>({
      url: path,
      method: config.method || 'GET',
      data: config.data,
      params: config.params,
      headers: config.headers,
      signal: config.signal,
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorMessage =
        error.response.data?.errorMessage ||
        error.response.data?.message ||
        error.response.data?.error ||
        error.message;
      throw new Error(errorMessage);
    }
    throw error;
  }
}
