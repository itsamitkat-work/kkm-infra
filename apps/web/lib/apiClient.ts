import axios, { AxiosRequestConfig } from 'axios';
import { logout } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to headers
apiClient.interceptors.request.use(
  (config) => {
    // Get token from cookies (only on client side)
    const getCookie = (name: string) => {
      if (typeof document === 'undefined') return undefined;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };

    const token = getCookie('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== 'undefined' &&
      error.response &&
      error.response.status === 401
    ) {
      logout();
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }
    return Promise.reject(error);
  }
);

export async function apiFetch<T>(
  path: string,
  options?: AxiosRequestConfig
): Promise<T> {
  const config: AxiosRequestConfig = { ...options };

  if (typeof window === 'undefined') {
    // Server-side: Manually get token and create headers
    const { cookies } = await import('next/headers');
    const token = (await cookies()).get('token')?.value;
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }
  // Client-side: The interceptor will handle the token automatically

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
