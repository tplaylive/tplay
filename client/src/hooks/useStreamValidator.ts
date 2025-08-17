import { useState, useCallback, useRef } from 'react';
import type { Channel } from '@shared/schema';

export function useStreamValidator() {
  const [brokenStreams, setBrokenStreams] = useState<Set<number>>(new Set());
  const retryAttemptsRef = useRef<Map<number, number>>(new Map());

  const markStreamAsBroken = useCallback((channelId: number) => {
    setBrokenStreams(prev => {
      const newSet = new Set(prev);
      newSet.add(channelId);
      return newSet;
    });
  }, []);

  const isStreamBroken = useCallback((channelId: number) => {
    return brokenStreams.has(channelId);
  }, [brokenStreams]);

  const canRetryStream = useCallback((channelId: number, maxRetries = 3) => {
    const attempts = retryAttemptsRef.current.get(channelId) || 0;
    return attempts < maxRetries;
  }, []);

  const incrementRetryAttempt = useCallback((channelId: number) => {
    const currentAttempts = retryAttemptsRef.current.get(channelId) || 0;
    retryAttemptsRef.current.set(channelId, currentAttempts + 1);
  }, []);

  const resetStreamStatus = useCallback((channelId: number) => {
    setBrokenStreams(prev => {
      const newSet = new Set(prev);
      newSet.delete(channelId);
      return newSet;
    });
    retryAttemptsRef.current.delete(channelId);
  }, []);

  const findNextWorkingChannel = useCallback((
    channels: Channel[], 
    currentChannelId: number, 
    direction: 'next' | 'prev' = 'next'
  ): Channel | null => {
    if (channels.length <= 1) return null;
    
    const currentIndex = channels.findIndex(c => c.id === currentChannelId);
    if (currentIndex === -1) return channels[0];
    
    let nextIndex = currentIndex;
    const increment = direction === 'next' ? 1 : -1;
    const maxAttempts = channels.length;
    
    for (let i = 0; i < maxAttempts; i++) {
      nextIndex = direction === 'next' 
        ? (nextIndex + 1) % channels.length
        : nextIndex === 0 ? channels.length - 1 : nextIndex - 1;
      
      const candidate = channels[nextIndex];
      if (!isStreamBroken(candidate.id)) {
        return candidate;
      }
    }
    
    // If all streams are marked as broken, return the next one anyway (reset attempt)
    nextIndex = direction === 'next' 
      ? (currentIndex + 1) % channels.length
      : currentIndex === 0 ? channels.length - 1 : currentIndex - 1;
    
    return channels[nextIndex];
  }, [isStreamBroken]);

  return {
    markStreamAsBroken,
    isStreamBroken,
    canRetryStream,
    incrementRetryAttempt,
    resetStreamStatus,
    findNextWorkingChannel,
    brokenStreamsCount: brokenStreams.size
  };
}