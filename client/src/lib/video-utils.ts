// Video stream format detection and player selection utilities

export type StreamFormat = 'M3U8' | 'DASH' | 'TS' | 'MPD' | 'HLS' | 'UNKNOWN';

export interface StreamInfo {
  format: StreamFormat;
  playerType: 'video-js' | 'm3u8-player' | 'dash-player' | 'native';
  supportsAdaptive: boolean;
}

/**
 * Detect stream format from URL
 */
export function detectStreamFormat(url: string): StreamFormat {
  const lowercaseUrl = url.toLowerCase();
  
  if (lowercaseUrl.includes('.m3u8') || lowercaseUrl.includes('hls')) {
    return 'M3U8';
  }
  
  if (lowercaseUrl.includes('.mpd') || 
      lowercaseUrl.includes('dash') || 
      lowercaseUrl.includes('/index.mpd') ||
      lowercaseUrl.includes('master.mpd')) {
    return 'DASH';
  }
  
  if (lowercaseUrl.includes('.ts')) {
    return 'TS';
  }
  
  if (lowercaseUrl.includes('manifest')) {
    // Could be either HLS or DASH manifest
    if (lowercaseUrl.includes('m3u8') || lowercaseUrl.includes('hls')) {
      return 'M3U8';
    }
    if (lowercaseUrl.includes('mpd') || lowercaseUrl.includes('dash')) {
      return 'DASH';
    }
    return 'M3U8'; // Default to HLS for generic manifests
  }
  
  return 'UNKNOWN';
}

/**
 * Get optimal player configuration for stream format
 */
export function getPlayerConfig(url: string): StreamInfo {
  const format = detectStreamFormat(url);
  
  switch (format) {
    case 'M3U8':
      return {
        format: 'M3U8',
        playerType: 'm3u8-player',
        supportsAdaptive: true
      };
      
    case 'DASH':
      return {
        format: 'DASH',
        playerType: 'dash-player',
        supportsAdaptive: true
      };
      
    case 'TS':
      return {
        format: 'TS',
        playerType: 'video-js',
        supportsAdaptive: false
      };
      
    case 'MPD':
      return {
        format: 'MPD',
        playerType: 'dash-player',
        supportsAdaptive: true
      };
      
    default:
      return {
        format: 'UNKNOWN',
        playerType: 'video-js',
        supportsAdaptive: false
      };
  }
}

/**
 * Check if browser natively supports the stream format
 */
export function hasNativeSupport(format: StreamFormat): boolean {
  if (!window.HTMLVideoElement) return false;
  
  const video = document.createElement('video');
  
  switch (format) {
    case 'M3U8':
      // Safari has native HLS support
      return video.canPlayType('application/vnd.apple.mpegurl') !== '';
      
    case 'DASH':
      // Most browsers don't have native DASH support
      return false;
      
    case 'TS':
      // TS files can be played as MP4 containers
      return video.canPlayType('video/mp2t') !== '';
      
    default:
      return false;
  }
}

/**
 * Get quality levels from M3U8 master playlist
 */
export async function parseM3U8Quality(url: string): Promise<Array<{ label: string; url: string; bandwidth: number }>> {
  try {
    const response = await fetch(url);
    const content = await response.text();
    
    const qualities: Array<{ label: string; url: string; bandwidth: number }> = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
        const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
        
        if (bandwidthMatch && i + 1 < lines.length) {
          const bandwidth = parseInt(bandwidthMatch[1]);
          const streamUrl = lines[i + 1].trim();
          
          let label = `${Math.round(bandwidth / 1000)}k`;
          if (resolutionMatch) {
            const [width, height] = resolutionMatch[1].split('x');
            label = `${height}p`;
          }
          
          qualities.push({
            label,
            url: streamUrl.startsWith('http') ? streamUrl : new URL(streamUrl, url).href,
            bandwidth
          });
        }
      }
    }
    
    return qualities.sort((a, b) => b.bandwidth - a.bandwidth);
  } catch (error) {
    console.error('Failed to parse M3U8 qualities:', error);
    return [];
  }
}

/**
 * Extract channel info from M3U playlist line
 */
export function parseM3UChannelInfo(line: string): {
  name: string;
  logo?: string;
  group?: string;
  tvgId?: string;
} | null {
  if (!line.startsWith('#EXTINF:')) return null;
  
  // Extract channel name (after the comma)
  const nameMatch = line.match(/#EXTINF:.*?,(.+)$/);
  if (!nameMatch) return null;
  
  const name = nameMatch[1].trim();
  
  // Extract attributes
  const logoMatch = line.match(/tvg-logo="([^"]+)"/);
  const groupMatch = line.match(/group-title="([^"]+)"/);
  const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);
  
  return {
    name,
    logo: logoMatch?.[1],
    group: groupMatch?.[1],
    tvgId: tvgIdMatch?.[1]
  };
}

/**
 * Categorize channel based on name and group
 */
export function categorizeChannel(name: string, group?: string): string {
  const lowerName = name.toLowerCase();
  const lowerGroup = group?.toLowerCase() || '';
  
  // News channels
  if (lowerName.includes('news') || lowerGroup.includes('news') || 
      lowerName.includes('akhon') || lowerName.includes('prothom')) {
    return 'News';
  }
  
  // Sports channels
  if (lowerName.includes('sports') || lowerGroup.includes('sports') ||
      lowerName.includes('cricket') || lowerName.includes('football')) {
    return 'Sports';
  }
  
  // Music channels
  if (lowerName.includes('music') || lowerGroup.includes('music') ||
      lowerName.includes('9xm') || lowerName.includes('mtv')) {
    return 'Music';
  }
  
  // Movies channels
  if (lowerName.includes('movies') || lowerGroup.includes('movies') ||
      lowerName.includes('cinema') || lowerName.includes('film')) {
    return 'Movies';
  }
  
  // Kids channels
  if (lowerName.includes('kids') || lowerGroup.includes('kids') ||
      lowerName.includes('cartoon') || lowerName.includes('nick')) {
    return 'Kids';
  }
  
  // Religious channels
  if (lowerName.includes('islamic') || lowerGroup.includes('religious') ||
      lowerName.includes('peace') || lowerName.includes('quran')) {
    return 'Religious';
  }
  
  // Regional channels
  if (lowerName.includes('bangla') || lowerName.includes('bengali') ||
      lowerGroup.includes('regional') || lowerName.includes('desh')) {
    return 'Regional';
  }
  
  // Default to Entertainment
  return 'Entertainment';
}

/**
 * Initialize video player with optimal configuration
 * Compatible with existing hook interface
 */
export function initVideoPlayer(videoElement: HTMLVideoElement, callbacks?: {
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onError?: (error: string) => void;
}): any {
  // Return a simple player instance for compatibility
  const player = {
    element: videoElement,
    callbacks: callbacks || {},
    dispose: () => destroyVideoPlayer(videoElement.id)
  };

  // Set up event listeners
  if (callbacks?.onLoadStart) {
    videoElement.addEventListener('loadstart', callbacks.onLoadStart);
  }
  if (callbacks?.onCanPlay) {
    videoElement.addEventListener('canplay', callbacks.onCanPlay);
  }
  if (callbacks?.onError) {
    videoElement.addEventListener('error', () => callbacks.onError?.('Video playback error'));
  }

  return player;
}

/**
 * Initialize video player by element ID with stream URL
 */
export function initVideoPlayerById(elementId: string, streamUrl: string): void {
  const config = getPlayerConfig(streamUrl);
  
  if (config.playerType === 'm3u8-player') {
    // Initialize M3U8 player with HLS.js
    initM3U8Player(elementId, streamUrl);
  } else if (config.playerType === 'dash-player') {
    // Initialize DASH player (if needed in future)
    initDashPlayer(elementId, streamUrl);
  } else {
    // Initialize standard Video.js player
    initVideoJSPlayer(elementId, streamUrl);
  }
}

/**
 * Load stream into existing player
 */
export function loadStreamIntoPlayer(elementId: string, streamUrl: string): void {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const video = element.querySelector('video');
  if (video) {
    video.src = streamUrl;
    video.load();
    video.play().catch(console.error);
  }
}

/**
 * Initialize M3U8 player with HLS.js
 */
function initM3U8Player(elementId: string, streamUrl: string): void {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Create video element if not exists
  let video = element.querySelector('video') as HTMLVideoElement;
  if (!video) {
    video = document.createElement('video');
    video.controls = true;
    video.className = 'w-full h-full';
    element.appendChild(video);
  }
  
  // Use HLS.js for M3U8 streams
  if (typeof (window as any).Hls !== 'undefined') {
    const Hls = (window as any).Hls;
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      
      // Store HLS instance for cleanup
      (video as any).hlsInstance = hls;
    }
  }
  
  // Fallback to native HLS support (Safari)
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = streamUrl;
  }
}

/**
 * Initialize DASH player with DRM support
 */
function initDashPlayer(elementId: string, streamUrl: string, drmConfig?: { keyId: string, key: string }): void {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Create video element if not exists
  let video = element.querySelector('video') as HTMLVideoElement;
  if (!video) {
    video = document.createElement('video');
    video.controls = true;
    video.className = 'w-full h-full';
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    element.appendChild(video);
  }
  
  // Check if we have dash.js available
  if (typeof (window as any).dashjs !== 'undefined') {
    const dashjs = (window as any).dashjs;
    const player = dashjs.MediaPlayer().create();
    
    // Configure DRM if provided
    if (drmConfig && drmConfig.keyId && drmConfig.key) {
      const protectionData = {
        'org.w3.clearkey': {
          'clearkeys': {
            [drmConfig.keyId]: drmConfig.key
          }
        }
      };
      
      player.setProtectionData(protectionData);
      console.log('DRM Configuration applied:', { keyId: drmConfig.keyId });
    }
    
    // Initialize player
    player.initialize(video, streamUrl, true);
    
    // Store dash player instance for cleanup
    (video as any).dashInstance = player;
    
    // Set up error handling
    player.on('error', (e: any) => {
      console.error('DASH Player Error:', e);
    });
    
    console.log('DASH Player initialized with stream:', streamUrl);
  } else {
    console.warn('dash.js not available, falling back to Video.js');
    initVideoJSPlayer(elementId, streamUrl);
  }
}

/**
 * Initialize standard Video.js player
 */
function initVideoJSPlayer(elementId: string, streamUrl: string): void {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Create video element if not exists
  let video = element.querySelector('video') as HTMLVideoElement;
  if (!video) {
    video = document.createElement('video');
    video.controls = true;
    video.className = 'w-full h-full video-js';
    element.appendChild(video);
  }
  
  video.src = streamUrl;
  video.load();
}

/**
 * Cleanup video player instances and resources
 */
export function destroyVideoPlayer(elementId?: string): void {
  // If specific element ID provided, clean up that player
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      // Remove video element and its event listeners
      const videos = element.querySelectorAll('video');
      videos.forEach(video => {
        // Cleanup HLS.js instances
        if ((video as any).hlsInstance) {
          (video as any).hlsInstance.destroy();
        }
        
        video.pause();
        video.removeAttribute('src');
        video.load();
      });
    }
  } else {
    // Clean up all video elements on the page
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      // Cleanup HLS.js instances
      if ((video as any).hlsInstance) {
        (video as any).hlsInstance.destroy();
      }
      
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
  }
  
  // Clean up Video.js instances if available
  if (typeof window !== 'undefined' && (window as any).videojs) {
    try {
      const videojs = (window as any).videojs;
      const players = videojs.getPlayers();
      Object.keys(players).forEach(playerId => {
        const player = players[playerId];
        if (player && typeof player.dispose === 'function') {
          player.dispose();
        }
      });
    } catch (error) {
      console.warn('Error cleaning up Video.js players:', error);
    }
  }
}