import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { supabase } from './supabaseClient';

const API_BASE_URL = '/api';
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

const createRequestId = () => `rq_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 8)}`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT,
});

type MaybePromise<T> = T | Promise<T>;

type RequestInterceptor = (config: AxiosRequestConfig) => MaybePromise<AxiosRequestConfig>;

const requestInterceptor: RequestInterceptor = async (config) => {
  const headers = config.headers ?? (config.headers = {});
  if (!headers['X-Request-ID']) {
    headers['X-Request-ID'] = createRequestId();
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
      (typeof responseData === 'object' && responseData !== null && 'message' in responseData)
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
  const { auth = false, body, method = 'GET', timeout = DEFAULT_TIMEOUT, params, ...rest } = options;

  const config: AxiosRequestConfig = {
    url: endpoint,
    method,
    timeout,
    ...rest,
  };

  const upperMethod = method?.toString().toUpperCase() ?? 'GET';

  if (auth) {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('You must be signed in to perform this action.');
      }

      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message || 'Unable to authenticate request.');
      }
      throw new Error('Unable to authenticate request.');
    }
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
