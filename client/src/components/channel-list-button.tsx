import { List } from "lucide-react";
import { useState } from "react";
import ChannelSidebar from "./channel-sidebar";
import type { Channel } from "@shared/schema";

interface ChannelListButtonProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
}

export default function ChannelListButton({ 
  channels, 
  selectedChannel, 
  onChannelSelect 
}: ChannelListButtonProps) {
  const [showChannelSidebar, setShowChannelSidebar] = useState(false);

  const handleChannelSelect = (channel: Channel) => {
    setShowChannelSidebar(false);
    onChannelSelect(channel);
  };

  return (
    <>
      <button
        onClick={() => setShowChannelSidebar(true)}
        className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 rounded-lg p-2 transition-all flex items-center space-x-2 shadow-lg"
      >
        <List className="w-4 h-4 text-white" />
        <span className="text-white text-sm font-medium">Channels</span>
      </button>

      <ChannelSidebar
        channels={channels}
        selectedChannel={selectedChannel}
        onChannelSelect={handleChannelSelect}
        isOpen={showChannelSidebar}
        onClose={() => setShowChannelSidebar(false)}
      />
      
      {/* Overlay for closing sidebar */}
      {showChannelSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowChannelSidebar(false)}
        />
      )}
    </>
  );
}