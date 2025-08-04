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
 * Fetches link preview data from our API endpoint
 */
export async function fetchLinkPreviewFromAPI(url: string): Promise<LinkPreviewData> {
  const apiUrl = `/api/link-preview?url=${encodeURIComponent(url)}`;
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    // 15 second timeout
    signal: AbortSignal.timeout(15000)
  });
  
  if (!response.ok) {
    throw new Error(`API failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}


/**
 * Main function to get link preview data
 */
export async function getLinkPreviewData(url: string): Promise<LinkPreviewData | null> {
  if (!isValidUrl(url)) {
    return null;
  }
  
  try {
    const previewData = await fetchLinkPreviewFromAPI(url);
    return previewData;
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