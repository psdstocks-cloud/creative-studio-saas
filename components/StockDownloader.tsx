

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getStockFileInfo, orderStockFile, checkOrderStatus, generateDownloadLink } from '../services/stockService';
import type { StockFileInfo, StockOrder } from '../types';
import { LinkIcon, ArrowPathIcon, CheckCircleIcon, XMarkIcon } from './icons/Icons';
import SupportedSites from './SupportedSites';

type DownloadState = 'idle' | 'fetching' | 'info' | 'ordering' | 'processing' | 'ready' | 'error';

const StockDownloader = () => {
    const { t } = useLanguage();
    const { user, deductPoints } = useAuth();
    const [url, setUrl] = useState('');
    const [state, setState] = useState<DownloadState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [fileInfo, setFileInfo] = useState<StockFileInfo | null>(null);
    const [order, setOrder] = useState<StockOrder | null>(null);

    const isModalOpen = state !== 'idle' && state !== 'fetching';

    // Effect to poll for order status
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
                    setError(t('insufficientPoints')); // A common error is running out of points mid-process.
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
        setFileInfo(null);
        setOrder(null);
        try {
            const info = await getStockFileInfo(url);
            setFileInfo(info);
            setState('info');
        } catch (err: any) {
            setError(t('fileFetchError'));
            setState('error');
        }
    };

    const handleOrder = async () => {
        if (!fileInfo || fileInfo.cost === null || !user) return;
        if (user.balance < fileInfo.cost) {
            setError(t('insufficientPoints'));
            setState('error');
            return;
        }
        setState('ordering');
        setError(null);
        try {
            const orderResult = await orderStockFile(fileInfo.site, fileInfo.id);
            await deductPoints(fileInfo.cost);
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
        setFileInfo(null);
        setOrder(null);
    }

    const renderModalContent = () => {
        switch (state) {
            case 'info':
                if (!fileInfo || !user) return null;
                const hasEnoughPoints = fileInfo.cost !== null && user.balance >= fileInfo.cost;
                return (
                    <>
                        <img src={fileInfo.preview} alt="Stock media preview" className="rounded-lg mb-4 max-w-sm w-full mx-auto shadow-lg" />
                        <p className="text-lg text-gray-200">{t('costToDownload')}: <span className="font-bold text-blue-400">
                            {fileInfo.cost !== null ? `${fileInfo.cost.toFixed(2)} ${t('points')}` : 'N/A'}
                        </span></p>

                        {!hasEnoughPoints && fileInfo.cost !== null && (
                            <p className="text-red-500 font-semibold mt-2">{t('insufficientPoints')}</p>
                        )}

                        <div className="flex justify-center space-x-4 rtl:space-x-reverse mt-6">
                            <button onClick={handleCloseModal} className="w-full bg-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors">{t('cancel')}</button>
                            <button onClick={handleOrder} disabled={!hasEnoughPoints || fileInfo.cost === null} className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors">{t('confirmAndOrder')}</button>
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
                <h2 className="text-2xl font-semibold text-center mb-6">{t('supportedWebsitesTitle')}</h2>
                <SupportedSites />
            </div>
        </div>
    );
};

export default StockDownloader;
