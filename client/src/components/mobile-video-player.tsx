import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings } from 'lucide-react';
import type { Channel } from "@shared/schema";

interface MobileVideoPlayerProps {
  streamUrl: string;
  channelName: string;
  channelLogo?: string;
  onError?: (error: string) => void;
  onChannelChange?: (direction: 'prev' | 'next') => void;
}

export function MobileVideoPlayer({
  streamUrl,
  channelName,
  channelLogo,
  onError,
  onChannelChange
}: MobileVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('Auto');

  // Simple HLS setup for mobile
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (video.canPlayType('application/vnd.apple.mpegurl') && isMobile) {
      // Native HLS support
      video.src = streamUrl;
      video.load();
      setIsLoading(false);
    } else {
      // Load HLS.js with minimal configuration
      const loadHls = async () => {
        try {
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
              maxBufferLength: 15,
              maxMaxBufferLength: 30,
              startLevel: 0,
              maxStartBufferLength: 1,
            });

            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
            });

            hls.on((window as any).Hls.Events.ERROR, (event: any, data: any) => {
              if (data.fatal) {
                switch (data.type) {
                  case (window as any).Hls.ErrorTypes.MEDIA_ERROR:
                    console.log("Mobile: Media error, attempting recovery...");
                    try {
                      hls.recoverMediaError();
                    } catch (err) {
                      onError?.("Stream failed");
                    }
                    break;
                  default:
                    onError?.("Stream failed");
                    break;
                }
              }
            });

            // Store for cleanup
            (video as any).hlsInstance = hls;
          }
        } catch (error) {
          console.error('HLS setup failed:', error);
          setIsLoading(false);
          onError?.("Player failed to load");
        }
      };

      loadHls();
    }

    return () => {
      const hls = (video as any).hlsInstance;
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl, onError]);

  const handlePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(error => {
          console.error('Play failed:', error);
          onError?.("Playback failed");
        });
    }
  }, [isPlaying, onError]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
    // Auto-hide controls after 3 seconds
    setTimeout(() => setShowControls(false), 3000);
  }, []);

  return (
    <div className="mobile-video-player relative w-full h-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        onClick={toggleControls}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />

      {/* Channel Info */}
      <div className="mobile-channel-info absolute top-4 left-4 right-4 text-white z-10">
        <div className="flex items-center gap-3">
          {channelLogo && (
            <img 
              src={channelLogo} 
              alt={channelName}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
            />
          )}
          <div>
            <h3 className="font-semibold text-lg">{channelName}</h3>
            <p className="text-sm text-white/80">{currentQuality}</p>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Play/Pause button */}
      {!isPlaying && !isLoading && (
        <button
          onClick={handlePlay}
          className="mobile-play-button absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
        >
          <Play className="w-8 h-8 text-black ml-1" />
        </button>
      )}

      {/* Controls overlay */}
      {showControls && (
        <div className="mobile-video-controls absolute bottom-0 left-0 right-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handlePlay}
              className="p-2 bg-white/20 rounded-full backdrop-blur-sm"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 bg-white/20 rounded-full backdrop-blur-sm"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>

              <button className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                <Settings className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Touch areas for channel switching */}
      <div className="absolute inset-y-0 left-0 w-16 z-10" onClick={() => onChannelChange?.('prev')} />
      <div className="absolute inset-y-0 right-0 w-16 z-10" onClick={() => onChannelChange?.('next')} />
    </div>
  );
}