import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Eye, LogOut, Edit } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const channelSchema = z.object({
  name: z.string().min(1, 'Channel name is required'),
  streamUrl: z.string().url('Valid stream URL is required'),
  category: z.string().min(1, 'Category is required'),
  logo: z.string().url('Valid logo URL is required').optional().or(z.literal('')),
  description: z.string().optional(),
  quality: z.enum(['SD', 'HD', '4K']).optional(),
  // DRM Support fields
  streamFormat: z.string().default('HLS'),
  isDrmProtected: z.boolean().default(false),
  drmKeyId: z.string().optional(),
  drmKey: z.string().optional(),
  manifestUrl: z.string().url().optional().or(z.literal('')),
});

type ChannelFormData = z.infer<typeof channelSchema>;

const categories = ['News', 'Sports', 'Entertainment', 'Music', 'Movies', 'Kids', 'Documentary', 'Religious', 'Regional'];

export function ModeratorDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);

  const channelForm = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: '',
      streamUrl: '',
      category: '',
      logo: '',
      description: '',
      quality: 'HD',
      streamFormat: 'HLS',
      isDrmProtected: false,
      drmKeyId: '',
      drmKey: '',
      manifestUrl: '',
    },
  });

  // Fetch channels
  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['/api/channels'],
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (data: ChannelFormData) => {
      const response = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Channel created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      setIsChannelDialogOpen(false);
      channelForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: async (data: ChannelFormData & { id: number }) => {
      const response = await fetch(`/api/admin/channels/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Channel updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      setIsChannelDialogOpen(false);
      setEditingChannel(null);
      channelForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete channel mutation  
  const deleteChannelMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/channels/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete channel');
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Channel deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitChannel = (data: ChannelFormData) => {
    if (editingChannel) {
      updateChannelMutation.mutate({ ...data, id: editingChannel.id });
    } else {
      createChannelMutation.mutate(data);
    }
  };

  const handleAddChannel = () => {
    setEditingChannel(null);
    channelForm.reset();
    setIsChannelDialogOpen(true);
  };

  const handleEditChannel = (channel: any) => {
    setEditingChannel(channel);
    channelForm.reset({
      name: channel.name,
      streamUrl: channel.streamUrl,
      category: channel.category,
      logo: channel.logo || '',
      description: channel.description || '',
      quality: channel.quality || 'HD',
      streamFormat: channel.streamFormat || 'HLS',
      isDrmProtected: channel.isDrmProtected || false,
      drmKeyId: channel.drmKeyId || '',
      drmKey: channel.drmKey || '',
      manifestUrl: channel.manifestUrl || '',
    });
    setIsChannelDialogOpen(true);
  };

  const handleDeleteChannel = (id: number) => {
    if (confirm('Are you sure you want to delete this channel?')) {
      deleteChannelMutation.mutate(id);
    }
  };

  const handleLogout = () => {
    window.location.href = '/admin-logout';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Moderator Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Manage channels and content</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Channel Management */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl text-blue-400">Channel Management</CardTitle>
                <CardDescription className="text-gray-400">
                  Add and edit channels (moderators can only add/edit, not delete)
                </CardDescription>
              </div>
              <Button
                onClick={handleAddChannel}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Channel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {channelsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-slate-700 rounded-lg h-20"></div>
                  </div>
                ))}
              </div>
            ) : channels.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No channels found</div>
            ) : (
              <div className="space-y-3">
                {channels.map((channel: any) => (
                  <div
                    key={channel.id}
                    className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-blue-500/50 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        {channel.logo && (
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <h3 className="font-semibold text-white">{channel.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {channel.category}
                          </Badge>
                          {channel.isDrmProtected && (
                            <Badge variant="outline" className="text-xs ml-2 border-blue-500 text-blue-400">
                              🔒 DRM
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          onClick={() => handleEditChannel(channel)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mt-2">
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{channel.viewerCount || 0}</span>
                      </div>
                      {channel.quality && (
                        <Badge variant="outline" className="text-xs">
                          {channel.quality}
                        </Badge>
                      )}
                    </div>
                    {channel.description && (
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                        {channel.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Channel Dialog */}
        <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingChannel ? 'Edit Channel' : 'Add New Channel'}</DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingChannel ? 'Update channel information' : 'Add a new channel to the platform'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={channelForm.handleSubmit(onSubmitChannel)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Channel Name</Label>
                  <Input
                    id="name"
                    {...channelForm.register('name')}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter channel name"
                  />
                  {channelForm.formState.errors.name && (
                    <p className="text-red-400 text-sm mt-1">
                      {channelForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select onValueChange={(value) => channelForm.setValue('category', value)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-white hover:bg-slate-600">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {channelForm.formState.errors.category && (
                    <p className="text-red-400 text-sm mt-1">
                      {channelForm.formState.errors.category.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="streamUrl">Stream URL</Label>
                <Input
                  id="streamUrl"
                  {...channelForm.register('streamUrl')}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="https://example.com/stream.m3u8"
                />
                {channelForm.formState.errors.streamUrl && (
                  <p className="text-red-400 text-sm mt-1">
                    {channelForm.formState.errors.streamUrl.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logo">Logo URL (Optional)</Label>
                  <Input
                    id="logo"
                    {...channelForm.register('logo')}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div>
                  <Label htmlFor="quality">Quality</Label>
                  <Select onValueChange={(value) => channelForm.setValue('quality', value as any)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="HD" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="SD" className="text-white hover:bg-slate-600">SD</SelectItem>
                      <SelectItem value="HD" className="text-white hover:bg-slate-600">HD</SelectItem>
                      <SelectItem value="4K" className="text-white hover:bg-slate-600">4K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...channelForm.register('description')}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Channel description..."
                  rows={3}
                />
              </div>

              {/* DRM Protection Section */}
              <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
                <h4 className="text-sm font-semibold text-blue-400">🔒 DRM Protected Content</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable DRM Protection</Label>
                    <div className="text-sm text-gray-400">For encrypted channels with clearkey DRM</div>
                  </div>
                  <Switch
                    checked={channelForm.watch('isDrmProtected') || false}
                    onCheckedChange={(checked) => channelForm.setValue('isDrmProtected', checked)}
                  />
                </div>

                {channelForm.watch('isDrmProtected') && (
                  <div className="space-y-3 pl-6 border-l-2 border-blue-500">
                    <div>
                      <Label htmlFor="manifestUrl" className="text-sm text-blue-300">Manifest URL (.mpd)</Label>
                      <Input
                        id="manifestUrl"
                        {...channelForm.register('manifestUrl')}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="https://example.cloudfront.net/manifest.mpd"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="drmKeyId" className="text-sm text-blue-300">DRM Key ID</Label>
                        <Input
                          id="drmKeyId"
                          {...channelForm.register('drmKeyId')}
                          className="bg-slate-700 border-slate-600 text-white font-mono text-xs"
                          placeholder="fbbfd9ce4bbe4d818b16df7dfe89f05b"
                        />
                      </div>

                      <div>
                        <Label htmlFor="drmKey" className="text-sm text-blue-300">DRM Key</Label>
                        <Input
                          id="drmKey"
                          {...channelForm.register('drmKey')}
                          className="bg-slate-700 border-slate-600 text-white font-mono text-xs"
                          placeholder="1e96d0f88ef740e982d6f6105721c8bc"
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 bg-blue-900/20 p-2 rounded border-l-4 border-blue-500">
                      💡 <strong>DRM Example:</strong> Zee Bangla Cinema uses manifest URL with clearkey DRM credentials
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsChannelDialogOpen(false);
                    setEditingChannel(null);
                    channelForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createChannelMutation.isPending || updateChannelMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createChannelMutation.isPending || updateChannelMutation.isPending ? 'Saving...' : 'Save Channel'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}