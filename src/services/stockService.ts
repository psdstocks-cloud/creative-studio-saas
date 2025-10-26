import type { StockFileInfo, StockOrder, StockDownloadLink, SupportedSite } from '../types';

const API_KEY = 'A8K9bV5s2OX12E8cmS4I96mtmSNzv7';
const API_BASE_URL = 'https://nehtw.com/api';

/**
 * A helper function to make authenticated API requests to the stock service.
 * It automatically adds the API key header and handles non-OK responses.
 * @param endpoint The API endpoint to call (e.g., '/stockinfo/shutterstock/123').
 * @returns A promise that resolves with the JSON response.
 */
const apiFetch = async (endpoint: string) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'X-Api-Key': API_KEY,
    },
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      // Attempt to get a more specific error message from the API's response body.
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.data || errorMessage;
    } catch (e) {
      // Ignore if the body isn't JSON or is empty.
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

/**
 * A comprehensive list of parsers to extract site and ID from various stock media URLs.
 * Based on the API's backend logic.
 */
const parsers = [
    // Shutterstock (ordered from most to least specific)
    { site: 'vshutter', regex: /shutterstock\.com\/(?:[a-z-]+\/)?video\/clip-([0-9]+)/i },
    { site: 'mshutter', regex: /shutterstock\.com\/(?:[a-z-]+\/)?music\/track-([0-9]+)/i },
    { site: 'shutterstock', regex: /shutterstock\.com\/(?:[a-z-]+\/)?(?:image-vector|image-photo|image-illustration|image|image-generated|editorial)\/[a-zA-Z0-9-]+-([0-9]+)/i },
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
    { site: 'envato', regex: /elements\.envato\.com\/(?:[a-z-]+\/)+[a-zA-Z0-9-]+-([A-Z0-9]+)/i },

    // Dreamstime
    { site: 'dreamstime', regex: /dreamstime\.com\/[a-z-]+-image([0-9]+)/i },

    // VectorStock
    { site: 'vectorstock', regex: /vectorstock\.com\/[a-z-]+\/[a-z-]+-([0-9]+)/i },
    
    // MotionArray
    { site: 'motionarray', regex: /motionarray\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+-([0-9]+)/i },

    // Alamy
    { site: 'alamy', regex: /alamy\.com\/[a-zA-Z0-9-]+-([A-Z0-9]+)\.html/i },

    // Storyblocks
    { site: 'storyblocks', regex: /storyblocks\.com\/(?:video|images|audio)\/stock\/[0-9a-z-]*?-([0-9a-z_]+)/i },
];

/**
 * Parses a stock media URL to extract the site name and the media ID.
 * @param url The full URL of the stock media page.
 * @returns An object containing the site and id.
 * @throws An error if the URL is invalid or from an unsupported provider.
 */
const parseStockUrl = (url: string): { site: string; id: string } => {
    try {
        // Ensure the URL has a protocol for the URL constructor to work correctly.
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        new URL(fullUrl); // This is just to validate that the URL format is generally correct.

        for (const parser of parsers) {
            const match = fullUrl.match(parser.regex);
            if (match && match[1]) {
                // The API expects 'istockphoto' for images, let's stick to the key from the list.
                return { site: parser.site, id: match[1] };
            }
        }
    } catch (e) {
         // This catch block handles errors from `new URL()` for malformed URLs.
         throw new Error('Invalid URL format.');
    }

    throw new Error('Could not parse the stock media ID from the URL or the site is not supported.');
};


/**
 * Fetches metadata for a stock media file from a given URL.
 * @param url The URL of the stock media.
 * @returns A promise resolving to the stock file's information.
 */
export const getStockFileInfo = async (url: string): Promise<StockFileInfo> => {
  const { site, id } = parseStockUrl(url);
  // Per API docs, pass the original, encoded URL as a query parameter.
  const endpoint = `/stockinfo/${site}/${id}?url=${encodeURIComponent(url)}`;
  const responseData = await apiFetch(endpoint);
  
  // As per API docs, check for an explicit error response even with a 200 OK status.
  if (responseData.success === false || responseData.error === true) {
      throw new Error(responseData.data || responseData.message || 'The API returned an unspecified error.');
  }

  // Handle cases where the actual data is nested inside a 'data' property.
  const data = responseData.data || responseData;

  const costValue = data.cost ?? data.price;
  const previewUrl = data.image || data.preview || data.thumb || data.thumb_lg;

  // Validate the response to prevent showing an empty modal.
  if (!previewUrl || !data.id || !data.source) {
    throw new Error('Could not retrieve valid file details. The API response was incomplete.');
  }
  
  // Robustly parse the cost, which might be a string or number.
  const parsedCost = parseFloat(costValue);

  return {
    id: data.id,
    site: data.source, // Use 'source' from response as the canonical site name
    preview: previewUrl,
    cost: !isNaN(parsedCost) ? parsedCost : null,
    debugid: data.debugid,
  };
};

/**
 * Places an order to download a stock media file.
 * @param site The stock media provider (e.g., 'shutterstock').
 * @param id The ID of the media file.
 * @returns A promise resolving to the order details, including a task_id.
 */
export const orderStockFile = async (site: string, id: string): Promise<StockOrder> => {
    const responseData = await apiFetch(`/stockorder/${site}/${id}`);

    // The API response for ordering might be nested or contain explicit error flags.
    // This robustly handles the response to prevent the UI from getting stuck.
    const data = responseData.data || responseData;

    if (responseData.success === false || responseData.error === true) {
        throw new Error(data.message || data || 'The API returned an error while ordering.');
    }

    if (!data.task_id) {
        console.error("Invalid response from orderStockFile, missing task_id:", responseData);
        throw new Error("Received an invalid response from the server when placing the order.");
    }
    
    return data;
};

/**
 * Checks the status of a previously placed order.
 * @param taskId The task_id received from ordering the file.
 * @returns A promise resolving to the current order status.
 */
export const checkOrderStatus = async (taskId: string): Promise<StockOrder> => {
    return apiFetch(`/order/${taskId}/status`);
}

/**
 * Generates the final download link for a completed order.
 * @param taskId The task_id of the order with 'ready' status.
 * @returns A promise resolving to an object containing the download URL.
 */
export const generateDownloadLink = async (taskId: string): Promise<StockDownloadLink> => {
    // Note: API documentation specifies v2 for this endpoint.
    const responseData = await apiFetch(`/v2/order/${taskId}/download`);

    // For debugging purposes, it's helpful to see what the API is actually sending.
    console.log('Download link API response:', responseData);

    let downloadUrl: string | null = null;
    
    // Normalize the data part of the response, which can be nested.
    const data = responseData.data || responseData;

    if (typeof data === 'string' && data.startsWith('http')) {
        // Case 1: The data itself is the URL string.
        downloadUrl = data;
    } else if (typeof data === 'object' && data !== null) {
        // Case 2: The data is an object. Search for the URL within it.
        const possibleKeys = ['downloadUrl', 'url', 'link', 'download_url'];
        for (const key of possibleKeys) {
            const potentialUrl = data[key];
            if (typeof potentialUrl === 'string' && potentialUrl.startsWith('http')) {
                downloadUrl = potentialUrl;
                break; // Found a valid URL, exit the loop.
            }
        }
    }

    // Validate that we found a usable URL.
    if (!downloadUrl) {
        console.error('Could not extract a valid download URL from the API response:', responseData);
        throw new Error('Could not get a valid download link from the server. The response format was unexpected.');
    }

    return { url: downloadUrl };
};

/**
 * Retrieves the list of supported stock media websites and their costs.
 * @returns A promise that resolves to an array of supported sites.
 */
export const getSupportedSites = async (): Promise<SupportedSite[]> => {
  // This data is extracted from the provided HTML source for nehtw.com
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