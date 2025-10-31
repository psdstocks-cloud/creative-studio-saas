import React, { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import SupportedSites from './SupportedSites';
import { useCreateDownloadJob } from '../hooks/queries/useDownloads';
import { toast } from '../hooks/use-toast';

const normalizeUrls = (value: string) => {
  return value
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

const defaultTitleForUrls = (urls: string[]) => {
  if (urls.length === 1) {
    try {
      const hostname = new URL(urls[0]).hostname.replace(/^www\./, '');
      return `Download from ${hostname}`;
    } catch (_error) {
      return 'Stock asset download';
    }
  }
  if (urls.length > 1) {
    return `${urls.length} assets download`;
  }
  return '';
};

const StockDownloader: React.FC = () => {
  const { t } = useLanguage();
  const createJob = useCreateDownloadJob();

  const [urlsInput, setUrlsInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const urls = useMemo(() => Array.from(new Set(normalizeUrls(urlsInput))), [urlsInput]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (urls.length === 0) {
      toast({
        title: 'Add at least one URL',
        description: 'Paste the stock asset URLs you want to download.',
      });
      return;
    }

    const items = urls.map((sourceUrl) => ({
      source_url: sourceUrl,
    }));

    const title = titleInput.trim() || defaultTitleForUrls(urls);

    try {
      setIsSubmitting(true);
      await createJob({
        title,
        items,
      });
      toast({
        title: 'Download started',
        description: `${items.length} item${items.length > 1 ? 's' : ''} queued.`,
      });
      setUrlsInput('');
      setTitleInput('');
    } catch (error) {
      console.error('Failed to start download job', error);
      toast({
        title: 'Unable to start download',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-800/60 bg-slate-900/80 p-8 shadow-xl">
        <h1 className="mb-6 text-3xl font-bold text-slate-50">{t('stockDownloaderTitle')}</h1>
        <p className="mb-6 text-sm text-slate-400">
          Queue downloads from Shutterstock, Adobe Stock, Getty, and more. Paste one or many URLs and track progress in the downloads dock.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="stock-urls" className="block text-sm font-medium text-slate-200">
              {t('stockUrlLabel')}
            </label>
            <textarea
              id="stock-urls"
              name="stock-urls"
              rows={4}
              value={urlsInput}
              onChange={(event) => setUrlsInput(event.target.value)}
              placeholder={`${t('stockUrlPlaceholder')}`}
              className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/80 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              Separate multiple URLs with new lines or commas. Each valid link becomes an item in the job.
            </p>
          </div>

          <div>
            <label htmlFor="download-title" className="block text-sm font-medium text-slate-200">
              Job title (optional)
            </label>
            <input
              id="download-title"
              type="text"
              value={titleInput}
              onChange={(event) => setTitleInput(event.target.value)}
              placeholder={defaultTitleForUrls(urls)}
              className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/80 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              {urls.length === 0 ? 'No URLs detected yet.' : `${urls.length} URL${urls.length > 1 ? 's' : ''} ready.`}
            </div>
            <button
              type="submit"
              disabled={urls.length === 0 || isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-800/60"
            >
              {isSubmitting ? 'Starting…' : 'Start download job'}
            </button>
          </div>
        </form>
      </div>

      <SupportedSites />
    </div>
  );
};

export default StockDownloader;
