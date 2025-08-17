import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Star, Play, Users } from 'lucide-react';
import type { Channel } from '@shared/schema';

interface ExclusiveChannelsProps {
  exclusiveChannels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  selectedChannel?: Channel | null;
}

export function ExclusiveChannels({ exclusiveChannels, onChannelSelect, selectedChannel }: ExclusiveChannelsProps) {
  if (!exclusiveChannels || exclusiveChannels.length === 0) {
    return null;
  }

  const getExclusiveTagColor = (tag: string) => {
    switch (tag) {
      case 'T PLAY EXCLUSIVE':
        return 'bg-gradient-to-r from-blue-500 to-purple-600 text-white';
      case 'T PLAY PREMIUM':
        return 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white';
      case 'T PLAY FAMILY':
        return 'bg-gradient-to-r from-green-500 to-teal-600 text-white';
      case 'T PLAY ORIGINAL':
        return 'bg-gradient-to-r from-red-500 to-pink-600 text-white';
      case 'T PLAY LIVE':
        return 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white';
      case 'T PLAY CULTURE':
        return 'bg-gradient-to-r from-orange-500 to-red-600 text-white';
      case 'T PLAY DIVINE':
        return 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white';
      case 'T PLAY KNOWLEDGE':
        return 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white';
      default:
        return 'bg-gradient-to-r from-blue-500 to-purple-600 text-white';
    }
  };

  return (
    <div className="mb-8">
      {/* Exclusive Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              T PLAY Exclusive Channels
            </h2>
          </div>
        </div>

      </div>

      {/* Exclusive Channels Grid - Logo Only with Better Spacing */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
        {exclusiveChannels.map((channel) => (
          <Card
            key={channel.id}
            className={`group relative cursor-pointer transition-all duration-300 hover:scale-105 border-2 aspect-square
              ${selectedChannel?.id === channel.id 
                ? 'border-yellow-400 bg-yellow-500/10 shadow-lg shadow-yellow-400/20' 
                : 'border-yellow-500/30 hover:border-yellow-400/60 bg-slate-800/60 hover:bg-slate-700/80'
              }`}
            onClick={() => onChannelSelect(channel)}
          >
            <CardContent className="p-4 flex flex-col items-center">
              {/* Round Channel Logo - Perfect Circle */}
              <div className="relative flex items-center justify-center mb-3">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-700 border-3 border-yellow-400/50 group-hover:border-yellow-400 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-yellow-400/30">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                      <Play className="w-6 h-6 text-yellow-400" />
                    </div>
                  )}
                </div>
                
                {/* Live indicator */}
                {channel.isLive && (
                  <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center shadow-lg">
                    <div className="w-1 h-1 bg-white rounded-full mr-1 animate-pulse"></div>
                    LIVE
                  </div>
                )}
              </div>



              {/* Hover Effect Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 via-yellow-400/10 to-orange-500/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}