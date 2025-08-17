import { useState, useEffect, useMemo, useCallback, memo } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import VideoPlayer from "@/components/video-player";
import ChannelGrid from "@/components/channel-grid";
import MobileNav from "@/components/mobile-nav";
import BackendAccess from "@/components/backend-access";
import { InstallPrompt } from "@/components/install-prompt";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useQuery } from "@tanstack/react-query";
import { usePWA } from "@/hooks/usePWA";

import { Crown } from "lucide-react";
import type { Channel } from "@shared/schema";

// Memoized Video Player to prevent re-renders
const MemoizedVideoPlayer = memo(VideoPlayer);

export default function Home() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [directStreamUrl, setDirectStreamUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGridView, setShowGridView] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  
  // PWA hooks
  const { isStandalone } = usePWA();


  // Fetch regular channels
  const { data: channels = [], isLoading, error, refetch } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    refetchOnWindowFocus: true,
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 3,
  });

  const { data: categoryChannels = [], isLoading: categoryLoading } = useQuery<Channel[]>({
    queryKey: ["/api/channels/category", selectedCategory],
    enabled: selectedCategory !== "All",
    refetchOnWindowFocus: true,
    staleTime: 30000,
    retry: 3,
  });

  // Fetch user-specific custom channels
  const { data: customChannels = [] } = useQuery({
    queryKey: selectedCategory === "All" 
      ? ["/api/custom-channels"] 
      : ["/api/custom-channels/category", selectedCategory],
    refetchOnWindowFocus: true,
    staleTime: 30000,
    retry: 3,
  });

  // Handle different category types
  const allChannels = selectedCategory === "All" ? channels : categoryChannels;
  const exclusiveChannels = allChannels.filter(channel => channel.isExclusive);
  const regularChannels = allChannels.filter(channel => !channel.isExclusive);
  
  const mappedCustomChannels = (customChannels as any[]).map((ch: any) => ({
    ...ch,
    // Map custom channel fields to regular channel format
    logo: ch.logo || '/default-logo.png',
    isLive: true,
    description: `${ch.customName} (Custom)`,
    viewerCount: 0,
    quality: ch.quality || 'HD'
  }));
  
  // Memoize base channels - handle Special category differently
  const baseChannels = useMemo(() => {
    if (selectedCategory === "Special") {
      // Special category shows only exclusive channels
      return exclusiveChannels;
    } else {
      // All other categories show regular + custom + exclusive channels (dual placement)
      return [...regularChannels, ...exclusiveChannels, ...mappedCustomChannels];
    }
  }, [selectedCategory, regularChannels, exclusiveChannels, mappedCustomChannels]);
  
  // Filter channels based on search query - memoized to prevent unnecessary re-renders
  const filteredChannels = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === "") return baseChannels;
    
    const query = searchQuery.toLowerCase().trim();
    return baseChannels.filter(channel => 
      channel.name.toLowerCase().includes(query) ||
      channel.category.toLowerCase().includes(query) ||
      (channel.description && channel.description.toLowerCase().includes(query))
    );
  }, [searchQuery, baseChannels]);
  
  const displayChannels = filteredChannels;
  const isChannelsLoading = selectedCategory === "All" ? isLoading : categoryLoading;

  const handleChannelSelect = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
    setSearchQuery(""); // Clear search when selecting a channel
  }, []);

  const handleDirectStream = useCallback((url: string) => {
    setDirectStreamUrl(url);
    // Create a temporary channel object for direct stream
    const directChannel: Channel = {
      id: 0,
      name: "Direct Stream",
      streamUrl: url,
      category: "Direct",
      isLive: true,
      description: "Direct Stream Input",
      viewerCount: 0,
      quality: "Auto",
      logo: null,

      streamFormat: "M3U8",
      isDrmProtected: false,
      drmKeyId: null,
      drmKey: null,

      isExclusive: false,
      isFreeAccess: true
    };
    setSelectedChannel(directChannel);
  }, []);

  // Select first channel by default
  const currentChannel = selectedChannel || (channels.length > 0 ? channels[0] : null);

  // Simple channel change handler
  const handleChannelChange = useCallback((direction: 'prev' | 'next') => {
    if (!currentChannel || channels.length === 0) return;
    
    const currentIndex = channels.findIndex(c => c.id === currentChannel.id);
    if (currentIndex === -1) return;
    
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % channels.length;
    } else {
      nextIndex = currentIndex === 0 ? channels.length - 1 : currentIndex - 1;
    }
    
    const nextChannel = channels[nextIndex];
    setSelectedChannel(nextChannel);
  }, [currentChannel, channels]);



  // Listen for channel change events from video player
  useEffect(() => {
    const handleChannelChangeEvent = (event: CustomEvent) => {
      const newChannel = event.detail as Channel;
      setSelectedChannel(newChannel);
    };

    window.addEventListener('channelChange', handleChannelChangeEvent as EventListener);
    
    return () => {
      window.removeEventListener('channelChange', handleChannelChangeEvent as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--dark-primary)] text-white">
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onChannelSelect={handleChannelSelect}
      />
      
      <div className="flex min-h-screen">
        <Sidebar 
          selectedCategory={selectedCategory}
          onCategoryChange={(category) => {
            setSelectedCategory(category);
            // Clear search when changing categories
            if (searchQuery) setSearchQuery("");
          }}
          onDirectStream={handleDirectStream}
        />
        
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Video Player Section - Memoized to prevent reload */}
          <div className="bg-black rounded-lg overflow-hidden">
            <MemoizedVideoPlayer 
              channel={currentChannel} 
              onChannelChange={handleChannelChange}
              allChannels={channels}
              onChannelSelect={handleChannelSelect}
            />
          </div>
          


          {/* Special Category Header */}
          {selectedCategory === "Special" && (
            <div className="mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                    T PLAY Special Channels
                  </h2>
                  <p className="text-gray-400 text-sm">Exclusive premium content</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Channel Grid Section - Only affected by search */}
          <div>
            <ChannelGrid 
              channels={searchQuery ? filteredChannels : displayChannels}
              isLoading={isChannelsLoading}
              onChannelSelect={handleChannelSelect}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>
          
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
              <h3 className="text-red-400 font-semibold">Failed to load channels</h3>
              <p className="text-red-300 text-sm mt-1">Check your connection and try again</p>
              <button 
                onClick={() => refetch()}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
              >
                Retry
              </button>
            </div>
          )}
        </main>
      </div>

      <MobileNav />
      
      {/* PWA Components */}
      <InstallPrompt />
      
      {/* Mobile Bottom Navigation for PWA */}
      {isStandalone && (
        <MobileBottomNav
          onCategorySelect={setSelectedCategory}
          currentCategory={selectedCategory}
          onToggleView={() => setShowGridView(!showGridView)}
          onToggleSearch={() => setShowSearch(!showSearch)}
        />
      )}
    </div>
  );
}
