import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getStockFileInfo,
  orderStockFile,
  checkOrderStatus,
  generateDownloadLink,
} from '../services/stockService';
import { createOrder, updateOrder, findOrderBySiteAndId } from '../services/filesService';
import type { StockFileInfo, StockOrder, Order } from '../types';
import {
  LinkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  XCircleIcon,
} from './icons/Icons';
import SupportedSites from './SupportedSites';
import { useOrdersQuery, ORDERS_QUERY_KEY } from '../hooks/queries/useOrders';
import { useQueryClient } from '../lib/queryClient';
import { OrdersTable } from './orders/OrdersTable';
import { isAuthError } from '../lib/utils';

type DownloadState = 'idle' | 'fetching' | 'info' | 'ordering' | 'error';
type Mode = 'single' | 'batch';

interface BatchFileInfo extends StockFileInfo {
  status: 'success' | 'error';
  error?: string;
  sourceUrl: string;
  isReDownload?: boolean;
}

const formatBytes = (bytes: number | string | undefined, decimals = 2) => {
  if (bytes === undefined) return 'N/A';
  const bytesNum = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (bytesNum === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytesNum) / Math.log(k));
  return parseFloat((bytesNum / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const useOrderPolling = (
  orders: Order[],
  onUpdate: (taskId: string, newStatus: Order['status']) => void
) => {
  useEffect(() => {
    const processingOrders = orders.filter((o) => o.status === 'processing');
    if (processingOrders.length === 0) return;

    const interval = setInterval(async () => {
      for (const order of processingOrders) {
        try {
          const statusResult = await checkOrderStatus(order.task_id);
          if (statusResult.status === 'ready' || statusResult.status === 'failed') {
            await updateOrder(order.task_id, { status: statusResult.status });
            onUpdate(order.task_id, statusResult.status);
          }
        } catch (err) {
          console.error(`Failed to check status for ${order.task_id}`, err);
          await updateOrder(order.task_id, { status: 'failed' });
          onUpdate(order.task_id, 'failed');
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [orders, onUpdate]);
};

const RecentOrders = ({
  orders,
  onUpdate,
  isFetching,
  error,
  isAuthenticated,
}: {
  orders: Order[];
  onUpdate: (taskId: string, newStatus: Order['status']) => void;
  isFetching: boolean;
  error: unknown;
  isAuthenticated: boolean;
}) => {
  const { t } = useLanguage();
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  const showAuthMessage = !isAuthenticated || isAuthError(error);
  const hasNonAuthError = Boolean(error && !isAuthError(error));
  const pollingOrders = showAuthMessage || hasNonAuthError ? [] : orders;

  useOrderPolling(pollingOrders, onUpdate);

  const handleDownload = useCallback(async (taskId: string) => {
    setDownloading((prev) => new Set(prev).add(taskId));
    try {
      const result = await generateDownloadLink(taskId);
      const downloadUrl =
        result.downloadLink ||
        result.url ||
        result.download_url ||
        result.link ||
        (result.data && (result.data.url || result.data.download_url || result.data.downloadLink));

      if (!downloadUrl || downloadUrl === '') {
        throw new Error('Invalid download URL received from API');
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = '';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('❌ Download error:', err);
      alert(
        err.message ||
          'Could not generate download link. The file may still be processing. Please wait a moment and try again.'
      );
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, []);

  let content: React.ReactNode;

  if (showAuthMessage) {
    content = (
      <p className="rounded-xl border border-dashed border-slate-700/60 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
        {t('signInToViewOrders')}
      </p>
    );
  } else if (hasNonAuthError) {
    content = (
      <p className="rounded-xl border border-dashed border-rose-700/60 bg-rose-950/40 p-6 text-center text-sm text-rose-200">
        {t('recentOrdersLoadError')}
      </p>
    );
  } else {
    content = (
      <OrdersTable
        orders={orders}
        onDownload={handleDownload}
        downloadingIds={downloading}
        isFetching={isFetching}
      />
    );
  }

  return (
    <div className="mt-8 animate-fadeIn">
      <h2 className="mb-4 text-center text-xl font-semibold">{t('recentOrders')}</h2>
      {content}
    </div>
  );
};

const StockDownloader = () => {
  const { t } = useLanguage();
  const { user, updateUserBalance } = useAuth();

  const [mode, setMode] = useState<Mode>('single');

  // Single mode state
  const [url, setUrl] = useState('');
  const [state, setState] = useState<DownloadState>('idle');
  const [singleFileInfo, setSingleFileInfo] = useState<StockFileInfo | null>(null);
  const [previousOrder, setPreviousOrder] = useState<Order | null>(null);

  // Batch mode state
  const [batchUrls, setBatchUrls] = useState('');
  const [batchFileInfos, setBatchFileInfos] = useState<BatchFileInfo[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isFetchingBatch, setIsFetchingBatch] = useState(false);
  const [isOrderingBatch, setIsOrderingBatch] = useState(false);

  // Shared state
  const queryClient = useQueryClient();
  const {
    data: recentOrders = [],
    isFetching: isOrdersFetching,
    error: ordersError,
  } = useOrdersQuery(Boolean(user?.id));
  const [error, setError] = useState<string | null>(null);

  const setRecentOrders = useCallback(
    (updater: (prev: Order[]) => Order[]) => {
      queryClient.setQueryData<Order[]>(ORDERS_QUERY_KEY, (prev) => {
        const base = Array.isArray(prev) ? [...prev] : [];
        const next = updater(base);
        return Array.isArray(next) ? next : base;
      });
    },
    [queryClient]
  );

  const currentUrlCount = useMemo(() => {
    return batchUrls
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean).length;
  }, [batchUrls]);
  const hasUrlCountError = currentUrlCount > 5;

  const refreshRecentOrders = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    try {
      await queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    } catch (err) {
      if (isAuthError(err)) {
        return;
      }
      console.error('Failed to refresh recent orders:', err);
    }
  }, [queryClient, user?.id]);

  useEffect(() => {
    refreshRecentOrders();
  }, [refreshRecentOrders]);

  useEffect(() => {
    handleStartNew();
  }, [mode]);

  const handleStartNew = () => {
    setUrl('');
    setState('idle');
    setSingleFileInfo(null);
    setPreviousOrder(null);
    setBatchUrls('');
    setBatchFileInfos([]);
    setSelectedFileIds(new Set());
    setError(null);
  };

  const handleGetInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || state === 'fetching') return;

    setState('fetching');
    setError(null);
    setSingleFileInfo(null);
    setPreviousOrder(null);

    const trimmedUrl = url.trim();

    try {
      const info = await getStockFileInfo(trimmedUrl);
      if (user) {
        const prevOrder = await findOrderBySiteAndId(info.site, info.id);
        setPreviousOrder(prevOrder && prevOrder.status === 'ready' ? prevOrder : null);
      }
      setSingleFileInfo({ ...info, source_url: trimmedUrl });
      setState('info');
    } catch (err: any) {
      setError(err.message || t('fileFetchError'));
      setState('error');
    }
  };

  const handleOrder = async () => {
    if (!singleFileInfo || !user) return;

    const isReDownload = previousOrder?.status === 'ready';
    const cost = isReDownload ? 0 : singleFileInfo.cost;

    if (cost === null || user.balance < cost) {
      setError(t('insufficientPoints'));
      setState('error');
      return;
    }

    setState('ordering');
    setError(null);

    const trimmedUrl = url.trim();

    try {
      const orderResult = await orderStockFile(singleFileInfo.site, singleFileInfo.id);
      const { order: newOrder, balance } = await createOrder({
        taskId: orderResult.task_id,
        site: singleFileInfo.site,
        stockId: singleFileInfo.id,
        sourceUrl: trimmedUrl,
      });

      if (typeof balance === 'number') {
        updateUserBalance(balance);
      }

      // Immediately add to recent orders for instant feedback
      setRecentOrders((prev) => [newOrder, ...prev]);
      handleStartNew();
      await refreshRecentOrders();
    } catch (err: any) {
      setError(err.message || 'Could not place the order.');
      setState('error');
    }
  };

  const handleGetBatchInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const rawUrls = batchUrls
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    if (rawUrls.length === 0) return;
    if (rawUrls.length > 5) {
      setError(t('batchLimitError'));
      return;
    }

    const uniqueUrls = [...new Set(rawUrls)];

    setIsFetchingBatch(true);
    setBatchFileInfos([]);
    setSelectedFileIds(new Set());

    const results = await Promise.allSettled(
      uniqueUrls.map(async (u: string) => {
        const info = await getStockFileInfo(u as string);
        const prevOrder = user ? await findOrderBySiteAndId(info.site, info.id) : null;
        return { ...info, sourceUrl: u, isReDownload: prevOrder?.status === 'ready' };
      })
    );

    const newFileInfos: BatchFileInfo[] = results.map((result, i) => {
      if (result.status === 'fulfilled') {
        return { ...result.value, status: 'success' } as BatchFileInfo;
      } else {
        return {
          id: `error-${i}-${Date.now()}`,
          status: 'error' as const,
          error: (result.reason as Error).message,
          sourceUrl: uniqueUrls[i] as string,
          site: '',
          preview: '',
          cost: null,
        } as BatchFileInfo;
      }
    });

    setBatchFileInfos(newFileInfos);
    setIsFetchingBatch(false);
  };

  const handleSelectionChange = (fileId: string, isSelected: boolean) => {
    setSelectedFileIds((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const { totalCost, filesToOrder } = useMemo(() => {
    const selectedFiles = batchFileInfos.filter((info) => selectedFileIds.has(info.id));
    const cost = selectedFiles.reduce((sum, info) => {
      if (info.isReDownload) return sum;
      return sum + (info.cost || 0);
    }, 0);
    return { totalCost: cost, filesToOrder: selectedFiles };
  }, [batchFileInfos, selectedFileIds]);

  const handleBatchOrder = async () => {
    if (!user || filesToOrder.length === 0) return;
    if (totalCost > user.balance) {
      setError(t('insufficientPoints'));
      return;
    }

    setIsOrderingBatch(true);
    setError(null);

    try {
      const successfulOrders: Order[] = [];
      let failedCount = 0;

      for (const file of filesToOrder) {
        try {
          const orderResult = await orderStockFile(file.site, file.id);
          const { order: createdOrder, balance } = await createOrder({
            taskId: orderResult.task_id,
            site: file.site,
            stockId: file.id,
            sourceUrl: file.sourceUrl,
          });

          if (typeof balance === 'number') {
            updateUserBalance(balance);
          }

          successfulOrders.push(createdOrder);
        } catch (error) {
          failedCount += 1;
          console.error(`Failed to order file ${file.id}`, error);
        }
      }

      if (failedCount > 0) {
        setError(t('batchOrderError', { count: failedCount }));
      }

      if (successfulOrders.length > 0) {
        setRecentOrders((prev) => [...successfulOrders, ...prev]);
      }

      handleStartNew();
      await refreshRecentOrders();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during batch order.');
    } finally {
      setIsOrderingBatch(false);
    }
  };

  const handleRecentOrderUpdate = useCallback(
    (taskId: string, newStatus: Order['status']) => {
      setRecentOrders((prevOrders) =>
        prevOrders.map((o) => (o.task_id === taskId ? { ...o, status: newStatus } : o))
      );
    },
    [setRecentOrders]
  );

  const renderSingleMode = () => (
    <>
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-slate-700">
        <form onSubmit={handleGetInfo}>
          <label
            htmlFor="stock-url"
            className="block text-sm font-medium text-theme-text-primary mb-2"
          >
            {t('stockUrlLabel')}
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-s-md border border-e-0 border-theme-border bg-gray-50 dark:bg-slate-700 text-theme-text-secondary">
              <LinkIcon />
            </span>
            <input
              type="url"
              id="stock-url"
              value={url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
              placeholder={t('stockUrlPlaceholder')}
              className="flex-1 block w-full p-3 bg-white dark:bg-slate-700 border border-theme-border rounded-e-lg focus:ring-blue-500 focus:border-blue-500 text-theme-text-primary placeholder:text-theme-text-muted"
              required
              disabled={state === 'fetching' || state === 'ordering'}
            />
          </div>
          <button
            type="submit"
            disabled={state === 'fetching' || state === 'ordering' || !url}
            className="w-full mt-4 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {state === 'fetching' ? (
              <ArrowPathIcon className="animate-spin -ms-1 me-2 h-5 w-5" />
            ) : null}
            {state === 'fetching' ? t('fetching') : t('getFileInfo')}
          </button>
        </form>
      </div>
      <div className="max-w-2xl mx-auto mt-6">
        {state === 'fetching' && (
          <div className="text-center p-8">
            <ArrowPathIcon className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
          </div>
        )}
        {state === 'ordering' && (
          <div className="text-center p-8">
            <ArrowPathIcon className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
            <p className="mt-2 font-semibold">{t('ordering')}</p>
          </div>
        )}
        {state === 'error' && (
          <div className="p-4 rounded-lg bg-red-900/50 text-red-300 flex items-start space-x-3 rtl:space-x-reverse">
            <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}
        {state === 'info' &&
          singleFileInfo &&
          user &&
          (() => {
            const isReDownload = !!previousOrder;
            const cost = isReDownload ? 0 : singleFileInfo.cost;
            const hasEnoughPoints = cost !== null && user.balance >= cost;
            return (
              <div className="p-4 rounded-xl glassmorphism animate-fadeIn">
                {isReDownload && (
                  <div className="bg-blue-900/50 text-blue-300 text-sm font-semibold p-3 rounded-lg mb-4 text-center">
                    {t('reDownloadFree')}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-start sm:space-x-6 rtl:space-x-reverse">
                  <img
                    src={singleFileInfo.preview}
                    alt="Stock media preview"
                    className="rounded-lg shadow-lg w-full sm:w-48 h-48 object-cover flex-shrink-0"
                  />
                  <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0 w-full">
                    <h3 className="text-xl font-bold text-white mb-2" title={singleFileInfo.title}>
                      {singleFileInfo.title || t('fileDetails')}
                    </h3>

                    <ul className="text-sm text-gray-300 space-y-1.5 mb-4 border-t border-b border-white/10 py-3">
                      {singleFileInfo.name && (
                        <li className="flex justify-between">
                          <span>{t('fileName')}:</span>{' '}
                          <span
                            className="font-medium text-gray-200 truncate"
                            title={singleFileInfo.name}
                          >
                            {singleFileInfo.name}
                          </span>
                        </li>
                      )}
                      {singleFileInfo.author && (
                        <li className="flex justify-between">
                          <span>{t('author')}:</span>{' '}
                          <span className="font-medium text-gray-200">{singleFileInfo.author}</span>
                        </li>
                      )}
                      {singleFileInfo.ext && (
                        <li className="flex justify-between">
                          <span>{t('fileType')}:</span>{' '}
                          <span className="font-medium text-gray-200">
                            {singleFileInfo.ext.toUpperCase()}
                          </span>
                        </li>
                      )}
                      {singleFileInfo.sizeInBytes && (
                        <li className="flex justify-between">
                          <span>{t('size')}:</span>{' '}
                          <span className="font-medium text-gray-200">
                            {formatBytes(singleFileInfo.sizeInBytes)}
                          </span>
                        </li>
                      )}
                    </ul>

                    <div className="bg-gray-900/50 p-4 rounded-lg">
                      <p className="text-lg text-gray-200">{t('costToDownload')}:</p>
                      <p className="text-2xl mt-1">
                        {isReDownload ? (
                          <>
                            <span className="line-through text-gray-400 me-2">
                              {singleFileInfo.cost?.toFixed(2)}
                            </span>
                            <span className="font-bold text-green-400">{t('free')}</span>
                          </>
                        ) : (
                          <span className="font-bold text-blue-400">
                            {singleFileInfo.cost !== null
                              ? `${singleFileInfo.cost.toFixed(2)} ${t('points')}`
                              : 'N/A'}
                          </span>
                        )}
                      </p>
                      {!hasEnoughPoints && !isReDownload && (
                        <p className="text-red-500 font-semibold mt-2">{t('insufficientPoints')}</p>
                      )}
                      <div className="flex justify-center sm:justify-start space-x-4 rtl:space-x-reverse mt-4">
                        <button
                          onClick={handleStartNew}
                          className="bg-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          onClick={handleOrder}
                          disabled={
                            !hasEnoughPoints || (singleFileInfo.cost === null && !isReDownload)
                          }
                          className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {isReDownload ? t('reDownload') : t('confirmAndOrder')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </>
  );

  const renderBatchMode = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-slate-700">
        <form onSubmit={handleGetBatchInfo}>
          <label
            htmlFor="batch-urls"
            className={`block text-sm font-medium mb-2 ${hasUrlCountError ? 'text-red-500' : 'text-theme-text-primary'}`}
          >
            {t('batchUrlLabel')}
          </label>
          <textarea
            id="batch-urls"
            value={batchUrls}
            onChange={(e) => setBatchUrls(e.target.value)}
            placeholder={t('batchUrlPlaceholder')}
            rows={5}
            className="w-full p-3 bg-white dark:bg-slate-700 border border-theme-border rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-y text-theme-text-primary placeholder:text-theme-text-muted"
            disabled={isFetchingBatch || isOrderingBatch}
          />
          <div className="text-right text-sm text-gray-500 mt-1">
            <span className={hasUrlCountError ? 'text-red-500 font-semibold' : ''}>
              {currentUrlCount}
            </span>{' '}
            / 5
          </div>
          <button
            type="submit"
            disabled={isFetchingBatch || isOrderingBatch || !batchUrls || hasUrlCountError}
            className="w-full mt-4 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isFetchingBatch ? <ArrowPathIcon className="animate-spin -ms-1 me-2 h-5 w-5" /> : null}
            {isFetchingBatch ? t('fetching') : t('getFileInfo')}
          </button>
        </form>
      </div>

      {error && <p className="text-red-500 text-center font-semibold mt-4">{error}</p>}

      {batchFileInfos.length > 0 && (
        <div className="mt-8 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {batchFileInfos.map((info) => (
              <div
                key={info.id}
                className={`relative rounded-xl border-2 p-3 transition-all ${selectedFileIds.has(info.id) ? 'border-blue-500' : 'border-gray-200 dark:border-transparent'} ${info.status === 'success' ? 'bg-white dark:bg-slate-800' : 'bg-red-50 dark:bg-red-900/50'}`}
              >
                {info.status === 'success' && (
                  <label htmlFor={`checkbox-${info.id}`} className="absolute top-2 end-2 z-10">
                    <input
                      type="checkbox"
                      id={`checkbox-${info.id}`}
                      checked={selectedFileIds.has(info.id)}
                      onChange={(e) => handleSelectionChange(info.id, e.target.checked)}
                      className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-600"
                    />
                    <span className="sr-only">Select file</span>
                  </label>
                )}
                {info.status === 'success' && info.preview ? (
                  <>
                    {info.isReDownload && (
                      <div className="absolute top-2 start-2 z-10 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {t('free')}
                      </div>
                    )}
                    <img
                      src={info.preview}
                      alt="Stock media preview"
                      className="rounded-lg mb-2 w-full h-32 object-cover"
                    />
                    <p className="text-xs text-gray-400 truncate" title={info.site}>
                      {info.site}
                    </p>
                    <p className="font-bold text-blue-400">
                      {info.isReDownload ? (
                        <>
                          <span className="line-through text-gray-400 me-2">
                            {info.cost?.toFixed(2)}
                          </span>
                          <span className="text-green-400">{t('free')}</span>
                        </>
                      ) : info.cost !== null ? (
                        `${info.cost.toFixed(2)} ${t('points')}`
                      ) : (
                        'N/A'
                      )}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-2">
                    <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mb-2" />
                    <p className="text-sm font-semibold text-red-300">{t('error')}</p>
                    <p className="text-xs text-red-400 break-words">{info.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filesToOrder.length > 0 && user && (
            <div className="sticky bottom-4 mt-6 p-4 rounded-xl shadow-lg w-full glassmorphism">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{t('batchSummaryTitle')}</p>
                  <p className="text-sm">
                    {t('batchTotalCost', { count: filesToOrder.length })}{' '}
                    <span
                      className={`font-bold ${totalCost > user.balance ? 'text-red-500' : 'text-blue-400'}`}
                    >
                      {totalCost.toFixed(2)} {t('points')}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {t('availablePoints')}: {user.balance.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={handleBatchOrder}
                  disabled={
                    isOrderingBatch || totalCost > user.balance || filesToOrder.length === 0
                  }
                  className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isOrderingBatch ? (
                    <ArrowPathIcon className="animate-spin -ms-1 me-2 h-5 w-5" />
                  ) : null}
                  {isOrderingBatch ? t('ordering') : t('confirmAndOrder')}
                </button>
              </div>
              {totalCost > user.balance && (
                <p className="text-red-500 font-semibold text-sm mt-2">{t('insufficientPoints')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold text-center mb-6 text-theme-text-primary">{t('stockDownloaderTitle')}</h1>

      <div className="flex justify-center mb-6 bg-white dark:bg-slate-800 p-1 rounded-lg max-w-xs mx-auto border border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setMode('single')}
          className={`w-full px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'single' ? 'bg-blue-600 text-white' : 'text-theme-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}
        >
          {t('singleUrl')}
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`w-full px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'batch' ? 'bg-blue-600 text-white' : 'text-theme-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}
        >
          {t('batchMode')}
        </button>
      </div>

      {mode === 'single' ? renderSingleMode() : renderBatchMode()}

      <RecentOrders
        orders={recentOrders}
        onUpdate={handleRecentOrderUpdate}
        isFetching={isOrdersFetching}
        error={ordersError}
        isAuthenticated={Boolean(user?.id)}
      />

      <div className="mt-12">
        <SupportedSites />
      </div>
    </div>
  );
};

export default StockDownloader;
