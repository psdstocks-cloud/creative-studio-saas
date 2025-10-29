import type { StockFileInfo } from '../../src/types';
import { parseStockUrl } from '../../shared/stockUrl';

const DEFAULT_STOCK_API_BASE_URL = 'https://nehtw.com/api';

export interface StockEnv {
  STOCK_API_KEY?: string;
  STOCK_API_BASE_URL?: string;
}

export interface NormalizedStockInfo extends StockFileInfo {
  cost: number;
}

const buildStockApiUrl = (baseUrl: string, path: string) => {
  const upstream = new URL(baseUrl);
  const basePath = upstream.pathname.endsWith('/') && upstream.pathname !== '/' ? upstream.pathname.slice(0, -1) : upstream.pathname;
  upstream.pathname = `${basePath}${path}`;
  return upstream;
};

const selectFirstRecord = (payload: any) => {
  if (!payload) {
    throw new Error('Stock metadata response was empty.');
  }

  const data = typeof payload === 'object' && payload !== null ? payload.data ?? payload : payload;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error('Stock file could not be located.');
    }
    return data[0];
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('Unexpected stock metadata format.');
  }

  return data;
};

const extractPreviewUrl = (record: any) =>
  record?.preview || record?.thumb || record?.thumb_lg || record?.image || record?.cover;

const normalizeCost = (record: any) => {
  const costValue = Number(record?.cost ?? record?.price);
  if (Number.isNaN(costValue) || costValue < 0) {
    throw new Error('The remote API returned an invalid price for this asset.');
  }
  return costValue;
};

export const fetchStockMetadata = async (env: StockEnv, site: string, id: string) => {
  const apiKey = env.STOCK_API_KEY;
  if (!apiKey) {
    throw new Error('Server configuration error: STOCK_API_KEY is missing.');
  }

  const baseUrl = env.STOCK_API_BASE_URL || DEFAULT_STOCK_API_BASE_URL;
  const upstreamUrl = buildStockApiUrl(baseUrl, `/stockinfo/${site}/${id}`);

  const response = await fetch(upstreamUrl.toString(), {
    headers: {
      'X-Api-Key': apiKey,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Failed to retrieve stock metadata (${response.status}): ${errorBody || response.statusText}`);
  }

  return response.json();
};

export const normalizeStockInfo = (raw: any, fallbackSite: string, fallbackId: string, sourceUrl: string): NormalizedStockInfo => {
  const record = selectFirstRecord(raw);
  const preview = extractPreviewUrl(record);

  if (!record?.id) {
    throw new Error('Stock metadata did not include an asset identifier.');
  }

  if (!preview) {
    throw new Error('Stock metadata did not include a preview image.');
  }

  const cost = normalizeCost(record);

  return {
    id: String(record.id || fallbackId),
    site: String(record.site || fallbackSite),
    preview: String(preview),
    cost,
    title: record.title || record.name,
    name: record.name,
    author: record.author,
    ext: record.ext,
    sizeInBytes: record.size,
    debugid: record.debugid,
    source_url: sourceUrl,
  };
};

export const parseAndValidateSourceUrl = (sourceUrl: string) => {
  const parsed = parseStockUrl(sourceUrl);
  return parsed;
};
