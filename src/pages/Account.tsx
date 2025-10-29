import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { ArrowPathIcon, UserCircleIcon, WalletIcon } from '../components/icons/Icons';
import { useAccountQuery, ACCOUNT_QUERY_KEY } from '../hooks/queries/useAccount';
import { useQueryClient } from '../lib/queryClient';
import { sendPoints, type SendPointsPayload } from '../services/accountService';
import type { AccountOverview } from '../types';

interface TransferRecord {
  id: string;
  receiver: string;
  amount: number;
  note?: string;
  createdAt: string;
  status: 'success' | 'failed';
  message: string;
}

const formatTimestamp = (value: string | null): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const createTransferRecord = (
  receiver: string,
  amount: number,
  note: string | undefined,
  status: TransferRecord['status'],
  message: string
): TransferRecord => ({
  id: `transfer-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  receiver,
  amount,
  note,
  createdAt: new Date().toISOString(),
  status,
  message,
});

const AccountPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, updateUserBalance, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { data: account, status, error } = useAccountQuery(Boolean(user?.id));

  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [balanceMessage, setBalanceMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [transferMessage, setTransferMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);

  const accountError =
    status === 'error' ? (error instanceof Error ? error.message : t('balanceRefreshError')) : null;

  useEffect(() => {
    if (account) {
      setLastFetchedAt(new Date().toISOString());
    }
  }, [account]);

  const balance = useMemo(() => {
    if (typeof account?.balance === 'number') {
      return account.balance;
    }

    if (typeof user?.balance === 'number') {
      return user.balance;
    }

    return 0;
  }, [account, user]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setBalanceMessage(null);
    setIsRefreshing(true);

    try {
      await queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
      await refreshProfile();
      setLastFetchedAt(new Date().toISOString());
      setBalanceMessage({ type: 'success', message: t('balanceRefreshSuccess') });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('balanceRefreshError');
      setBalanceMessage({ type: 'error', message });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, refreshProfile, t, user?.id]);

  const persistBalance = useCallback(
    (nextBalance: number | null) => {
      if (typeof nextBalance === 'number' && Number.isFinite(nextBalance)) {
        updateUserBalance(nextBalance);
        queryClient.setQueryData<AccountOverview>(ACCOUNT_QUERY_KEY, (previous) => {
          if (previous) {
            return {
              ...previous,
              balance: nextBalance,
            };
          }

          if (account) {
            return {
              ...account,
              balance: nextBalance,
            };
          }

          return previous;
        });
      }
    },
    [account, queryClient, updateUserBalance]
  );

  const handleSendPoints = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTransferMessage(null);

      const trimmedReceiver = receiver.trim();
      const amountValue = Number(amount);
      const trimmedNote = note.trim() || undefined;

      if (!trimmedReceiver) {
        setTransferMessage({ type: 'error', message: t('recipientRequired') });
        return;
      }

      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        setTransferMessage({ type: 'error', message: t('amountInvalid') });
        return;
      }

      const payload: SendPointsPayload = {
        receiver: trimmedReceiver,
        amount: amountValue,
        note: trimmedNote,
      };

      setIsSending(true);

      try {
        const result = await sendPoints(payload);
        persistBalance(result.balance);
        setLastFetchedAt(new Date().toISOString());
        setTransfers((previous) =>
          [
            createTransferRecord(
              trimmedReceiver,
              amountValue,
              trimmedNote,
              'success',
              result.message || t('sendPointsSuccess')
            ),
            ...previous,
          ].slice(0, 5)
        );
        setTransferMessage({ type: 'success', message: result.message || t('sendPointsSuccess') });
        setReceiver('');
        setAmount('');
        setNote('');
      } catch (error) {
        const message = error instanceof Error ? error.message : t('sendPointsError');
        setTransfers((previous) =>
          [
            createTransferRecord(trimmedReceiver, amountValue, trimmedNote, 'failed', message),
            ...previous,
          ].slice(0, 5)
        );
        setTransferMessage({ type: 'error', message });
      } finally {
        setIsSending(false);
      }
    },
    [amount, note, persistBalance, receiver, t]
  );

  const isInitialLoading = (status === 'loading' || status === 'idle') && !account;

  if (isInitialLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-300">
        {t('fetching')}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">{t('accountOverviewTitle')}</h1>
              <p className="mt-1 text-sm text-slate-400">{account?.email || user?.email || '—'}</p>
              {account?.username && (
                <p className="mt-1 text-sm text-slate-500">@{account.username}</p>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
              <UserCircleIcon className="h-6 w-6" />
            </div>
          </div>

          <dl className="mt-6 space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">{t('accountIdLabel')}</dt>
              <dd className="font-medium text-white">{account?.id || user?.id || '—'}</dd>
            </div>
            {account?.plan && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">{t('pricing')}</dt>
                <dd className="font-medium text-white">{account.plan}</dd>
              </div>
            )}
            {account?.lastLoginAt && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">{t('lastLoginLabel')}</dt>
                <dd className="font-medium text-white">{formatTimestamp(account.lastLoginAt)}</dd>
              </div>
            )}
            {lastFetchedAt && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">{t('syncedAt')}</dt>
                <dd className="font-medium text-white">{formatTimestamp(lastFetchedAt)}</dd>
              </div>
            )}
          </dl>
          {accountError && <p className="mt-4 text-sm text-rose-400">{accountError}</p>}
        </section>

        <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{t('currentBalance')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('availablePoints')}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <WalletIcon className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-6 text-4xl font-bold text-emerald-400">{balance.toFixed(2)}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              {isRefreshing ? t('fetching') : t('refreshBalance')}
            </Button>
          </div>
          {balanceMessage && (
            <p
              className={`mt-4 text-sm ${balanceMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {balanceMessage.message}
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/30">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{t('sendPointsTitle')}</h2>
            <p className="text-sm text-slate-400">{t('sendPointsDescription')}</p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSendPoints}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="recipient">
              {t('recipientLabel')}
            </label>
            <input
              id="recipient"
              name="recipient"
              type="text"
              required
              value={receiver}
              onChange={(event) => setReceiver(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={t('recipientPlaceholder')}
              disabled={isSending}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="amount">
                {t('amountLabel')}
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={t('amountPlaceholder')}
                disabled={isSending}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="note">
                {t('noteLabel')}
              </label>
              <input
                id="note"
                name="note"
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={t('notePlaceholder')}
                disabled={isSending}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Button type="submit" disabled={isSending}>
              {isSending ? t('fetching') : t('sendPointsButton')}
            </Button>
          </div>
        </form>

        {transferMessage && (
          <p
            className={`mt-4 text-sm ${transferMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}
          >
            {transferMessage.message}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/30">
        <h2 className="text-xl font-semibold text-white">{t('transferHistoryTitle')}</h2>
        {transfers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">{t('transferHistoryEmpty')}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {transfers.map((transfer) => (
              <li
                key={transfer.id}
                className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4"
              >
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span className="font-medium text-white">{transfer.receiver}</span>
                  <span
                    className={transfer.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}
                  >
                    {transfer.status === 'success'
                      ? t('transferStatusSuccess')
                      : t('transferStatusFailed')}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
                  <span>
                    {transfer.amount.toFixed(2)} {t('points')}
                  </span>
                  <span>{formatTimestamp(transfer.createdAt)}</span>
                </div>
                {transfer.note && <p className="mt-2 text-xs text-slate-500">{transfer.note}</p>}
                <p className="mt-2 text-xs text-slate-500">{transfer.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AccountPage;
