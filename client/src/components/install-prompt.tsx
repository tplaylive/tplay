import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Handle PWA install prompt for Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install prompt after 30 seconds on first visit
      setTimeout(() => {
        if (!standalone && !localStorage.getItem('installPromptDismissed')) {
          setShowInstallPrompt(true);
        }
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if user dismissed prompt before
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (!dismissed && !standalone) {
      // Show iOS install instructions if on iOS
      if (iOS) {
        setTimeout(() => setShowInstallPrompt(true), 30000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt && !isIOS) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      } catch (error) {
        console.error('Error installing app:', error);
      }
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  if (isStandalone || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-4 rounded-lg shadow-xl text-white">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center">
            <Download className="w-5 h-5 mr-2" />
            <h3 className="font-semibold">Install T PLAY App</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-sm text-white/90 mb-3">
          {isIOS 
            ? "Add T PLAY to your home screen for the best experience!"
            : "Install T PLAY for faster access and offline viewing!"
          }
        </p>

        {isIOS ? (
          <div className="text-sm text-white/90">
            <p className="mb-2">To install:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Tap the share button ⬆️</li>
              <li>Select "Add to Home Screen"</li>
              <li>Tap "Add" to install</li>
            </ol>
          </div>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              Not Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}