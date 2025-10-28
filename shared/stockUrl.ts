export interface ParsedStockUrl {
  site: string;
  id: string;
  hostname: string;
  normalizedUrl: string;
}

const STOCK_URL_PARSERS: Array<{ site: string; regex: RegExp }> = [
  // Shutterstock (ordered from most to least specific)
  { site: 'vshutter', regex: /shutterstock\.com\/(?:[a-z-]+\/)?video\/clip-([0-9]+)/i },
  { site: 'mshutter', regex: /shutterstock\.com\/(?:[a-z-]+\/)?music\/track-([0-9]+)/i },
  {
    site: 'shutterstock',
    regex:
      /shutterstock\.com\/(?:[a-z-]+\/)?(?:image-vector|image-photo|image-illustration|image|image-generated|editorial)\/.+?-([0-9]+)/i,
  },
  {
    site: 'shutterstock',
    regex:
      /shutterstock\.com\/(?:[a-z-]+\/)?(?:image-vector|image-photo|image-illustration|image|image-generated|editorial)\/([0-9]+)/i,
  },

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

  // Vecteezy
  { site: 'vecteezy', regex: /vecteezy\.com\/(?:[a-z-]+\/)*[a-z-]+-([0-9]+)/i },
];

export const ALLOWED_STOCK_HOSTNAMES = new Set([
  'shutterstock.com',
  'www.shutterstock.com',
  'stock.adobe.com',
  'depositphotos.com',
  'www.depositphotos.com',
  '123rf.com',
  'www.123rf.com',
  'istockphoto.com',
  'www.istockphoto.com',
  'gettyimages.com',
  'www.gettyimages.com',
  'freepik.com',
  'www.freepik.com',
  'flaticon.com',
  'www.flaticon.com',
  'elements.envato.com',
  'dreamstime.com',
  'www.dreamstime.com',
  'vectorstock.com',
  'www.vectorstock.com',
  'motionarray.com',
  'www.motionarray.com',
  'alamy.com',
  'www.alamy.com',
  'storyblocks.com',
  'www.storyblocks.com',
  'vecteezy.com',
  'www.vecteezy.com',
]);

const normalizeInputUrl = (input: string): URL => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('URL cannot be empty.');
  }
  try {
    return new URL(trimmed);
  } catch {
    return new URL(`https://${trimmed}`);
  }
};

export const parseStockUrl = (input: string): ParsedStockUrl => {
  const url = normalizeInputUrl(input);
  const hostname = url.hostname.toLowerCase();

  if (!ALLOWED_STOCK_HOSTNAMES.has(hostname)) {
    throw new Error('This provider is not supported. Please supply a URL from an approved stock site.');
  }

  const normalizedUrl = url.toString();

  for (const parser of STOCK_URL_PARSERS) {
    const match = normalizedUrl.match(parser.regex);
    if (match && match[1]) {
      return {
        site: parser.site,
        id: match[1],
        hostname,
        normalizedUrl,
      };
    }
  }

  throw new Error('Could not parse the stock media ID from the URL or the site is not supported.');
};

export const isHostnameAllowed = (hostname: string) => ALLOWED_STOCK_HOSTNAMES.has(hostname.toLowerCase());
