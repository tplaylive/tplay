import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Backend from "@/pages/backend";
import Admin from "@/pages/admin";
import ProtectedWorkerDashboard from "@/components/protected-worker-dashboard";
import NotFound from "@/pages/not-found";
import { TVRemoteHandler, TVRemoteIndicator } from "@/components/tv-remote-handler";
import { TVRemoteHelpButton } from "@/components/tv-navigation-overlay";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/backend" component={Backend} />
      <Route path="/admin" component={Admin} />
      <Route path="/worker" component={ProtectedWorkerDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-black text-white app-container" style={{ backgroundColor: '#0a0a0a', color: 'white', minHeight: '100vh' }}>
          <Toaster />
          <TVRemoteHandler />
          <TVRemoteIndicator />
          <TVRemoteHelpButton />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
