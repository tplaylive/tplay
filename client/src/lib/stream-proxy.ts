// Stream proxy utility for handling CORS issues with external streams
export function getProxiedStreamUrl(originalUrl: string): string {
  // For development, we might need to proxy some streams through our server
  if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
    // Check if this is a problematic CORS stream
    const corsProblematicDomains = [
      'cdn.live247stream.info',
      'live247stream.info',
      'd1211whpimeups.cloudfront.net'
    ];
    
    const isProblematic = corsProblematicDomains.some(domain => originalUrl.includes(domain));
    
    if (isProblematic) {
      // Return original URL but with instructions for mobile handling
      console.warn('CORS-problematic stream detected:', originalUrl);
      return originalUrl;
    }
  }
  
  return originalUrl;
}

// Mobile stream optimization
export function optimizeStreamForMobile(streamUrl: string, isMobile: boolean = false): string {
  if (!isMobile) return streamUrl;
  
  // For mobile, we might want to prefer lower quality or specific formats
  // This is where you could add logic to append quality parameters
  const url = new URL(streamUrl);
  
  // Add mobile-specific parameters if the stream supports them
  if (streamUrl.includes('.m3u8')) {
    // Some HLS streams support quality selection via URL params
    if (!url.searchParams.has('quality')) {
      url.searchParams.set('quality', 'mobile');
    }
  }
  
  return url.toString();
}

// Check if stream is likely to work on mobile
export function isMobileFriendlyStream(streamUrl: string): boolean {
  // Direct MP4 streams typically work better on mobile
  if (streamUrl.includes('.mp4')) return true;
  
  // HLS streams generally work on mobile
  if (streamUrl.includes('.m3u8')) return true;
  
  // DASH streams might have issues on some mobile browsers
  if (streamUrl.includes('.mpd')) return false;
  
  return true;
}

// Generate fallback streams for mobile compatibility
export function generateMobileFallbacks(streamUrl: string): string[] {
  const fallbacks: string[] = [streamUrl];
  
  // If it's an HLS stream, try some variations
  if (streamUrl.includes('.m3u8')) {
    // Try with different quality parameters
    const url = new URL(streamUrl);
    
    // Add a mobile-optimized version
    const mobileUrl = new URL(streamUrl);
    mobileUrl.searchParams.set('mobile', '1');
    fallbacks.push(mobileUrl.toString());
    
    // Add a low-quality version
    const lowQualUrl = new URL(streamUrl);
    lowQualUrl.searchParams.set('quality', 'low');
    fallbacks.push(lowQualUrl.toString());
  }
  
  return fallbacks;
}