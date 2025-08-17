import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Key, Lock, Unlock } from "lucide-react";

interface KeyAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (key: string, keyInfo?: any) => void;
}

export function KeyAuthDialog({ isOpen, onClose, onSuccess }: KeyAuthDialogProps) {
  const [accessKey, setAccessKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerifyKey = async () => {
    if (!accessKey.trim()) {
      toast({
        title: "Key Required",
        description: "Please enter your access key.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch('/api/verify-access-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessKey }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store the key in localStorage for session persistence
        localStorage.setItem('tplay_access_key', accessKey);
        localStorage.setItem('tplay_key_expires', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString()); // 30 days
        
        // Store key info if available
        if (data.keyInfo) {
          localStorage.setItem('tplay_key_info', JSON.stringify(data.keyInfo));
        }
        
        toast({
          title: "Access Granted ✓",
          description: "Successfully gained access to all channels!",
          duration: 3000,
        });
        
        onSuccess(accessKey, data.keyInfo);
        onClose();
      } else {
        toast({
          title: "Invalid Key ❌",
          description: data.message || "Invalid access key. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Connection error with server.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerifyKey();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
            Key Setup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <div className="space-y-2">
            <Label htmlFor="accessKey" className="text-gray-300 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Access Key
            </Label>
            <Input
              id="accessKey"
              type="password"
              placeholder="Enter your access key..."
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-slate-700 border-slate-600 text-white placeholder-gray-400"
              disabled={isVerifying}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={onClose}
              className="flex-1 bg-slate-700 text-white hover:bg-slate-600 border-slate-600"
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyKey}
              disabled={isVerifying}
              className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-medium"
            >
              {isVerifying ? "Verifying..." : "Verify Key"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}