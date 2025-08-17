import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, AlertCircle } from 'lucide-react';
import type { Channel } from "@shared/schema";

interface EnhancedVideoPlayerProps {
  streamUrl: string;
  channelName: string;
  channelLogo?: string;
  onError?: (error: string) => void;
  onChannelChange?: (direction: 'prev' | 'next') => void;
}

export function EnhancedVideoPlayer({
  streamUrl,
  channelName,
  channelLogo,
  onError,
  onChannelChange
}: EnhancedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const resetPlayer = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      const hls = (video as any).hlsInstance;
      if (hls) {
        hls.destroy();
        (video as any).hlsInstance = null;
      }
      video.src = '';
      video.load();
    }
    setIsPlaying(false);
    setIsLoading(true);
    setError(null);
  }, []);

  const initializePlayer = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    resetPlayer();
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    try {
      // For Safari/iOS with native HLS support
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.load();
        setIsLoading(false);
        return;
      }

      // Load HLS.js for other browsers
      if (!(window as any).Hls) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.10/dist/hls.min.js';
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if ((window as any).Hls?.isSupported()) {
        const hls = new (window as any).Hls({
          enableWorker: false,
          lowLatencyMode: false,
          maxBufferLength: isMobile ? 8 : 15,
          maxMaxBufferLength: isMobile ? 15 : 30,
          backBufferLength: 5,
          startLevel: isMobile ? 0 : -1,
          maxStartBufferLength: 1,
          manifestLoadingTimeOut: 10000,
          levelLoadingTimeOut: 10000,
          fragLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 3,
          fragLoadingMaxRetry: 3,
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        (video as any).hlsInstance = hls;

        hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          setError(null);
          setRetryCount(0);
        });

        hls.on((window as any).Hls.Events.ERROR, (event: any, data: any) => {
          console.error('HLS Error:', data);
          
          if (data.fatal) {
            switch (data.type) {
              case (window as any).Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Attempting media error recovery...');
                try {
                  hls.recoverMediaError();
                  return; // Don't trigger full error handling yet
                } catch (err) {
                  console.error('Media recovery failed:', err);
                }
                break;
              
              case (window as any).Hls.ErrorTypes.NETWORK_ERROR:
                if (retryCount < maxRetries) {
                  console.log(`Network error, retrying... (${retryCount + 1}/${maxRetries})`);
                  setRetryCount(prev => prev + 1);
                  setTimeout(() => {
                    hls.startLoad();
                  }, 2000);
                  return;
                }
                break;
            }

            // If we get here, all recovery attempts failed
            setError(`Stream error: ${data.details}`);
            setIsLoading(false);
            
            // Auto-switch to next channel after showing error
            setTimeout(() => {
              onError?.(data.details || 'Playback failed');
            }, 3000);
          }
        });
      } else {
        throw new Error('HLS not supported');
      }
    } catch (err) {
      console.error('Player initialization failed:', err);
      setError('Player failed to initialize');
      setIsLoading(false);
      
      setTimeout(() => {
        onError?.('Player initialization failed');
      }, 2000);
    }
  }, [streamUrl, onError, retryCount, resetPlayer]);

  useEffect(() => {
    initializePlayer();
    
    return () => {
      const video = videoRef.current;
      if (video) {
        const hls = (video as any).hlsInstance;
        if (hls) {
          hls.destroy();
        }
      }
    };
  }, [initializePlayer]);

  const handlePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
      } else {
        await video.play();
      }
    } catch (err) {
      console.error('Play failed:', err);
      setError('Playback failed');
    }
  }, [isPlaying]);

  const handleVideoEvents = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = (e: Event) => {
      console.error('Video element error:', e);
      setError('Video playback error');
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
    };
  }, []);

  useEffect(() => {
    return handleVideoEvents();
  }, [handleVideoEvents]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={false}
        preload="metadata"
        controls={false}
      />

      {/* Channel Info */}
      <div className="absolute top-4 left-4 right-4 text-white z-10">
        <div className="flex items-center gap-3">
          {channelLogo && (
            <img 
              src={channelLogo} 
              alt={channelName}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
            />
          )}
          <div>
            <h3 className="font-semibold text-xl">{channelName}</h3>
            <p className="text-sm text-white/80">Live Stream</p>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4 mx-auto"></div>
            <p className="text-lg">Loading {channelName}...</p>
            {retryCount > 0 && (
              <p className="text-sm text-white/70 mt-2">Retry {retryCount}/{maxRetries}</p>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center text-white max-w-md p-6">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Stream Error</h3>
            <p className="text-white/80 mb-4">{error}</p>
            <p className="text-sm text-white/60">Switching to next channel...</p>
          </div>
        </div>
      )}

      {/* Play Button */}
      {!isPlaying && !isLoading && !error && (
        <button
          onClick={handlePlay}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20
                     w-20 h-20 bg-white/90 hover:bg-white rounded-full
                     flex items-center justify-center transition-all duration-200
                     hover:scale-105 active:scale-95"
        >
          <Play className="w-8 h-8 text-black ml-1" />
        </button>
      )}

      {/* Touch Areas for Channel Switching */}
      <div 
        className="absolute inset-y-0 left-0 w-20 z-10 cursor-pointer" 
        onClick={() => onChannelChange?.('prev')}
        aria-label="Previous channel"
      />
      <div 
        className="absolute inset-y-0 right-0 w-20 z-10 cursor-pointer" 
        onClick={() => onChannelChange?.('next')}
        aria-label="Next channel"
      />
    </div>
  );
}