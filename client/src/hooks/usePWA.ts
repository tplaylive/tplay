import { useState, useEffect } from 'react';

interface PWAInfo {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  platform: string;
}

export function usePWA(): PWAInfo {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [platform, setPlatform] = useState('unknown');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const iOS = /ipad|iphone|ipod/.test(userAgent);
    const android = /android/.test(userAgent);
    const chrome = /chrome/.test(userAgent);
    
    setIsIOS(iOS);
    
    if (iOS) {
      setPlatform('ios');
    } else if (android) {
      setPlatform('android');
    } else if (chrome) {
      setPlatform('chrome');
    } else {
      setPlatform('browser');
    }

    // Check if app is running in standalone mode (installed)
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const webAppCapable = (window.navigator as any).standalone;
    
    setIsStandalone(standalone || webAppCapable);
    setIsInstalled(standalone || webAppCapable);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setIsInstallable(true);
      
      // Store the event for later use
      (window as any).deferredPrompt = e;
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setIsStandalone(true);
      console.log('T PLAY app was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    isInstallable,
    isInstalled,
    isStandalone,
    isIOS,
    platform
  };
}

export async function installPWA(): Promise<boolean> {
  const deferredPrompt = (window as any).deferredPrompt;
  
  if (!deferredPrompt) {
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    // Clear the stored prompt
    (window as any).deferredPrompt = null;
    
    return outcome === 'accepted';
  } catch (error) {
    console.error('Error installing PWA:', error);
    return false;
  }
}