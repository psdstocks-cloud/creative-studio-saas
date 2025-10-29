import type { StockFileInfo, StockOrder, SupportedSite } from '../types';

// MOCK API - In a real application, this would make network requests.

export const getStockFileInfo = async (url: string): Promise<StockFileInfo> => {
  console.log('Fetching file info for:', url);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Basic validation mock
  if (!url.includes('shutterstock.com') && !url.includes('adobestock.com')) {
      throw new Error("Unsupported URL or invalid link.");
  }
  
  return {
    site: 'shutterstock',
    id: '12345',
    preview: 'https://picsum.photos/400/300',
    cost: 50.00,
  };
};

export const orderStockFile = async (site: string, id: string): Promise<StockOrder> => {
  console.log('Ordering file:', { site, id });
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    task_id: `task_${Date.now()}`,
    status: 'processing',
  };
};

export const checkOrderStatus = async (taskId: string): Promise<StockOrder> => {
  console.log('Checking status for task:', taskId);
  await new Promise(resolve => setTimeout(resolve, 1000));
  // This is mocked more deeply in the component, but we'll return a static "ready" here for simplicity.
  return {
    task_id: taskId,
    status: 'ready',
  };
};

export const generateDownloadLink = async (taskId: string): Promise<{ url: string }> => {
    console.log('Generating download link for task:', taskId);
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
        url: 'https://picsum.photos/2000/1500', // Return a placeholder image URL
    };
};

export const getSupportedSites = async (): Promise<SupportedSite[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return [
        { key: 'shutterstock', name: 'Shutterstock', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Shutterstock_logo.svg/1280px-Shutterstock_logo.svg.png', cost: 50 },
        { key: 'adobestock', name: 'Adobe Stock', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Adobe_Stock_logo.svg/1280px-Adobe_Stock_logo.svg.png', cost: 65 },
        { key: 'gettyimages', name: 'Getty Images', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Getty_Images_logo.svg/1280px-Getty_Images_logo.svg.png', cost: 120 },
        { key: 'istock', name: 'iStock', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/ISTOCK_Logotype_2021.svg/1280px-ISTOCK_Logotype_2021.svg.png', cost: 'off' },
        { key: 'freepik', name: 'Freepik', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Freepik_logo.svg/1280px-Freepik_logo.svg.png', cost: 10 },
        { key: 'vecteezy', name: 'Vecteezy', iconUrl: 'https://static.vecteezy.com/system/resources/assets/001/269/488/original/vecteezy-logo-png.png', cost: 15 },
        { key: 'pngtree', name: 'Pngtree', iconUrl: 'https://png.pngtree.com/png-clipart/20210211/ourmid/pngtree-3d-social-media-icon-png-image_2893815.jpg', cost: 5 },
        { key: 'lovepik', name: 'Lovepik', iconUrl: 'https://img.lovepik.com/logo/20231118/lovepik-lovepik-logo-creator-logo-image-401589566_wh1200.png', cost: 'off' },
    ];
};
