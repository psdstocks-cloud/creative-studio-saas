import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getOrders, updateOrder } from '../services/filesService';
import { checkOrderStatus, generateDownloadLink } from '../services/stockService';
import type { Order } from '../types';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon, ArrowDownTrayIcon, ServerIcon } from './icons/Icons';
import { Link } from 'react-router-dom';

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
                const userOrders = await getOrders(user.id);
                setOrders(userOrders);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();
    }, [user]);

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
    
    const StatusIndicator = ({ status }: { status: Order['status'] }) => {
        const statusMap = {
            processing: { text: t('processingStatus'), icon: <ArrowPathIcon className="w-4 h-4 animate-spin" />, color: 'text-yellow-400' },
            ready: { text: t('readyStatus'), icon: <CheckCircleIcon className="w-4 h-4" />, color: 'text-green-400' },
            failed: { text: t('failedStatus'), icon: <XCircleIcon className="w-4 h-4" />, color: 'text-red-400' },
        };
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
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-300 uppercase tracking-wider">{t('file')}</th>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-300 uppercase tracking-wider">{t('source')}</th>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-300 uppercase tracking-wider">{t('date')}</th>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-300 uppercase tracking-wider">{t('cost')}</th>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-300 uppercase tracking-wider">{t('status')}</th>
                            <th scope="col" className="px-6 py-3 text-end text-xs font-medium text-gray-300 uppercase tracking-wider">{t('action')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-800/50 divide-y divide-gray-700">
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td className="px-6 py-4 whitespace-nowrap"><img src={order.file_info.preview} alt="preview" className="w-16 h-10 rounded object-cover" /></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{order.file_info.site}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{order.file_info.cost?.toFixed(2)}</td>
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
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-2">{t('filesManagerTitle')}</h1>
            <p className="text-gray-400 mb-6">{t('filesManagerSubtitle')}</p>
            <div className="bg-gray-800/80 rounded-xl shadow-lg p-1 glassmorphism">
                {renderContent()}
            </div>
        </div>
    );
};

export default FilesManager;