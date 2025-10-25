import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getStockFileInfo, orderStockFile, checkOrderStatus, generateDownloadLink } from '../services/stockService';
import type { StockFileInfo, StockOrder } from '../types';
import { LinkIcon, ArrowPathIcon, CheckCircleIcon, XMarkIcon, ExclamationTriangleIcon } from './icons/Icons';
import SupportedSites from './SupportedSites';

type DownloadState = 'idle' | 'fetching' | 'info' | 'ordering' | 'processing' | 'ready' | 'error';
type Mode = 'single' | 'batch';

interface BatchFileInfo extends Partial<StockFileInfo> {
    id: string;
    status: 'success' | 'error';
    error?: string;
    sourceUrl: string;
}


const StockDownloader = () => {
    const { t } = useLanguage();
    const { user, deductPoints } = useAuth();
    
    // Mode state
    const [mode, setMode] = useState<Mode>('single');

    // Single mode states
    const [url, setUrl] = useState('');
    const [state, setState] = useState<DownloadState>('idle');
    const [order, setOrder] = useState<StockOrder | null>(null);
    const [singleFileInfo, setSingleFileInfo] = useState<StockFileInfo | null>(null);
    
    // Batch mode states
    const [batchUrls, setBatchUrls] = useState('');
    const [batchFileInfos, setBatchFileInfos] = useState<BatchFileInfo[]>([]);
    const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
    const [isFetchingBatch, setIsFetchingBatch] = useState(false);
    const [isOrderingBatch, setIsOrderingBatch] = useState(false);
    const [batchOrderSuccessMessage, setBatchOrderSuccessMessage] = useState<string | null>(null);

    // Common states
    const [error, setError] = useState<string | null>(null);
    const isModalOpen = state !== 'idle' && state !== 'fetching';

    // Reset states when switching modes
    useEffect(() => {
        setUrl('');
        setState('idle');
        setOrder(null);
        setSingleFileInfo(null);
        setBatchUrls('');
        setBatchFileInfos([]);
        setSelectedFileIds(new Set());
        setError(null);
        setBatchOrderSuccessMessage(null);
    }, [mode]);

    // Effect to poll for single order status
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (state === 'processing' && order?.task_id) {
            interval = setInterval(async () => {
                try {
                    const statusResult = await checkOrderStatus(order.task_id);
                    if (statusResult.status === 'ready') {
                        setOrder(statusResult);
                        setState('ready');
                        clearInterval(interval);
                    }
                } catch (err) {
                    setError(t('insufficientPoints'));
                    setState('error');
                    clearInterval(interval);
                }
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [state, order, t]);


    const handleGetInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;
        setState('fetching');
        setError(null);
        setSingleFileInfo(null);
        setOrder(null);
        try {
            const info = await getStockFileInfo(url);
            setSingleFileInfo(info);
            setState('info');
        } catch (err: any) {
            setError(err.message || t('fileFetchError'));
            setState('error');
        }
    };

    const handleOrder = async () => {
        if (!singleFileInfo || singleFileInfo.cost === null || !user) return;
        if (user.balance < singleFileInfo.cost) {
            setError(t('insufficientPoints'));
            setState('error');
            return;
        }
        setState('ordering');
        setError(null);
        try {
            const orderResult = await orderStockFile(singleFileInfo.site, singleFileInfo.id);
            await deductPoints(singleFileInfo.cost);
            setOrder(orderResult);
            setState('processing');
        } catch (err: any) {
            setError(err.message || 'Could not place the order.');
            setState('error');
        }
    };
    
    const handleDownload = async () => {
        if (!order?.task_id) return;
        try {
            const { url: downloadUrl } = await generateDownloadLink(order.task_id);
            window.open(downloadUrl, '_blank');
        } catch(err) {
            setError('Could not generate download link.');
            setState('error');
        }
    }

    const handleGetBatchInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setBatchOrderSuccessMessage(null);
        const urls = batchUrls.split('\n').map(u => u.trim()).filter(Boolean);
        
        if (urls.length === 0) return;
        if (urls.length > 5) {
            setError(t('batchLimitError'));
            return;
        }

        setIsFetchingBatch(true);
        setBatchFileInfos([]);
        setSelectedFileIds(new Set());

        const results = await Promise.allSettled(
            urls.map(u => getStockFileInfo(u))
        );

        const fileInfos: BatchFileInfo[] = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return { ...result.value, status: 'success', sourceUrl: urls[index] };
            } else {
                return {
                    id: `error-${index}-${Date.now()}`,
                    status: 'error',
                    error: (result.reason as Error).message,
                    sourceUrl: urls[index],
                };
            }
        });

        setBatchFileInfos(fileInfos);
        setIsFetchingBatch(false);
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
        const cost = selectedFiles.reduce((sum, info) => sum + (info.cost || 0), 0);
        return { totalCost: cost, filesToOrder: selectedFiles };
    }, [batchFileInfos, selectedFileIds]);

    const handleBatchOrder = async () => {
        if (!user) return;
        if (totalCost > user.balance) {
            setError(t('insufficientPoints'));
            return;
        }
        if (filesToOrder.length === 0) {
            setError(t('batchSelectError'));
            return;
        }

        setIsOrderingBatch(true);
        setError(null);
        setBatchOrderSuccessMessage(null);

        const orderPromises = filesToOrder.map(file => orderStockFile(file.site!, file.id!));
        const results = await Promise.allSettled(orderPromises);
        
        const successfulOrders = results.filter(r => r.status === 'fulfilled').length;
        const failedOrders = results.length - successfulOrders;
        
        try {
            if (successfulOrders > 0) {
                await deductPoints(totalCost);
                setBatchOrderSuccessMessage(t('batchOrderSuccess', { count: successfulOrders }));
            }
        } catch (deductionError: any) {
            setError(deductionError.message);
        }

        if (failedOrders > 0) {
            setError(prevError => {
                const newError = t('batchOrderError', { count: failedOrders });
                return prevError ? `${prevError}\n${newError}` : newError;
            });
        }
        
        // Reset UI for a new batch
        setBatchUrls('');
        setBatchFileInfos([]);
        setSelectedFileIds(new Set());
        setIsOrderingBatch(false);
    };


    // Closes the modal but keeps the URL in the input field for correction.
    const handleCloseModal = () => {
        setState('idle');
        setError(null);
    }

    // Resets the entire component state for a new download.
    const handleStartNew = () => {
        setUrl('');
        setState('idle');
        setError(null);
        setSingleFileInfo(null);
        setOrder(null);
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
                    <label htmlFor="batch-urls" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('batchUrlLabel')}</label>
                    <textarea
                        id="batch-urls"
                        value={batchUrls}
                        onChange={(e) => setBatchUrls(e.target.value)}
                        placeholder={t('batchUrlPlaceholder')}
                        rows={5}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-y"
                        disabled={isFetchingBatch}
                    />
                     <button type="submit" disabled={isFetchingBatch || !batchUrls} className="w-full mt-4 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center">
                        {isFetchingBatch ? <ArrowPathIcon className="animate-spin -ms-1 me-2 h-5 w-5" /> : null}
                        {isFetchingBatch ? t('fetching') : t('getFileInfo')}
                    </button>
                </form>
            </div>
            
            {error && <p className="text-red-500 text-center font-semibold mt-4">{error}</p>}
            {batchOrderSuccessMessage && <p className="text-green-500 text-center font-semibold mt-4">{batchOrderSuccessMessage}</p>}


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
                                        <img src={info.preview} alt="Stock media preview" className="rounded-lg mb-2 w-full h-32 object-cover"/>
                                        <p className="text-xs text-gray-400 truncate" title={info.site}>{info.site}</p>
                                        <p className="font-bold text-blue-400">
                                            {info.cost !== null ? `${info.cost.toFixed(2)} ${t('points')}` : 'N/A'}
                                        </p>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mb-2"/>
                                        <p className="text-sm font-semibold text-red-300">{t('error')}</p>
                                        <p className="text-xs text-red-400 break-all">{info.error}</p>
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
                const hasEnoughPoints = singleFileInfo.cost !== null && user.balance >= singleFileInfo.cost;
                return (
                    <>
                        <img src={singleFileInfo.preview} alt="Stock media preview" className="rounded-lg mb-4 max-w-sm w-full mx-auto shadow-lg" />
                        <p className="text-lg text-gray-200">{t('costToDownload')}: <span className="font-bold text-blue-400">
                            {singleFileInfo.cost !== null ? `${singleFileInfo.cost.toFixed(2)} ${t('points')}` : 'N/A'}
                        </span></p>

                        {!hasEnoughPoints && singleFileInfo.cost !== null && (
                            <p className="text-red-500 font-semibold mt-2">{t('insufficientPoints')}</p>
                        )}

                        <div className="flex justify-center space-x-4 rtl:space-x-reverse mt-6">
                            <button onClick={handleCloseModal} className="w-full bg-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors">{t('cancel')}</button>
                            <button onClick={handleOrder} disabled={!hasEnoughPoints || singleFileInfo.cost === null} className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors">{t('confirmAndOrder')}</button>
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
                            <button onClick={handleDownload} className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">{t('downloadNow')}</button>
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
                <XMarkIcon className="absolute inset-0 w-full h-full text-red-500" />
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