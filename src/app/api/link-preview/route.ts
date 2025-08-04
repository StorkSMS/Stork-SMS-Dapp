import { NextRequest, NextResponse } from 'next/server'

interface LinkPreviewData {
  title?: string
  description?: string
  image?: string
  favicon?: string
  url: string
  domain: string
}

/**
 * Extracts domain from URL for display purposes
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return ''
  }
}

/**
 * Validates if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Extracts Open Graph and meta tags from HTML content
 */
function extractMetaData(html: string, url: string): LinkPreviewData {
  // Use regex to extract meta content since we don't have DOM parser in Node.js
  const getMetaContent = (property: string): string | undefined => {
    // Try Open Graph tags first
    const ogRegex = new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*?)["']`, 'i')
    const ogMatch = html.match(ogRegex)
    if (ogMatch?.[1]) return ogMatch[1]
    
    // Try Twitter tags
    const twitterRegex = new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']*?)["']`, 'i')
    const twitterMatch = html.match(twitterRegex)
    if (twitterMatch?.[1]) return twitterMatch[1]
    
    // Try regular meta tags
    const metaRegex = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*?)["']`, 'i')
    const metaMatch = html.match(metaRegex)
    if (metaMatch?.[1]) return metaMatch[1]
    
    return undefined
  }
  
  // Extract title (fallback to page title if no og:title)
  const title = getMetaContent('title') || html.match(/<title[^>]*>([^<]*?)<\/title>/i)?.[1] || undefined
  
  // Extract description
  const description = getMetaContent('description') || undefined
  
  // Extract image
  let image = getMetaContent('image')
  
  // Make image URL absolute if it's relative
  if (image && !image.startsWith('http')) {
    try {
      const baseUrl = new URL(url)
      image = new URL(image, baseUrl.origin).href
    } catch {
      image = undefined
    }
  }
  
  // Extract favicon
  let favicon: string | undefined
  const iconMatch = html.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']*?)["']/i)
  const shortcutIconMatch = html.match(/<link[^>]*rel=["']shortcut icon["'][^>]*href=["']([^"']*?)["']/i)
  
  if (iconMatch?.[1]) {
    favicon = iconMatch[1]
  } else if (shortcutIconMatch?.[1]) {
    favicon = shortcutIconMatch[1]
  } else {
    // Try default favicon.ico
    try {
      const baseUrl = new URL(url)
      favicon = `${baseUrl.origin}/favicon.ico`
    } catch {
      favicon = undefined
    }
  }
  
  // Make favicon URL absolute if it's relative
  if (favicon && !favicon.startsWith('http')) {
    try {
      const baseUrl = new URL(url)
      favicon = new URL(favicon, baseUrl.origin).href
    } catch {
      favicon = undefined
    }
  }
  
  return {
    title,
    description,
    image,
    favicon,
    url,
    domain: extractDomain(url)
  }
}

/**
 * Domains that are known to block requests or have issues
 */
const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'twitter.com', 
  'x.com',
  'instagram.com',
  'facebook.com',
]

/**
 * Check if a domain is blocked
 */
function isDomainBlocked(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase()
    return BLOCKED_DOMAINS.some(blocked => domain.includes(blocked))
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
    }
    
    if (!isValidUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL provided' }, { status: 400 })
    }
    
    // Check if domain is blocked
    if (isDomainBlocked(url)) {
      // Return basic preview without fetching
      const basicPreview: LinkPreviewData = {
        url,
        domain: extractDomain(url),
        title: extractDomain(url),
        description: undefined,
        image: undefined,
        favicon: undefined,
      }
      return NextResponse.json(basicPreview)
    }
    
    try {
      // Fetch the webpage content directly from the server
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; StorkSMS-LinkPreview/1.0)',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        // 10 second timeout
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const html = await response.text()
      
      // Basic validation to ensure we got HTML content
      if (!html || (!html.includes('<html') && !html.includes('<!DOCTYPE'))) {
        throw new Error('Invalid HTML content received')
      }
      
      const previewData = extractMetaData(html, url)
      return NextResponse.json(previewData)
      
    } catch (error) {
      console.log('Error fetching link preview:', error)
      
      // Return basic preview on error
      const basicPreview: LinkPreviewData = {
        url,
        domain: extractDomain(url),
        title: extractDomain(url),
        description: undefined,
        image: undefined,
        favicon: undefined,
      }
      return NextResponse.json(basicPreview)
    }
    
  } catch (error) {
    console.error('Link preview API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}