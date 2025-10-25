import React, { useState, useEffect } from 'react';
import { getSupportedSites } from '../services/stockService';
import type { SupportedSite } from '../types';
import { ArrowPathIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';

const SupportedSites = () => {
    const { t } = useLanguage();
    const [sites, setSites] = useState<SupportedSite[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSites = async () => {
            try {
                setIsLoading(true);
                const supportedSites = await getSupportedSites();
                // Sort to ensure consistent order
                const sorted = supportedSites.sort((a, b) => a.name.localeCompare(b.name));
                setSites(sorted);
            } catch (err: any) {
                setError(err.message || 'Failed to load supported sites.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSites();
    }, []);
    
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center py-8">
                    <ArrowPathIcon className="animate-spin h-8 w-8 text-blue-400" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center py-8">
                    <p className="text-red-400 font-semibold">{error}</p>
                </div>
            );
        }

        return (
            <div className="flex space-x-4 rtl:space-x-reverse overflow-x-auto pb-4 -m-2 p-2">
                {sites.map((site) => (
                    <div 
                        key={site.key}
                        className={`
                            flex-shrink-0 w-32 h-28 flex flex-col items-center justify-between p-3 
                            rounded-lg bg-white/5 hover:bg-white/10 transition-colors
                            ${site.cost === 'off' ? 'grayscale opacity-60' : ''}
                        `}
                    >
                        <img src={site.iconUrl} alt={`${site.name} logo`} className="w-8 h-8 object-contain" />
                        <span className="text-xs text-center text-gray-200 truncate w-full mt-1">{site.name}</span>
                         <div>
                            {site.cost === 'off' ? (
                                <span className="text-xs font-semibold bg-gray-500 dark:bg-gray-600 text-white px-2 py-1 rounded-md mt-1">
                                    {site.cost.toUpperCase()}
                                </span>
                            ) : (
                                <span className="text-sm font-mono bg-gray-900/50 text-gray-300 px-2 py-1 rounded-md mt-1">
                                    {site.cost}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="glassmorphism p-6 rounded-2xl">
            <h2 className="text-2xl font-semibold text-center mb-6 text-white">{t('supportedWebsitesTitle')}</h2>
            {renderContent()}
        </div>
    );
};

export default SupportedSites;