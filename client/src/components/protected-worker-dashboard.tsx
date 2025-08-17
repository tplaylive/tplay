import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldIcon, LockIcon, KeyIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import WorkerDashboard from "@/pages/worker-dashboard";

interface AuthState {
  isAuthenticated: boolean;
  authType: 'none' | 'admin' | 'backend';
  authStep: 'backend' | 'admin_moderator'; // Two-step authentication
  user?: {
    username: string;
    role?: string;
  };
}

export default function ProtectedWorkerDashboard() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    authType: 'none',
    authStep: 'backend'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
    secretKey: '',
    authType: 'backend' // Will be controlled by authStep
  });
  const { toast } = useToast();

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      
      if (data.backend && data.admin) {
        // Both backend and admin authenticated - full access
        setAuthState({
          isAuthenticated: true,
          authType: 'admin',
          authStep: 'admin_moderator',
          user: { username: data.admin.username, role: data.admin.role }
        });
      } else if (data.backend && !data.admin) {
        // Only backend authenticated - need admin/moderator login
        setAuthState({
          isAuthenticated: false,
          authType: 'backend',
          authStep: 'admin_moderator',
          user: { username: data.backend.username }
        });
      } else if (data.admin && !data.backend) {
        // Admin without backend - redirect to backend first
        setAuthState({
          isAuthenticated: false,
          authType: 'none',
          authStep: 'backend'
        });
      } else {
        // No authentication
        setAuthState({
          isAuthenticated: false,
          authType: 'none',
          authStep: 'backend'
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        isAuthenticated: false,
        authType: 'none'
      });
    }
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let endpoint, payload;
      
      if (authState.authStep === 'backend') {
        // Step 1: Backend login
        endpoint = '/api/backend/login';
        payload = {
          username: loginForm.username,
          password: loginForm.password
        };
      } else {
        // Step 2: Admin/Moderator login
        endpoint = '/api/admin/login';
        payload = loginForm.authType === 'admin' 
          ? {
              username: loginForm.username,
              password: loginForm.password,
              secretKey: loginForm.secretKey
            }
          : {
              username: loginForm.username,
              password: loginForm.password
            };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (authState.authStep === 'backend') {
          // Backend login successful - move to admin/moderator step
          toast({
            title: "Backend Access Granted",
            description: "Now please login as Admin or Moderator",
          });
          
          setAuthState(prev => ({
            ...prev,
            authStep: 'admin_moderator',
            authType: 'backend',
            user: { username: loginForm.username }
          }));
          
          // Clear form for next step
          setLoginForm({
            username: '',
            password: '',
            secretKey: '',
            authType: 'admin'
          });
        } else {
          // Admin/Moderator login successful - full access granted
          toast({
            title: "Full Access Granted",
            description: `Welcome ${loginForm.username}! You now have complete access.`,
          });
          
          // Recheck auth status to update state
          await checkAuthStatus();
        }
      } else {
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Error",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setAuthState({
        isAuthenticated: false,
        authType: 'none',
        authStep: 'backend'
      });
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-96 bg-slate-800/50 border-purple-500/30">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
              <p className="text-slate-300 mt-4">Checking authentication...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show dashboard if authenticated
  if (authState.isAuthenticated) {
    return (
      <div>
        {/* Security header */}
        <div className="bg-green-900/20 border-b border-green-500/30 p-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldIcon className="h-5 w-5 text-green-400" />
              <span className="text-green-300 text-sm">
                Authenticated as {authState.user?.username} ({authState.authType})
              </span>
            </div>
            <Button 
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="text-green-300 border-green-500/30 hover:bg-green-900/30"
            >
              Logout
            </Button>
          </div>
        </div>
        
        {/* Main dashboard */}
        <WorkerDashboard />
      </div>
    );
  }

  // Show login form if not authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-purple-500/30 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-900/30 border border-red-500/50">
              <LockIcon className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            {authState.authStep === 'backend' ? 'Backend Access Required' : 'Admin/Moderator Login Required'}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {authState.authStep === 'backend' 
              ? 'Step 1: First authenticate with backend credentials' 
              : `Step 2: Now login as Admin or Moderator (Backend user: ${authState.user?.username})`
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-yellow-500/30 bg-yellow-900/20">
            <ShieldIcon className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              {authState.authStep === 'backend' 
                ? 'Two-step authentication required: Backend access first, then Admin/Moderator credentials.'
                : 'Backend access granted. Now provide Admin or Moderator credentials for full access.'
              }
            </AlertDescription>
          </Alert>

          <form onSubmit={handleLogin} className="space-y-4">
            {authState.authStep === 'backend' ? (
              // Step 1: Backend authentication only
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center space-x-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                  <span>Backend Access</span>
                </Label>
                <div className="text-sm text-slate-400">
                  First step: Authenticate with backend credentials
                </div>
              </div>
            ) : (
              // Step 2: Admin/Moderator selection
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center space-x-2">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</span>
                  <span>Backend authenticated</span>
                </Label>
                <Label className="text-slate-300 flex items-center space-x-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                  <span>Admin/Moderator Login</span>
                </Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={loginForm.authType === 'admin' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLoginForm(prev => ({ ...prev, authType: 'admin' }))}
                    className="flex-1"
                  >
                    Admin
                  </Button>
                  <Button
                    type="button"
                    variant={loginForm.authType === 'moderator' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLoginForm(prev => ({ ...prev, authType: 'moderator' }))}
                    className="flex-1"
                  >
                    Moderator
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">Username</Label>
              <Input
                id="username"
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                placeholder="Enter username"
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
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                placeholder="Enter password"
                required
              />
            </div>

            {authState.authStep === 'admin_moderator' && loginForm.authType === 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="secretKey" className="text-slate-300">Secret Key</Label>
                <Input
                  id="secretKey"
                  type="password"
                  value={loginForm.secretKey}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, secretKey: e.target.value }))}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                  placeholder="Enter admin secret key"
                  required
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <KeyIcon className="h-4 w-4" />
                  <span>
                    {authState.authStep === 'backend' 
                      ? 'Continue to Step 2' 
                      : 'Complete Authentication'
                    }
                  </span>
                </div>
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-500">
            Need access? Contact system administrator
          </div>
        </CardContent>
      </Card>
    </div>
  );
}