/**
 * URL detection and parsing utilities for client-side link preview functionality
 */

// Comprehensive URL regex pattern that matches common URL formats
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

/**
 * Detects URLs in a text string and returns an array of found URLs
 */
export function detectUrls(text: string): string[] {
  if (!text) return [];
  
  const matches = text.match(URL_REGEX);
  return matches ? [...new Set(matches)] : []; // Remove duplicates
}

/**
 * Extracts the first URL from a text string
 */
export function extractFirstUrl(text: string): string | null {
  const urls = detectUrls(text);
  return urls.length > 0 ? urls[0] : null;
}

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts domain from URL for display purposes
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Interface for link preview metadata
 */
export interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  url: string;
  domain: string;
}

/**
 * Extracts Open Graph and meta tags from HTML content
 */
export function extractMetaData(html: string, url: string): LinkPreviewData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Helper function to get meta content
  const getMetaContent = (property: string): string | undefined => {
    // Try Open Graph tags first
    const ogTag = doc.querySelector(`meta[property="og:${property}"]`) as HTMLMetaElement;
    if (ogTag?.content) return ogTag.content;
    
    // Try Twitter tags
    const twitterTag = doc.querySelector(`meta[name="twitter:${property}"]`) as HTMLMetaElement;
    if (twitterTag?.content) return twitterTag.content;
    
    // Try regular meta tags
    const metaTag = doc.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
    if (metaTag?.content) return metaTag.content;
    
    return undefined;
  };
  
  // Extract title (fallback to page title if no og:title)
  const title = getMetaContent('title') || doc.querySelector('title')?.textContent || undefined;
  
  // Extract description
  const description = getMetaContent('description') || undefined;
  
  // Extract image
  let image = getMetaContent('image');
  
  // Make image URL absolute if it's relative
  if (image && !image.startsWith('http')) {
    try {
      const baseUrl = new URL(url);
      image = new URL(image, baseUrl.origin).href;
    } catch {
      image = undefined;
    }
  }
  
  // Extract favicon
  let favicon: string | undefined;
  const iconLink = doc.querySelector('link[rel="icon"]') as HTMLLinkElement;
  const shortcutIcon = doc.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
  
  if (iconLink?.href) {
    favicon = iconLink.href;
  } else if (shortcutIcon?.href) {
    favicon = shortcutIcon.href;
  } else {
    // Try default favicon.ico
    try {
      const baseUrl = new URL(url);
      favicon = `${baseUrl.origin}/favicon.ico`;
    } catch {
      favicon = undefined;
    }
  }
  
  return {
    title,
    description,
    image,
    favicon,
    url,
    domain: extractDomain(url)
  };
}

/**
 * List of CORS proxy services to try in order
 */
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`, // May require demo access
];

/**
 * Fetches webpage content using a CORS proxy with multiple fallbacks
 */
export async function fetchWebpageContent(url: string): Promise<string> {
  let lastError: Error | null = null;
  
  // Try each proxy in order until one works
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyUrl = CORS_PROXIES[i](url);
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
        },
        // Shorter timeout for better UX
        signal: AbortSignal.timeout(5000) // 5 second timeout per proxy
      });
      
      if (!response.ok) {
        throw new Error(`Proxy ${i + 1} failed: ${response.status}`);
      }
      
      const text = await response.text();
      
      // Basic validation to ensure we got HTML content
      if (!text || (!text.includes('<html') && !text.includes('<!DOCTYPE'))) {
        throw new Error('Invalid HTML content received');
      }
      
      return text;
    } catch (error) {
      lastError = error as Error;
      // Only log if it's not a timeout or abort error
      if (!(error instanceof Error && error.name === 'TimeoutError')) {
        console.debug(`Proxy ${i + 1} failed:`, error);
      }
      
      // Don't try next proxy if we're on the last one
      if (i === CORS_PROXIES.length - 1) {
        throw lastError;
      }
    }
  }
  
  throw lastError || new Error('All proxies failed');
}

/**
 * Domains that are known to block CORS proxies or have issues
 */
const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'twitter.com',
  'x.com',
  'instagram.com',
  'facebook.com',
];

/**
 * Check if a domain is blocked
 */
function isDomainBlocked(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    return BLOCKED_DOMAINS.some(blocked => domain.includes(blocked));
  } catch {
    return false;
  }
}

/**
 * Main function to get link preview data
 */
export async function getLinkPreviewData(url: string): Promise<LinkPreviewData | null> {
  if (!isValidUrl(url)) {
    return null;
  }
  
  // Check if domain is blocked
  if (isDomainBlocked(url)) {
    // Return basic preview without fetching
    return {
      url,
      domain: extractDomain(url),
      title: extractDomain(url),
      description: undefined,
      image: undefined,
      favicon: undefined,
    };
  }
  
  try {
    const html = await fetchWebpageContent(url);
    return extractMetaData(html, url);
  } catch (error) {
    console.debug('Error fetching link preview:', error);
    
    // Return basic preview on error
    return {
      url,
      domain: extractDomain(url),
      title: extractDomain(url),
      description: undefined,
      image: undefined,
      favicon: undefined,
    };
  }
}

/**
 * Preloads an image and returns a promise that resolves when loaded
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Interface for skeleton dimensions
 */
export interface SkeletonDimensions {
  imageHeight: string;
  titleWidth: string;
  titleWidth2: string;
  descWidth: string;
  descWidth2: string;
  domainWidth: string;
  showImage: boolean;
  showTitle2: boolean;
  showDesc: boolean;
  showDesc2: boolean;
  showDomain: boolean;
}

/**
 * Calculate skeleton dimensions based on URL and basic heuristics
 * This runs synchronously for instant skeleton sizing
 */
export function calculateSkeletonDimensions(url: string): SkeletonDimensions {
  const domain = extractDomain(url);
  
  // Estimate based on common patterns
  const isImageSite = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || 
                     domain.includes('dribbble') || 
                     domain.includes('behance') ||
                     domain.includes('unsplash') ||
                     domain.includes('imgur');
  
  const isCodeSite = domain.includes('github') || 
                    domain.includes('gitlab') ||
                    domain.includes('codepen');
  
  const isNewsSite = domain.includes('news') ||
                    domain.includes('blog') ||
                    domain.includes('medium');
  
  // Smart dimension estimation - use really large widths for titles
  let titleWidth = '400px';  // Much larger width to handle all title sizes
  let titleWidth2 = '350px'; // Large second line width
  let showTitle2 = true;
  
  let descWidth = '300px';
  let descWidth2 = '220px';
  let showDesc = true;
  let showDesc2 = true;
  
  if (isImageSite) {
    // Image sites often have shorter descriptions
    descWidth = '250px';
    descWidth2 = '180px';
  }
  
  const domainWidth = Math.min(domain.length * 7 + 30, 150) + 'px';
  
  return {
    imageHeight: isImageSite ? '180px' : '120px', // Smaller for non-image sites
    titleWidth,
    titleWidth2,
    descWidth,
    descWidth2,
    domainWidth,
    showImage: true, // Always show initially, hide later if no image
    showTitle2,
    showDesc,
    showDesc2,
    showDomain: true
  };
}