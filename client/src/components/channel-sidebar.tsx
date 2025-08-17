import { useState } from "react";
import { X, Search, Volume2, Users, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Channel } from "@shared/schema";

interface ChannelSidebarProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  isOpen: boolean;
  onClose: () => void;
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

export default function ChannelSidebar({ 
  channels, 
  selectedChannel, 
  onChannelSelect, 
  isOpen, 
  onClose 
}: ChannelSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredChannels = channels?.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || channel.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const categories = ["All", ...Array.from(new Set(channels?.map(c => c.category) || []))];

  const formatViewerCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className={`fixed left-0 top-0 h-full w-80 bg-[var(--dark-secondary)] border-r border-gray-700 z-50 transform transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Radio className="w-5 h-5 text-blue-500" />
          <span>Channels</span>
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
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

      {/* Category Filter */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChannels.map(channel => {
          const isSelected = selectedChannel?.id === channel.id;
          const colorClass = categoryColors[channel.category as keyof typeof categoryColors] || "border-gray-500 bg-gray-500/10";
          
          return (
            <div
              key={channel.id}
              onClick={() => onChannelSelect(channel)}
              className={`p-4 border-b border-gray-700/50 cursor-pointer transition-all hover:bg-gray-700/30 ${
                isSelected ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Channel Logo */}
                <div className={`w-12 h-12 rounded-full border-2 ${colorClass} flex items-center justify-center overflow-hidden flex-shrink-0`}>
                  {channel.logo ? (
                    <img 
                      src={channel.logo} 
                      alt={`${channel.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Radio className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                {/* Channel Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-sm truncate">{channel.name}</h4>
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

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-700 bg-[var(--dark-tertiary)]">
        <div className="text-center text-sm text-gray-400">
          <span>{filteredChannels.length} channels</span>
          {searchTerm && <span> • Filtered</span>}
        </div>
      </div>
    </div>
  );
}