import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Play, Volume1, Volume2, VolumeX, Maximize, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import ChannelListButton from './channel-list-button';
import type { Channel } from "@shared/schema";

interface ShakaDrmPlayerProps {
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

declare global {
  interface Window {
    shaka: any;
  }
}

// Simple M3U8 primer URL for browser autoplay initialization
const PRIMER_M3U8_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export function ShakaDrmPlayer({ 
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
}: ShakaDrmPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canPlay, setCanPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [primerCompleted, setPrimerCompleted] = useState(false);
  const primerVideoRef = useRef<HTMLVideoElement>(null);

  // Primer effect - run M3U8 initialization first
  useEffect(() => {
    if (primerCompleted) return;
    
    const runPrimer = async () => {
      try {
        console.log('DRM: Starting M3U8 primer to initialize browser autoplay...');
        const primerVideo = primerVideoRef.current;
        if (!primerVideo) return;
        
        // Load a simple M3U8 stream silently
        primerVideo.src = PRIMER_M3U8_URL;
        primerVideo.muted = true;
        primerVideo.volume = 0;
        primerVideo.currentTime = 0;
        
        // Try to play primer video silently
        try {
          await primerVideo.play();
          console.log('DRM: Primer M3U8 played successfully');
          
          // Stop primer after 1 second
          setTimeout(() => {
            primerVideo.pause();
            primerVideo.src = '';
            setPrimerCompleted(true);
            console.log('DRM: Primer completed, browser autoplay initialized');
          }, 1000);
          
        } catch (primerError) {
          console.log('DRM: Primer failed, proceeding without primer:', primerError);
          setPrimerCompleted(true);
        }
        
      } catch (error) {
        console.log('DRM: Primer setup failed, proceeding without primer:', error);
        setPrimerCompleted(true);
      }
    };
    
    runPrimer();
  }, [primerCompleted]);

  // Main DRM player initialization - only after primer completes
  useEffect(() => {
    if (!videoRef.current || !streamUrl || !primerCompleted) return;
    
    const initPlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setRetryCount(0); // Reset retry count

        // Wait for Shaka Player to be available with timeout
        const shakaTimeout = setTimeout(() => {
          setError('DRM player failed to load. Please refresh the page.');
          setIsLoading(false);
        }, 10000);

        if (!window.shaka) {
          await new Promise((resolve, reject) => {
            const checkShaka = () => {
              if (window.shaka) {
                clearTimeout(shakaTimeout);
                resolve(true);
              } else {
                setTimeout(checkShaka, 100);
              }
            };
            checkShaka();
          });
        } else {
          clearTimeout(shakaTimeout);
        }

        // Install polyfills
        window.shaka.polyfill.installAll();

        // Check browser support
        if (!window.shaka.Player.isBrowserSupported()) {
          console.error('Browser not supported!');
          setError('Browser not supported for DRM playback');
          setIsLoading(false);
          return;
        }

        const video = videoRef.current!;
        const player = new window.shaka.Player(video);
        playerRef.current = player;

        // Configure DRM if keys are provided
        if (drmKeyId && drmKey) {
          player.configure({
            drm: {
              clearKeys: {
                [drmKeyId]: drmKey
              }
            }
          });
          console.log('Shaka DRM configured:', { keyId: drmKeyId });
        }

        // Set up event listeners with improved auto-retry
        player.addEventListener('error', (event: any) => {
          console.error('Shaka Player Error:', event.detail);
          const errorCode = event.detail.code;
          
          // Auto-retry for network/recoverable errors with more attempts
          if (retryCount < 3 && (
            errorCode === window.shaka.util.Error.Code.HTTP_ERROR ||
            errorCode === window.shaka.util.Error.Code.TIMEOUT ||
            (errorCode >= 6000 && errorCode < 6010) // Some DRM errors
          )) {
            console.log(`Auto-retrying DRM stream (attempt ${retryCount + 1}/4)`);
            setRetryCount(prev => prev + 1);
            setTimeout(() => {
              if (videoRef.current && streamUrl) {
                initPlayer();
              }
            }, 1000 * (retryCount + 1)); // Progressive delay
            return;
          }
          
          let errorMsg = 'DRM stream temporarily unavailable. Please try again.';
          if (errorCode === window.shaka.util.Error.Code.HTTP_ERROR) {
            errorMsg = 'Network connection issue - please check your internet';
          } else if (errorCode === window.shaka.util.Error.Code.MANIFEST_INVALID) {
            errorMsg = 'Invalid stream format';
          } else if (errorCode >= 6000 && errorCode < 7000) {
            errorMsg = 'DRM authentication failed';
          }
          
          setError(errorMsg);
          setIsLoading(false);
          if (onError) onError(errorMsg);
        });

        // Video element event listeners
        video.addEventListener('loadstart', () => {
          console.log('Shaka: Load started');
          setIsLoading(true);
        });

        video.addEventListener('canplay', () => {
          console.log('DRM: Video element can play');
        });

        video.addEventListener('loadeddata', () => {
          console.log('DRM: Video data loaded');
          // Don't set ready state here - wait for Shaka to finish loading
        });

        video.addEventListener('play', () => {
          setIsPlaying(true);
          setShowPlayButton(false);
        });

        video.addEventListener('pause', () => {
          setIsPlaying(false);
          setShowPlayButton(true);
        });

        video.addEventListener('waiting', () => {
          setIsLoading(true);
        });

        video.addEventListener('playing', () => {
          setIsLoading(false);
        });

        // Load the manifest
        console.log('DRM: Loading stream...', streamUrl);
        await player.load(streamUrl);
        console.log('DRM: Shaka player loaded manifest');
        
        // Wait for video element to be fully ready
        const waitForVideoReady = () => {
          return new Promise<void>((resolve) => {
            const checkReady = () => {
              if (video.readyState >= 3) { // HAVE_FUTURE_DATA
                console.log('DRM: Video element ready for playback');
                resolve();
              } else {
                console.log('DRM: Waiting for video ready state:', video.readyState);
                setTimeout(checkReady, 100);
              }
            };
            checkReady();
          });
        };
        
        await waitForVideoReady();
        
        // Both Shaka and video are ready
        setIsLoading(false);
        setCanPlay(true);
        setShowPlayButton(true);
        setError(null);

      } catch (error: any) {
        console.error('Failed to initialize Shaka Player:', error);
        const errorMessage = error.message || 'Unknown DRM error';
        
        // Auto-retry up to 3 times for certain errors
        if (retryCount < 3 && (
          errorMessage.includes('network') || 
          errorMessage.includes('timeout') ||
          errorMessage.includes('license')
        )) {
          console.log(`Retrying DRM player initialization (attempt ${retryCount + 1}/3)`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            if (videoRef.current && streamUrl) {
              initPlayer();
            }
          }, 1000 * (retryCount + 1)); // Progressive delay
          return;
        }
        
        setError('DRM stream temporarily unavailable. Please try again.');
        setIsLoading(false);
        if (onError) onError(errorMessage);
      }
    };

    initPlayer();

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [streamUrl, drmKeyId, drmKey, onError, primerCompleted]);

  const handlePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
      } else {
        // Clear any error state when user clicks play
        setError(null);
        setIsLoading(true);
        
        // Ensure the player is ready and try to play
        if (playerRef.current && canPlay) {
          await video.play();
          setShowPlayButton(false);
          setIsLoading(false);
        } else {
          // If player isn't ready, try to reinitialize
          console.log('Player not ready, reinitializing...');
          setRetryCount(0); // Reset retry count for manual play
        }
      }
    } catch (error) {
      console.error('Play/pause error:', error);
      setError('Playback failed. Please try again.');
      setIsLoading(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showVolumeControl && !target.closest('.volume-control-container')) {
        setShowVolumeControl(false);
      }
      if (showSettings && !target.closest('.settings-container')) {
        setShowSettings(false);
      }

    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVolumeControl, showSettings]);

  const handlePlayClick = async () => {
    const video = videoRef.current;
    if (!video || !playerRef.current) {
      setError('Player not ready. Please wait or refresh.');
      return;
    }

    try {
      setError(null);
      console.log('DRM Play clicked - starting playback');
      
      // Force unmute and play immediately
      video.muted = false;
      video.volume = 1;
      
      const playPromise = video.play();
      await playPromise;
      
      console.log('DRM Play successful');
      setShowPlayButton(false);
      setIsPlaying(true);
      
    } catch (error: any) {
      console.error("DRM Play failed:", error);
      
      // If play fails, it might be a browser restriction
      if (error.name === 'NotAllowedError') {
        setError('Click the play button to start playback');
      } else {
        setError('Playback failed. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if ((video as any).webkitRequestFullscreen) {
        (video as any).webkitRequestFullscreen();
      } else if ((video as any).mozRequestFullScreen) {
        (video as any).mozRequestFullScreen();
      } else if ((video as any).msRequestFullscreen) {
        (video as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleChannelChange = (direction: 'prev' | 'next') => {
    console.log(`Channel change requested: ${direction}`);
    onChannelChange?.(direction);
  };

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls]);

  // Fullscreen event listeners for all browsers
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  if (error) {
    return (
      <div className="video-player-container bg-black">
        <div className="video-player-wrapper flex items-center justify-center">
          <div className="text-center max-w-md mx-4">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-semibold mb-2 text-white">DRM Stream Error</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => {
                // Simple retry - just reload the page
                window.location.reload();
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
            >
              Retry Stream
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player-container">
      <div className="video-player-wrapper">
        {/* Hidden primer video for browser autoplay initialization */}
        <video
          ref={primerVideoRef}
          style={{ display: 'none' }}
          muted
          playsInline
          preload="none"
        />
        
        <video
          ref={videoRef}
          className="hls-player"
          playsInline
          preload="metadata"
          controls={false}
          disablePictureInPicture
        >
          Your browser does not support DRM playback.
        </video>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white">
                {!primerCompleted ? 'Initializing Player...' : `Loading ${channelName}...`}
              </p>
            </div>
          </div>
        )}

        {/* Fullscreen Exit Button - Only show in fullscreen */}
        {isFullscreen && (
          <div className="absolute top-4 right-4 z-40">
            <button
              onClick={() => {
                if (document.exitFullscreen) {
                  document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                  (document as any).webkitExitFullscreen();
                } else if ((document as any).mozCancelFullScreen) {
                  (document as any).mozCancelFullScreen();
                } else if ((document as any).msExitFullscreen) {
                  (document as any).msExitFullscreen();
                }
              }}
              className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full transition-all shadow-xl border border-white/20"
              title="Exit Fullscreen"
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          </div>
        )}

        {/* Play Button Overlay */}
        {showPlayButton && !isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
            <button
              onClick={handlePlayClick}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-full transition-all shadow-xl border-2 border-white/20 transform hover:scale-110"
              title="Play Stream"
            >
              <Play className="w-10 h-10" />
            </button>
          </div>
        )}
      </div>

      {/* Channel Info and Controls in Single Compact Line */}
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex items-center justify-between">
          {/* Left: Channel Info */}
          <div className="flex items-center space-x-3">
            {channelLogo && (
              <img 
                src={channelLogo} 
                alt={`${channelName} logo`}
                className="w-10 h-10 object-cover rounded-full border-2 border-pink-500"
              />
            )}
            <div>
              <h4 className="font-semibold text-white">{channelName}</h4>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-red-500">LIVE</span>
                <span>•</span>
                <span>Bengali Movies</span>
                <span>•</span>
                <span>HD Quality</span>
              </div>
            </div>
          </div>

          {/* Right: All Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleChannelChange('prev')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg p-2 transition-all shadow-lg"
              title="Previous Channel"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => handleChannelChange('next')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg p-2 transition-all shadow-lg"
              title="Next Channel"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
            
            {/* Volume Control with Dropdown */}
            <div className="relative group volume-control-container">
              <button
                onClick={() => setShowVolumeControl(!showVolumeControl)}
                className="bg-gray-800 hover:bg-gray-700 rounded-lg p-2 transition-all relative overflow-hidden"
                title={`Volume: ${Math.round(volume * 100)}%`}
              >
                {/* Volume Level Indicator Background */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-30 transition-all duration-200"
                  style={{ width: `${volume * 100}%` }}
                />
                
                {/* Volume Icon */}
                <div className="relative z-10">
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-white" />
                  ) : volume < 0.3 ? (
                    <Volume1 className="w-4 h-4 text-white" />
                  ) : volume < 0.7 ? (
                    <Volume2 className="w-4 h-4 text-white" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white" />
                  )}
                </div>
              </button>
              
              {/* Volume Control Panel */}
              {showVolumeControl && (
                <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-lg p-3 shadow-lg border border-gray-600 z-20">
                  <div className="flex flex-col items-center space-y-3">
                    {/* Volume Slider with Visual Feedback */}
                    <div className="relative w-20">
                      <div className="h-2 bg-gray-600 rounded-lg">
                        <div 
                          className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg transition-all duration-200"
                          style={{ width: `${volume * 100}%` }}
                        />
                      </div>
                      {/* Volume Thumb/Dot */}
                      <div 
                        className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full transition-all duration-200 pointer-events-none"
                        style={{ left: `calc(${volume * 100}% - 6px)` }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                      />
                    </div>
                    
                    {/* Volume Percentage */}
                    <span className="text-white text-xs font-semibold bg-gray-700 px-2 py-1 rounded">
                      {Math.round(volume * 100)}%
                    </span>
                    
                    {/* Mute/Unmute Button */}
                    <button
                      onClick={toggleMute}
                      className="bg-red-600 hover:bg-red-700 rounded px-3 py-1 text-xs text-white transition-all"
                    >
                      {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            


            {/* Settings Control with Dropdown */}
            <div className="relative settings-container">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2 transition-all border border-gray-600 relative"
                title="Settings"
              >
                <Settings className="w-4 h-4 text-white" />
                {/* Active indicator */}
                {showSettings && (
                  <div className="absolute inset-0 bg-blue-500 opacity-20 rounded-lg"></div>
                )}
              </button>

              {/* Settings Panel - Above Button */}
              {showSettings && (
                <div className="absolute -top-28 right-0 bg-gray-800 rounded-lg p-2 shadow-lg border border-gray-600 z-20 w-48">
                  <div className="space-y-2">
                    <h3 className="text-white text-xs font-semibold text-center">DRM Settings</h3>
                    
                    <div className="space-y-1.5">
                      <div>
                        <select
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="auto">Auto Quality</option>
                          <option value="1080p">1080p HD</option>
                          <option value="720p">720p HD</option>
                          <option value="480p">480p</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="pt-1.5 border-t border-gray-700">
                      <div className="text-xs text-center">
                        <span className="text-gray-400">HD Quality • Bengali Audio</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 rounded-lg p-2 transition-all shadow-lg"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}