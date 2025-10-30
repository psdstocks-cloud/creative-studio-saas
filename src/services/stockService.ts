import { apiFetch } from './api';
import { logger } from '../lib/logger';
import type { StockFileInfo, StockOrder, StockDownloadLink, SupportedSite } from '../types';
import { parseStockUrl } from '../../shared/stockUrl';

/**
 * Fetches metadata for a stock media file from a given URL.
 */
export const getStockFileInfo = async (url: string): Promise<StockFileInfo> => {
  const { site, id } = parseStockUrl(url);
  logger.debug('Parsing stock URL', { url, site, id });

  const responseData = await apiFetch(`/stockinfo/${site}/${id}`) as any;
  logger.apiResponse(`/stockinfo/${site}/${id}`, responseData);

  // Check if response explicitly indicates failure
  if (responseData?.success === false) {
    const errorMessage = responseData?.message || 'Could not retrieve file details.';
    logger.error('Stock API returned error', new Error(errorMessage), { url, site, id });
    throw new Error(errorMessage);
  }

  // Check if data is an empty array (file unavailable)
  if (Array.isArray(responseData?.data)) {
    logger.debug('Stock API returned array', { length: responseData.data.length });

    if (responseData.data.length === 0) {
      throw new Error(
        'This file is not available for download. It may have been removed or is not supported by the API.'
      );
    }

    // If data is a non-empty array, take the first item
    const data = responseData.data[0];

    const costValue = data.cost ?? data.price;
    const previewUrl = data.preview || data.thumb || data.thumb_lg || data.image;

    if (!previewUrl || !data.id) {
      throw new Error(
        'Could not retrieve file details. The URL might be incorrect or the file is unavailable.'
      );
    }

    const parsedCost = parseFloat(costValue);

    return {
      id: data.id,
      site: data.site || site,
      preview: previewUrl,
      cost: !isNaN(parsedCost) ? parsedCost : null,
      title: data.title || data.name,
      name: data.name,
      author: data.author,
      ext: data.ext,
      sizeInBytes: data.size,
      debugid: data.debugid,
    };
  }

  // Handle cases where data is nested inside a 'data' property (as an object)
  const data = responseData?.data || responseData;

  // Final validation - ensure data is an object with required fields
  if (typeof data !== 'object' || data === null) {
    logger.error('Invalid stock API response format', new Error('Data is not a valid object'), {
      data,
    });
    throw new Error(
      'The API returned an invalid response format. Please try again or contact support.'
    );
  }

  const costValue = data.cost ?? data.price;
  const previewUrl = data.preview || data.thumb || data.thumb_lg || data.image;

  // Validate the response to prevent showing an empty modal.
  if (!previewUrl || !data.id) {
    logger.error(
      'Missing required fields in stock API response',
      new Error('Missing preview or id'),
      {
        hasPreview: !!previewUrl,
        hasId: !!data.id,
      }
    );
    throw new Error(
      'Could not retrieve file details. The URL might be incorrect or the file is unavailable.'
    );
  }

  const parsedCost = parseFloat(costValue);

  return {
    id: data.id,
    site: data.site || site,
    preview: previewUrl,
    cost: !isNaN(parsedCost) ? parsedCost : null,
    title: data.title || data.name,
    name: data.name,
    author: data.author,
    ext: data.ext,
    sizeInBytes: data.size,
    debugid: data.debugid,
  };
};

/**
 * Places an order to download a stock media file.
 */
export const orderStockFile = async (site: string, id: string): Promise<StockOrder> => {
  return apiFetch(`/stockorder/${site}/${id}`) as Promise<StockOrder>;
};

/**
 * Checks the status of a previously placed order.
 */
export const checkOrderStatus = async (taskId: string): Promise<StockOrder> => {
  return apiFetch(`/order/${taskId}/status`) as Promise<StockOrder>;
};

/**
 * Generates the final download link for a completed order.
 */
export const generateDownloadLink = async (taskId: string): Promise<StockDownloadLink> => {
  return apiFetch(`/v2/order/${taskId}/download`);
};

/**
 * Retrieves the list of supported stock media websites and their costs.
 * NOW FETCHES FROM DATABASE INSTEAD OF HARDCODED LIST
 */
export const getSupportedSites = async (): Promise<SupportedSite[]> => {
  try {
    // Fetch from database via API
    const response = await apiFetch('/stock-sources', { auth: false }) as any;
    
    if (response && Array.isArray(response.sites)) {
      return response.sites.filter((site: SupportedSite) => site.active !== false);
    }

    // Fallback to static list if API fails
    console.warn('Failed to fetch dynamic stock sources, using fallback');
    return getFallbackSites();
  } catch (error) {
    console.error('Error fetching supported sites:', error);
    return getFallbackSites();
  }
};

/**
 * Fallback static list (same as original hardcoded)
 * Used if database is unavailable
 */
const getFallbackSites = (): SupportedSite[] => {
  const sites = [
    { key: 'adobestock', name: 'adobestock', cost: 0.4, icon: 'adobestock.png' },
    { key: 'pixelbuddha', name: 'pixelbuddha', cost: 0.6, icon: 'pixelbuddha.png' },
    { key: 'iconscout', name: 'iconscout', cost: 0.2, icon: 'iconscout.png' },
    { key: 'mockupcloud', name: 'mockupcloud', cost: 1, icon: 'mockupcloud.png' },
    { key: 'ui8', name: 'ui8', cost: 3, icon: 'ui8.png' },
    { key: 'pixeden', name: 'pixeden', cost: 0.6, icon: 'pixeden.png' },
    { key: 'creativefabrica', name: 'creativefabrica', cost: 0.5, icon: 'creativefabrica.png' },
    { key: 'envato', name: 'envato', cost: 0.5, icon: 'envato.png' },
    { key: 'vectorstock', name: 'vectorstock', cost: 1, icon: 'vectorstock.png' },
    { key: 'vshutter4k', name: 'SS video 4K', cost: 17, icon: 'vshutter4k.png' },
    { key: 'vshutter', name: 'SS video HD', cost: 8, icon: 'vshutter.png' },
    { key: 'dreamstime', name: 'dreamstime', cost: 0.65, icon: 'dreamstime.png' },
    {
      key: 'istockphoto_video_fullhd',
      name: 'istock video hd',
      cost: 25,
      icon: 'istockphoto_video_fullhd.png',
    },
    { key: 'designi', name: 'designi', cost: 0.8, icon: 'designi.png' },
    { key: 'istockphoto', name: 'istockphoto', cost: 0.8, icon: 'istockphoto.png' },
    { key: 'storyblocks', name: 'storyblocks', cost: 1, icon: 'storyblocks.png' },
    { key: '123rf', name: '123rf', cost: 0.65, icon: '123rf.png' },
    { key: 'vecteezy', name: 'vecteezy', cost: 0.3, icon: 'vecteezy.png' },
    { key: 'rawpixel', name: 'rawpixel', cost: 0.3, icon: 'rawpixel.png' },
    { key: 'uihut', name: 'uihut', cost: 'off', icon: 'uihut.png' },
    { key: 'vfreepik', name: 'Freepik video', cost: 1, icon: 'vfreepik.png' },
    { key: 'mshutter', name: 'SS music', cost: 1, icon: 'mshutter.png' },
    { key: 'freepik', name: 'freepik', cost: 0.2, icon: 'freepik.png' },
    { key: 'adobestock_v4k', name: 'Adobestock video', cost: 4.5, icon: 'adobestock_v4k.png' },
    { key: 'flaticon', name: 'flaticon', cost: 0.2, icon: 'flaticon.png' },
    { key: 'craftwork', name: 'craftwork', cost: 2, icon: 'craftwork.png' },
    { key: 'alamy', name: 'alamy', cost: 16, icon: 'alamy.png' },
    { key: 'motionarray', name: 'motionarray', cost: 0.25, icon: 'motionarray.png' },
    { key: 'soundstripe', name: 'soundstripe', cost: 0.3, icon: 'soundstripe.png' },
    { key: 'yellowimages', name: 'yellowimages', cost: 12, icon: 'yellowimages.png' },
    { key: 'shutterstock', name: 'shutterstock', cost: 0.5, icon: 'shutterstock.png' },
    { key: 'depositphotos', name: 'depositphotos', cost: 0.6, icon: 'depositphotos.png' },
    { key: 'artlist_sound', name: 'artlist music/sfx', cost: 0.4, icon: 'artlist_sound.png' },
    { key: 'epidemicsound', name: 'epidemicsound', cost: 0.3, icon: 'epidemicsound.png' },
    { key: 'artgrid_hd', name: 'artgrid_HD', cost: 0.8, icon: 'artgrid_HD.png' },
    { key: 'motionelements', name: 'motionelements', cost: 0.5, icon: 'motionelements.png' },
    { key: 'deeezy', name: 'deeezy', cost: 0.5, icon: 'deeezy.png' },
    {
      key: 'artlist_footage',
      name: 'artlist video/template',
      cost: 1,
      icon: 'artlist_footage.png',
    },
    { key: 'pixelsquid', name: 'pixelsquid', cost: 0.8, icon: 'pixelsquid.png' },
    { key: 'footagecrate', name: 'footagecrate', cost: 1, icon: 'footagecrate.png' },
  ];

  return sites.map((site) => ({
    ...site,
    iconUrl: `https://nehtw.com/assets/icons/${site.icon}`,
    active: true,
  }));
};