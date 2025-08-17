import { Tv, Newspaper, Trophy, Film, Music, Baby, GraduationCap, Cross, Play, Upload, Plus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onDirectStream: (url: string) => void;
}

const categories = [
  { id: "All", name: "All Channels", icon: Tv, color: "text-blue-400" },
  { id: "Special", name: "T PLAY Special", icon: Crown, color: "text-yellow-400" },
  { id: "News", name: "News", icon: Newspaper, color: "text-red-400" },
  { id: "Sports", name: "Sports", icon: Trophy, color: "text-yellow-400" },
  { id: "Movies", name: "Movies", icon: Film, color: "text-purple-400" },
  { id: "Music", name: "Music", icon: Music, color: "text-pink-400" },
  { id: "Kids", name: "Kids", icon: Baby, color: "text-green-400" },
  { id: "Education", name: "Education", icon: GraduationCap, color: "text-cyan-400" },
  { id: "Religious", name: "Religious", icon: Cross, color: "text-orange-400" },
];

export default function Sidebar({ selectedCategory, onCategoryChange, onDirectStream }: SidebarProps) {
  const [streamUrl, setStreamUrl] = useState("");
  const [m3uUrl, setM3uUrl] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const { toast } = useToast();

  const validateStreamMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/validate-stream", { url });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        onDirectStream(data.url);
        setStreamUrl("");
        toast({
          title: "Stream loaded successfully",
          description: `Format: ${data.format}`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Invalid stream URL",
        description: error.message || "Please check the URL and try again",
        variant: "destructive",
      });
    },
  });

  const m3uMutation = useMutation({
    mutationFn: async (data: { content?: string, url?: string, name: string }) => {
      const response = await apiRequest("POST", "/api/custom-channels/m3u", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "M3U Playlist added",
        description: `Added ${data.count} channels from ${playlistName}`,
      });
      setM3uUrl("");
      setPlaylistName("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to parse M3U",
        description: error.message || "Please check the format and try again",
        variant: "destructive",
      });
    },
  });

  const handleDirectStream = () => {
    if (streamUrl.trim()) {
      validateStreamMutation.mutate(streamUrl.trim());
    }
  };

  const handleM3UFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const name = file.name.replace(/\.(m3u8?|txt)$/i, '');
        m3uMutation.mutate({ content, name });
      };
      reader.readAsText(file);
    }
  };

  const handleM3UPlaylist = () => {
    if (m3uUrl.trim() && playlistName.trim()) {
      m3uMutation.mutate({ url: m3uUrl.trim(), name: playlistName.trim() });
    }
  };

  return (
    <aside className="w-64 bg-[var(--dark-secondary)] border-r border-gray-700 hidden lg:block">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Categories</h3>
        <ul className="space-y-3">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            
            return (
              <li key={category.id}>
                <button
                  onClick={() => onCategoryChange(category.id)}
                  className={`category-filter tv-focusable focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center space-x-3 p-3 rounded-xl w-full text-left transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl transform scale-105"
                      : "hover:bg-[var(--dark-tertiary)] hover:shadow-md text-gray-300 hover:text-white"
                  }`}
                  tabIndex={0}
                >
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-gray-700/50'}`}>
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : category.color}`} />
                  </div>
                  <span className="font-medium">{category.name}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-10">
          <h4 className="text-sm font-bold mb-4 text-gray-300 tracking-wider">DIRECT STREAM</h4>
          <div className="space-y-3">
            {/* Direct Stream Link Input */}
            <div>
              <Input
                type="url"
                placeholder="Enter M3U8/DASH/TS URL..."
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                className="tv-focusable w-full bg-gray-800/50 border-gray-600 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-lg p-3"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleDirectStream();
                  }
                }}
              />
              <Button
                onClick={handleDirectStream}
                disabled={!streamUrl.trim() || validateStreamMutation.isPending}
                className="w-full mt-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 font-semibold text-sm hover:from-blue-600 hover:to-purple-700 transition-all shadow-xl rounded-lg hover:shadow-2xl transform hover:scale-105"
              >
                <Play className="h-5 w-5 mr-2" />
                {validateStreamMutation.isPending ? "Validating..." : "Play Stream"}
              </Button>
            </div>

            {/* M3U Playlist Upload */}
            <div className="pt-3 border-t border-gray-700">
              <label className="text-xs text-gray-400 font-medium mb-2 block">M3U Playlist</label>
              <input
                type="file"
                accept=".m3u,.m3u8,.txt"
                onChange={handleM3UFileUpload}
                className="hidden"
                id="m3u-upload"
              />
              <label
                htmlFor="m3u-upload"
                className="w-full bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-gray-800/70 transition-all block"
              >
                <Upload className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                <span className="text-xs text-gray-400">Upload M3U File</span>
              </label>
            </div>

            {/* M3U Link Input */}
            <div>
              <Input
                type="url"
                placeholder="Or paste M3U playlist URL..."
                value={m3uUrl}
                onChange={(e) => setM3uUrl(e.target.value)}
                className="w-full bg-gray-800/50 border-gray-600 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-lg p-3"
              />
              <div className="flex space-x-2 mt-2">
                <Input
                  type="text"
                  placeholder="Custom name for playlist..."
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="flex-1 bg-gray-800/50 border-gray-600 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-lg p-2"
                />
                <Button
                  onClick={handleM3UPlaylist}
                  disabled={!m3uUrl.trim() || !playlistName.trim() || m3uMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-4 py-2 font-semibold text-sm hover:from-green-600 hover:to-teal-700 transition-all rounded-lg"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 p-4 bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl border border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-200">Connection Status</span>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
              <span className="text-xs text-green-400 font-medium">Online</span>
            </div>
          </div>
          <div className="text-xs text-gray-300 space-y-1">
            <div className="flex justify-between">
              <span>Speed:</span>
              <span className="text-green-400 font-semibold">45.2 Mbps</span>
            </div>
            <div className="flex justify-between">
              <span>Latency:</span>
              <span className="text-yellow-400 font-semibold">28ms</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}