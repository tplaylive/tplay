import { useState } from "react";
import { Search, Radio, Users, Volume2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Channel } from "@shared/schema";

interface MainSidebarProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categoryColors = {
  News: "border-blue-500 bg-blue-500/10",
  Sports: "border-green-500 bg-green-500/10", 
  Entertainment: "border-purple-500 bg-purple-500/10",
  Movies: "border-red-500 bg-red-500/10",
  Music: "border-pink-500 bg-pink-500/10",
  Kids: "border-yellow-500 bg-yellow-500/10",
  Regional: "border-orange-500 bg-orange-500/10",
  Documentary: "border-green-700 bg-green-700/10",
  Direct: "border-gray-500 bg-gray-500/10"
};

const categories = [
  { name: "All", icon: "📺" },
  { name: "Special", icon: "👑" },
  { name: "News", icon: "📰" },
  { name: "Sports", icon: "⚽" },
  { name: "Entertainment", icon: "🎬" },
  { name: "Movies", icon: "🎞️" },
  { name: "Music", icon: "🎵" },
  { name: "Kids", icon: "👶" },
  { name: "Regional", icon: "🌏" },
  { name: "Documentary", icon: "📖" }
];

export default function MainSidebar({ 
  channels, 
  selectedChannel, 
  onChannelSelect, 
  selectedCategory, 
  onCategoryChange 
}: MainSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChannels = channels?.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || channel.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const formatViewerCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="w-80 bg-[var(--dark-secondary)] border-r border-gray-700 h-full flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            T PLAY
          </span>
        </h2>
        <p className="text-sm text-gray-400 mt-1">Live TV Streaming</p>
      </div>

      {/* Categories Section */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">Categories</h3>
        <div className="space-y-1">
          {categories.map(category => {
            const categoryChannels = channels?.filter(c => 
              category.name === "All" || c.category === category.name
            ) || [];
            
            return (
              <button
                key={category.name}
                onClick={() => onCategoryChange(category.name)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                  selectedCategory === category.name
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-l-4 border-l-blue-500 text-white'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                  {categoryChannels.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[var(--dark-tertiary)] border-gray-600 text-white"
          />
        </div>
      </div>

      {/* Channels Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 pb-2">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-blue-500" />
            <span>Channels</span>
            <span className="text-sm text-gray-400">({filteredChannels.length})</span>
          </h3>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-1">
            {filteredChannels.map(channel => {
              const isSelected = selectedChannel?.id === channel.id;
              const colorClass = categoryColors[channel.category as keyof typeof categoryColors] || "border-gray-500 bg-gray-500/10";
              
              return (
                <div
                  key={channel.id}
                  onClick={() => onChannelSelect(channel)}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-700/30 ${
                    isSelected ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50' : 'border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Channel Logo */}
                    <div className={`w-10 h-10 rounded-full border-2 ${colorClass} flex items-center justify-center overflow-hidden flex-shrink-0`}>
                      {channel.logo ? (
                        <img 
                          src={channel.logo} 
                          alt={`${channel.name} logo`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Radio className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* Channel Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white text-sm truncate">{channel.name}</h4>
                      <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                        {channel.isLive && (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-red-500 font-medium">LIVE</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="capitalize">{channel.category}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{formatViewerCount(channel.viewerCount)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Volume2 className="w-3 h-3" />
                          <span>{channel.quality || 'HD'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Playing Indicator */}
                    {isSelected && (
                      <div className="flex items-center space-x-1 text-blue-500">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}