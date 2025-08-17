import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Shield, LockIcon, KeyIcon, Settings, LogOut, Plus, Users, Database, TrendingUp } from 'lucide-react';
import AdminDashboard from '@/components/admin-dashboard';
import { ModeratorDashboard } from '@/components/moderator-dashboard';

interface AuthStatus {
  backend?: { username: string };
  admin?: { id: number; username: string; role: 'admin' | 'moderator' };
}

export default function BackendPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [currentStep, setCurrentStep] = useState<'backend' | 'admin' | 'dashboard'>('backend');
  const [isLoading, setIsLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
    secretKey: '',
    roleType: 'admin' as 'admin' | 'moderator'
  });
  const { toast } = useToast();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      setAuthStatus(data);
      
      if (data.backend && data.admin) {
        // Both authenticated - force dashboard immediately
        setCurrentStep('dashboard');
        console.log('Both auth found - forcing dashboard display');
      } else if (data.backend && !data.admin) {
        // Backend authenticated, need admin
        setCurrentStep('admin');
        console.log('Backend only - showing admin login');
      } else {
        // Need backend first
        setCurrentStep('backend');
        console.log('No auth - showing backend login');
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackendLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/backend/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password
        })
      });

      if (response.ok) {
        toast({
          title: "Backend Access Granted",
          description: "Now select your role to continue",
        });
        
        // Move to admin step
        setCurrentStep('admin');
        setLoginForm({ username: '', password: '', secretKey: '', roleType: 'admin' });
        await checkAuthStatus();
      } else {
        const data = await response.json();
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Backend login error:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = loginForm.roleType === 'admin'
        ? {
            username: loginForm.username,
            password: loginForm.password,
            secretKey: loginForm.secretKey
          }
        : {
            username: loginForm.username,
            password: loginForm.password
          };

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const role = loginForm.roleType === 'admin' ? 'Admin' : 'Moderator';
        toast({
          title: `${role} Access Granted`,
          description: `Welcome ${loginForm.username}! Loading dashboard...`,
        });
        
        // Wait a bit then check auth status and force dashboard
        setTimeout(async () => {
          await checkAuthStatus();
          // Force dashboard step after auth check
          setCurrentStep('dashboard');
        }, 1000);
      } else {
        const data = await response.json();
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthStatus(null);
    setCurrentStep('backend');
    setLoginForm({ username: '', password: '', secretKey: '', roleType: 'admin' });
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading T PLAY Backend...</p>
        </div>
      </div>
    );
  }

  // Dashboard View - Show when step is dashboard OR fully authenticated
  if (currentStep === 'dashboard' || (authStatus?.admin && authStatus?.backend)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  T PLAY
                </span>
              </h1>
              <h2 className="text-2xl font-semibold text-gray-300 mb-2">
                {authStatus.admin.role === 'admin' ? 'Admin Dashboard' : 'Moderator Dashboard'}
              </h2>
              <p className="text-gray-400">
                Welcome {authStatus.admin.username}
                <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                  authStatus.admin.role === 'admin' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-blue-600 text-white'
                }`}>
                  {authStatus.admin.role.toUpperCase()}
                </span>
              </p>
              <div className="text-sm text-gray-500 mt-1">
                {authStatus.admin.role === 'admin' 
                  ? 'Full system access with all administrative privileges'
                  : 'Channel management access with content moderation tools'
                }
              </div>
            </div>

            <Button onClick={handleLogout} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-900/20">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Role-based Dashboard */}
          {authStatus.admin.role === 'admin' ? (
            <AdminDashboard 
              userRole={authStatus.admin.role}
              username={authStatus.admin.username}
            />
          ) : (
            <ModeratorDashboard />
          )}

          <div className="text-center mt-12">
            <p className="text-gray-400 text-sm">T PLAY Backend Management System v2.0</p>
            <p className="text-gray-500 text-xs mt-2">
              {authStatus.admin.role === 'admin' ? 'Administrator Mode - Full Backend Access' : 'Moderator Mode - Channel Management Access'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Backend Login Step
  if (currentStep === 'backend') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="max-w-md w-full bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-blue-900/30 border border-blue-500/50">
                <LockIcon className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                T PLAY Backend
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Step 1: Backend Authentication Required
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-yellow-500/30 bg-yellow-900/20">
              <Shield className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300">
                First authenticate with backend credentials, then select your role
              </AlertDescription>
            </Alert>

            <form onSubmit={handleBackendLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center space-x-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                  <span>Backend Access</span>
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <KeyIcon className="h-4 w-4" />
                    <span>Continue to Step 2</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin/Moderator Login Step
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <Card className="max-w-md w-full bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-green-900/30 border border-green-500/50">
              <Users className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              T PLAY Backend
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Step 2: Admin/Moderator Login (Backend: {authStatus?.backend?.username})
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-green-500/30 bg-green-900/20">
            <Shield className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              Backend access granted. Now login as Admin or Moderator
            </AlertDescription>
          </Alert>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center space-x-2">
                <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</span>
                <span>Backend authenticated</span>
              </Label>
              <Label className="text-slate-300 flex items-center space-x-2">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                <span>Select Role</span>
              </Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={loginForm.roleType === 'admin' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLoginForm(prev => ({ ...prev, roleType: 'admin' }))}
                  className="flex-1"
                >
                  Admin
                </Button>
                <Button
                  type="button"
                  variant={loginForm.roleType === 'moderator' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLoginForm(prev => ({ ...prev, roleType: 'moderator' }))}
                  className="flex-1"
                >
                  Moderator
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">Username</Label>
              <Input
                id="username"
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>

            {loginForm.roleType === 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="secretKey" className="text-slate-300">Secret Key</Label>
                <Input
                  id="secretKey"
                  type="password"
                  value={loginForm.secretKey}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, secretKey: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <KeyIcon className="h-4 w-4" />
                  <span>Complete Authentication</span>
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}