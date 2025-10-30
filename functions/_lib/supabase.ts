export interface SupabaseEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SERVICE_ROLE?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  PUBLIC_SUPABASE_URL?: string;
  PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

export interface User {
  id: string;
  email?: string;
  [key: string]: any;
}

// Lightweight Supabase client for Cloudflare Workers/Pages Functions
export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}

export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface QueryBuilder<T> {
  select(columns?: string): QueryBuilder<T>;
  insert(values: any[]): QueryBuilder<T>;
  update(values: any): QueryBuilder<T>;
  delete(): QueryBuilder<T>;
  eq(column: string, value: any): QueryBuilder<T>;
  neq(column: string, value: any): QueryBuilder<T>;
  gt(column: string, value: any): QueryBuilder<T>;
  gte(column: string, value: any): QueryBuilder<T>;
  lt(column: string, value: any): QueryBuilder<T>;
  lte(column: string, value: any): QueryBuilder<T>;
  in(column: string, values: any[]): QueryBuilder<T>;
  is(column: string, value: any): QueryBuilder<T>;
  like(column: string, pattern: string): QueryBuilder<T>;
  ilike(column: string, pattern: string): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  single<S = T>(): Promise<SupabaseResponse<S>>;
  maybeSingle<S = T>(): Promise<SupabaseResponse<S>>;
  then<S = T>(
    onfulfilled?: (value: SupabaseResponse<T>) => S | Promise<S>,
    onrejected?: (reason: any) => any
  ): Promise<S>;
}

interface AuthAdmin {
  getUserById(userId: string): Promise<SupabaseResponse<{ user: User }>>;
}

interface Auth {
  admin: AuthAdmin;
}

export interface ServiceSupabaseClient {
  from<T = any>(table: string): QueryBuilder<T>;
  rpc<T = any>(fn: string, params?: Record<string, any>): Promise<SupabaseResponse<T>>;
  auth: Auth;
}

interface SupabaseConfig {
  url: string;
  serviceRoleKey?: string;
  anonKey?: string;
}

const resolveSupabaseUrl = (env: SupabaseEnv) =>
  env.SUPABASE_URL ||
  env.VITE_SUPABASE_URL ||
  env.PUBLIC_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL;

const resolveSupabaseAnonKey = (env: SupabaseEnv) =>
  env.SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const resolveSupabaseServiceRoleKey = (env: SupabaseEnv) =>
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;

const resolveSupabaseConfig = (env: SupabaseEnv): SupabaseConfig => {
  const url = resolveSupabaseUrl(env);
  const serviceRoleKey = resolveSupabaseServiceRoleKey(env);
  const anonKey = resolveSupabaseAnonKey(env);

  if (!url) {
    throw new Error('Server configuration error: Supabase URL is missing.');
  }

  if (!serviceRoleKey && !anonKey) {
    throw new Error('Server configuration error: Supabase service role or anon key is missing.');
  }

  return { url, serviceRoleKey, anonKey };
};

const buildAuthUserUrl = (supabaseUrl: string) => {
  const base = new URL(supabaseUrl);
  base.pathname = '/auth/v1/user';
  base.search = '';
  return base.toString();
};

const parseSupabaseUser = (payload: any): User | null => {
  if (payload && typeof payload === 'object') {
    if (payload.user && typeof payload.user === 'object') {
      return payload.user as User;
    }
    if ('id' in payload) {
      return payload as User;
    }
  }
  return null;
};

const parseCookieHeader = (cookieHeader: string | null) => {
  if (!cookieHeader) {
    return {} as Record<string, string>;
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawName, ...rawValue] = part.split('=');
    if (!rawName) {
      return acc;
    }
    const name = rawName.trim();
    if (!name) {
      return acc;
    }
    const value = rawValue.join('=');
    acc[name] = decodeURIComponent(value ?? '');
    return acc;
  }, {});
};

const SUPABASE_ACCESS_COOKIE_PATTERNS = [
  /^sb-[^-]+-access-token$/,
  /^sb-[^-]+-auth-token$/,
];

// Create a lightweight query builder for Cloudflare Workers
class SupabaseQueryBuilder<T> implements QueryBuilder<T> {
  private table: string;
  private url: string;
  private apiKey: string;
  private accessToken?: string;
  private method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET';
  private selectColumns?: string;
  private filters: string[] = [];
  private orderBy?: string;
  private limitCount?: number;
  private body?: any;
  private preferHeader?: string;

  constructor(table: string, url: string, apiKey: string, accessToken?: string) {
    this.table = table;
    this.url = url;
    this.apiKey = apiKey;
    this.accessToken = accessToken;
  }

  select(columns: string = '*'): QueryBuilder<T> {
    this.selectColumns = columns;
    this.method = 'GET';
    return this;
  }

  insert(values: any[]): QueryBuilder<T> {
    this.method = 'POST';
    this.body = values;
    this.preferHeader = 'return=representation';
    return this;
  }

  update(values: any): QueryBuilder<T> {
    this.method = 'PATCH';
    this.body = values;
    this.preferHeader = 'return=representation';
    return this;
  }

  delete(): QueryBuilder<T> {
    this.method = 'DELETE';
    this.preferHeader = 'return=representation';
    return this;
  }

  eq(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}=eq.${encodeURIComponent(String(value))}`);
    return this;
  }

  neq(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}=neq.${encodeURIComponent(String(value))}`);
    return this;
  }

  gt(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}=gt.${encodeURIComponent(String(value))}`);
    return this;
  }

  gte(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}=gte.${encodeURIComponent(String(value))}`);
    return this;
  }

  lt(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}=lt.${encodeURIComponent(String(value))}`);
    return this;
  }

  lte(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}=lte.${encodeURIComponent(String(value))}`);
    return this;
  }

  in(column: string, values: any[]): QueryBuilder<T> {
    const encoded = values.map((v) => encodeURIComponent(String(v))).join(',');
    this.filters.push(`${column}=in.(${encoded})`);
    return this;
  }

  is(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}=is.${value === null ? 'null' : String(value)}`);
    return this;
  }

  like(column: string, pattern: string): QueryBuilder<T> {
    this.filters.push(`${column}=like.${encodeURIComponent(pattern)}`);
    return this;
  }

  ilike(column: string, pattern: string): QueryBuilder<T> {
    this.filters.push(`${column}=ilike.${encodeURIComponent(pattern)}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    const direction = options?.ascending === false ? '.desc' : '.asc';
    this.orderBy = `${column}${direction}`;
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.limitCount = count;
    return this;
  }

  private buildUrl(): string {
    const baseUrl = `${this.url}/rest/v1/${this.table}`;
    const params = new URLSearchParams();

    if (this.selectColumns) {
      params.set('select', this.selectColumns);
    }

    if (this.orderBy) {
      params.set('order', this.orderBy);
    }

    if (this.limitCount !== undefined) {
      params.set('limit', String(this.limitCount));
    }

    for (const filter of this.filters) {
      const [key, value] = filter.split('=');
      params.append(key, value);
    }

    const query = params.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  }

  private async execute<S = T>(): Promise<SupabaseResponse<S>> {
    const url = this.buildUrl();
    const headers: Record<string, string> = {
      apikey: this.apiKey,
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    if (this.preferHeader) {
      headers.Prefer = this.preferHeader;
    }

    try {
      const response = await fetch(url, {
        method: this.method,
        headers,
        body: this.body ? JSON.stringify(this.body) : undefined,
      });

      const text = await response.text();
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        const error: SupabaseError = {
          message: data?.message || data?.error || `Request failed with status ${response.status}`,
          code: data?.code || String(response.status),
          details: data?.details,
          hint: data?.hint,
        };
        return { data: null, error };
      }

      return { data: data as S, error: null };
    } catch (error: any) {
      return {
        data: null,
        error: {
          message: error?.message || 'Network error',
        },
      };
    }
  }

  async single<S = T>(): Promise<SupabaseResponse<S>> {
    this.preferHeader = 'return=representation';
    this.limitCount = 1;
    const result = await this.execute<S[]>();

    if (result.error) {
      return { data: null, error: result.error };
    }

    if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      return {
        data: null,
        error: { message: 'No rows found' },
      };
    }

    const single = Array.isArray(result.data) ? result.data[0] : result.data;
    return { data: single as S, error: null };
  }

  async maybeSingle<S = T>(): Promise<SupabaseResponse<S>> {
    this.preferHeader = 'return=representation';
    this.limitCount = 1;
    const result = await this.execute<S[]>();

    if (result.error) {
      return { data: null, error: result.error };
    }

    if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      return { data: null, error: null };
    }

    const single = Array.isArray(result.data) ? result.data[0] : result.data;
    return { data: single as S, error: null };
  }

  then<S = T>(
    onfulfilled?: (value: SupabaseResponse<T>) => S | Promise<S>,
    onrejected?: (reason: any) => any
  ): Promise<S> {
    return this.execute<T>().then(onfulfilled as any, onrejected);
  }
}

// Lightweight Supabase client implementation
class SupabaseClient implements ServiceSupabaseClient {
  private url: string;
  private apiKey: string;
  private accessToken?: string;

  constructor(url: string, apiKey: string, accessToken?: string) {
    this.url = url;
    this.apiKey = apiKey;
    this.accessToken = accessToken;
  }

  from<T = any>(table: string): QueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(table, this.url, this.apiKey, this.accessToken);
  }

  async rpc<T = any>(fn: string, params?: Record<string, any>): Promise<SupabaseResponse<T>> {
    const url = `${this.url}/rest/v1/rpc/${fn}`;
    const headers: Record<string, string> = {
      apikey: this.apiKey,
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: params ? JSON.stringify(params) : undefined,
      });

      const text = await response.text();
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        const error: SupabaseError = {
          message: data?.message || data?.error || `RPC failed with status ${response.status}`,
          code: data?.code || String(response.status),
          details: data?.details,
          hint: data?.hint,
        };
        return { data: null, error };
      }

      return { data: data as T, error: null };
    } catch (error: any) {
      return {
        data: null,
        error: {
          message: error?.message || 'Network error',
        },
      };
    }
  }

  get auth(): Auth {
    return {
      admin: {
        getUserById: async (userId: string): Promise<SupabaseResponse<{ user: User }>> => {
          const url = `${this.url}/auth/v1/admin/users/${userId}`;
          const headers: Record<string, string> = {
            apikey: this.apiKey,
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          };

          try {
            const response = await fetch(url, {
              method: 'GET',
              headers,
            });

            const text = await response.text();
            let data = null;

            if (text) {
              try {
                data = JSON.parse(text);
              } catch {
                data = text;
              }
            }

            if (!response.ok) {
              const error: SupabaseError = {
                message: data?.message || data?.error || `Auth request failed with status ${response.status}`,
                code: data?.code || String(response.status),
                details: data?.details,
                hint: data?.hint,
              };
              return { data: null, error };
            }

            return { data: { user: data as User }, error: null };
          } catch (error: any) {
            return {
              data: null,
              error: {
                message: error?.message || 'Network error',
              },
            };
          }
        },
      },
    };
  }
}

export const getServiceSupabaseClient = (
  env: SupabaseEnv,
  accessToken?: string
): ServiceSupabaseClient => {
  const { url, serviceRoleKey, anonKey } = resolveSupabaseConfig(env);
  const apiKey = serviceRoleKey || anonKey!;

  return new SupabaseClient(url, apiKey, accessToken);
};

export const extractAccessToken = (request: Request): string | null => {
  console.log('🔑 extractAccessToken: Starting token extraction');

  const authHeader = request.headers.get('authorization');
  console.log('  - Authorization header:', authHeader ? `${authHeader.substring(0, 40)}...` : 'not present');

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    console.log('  ✅ Token found in Authorization header');
    return token;
  }

  const cookieHeader = request.headers.get('cookie');
  console.log('  - Cookie header:', cookieHeader ? `${cookieHeader.substring(0, 80)}...` : 'not present');

  const cookies = parseCookieHeader(cookieHeader);
  console.log('  - Parsed cookie names:', Object.keys(cookies).join(', ') || 'none');

  for (const [name, value] of Object.entries(cookies)) {
    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName) {
      continue;
    }
    if (
      normalizedName === 'sb-access-token' ||
      normalizedName === 'sb-auth-token' ||
      normalizedName === 'supabase-auth-token' ||
      normalizedName === 'sb:token'
    ) {
      console.log(`  ✅ Token found in cookie: ${name}`);
      return value;
    }

    if (SUPABASE_ACCESS_COOKIE_PATTERNS.some((pattern) => pattern.test(normalizedName))) {
      console.log(`  ✅ Token found in cookie (pattern match): ${name}`);
      return value;
    }
  }

  console.log('  ❌ No token found in Authorization header or cookies');
  return null;
};

export const requireUser = async (request: Request, env: SupabaseEnv) => {
  const accessToken = extractAccessToken(request);
  if (!accessToken) {
    throw new Error('Missing access token.');
  }

  const { url, serviceRoleKey, anonKey } = resolveSupabaseConfig(env);
  const authUserUrl = buildAuthUserUrl(url);

  try {
    const response = await fetch(authUserUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: serviceRoleKey || anonKey!,
      },
    });

    if (!response.ok) {
      throw new Error('Invalid or expired authentication token.');
    }

    const payload = await response.json();
    const user = parseSupabaseUser(payload);

    if (!user) {
      throw new Error('Invalid or expired authentication token.');
    }

    const supabase = getServiceSupabaseClient(env, accessToken);

    return { supabase, user, accessToken };
  } catch (error: any) {
    const message = error?.message || 'Invalid or expired authentication token.';
    throw new Error(message);
  }
};
