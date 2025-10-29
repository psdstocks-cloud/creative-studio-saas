import React, { useState, useEffect, useCallback } from 'react';
import { enhancePrompt } from '../services/geminiService';
import { createAiJob, pollAiJob, performAiAction } from '../services/aiService';
import type { AiJob } from '../types';
import {
  SparklesIcon,
  ArrowPathIcon,
  CpuChipIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const AiGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [job, setJob] = useState<AiJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionStates, setActionStates] = useState<Record<number, boolean>>({});

  const { t } = useLanguage();
  const { user, deductPoints } = useAuth();

  const handleJobUpdate = useCallback((polledJob: AiJob) => {
    setJob((prevJob) => {
      if (!prevJob || polledJob._id !== prevJob._id) return polledJob;
      return { ...prevJob, ...polledJob };
    });
  }, []);

  useEffect(() => {
    if (!job?.get_result_url || job.status === 'completed' || job.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const polledJob = await pollAiJob(job.get_result_url!);
        handleJobUpdate(polledJob);
        if (polledJob.status === 'completed' || polledJob.status === 'failed') {
          clearInterval(interval);
        }
      } catch (err: any) {
        console.error('Polling failed:', err);
        setJob((prev) => (prev ? { ...prev, status: 'failed', error_message: err.message } : null));
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [job, handleJobUpdate]);

  const startNewJob = async (
    jobCreationFunc: () => Promise<{ job_id: string; get_result_url: string }>,
    currentPrompt: string,
    cost: number = 0
  ) => {
    setJob(null);
    setError(null);

    try {
      if (user && cost > 0 && user.balance < cost) {
        setError(t('insufficientPoints'));
        setIsLoading(false);
        return;
      }

      const { job_id, get_result_url } = await jobCreationFunc();

      const initialJob: AiJob = {
        _id: job_id,
        prompt: currentPrompt,
        status: 'pending',
        percentage_complete: 0,
        files: [],
        get_result_url: get_result_url,
      };
      setJob(initialJob);

      if (cost > 0) {
        await deductPoints(cost);
      }
    } catch (err: any) {
      setError(err.message);
      setJob(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setIsLoading(true);
    const finalPrompt = await enhancePrompt(prompt, isThinkingMode);
    setPrompt(finalPrompt);

    await startNewJob(() => createAiJob(finalPrompt), finalPrompt, 1); // Assuming a cost of 1 point
    setIsLoading(false);
  };

  const handleAction = async (action: 'vary' | 'upscale', index: number) => {
    if (!job) return;

    setActionStates((prev) => ({ ...prev, [index]: true }));
    // Reset main loading state for a new job flow
    setIsLoading(true);

    await startNewJob(() => performAiAction(job._id, action, index), job.prompt, 0.5); // Assuming lower cost for actions

    setIsLoading(false);
    setActionStates((prev) => ({ ...prev, [index]: false }));
  };

  const handleReset = () => {
    setPrompt('');
    setJob(null);
    setError(null);
    setIsLoading(false);
  };

  const isAnyActionLoading = Object.values(actionStates).some((state) => state);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t('aiGeneratorTitle')}</h1>
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {!job && (
          <form onSubmit={handleSubmit}>
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
                    <input
                      type="checkbox"
                      id="thinking-mode"
                      className="sr-only"
                      checked={isThinkingMode}
                      onChange={() => setIsThinkingMode(!isThinkingMode)}
                    />
                    <div
                      className={`block w-14 h-8 rounded-full ${isThinkingMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    ></div>
                    <div
                      className={`dot absolute start-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isThinkingMode ? 'ltr:translate-x-6 rtl:-translate-x-6' : ''}`}
                    ></div>
                  </div>
                  <div className="ms-3 text-gray-700 dark:text-gray-300 font-medium flex items-center">
                    <CpuChipIcon />
                    <span className="ms-2">{t('thinkingMode')}</span>
                  </div>
                </label>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center"
              >
                {isLoading ? (
                  <ArrowPathIcon className="animate-spin -ms-1 me-2 h-5 w-5" />
                ) : (
                  <SparklesIcon className="-ms-1 me-2 h-5 w-5" />
                )}
                {isLoading ? t('enhancing') : t('generate')}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-900/50 text-red-300 flex items-start space-x-3 rtl:space-x-reverse">
            <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {job && (
          <div className="animate-fadeIn mt-6">
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('promptLabel')}</p>
              <p className="italic text-gray-800 dark:text-gray-200">{job.prompt}</p>
            </div>

            {(job.status === 'pending' || job.status === 'processing') && (
              <div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 mb-2">
                  <div
                    className="bg-blue-600 h-4 rounded-full"
                    style={{
                      width: `${job.percentage_complete || 0}%`,
                      transition: 'width 0.5s ease-in-out',
                    }}
                  ></div>
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  {job.percentage_complete || 0}
                  {t('percentComplete')}
                </p>
              </div>
            )}

            {job.status === 'failed' && (
              <div className="text-center p-6 bg-red-900/30 rounded-lg">
                <XCircleIcon className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-red-300">{t('aiJobFailed')}</h3>
                <p className="text-sm text-red-400 mt-1">
                  {job.error_message || 'An unknown error occurred.'}
                </p>
              </div>
            )}

            {job.status === 'completed' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {job.files.map((file) => (
                  <div key={file.index} className="group relative rounded-lg overflow-hidden">
                    <img
                      src={file.thumb_lg}
                      alt={`Generated image ${file.index}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => handleAction('vary', file.index)}
                          disabled={isLoading || isAnyActionLoading}
                          className="bg-white/80 text-gray-900 px-3 py-2 rounded-full hover:bg-white text-sm font-semibold disabled:opacity-50 disabled:cursor-wait flex items-center"
                        >
                          {actionStates[file.index] ? (
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          ) : (
                            t('vary')
                          )}
                        </button>
                        <button
                          onClick={() => handleAction('upscale', file.index)}
                          disabled={isLoading || isAnyActionLoading}
                          className="bg-white/80 text-gray-900 px-3 py-2 rounded-full hover:bg-white text-sm font-semibold disabled:opacity-50 disabled:cursor-wait flex items-center"
                        >
                          {actionStates[file.index] ? (
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          ) : (
                            t('upscale')
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center mt-6">
              <button
                onClick={handleReset}
                className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                {t('createNew')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiGenerator;
