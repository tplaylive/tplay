import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Key, User, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [adminForm, setAdminForm] = useState({
    username: "",
    password: "", 
    secretKey: ""
  });

  const [backendForm, setBackendForm] = useState({
    username: "",
    password: ""
  });

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Login Successful",
          description: `Welcome ${data.user.username} (${data.user.role})`,
        });
        onLoginSuccess();
      } else {
        toast({
          title: "Login Failed", 
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackendLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/backend/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendForm),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Backend Access Granted",
          description: `Welcome ${data.access.username}`,
        });
        onLoginSuccess();
      } else {
        toast({
          title: "Access Denied",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/40 backdrop-blur-lg border-gray-600">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                T PLAY
              </span>
            </h1>
          </div>
          <CardTitle className="text-white">Backend Access</CardTitle>
          <CardDescription className="text-gray-300">
            Login to manage T PLAY platform
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="admin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="admin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600">
                <Shield className="w-4 h-4 mr-2" />
                Admin/Moderator
              </TabsTrigger>
              <TabsTrigger value="backend" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600">
                <Key className="w-4 h-4 mr-2" />
                Backend Access
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-username" className="text-gray-200 flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Username
                  </Label>
                  <Input
                    id="admin-username"
                    type="text"
                    placeholder="tplaybd"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({...adminForm, username: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-gray-200 flex items-center">
                    <Lock className="w-4 h-4 mr-1" />
                    Password
                  </Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-secret" className="text-gray-200 flex items-center">
                    <Key className="w-4 h-4 mr-1" />
                    Secret Key
                  </Label>
                  <Input
                    id="admin-secret"
                    type="password"
                    placeholder="Secret key (for admin)"
                    value={adminForm.secretKey}
                    onChange={(e) => setAdminForm({...adminForm, secretKey: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Admin Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="backend" className="space-y-4">
              <form onSubmit={handleBackendLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backend-username" className="text-gray-200 flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Username
                  </Label>
                  <Input
                    id="backend-username"
                    type="text"
                    placeholder="tplayback"
                    value={backendForm.username}
                    onChange={(e) => setBackendForm({...backendForm, username: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backend-password" className="text-gray-200 flex items-center">
                    <Lock className="w-4 h-4 mr-1" />
                    Password
                  </Label>
                  <Input
                    id="backend-password"
                    type="password"
                    placeholder="••••••••"
                    value={backendForm.password}
                    onChange={(e) => setBackendForm({...backendForm, password: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Connecting..." : "Backend Access"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-4 border-t border-gray-600">
            <p className="text-xs text-gray-400 text-center">
              Secure authentication system for T PLAY platform management
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}