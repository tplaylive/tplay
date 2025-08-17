import { Grid3X3, List, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import type { Channel } from "@shared/schema";

interface ChannelGridProps {
  channels: Channel[];
  isLoading: boolean;
  onChannelSelect: (channel: Channel) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categoryColors = {
  News: "bg-blue-600",
  Sports: "bg-green-600", 
  Entertainment: "bg-purple-600",
  Movies: "bg-red-600",
  Music: "bg-pink-600",
  Kids: "bg-yellow-600",
  Regional: "bg-orange-600",
  Documentary: "bg-green-700",
  Direct: "bg-gray-600"
};

export default function ChannelGrid({ 
  channels, 
  isLoading, 
  onChannelSelect, 
  selectedCategory, 
  onCategoryChange 
}: ChannelGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const formatViewerCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="channel-grid-container">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="animate-pulse channel-card">
            <div className="w-16 h-16 bg-gray-700 rounded-full border-2 border-gray-600"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold gradient-text">Live Channels</h2>
          
          <div className="flex items-center space-x-3">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={`transition-all duration-300 ${
                viewMode === "grid" 
                  ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl border-0" 
                  : "hover:bg-[var(--dark-secondary)] border border-gray-600"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`transition-all duration-300 ${
                viewMode === "list" 
                  ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl border-0" 
                  : "hover:bg-[var(--dark-secondary)] border border-gray-600"
              }`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center">
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="bg-[var(--dark-secondary)] border-2 border-gray-600 hover:border-blue-500 transition-colors w-56 h-12 rounded-lg">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--dark-secondary)] border-gray-600">
              <SelectItem value="All" className="text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
                  <span>All Channels</span>
                </div>
              </SelectItem>
              <SelectItem value="News" className="text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
                  <span>News</span>
                </div>
              </SelectItem>
              <SelectItem value="Sports" className="text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>
                  <span>Sports</span>
                </div>
              </SelectItem>
              <SelectItem value="Entertainment" className="text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-sm"></div>
                  <span>Entertainment</span>
                </div>
              </SelectItem>
              <SelectItem value="Movies" className="text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-sm"></div>
                  <span>Movies</span>
                </div>
              </SelectItem>
              <SelectItem value="Music" className="text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-pink-400 rounded-sm"></div>
                  <span>Music</span>
                </div>
              </SelectItem>
              <SelectItem value="Kids" className="text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                  <span>Kids</span>
                </div>
              </SelectItem>
              <SelectItem value="Regional" className="text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
                  <span>Regional</span>
                </div>
              </SelectItem>
              <SelectItem value="Documentary" className="text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-cyan-400 rounded-sm"></div>
                  <span>Documentary</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📺</div>
          <h3 className="text-xl font-semibold mb-2">No Channels Found</h3>
          <p className="text-gray-400">Try selecting a different category</p>
        </div>
      ) : (
        <div className={
          viewMode === "grid" 
            ? "channel-grid-container"
            : "grid grid-cols-1 md:grid-cols-2 gap-3"
        }>
          {channels.map((channel, index) => (
            <div
              key={`channel-${channel.id}-${channel.userId || 'default'}-${index}`}
              onClick={() => onChannelSelect(channel)}
              className={`cursor-pointer group tv-focusable focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all duration-300 ${
                viewMode === "list" ? "bg-[var(--dark-secondary)] rounded-lg p-3 hover:ring-2 hover:ring-blue-400 hover:shadow-lg flex items-center space-x-3" : "channel-card"
              }`}
              data-channel-number={index}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onChannelSelect(channel)}
            >
              <div className={`relative ${viewMode === "list" ? "w-12 h-12 flex-shrink-0" : ""}`}>
                <img 
                  src={channel.logo || `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&h=150&fit=crop&crop=face`}
                  alt={channel.name}
                  className={`object-cover transition-all ${
                    viewMode === "list" 
                      ? "w-12 h-12 rounded-full border-2" 
                      : "w-16 h-16 rounded-full border-3 group-hover:border-4 aspect-square"
                  }`}
                  style={{
                    borderWidth: "3px",
                    borderStyle: "solid",
                    borderColor: viewMode === "grid" ? (
                      channel.category === "News" ? "#2563eb" :
                      channel.category === "Sports" ? "#16a34a" :
                      channel.category === "Entertainment" ? "#9333ea" :
                      channel.category === "Movies" ? "#dc2626" :
                      channel.category === "Music" ? "#ec4899" :
                      channel.category === "Kids" ? "#ca8a04" :
                      channel.category === "Regional" ? "#ea580c" :
                      channel.category === "Documentary" ? "#15803d" :
                      "#6b7280"
                    ) : undefined
                  }}
                />
                {viewMode === "grid" && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center rounded-full">
                    <Play className="text-white w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
              
              {viewMode === "list" && (
                <div className="flex-1">
                  <h3 className="font-medium text-sm truncate">
                    {channel.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs text-white px-2 py-0.5 rounded ${
                      categoryColors[channel.category as keyof typeof categoryColors] || 'bg-gray-600'
                    }`}>
                      {channel.category}
                    </span>
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-400">
                        {formatViewerCount(channel.viewerCount || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {channels.length > 0 && (
        <div className="text-center mt-8">
          <Button variant="ghost" className="bg-[var(--dark-tertiary)] hover:bg-gray-600 px-6 py-3 font-medium">
            <span className="mr-2">+</span>Load More Channels
          </Button>
        </div>
      )}
    </div>
  );
}
