import { handleOptions, jsonResponse } from '../../_lib/http';
import { deleteCsrfCookie } from '../../_lib/csrf';
import { serializeAuthCookie } from '../../_lib/cookie';

interface EnvBindings {
  NODE_ENV?: string;
}

const isDevelopment = (env: EnvBindings) => {
  const nodeEnv = env.NODE_ENV || 'development';
  return nodeEnv !== 'production';
};

export const onRequest = async ({ request, env }: { request: Request; env: EnvBindings }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, 405, { message: 'Method Not Allowed' });
  }

  try {
    const devMode = isDevelopment(env);

    const headers = new Headers();
    headers.append('Set-Cookie', serializeAuthCookie('sb-access-token', '', devMode) + '; Max-Age=0');
    headers.append('Set-Cookie', deleteCsrfCookie(devMode));

    return jsonResponse(request, 200, { message: 'Signed out successfully' }, headers);
  } catch (error: any) {
    console.error('Sign out error:', error);
    return jsonResponse(request, 500, { message: 'Sign out failed' });
  }
};

