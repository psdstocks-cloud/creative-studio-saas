import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { supabase } from './supabaseClient';

const API_BASE_PATH = '/api';
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

const ensureApiEndpoint = (endpoint: string) => {
  const trimmed = endpoint.trim();
  const normalized = ensureLeadingSlash(trimmed);

  if (normalized === API_BASE_PATH || normalized.startsWith(`${API_BASE_PATH}/`)) {
    return normalized;
  }

  if (normalized === '/') {
    return API_BASE_PATH;
  }

  return `${API_BASE_PATH}${normalized}`;
};

/**
 * Normalizes the configured base URL so requests always target the Express
 * `/api` routes even when the environment value omits the path (for example
 * `https://my-app.up.railway.app`).
 */
const ensureApiPath = (baseUrl: string) => {
  const trimmed = trimTrailingSlash(baseUrl);

  if (!trimmed) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const normalizedPath = trimTrailingSlash(parsed.pathname || '');

    if (!normalizedPath) {
      return `${trimmed}${API_BASE_PATH}`;
    }

    if (normalizedPath === API_BASE_PATH || normalizedPath.endsWith(`${API_BASE_PATH}`)) {
      return trimmed;
    }

    return trimmed;
  } catch {
    if (!trimmed.endsWith(API_BASE_PATH)) {
      return `${trimmed}${API_BASE_PATH}`;
    }

    return trimmed;
  }
};

const getApiBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (envBaseUrl) {
    return ensureApiPath(envBaseUrl);
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${trimTrailingSlash(window.location.origin)}${API_BASE_PATH}`;
  }

  return API_BASE_PATH;
};

const resolveEndpoint = (endpoint: string) => {
  if (ABSOLUTE_URL_REGEX.test(endpoint)) {
    return endpoint;
  }

  const apiPath = ensureApiEndpoint(endpoint);
  const baseApiUrl = getApiBaseUrl();

  if (baseApiUrl === API_BASE_PATH) {
    return apiPath;
  }

  let path = apiPath;

  if (baseApiUrl.endsWith(API_BASE_PATH) && apiPath.startsWith(API_BASE_PATH)) {
    path = apiPath.slice(API_BASE_PATH.length) || '/';
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
  }

  return `${baseApiUrl}${path}`;
};
const DEFAULT_TIMEOUT = 30000;

export interface ApiFetchOptions extends AxiosRequestConfig {
  auth?: boolean;
  body?: unknown;
}

interface NormalizedError {
  message: string;
  status?: number;
  data?: unknown;
}

const createRequestId = () =>
  `rq_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 8)}`;

const apiClient = axios.create({
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT,
});

type MaybePromise<T> = T | Promise<T>;

type RequestInterceptor = (config: AxiosRequestConfig) => MaybePromise<AxiosRequestConfig>;

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop()?.split(';').shift() || null : null;
};

// NEW: Token retrieval function
let getAuthTokenFn: (() => string | null) | null = null;

export const setAuthTokenGetter = (fn: () => string | null) => {
  getAuthTokenFn = fn;
};

const requestInterceptor: RequestInterceptor = async (config) => {
  const headers = config.headers ?? (config.headers = {});
  
  if (!headers['X-Request-ID']) {
    headers['X-Request-ID'] = createRequestId();
  }
  
  // Add CSRF token for state-changing requests
  const method = (config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  // NEW: Add Bearer token if available and not already present
  if (!headers['Authorization'] && getAuthTokenFn) {
    const token = getAuthTokenFn();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔐 Added Bearer token to request', {
        url: config.url,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 30) + '...',
      });
    }
  }
  
  return config;
};

const responseInterceptor = (response: AxiosResponse) => {
  return response;
};

const buildNormalizedError = (error: AxiosError): NormalizedError => {
  if (error.response) {
    const responseData = error.response.data;
    const message =
      typeof responseData === 'object' && responseData !== null && 'message' in responseData
        ? String((responseData as Record<string, unknown>).message)
        : error.message;

    return {
      message,
      status: error.response.status,
      data: responseData,
    };
  }

  if (error.code === 'ECONNABORTED') {
    return {
      message: `The request timed out after ${(error.config?.timeout ?? DEFAULT_TIMEOUT) / 1000} seconds. Please try again.`,
    };
  }

  return {
    message: error.message || 'Unable to complete the request. Please try again.',
  };
};

const errorInterceptor = (error: AxiosError) => {
  const normalized = buildNormalizedError(error);
  const enrichedError = new Error(normalized.message);
  (enrichedError as Error & NormalizedError).status = normalized.status;
  (enrichedError as Error & NormalizedError).data = normalized.data;
  throw enrichedError;
};

apiClient.interceptors.request.use(requestInterceptor);
apiClient.interceptors.response.use(responseInterceptor, errorInterceptor);

export const getApiClient = () => apiClient;

export const apiFetch = async (endpoint: string, options: ApiFetchOptions = {}) => {
  const {
    auth = false,
    body,
    method = 'GET',
    timeout = DEFAULT_TIMEOUT,
    params,
    ...rest
  } = options;

  const config: AxiosRequestConfig = {
    url: resolveEndpoint(endpoint),
    method,
    timeout,
    ...rest,
  };

  const upperMethod = method?.toString().toUpperCase() ?? 'GET';

  // NEW: If auth is explicitly requested, ensure token is added
  // Note: We use cookie-based auth, so token may be null - cookies are sent via withCredentials
  if (auth && getAuthTokenFn) {
    const token = getAuthTokenFn();
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }
    // Don't warn if token is null - we use cookie-based auth (HttpOnly cookies)
    // Cookies are automatically sent via withCredentials: true
  }

  if (body) {
    if (upperMethod === 'GET' || upperMethod === 'HEAD') {
      config.params = {
        ...(params || {}),
        ...(typeof body === 'object' ? body : {}),
      };
    } else {
      config.data = body;
      config.headers = {
        'Content-Type': 'application/json',
        ...config.headers,
      };
    }
  } else if (params) {
    config.params = params;
  }

  const response = await apiClient.request(config);
  return response.data;
};

export type ApiClient = typeof apiClient;