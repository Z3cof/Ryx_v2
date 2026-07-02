import { useEffect, useState, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getCachedUser } from '../services/authSession';
import { syncPendingTransactions } from '../services/expenses';
import { getPendingTransactions } from '../services/offlineStorage';

export function useOfflineSync() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  
  // Track previous connection state to detect offline -> online transitions
  const prevConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && (state.isInternetReachable ?? true);
      setIsConnected(!!connected);

      // Detect transition from offline (false) to online (true)
      if (prevConnectedRef.current === false && connected === true) {
        console.log('[Offline Sync] Reconnection detected. Triggering auto-sync...');
        void runAutoSync();
      }

      prevConnectedRef.current = !!connected;
    });

    return () => unsubscribe();
  }, []);

  const runAutoSync = async () => {
    try {
      const cachedUser = await getCachedUser();
      if (!cachedUser?._id) return;

      const pending = await getPendingTransactions(cachedUser._id);
      if (pending.length === 0) return;

      setIsSyncing(true);
      const res = await syncPendingTransactions(cachedUser._id);
      
      if (res.syncedCount > 0) {
        setSyncSuccess(true);
        setTimeout(() => {
          setSyncSuccess(false);
        }, 3500);
      }
    } catch (err) {
      console.warn('[Offline Sync] Auto-sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isConnected,
    isSyncing,
    syncSuccess,
    triggerManualSync: runAutoSync,
  };
}
