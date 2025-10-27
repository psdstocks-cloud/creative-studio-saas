import { apiFetch } from './api';
import type { StockFileInfo, StockOrder, StockDownloadLink, SupportedSite } from '../types';

/**
 * A comprehensive list of parsers to extract site and ID from various stock media URLs.
 * Based on the API's backend logic.
 */
const parsers = [
    // Shutterstock (ordered from most to least specific)
    { site: 'vshutter', regex: /shutterstock\.com\/(?:[a-z-]+\/)?video\/clip-([0-9]+)/i },
    { site: 'mshutter', regex: /shutterstock\.com\/(?:[a-z-]+\/)?music\/track-([0-9]+)/i },
    { site: 'shutterstock', regex: /shutterstock\.com\/(?:[a-z-]+\/)?(?:image-vector|image-photo|image-illustration|image|image-generated|editorial)\/.+?-([0-9]+)/i },
    { site: 'shutterstock', regex: /shutterstock\.com\/(?:[a-z-]+\/)?(?:image-vector|image-photo|image-illustration|image|image-generated|editorial)\/([0-9]+)/i },

    // Adobe Stock
    { site: 'adobestock_v4k', regex: /stock\.adobe\.com\/(?:[a-z-]+\/)*video\/[a-zA-Z0-9-]+\/([0-9]+)/i },
    { site: 'adobestock', regex: /stock\.adobe\.com\/(?:[a-z-]+\/)*(?:images|templates|3d-assets|stock-photo)\/[a-zA-Z0-9-]+\/([0-9]+)/i },
    { site: 'adobestock', regex: /stock\.adobe\.com\/[a-z-]+\/asset_id=([0-9]+)/i },
    { site: 'adobestock', regex: /stock\.adobe\.com\/(?:[a-z-]+\/)*([0-9]+)/i },
    
    // Depositphotos
    { site: 'depositphotos_video', regex: /depositphotos\.com\/([0-9]+)\/stock-video/i },
    { site: 'depositphotos', regex: /depositphotos\.com\/(?:[a-z-]+\/)*[a-z-]+-([0-9]+)/i },
    { site: 'depositphotos', regex: /depositphotos\.com\/([0-9]+)\/stock-(?:photo|illustration)/i },

    // 123rf
    { site: '123rf', regex: /123rf\.com\/(?:photo|free-photo)_([0-9]+)/i },
    { site: '123rf', regex: /123rf\.com\/stock-photo\/([0-9]+)\.html/i },

    // iStock / Getty
    { site: 'istockphoto', regex: /istockphoto\.com\/(?:[a-z-]+\/)*[a-zA-Z0-9-]+-gm([0-9]+)-/i },
    { site: 'gettyimages', regex: /gettyimages\.com\/detail\/(?:[a-z-]+\/)+([0-9]+)/i },

    // Freepik
    { site: 'vfreepik', regex: /freepik\.com\/video\/[a-z-]+_([0-9]+)\.htm/i },
    { site: 'freepik', regex: /freepik\.com\/(?:[a-z-]+\/)*[a-z-]+_([0-9]+)\.htm/i },

    // Flaticon
    { site: 'flaticon', regex: /flaticon\.com\/(?:[a-z-]+\/)*[a-z-]+_([0-9]+)/i },

    // Envato Elements
    { site: 'envato', regex: /elements\.envato\.com\/(?:[a-z-]+\/)+.+?-([A-Z0-9]+)/i },

    // Dreamstime
    { site: 'dreamstime', regex: /dreamstime\.com\/.*?image([0-9]+)/i },

    // VectorStock
    { site: 'vectorstock', regex: /vectorstock\.com\/[a-z-]+\/[a-z-]+-([0-9]+)/i },
    
    // MotionArray
    { site: 'motionarray', regex: /motionarray\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+-([0-9]+)/i },

    // Alamy
    { site: 'alamy', regex: /alamy\.com\/.+?-([A-Z0-9]+)\.html/i },

    // Storyblocks
    { site: 'storyblocks', regex: /storyblocks\.com\/(?:video|images|audio)\/stock\/[0-9a-z-]*?-([0-9a-z_]+)/i },
];

/**
 * Parses a stock media URL to extract the site name and the media ID.
 */
const parseStockUrl = (url: string): { site: string; id: string } => {
    try {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        new URL(fullUrl);

        for (const parser of parsers) {
            const match = fullUrl.match(parser.regex);
            if (match && match[1]) {
                return { site: parser.site, id: match[1] };
            }
        }
    } catch (e) {
         throw new Error('Invalid URL format.');
    }

    throw new Error('Could not parse the stock media ID from the URL or the site is not supported.');
};

/**
 * Fetches metadata for a stock media file from a given URL.
 */
export const getStockFileInfo = async (url: string): Promise<StockFileInfo> => {
  console.log('🔍 Parsing URL:', url);
  const { site, id } = parseStockUrl(url);
  console.log('✅ Parsed:', { site, id });
  console.log('📞 Calling API: /stockinfo/' + site + '/' + id);
  
  const responseData = await apiFetch(`/stockinfo/${site}/${id}`);

  console.log('📦 Raw API Response:', responseData);
  console.log('📊 Response data type:', typeof responseData.data, 'Is array?', Array.isArray(responseData.data));

  // Check if response explicitly indicates failure
  if (responseData.success === false) {
    console.log('❌ API returned success: false');
    throw new Error(responseData.message || 'Could not retrieve file details.');
  }

  // Check if data is an empty array (file unavailable)
  if (Array.isArray(responseData.data)) {
    console.log('📋 Data is an array with length:', responseData.data.length);
    
    if (responseData.data.length === 0) {
      throw new Error('This file is not available for download. It may have been removed or is not supported by the API.');
    }
    
    // If data is a non-empty array, take the first item
    const data = responseData.data[0];
    console.log('✅ Using first item from array:', data);
    
    const costValue = data.cost ?? data.price;
    const previewUrl = data.preview || data.thumb || data.thumb_lg;

    if (!previewUrl || !data.id) {
      throw new Error('Could not retrieve file details. The URL might be incorrect or the file is unavailable.');
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
  const data = responseData.data || responseData;
  console.log('📦 Extracted data object:', data);

  // Final validation - ensure data is an object with required fields
  if (typeof data !== 'object' || data === null) {
    console.log('❌ Data is not a valid object');
    throw new Error('The API returned an invalid response format. Please try again or contact support.');
  }

  const costValue = data.cost ?? data.price;
  const previewUrl = data.preview || data.thumb || data.thumb_lg;

  console.log('🔍 Validation - Preview:', previewUrl, 'ID:', data.id, 'Cost:', costValue);

  // Validate the response to prevent showing an empty modal.
  if (!previewUrl || !data.id) {
    console.log('❌ Missing required fields - preview or id');
    throw new Error('Could not retrieve file details. The URL might be incorrect or the file is unavailable.');
  }
  
  const parsedCost = parseFloat(costValue);

  console.log('✅ Returning StockFileInfo');

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
    return apiFetch(`/stockorder/${site}/${id}`);
};

/**
 * Checks the status of a previously placed order.
 */
export const checkOrderStatus = async (taskId: string): Promise<StockOrder> => {
    return apiFetch(`/order/${taskId}/status`);
}

/**
 * Generates the final download link for a completed order.
 */
export const generateDownloadLink = async (taskId: string): Promise<StockDownloadLink> => {
    return apiFetch(`/v2/order/${taskId}/download`);
}

/**
 * Retrieves the list of supported stock media websites and their costs.
 */
export const getSupportedSites = async (): Promise<SupportedSite[]> => {
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
    { key: 'istockphoto_video_fullhd', name: 'istock video hd', cost: 25, icon: 'istockphoto_video_fullhd.png' },
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
    { key: 'artgrid_HD', name: 'artgrid_HD', cost: 0.8, icon: 'artgrid_HD.png' },
    { key: 'motionelements', name: 'motionelements', cost: 0.5, icon: 'motionelements.png' },
    { key: 'deeezy', name: 'deeezy', cost: 0.5, icon: 'deeezy.png' },
    { key: 'artlist_footage', name: 'artlist video/template', cost: 1, icon: 'artlist_footage.png' },
    { key: 'pixelsquid', name: 'pixelsquid', cost: 0.8, icon: 'pixelsquid.png' },
    { key: 'footagecrate', name: 'footagecrate', cost: 1, icon: 'footagecrate.png' },
  ];

  return Promise.resolve(sites.map(site => ({
    ...site,
    iconUrl: `https://nehtw.com/assets/icons/${site.icon}`
  })));
};
