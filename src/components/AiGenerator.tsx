

import React, { useState, useEffect } from 'react';
import { enhancePrompt } from '../services/geminiService';
import type { AiJob } from '../types';
import { SparklesIcon, ArrowPathIcon, CpuChipIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';

const AiGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [job, setJob] = useState<AiJob | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    // FIX: Changed NodeJS.Timeout to ReturnType<typeof setInterval> for browser compatibility.
    let interval: ReturnType<typeof setInterval>;
    if (job?.status === 'pending') {
      interval = setInterval(() => {
        setJob(prev => prev ? ({ ...prev, percentage_complete: Math.min(prev.percentage_complete + 15, 100) }) : null);
        if (job.percentage_complete >= 100) {
          setJob(prev => prev ? ({ 
            ...prev, 
            status: 'completed',
            files: [
              { index: 0, thumb_sm: 'https://picsum.photos/200/200?random=1', thumb_lg: 'https://picsum.photos/800/800?random=1', download: 'https://picsum.photos/1600/1600?random=1' },
              { index: 1, thumb_sm: 'https://picsum.photos/200/200?random=2', thumb_lg: 'https://picsum.photos/800/800?random=2', download: 'https://picsum.photos/1600/1600?random=2' },
              { index: 2, thumb_sm: 'https://picsum.photos/200/200?random=3', thumb_lg: 'https://picsum.photos/800/800?random=3', download: 'https://picsum.photos/1600/1600?random=3' },
              { index: 3, thumb_sm: 'https://picsum.photos/200/200?random=4', thumb_lg: 'https://picsum.photos/800/800?random=4', download: 'https://picsum.photos/1600/1600?random=4' },
            ]
          }) : null);
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [job]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setIsLoading(true);
    setJob(null);
    
    const finalPrompt = await enhancePrompt(prompt, isThinkingMode);

    // Mock API call to create job
    setTimeout(() => {
      setJob({
        _id: `job_${Date.now()}`,
        prompt: finalPrompt,
        status: 'pending',
        percentage_complete: 0,
        files: []
      });
      setIsLoading(false);
    }, 500);
  };

  const handleReset = () => {
    setPrompt('');
    setJob(null);
    setIsLoading(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t('aiGeneratorTitle')}</h1>
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <form onSubmit={handleSubmit} className="mb-8">
          <textarea
            value={prompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
            placeholder={t('promptPlaceholder')}
            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none h-28"
          />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <label htmlFor="thinking-mode" className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" id="thinking-mode" className="sr-only" checked={isThinkingMode} onChange={() => setIsThinkingMode(!isThinkingMode)} />
                  <div className={`block w-14 h-8 rounded-full ${isThinkingMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <div className={`dot absolute start-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isThinkingMode ? 'ltr:translate-x-6 rtl:-translate-x-6' : ''}`}></div>
                </div>
                <div className="ms-3 text-gray-700 dark:text-gray-300 font-medium flex items-center">
                  <CpuChipIcon />
                  <span className="ms-2">{t('thinkingMode')}</span>
                </div>
              </label>
            </div>
            <button type="submit" disabled={isLoading} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center">
              {isLoading ? <ArrowPathIcon className="animate-spin -ms-1 me-2 h-5 w-5" /> : <SparklesIcon className="-ms-1 me-2 h-5 w-5" />}
              {isLoading ? t('enhancing') : t('generate')}
            </button>
          </div>
        </form>

        {job && (
          <div className="animate-fadeIn">
            <h2 className="text-xl font-semibold mb-2">{t('generationProgress')}</h2>
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('promptLabel')}</p>
                <p className="italic text-gray-800 dark:text-gray-200">{job.prompt}</p>
            </div>
            {job.status === 'pending' && (
              <div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 mb-2">
                  <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${job.percentage_complete}%`, transition: 'width 0.5s ease-in-out' }}></div>
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">{job.percentage_complete}{t('percentComplete')}</p>
              </div>
            )}
             {job.status === 'completed' && (
                <div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {job.files.map(file => (
                            <div key={file.index} className="group relative rounded-lg overflow-hidden">
                                <img src={file.thumb_lg} alt={`Generated image ${file.index}`} className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2 rtl:space-x-reverse">
                                        <button className="bg-white/80 text-gray-900 p-2 rounded-full hover:bg-white">{t('vary')}</button>
                                        <button className="bg-white/80 text-gray-900 p-2 rounded-full hover:bg-white">{t('upscale')}</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-6">
                        <button onClick={handleReset} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                            {t('createNew')}
                        </button>
                    </div>
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiGenerator;
