import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BackendAccess() {
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex gap-2">
        <Button
          onClick={() => window.open('/worker', '_blank')}
          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg shadow-lg border border-white/20"
        >
          <Settings className="w-4 h-4 mr-2" />
          Worker Panel
        </Button>
        
        <Button
          onClick={() => window.open('/test-worker', '_blank')}
          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg shadow-lg border border-white/20"
        >
          API Test
        </Button>
      </div>
      
      <div className="mt-2 text-xs text-white/70 text-right">
        Backend Access
      </div>
    </div>
  );
}