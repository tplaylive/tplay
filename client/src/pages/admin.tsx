import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, User, Key } from 'lucide-react';
import AdminDashboard from '@/components/admin-dashboard';

export default function Admin() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    secretKey: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check if already authenticated
  const { data: authStatus, isLoading: authLoading } = useQuery({
    queryKey: ['/api/auth/status'],
    retry: false,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({ 
          title: 'Login Successful', 
          description: `Welcome back, ${result.user.username}!` 
        });
        // Refresh auth status
        window.location.reload();
      } else {
        toast({ 
          title: 'Login Failed', 
          description: result.message || 'Invalid credentials', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({ 
        title: 'Login Error', 
        description: 'Something went wrong. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        toast({ title: 'Logged Out', description: 'You have been logged out successfully.' });
        window.location.reload();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  // If authenticated, show admin dashboard
  if (authStatus?.admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">T PLAY Admin Dashboard</h1>
              <p className="text-purple-300">Welcome back, {authStatus.admin.username}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-500/20"
            >
              Logout
            </Button>
          </div>

          {/* Dashboard */}
          <AdminDashboard 
            userRole={authStatus.admin.role} 
            username={authStatus.admin.username} 
          />
        </div>
      </div>
    );
  }

  // Show login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">T PLAY Admin</CardTitle>
            <CardDescription className="text-gray-400">
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-300 flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                placeholder="Enter username"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                placeholder="Enter password"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secretKey" className="text-gray-300 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Secret Key
              </Label>
              <Input
                id="secretKey"
                type="password"
                value={credentials.secretKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, secretKey: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                placeholder="Enter secret key"
                required
              />
            </div>
            
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Protected by T PLAY Security System
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}