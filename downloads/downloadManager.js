import { EventEmitter } from 'events';
import crypto from 'crypto';
import { resolveAdapterForUrl } from './providerRegistry.js';

const RUNNING_STATUSES = new Set(['queued', 'starting', 'downloading', 'processing', 'retrying']);
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'canceled']);
const DOWNLOADABLE_STATUSES = new Set(['queued', 'retrying']);
const CANCELABLE_STATUSES = new Set(['starting', 'downloading', 'processing', 'retrying']);
const DEFAULT_CONCURRENCY = 3;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

const toNumberOrNull = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNumber = (value, fallback = 0) => {
  const parsed = toNumberOrNull(value);
  return parsed === null ? fallback : parsed;
};

const nowIso = () => new Date().toISOString();

const inferProviderFromUrl = (url) => {
  if (!url) {
    return 'unknown';
  }
  try {
    const { hostname } = new URL(url);
    if (hostname.includes('shutterstock')) {
      return 'shutterstock';
    }
    if (hostname.includes('pexels')) {
      return 'pexels';
    }
    if (hostname.includes('unsplash')) {
      return 'unsplash';
    }
    if (hostname.includes('adobe')) {
      return 'adobe';
    }
    if (hostname.includes('getty')) {
      return 'getty';
    }
    return hostname.replace(/^www\./, '') || 'unknown';
  } catch (_error) {
    return 'unknown';
  }
};

const isTransientError = (error) => {
  if (!error) {
    return false;
  }
  if (error.name === 'AbortError') {
    return false;
  }
  const status = typeof error.status === 'number' ? error.status : null;
  if (status && status >= 500) {
    return true;
  }
  if (error.code && ['ETIMEDOUT', 'ECONNRESET', 'EPIPE'].includes(String(error.code).toUpperCase())) {
    return true;
  }
  return false;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const sumBytesTotal = (items) => {
  let total = 0;
  for (const item of items) {
    if (item.bytes_total === null || item.bytes_total === undefined) {
      return null;
    }
    total += item.bytes_total;
  }
  return total;
};

const sumBytesDownloaded = (items) => {
  let total = 0;
  for (const item of items) {
    total += toNumber(item.bytes_downloaded);
  }
  return total;
};

const countByStatus = (items, status) => items.filter((item) => item.status === status).length;

const determineJobStatus = (items) => {
  if (!items.length) {
    return 'queued';
  }

  const everyQueued = items.every((item) => item.status === 'queued');
  if (everyQueued) {
    return 'queued';
  }

  const anyRetrying = items.some((item) => item.status === 'retrying');
  if (anyRetrying) {
    return 'retrying';
  }

  const active = items.filter((item) => RUNNING_STATUSES.has(item.status));
  if (active.length > 0) {
    const anyProcessing = active.some((item) => item.status === 'processing');
    return anyProcessing ? 'processing' : 'downloading';
  }

  const completedCount = items.filter((item) => item.status === 'completed').length;
  if (completedCount === items.length) {
    return 'completed';
  }

  const failedCount = items.filter((item) => item.status === 'failed').length;
  const canceledCount = items.filter((item) => item.status === 'canceled').length;

  if (failedCount > 0 && canceledCount === 0) {
    return 'failed';
  }
  if (canceledCount === items.length) {
    return 'canceled';
  }
  if (failedCount > 0) {
    return 'failed';
  }

  return 'queued';
};

const serializeItemPatch = (patch) => {
  const data = { ...patch };
  if (Object.prototype.hasOwnProperty.call(data, 'bytes_total')) {
    data.bytes_total = data.bytes_total === null ? null : Math.max(0, Math.floor(data.bytes_total));
  }
  if (Object.prototype.hasOwnProperty.call(data, 'bytes_downloaded')) {
    data.bytes_downloaded = Math.max(0, Math.floor(data.bytes_downloaded));
  }
  return data;
};

export class DownloadManager extends EventEmitter {
  constructor({ getSupabaseClient, concurrency = DEFAULT_CONCURRENCY, logger = console } = {}) {
    super();
    this.getSupabaseClient = typeof getSupabaseClient === 'function' ? getSupabaseClient : null;
    this.concurrency = concurrency;
    this.logger = logger;

    this.jobs = new Map();
    this.items = new Map();
    this.itemsByJob = new Map();
    this.queue = [];
    this.activeCount = 0;
    this.itemControllers = new Map();
    this.retryState = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    try {
      await this.hydrateOpenJobs();
    } catch (error) {
      this.logger.error('Failed to hydrate download jobs', error);
    }
  }

  async hydrateOpenJobs() {
    if (!this.getSupabaseClient) {
      return;
    }
    const client = this.getSupabaseClient();
    if (!client) {
      return;
    }

    const openStatuses = ['queued', 'starting', 'downloading', 'processing', 'retrying'];
    const { data: jobs, error: jobsError } = await client
      .from('download_jobs')
      .select('*')
      .in('status', openStatuses);

    if (jobsError) {
      throw jobsError;
    }

    if (!jobs?.length) {
      return;
    }

    const jobIds = jobs.map((job) => job.id);
    const { data: items, error: itemsError } = await client
      .from('download_items')
      .select('*')
      .in('job_id', jobIds);

    if (itemsError) {
      throw itemsError;
    }

    for (const rawJob of jobs) {
      const normalizedJob = this.normalizeJob(rawJob);
      this.jobs.set(normalizedJob.id, normalizedJob);
      this.itemsByJob.set(normalizedJob.id, new Map());
    }

    for (const rawItem of items || []) {
      const normalized = this.normalizeItem(rawItem);
      this.items.set(normalized.id, normalized);
      if (!this.itemsByJob.has(normalized.job_id)) {
        this.itemsByJob.set(normalized.job_id, new Map());
      }
      this.itemsByJob.get(normalized.job_id).set(normalized.id, normalized);

      if (RUNNING_STATUSES.has(normalized.status)) {
        this.enqueueItem(normalized.job_id, normalized.id, { prioritize: true });
      }
    }

    for (const [jobId] of this.jobs) {
      this.refreshJobAggregates(jobId);
    }
  }

  normalizeJob(raw) {
    const job = { ...raw };
    job.bytes_total = toNumberOrNull(raw.bytes_total);
    job.bytes_downloaded = toNumber(raw.bytes_downloaded);
    job.items_count = toNumber(raw.items_count, 0);
    job.items_completed = toNumber(raw.items_completed, 0);
    job.items_failed = toNumber(raw.items_failed, 0);
    job.created_at = raw.created_at || nowIso();
    job.updated_at = raw.updated_at || nowIso();
    return job;
  }

  normalizeItem(raw) {
    const item = { ...raw };
    item.bytes_total = toNumberOrNull(raw.bytes_total);
    item.bytes_downloaded = toNumber(raw.bytes_downloaded);
    item.meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
    return item;
  }

  async createJob({ userId, items, title }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required to start a download job.');
    }

    const jobId = crypto.randomUUID();
    const createdAt = nowIso();
    const normalizedItems = items.map((item) => {
      const id = crypto.randomUUID();
      const provider = item.provider || inferProviderFromUrl(item.source_url);
      const meta = item.meta && typeof item.meta === 'object' ? item.meta : {};
      return {
        id,
        job_id: jobId,
        provider,
        source_url: item.source_url,
        filename: item.filename ?? null,
        bytes_total: item.bytes_total ?? null,
        bytes_downloaded: 0,
        status: 'queued',
        error_message: null,
        thumb_url: item.thumb_url ?? null,
        started_at: null,
        finished_at: null,
        meta,
      };
    });

    const jobTitle = title || this.buildJobTitle(normalizedItems);

    const job = {
      id: jobId,
      user_id: userId,
      title: jobTitle,
      status: 'queued',
      items_count: normalizedItems.length,
      items_completed: 0,
      items_failed: 0,
      bytes_total: sumBytesTotal(normalizedItems),
      bytes_downloaded: 0,
      created_at: createdAt,
      updated_at: createdAt,
      provider_batch_id: null,
    };

    this.jobs.set(jobId, job);
    const itemMap = new Map();
    this.itemsByJob.set(jobId, itemMap);
    for (const item of normalizedItems) {
      this.items.set(item.id, item);
      itemMap.set(item.id, item);
      this.retryState.set(item.id, 0);
      this.enqueueItem(jobId, item.id);
    }

    await this.persistJobAndItems(job, normalizedItems);

    this.emit('event', { type: 'job_created', job: clone(job) });

    for (const item of normalizedItems) {
      this.emit('event', { type: 'item_updated', item: { ...clone(item) } });
    }

    return { job: clone(job), items: normalizedItems.map((item) => clone(item)) };
  }

  async listJobs(userId, { limit = 20, cursor } = {}) {
    if (this.getSupabaseClient) {
      const client = this.getSupabaseClient();
      if (client) {
        let query = client
          .from('download_jobs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit + 1);

        if (cursor) {
          query = query.lt('created_at', cursor);
        }

        const { data, error } = await query;
        if (error) {
          throw error;
        }
        const normalized = (data || []).map((raw) => this.normalizeJob(raw));
        const hasMore = normalized.length > limit;
        const jobs = hasMore ? normalized.slice(0, limit) : normalized;
        const nextCursor = hasMore ? normalized[limit].created_at : null;
        jobs.forEach((job) => {
          this.jobs.set(job.id, job);
          if (!this.itemsByJob.has(job.id)) {
            this.itemsByJob.set(job.id, new Map());
          }
        });
        return { jobs, nextCursor };
      }
    }

    const jobs = Array.from(this.jobs.values())
      .filter((job) => job.user_id === userId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit);
    return { jobs, nextCursor: null };
  }

  async getJob(userId, jobId) {
    if (this.getSupabaseClient) {
      const client = this.getSupabaseClient();
      if (client) {
        const { data: jobData, error: jobError } = await client
          .from('download_jobs')
          .select('*')
          .eq('user_id', userId)
          .eq('id', jobId)
          .single();
        if (jobError) {
          throw jobError;
        }
        const job = this.normalizeJob(jobData);
        const { data: itemsData, error: itemsError } = await client
          .from('download_items')
          .select('*')
          .eq('job_id', jobId);
        if (itemsError) {
          throw itemsError;
        }
        const items = (itemsData || []).map((raw) => this.normalizeItem(raw));
        this.jobs.set(job.id, job);
        const itemMap = new Map();
        for (const item of items) {
          this.items.set(item.id, item);
          itemMap.set(item.id, item);
        }
        this.itemsByJob.set(job.id, itemMap);
        return { job, items };
      }
    }

    const job = this.jobs.get(jobId);
    if (!job || job.user_id !== userId) {
      throw new Error('Download job not found.');
    }
    const items = Array.from(this.itemsByJob.get(jobId)?.values() || []);
    return { job: clone(job), items: items.map((item) => clone(item)) };
  }

  async cancelJob(userId, jobId) {
    const job = await this.ensureJobOwnership(userId, jobId);

    const items = Array.from(this.itemsByJob.get(jobId)?.values() || []);
    let changed = false;

    for (const item of items) {
      if (CANCELABLE_STATUSES.has(item.status)) {
        changed = true;
        await this.updateItem(item.id, {
          status: 'canceled',
          finished_at: nowIso(),
        });
        const controller = this.itemControllers.get(item.id);
        if (controller) {
          controller.abort();
        }
      }
    }

    if (changed) {
      await this.refreshJobAggregates(jobId);
    }

    return this.jobs.get(jobId);
  }

  async retryItem(userId, itemId) {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error('Download item not found.');
    }
    const job = await this.ensureJobOwnership(userId, item.job_id);
    if (!job) {
      throw new Error('Download job not found.');
    }

    await this.updateItem(itemId, {
      status: 'retrying',
      error_message: null,
      bytes_downloaded: 0,
      bytes_total: item.bytes_total ?? null,
      started_at: null,
      finished_at: null,
    });

    this.retryState.set(itemId, 0);
    this.enqueueItem(item.job_id, itemId, { prioritize: true });
    await this.refreshJobAggregates(item.job_id);
    return this.items.get(itemId);
  }

  enqueueItem(jobId, itemId, { prioritize = false } = {}) {
    const item = this.items.get(itemId);
    if (!item || TERMINAL_STATUSES.has(item.status)) {
      return;
    }

    const existingIndex = this.queue.findIndex((entry) => entry.itemId === itemId);
    if (existingIndex !== -1) {
      this.queue.splice(existingIndex, 1);
    }

    const entry = { jobId, itemId };
    if (prioritize) {
      this.queue.unshift(entry);
    } else {
      this.queue.push(entry);
    }
    this.processQueue();
  }

  processQueue() {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) {
        break;
      }
      this.activeCount += 1;
      this.runItem(next.jobId, next.itemId)
        .catch((error) => {
          this.logger.error('Download item failed unexpectedly', error);
        })
        .finally(() => {
          this.activeCount = Math.max(0, this.activeCount - 1);
          this.processQueue();
        });
    }
  }

  async runItem(jobId, itemId) {
    const item = this.items.get(itemId);
    const job = this.jobs.get(jobId);
    if (!item || !job) {
      return;
    }

    if (!DOWNLOADABLE_STATUSES.has(item.status) && !RUNNING_STATUSES.has(item.status)) {
      return;
    }

    const adapter = resolveAdapterForUrl(item.source_url);
    if (!adapter) {
      await this.updateItem(itemId, {
        status: 'failed',
        error_message: 'No provider adapter is available for this asset.',
        finished_at: nowIso(),
      });
      await this.refreshJobAggregates(jobId);
      return;
    }

    const attempt = (this.retryState.get(itemId) ?? 0) + 1;
    this.retryState.set(itemId, attempt);

    await this.updateItem(itemId, {
      status: attempt > 1 ? 'retrying' : 'starting',
      error_message: null,
      started_at: nowIso(),
      finished_at: null,
      bytes_downloaded: 0,
    });
    await this.refreshJobAggregates(jobId);

    const abortController = new AbortController();
    this.itemControllers.set(itemId, abortController);

    try {
      const resolved = await adapter.resolveAsset({ source_url: item.source_url, meta: item.meta || {} });
      await this.updateItem(itemId, {
        status: 'downloading',
        filename: resolved?.filename ?? item.filename ?? null,
        bytes_total: toNumberOrNull(resolved?.size) ?? item.bytes_total ?? null,
      });
      await this.refreshJobAggregates(jobId);

      const handleProgress = async (deltaBytes, totalBytes) => {
        const current = this.items.get(itemId);
        if (!current || abortController.signal.aborted) {
          return;
        }
        const nextBytes = Math.max(0, toNumber(current.bytes_downloaded) + toNumber(deltaBytes));
        const patch = {
          bytes_downloaded: nextBytes,
        };
        if (totalBytes !== undefined && totalBytes !== null) {
          patch.bytes_total = toNumberOrNull(totalBytes);
        }
        await this.updateItem(itemId, patch, { skipBroadcast: false, progress: true });
        await this.refreshJobAggregates(jobId, { progress: true });
      };

      await adapter.streamToStorage({
        downloadUrl: resolved.downloadUrl,
        onProgress: handleProgress,
        abortSignal: abortController.signal,
      });

      await this.updateItem(itemId, {
        status: 'processing',
      });
      await this.refreshJobAggregates(jobId);

      await this.updateItem(itemId, {
        status: 'completed',
        finished_at: nowIso(),
      });
      await this.refreshJobAggregates(jobId);
    } catch (error) {
      if (error?.name === 'AbortError') {
        await this.updateItem(itemId, {
          status: 'canceled',
          finished_at: nowIso(),
        });
        await this.refreshJobAggregates(jobId);
        return;
      }

      const shouldRetry = attempt < MAX_RETRIES && isTransientError(error);

      await this.updateItem(itemId, {
        status: shouldRetry ? 'retrying' : 'failed',
        error_message: error?.message || 'The download failed unexpectedly.',
        finished_at: shouldRetry ? null : nowIso(),
      });
      await this.refreshJobAggregates(jobId);

      if (shouldRetry) {
        const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        setTimeout(() => {
          this.enqueueItem(jobId, itemId, { prioritize: true });
        }, delay);
      }
    } finally {
      this.itemControllers.delete(itemId);
    }
  }

  async ensureJobOwnership(userId, jobId) {
    const job = this.jobs.get(jobId);
    if (job && job.user_id === userId) {
      return job;
    }
    if (this.getSupabaseClient) {
      const client = this.getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from('download_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', userId)
          .single();
        if (error) {
          throw error;
        }
        const normalized = this.normalizeJob(data);
        this.jobs.set(normalized.id, normalized);
        return normalized;
      }
    }
    throw new Error('Download job not found.');
  }

  async updateItem(itemId, patch, { skipBroadcast = false } = {}) {
    const existing = this.items.get(itemId);
    if (!existing) {
      return null;
    }
    const updated = {
      ...existing,
      ...patch,
    };
    if (patch.meta) {
      updated.meta = { ...existing.meta, ...patch.meta };
    }
    this.items.set(itemId, updated);
    const jobItems = this.itemsByJob.get(existing.job_id);
    if (jobItems) {
      jobItems.set(itemId, updated);
    }

    if (this.getSupabaseClient) {
      const client = this.getSupabaseClient();
      if (client) {
        const payload = serializeItemPatch({
          ...patch,
        });
        await client.from('download_items').update(payload).eq('id', itemId);
      }
    }

    if (!skipBroadcast) {
      const job = this.jobs.get(existing.job_id);
      const payload = { ...patch, id: itemId, job_id: existing.job_id };
      if (job) {
        payload.user_id = job.user_id;
      }
      this.emit('event', { type: 'item_updated', item: payload });
    }

    return updated;
  }

  async refreshJobAggregates(jobId, { progress = false } = {}) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }
    const items = Array.from(this.itemsByJob.get(jobId)?.values() || []);
    job.items_count = items.length;
    job.items_completed = countByStatus(items, 'completed');
    job.items_failed = countByStatus(items, 'failed');
    job.bytes_downloaded = sumBytesDownloaded(items);
    job.bytes_total = sumBytesTotal(items);
    const previousStatus = job.status;
    job.status = determineJobStatus(items);
    job.updated_at = nowIso();

    this.jobs.set(jobId, job);

    if (this.getSupabaseClient) {
      const client = this.getSupabaseClient();
      if (client) {
        await client
          .from('download_jobs')
          .update({
            status: job.status,
            items_count: job.items_count,
            items_completed: job.items_completed,
            items_failed: job.items_failed,
            bytes_total: job.bytes_total,
            bytes_downloaded: job.bytes_downloaded,
            updated_at: job.updated_at,
          })
          .eq('id', jobId);
      }
    }

    this.emit('event', {
      type: 'job_updated',
      job: {
        id: jobId,
        user_id: job.user_id,
        status: job.status,
        items_count: job.items_count,
        items_completed: job.items_completed,
        items_failed: job.items_failed,
        bytes_total: job.bytes_total,
        bytes_downloaded: job.bytes_downloaded,
        updated_at: job.updated_at,
      },
    });

    if (!progress) {
      if (job.status === 'completed' && previousStatus !== 'completed') {
        this.emit('event', { type: 'job_completed', id: jobId, user_id: job.user_id });
      } else if (job.status === 'failed' && previousStatus !== 'failed') {
        this.emit('event', { type: 'job_failed', id: jobId, user_id: job.user_id });
      }
    }
  }

  buildJobTitle(items) {
    const providers = new Set(items.map((item) => item.provider));
    if (items.length === 1) {
      const provider = Array.from(providers)[0] || 'Asset';
      return `${provider.charAt(0).toUpperCase() + provider.slice(1)} download`;
    }
    return `${items.length} assets download`;
  }

  async persistJobAndItems(job, items) {
    if (!this.getSupabaseClient) {
      return;
    }
    const client = this.getSupabaseClient();
    if (!client) {
      return;
    }

    const { error: jobError } = await client.from('download_jobs').insert({
      ...job,
    });
    if (jobError) {
      this.logger.error('Failed to persist download job', jobError);
    }

    if (items.length) {
      const { error: itemsError } = await client.from('download_items').insert(items);
      if (itemsError) {
        this.logger.error('Failed to persist download items', itemsError);
      }
    }
  }

  getJobSnapshot(jobId) {
    const job = this.jobs.get(jobId);
    return job ? clone(job) : null;
  }

  getItemsSnapshot(jobId) {
    const items = this.itemsByJob.get(jobId);
    if (!items) {
      return [];
    }
    return Array.from(items.values()).map((item) => clone(item));
  }
}

export const createDownloadManager = (options) => {
  const manager = new DownloadManager(options);
  manager.initialize().catch((error) => {
    options?.logger?.error?.('Download manager initialization failed', error);
  });
  return manager;
};
