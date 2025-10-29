import { useQuery } from '../../lib/queryClient';
import { fetchAccountOverview } from '../../services/accountService';
import type { AccountOverview } from '../../types';

export const ACCOUNT_QUERY_KEY = ['account', 'overview'] as const;

export const useAccountQuery = (enabled: boolean) => {
  return useQuery<AccountOverview>({
    queryKey: ACCOUNT_QUERY_KEY,
    queryFn: fetchAccountOverview,
    enabled,
    staleTime: 30_000,
  });
};
