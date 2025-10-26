
const API_KEY = 'A8K9bV5s2OX12E8cmS4I96mtmSNzv7';
const API_BASE_URL = 'https://nehtw.com/api';

interface ApiFetchOptions extends RequestInit {
  timeout?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any; // Allow any body type for JSON.stringify
}

/**
 * A shared, hardened helper function to make authenticated API requests.
 * It includes a guaranteed timeout, automatically adds the API key,
 * handles JSON body serialization, and provides consistent error handling.
 * @param endpoint The API endpoint to call (e.g., '/stockinfo/shutterstock/123').
 * @param options The request options, including method, body, and timeout.
 * @returns A promise that resolves with the JSON response.
 */
export const apiFetch = async (endpoint: string, options: ApiFetchOptions = {}) => {
  const { timeout = 30000, body, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const headers: HeadersInit = {
    'X-Api-Key': API_KEY,
    ...fetchOptions.headers,
  };

  const config: RequestInit = {
    ...fetchOptions,
    headers,
    signal: controller.signal,
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.data || errorMessage;
      } catch (e) {
        // Ignore if the body isn't JSON or is empty.
      }
      throw new Error(errorMessage);
    }
    
    // Handle successful responses that may not have content to parse
    const text = await response.text();
    return text ? JSON.parse(text) : null;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`The request timed out after ${timeout / 1000} seconds. Please try again.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
