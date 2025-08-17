import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Play, Volume2, VolumeX, Maximize, ChevronLeft, ChevronRight, Settings, Shield } from 'lucide-react';
import ChannelListButton from './channel-list-button';
import type { Channel } from "@shared/schema";

interface DRMPlayerProps {
  streamUrl: string;
  channelName: string;
  channelLogo?: string;
  drmKeyId?: string;
  drmKey?: string;
  onError?: (error: string) => void;
  onChannelChange?: (direction: 'prev' | 'next') => void;
  allChannels?: Channel[];
  currentChannel?: Channel | null;
  onChannelSelect?: (channel: Channel) => void;
}

export function DRMPlayer({ 
  streamUrl, 
  channelName, 
  channelLogo, 
  drmKeyId, 
  drmKey, 
  onError, 
  onChannelChange, 
  allChannels = [], 
  currentChannel, 
  onChannelSelect 
}: DRMPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canPlay, setCanPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [dashPlayer, setDashPlayer] = useState<any>(null);

  // Initialize DRM DASH player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);
    setError(null);
    setCanPlay(false);

    if (drmKeyId && drmKey) {
      console.log("DRM Player: Loading encrypted stream", streamUrl);
      console.log("DRM Keys:", { keyId: drmKeyId, key: drmKey });
    } else {
      console.log("DASH Player: Loading non-encrypted stream", streamUrl);
    }

    // Check if dash.js is available
    const initializeDashPlayer = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if dash.js is already available
        if ((window as any).dashjs) {
          resolve();
          return;
        }

        // If not available, wait a bit and check again (it may still be loading)
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          if ((window as any).dashjs) {
            clearInterval(checkInterval);
            resolve();
          } else if (attempts > 10) { // Wait max 5 seconds
            clearInterval(checkInterval);
            reject(new Error('dash.js library not available'));
          }
        }, 500);
      });
    };

    initializeDashPlayer().then(() => {
      const dashjs = (window as any).dashjs;
      if (!dashjs) {
        throw new Error('dash.js not available');
      }

      // Create DASH player
      const player = dashjs.MediaPlayer().create();
      setDashPlayer(player);

      // Configure DRM protection only if keys are provided
      if (drmKeyId && drmKey) {
        const protectionData = {
          'org.w3.clearkey': {
            'clearkeys': {
              [drmKeyId]: drmKey
            },
            'priority': 0,
            'serverURL': ''
          }
        };
        
        player.setProtectionData(protectionData);
        console.log('DRM Configuration applied:', { keyId: drmKeyId, key: drmKey });
        
        // Enable DRM debugging
        player.getDebug().setLogToBrowserConsole(true);
      } else {
        console.log('Playing non-DRM DASH content');
      }

      // Set up event listeners
      player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        console.log('DRM Stream initialized successfully');
        setIsLoading(false);
        setCanPlay(true);
      });

      player.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, () => {
        setIsPlaying(true);
        setShowPlayButton(false);
      });

      player.on(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, () => {
        setIsPlaying(false);
        setShowPlayButton(true);
      });

      player.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, () => {
        console.log('DASH Manifest loaded successfully');
        setError(null);
      });

      player.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
        console.error('DASH Player Error:', e);
        let errorMsg = `${streamUrl} is not available`;
        
        if (e.error?.code === 'MANIFEST_LOAD_ERROR') {
          errorMsg = 'Stream manifest not accessible';
        } else if (e.error?.code === 'DOWNLOAD_ERROR') {
          errorMsg = 'Network connection error';
        } else if (e.error?.code && e.error.code.includes('DRM') || e.error?.code && e.error.code.includes('KEY')) {
          errorMsg = 'DRM decryption failed - invalid keys';
        }
        
        setError(errorMsg);
        setIsLoading(false);
        if (onError) onError(errorMsg);
      });

      // Handle DRM-specific events
      player.on(dashjs.MediaPlayer.events.KEY_SYSTEM_ACCESS_COMPLETE, () => {
        console.log('DRM Key System Access Complete');
      });

      player.on(dashjs.MediaPlayer.events.KEY_SESSION_CREATED, () => {
        console.log('DRM Key Session Created');
      });

      player.on(dashjs.MediaPlayer.events.LICENSE_REQUEST_COMPLETE, () => {
        console.log('DRM License Request Complete');
        setIsLoading(false);
        setCanPlay(true);
      });

      // Handle manifest load errors specifically
      player.on('manifestLoadError', () => {
        console.error('Failed to load DASH manifest');
        setError(`Stream manifest not accessible`);
        setIsLoading(false);
      });

      // Initialize player
      player.initialize(video, streamUrl, true); // Enable autoplay for DRM content

      // Set additional video properties for DRM content
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');

    }).catch((err) => {
      console.error('Failed to initialize DRM player:', err);
      setError('Failed to load DRM player. Please refresh and try again.');
      setIsLoading(false);
      if (onError) onError(err.message);
    });

    // Cleanup
    return () => {
      if (dashPlayer) {
        dashPlayer.reset();
      }
    };
  }, [streamUrl, drmKeyId, drmKey, onError]);

  // Handle play/pause
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video || !canPlay) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch((err) => {
        console.error('Play failed:', err);
        setError('Failed to start playback');
      });
    }
  };

  // Handle volume control
  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    setVolume(newVolume);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    const newMuted = !isMuted;
    setIsMuted(newMuted);
    video.muted = newMuted;
  };

  // Handle fullscreen
  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isFullscreen) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      className="relative w-full h-full bg-black rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Channel Info Overlay */}
      <div className="absolute top-4 left-4 z-30 flex items-center space-x-3">
        {channelLogo && (
          <img 
            src={channelLogo} 
            alt={channelName}
            className="w-12 h-12 object-contain bg-white rounded-lg p-1"
          />
        )}
        <div>
          <h3 className="text-white text-lg font-bold">{channelName}</h3>
          <div className="flex items-center space-x-2">
            {drmKeyId && drmKey ? (
              <>
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm">DRM Protected</span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">D</span>
                </div>
                <span className="text-blue-400 text-sm">DASH Stream</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Channel List Button */}
      <div className="absolute top-4 right-4 z-30">
        <ChannelListButton 
          allChannels={allChannels}
          currentChannel={currentChannel}
          onChannelSelect={onChannelSelect}
        />
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onClick={handlePlayPause}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">
              {drmKeyId && drmKey ? 'Loading encrypted content...' : 'Loading DASH stream...'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {drmKeyId && drmKey ? 'DRM decryption in progress' : 'Initializing video player'}
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20">
          <div className="text-center max-w-md p-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">DRM Playback Error</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <div className="text-sm text-gray-400">
              <p>Possible causes:</p>
              <ul className="mt-2 space-y-1 text-left">
                <li>• Invalid DRM keys</li>
                <li>• Browser DRM support disabled</li>
                <li>• Content geo-restricted</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Play Button Overlay */}
      {showPlayButton && canPlay && !error && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 cursor-pointer z-10"
          onClick={handlePlayPause}
        >
          <div className="bg-blue-600 hover:bg-blue-700 transition-colors rounded-full p-6">
            <Play className="w-12 h-12 text-white fill-current" />
          </div>
        </div>
      )}

      {/* Controls */}
      {canPlay && !error && (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center space-x-4">
              {/* Channel Navigation */}
              {onChannelChange && (
                <>
                  <button
                    onClick={() => onChannelChange('prev')}
                    className="text-white hover:text-blue-400 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => onChannelChange('next')}
                    className="text-white hover:text-blue-400 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="text-white hover:text-blue-400 transition-colors"
              >
                <Play className={`w-6 h-6 ${isPlaying ? 'opacity-50' : ''}`} />
              </button>

              {/* Volume Control */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleMuteToggle}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-4">
              {/* Stream Type Indicator */}
              {drmKeyId && drmKey ? (
                <div className="flex items-center space-x-1 text-green-400">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs">ENCRYPTED</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-blue-400">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-xs">DASH</span>
                </div>
              )}

              {/* Fullscreen */}
              <button
                onClick={handleFullscreen}
                className="text-white hover:text-blue-400 transition-colors"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DRMPlayer;