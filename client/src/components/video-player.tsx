import { useEffect, useRef, useMemo, useCallback } from "react";
import { useVideoPlayer } from "@/hooks/use-video-player";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { M3U8Player } from "./m3u8-player";
import { ShakaDrmPlayer } from "./shaka-drm-player";
import { DRMPlayer } from "./drm-player";
import { MobileVideoPlayer } from "./mobile-video-player";
import { EnhancedVideoPlayer } from "./enhanced-video-player";

import type { Channel, Program } from "@shared/schema";

interface VideoPlayerProps {
  channel: Channel | null;
  onChannelChange?: (direction: 'prev' | 'next') => void;
  allChannels?: Channel[];
  onChannelSelect?: (channel: Channel) => void;
  onStreamError?: (channelId: number) => void;
}

export default function VideoPlayer({ channel, onChannelChange, allChannels = [], onChannelSelect, onStreamError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const queryClient = useQueryClient();
  
  // Use consistent video player for all devices (original working state)
  
  const { initializePlayer, destroyPlayer, loadStream, isLoading, error } = useVideoPlayer(videoRef);

  // Get current program for the channel
  const { data: currentProgram } = useQuery<Program | null>({
    queryKey: ["/api/channels", channel?.id, "current-program"],
    enabled: !!channel?.id && channel.id !== 0,
  });

  // Update viewer count - memoize to prevent recreating on every render
  const updateViewersMutation = useMutation({
    mutationFn: async ({ channelId, count }: { channelId: number; count: number }) => {
      return apiRequest("PATCH", `/api/channels/${channelId}/viewers`, { count });
    },
    onError: (error) => {
      console.warn("Failed to update viewer count:", error);
    },
    onSuccess: () => {
      // Invalidate channels query to refresh viewer count
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
    },
  });

  // Memoize the mutation function to prevent re-triggering
  const updateViewerCount = useCallback((channelId: number, count: number) => {
    if (channelId !== 0) {
      updateViewersMutation.mutate({ channelId, count });
    }
  }, [updateViewersMutation]);

  useEffect(() => {
    initializePlayer();
    return destroyPlayer;
  }, [initializePlayer, destroyPlayer]);

  // Track the last channel that had viewer count updated
  const lastChannelRef = useRef<number | null>(null);

  useEffect(() => {
    if (channel?.streamUrl && videoRef.current) {
      loadStream(channel.streamUrl);
      
      // Update viewer count only once per channel change
      if (channel.id !== 0 && lastChannelRef.current !== channel.id) {
        lastChannelRef.current = channel.id;
        updateViewerCount(channel.id, (channel.viewerCount || 0) + 1);
      }
    }
  }, [channel?.streamUrl, channel?.id, loadStream, updateViewerCount]);

  if (!channel) {
    return (
      <div className="w-full h-full bg-black relative flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📺</div>
          <h3 className="text-xl font-semibold mb-2">Select a Channel</h3>
          <p className="text-gray-400">Choose a channel from the grid below to start watching</p>
        </div>
      </div>
    );
  }

  const formatViewerCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Exclusive channels ALWAYS use M3U8 player regardless of format/DRM settings
  if (channel?.isExclusive) {
    return (
      <M3U8Player
        streamUrl={channel.streamUrl}
        channelName={channel.name}
        channelLogo={channel.logo || undefined}
        onError={(error) => console.error("M3U8 Player error (Exclusive):", error)}
        onChannelChange={onChannelChange}
        audioLanguages={['Hindi', 'English', 'Tamil', 'Telugu']}
        videoQualities={['1080p', '720p', '480p', '360p']}
        allChannels={allChannels}
        currentChannel={channel}
        onChannelSelect={onChannelSelect}
      />
    );
  }

  // Check for DASH/MPD streams (both DRM and non-DRM) - only for non-exclusive channels
  if (channel?.streamFormat === 'DASH' || channel?.streamFormat === 'MPD' || channel?.streamUrl?.toLowerCase().includes('.mpd')) {
    if (channel?.isDrmProtected) {
      // Use Shaka DRM player for encrypted content
      return (
        <ShakaDrmPlayer
          streamUrl={channel.manifestUrl || channel.streamUrl}
          channelName={channel.name}
          channelLogo={channel.logo || undefined}
          drmKeyId={channel.drmKeyId || undefined}
          drmKey={channel.drmKey || undefined}
          onError={(error) => {
            console.error("Shaka DRM Player error:", error);
            // Mark channel as broken and auto switch
            if (channel?.id && onStreamError) {
              onStreamError(channel.id);
            }
          }}
          onChannelChange={onChannelChange}
          allChannels={allChannels}
          currentChannel={channel}
          onChannelSelect={onChannelSelect}
        />
      );
    } else {
      // Use Shaka player for non-encrypted DASH content too (it handles both)
      return (
        <ShakaDrmPlayer
          streamUrl={channel.streamUrl}
          channelName={channel.name}
          channelLogo={channel.logo || undefined}
          onError={(error) => {
            console.error("Shaka DASH Player error:", error);
            // Mark channel as broken and auto switch
            if (channel?.id && onStreamError) {
              onStreamError(channel.id);
            }
          }}
          onChannelChange={onChannelChange}
          allChannels={allChannels}
          currentChannel={channel}
          onChannelSelect={onChannelSelect}
        />
      );
    }
  }

  // Use enhanced player with better error recovery for all M3U8 streams
  if (channel?.streamUrl?.toLowerCase().includes('.m3u8')) {
    return (
      <div key={`enhanced-${channel.id}`} className="w-full h-full">
        <EnhancedVideoPlayer
          streamUrl={channel.streamUrl}
          channelName={channel.name}
          channelLogo={channel.logo || undefined}
          onError={(error) => {
            console.error("Enhanced Player error:", error);
            if (channel?.id && onStreamError) {
              onStreamError(channel.id);
            }
          }}
          onChannelChange={onChannelChange}
        />
      </div>
    );
  }

  // Fallback M3U8 player for specific cases
  if (channel?.streamUrl?.toLowerCase().includes('.m3u8') && false) {
    return (
      <M3U8Player
        streamUrl={channel.streamUrl}
        channelName={channel.name}
        channelLogo={channel.logo || undefined}
        onError={(error) => {
          console.error("M3U8 Player error:", error);
          // Mark channel as broken and auto switch
          if (channel?.id && onStreamError) {
            onStreamError(channel.id);
          }
        }}
        onChannelChange={onChannelChange}
        audioLanguages={['Hindi', 'English', 'Tamil', 'Telugu']}
        videoQualities={['1080p', '720p', '480p', '360p']}
        allChannels={allChannels}
        currentChannel={channel}
        onChannelSelect={onChannelSelect}
      />
    );
  }

  return (
    <div className="video-player-container">
      <div className="video-player-wrapper">
        <video
          ref={videoRef}
          id="tplay-video-player"
          className="video-js vjs-default-skin"
          controls
          preload="auto"
          data-setup="{}"
        >
          <p className="vjs-no-js">
            To view this video please enable JavaScript, and consider upgrading to a web browser that
            <a href="https://videojs.com/html5-video-support/" target="_blank" rel="noopener noreferrer">
              supports HTML5 video
            </a>.
          </p>
        </video>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white">Loading stream...</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-center max-w-md mx-4">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold mb-2">Stream Error</h3>
              <p className="text-gray-300 mb-4">{error}</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => channel?.streamUrl && loadStream(channel.streamUrl)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
                >
                  Retry
                </button>
                {allChannels.length > 1 && onChannelChange && (
                  <button
                    onClick={() => onChannelChange('next')}
                    className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-2 rounded font-medium hover:from-green-600 hover:to-teal-700 transition-all shadow-lg"
                  >
                    Next Channel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Now Playing Info Overlay - Mobile Optimized */}
        <div className="absolute bottom-2 left-1 right-1 md:bottom-4 md:left-4 md:right-auto bg-black bg-opacity-90 rounded-lg p-2 md:p-3 md:max-w-sm">
          <div className="flex items-center space-x-2 md:space-x-3">
            {channel.logo && (
              <img 
                src={channel.logo} 
                alt={`${channel.name} logo`}
                className="w-8 h-8 md:w-12 md:h-8 object-cover rounded-full md:rounded flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h4 className="font-semibold text-xs md:text-sm truncate text-white">{channel.name}</h4>
              <div className="flex items-center space-x-1 md:space-x-2 text-xs text-gray-400 mt-0.5">
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-500 font-medium text-xs">LIVE</span>
                </div>
                <span className="text-gray-500">•</span>
                <span className="capitalize text-xs truncate">{channel.category}</span>
                <span className="text-gray-500 hidden sm:inline">•</span>
                <span className="text-xs hidden sm:inline truncate">
                  {currentProgram?.title || channel.description || "Music Channel"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quality and Stats Overlay */}
        <div className="absolute top-2 right-1 md:top-4 md:right-4 bg-black bg-opacity-90 rounded-lg p-1.5 md:p-2 text-xs">
          <div className="flex items-center space-x-1 md:space-x-2">
            <span className="text-green-400 text-xs">{channel.quality}</span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-xs">{formatViewerCount(channel.viewerCount || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
