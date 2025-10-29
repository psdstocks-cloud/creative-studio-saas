/**
 * Utility to build stock media URLs from site name and ID
 * Note: Some sites require descriptive slugs which we don't store.
 * These basic URLs will redirect to the correct page on most sites.
 */

export const buildStockMediaUrl = (site: string, id: string): string | null => {
  const siteKey = site.toLowerCase();

  // Shutterstock variants
  if (siteKey === 'shutterstock' || siteKey === 'vshutter' || siteKey === 'mshutter') {
    // Basic format works for all types (images, vectors, videos, music)
    return `https://www.shutterstock.com/image/${id}`;
  }

  // Dreamstime
  if (siteKey === 'dreamstime') {
    return `https://www.dreamstime.com/image/${id}`;
  }

  // Adobe Stock
  if (siteKey === 'adobestock' || siteKey === 'adobestock_v4k') {
    return `https://stock.adobe.com/${id}`;
  }

  // Depositphotos
  if (siteKey === 'depositphotos' || siteKey === 'depositphotos_video') {
    return `https://depositphotos.com/${id}`;
  }

  // 123RF
  if (siteKey === '123rf') {
    return `https://www.123rf.com/photo_${id}`;
  }

  // iStock
  if (siteKey === 'istockphoto' || siteKey === 'istockphoto_video_fullhd') {
    return `https://www.istockphoto.com/photo/gm${id}`;
  }

  // Getty Images
  if (siteKey === 'gettyimages') {
    return `https://www.gettyimages.com/detail/${id}`;
  }

  // Freepik
  if (siteKey === 'freepik' || siteKey === 'vfreepik') {
    return `https://www.freepik.com/${id}`;
  }

  // Flaticon
  if (siteKey === 'flaticon') {
    return `https://www.flaticon.com/free-icon/${id}`;
  }

  // Envato Elements
  if (siteKey === 'envato') {
    return `https://elements.envato.com/item/${id}`;
  }

  // VectorStock
  if (siteKey === 'vectorstock') {
    return `https://www.vectorstock.com/royalty-free-vector/${id}`;
  }

  // MotionArray
  if (siteKey === 'motionarray') {
    return `https://motionarray.com/browse/${id}`;
  }

  // Alamy
  if (siteKey === 'alamy') {
    return `https://www.alamy.com/stock-photo-${id}.html`;
  }

  // Storyblocks
  if (siteKey === 'storyblocks') {
    return `https://www.storyblocks.com/video/stock/${id}`;
  }

  // Pixelbuddha
  if (siteKey === 'pixelbuddha') {
    return `https://pixelbuddha.net/item/${id}`;
  }

  // IconScout
  if (siteKey === 'iconscout') {
    return `https://iconscout.com/icon/${id}`;
  }

  // UI8
  if (siteKey === 'ui8') {
    return `https://ui8.net/item/${id}`;
  }

  // Creative Fabrica
  if (siteKey === 'creativefabrica') {
    return `https://www.creativefabrica.com/product/${id}`;
  }

  // Rawpixel
  if (siteKey === 'rawpixel') {
    return `https://www.rawpixel.com/image/${id}`;
  }

  // Vecteezy
  if (siteKey === 'vecteezy') {
    return `https://www.vecteezy.com/free-vector/${id}`;
  }

  // Artlist (footage/music)
  if (siteKey === 'artlist_footage' || siteKey === 'artlist_sound') {
    return `https://artlist.io/clip/${id}`;
  }

  // Artgrid
  if (siteKey === 'artgrid_hd') {
    return `https://artgrid.io/clip/${id}`;
  }

  // Epidemic Sound
  if (siteKey === 'epidemicsound') {
    return `https://www.epidemicsound.com/track/${id}`;
  }

  // Soundstripe
  if (siteKey === 'soundstripe') {
    return `https://www.soundstripe.com/music/${id}`;
  }

  // Motion Elements
  if (siteKey === 'motionelements') {
    return `https://www.motionelements.com/stock-video-${id}`;
  }

  // Yellow Images
  if (siteKey === 'yellowimages') {
    return `https://yellowimages.com/stock-photo/${id}`;
  }

  // Mockup Cloud
  if (siteKey === 'mockupcloud') {
    return `https://mockup.cloud/mockup/${id}`;
  }

  // Pixeden
  if (siteKey === 'pixeden') {
    return `https://www.pixeden.com/item/${id}`;
  }

  // Default: return null if site is not recognized
  console.warn(`Unknown stock site: ${site}. Cannot generate URL.`);
  return null;
};
