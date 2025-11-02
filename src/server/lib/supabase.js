/* eslint-env node */

import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

export const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, clientOptions)
  : null;

const ensureAdminClient = () => {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const error = new Error('Supabase admin client is not configured.');
  error.status = 500;
  throw error;
};

export async function requireUserFromAuthHeader(req) {
  // Priority 1: Check if user was authenticated via cookies by attachSession middleware
  if (req.user && req.user.id) {
    return req.user;
  }

  // Priority 2: Try bearer token from Authorization header
  const authHeader = req.headers.authorization || '';
  let token = null;

  if (typeof authHeader === 'string') {
    const [scheme, value] = authHeader.split(' ');
    if (scheme && value && scheme.toLowerCase() === 'bearer') {
      token = value.trim();
    }
  }

  if (!token) {
    const error = new Error('Missing bearer token');
    error.status = 401;
    throw error;
  }

  const client = ensureAdminClient();
  const { data, error } = await client.auth.getUser(token);

  if (error || !data?.user) {
    const rejection = new Error('Invalid or expired access token');
    rejection.status = 401;
    throw rejection;
  }

  return { ...data.user, accessToken: token };
}
