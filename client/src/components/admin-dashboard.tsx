import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Activity, 
  BarChart3, 
  Eye, 
  History, 
  Settings,
  UserPlus,
  TrendingUp,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  GripVertical,
  Key
} from 'lucide-react';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { KeyManagement } from '@/components/key-management';
import { ChannelAccessManagement } from '@/components/channel-access-management';

// Drag and drop imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Form schemas
const channelSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  streamUrl: z.string().url('Must be a valid URL'),
  category: z.string().min(1, 'Category is required'),
  logo: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  quality: z.string().default('HD'),
  // DRM Support fields
  streamFormat: z.string().default('HLS'),
  isDrmProtected: z.boolean().default(false),
  drmKeyId: z.string().optional(),
  drmKey: z.string().optional(),
  manifestUrl: z.string().url().optional().or(z.literal('')),
});

const moderatorSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.literal('moderator'),
  secretKey: z.string().min(1, 'Secret key is required'),
});

// Sortable Channel Item Component
function SortableChannelItem({ channel, onEdit, onDelete }: { 
  channel: any; 
  onEdit: (channel: any) => void; 
  onDelete: (id: number) => void; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1 hover:bg-slate-600 rounded"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
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
          </div>
        </div>
        <div className="flex space-x-1">
          <Button
            onClick={() => onEdit(channel)}
            variant="ghost"
            size="sm"
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onDelete(channel.id)}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center space-x-4 text-sm text-gray-400">
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
  );
}

interface AdminDashboardProps {
  userRole: 'admin' | 'moderator';
  username: string;
}

export default function AdminDashboard({ userRole, username }: AdminDashboardProps) {
  const [selectedTab, setSelectedTab] = useState('channels');
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [isModeratorDialogOpen, setIsModeratorDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [editingModerator, setEditingModerator] = useState<any>(null);
  const [channelOrder, setChannelOrder] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch data
  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['/api/channels'],
  });

  // Update local channel order when channels data changes
  useEffect(() => {
    if (channels.length > 0 && channelOrder.length === 0) {
      setChannelOrder(channels);
    }
  }, [channels, channelOrder.length]);

  const { data: moderatorsData } = useQuery({
    queryKey: ['/api/admin/moderators'],
    enabled: userRole === 'admin',
  });
  const moderators = moderatorsData?.moderators || [];

  const { data: websiteStats = [] } = useQuery({
    queryKey: ['/api/admin/stats/website'],
    enabled: userRole === 'admin',
    retry: false,
  });

  const { data: moderatorActivity = [] } = useQuery({
    queryKey: ['/api/admin/activity'],
    enabled: userRole === 'admin',
    retry: false,
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['/api/admin/sessions'],
    enabled: userRole === 'admin',
    retry: false,
  });

  const { data: channelHistory = [] } = useQuery({
    queryKey: ['/api/admin/channel-history'],
    retry: false,
  });

  // Forms
  const channelForm = useForm({
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

  const moderatorForm = useForm({
    resolver: zodResolver(moderatorSchema),
    defaultValues: {
      username: '',
      password: '',
      role: 'moderator' as const,
      secretKey: '',
    },
  });

  // Mutations
  const createChannelMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create channel');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/channel-history'] });
      setIsChannelDialogOpen(false);
      channelForm.reset();
      toast({ title: 'Success', description: 'Channel created successfully' });
    },
    onError: (error) => {
      console.error('Create error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      // Use regular routes instead of admin routes for channel operations
      const response = await fetch(`/api/channels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update channel');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/channel-history'] });
      setIsChannelDialogOpen(false);
      setEditingChannel(null);
      channelForm.reset();
      toast({ title: 'Success', description: 'Channel updated successfully' });
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/channels/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete channel');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/channel-history'] });
      toast({ title: 'Success', description: 'Channel deleted successfully' });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Channel reorder mutation
  const reorderChannelsMutation = useMutation({
    mutationFn: async (channelIds: number[]) => {
      console.log('Sending reorder request with IDs:', channelIds);
      
      const response = await fetch('/api/admin/channels/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ channelIds }),
      });

      console.log('Reorder response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Reorder failed:', errorData);
        throw new Error(errorData.message || 'Failed to reorder channels');
      }

      const result = await response.json();
      console.log('Reorder success:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Channel reorder mutation succeeded');
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      toast({ title: 'Success', description: 'Channels reordered successfully! 📌' });
    },
    onError: (error: any) => {
      console.error('Reorder mutation error:', error);
      toast({ 
        title: 'Reorder Failed', 
        description: error.message || 'Could not reorder channels', 
        variant: 'destructive' 
      });
      // Revert the visual order on error
      if (channels) {
        setChannelOrder([...channels]);
      }
    },
  });

  const createModeratorMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating moderator with data:', data);
      const response = await fetch('/api/admin/moderators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Moderator creation failed:', errorText);
        throw new Error(errorText || 'Failed to create moderator');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Moderator created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderators'] });
      setIsModeratorDialogOpen(false);
      setEditingModerator(null);
      moderatorForm.reset({ username: '', password: '', role: 'moderator', secretKey: '' });
      toast({ 
        title: 'Success ✓', 
        description: `Moderator "${data.username || 'New moderator'}" created successfully!`,
        duration: 3000
      });
    },
    onError: (error) => {
      console.error('Create moderator error:', error);
      let errorMessage = error.message;
      
      // Handle specific error cases with Bengali messages
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        errorMessage = 'এই username টি ইতিমধ্যে ব্যবহৃত হয়েছে। অন্য username ব্যবহার করুন।';
      } else if (error.message.includes('Failed to create moderator')) {
        errorMessage = 'Moderator তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
      }
      
      toast({ 
        title: 'Error ❌', 
        description: errorMessage, 
        variant: 'destructive',
        duration: 4000
      });
    },
  });

  // Update moderator mutation
  const updateModeratorMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      console.log('Updating moderator with data:', { id, ...data });
      const response = await fetch(`/api/admin/moderators/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update moderator');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderators'] });
      setIsModeratorDialogOpen(false);
      setEditingModerator(null);
      moderatorForm.reset({ username: '', password: '', role: 'moderator', secretKey: '' });
      toast({ 
        title: 'Success ✓', 
        description: 'Moderator updated successfully!',
        duration: 3000
      });
    },
    onError: (error) => {
      console.error('Update moderator error:', error);
      let errorMessage = error.message;
      
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        errorMessage = 'এই username টি ইতিমধ্যে ব্যবহৃত হয়েছে। অন্য username ব্যবহার করুন।';
      }
      
      toast({ 
        title: 'Error ❌', 
        description: errorMessage, 
        variant: 'destructive',
        duration: 4000
      });
    },
  });

  // Delete moderator mutation
  const deleteModeratorMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/moderators/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete moderator');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderators'] });
      toast({ 
        title: 'Success ✓', 
        description: 'Moderator deleted successfully!',
        duration: 3000
      });
    },
    onError: (error) => {
      console.error('Delete moderator error:', error);
      toast({ 
        title: 'Delete Error ❌', 
        description: error.message || 'Moderator delete করতে সমস্যা হয়েছে।', 
        variant: 'destructive',
        duration: 4000
      });
    },
  });

  const handleChannelSubmit = (data: any) => {
    if (editingChannel) {
      updateChannelMutation.mutate({ id: editingChannel.id, ...data });
    } else {
      createChannelMutation.mutate(data);
    }
  };

  const handleModeratorSubmit = (data: any) => {
    if (editingModerator) {
      updateModeratorMutation.mutate({ id: editingModerator.id, ...data });
    } else {
      createModeratorMutation.mutate(data);
    }
  };

  const handleEditModerator = (moderator: any) => {
    setEditingModerator(moderator);
    moderatorForm.reset({
      username: moderator.username,
      password: '', // Don't prefill password for security
      role: moderator.role,
      secretKey: '', // Don't prefill secret key for security
    });
    setIsModeratorDialogOpen(true);
  };

  const handleDeleteModerator = (id: number) => {
    if (confirm('Are you sure you want to delete this moderator? This action cannot be undone.')) {
      deleteModeratorMutation.mutate(id);
    }
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

  // Drag and drop handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag ended:', { activeId: active.id, overId: over?.id });

    if (over && active.id !== over.id) {
      const activeIndex = channelOrder.findIndex((channel) => channel.id === active.id);
      const overIndex = channelOrder.findIndex((channel) => channel.id === over.id);

      console.log('Moving channel from index', activeIndex, 'to index', overIndex);

      if (activeIndex !== -1 && overIndex !== -1) {
        const newOrder = arrayMove(channelOrder, activeIndex, overIndex);
        setChannelOrder(newOrder);

        // Send reorder request to backend
        const channelIds = newOrder.map(channel => channel.id);
        console.log('New channel order IDs:', channelIds);
        reorderChannelsMutation.mutate(channelIds);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-300">Total Channels</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-200">{channels.length}</div>
            <p className="text-xs text-blue-400">Active streaming channels</p>
          </CardContent>
        </Card>

        {userRole === 'admin' && (
          <>
            <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-300">Active Sessions</CardTitle>
                <Users className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-200">{Array.isArray(activeSessions) ? activeSessions.length : 0}</div>
                <p className="text-xs text-green-400">Currently online users</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-300">Moderators</CardTitle>
                <Shield className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-200">{Array.isArray(moderators) ? moderators.length : 0}</div>
                <p className="text-xs text-purple-400">Active moderator accounts</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border-orange-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-300">Recent Activity</CardTitle>
                <Activity className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-200">{Array.isArray(moderatorActivity) ? moderatorActivity.length : 0}</div>
                <p className="text-xs text-orange-400">Actions last 24h</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Dashboard */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-slate-800 border-slate-700">
          <TabsTrigger value="channels" className="data-[state=active]:bg-blue-600">
            Channels
          </TabsTrigger>
          <TabsTrigger value="access" className="data-[state=active]:bg-indigo-600">
            Access
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-green-600">
            History
          </TabsTrigger>
          {userRole === 'admin' && (
            <>
              <TabsTrigger value="key-management" className="data-[state=active]:bg-yellow-600">
                Keys
              </TabsTrigger>
              <TabsTrigger value="moderators" className="data-[state=active]:bg-purple-600">
                Moderators
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-600">
                Analytics
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Channels Management */}
        <TabsContent value="channels" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-200">Channel Management</h3>
            <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Channel
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingChannel ? 'Edit Channel' : 'Add New Channel'}</DialogTitle>
                </DialogHeader>
                <Form {...channelForm}>
                  <form onSubmit={channelForm.handleSubmit(handleChannelSubmit)} className="max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <FormField
                          control={channelForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Channel Name</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-700 border-slate-600" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={channelForm.control}
                          name="streamUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stream URL</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-700 border-slate-600" placeholder="https://..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={channelForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-700 border-slate-600">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="News">News</SelectItem>
                                  <SelectItem value="Sports">Sports</SelectItem>
                                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                                  <SelectItem value="Movies">Movies</SelectItem>
                                  <SelectItem value="Music">Music</SelectItem>
                                  <SelectItem value="Kids">Kids</SelectItem>
                                  <SelectItem value="Religious">Religious</SelectItem>
                                  <SelectItem value="Educational">Educational</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={channelForm.control}
                          name="logo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Logo URL (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-700 border-slate-600" placeholder="https://..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Right Column */}  
                      <div className="space-y-4">
                        <FormField
                          control={channelForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-700 border-slate-600" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Stream Format Selection */}
                        <FormField
                          control={channelForm.control}
                          name="streamFormat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stream Format</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-700 border-slate-600">
                                    <SelectValue placeholder="Select format" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="HLS">HLS (.m3u8)</SelectItem>
                                  <SelectItem value="DASH">DASH (.mpd)</SelectItem>
                                  <SelectItem value="MPD">MPD Manifest</SelectItem>
                                  <SelectItem value="TS">Transport Stream</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={channelForm.control}
                          name="quality"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quality</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-700 border-slate-600">
                                    <SelectValue placeholder="Select quality" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="SD">SD</SelectItem>
                                  <SelectItem value="HD">HD</SelectItem>
                                  <SelectItem value="4K">4K</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* DRM and Exclusive Settings Section */}
                    <div className="mt-6 space-y-4 border-t border-slate-600 pt-6">
                      <h4 className="text-lg font-semibold text-gray-200">Advanced Settings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* DRM Protection */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <FormLabel>DRM Protected Content</FormLabel>
                            <Switch
                              checked={channelForm.watch('isDrmProtected') || false}
                              onCheckedChange={(checked) => channelForm.setValue('isDrmProtected', checked)}
                            />
                          </div>
                          <p className="text-sm text-gray-400">Enable for encrypted channels with clearkey DRM</p>
                          
                          {channelForm.watch('isDrmProtected') && (
                            <div className="space-y-3 bg-slate-700/30 p-4 rounded-lg">
                              <FormField
                                control={channelForm.control}
                                name="manifestUrl"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>MPD Manifest URL</FormLabel>
                                    <FormControl>
                                      <Input {...field} className="bg-slate-700 border-slate-600" placeholder="https://..." />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormField
                                  control={channelForm.control}
                                  name="drmKeyId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>DRM Key ID</FormLabel>
                                      <FormControl>
                                        <Input {...field} className="bg-slate-700 border-slate-600" placeholder="abc123..." />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={channelForm.control}
                                  name="drmKey"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>DRM Key</FormLabel>
                                      <FormControl>
                                        <Input {...field} className="bg-slate-700 border-slate-600" placeholder="def456..." />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Exclusive Channel Settings */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <FormLabel>T PLAY Exclusive</FormLabel>
                            <Switch
                              checked={channelForm.watch('isExclusive') || false}
                              onCheckedChange={(checked) => channelForm.setValue('isExclusive', checked)}
                            />
                          </div>
                          <p className="text-sm text-gray-400">Mark as exclusive T PLAY content</p>
                          
                          {channelForm.watch('isExclusive') && (
                            <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
                              <FormField
                                control={channelForm.control}
                                name="exclusiveTag"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Exclusive Tag</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="bg-slate-700 border-slate-600">
                                          <SelectValue placeholder="Select tag" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="T PLAY EXCLUSIVE">T PLAY EXCLUSIVE</SelectItem>
                                        <SelectItem value="T PLAY PREMIUM">T PLAY PREMIUM</SelectItem>
                                        <SelectItem value="T PLAY ORIGINAL">T PLAY ORIGINAL</SelectItem>
                                        <SelectItem value="T PLAY LIVE">T PLAY LIVE</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </div>
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
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-400">
              📌 Admin can drag channels to reorder them. Drag the grip icon (⋮⋮) to change channel order.
            </p>
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={channelOrder.map(channel => channel.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {channelsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-slate-700 rounded-lg h-20"></div>
                    </div>
                  ))
                ) : channelOrder.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No channels found</div>
                ) : (
                  channelOrder.map((channel: any) => (
                    <SortableChannelItem
                      key={channel.id}
                      channel={channel}
                      onEdit={handleEditChannel}
                      onDelete={handleDeleteChannel}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </TabsContent>

        {/* Channel Access Management */}
        <TabsContent value="access" className="space-y-4">
          <ChannelAccessManagement />
        </TabsContent>

        {/* Channel History */}
        <TabsContent value="history" className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-200">Channel History</h3>
          <div className="space-y-2">
            {!Array.isArray(channelHistory) || channelHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No history found</div>
            ) : (
              channelHistory.map((entry: any) => (
                <Card key={entry.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          entry.action === 'created' ? 'bg-green-500' :
                          entry.action === 'updated' ? 'bg-blue-500' :
                          entry.action === 'deleted' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <div>
                          <div className="text-sm font-medium text-gray-200">
                            {entry.action === 'created' && '📺 Channel Created'}
                            {entry.action === 'updated' && '✏️ Channel Updated'}
                            {entry.action === 'deleted' && '🗑️ Channel Deleted'}
                          </div>
                          <div className="text-xs text-gray-400">
                            by {entry.performedByUsername} • {new Date(entry.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        ID: {entry.channelId}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Moderator Management (Admin only) */}
        {userRole === 'admin' && (
          <TabsContent value="moderators" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-200">Moderator Management</h3>
              <Dialog open={isModeratorDialogOpen} onOpenChange={setIsModeratorDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingModerator(null);
                      moderatorForm.reset({ username: '', password: '', role: 'moderator', secretKey: '' });
                      setIsModeratorDialogOpen(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Moderator
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingModerator ? 'Edit Moderator' : 'Create New Moderator'}</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      {editingModerator ? 'Update moderator information' : 'Add a new moderator to help manage the platform'}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...moderatorForm}>
                    <form onSubmit={moderatorForm.handleSubmit(handleModeratorSubmit)} className="space-y-4">
                      <FormField
                        control={moderatorForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} className="bg-slate-700 border-slate-600" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={moderatorForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" className="bg-slate-700 border-slate-600" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={moderatorForm.control}
                        name="secretKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secret Key</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" placeholder="Enter admin secret key" className="bg-slate-700 border-slate-600" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => {
                          setIsModeratorDialogOpen(false);
                          setEditingModerator(null);
                          moderatorForm.reset({ username: '', password: '', role: 'moderator', secretKey: '' });
                        }}>
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createModeratorMutation.isPending || updateModeratorMutation.isPending} 
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {(createModeratorMutation.isPending || updateModeratorMutation.isPending) 
                            ? (editingModerator ? 'Updating...' : 'Creating...') 
                            : (editingModerator ? 'Update Moderator' : 'Create Moderator')
                          }
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {Array.isArray(moderators) && moderators.map((moderator: any) => (
                <Card key={moderator.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-200">{moderator.username}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
                            Moderator
                          </Badge>
                          <span>•</span>
                          <span>Created {new Date(moderator.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={moderator.isActive ? "default" : "destructive"}>
                        {moderator.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        onClick={() => handleEditModerator(moderator)}
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteModerator(moderator.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Key Management Tab (Admin only) */}
        {userRole === 'admin' && (
          <TabsContent value="key-management" className="space-y-4">
            <KeyManagement />
          </TabsContent>
        )}

        {/* Analytics (Admin only) */}
        {userRole === 'admin' && (
          <TabsContent value="analytics" className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">Website Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-green-300">Active Sessions</CardTitle>
                  <CardDescription>Currently online users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(activeSessions) && activeSessions.length > 0 ? (
                      activeSessions.slice(0, 5).map((session: any) => (
                        <div key={session.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-300">{session.userType || 'User'}</span>
                          <span className="text-gray-400">{session.ipAddress || 'Unknown'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400">No active sessions</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-blue-300">Recent Activity</CardTitle>
                  <CardDescription>Latest moderator actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(moderatorActivity) && moderatorActivity.length > 0 ? (
                      moderatorActivity.slice(0, 5).map((activity: any) => (
                        <div key={activity.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-300">{activity.action}</span>
                          <span className="text-gray-400">{activity.moderatorUsername}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400">No recent activity</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}