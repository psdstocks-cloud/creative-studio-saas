
import React, { useState, useEffect } from 'react';
import { getSupportedSites } from '../services/stockService';
import type { SupportedSite } from '../types';
import { ArrowPathIcon } from './icons/Icons';

const SupportedSites = () => {
    const [sites, setSites] = useState<SupportedSite[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSites = async () => {
            try {
                setIsLoading(true);
                const supportedSites = await getSupportedSites();
                // Sort to ensure consistent order, similar to the screenshot
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

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-8">
                <ArrowPathIcon className="animate-spin h-8 w-8 text-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <p className="text-red-500 font-semibold">{error}</p>
            </div>
        );
    }
    
    // To match the screenshot's column-first layout, we reorder the flat array.
    const reorderedSites: SupportedSite[] = [];
    const numColumns = 4;
    const numRows = Math.ceil(sites.length / numColumns);
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numColumns; j++) {
            const index = j * numRows + i;
            if (sites[index]) {
                reorderedSites.push(sites[index]);
            }
        }
    }


    return (
        <div className="bg-gray-200 dark:bg-gray-700 p-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-lg shadow-lg overflow-hidden">
            {reorderedSites.map((site) => (
                <div 
                    key={site.key}
                    className={`
                        flex items-center justify-between p-3 bg-white dark:bg-gray-800
                        ${site.cost === 'off' ? 'grayscale opacity-60' : ''}
                    `}
                >
                    <div className="flex items-center overflow-hidden">
                        <img src={site.iconUrl} alt={`${site.name} logo`} className="w-4 h-4 me-3 flex-shrink-0 object-contain" />
                        <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{site.name}</span>
                    </div>
                    <div>
                        {site.cost === 'off' ? (
                            <span className="text-xs font-semibold bg-gray-500 dark:bg-gray-600 text-white px-2 py-1 rounded-md">
                                {site.cost.toUpperCase()}
                            </span>
                        ) : (
                            <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md">
                                {site.cost}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SupportedSites;
