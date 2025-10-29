import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type QueryKey = ReadonlyArray<unknown>;

type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

type QueryUpdater<TData> = TData | ((previousData: TData | undefined) => TData);

interface QueryEntry<TData = unknown> {
  data?: TData;
  error?: unknown;
  status: QueryStatus;
  lastUpdated?: number;
  promise?: Promise<TData>;
  subscribers: Set<() => void>;
  fetcher?: () => Promise<TData>;
  staleTime?: number;
}

interface EnsureOptions {
  staleTime?: number;
  force?: boolean;
}

interface InvalidateOptions {
  queryKey: QueryKey;
}

const hashQueryKey = (queryKey: QueryKey) => JSON.stringify(queryKey);

class QueryClient {
  private cache = new Map<string, QueryEntry>();

  private getOrCreateEntry<TData>(queryKey: QueryKey): QueryEntry<TData> {
    const hash = hashQueryKey(queryKey);
    let entry = this.cache.get(hash) as QueryEntry<TData> | undefined;
    if (!entry) {
      entry = {
        status: 'idle',
        subscribers: new Set(),
      };
      this.cache.set(hash, entry as QueryEntry);
    }
    return entry;
  }

  private notify(queryKey: QueryKey) {
    const hash = hashQueryKey(queryKey);
    const entry = this.cache.get(hash);
    if (!entry) {
      return;
    }
    entry.subscribers.forEach((listener) => listener());
  }

  async ensureQuery<TData>(
    queryKey: QueryKey,
    queryFn: () => Promise<TData>,
    options: EnsureOptions = {}
  ) {
    const entry = this.getOrCreateEntry<TData>(queryKey);
    entry.fetcher = queryFn;
    entry.staleTime = options.staleTime;

    const now = Date.now();
    const isFresh =
      typeof entry.lastUpdated === 'number' &&
      typeof options.staleTime === 'number' &&
      now - entry.lastUpdated < options.staleTime;

    if (!options.force && isFresh && entry.status === 'success') {
      return entry.data as TData;
    }

    if (!options.force && entry.promise) {
      return entry.promise;
    }

    const promise = (async () => {
      try {
        entry.status = 'loading';
        this.notify(queryKey);
        const data = await queryFn();
        entry.data = data;
        entry.error = undefined;
        entry.status = 'success';
        entry.lastUpdated = Date.now();
        return data;
      } catch (error) {
        entry.error = error;
        entry.status = 'error';
        throw error;
      } finally {
        entry.promise = undefined;
        this.notify(queryKey);
      }
    })();

    entry.promise = promise;
    return promise;
  }

  subscribe(queryKey: QueryKey, listener: () => void) {
    const entry = this.getOrCreateEntry(queryKey);
    entry.subscribers.add(listener);
    return () => {
      entry.subscribers.delete(listener);
    };
  }

  getQueryState<TData>(queryKey: QueryKey): QueryEntry<TData> {
    return this.getOrCreateEntry<TData>(queryKey);
  }

  getQueryData<TData>(queryKey: QueryKey) {
    return this.getOrCreateEntry<TData>(queryKey).data as TData | undefined;
  }

  setQueryData<TData>(queryKey: QueryKey, updater: QueryUpdater<TData>) {
    const entry = this.getOrCreateEntry<TData>(queryKey);
    const previous = entry.data as TData | undefined;
    const next =
      typeof updater === 'function'
        ? (updater as (value: TData | undefined) => TData)(previous)
        : updater;
    entry.data = next;
    entry.error = undefined;
    entry.status = 'success';
    entry.lastUpdated = Date.now();
    this.notify(queryKey);
    return next;
  }

  async invalidateQueries(options: InvalidateOptions) {
    const entry = this.getQueryState(options.queryKey);
    entry.lastUpdated = undefined;
    entry.status = 'idle';
    this.notify(options.queryKey);

    if (entry.fetcher) {
      await this.ensureQuery(options.queryKey, entry.fetcher, {
        staleTime: entry.staleTime,
        force: true,
      });
    }
  }
}

export const queryClient = new QueryClient();

const QueryClientContext = createContext<QueryClient | null>(null);

interface QueryClientProviderProps {
  client: QueryClient;
  children: React.ReactNode;
}

export const QueryClientProvider = ({ client, children }: QueryClientProviderProps) => {
  const value = useMemo(() => client, [client]);
  return <QueryClientContext.Provider value={value}>{children}</QueryClientContext.Provider>;
};

export const useQueryClient = () => {
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error('useQueryClient must be used within a QueryClientProvider.');
  }
  return client;
};

interface UseQueryOptions<TData> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  enabled?: boolean;
  staleTime?: number;
}

interface UseQueryResult<TData> {
  data: TData | undefined;
  error: unknown;
  status: QueryStatus;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
}

export function useQuery<TData>({
  queryKey,
  queryFn,
  enabled = true,
  staleTime = 0,
}: UseQueryOptions<TData>): UseQueryResult<TData> {
  const client = useQueryClient();
  const keyRef = useRef<QueryKey>(queryKey);

  useEffect(() => {
    keyRef.current = queryKey;
  }, [queryKey]);

  const [state, setState] = useState(() => client.getQueryState<TData>(queryKey));

  useEffect(() => {
    setState(client.getQueryState<TData>(queryKey));
    const unsubscribe = client.subscribe(queryKey, () => {
      setState(client.getQueryState<TData>(queryKey));
    });
    return unsubscribe;
  }, [client, queryKey]);

  const executeFetch = useCallback(
    async (force = false) => {
      if (!enabled) {
        return;
      }
      await client.ensureQuery<TData>(queryKey, queryFn, {
        staleTime,
        force,
      });
    },
    [client, enabled, queryFn, queryKey, staleTime]
  );

  useEffect(() => {
    executeFetch();
  }, [executeFetch]);

  return {
    data: state.data as TData | undefined,
    error: state.error,
    status: state.status,
    isLoading: state.status === 'loading' && !state.data,
    isFetching: state.status === 'loading',
    refetch: () => executeFetch(true),
  };
}

export { QueryClient };
