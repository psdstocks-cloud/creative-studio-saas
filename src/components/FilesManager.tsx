import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getOrders, updateOrder } from '../services/filesService';
import { checkOrderStatus, generateDownloadLink } from '../services/stockService';
import type { Order } from '../types';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon, ArrowDownTrayIcon, ServerIcon, MagnifyingGlassIcon, ArrowTopRightOnSquareIcon } from './icons/Icons';
import { Link } from 'react-router-dom';
import { buildStockMediaUrl } from '../utils/stockUrlBuilder';

const useOrderPolling = (orders: Order[], onUpdate: (taskId: string, newStatus: Order['status']) => void) => {
    useEffect(() => {
        const processingOrders = orders.filter(o => o.status === 'processing');
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
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [orders, onUpdate]);
};

const FilesManager = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    const handleUpdate = (taskId: string, newStatus: Order['status']) => {
        setOrders(prevOrders =>
            prevOrders.map(o => o.task_id === taskId ? { ...o, status: newStatus } : o)
        );
    };

    useOrderPolling(orders, handleUpdate);

    useEffect(() => {
        if (!user) return;
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const userOrders = await getOrders();
                setOrders(userOrders);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();
    }, [user]);
    
    const filteredOrders = useMemo(() => {
        if (!searchQuery.trim()) {
            return orders;
        }
        const lowercasedQuery = searchQuery.toLowerCase().trim();
        return orders.filter(order => {
            const { id, site, debugid } = order.file_info;
            
            // Check against file ID, site name, or debug ID
            if (id.toLowerCase().includes(lowercasedQuery) ||
                site.toLowerCase().includes(lowercasedQuery) ||
                (debugid && debugid.toLowerCase().includes(lowercasedQuery))) {
                return true;
            }
            
            // Heuristic for URL search: check if the query is a URL-like string that contains the file ID
            if (lowercasedQuery.includes(id.toLowerCase()) && lowercasedQuery.length > id.length) {
                return true;
            }

            return false;
        });
    }, [orders, searchQuery]);

    // ✅ FIXED: Updated handleDownload to support downloadLink field
    const handleDownload = async (taskId: string) => {
        setDownloading(prev => new Set(prev).add(taskId));
        try {
            console.log('🔽 Generating fresh download link for task:', taskId);
            
            const result = await generateDownloadLink(taskId);
            console.log('✅ Download link result:', result);
            console.log('📦 Result keys:', Object.keys(result));
            
            // Handle different response formats from the API
            const downloadUrl = 
                result.downloadLink ||  // ← API uses this field!
                result.url || 
                result.download_url || 
                result.link || 
                (result.data && (result.data.downloadLink || result.data.url || result.data.download_url));
            
            console.log('🔗 Extracted URL:', downloadUrl);
            
            if (!downloadUrl || downloadUrl === '') {
                console.error('❌ No valid URL found in response:', result);
                throw new Error('Invalid download URL received from API');
            }
            
            console.log('✅ Download URL:', downloadUrl);
            
            // Create temporary link and trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = '';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ Download initiated successfully');
        } catch (err: any) {
            console.error('❌ Download error:', err);
            alert(err.message || 'Could not generate download link. The file may still be processing. Please wait a moment and try again.');
        } finally {
            setDownloading(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });
        }
    };
    
    const StatusIndicator = ({ status }: { status: Order['status'] }) => {
        const statusMap = {
            processing: { text: t('processingStatus'), icon: <ArrowPathIcon className="w-4 h-4 animate-spin" />, color: 'text-yellow-400' },
            ready: { text: t('readyStatus'), icon: <CheckCircleIcon className="w-4 h-4" />, color: 'text-green-400' },
            failed: { text: t('failedStatus'), icon: <XCircleIcon className="w-4 h-4" />, color: 'text-red-400' },
            payment_failed: { text: t('failedStatus'), icon: <XCircleIcon className="w-4 h-4" />, color: 'text-red-400' },
        } as const;
        const current = statusMap[status];
        return (
            <div className={`flex items-center space-x-2 rtl:space-x-reverse text-sm font-semibold ${current.color}`}>
                {current.icon}
                <span>{current.text}</span>
            </div>
        )
    };
    
    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center py-10"><ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>;
        }
        if (error) {
            return <div className="text-center py-10 text-red-400">{error}</div>;
        }
        if (orders.length === 0) {
            return (
                <div className="text-center py-16">
                    <ServerIcon className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                    <h3 className="text-xl font-semibold text-white">{t('noFilesFound')}</h3>
                    <p className="text-gray-400 mt-2">{t('noFilesFoundDesc')}</p>
                    <Link to="/stock" className="mt-4 inline-block bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 transition-colors">{t('downloadStockFile')}</Link>
                </div>
            );
        }
         if (filteredOrders.length === 0) {
            return (
                 <div className="text-center py-16">
                    <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                    <h3 className="text-xl font-semibold text-white">{t('noResultsFound', { query: searchQuery })}</h3>
                    <p className="text-gray-400 mt-2">{t('noResultsFoundDesc')}</p>
                </div>
            );
        }
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-300 uppercase tracking-wider">{t('file')}</th>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-300 uppercase tracking-wider">{t('source')}</th>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-300 uppercase tracking-wider">{t('date')}</th>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-300 uppercase tracking-wider">{t('cost')}</th>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-300 uppercase tracking-wider">{t('debugId')}</th>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-300 uppercase tracking-wider">{t('status')}</th>
                            <th scope="col" className="px-6 py-3 text-end text-xs font-medium text-gray-300 uppercase tracking-wider">{t('action')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-800/50 divide-y divide-gray-700">
                        {filteredOrders.map(order => {
                            // Try to get URL from source_url first, fallback to buildStockMediaUrl
                            const stockUrl = order.file_info.source_url || buildStockMediaUrl(order.file_info.site, order.file_info.id);
                            
                            return (
                                <tr key={order.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {stockUrl ? (
                                            <a href={stockUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
                                                <img src={order.file_info.preview} alt="preview" className="w-16 h-10 rounded object-cover" />
                                            </a>
                                        ) : (
                                            <img src={order.file_info.preview} alt="preview" className="w-16 h-10 rounded object-cover" />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {stockUrl ? (
                                            <a 
                                                href={stockUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="group hover:bg-gray-700/50 rounded-lg p-2 -m-2 transition-colors block"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
                                                            {order.file_info.site}
                                                        </div>
                                                        <div className="text-xs text-gray-400 font-mono">{order.file_info.id}</div>
                                                    </div>
                                                    <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100" />
                                                </div>
                                            </a>
                                        ) : (
                                            <div>
                                                <div className="font-semibold text-gray-300">{order.file_info.site}</div>
                                                <div className="text-xs text-gray-400 font-mono">{order.file_info.id}</div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{order.file_info.cost?.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                                        {order.file_info.debugid ? (
                                            <div className="flex items-center gap-2 group">
                                                <span className="font-mono text-gray-400">
                                                    {order.file_info.debugid}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(order.file_info.debugid!);
                                                        alert(t('debugIdCopied') || 'Debug ID copied to clipboard!');
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                                                    title="Copy Debug ID"
                                                >
                                                    <svg className="w-4 h-4 text-gray-400 hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-gray-500">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap"><StatusIndicator status={order.status} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-end">
                                        {order.status === 'ready' && (
                                            <button
                                                onClick={() => handleDownload(order.task_id)}
                                                disabled={downloading.has(order.task_id)}
                                                className="bg-blue-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait transition-colors flex items-center text-sm"
                                            >
                                                {downloading.has(order.task_id) ? <ArrowPathIcon className="w-4 h-4 animate-spin me-2" /> : <ArrowDownTrayIcon className="w-4 h-4 me-2" />}
                                                {t('downloadNow')}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-2">{t('filesManagerTitle')}</h1>
            <p className="text-gray-400 mb-6">{t('filesManagerSubtitle')}</p>

             {orders.length > 0 && (
                <div className="relative mb-4">
                    <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        className="w-full ps-10 p-3 bg-gray-700/80 border border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
                    />
                </div>
            )}
            
            <div className="bg-gray-800/80 rounded-xl shadow-lg p-1 glassmorphism">
                {renderContent()}
            </div>
        </div>
    );
};

export default FilesManager;
