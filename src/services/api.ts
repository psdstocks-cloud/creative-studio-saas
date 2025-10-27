
const API_KEY = 'A8K9bV5s2OX12E8cmS4I96mtmSNzv7';
const API_BASE_URL = 'https://nehtw.com/api';

interface ApiFetchOptions extends RequestInit {
  timeout?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any; // Allow any body type for processing
}

/**
 * A shared, hardened helper function to make authenticated API requests.
 * It includes a guaranteed timeout, automatically adds the API key,
 * handles JSON body serialization, and provides consistent error handling.
 * For GET requests, it converts the body into URL search parameters.
 * @param endpoint The API endpoint to call (e.g., '/stockinfo/shutterstock/123').
 * @param options The request options, including method, body, and timeout.
 * @returns A promise that resolves with the JSON response.
 */
export const apiFetch = async (endpoint: string, options: ApiFetchOptions = {}) => {
  const { timeout = 30000, body, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  let finalEndpoint = endpoint;

  const headers: HeadersInit = {
    'X-Api-Key': API_KEY,
    ...fetchOptions.headers,
  };

  const config: RequestInit = {
    ...fetchOptions,
    headers,
    signal: controller.signal,
  };
  
  const method = (config.method || 'GET').toUpperCase();

  if (body) {
    if (method === 'GET' || method === 'HEAD') {
      // For GET requests, convert body object to URL query parameters
      const params = new URLSearchParams(body);
      finalEndpoint += `?${params.toString()}`;
    } else {
      // For other methods (POST, PUT, etc.), use a JSON body
      headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(body);
    }
  }

  try {
    const fullUrl = `${API_BASE_URL}${finalEndpoint}`;
    console.log('🌐 API Request:', method, fullUrl);
    
    const response = await fetch(fullUrl, config);
    
    console.log('📡 API Response:', response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error('❌ API Error Data:', errorData);
        errorMessage = errorData.message || errorData.error || errorData.data || errorMessage;
      } catch (e) {
        // Ignore if the body isn't JSON or is empty.
        console.warn('⚠️ Could not parse error response as JSON');
      }
      throw new Error(errorMessage);
    }
    
    // Handle successful responses that may not have content to parse
    const text = await response.text();
    const result = text ? JSON.parse(text) : null;
    console.log('✅ API Success:', result);
    return result;

  } catch (error: any) {
    console.error('🔥 API Fetch Error:', error);
    if (error.name === 'AbortError') {
      throw new Error(`The request timed out after ${timeout / 1000} seconds. Please try again.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};