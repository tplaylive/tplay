import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Unlock, Lock, Users, Crown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Channel {
  id: number;
  name: string;
  category: string;
  logo?: string;
  isFreeAccess: boolean;
  isExclusive?: boolean;
}

export function ChannelAccessManagement() {
  const { toast } = useToast();

  // Fetch all channels
  const { data: channels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ['/api/admin/channels/all'],
  });

  // Toggle channel access mutation
  const toggleAccessMutation = useMutation({
    mutationFn: async ({ channelId, isFree }: { channelId: number; isFree: boolean }) => {
      const response = await apiRequest('PUT', `/api/admin/channels/${channelId}/access`, { 
        isFreeAccess: isFree 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/channels/all'] });
      toast({
        title: "Success",
        description: "Channel access level updated successfully!",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update channel access",
        variant: "destructive",
      });
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ action }: { action: 'make_all_free' | 'make_all_premium' | 'first_100_free' }) => {
      const response = await apiRequest('POST', '/api/admin/channels/bulk-access', { action });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/channels/all'] });
      toast({
        title: "Success",
        description: "Bulk update completed successfully!",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to perform bulk update",
        variant: "destructive",
      });
    },
  });

  const handleToggleAccess = (channelId: number, currentAccess: boolean) => {
    toggleAccessMutation.mutate({ channelId, isFree: !currentAccess });
  };

  const handleBulkUpdate = (action: 'make_all_free' | 'make_all_premium' | 'first_100_free') => {
    bulkUpdateMutation.mutate({ action });
  };

  const freeChannelsCount = channels.filter(ch => ch.isFreeAccess).length;
  const premiumChannelsCount = channels.filter(ch => !ch.isFreeAccess).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-200">Channel Access Management</h3>
          <p className="text-sm text-gray-400">Control which channels are free vs premium access</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Free Channels</CardTitle>
            <Unlock className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{freeChannelsCount}</div>
            <p className="text-xs text-gray-400">Available to all users</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Premium Channels</CardTitle>
            <Lock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{premiumChannelsCount}</div>
            <p className="text-xs text-gray-400">Requires access key</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total Channels</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{channels.length}</div>
            <p className="text-xs text-gray-400">Complete channel library</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => handleBulkUpdate('first_100_free')}
          disabled={bulkUpdateMutation.isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          First 100 Free
        </Button>
        <Button
          onClick={() => handleBulkUpdate('make_all_free')}
          disabled={bulkUpdateMutation.isPending}
          variant="outline"
        >
          Make All Free
        </Button>
        <Button
          onClick={() => handleBulkUpdate('make_all_premium')}
          disabled={bulkUpdateMutation.isPending}
          variant="outline"
        >
          Make All Premium
        </Button>
      </div>

      {/* Channel List */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">All Channels ({channels.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading channels...</div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No channels found</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {channels.map((channel, index) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-400 font-mono w-8">#{index + 1}</span>
                    {channel.logo && (
                      <img 
                        src={channel.logo} 
                        alt={channel.name}
                        className="w-8 h-8 rounded object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{channel.name}</span>
                        {channel.isExclusive && (
                          <Badge variant="default" className="bg-gradient-to-r from-blue-500 to-purple-500">
                            <Crown className="w-3 h-3 mr-1" />
                            T PLAY
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">{channel.category}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge variant={channel.isFreeAccess ? "default" : "secondary"}>
                      {channel.isFreeAccess ? "Free" : "Premium"}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`channel-${channel.id}`} className="text-sm text-gray-300">
                        {channel.isFreeAccess ? "Free" : "Premium"}
                      </Label>
                      <Switch
                        id={`channel-${channel.id}`}
                        checked={channel.isFreeAccess}
                        onCheckedChange={() => handleToggleAccess(channel.id, channel.isFreeAccess)}
                        disabled={toggleAccessMutation.isPending}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}