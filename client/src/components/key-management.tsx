import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Key, Calendar, Users, Eye, EyeOff, Trash2, Copy } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AccessKey {
  id: number;
  keyCode: string;
  createdBy: number;
  createdByUsername: string;
  maxDevices: number;
  expiryDate: string;
  isActive: boolean;
  notes: string;
  createdAt: string;
  deviceCount?: number;
}

export function KeyManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<AccessKey | null>(null);
  const [showKeyValues, setShowKeyValues] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    notes: '',
    maxDevices: 5,
    expiryMonths: 1
  });

  // Fetch access keys
  const { data: accessKeys = [], isLoading } = useQuery<AccessKey[]>({
    queryKey: ['/api/admin/access-keys'],
  });

  // Create key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/access-keys', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/access-keys'] });
      setIsCreateDialogOpen(false);
      setFormData({ notes: '', maxDevices: 5, expiryMonths: 1 });
      toast({
        title: "Success",
        description: "Access key created successfully!",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create access key",
        variant: "destructive",
      });
    },
  });

  // Toggle key mutation
  const toggleKeyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest('PUT', `/api/admin/access-keys/${id}/toggle`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/access-keys'] });
      toast({
        title: "Success",
        description: "Key status updated successfully!",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update key status",
        variant: "destructive",
      });
    },
  });

  // Delete key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/access-keys/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/access-keys'] });
      toast({
        title: "Success",
        description: "Access key deleted successfully!",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete access key",
        variant: "destructive",
      });
    },
  });

  const handleCreateKey = () => {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + formData.expiryMonths);
    
    createKeyMutation.mutate({
      notes: formData.notes,
      maxDevices: formData.maxDevices,
      expiryDate: expiryDate.toISOString(),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Access key copied to clipboard",
      duration: 2000,
    });
  };

  const toggleKeyVisibility = (keyId: number) => {
    setShowKeyValues(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isExpired = date < now;
    
    return {
      formatted: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      isExpired
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-200">Access Key Management</h3>
          <p className="text-sm text-gray-400">Manage premium access keys with device limits and expiry dates</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create New Key
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Access Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this key..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              
              <div>
                <Label htmlFor="maxDevices">Max Devices</Label>
                <Select value={formData.maxDevices.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, maxDevices: parseInt(value) }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 10, 15, 20].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num} devices</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="expiryMonths">Expiry Period</Label>
                <Select value={formData.expiryMonths.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, expiryMonths: parseInt(value) }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString()}>
                        {month} month{month > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                  disabled={createKeyMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateKey}
                  disabled={createKeyMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {createKeyMutation.isPending ? "Creating..." : "Create Key"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Access Keys Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Access Keys ({accessKeys.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading access keys...</div>
          ) : accessKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No access keys created yet</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-300">Key Code</TableHead>
                    <TableHead className="text-gray-300">Devices</TableHead>
                    <TableHead className="text-gray-300">Expiry</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Created By</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessKeys.map((key) => {
                    const expiry = formatExpiryDate(key.expiryDate);
                    const isVisible = showKeyValues[key.id];
                    
                    return (
                      <TableRow key={key.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <code className="bg-slate-700 px-2 py-1 rounded text-sm">
                              {isVisible ? key.keyCode : key.keyCode.replace(/.(?=.{4})/g, '*')}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleKeyVisibility(key.id)}
                            >
                              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(key.keyCode)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-300">{key.deviceCount || 0} / {key.maxDevices}</span>
                        </TableCell>
                        <TableCell>
                          <span className={expiry.isExpired ? "text-red-400" : "text-gray-300"}>
                            {expiry.formatted}
                            {expiry.isExpired && <Badge variant="destructive" className="ml-2">Expired</Badge>}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={key.isActive ? "default" : "secondary"}>
                            {key.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">{key.createdByUsername}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleKeyMutation.mutate({ id: key.id, isActive: !key.isActive })}
                              disabled={toggleKeyMutation.isPending}
                            >
                              {key.isActive ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteKeyMutation.mutate(key.id)}
                              disabled={deleteKeyMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}