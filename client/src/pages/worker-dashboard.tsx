import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Plus, BarChart3, Settings } from "lucide-react";

interface WorkerChannel {
  id: number;
  name: string;
  streamUrl: string;
  logo?: string;
  category: string;
  streamFormat: string;
  customName: string;
  isActive: boolean;
  createdAt: string;
}

export default function WorkerDashboard() {
  const [apiKey, setApiKey] = useState("");
  const [workerId, setWorkerId] = useState("worker001");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form states
  const [channelData, setChannelData] = useState({
    name: "",
    streamUrl: "",
    logo: "",
    category: "",
    quality: "HD",
    customName: "",
    description: ""
  });

  // Fetch worker stats
  const { data: stats } = useQuery({
    queryKey: ["/worker/stats", workerId],
    queryFn: async () => {
      const response = await fetch(`/worker/stats?workerId=${workerId}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch worker channels
  const { data: channelsData } = useQuery({
    queryKey: ["/worker/channels"],
    queryFn: async () => {
      const response = await fetch('/worker/channels', {
        headers: {
          'X-API-Key': apiKey,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch channels');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Add channel mutation
  const addChannelMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/worker/channels/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ ...data, workerId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add channel');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Channel added successfully",
      });
      setChannelData({
        name: "",
        streamUrl: "",
        logo: "",
        category: "",
        quality: "HD",
        customName: "",
        description: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/worker/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/worker/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete channel mutation
  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: number) => {
      const response = await fetch(`/worker/channels/${channelId}?workerId=${workerId}`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': apiKey,
        },
      });
      if (!response.ok) throw new Error('Failed to delete channel');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Channel deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/worker/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/worker/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = () => {
    if (!apiKey) {
      toast({
        title: "Error",
        description: "API key required",
        variant: "destructive",
      });
      return;
    }
    setIsAuthenticated(true);
    toast({
      title: "Success",
      description: "Authenticated successfully",
    });
  };

  const handleAddChannel = () => {
    if (!channelData.name || !channelData.streamUrl) {
      toast({
        title: "Error",
        description: "Name and stream URL are required",
        variant: "destructive",
      });
      return;
    }
    addChannelMutation.mutate(channelData);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              T PLAY Worker Dashboard
            </CardTitle>
            <CardDescription>
              Channel Management System
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="workerId">Worker ID</Label>
              <Input
                id="workerId"
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                placeholder="worker001"
              />
            </div>
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
              />
            </div>
            <Button 
              onClick={handleLogin} 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
            >
              Login
            </Button>
            <div className="text-sm text-gray-500 text-center">
              Demo API Key: <code className="bg-gray-100 px-2 py-1 rounded">worker_demo_key_2025</code>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const workerChannels = channelsData?.data?.customChannels?.filter(
    (ch: WorkerChannel) => ch.userId === `worker_${workerId}`
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              T PLAY Worker Dashboard
            </h1>
            <p className="text-white/70 mt-1">Worker ID: {workerId}</p>
          </div>
          <Button 
            onClick={() => setIsAuthenticated(false)}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Logout
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="add-channel" className="data-[state=active]:bg-white/20">
              <Plus className="w-4 h-4 mr-2" />
              Add Channel
            </TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-white/20">
              <Settings className="w-4 h-4 mr-2" />
              Manage Channels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold">{stats?.data?.totalChannels || 0}</div>
                  <p className="text-white/70">Total Channels</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold">{stats?.data?.activeChannels || 0}</div>
                  <p className="text-white/70">Active Channels</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold">
                    {Object.keys(stats?.data?.categoryBreakdown || {}).length}
                  </div>
                  <p className="text-white/70">Categories</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold">
                    {Object.keys(stats?.data?.formatBreakdown || {}).length}
                  </div>
                  <p className="text-white/70">Formats</p>
                </CardContent>
              </Card>
            </div>

            {stats?.data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-white/10 border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Category Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.data.categoryBreakdown).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-white/90">{category}</span>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Stream Formats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.data.formatBreakdown).map(([format, count]) => (
                        <div key={format} className="flex items-center justify-between">
                          <span className="text-white/90">{format}</span>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="add-channel" className="space-y-4">
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Add New Channel</CardTitle>
                <CardDescription className="text-white/70">
                  Stream format and category will be auto-detected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-white">Channel Name *</Label>
                    <Input
                      id="name"
                      value={channelData.name}
                      onChange={(e) => setChannelData(prev => ({...prev, name: e.target.value}))}
                      placeholder="e.g. Star Sports 1 HD"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customName" className="text-white">Custom Name</Label>
                    <Input
                      id="customName"
                      value={channelData.customName}
                      onChange={(e) => setChannelData(prev => ({...prev, customName: e.target.value}))}
                      placeholder="Optional display name"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="streamUrl" className="text-white">Stream URL *</Label>
                  <Input
                    id="streamUrl"
                    value={channelData.streamUrl}
                    onChange={(e) => setChannelData(prev => ({...prev, streamUrl: e.target.value}))}
                    placeholder="https://example.com/stream.m3u8"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="logo" className="text-white">Logo URL</Label>
                    <Input
                      id="logo"
                      value={channelData.logo}
                      onChange={(e) => setChannelData(prev => ({...prev, logo: e.target.value}))}
                      placeholder="https://example.com/logo.png"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-white">Category (Auto-detected)</Label>
                    <Select
                      value={channelData.category}
                      onValueChange={(value) => setChannelData(prev => ({...prev, category: value}))}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Auto-detect" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="News">News</SelectItem>
                        <SelectItem value="Sports">Sports</SelectItem>
                        <SelectItem value="Entertainment">Entertainment</SelectItem>
                        <SelectItem value="Movies">Movies</SelectItem>
                        <SelectItem value="Music">Music</SelectItem>
                        <SelectItem value="Kids">Kids</SelectItem>
                        <SelectItem value="Regional">Regional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="quality" className="text-white">Quality</Label>
                    <Select
                      value={channelData.quality}
                      onValueChange={(value) => setChannelData(prev => ({...prev, quality: value}))}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HD">HD</SelectItem>
                        <SelectItem value="SD">SD</SelectItem>
                        <SelectItem value="FHD">FHD</SelectItem>
                        <SelectItem value="4K">4K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Input
                    id="description"
                    value={channelData.description}
                    onChange={(e) => setChannelData(prev => ({...prev, description: e.target.value}))}
                    placeholder="Channel description (helps with auto-categorization)"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <Button 
                  onClick={handleAddChannel}
                  disabled={addChannelMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                >
                  {addChannelMutation.isPending ? "Adding..." : "Add Channel"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Your Channels ({workerChannels.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workerChannels.map((channel: WorkerChannel) => (
                    <div key={channel.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-white">{channel.name}</h3>
                          <Badge variant={channel.isActive ? "default" : "secondary"}>
                            {channel.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="text-white/70 border-white/30">
                            {channel.category}
                          </Badge>
                          <Badge variant="outline" className="text-white/70 border-white/30">
                            {channel.streamFormat}
                          </Badge>
                        </div>
                        <p className="text-sm text-white/70 truncate">{channel.streamUrl}</p>
                        <p className="text-xs text-white/50 mt-1">
                          Added: {new Date(channel.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => deleteChannelMutation.mutate(channel.id)}
                        disabled={deleteChannelMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {workerChannels.length === 0 && (
                    <div className="text-center py-8 text-white/70">
                      No channels added yet. Go to "Add Channel" tab to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}