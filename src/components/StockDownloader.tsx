import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getStockFileInfo, orderStockFile, checkOrderStatus, generateDownloadLink } from '../services/stockService';
import { createOrder, updateOrder, findOrderBySiteAndId, getOrders } from '../services/filesService';
import type { StockFileInfo, StockOrder, Order } from '../types';
import { LinkIcon, ArrowPathIcon, CheckCircleIcon, XMarkIcon, ExclamationTriangleIcon, ArrowDownTrayIcon } from './icons/Icons';
import SupportedSites from './SupportedSites';

type DownloadState = 'idle' | 'fetching' | 'info' | 'ordering' | 'processing' | 'ready' | 'error';
type Mode = 'single' | 'batch';

interface BatchFileInfo extends StockFileInfo {
    status: 'success' | 'error';
    error?: string;
    sourceUrl: string;
    isReDownload?: boolean;
}

const useOrderPolling = (orders: Order[], onUpdate: (taskId: string, newStatus: Order['status']) => void) => {
    const { t } = useLanguage();
    useEffect(() => {
        const processingOrders = orders.filter(o => o.status === 'processing');
        if (processingOrders.length === 0) return;

        const interval = setInterval(async () => {
            for (const order of processingOrders) {
                try {
                    const statusResult = await checkOrderStatus(order.task_id);
                    if (statusResult.status === 'ready') {
                       await updateOrder(order.task_id, { status: 'ready' });
                       onUpdate(order.task_id, 'ready');
                    } else if (statusResult.status === 'failed') {
                       await updateOrder(order.task_id, { status: 'failed' });
                       onUpdate(order.task_id, 'failed');
                    }
                } catch (err) {
                    console.error(`Failed to check status for ${order.task_id}`, err);
                    await updateOrder(order.task_id, { status: 'failed' });
                    onUpdate(order.task_id, 'failed');
                }
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [orders, onUpdate, t]);
};

const RecentOrders = ({ orders }: { orders: Order[] }) => {
    const { t } = useLanguage();
    const [localOrders, setLocalOrders] = useState(orders);
    const [downloading, setDownloading] = useState<Set<string>>(new Set());

    useEffect(() => {
        setLocalOrders(orders);
    }, [orders]);

    const handleUpdate = (taskId: string, newStatus: Order['status']) => {
        setLocalOrders(prevOrders => 
            prevOrders.map(o => o.task_id === taskId ? { ...o, status: newStatus } : o)
        );
    };

    useOrderPolling(localOrders, handleUpdate);

    const handleDownload = async (taskId: string) => {
        setDownloading(prev => new Set(prev).add(taskId));
        try {
            const { url } = await generateDownloadLink(taskId);
            window.open(url, '_blank');
        } catch (err) {
            alert('Could not generate download link.');
        } finally {
            setDownloading(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });
        }
    };

    if (orders.length === 0) return null;

    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold text-center mb-4">{t('recentOrders')}</h2>
            <div className="space-y-3">
                {localOrders.map(order => (
                    <div key={order.id} className="p-3 rounded-lg flex items-center justify-between bg-gray-800/80 glassmorphism">
                        <div className="flex items-center">
                            <img src={order.file_info.preview} alt="preview" className="w-12 h-12 rounded-md object-cover me-4" />
                            <div>
                                <p className="text-sm font-semibold text-white truncate max-w-xs">{order.file_info.site}</p>
                                <p className="text-xs text-gray-400">{t('cost')}: {order.file_info.cost?.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {order.status === 'processing' && (
                                <div className="flex items-center space-x-2 rtl:space-x-reverse text-yellow-400">
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    <span className="text-sm font-semibold">{t('processingStatus')}</span>
                                </div>
                            )}
                            {order.status === 'ready' && (
                               <button 
                                 onClick={() => handleDownload(order.task_id)}
                                 disabled={downloading.has(order.task_id)}
                                 className="bg-green-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-wait transition-colors flex items-center text-sm"
                                >
                                    {downloading.has(order.task_id) ? <ArrowPathIcon className="w-4 h-4 animate-spin me-2" /> : <ArrowDownTrayIcon className="w-4 h-4 me-2" />}
                                    {t('downloadNow')}
                                </button>
                            )}
                             {order.status === 'failed' && (
                                <div className="text-sm font-semibold text-red-500">{t('failedStatus')}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const StockDownloader = () => {
    const { t } = useLanguage();
    const { user, deductPoints } = useAuth();
    
    const [mode, setMode] = useState<Mode>('single');
    const [url, setUrl] = useState('');
    const [state, setState] = useState<DownloadState>('idle');
    const [order, setOrder] = useState<StockOrder | null>(null);
    const [singleFileInfo, setSingleFileInfo] = useState<StockFileInfo | null>(null);
    const [previousOrder, setPreviousOrder] = useState<Order | null>(null);
    
    const [batchUrls, setBatchUrls] = useState('');
    const [batchFileInfos, setBatchFileInfos] = useState<BatchFileInfo[]>([]);
    const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
    const [isFetchingBatch, setIsFetchingBatch] = useState(false);
    const [isOrderingBatch, setIsOrderingBatch] = useState(false);
    
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    
    const [error, setError] = useState<string | null>(null);
    const isModalOpen = state !== 'idle' && state !== 'fetching';
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    const currentUrlCount = useMemo(() => {
        return batchUrls.split('\n').map(u => u.trim()).filter(Boolean).length;
    }, [batchUrls]);
    const hasUrlCountError = currentUrlCount > 5;
    
    const refreshRecentOrders = useCallback(() => {
        if (user?.id) {
            getOrders(user.id).then(setRecentOrders).catch(err => {
                 console.error("Failed to refresh recent orders:", err);
            });
        }
    }, [user]);

    useEffect(() => {
       refreshRecentOrders();
    }, [refreshRecentOrders]);


    useEffect(() => {
        setUrl('');
        setState('idle');
        setOrder(null);
        setSingleFileInfo(null);
        setPreviousOrder(null);
        setBatchUrls('');
        setBatchFileInfos([]);
        setSelectedFileIds(new Set());
        setError(null);
    }, [mode]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (state === 'processing' && order?.task_id) {
            const taskId = order.task_id;
            interval = setInterval(async () => {
                try {
                    const statusResult = await checkOrderStatus(taskId);
                    if (statusResult.status === 'ready') {
                        await updateOrder(taskId, { status: 'ready' });
                        setOrder({ task_id: taskId, status: 'ready' });
                        setState('ready');
                        clearInterval(interval);
                    } else if (statusResult.status === 'failed') {
                        await updateOrder(taskId, { status: 'failed' });
                        setOrder({ task_id: taskId, status: 'failed' });
                        setError(t('fileProcessingFailedError'));
                        setState('error');
                        clearInterval(interval);
                    }
                } catch (err) {
                    setError(t('orderStatusError'));
                    setState('error');
                    clearInterval(interval);
                }
            }, 5000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [state, order, t]);

    const handleGetInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url || state === 'fetching') return;

        setState('fetching');
        setError(null);
        setSingleFileInfo(null);
        setOrder(null);
        setPreviousOrder(null);
        
        let isSuccess = false;
        try {
            const info = await getStockFileInfo(url);
            if (user) {
                const prevOrder = await findOrderBySiteAndId(user.id, info.site, info.id);
                setPreviousOrder(prevOrder);
            }
            setSingleFileInfo(info);
            isSuccess = true;
        } catch (err: any) {
            setError(err.message || t('fileFetchError'));
        } finally {
            setState(isSuccess ? 'info' : 'error');
        }
    };

    const handleOrder = async () => {
        if (!singleFileInfo || !user) return;

        const isReDownload = !!previousOrder;

        const placeOrderFlow = async () => {
            const orderResult = await orderStockFile(singleFileInfo.site, singleFileInfo.id);
            await createOrder(user.id, orderResult.task_id, singleFileInfo);
            setOrder(orderResult);
            setState('processing');
        };

        setState('ordering');
        setError(null);

        try {
            if (isReDownload) {
                await placeOrderFlow();
            } else {
                if (singleFileInfo.cost === null) return;
                if (user.balance < singleFileInfo.cost) {
                    setError(t('insufficientPoints'));
                    setState('error');
                    return;
                }
                await deductPoints(singleFileInfo.cost);
                await placeOrderFlow();
            }
        } catch (err: any) {
            setError(err.message || 'Could not place the order.');
            setState('error');
        }
    };
    
    const handleDownload = async () => {
        if (!order?.task_id) return;
        setIsGeneratingLink(true);
        try {
            const { url: downloadUrl } = await generateDownloadLink(order.task_id);
            window.open(downloadUrl, '_blank');
        } catch (err) {
            setError('Could not generate download link.');
            setState('error');
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const handleGetBatchInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const rawUrls = batchUrls.split('\n').map(u => u.trim()).filter(Boolean);
        
        if (rawUrls.length === 0) return;
        if (rawUrls.length > 5) {
            setError(t('batchLimitError'));
            return;
        }
        
        const uniqueUrls = [...new Set(rawUrls)];

        setIsFetchingBatch(true);
        setBatchFileInfos([]);
        setSelectedFileIds(new Set());

        try {
            const results = await Promise.allSettled(
                uniqueUrls.map(u => getStockFileInfo(u))
            );
            
            const newFileInfos: BatchFileInfo[] = [];
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const sourceUrl = uniqueUrls[i];
                if (result.status === 'fulfilled') {
                    const info = result.value;
                    const prevOrder = user ? await findOrderBySiteAndId(user.id, info.site, info.id) : null;
                    newFileInfos.push({
                        ...info,
                        status: 'success',
                        sourceUrl,
                        isReDownload: !!prevOrder
                    });
                } else {
                    newFileInfos.push({
                        id: `error-${i}-${Date.now()}`,
                        status: 'error',
                        error: (result.reason as Error).message,
                        sourceUrl,
                        site: '', preview: '', cost: null
                    });
                }
            }

            setBatchFileInfos(newFileInfos);
        } catch (err: any) {
            setError(t('fileFetchError'));
        } finally {
            setIsFetchingBatch(false);
        }
    };

    const handleSelectionChange = (fileId: string, isSelected: boolean) => {
        setSelectedFileIds(prev => {
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
        const selectedFiles = batchFileInfos.filter(info => selectedFileIds.has(info.id));
        const cost = selectedFiles.reduce((sum, info) => {
             if (info.isReDownload) {
                return sum;
            }
            return sum + (info.cost || 0);
        }, 0);
        return { totalCost: cost, filesToOrder: selectedFiles };
    }, [batchFileInfos, selectedFileIds]);

    const handleBatchOrder = async () => {
        if (!user || totalCost > user.balance || filesToOrder.length === 0) {
            setError(t(totalCost > user.balance ? 'insufficientPoints' : 'batchSelectError'));
            return;
        }

        setIsOrderingBatch(true);
        setError(null);

        try {
            const orderPromises = filesToOrder.map(file =>
                orderStockFile(file.site, file.id)
                    .then(orderResult => ({ file, orderResult, status: 'fulfilled' as const }))
                    .catch(error => ({ file, error, status: 'rejected' as const }))
            );

            const results = await Promise.all(orderPromises);
            
            let successfulCost = 0;
            let failedCount = 0;

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    try {
                        await createOrder(user.id, result.orderResult.task_id, result.file);
                        if (!result.file.isReDownload) {
                            successfulCost += result.file.cost ?? 0;
                        }
                    } catch (dbError) {
                        console.error("Failed to save order to DB:", dbError);
                        failedCount++;
                    }
                } else {
                    failedCount++;
                }
            }
            
            if (successfulCost > 0) {
                await deductPoints(successfulCost);
            }

            if (failedCount > 0) {
                setError(t('batchOrderError', { count: failedCount }));
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during batch order.");
        } finally {
            setIsOrderingBatch(false);
            setBatchUrls('');
            setBatchFileInfos([]);
            setSelectedFileIds(new Set());
            refreshRecentOrders();
        }
    };

    const handleCloseModal = () => {
        setState('idle');
        setError(null);
        refreshRecentOrders();
    }

    const handleStartNew = () => {
        setUrl('');
        setState('idle');
        setError(null);
        setSingleFileInfo(null);
        setOrder(null);
        setPreviousOrder(null);
        refreshRecentOrders();
    }

    const renderSingleMode = () => (
         <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <form onSubmit={handleGetInfo}>
                <label htmlFor="stock-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('stockUrlLabel')}</label>
                <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-s-md border border-e-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <LinkIcon />
                    </span>
                    <input
                        type="url"
                        id="stock-url"
                        value={url}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                        placeholder={t('stockUrlPlaceholder')}
                        className="flex-1 block w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-e-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={state === 'fetching'}
                    />
                </div>
                <button type="submit" disabled={state === 'fetching' || !url} className="w-full mt-4 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center">
                    {state === 'fetching' ? <ArrowPathIcon className="animate-spin -ms-1 me-2 h-5 w-5" /> : null}
                    {state === 'fetching' ? t('fetching') : t('getFileInfo')}
                </button>
            </form>
        </div>
    );

    const renderBatchMode = () => (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <form onSubmit={handleGetBatchInfo}>
                    <label htmlFor="batch-urls" className={`block text-sm font-medium mb-2 ${hasUrlCountError ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{t('batchUrlLabel')}</label>
                    <textarea
                        id="batch-urls"
                        value={batchUrls}
                        onChange={(e) => setBatchUrls(e.target.value)}
                        placeholder={t('batchUrlPlaceholder')}
                        rows={5}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-y"
                        disabled={isFetchingBatch}
                    />
                    <div className="text-right text-sm text-gray-500 mt-1">
                        <span className={hasUrlCountError ? 'text-red-500 font-semibold' : ''}>{currentUrlCount}</span> / 5
                    </div>
                     <button type="submit" disabled={isFetchingBatch || !batchUrls || hasUrlCountError} className="w-full mt-4 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center">
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
                            <div key={info.id} className={`relative rounded-xl border-2 p-3 transition-all ${selectedFileIds.has(info.id) ? 'border-blue-500' : 'border-transparent'} ${info.status === 'success' ? 'bg-gray-800' : 'bg-red-900/50'}`}>
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
                                        <img src={info.preview} alt="Stock media preview" className="rounded-lg mb-2 w-full h-32 object-cover"/>
                                        <p className="text-xs text-gray-400 truncate" title={info.site}>{info.site}</p>
                                        <p className="font-bold text-blue-400">
                                            {info.isReDownload ? (
                                                <>
                                                    <span className="line-through text-gray-400 me-2">
                                                        {info.cost?.toFixed(2)}
                                                    </span>
                                                    <span className="text-green-400">
                                                        {t('free')}
                                                    </span>
                                                </>
                                            ) : (
                                                info.cost !== null ? `${info.cost.toFixed(2)} ${t('points')}` : 'N/A'
                                            )}
                                        </p>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-2">
                                        <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mb-2"/>
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
                                    <p className="text-sm">{t('batchTotalCost', { count: filesToOrder.length })} <span className={`font-bold ${totalCost > user.balance ? 'text-red-500' : 'text-blue-400'}`}>{totalCost.toFixed(2)} {t('points')}</span></p>
                                    <p className="text-xs text-gray-400">{t('availablePoints')}: {user.balance.toFixed(2)}</p>
                                </div>
                                <button
                                    onClick={handleBatchOrder}
                                    disabled={isOrderingBatch || totalCost > user.balance || filesToOrder.length === 0}
                                    className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                >
                                     {isOrderingBatch ? <ArrowPathIcon className="animate-spin -ms-1 me-2 h-5 w-5" /> : null}
                                     {isOrderingBatch ? t('ordering') : t('confirmAndOrder')}
                                </button>
                            </div>
                            {totalCost > user.balance && <p className="text-red-500 font-semibold text-sm mt-2">{t('insufficientPoints')}</p>}
                       </div>
                    )}

                </div>
            )}
        </div>
    );

    const renderModalContent = () => {
        switch (state) {
            case 'info':
                if (!singleFileInfo || !user) return null;
                const isReDownload = !!previousOrder;
                const cost = isReDownload ? 0 : singleFileInfo.cost;
                const hasEnoughPoints = cost !== null && user.balance >= cost;
                
                return (
                    <>
                        {isReDownload && (
                            <div className="bg-blue-900/50 text-blue-300 text-sm font-semibold p-3 rounded-lg mb-4">
                                {t('reDownloadFree')}
                            </div>
                        )}
                        <img src={singleFileInfo.preview} alt="Stock media preview" className="rounded-lg mb-4 max-w-sm w-full mx-auto shadow-lg" />
                        <p className="text-lg text-gray-200">
                            {t('costToDownload')}: 
                            {isReDownload ? (
                                <>
                                    <span className="line-through text-gray-400 ms-2">
                                    {singleFileInfo.cost?.toFixed(2)} {t('points')}
                                    </span>
                                    <span className="font-bold text-green-400 ms-2">
                                    {t('free')}
                                    </span>
                                </>
                            ) : (
                                <span className="font-bold text-blue-400 ms-2">
                                    {singleFileInfo.cost !== null ? `${singleFileInfo.cost.toFixed(2)} ${t('points')}` : 'N/A'}
                                </span>
                            )}
                        </p>

                        {!hasEnoughPoints && !isReDownload && singleFileInfo.cost !== null && (
                            <p className="text-red-500 font-semibold mt-2">{t('insufficientPoints')}</p>
                        )}

                        <div className="flex justify-center space-x-4 rtl:space-x-reverse mt-6">
                            <button onClick={handleCloseModal} className="w-full bg-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors">{t('cancel')}</button>
                            <button onClick={handleOrder} disabled={!hasEnoughPoints || (singleFileInfo.cost === null && !isReDownload)} className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors">
                                {isReDownload ? t('reDownload') : t('confirmAndOrder')}
                            </button>
                        </div>
                    </>
                );
            case 'ordering':
                 return (
                    <div className="min-h-[200px] flex flex-col items-center justify-center">
                        <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                        <p className="text-xl font-semibold text-white">{t('ordering')}</p>
                    </div>
                );
            case 'processing':
                return (
                    <div className="min-h-[200px] flex flex-col items-center justify-center">
                        <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                        <h2 className="text-2xl font-bold mb-2 text-white">{t('processingOrder')}</h2>
                        <p className="text-gray-400 mb-4">{t('processingOrderDesc')}</p>
                        {order && <p className="text-sm font-mono p-2 bg-gray-900 rounded">{t('taskId')}: {order.task_id}</p>}
                    </div>
                );
            case 'ready':
                return (
                     <div className="min-h-[200px] flex flex-col items-center justify-center">
                        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold mb-2 text-white">{t('fileReady')}</h2>
                        <p className="text-gray-400 mb-6">{t('fileReadyDesc')}</p>
                        <div className="flex justify-center space-x-4 rtl:space-x-reverse w-full">
                            <button onClick={handleStartNew} className="w-full bg-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors">{t('startAnotherDownload')}</button>
                            <button 
                                onClick={handleDownload}
                                disabled={isGeneratingLink}
                                className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-blue-400 disabled:cursor-wait"
                            >
                                {isGeneratingLink ? <ArrowPathIcon className="animate-spin -ms-1 me-2 h-5 w-5" /> : <ArrowDownTrayIcon className="w-5 h-5 me-2" />}
                                {isGeneratingLink ? t('generating') : t('downloadNow')}
                            </button>
                        </div>
                    </div>
                )
            default:
                return null;
        }
    }
    
    const renderErrorModal = () => (
        <div className="min-h-[200px] flex flex-col items-center justify-center text-center p-4">
            <div className="relative w-16 h-16 mb-4">
                <ExclamationTriangleIcon className="absolute inset-0 w-full h-full text-red-500" />
            </div>
            <p className="text-red-400 font-semibold mb-6 text-lg">{error}</p>
            <button onClick={handleStartNew} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors w-full">{t('startAnotherDownload')}</button>
        </div>
    );

    return (
        <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold text-center mb-6">{t('stockDownloaderTitle')}</h1>
            
            <div className="flex justify-center mb-6 bg-gray-800 p-1 rounded-lg max-w-xs mx-auto">
                 <button 
                    onClick={() => setMode('single')}
                    className={`w-full px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'single' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                    {t('singleUrl')}
                </button>
                 <button 
                    onClick={() => setMode('batch')}
                    className={`w-full px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'batch' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                    {t('batchMode')}
                </button>
            </div>
            
            {mode === 'single' ? renderSingleMode() : renderBatchMode()}
            
            <RecentOrders orders={recentOrders} />

            {isModalOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="relative bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center border border-gray-700">
                        <button onClick={handleCloseModal} className="absolute top-3 end-3 text-gray-400 hover:text-white" aria-label="Close modal">
                            <XMarkIcon />
                        </button>
                        {state === 'error' ? renderErrorModal() : renderModalContent()}
                    </div>
                </div>
            )}
            
            <div className="mt-12">
                <SupportedSites />
            </div>
        </div>
    );
};

export default StockDownloader;