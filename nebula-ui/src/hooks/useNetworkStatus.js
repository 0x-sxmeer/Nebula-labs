/**
 * useNetworkStatus Hook
 * 
 * HIGH #2: Network Connection Monitoring
 * Detects online/offline status and notifies user
 */

import { useState, useEffect } from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      // Only show reconnection message if we were previously offline
      if (wasOffline) {
        window.showNotification?.({
          type: 'success',
          title: 'Back Online',
          message: 'Connection restored. Refreshing data...',
          duration: 3000
        });
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      
      window.showNotification?.({
        type: 'warning',
        title: 'Network Disconnected',
        message: 'Please check your internet connection. Swaps are disabled.',
        duration: 0, // Persistent until dismissed
        persistent: true
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return {
    isOnline,
    wasOffline
  };
};

export default useNetworkStatus;
