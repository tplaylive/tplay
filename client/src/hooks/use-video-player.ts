import { useCallback, useRef, useState } from "react";
import { initVideoPlayer, loadStreamIntoPlayer, destroyVideoPlayer } from "@/lib/video-utils";

export function useVideoPlayer(videoRef: React.RefObject<HTMLVideoElement>) {
  const playerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializePlayer = useCallback(() => {
    if (videoRef.current && !playerRef.current) {
      try {
        playerRef.current = initVideoPlayer(videoRef.current, {
          onLoadStart: () => setIsLoading(true),
          onCanPlay: () => setIsLoading(false),
          onError: (err: string) => {
            setIsLoading(false);
            setError(err);
          }
        });
      } catch (err) {
        console.error("Failed to initialize video player:", err);
        setError("Failed to initialize video player");
      }
    }
  }, [videoRef]);

  const destroyPlayer = useCallback(() => {
    if (playerRef.current) {
      destroyVideoPlayer(playerRef.current);
      playerRef.current = null;
    }
  }, []);

  const loadStream = useCallback((streamUrl: string) => {
    if (playerRef.current) {
      setError(null);
      setIsLoading(true);
      try {
        loadStreamIntoPlayer(playerRef.current, streamUrl);
      } catch (err) {
        console.error("Failed to load stream:", err);
        setError("Failed to load stream");
        setIsLoading(false);
      }
    }
  }, []);

  return {
    initializePlayer,
    destroyPlayer,
    loadStream,
    isLoading,
    error
  };
}
