import { Search, Menu, Key, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Channel } from "@shared/schema";
import logoPath from "@assets/T Play_1752914478755.png";
import { KeyAuthDialog } from "@/components/key-auth-dialog";
import { useKeyAuth } from "@/hooks/useKeyAuth";

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onChannelSelect?: (channel: Channel) => void;
}

export default function Header({ searchQuery = "", onSearchChange, onChannelSelect }: HeaderProps) {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<Channel[]>([]);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [showResetMenu, setShowResetMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { hasFullAccess, keyInfo, isLoading, setKey, clearKey, checkStoredKey } = useKeyAuth();

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    staleTime: 30000,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // Memoize filtered results to prevent unnecessary recalculations
  const filteredChannels = useMemo(() => {
    if (!searchQuery || searchQuery.length === 0 || channels.length === 0) {
      return [];
    }
    
    return channels.filter(channel => 
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (channel.description && channel.description.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 8); // Limit to 8 results
  }, [searchQuery, channels]);

  // Update search results and dropdown visibility
  useEffect(() => {
    setSearchResults(filteredChannels);
    setShowSearchDropdown(filteredChannels.length > 0 && searchQuery.length > 0);
  }, [filteredChannels, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      setShowResetMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChannelSelect = (channel: Channel) => {
    onChannelSelect?.(channel);
    setShowSearchDropdown(false);
    // Don't set search query to channel name to prevent player reload
  };

  return (
    <header className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b border-purple-500/30 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <img 
                src={logoPath} 
                alt="T Play Logo" 
                className="w-12 h-12 object-contain"
              />
              <div className="flex items-center space-x-2">
{hasFullAccess && keyInfo ? (
                  <div className="relative group">
                    <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-2 py-1 rounded-full text-xs">
                      <Crown className="w-3 h-3" />
                      <span className="font-medium">
                        {Math.max(0, Math.ceil((new Date(keyInfo.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days left
                      </span>
                      <span className="text-yellow-200">•</span>
                      <span className="text-yellow-200">
                        {keyInfo.devicesUsed}/{keyInfo.maxDevices} devices
                      </span>
                    </div>
                    
                    <div className="absolute top-full right-0 mt-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <button 
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-full text-xs transition-colors whitespace-nowrap"
                        onClick={() => {
                          if (confirm('Remove access key and return to free mode?')) {
                            localStorage.clear();
                            window.location.reload();
                          }
                        }}
                      >
                        Remove Key
                      </button>
                    </div>
                  </div>
                ) : hasFullAccess ? (
                  <div className="flex items-center space-x-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-2 py-1 rounded-full text-xs">
                    <Crown className="w-3 h-3" />
                    <span className="font-medium">Access Key</span>
                  </div>
                ) : null}
              </div>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="#" className="hover:bg-gradient-to-r hover:from-blue-400 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-all font-medium bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Live TV
              </a>
              <a href="#" className="hover:bg-gradient-to-r hover:from-blue-400 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-all text-gray-300">
                Movies
              </a>
              <a href="#" className="hover:bg-gradient-to-r hover:from-blue-400 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-all text-gray-300">
                Sports
              </a>
              <a href="#" className="hover:bg-gradient-to-r hover:from-blue-400 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-all text-gray-300">
                News
              </a>
              <a href="#" className="hover:bg-gradient-to-r hover:from-blue-400 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-all text-gray-300">
                Entertainment
              </a>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block" ref={searchRef}>
              <Input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onFocus={() => searchQuery && setShowSearchDropdown(searchResults.length > 0)}
                className="bg-[var(--dark-tertiary)] border-gray-600 rounded-lg px-4 py-2 pl-10 w-64 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              
              {/* Search Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="py-2">
                    {searchResults.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => handleChannelSelect(channel)}
                        className="w-full px-4 py-3 hover:bg-gray-700 transition-colors flex items-center space-x-3 text-left"
                      >
                        {channel.logo && (
                          <img 
                            src={channel.logo} 
                            alt={`${channel.name} logo`}
                            className="w-8 h-8 object-cover rounded-full border border-gray-600"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{channel.name}</div>
                          <div className="text-gray-400 text-sm truncate">{channel.category}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {channel.viewerCount} viewers
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Key Setup Button */}
            {!isLoading && !hasFullAccess && (
              <Button
                onClick={() => setShowKeyDialog(true)}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-medium px-3 py-2 rounded-lg"
              >
                <Key className="w-4 h-4" />
              </Button>
            )}
            


            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSearchVisible(!isSearchVisible)}
            >
              <Search className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {isSearchVisible && (
          <div className="mt-3 md:hidden">
            <div className="relative" ref={searchRef}>
              <Input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onFocus={() => searchQuery && setShowSearchDropdown(searchResults.length > 0)}
                className="bg-[var(--dark-tertiary)] border-gray-600 rounded-lg px-4 py-2 pl-10 w-full focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              
              {/* Mobile Search Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="py-2">
                    {searchResults.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => handleChannelSelect(channel)}
                        className="w-full px-4 py-3 hover:bg-gray-700 transition-colors flex items-center space-x-3 text-left"
                      >
                        {channel.logo && (
                          <img 
                            src={channel.logo} 
                            alt={`${channel.name} logo`}
                            className="w-8 h-8 object-cover rounded-full border border-gray-600"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{channel.name}</div>
                          <div className="text-gray-400 text-sm truncate">{channel.category}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {channel.viewerCount} viewers
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Key Authentication Dialog */}
        <KeyAuthDialog
          isOpen={showKeyDialog}
          onClose={() => setShowKeyDialog(false)}
          onSuccess={(key: string, keyInfo?: any) => {
            setKey(key, keyInfo);
            setShowKeyDialog(false);
            // Force a re-check of stored key to update state
            setTimeout(() => checkStoredKey(), 100);
          }}
        />
      </div>
    </header>
  );
}
