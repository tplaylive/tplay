import { useState, useEffect } from 'react';

interface KeyInfo {
  maxDevices: number;
  devicesUsed: number;
  expiryDate: string;
}

export function useKeyAuth() {
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('useKeyAuth - Component mounted, checking stored key...');
    checkStoredKey();
  }, []);

  const checkStoredKey = () => {
    const storedKey = localStorage.getItem('tplay_access_key');
    const keyExpires = localStorage.getItem('tplay_key_expires');
    const storedKeyInfo = localStorage.getItem('tplay_key_info');
    
    console.log('checkStoredKey - storedKey:', storedKey);
    console.log('checkStoredKey - keyExpires:', keyExpires);
    console.log('checkStoredKey - storedKeyInfo:', storedKeyInfo);
    
    if (storedKey && keyExpires) {
      const expiryTime = parseInt(keyExpires);
      if (Date.now() < expiryTime) {
        setAccessKey(storedKey);
        setHasFullAccess(true);
        if (storedKeyInfo) {
          try {
            const parsedInfo = JSON.parse(storedKeyInfo);
            setKeyInfo(parsedInfo);
          } catch (e) {
            console.error('Failed to parse stored key info:', e);
          }
        }
      } else {
        // Key expired, remove from storage
        localStorage.removeItem('tplay_access_key');
        localStorage.removeItem('tplay_key_expires');
        localStorage.removeItem('tplay_key_info');
      }
    }
    
    setIsLoading(false);
  };

  const setKey = (key: string, info?: KeyInfo) => {
    setAccessKey(key);
    setHasFullAccess(true);
    setKeyInfo(info || null);
  };

  const clearKey = () => {
    setAccessKey(null);
    setHasFullAccess(false);
    setKeyInfo(null);
    // Don't clear localStorage here, let the component handle it
  };

  return {
    hasFullAccess,
    accessKey,
    keyInfo,
    isLoading,
    setKey,
    clearKey,
    checkStoredKey
  };
}