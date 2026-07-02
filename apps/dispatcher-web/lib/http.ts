import axios from 'axios';
import { env } from './env';

export const http = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 12000,
});

http.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('safeconnect_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = (error.config ?? {}) as {
      __retryCount?: number;
      method?: string;
      url?: string;
    };

    const retryableMethods = ['get', 'head', 'options'];
    const method = (config.method ?? 'get').toLowerCase();
    const status = error.response?.status as number | undefined;
    const transientStatus = !status || status >= 500 || status === 429;
    const isRetryableRequest = retryableMethods.includes(method) && transientStatus;

    config.__retryCount = config.__retryCount ?? 0;
    if (isRetryableRequest && config.__retryCount < 3) {
      config.__retryCount += 1;
      const delay = 300 * 2 ** (config.__retryCount - 1);
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), delay);
      });

      return http.request(config);
    }

    if (typeof window !== 'undefined') {
      const message =
        error.response?.data?.message ??
        error.message ??
        'Unexpected API error. Please try again.';
      const renderedMessage = Array.isArray(message) ? message.join(', ') : String(message);
      window.dispatchEvent(new CustomEvent('safeconnect:api-error', { detail: renderedMessage }));
    }

    return Promise.reject(error);
  },
);
