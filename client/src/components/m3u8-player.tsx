import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Play, Volume1, Volume2, VolumeX, Maximize, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import ChannelListButton from './channel-list-button';
import type { Channel } from "@shared/schema";

interface M3U8PlayerProps {
  streamUrl: string;
  channelName: string;
  channelLogo?: string;
  onError?: (error: string) => void;
  onChannelChange?: (direction: 'prev' | 'next') => void;
  audioLanguages?: string[];
  videoQualities?: string[];
  allChannels?: Channel[];
  currentChannel?: Channel | null;
  onChannelSelect?: (channel: Channel) => void;
}

export function M3U8Player({ streamUrl, channelName, channelLogo, onError, onChannelChange, audioLanguages = [], videoQualities = [], allChannels = [], currentChannel, onChannelSelect }: M3U8PlayerProps) {
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
  const [showSettings, setShowSettings] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [selectedAudio, setSelectedAudio] = useState('default');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [detectedAudioLanguages, setDetectedAudioLanguages] = useState<string[]>([]);
  const [currentResolution, setCurrentResolution] = useState<string>('HD');
  const [currentAudioLang, setCurrentAudioLang] = useState<string>('English');

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);
    setError(null);
    setCanPlay(false);

    console.log("M3U8 Player: Loading stream", streamUrl);

    // Enhanced mobile device detection
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    console.log("Device detection:", { isMobile, isIOS, isAndroid, userAgent: navigator.userAgent });

    // Mobile-specific video configuration
    video.playsInline = true;
    video.muted = false; // Allow unmuted playback on mobile
    video.preload = 'metadata';
    
    // Enhanced mobile browser support with better fallbacks
    if (isIOS || video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log("Using native HLS support (iOS/Safari)");
      video.src = streamUrl;
      video.load();
      
      // iOS-specific autoplay attempt
      if (isIOS) {
        setTimeout(() => {
          video.play().catch(error => {
            console.log("iOS autoplay failed, showing play button:", error);
            setShowPlayButton(true);
          });
        }, 1000);
      }
      
      // iOS specific optimizations
      if (isIOS) {
        video.playsInline = true;
        video.muted = false; // Don't auto-mute on iOS
        video.preload = 'metadata';
      }
    } else {
      console.log("Using HLS.js with enhanced mobile optimizations");
      
      // Load HLS.js dynamically for mobile compatibility
      const loadHlsAndPlay = async () => {
        try {
          // Load HLS.js if not already loaded
          if (!(window as any).Hls) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.10/dist/hls.min.js';
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }
          
          if ((window as any).Hls && (window as any).Hls.isSupported()) {
            console.log("HLS.js loaded successfully, creating player...");
            const hls = new (window as any).Hls({
              enableWorker: false, // Disable for compatibility
              lowLatencyMode: false, // Disable for better performance
              backBufferLength: 10, // Smaller buffer
              maxBufferLength: isMobile ? 10 : 20,
              maxMaxBufferLength: isMobile ? 20 : 40,
              liveDurationInfinity: false,
              liveBackBufferLength: 0,
              startLevel: isMobile ? 0 : -1, // Start low quality on mobile
              manifestLoadingTimeOut: 8000,
              manifestLoadingMaxRetry: 2,
              levelLoadingTimeOut: 8000,
              fragLoadingTimeOut: 10000,
              fragLoadingMaxRetry: 2,
              maxStartBufferLength: 2, // Fast startup
            });

            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            
            // Store HLS instance for cleanup
            (video as any).hlsInstance = hls;

            hls.on((window as any).Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
              console.log("HLS: Manifest loaded", data);
              
              // Extract available qualities from actual stream levels
              if (data.levels && data.levels.length > 0) {
                const qualities = data.levels
                  .filter((level: any) => level.height && level.height > 0)
                  .map((level: any) => {
                    if (level.height >= 1080) return '1080p';
                    if (level.height >= 720) return '720p';
                    if (level.height >= 480) return '480p';
                    if (level.height >= 360) return '360p';
                    return `${level.height}p`;
                  });
                
                const uniqueQualities = [...new Set(qualities)];
                setAvailableQualities(uniqueQualities);
                console.log("Available video qualities from stream:", uniqueQualities);
                console.log("Stream levels details:", data.levels.map(l => `${l.width}x${l.height}`));
                
                // Set current resolution based on highest quality level
                const highestLevel = data.levels.reduce((prev: any, curr: any) => 
                  curr.height > prev.height ? curr : prev
                );
                
                if (highestLevel.height >= 1080) setCurrentResolution('1080p HD');
                else if (highestLevel.height >= 720) setCurrentResolution('720p HD');
                else if (highestLevel.height >= 480) setCurrentResolution('480p');
                else if (highestLevel.height >= 360) setCurrentResolution('360p');
                else setCurrentResolution(`${highestLevel.height}p`);
              }
              
              // Extract audio tracks and languages
              console.log("Audio tracks detected:", data.audioTracks);
              if (data.audioTracks && data.audioTracks.length > 0) {
                const audioLangs = data.audioTracks.map((track: any) => {
                  // Try different properties for language detection
                  const lang = track.lang || track.language || track.name || track.label;
                  if (lang) {
                    // Convert language codes to readable names
                    const langMap: { [key: string]: string } = {
                      'en': 'English',
                      'eng': 'English', 
                      'hi': 'Hindi',
                      'hin': 'Hindi',
                      'bn': 'Bengali',
                      'ben': 'Bengali',
                      'ta': 'Tamil',
                      'tam': 'Tamil',
                      'te': 'Telugu',
                      'tel': 'Telugu',
                      'ml': 'Malayalam',
                      'mal': 'Malayalam',
                      'kn': 'Kannada',
                      'kan': 'Kannada',
                      'gu': 'Gujarati',
                      'guj': 'Gujarati',
                      'pa': 'Punjabi',
                      'pan': 'Punjabi',
                      'mr': 'Marathi',
                      'mar': 'Marathi',
                      'or': 'Odia',
                      'ori': 'Odia',
                      'as': 'Assamese',
                      'asm': 'Assamese'
                    };
                    return langMap[lang.toLowerCase()] || lang;
                  }
                  return 'Audio Track ' + (track.id + 1);
                });
                
                const uniqueLangs = [...new Set(audioLangs)];
                setDetectedAudioLanguages(uniqueLangs);
                setCurrentAudioLang(uniqueLangs[0] || 'English');
                console.log("Detected audio languages:", uniqueLangs);
              } else {
                // Check if there are alternative audio streams in levels
                const audioStreams = data.levels.filter((level: any) => 
                  level.audioCodec && level.audioCodec !== 'undefined'
                );
                
                if (audioStreams.length > 0) {
                  // Extract language from URL or attributes if available
                  const streamLangs = audioStreams.map((stream: any, index: number) => {
                    const url = Array.isArray(stream.url) ? stream.url[0] : stream.url;
                    if (url && url.includes('eng')) return 'English';
                    if (url && url.includes('hin')) return 'Hindi';
                    return `Audio ${index + 1}`;
                  });
                  
                  const uniqueStreamLangs = [...new Set(streamLangs)];
                  setDetectedAudioLanguages(uniqueStreamLangs);
                  setCurrentAudioLang(uniqueStreamLangs[0] || 'English');
                  console.log("Audio languages from streams:", uniqueStreamLangs);
                } else {
                  // Default fallback
                  setCurrentAudioLang('English');
                  console.log("No audio tracks detected, using default");
                }
              }
        
              setIsLoading(false);
              setCanPlay(true);
              
              // Mobile-specific autoplay handling
              if (isMobile) {
                console.log("Mobile device detected - showing play button");
                setShowPlayButton(true);
              } else {
                // Desktop autoplay attempt
                video.play().catch(() => {
                  console.log("Autoplay failed, showing play button");
                  setShowPlayButton(true);
                });
              }
            });

            hls.on((window as any).Hls.Events.ERROR, (event: any, data: any) => {
              console.error("HLS Error:", data);
              if (data.fatal) {
                switch (data.type) {
                  case (window as any).Hls.ErrorTypes.MEDIA_ERROR:
                    console.log("Media error, attempting recovery...");
                    try {
                      hls.recoverMediaError();
                    } catch (err) {
                      console.error("Recovery failed:", err);
                      setError("Stream failed - Switching to next channel...");
                      setTimeout(() => onError?.(data.details || "Stream playback failed"), 1000);
                    }
                    break;
                  case (window as any).Hls.ErrorTypes.NETWORK_ERROR:
                    console.error("Network error:", data.details);
                    setError("Network error - Switching to next channel...");
                    setTimeout(() => onError?.(data.details || "Network error"), 1000);
                    break;
                  default:
                    console.error("Fatal HLS error:", data.details);
                    setError("Stream failed - Switching to next channel...");
                    setTimeout(() => onError?.(data.details || "Stream playback failed"), 1000);
                    break;
                }
              } else {
                // Non-fatal errors - try to continue
                console.warn("Non-fatal HLS error:", data.details);
              }
            });
            
            // Mobile-specific event handling
            if (isMobile) {
              hls.on((window as any).Hls.Events.FRAG_BUFFERED, () => {
                // Fragment buffered successfully on mobile
                if (!canPlay) {
                  setCanPlay(true);
                  setIsLoading(false);
                }
              });
            }
            
          } else {
            throw new Error("HLS.js not supported");
          }
        } catch (error) {
          console.error("Failed to load HLS.js:", error);
          // Fallback to direct video source for mobile
          if (isMobile) {
            console.log("HLS.js failed, trying direct video source for mobile");
            video.src = streamUrl;
            video.load();
            setShowPlayButton(true);
          } else {
            setError("Video streaming not supported in this browser");
            setIsLoading(false);
          }
        }
      };
      
      loadHlsAndPlay();
    }

    // Enhanced mobile video element setup
    video.playsInline = true;
    video.preload = isMobile ? 'metadata' : 'auto';
    video.crossOrigin = 'anonymous';
    
    // Mobile-specific video attributes
    if (isMobile) {
      video.muted = false; // Allow audio on mobile
      video.controls = false; // We handle controls
      video.style.width = '100%';
      video.style.height = '100%';
    }

    // Video event listeners with enhanced mobile handling
    const handleLoadStart = () => {
      console.log("Video: Load started");
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      console.log("Video: Can play");
      setIsLoading(false);
      setCanPlay(true);
      
      // Attempt immediate playback on mobile after can play
      if (isMobile && video.paused) {
        console.log("Mobile: Attempting to play after canplay");
        video.play().catch(error => {
          console.log("Mobile autoplay failed, showing play button:", error);
          setShowPlayButton(true);
        });
      }
    };

    const handleError = (e: any) => {
      console.error("Video: Playback error", e);
      setIsLoading(false);
      setError("Video playback failed - Please check your connection");
      onError?.("Video playback failed");
    };

    const handleLoadedData = () => {
      console.log("Video: Data loaded");
      setIsLoading(false);
      
      // Additional mobile play attempt after data loaded
      if (isMobile && video.paused) {
        setTimeout(() => {
          video.play().catch(() => {
            setShowPlayButton(true);
          });
        }, 500);
      }
    };

    const handlePlayEvent = () => {
      console.log("Video: Play event");
      setIsPlaying(true);
      setShowPlayButton(false);
    };

    const handlePauseEvent = () => {
      console.log("Video: Pause event");
      setIsPlaying(false);
      setShowPlayButton(true);
    };

    const handleEndedEvent = () => {
      setIsPlaying(false);
      setShowPlayButton(true);
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlayEvent);
    video.addEventListener('pause', handlePauseEvent);
    video.addEventListener('ended', handleEndedEvent);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlayEvent);
      video.removeEventListener('pause', handlePauseEvent);
      video.removeEventListener('ended', handleEndedEvent);
    };
  }, [streamUrl, onError]);

  const handlePlayClick = () => {
    console.log("Play button clicked");
    const video = videoRef.current;
    if (!video) return;

    // Enhanced mobile play handling
    video.muted = false; // Ensure audio is enabled for mobile
    video.playsInline = true;
    
    if (canPlay || video.readyState >= 2) {
      video.play().then(() => {
        console.log("Video playback started successfully");
        setShowPlayButton(false);
        setIsPlaying(true);
      }).catch(err => {
        console.error("Play failed:", err);
        // Try with muted first for mobile autoplay policies
        video.muted = true;
        video.play().then(() => {
          console.log("Video started muted for mobile");
          setShowPlayButton(false);
          setIsPlaying(true);
          // Show unmute button or controls
        }).catch(mutedErr => {
          console.error("Even muted play failed:", mutedErr);
          setError("Unable to start video playback");
        });
      });
    } else {
      console.log("Video not ready, loading...");
      video.load();
      setShowPlayButton(true);
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
      // Try different fullscreen APIs for browser compatibility
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

    // Add event listeners for different browsers
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
            <h3 className="text-xl font-semibold mb-2 text-white">Stream Error</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player-container">
      <div className="video-player-wrapper">
        <video
          ref={videoRef}
          className="hls-player"
          playsInline
          preload="metadata"
          controls={false}
          disablePictureInPicture
        >
          Your browser does not support the video tag.
        </video>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white">Loading {channelName}...</p>
            </div>
          </div>
        )}

        {/* Mobile Play Button Overlay */}
        {showPlayButton && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 cursor-pointer" onClick={handlePlayClick}>
            <div className="text-center">
              <button
                onClick={handlePlayClick}
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white p-6 rounded-full transition-all shadow-2xl transform hover:scale-105 border-4 border-white/20"
                title="Play Video"
              >
                <Play className="w-12 h-12 text-white fill-current" />
              </button>
              <p className="text-white mt-4 text-lg font-semibold">Tap to Play</p>
              <p className="text-gray-300 text-sm">Mobile users may need to start playback manually</p>
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



      </div>

      {/* Channel Info and Controls in Single Compact Line */}
      <div className="bg-gray-900 border-t border-gray-800 p-2 md:p-4">
        <div className="flex items-center justify-between">
          {/* Left: Channel Info - Mobile Optimized */}
          <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0 overflow-hidden">
            {channelLogo && (
              <img 
                src={channelLogo} 
                alt={`${channelName} logo`}
                className="w-8 h-8 md:w-10 md:h-10 object-cover rounded-full border-2 border-pink-500 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h4 className="font-semibold text-white text-sm md:text-base truncate">{channelName}</h4>
              <div className="flex items-center space-x-1 md:space-x-2 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                <span className="font-medium text-red-500">LIVE</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline truncate">Music Channel</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline">{currentResolution}</span>
                <span className="hidden lg:inline">•</span>
                <span className="hidden lg:inline">{currentAudioLang}</span>
              </div>
            </div>
          </div>

          {/* Right: All Controls - Mobile Responsive */}
          <div className="flex items-center space-x-1 md:space-x-3 flex-shrink-0">
            <button
              onClick={() => handleChannelChange('prev')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg p-1.5 md:p-2 transition-all shadow-lg"
              title="Previous Channel"
            >
              <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </button>
            <button
              onClick={() => handleChannelChange('next')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg p-1.5 md:p-2 transition-all shadow-lg"
              title="Next Channel"
            >
              <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </button>
            
            {/* Volume Control with Dropdown - Hidden on small mobile */}
            <div className="relative group volume-control-container hidden sm:block">
              <button
                onClick={() => setShowVolumeControl(!showVolumeControl)}
                className="bg-gray-800 hover:bg-gray-700 rounded-lg p-1.5 md:p-2 transition-all relative overflow-hidden"
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
                    <VolumeX className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  ) : volume < 0.3 ? (
                    <Volume1 className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  ) : volume < 0.7 ? (
                    <Volume2 className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  ) : (
                    <Volume2 className="w-3 h-3 md:w-4 md:h-4 text-white" />
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
            
            {/* Settings Control with Dropdown - Hidden on small mobile */}
            <div className="relative settings-container hidden sm:block">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="bg-gray-700 hover:bg-gray-600 rounded-lg p-1.5 md:p-2 transition-all border border-gray-600 relative"
                title="Settings"
              >
                <Settings className="w-3 h-3 md:w-4 md:h-4 text-white" />
                {/* Active indicator */}
                {showSettings && (
                  <div className="absolute inset-0 bg-blue-500 opacity-20 rounded-lg"></div>
                )}
              </button>

              {/* Settings Panel - Above Button */}
              {showSettings && (
                <div className="absolute -top-28 right-0 bg-gray-800 rounded-lg p-2 shadow-lg border border-gray-600 z-20 w-48">
                  <div className="space-y-2">
                    <h3 className="text-white text-xs font-semibold text-center">Settings</h3>
                    
                    <div className="space-y-1.5">
                      <div>
                        <select
                          value={selectedQuality}
                          onChange={(e) => setSelectedQuality(e.target.value)}
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="auto">Auto Quality</option>
                          {availableQualities.filter((quality, index, arr) => arr.indexOf(quality) === index).map((quality, index) => (
                            <option key={`${quality}-${index}`} value={quality}>{quality}</option>
                          ))}
                        </select>
                      </div>

                      {detectedAudioLanguages.length > 0 && (
                        <div>
                          <select
                            value={selectedAudio}
                            onChange={(e) => setSelectedAudio(e.target.value)}
                            className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:border-blue-500 focus:outline-none"
                          >
                            <option value="default">Default Audio</option>
                            {detectedAudioLanguages.map((lang, index) => (
                              <option key={`${lang}-${index}`} value={lang}>{lang}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-1.5 border-t border-gray-700">
                      <div className="text-xs text-center">
                        <span className="text-gray-400">{currentResolution} • {currentAudioLang}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={toggleFullscreen}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 rounded-lg p-1.5 md:p-2 transition-all shadow-lg"
              title="Fullscreen"
            >
              <Maximize className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </button>
          </div>
        </div>


      </div>

    </div>
  );
}