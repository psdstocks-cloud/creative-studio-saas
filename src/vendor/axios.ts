export interface AxiosRequestConfig {
  url?: string;
  baseURL?: string;
  method?: string;
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, unknown>;
  timeout?: number;
  withCredentials?: boolean;
  signal?: AbortSignal;
}

export interface AxiosResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
}

export class AxiosError<T = unknown> extends Error {
  config: AxiosRequestConfig;
  response?: AxiosResponse<T>;
  code?: string;

  constructor(message: string, config: AxiosRequestConfig, response?: AxiosResponse<T>, code?: string) {
    super(message);
    this.name = 'AxiosError';
    this.config = config;
    this.response = response;
    this.code = code;
  }
}

type FulfilledFn<T> = (value: T) => T | Promise<T>;
type RejectedFn = (error: any) => any;

class InterceptorManager<T> {
  private handlers: Array<{ fulfilled: FulfilledFn<T>; rejected?: RejectedFn } | null> = [];

  use(fulfilled: FulfilledFn<T>, rejected?: RejectedFn) {
    this.handlers.push({ fulfilled, rejected });
    return this.handlers.length - 1;
  }

  eject(id: number) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  async run(value: T): Promise<T> {
    let current = value;
    for (const handler of this.handlers) {
      if (!handler) {
        continue;
      }
      current = await handler.fulfilled(current);
    }
    return current;
  }

  async runError(error: any): Promise<any> {
    let currentError = error;
    for (const handler of this.handlers) {
      if (!handler || !handler.rejected) {
        continue;
      }
      try {
        const maybeResult = await handler.rejected(currentError);
        if (maybeResult !== undefined) {
          return maybeResult;
        }
      } catch (nextError) {
        currentError = nextError;
      }
    }
    throw currentError;
  }
}

class AxiosClient {
  defaults: AxiosRequestConfig;
  interceptors = {
    request: new InterceptorManager<AxiosRequestConfig>(),
    response: new InterceptorManager<AxiosResponse>(),
  };

  constructor(defaults: AxiosRequestConfig = {}) {
    this.defaults = defaults;
  }

  private buildUrl(config: AxiosRequestConfig) {
    const base = config.baseURL ?? '';
    const path = config.url ?? '';
    const url = new URL(path, base || undefined);

    if (config.params) {
      Object.entries(config.params).forEach(([key, value]) => {
        if (typeof value === 'undefined' || value === null) {
          return;
        }
        url.searchParams.set(key, String(value));
      });
    }

    return url.toString();
  }

  private normalizeHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private async parseResponseBody(response: Response) {
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    if (!text) {
      return null;
    }
    if (contentType && contentType.includes('application/json')) {
      try {
        return JSON.parse(text);
      } catch (error) {
        return text;
      }
    }
    return text;
  }

  private toAxiosError(error: unknown, config: AxiosRequestConfig): AxiosError {
    if (error instanceof AxiosError) {
      return error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return new AxiosError('Request aborted', config, undefined, 'ECONNABORTED');
    }
    const message = error instanceof Error ? error.message : 'Request failed';
    return new AxiosError(message, config);
  }

  async request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const mergedConfig: AxiosRequestConfig = {
      ...this.defaults,
      ...config,
    };

    if (!mergedConfig.url && !mergedConfig.baseURL) {
      throw new Error('Request URL is required.');
    }

    const processedConfig = await this.interceptors.request.run(mergedConfig);
    const url = this.buildUrl(processedConfig);
    const method = (processedConfig.method || 'GET').toUpperCase();
    const headers = { ...(processedConfig.headers ?? {}) } as Record<string, string>;

    let body: BodyInit | undefined;
    if (processedConfig.data !== undefined && method !== 'GET' && method !== 'HEAD') {
      if (typeof processedConfig.data === 'string' || processedConfig.data instanceof FormData) {
        body = processedConfig.data as BodyInit;
      } else {
        headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
        body = JSON.stringify(processedConfig.data);
      }
    }

    const controller = new AbortController();
    const timeoutId = processedConfig.timeout
      ? setTimeout(() => controller.abort(), processedConfig.timeout)
      : undefined;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        credentials: processedConfig.withCredentials ? 'include' : 'same-origin',
        signal: processedConfig.signal ?? controller.signal,
      });

      const payload = await this.parseResponseBody(response);
      const axiosResponse: AxiosResponse<T> = {
        data: payload as T,
        status: response.status,
        statusText: response.statusText,
        headers: this.normalizeHeaders(response.headers),
        config: processedConfig,
      };

      if (!response.ok) {
        throw new AxiosError(response.statusText || 'Request failed', processedConfig, axiosResponse, String(response.status));
      }

      const handledResponse = await this.interceptors.response.run(axiosResponse);
      return handledResponse as AxiosResponse<T>;
    } catch (error) {
      const axiosError = this.toAxiosError(error, processedConfig);
      try {
        const maybeRecovered = await this.interceptors.response.runError(axiosError);
        return maybeRecovered as AxiosResponse<T>;
      } catch (finalError) {
        if (finalError instanceof AxiosError) {
          throw finalError;
        }
        throw this.toAxiosError(finalError, processedConfig);
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}

export interface AxiosInstance {
  request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  interceptors: {
    request: InterceptorManager<AxiosRequestConfig>;
    response: InterceptorManager<AxiosResponse>;
  };
}

export interface AxiosStatic {
  create(config?: AxiosRequestConfig): AxiosInstance;
}

const axios: AxiosStatic = {
  create(defaults: AxiosRequestConfig = {}) {
    return new AxiosClient(defaults);
  },
};

export default axios;
