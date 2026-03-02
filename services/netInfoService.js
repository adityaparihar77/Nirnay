/**
 * netInfoService.js
 * Manages network state detection and auto-sync triggering.
 */

import NetInfo from '@react-native-community/netinfo';
import { syncPatients } from './syncService';

let unsubscribe = null;
let lastNetworkState = false;
let onSyncCompleteCallback = null;
let onNetworkChangeCallback = null;

/**
 * Start listening for network changes and trigger sync when online.
 *
 * @param {object} options
 * @param {function} options.onSyncComplete - Called after sync with result
 * @param {function} options.onNetworkChange - Called when network status changes (isConnected: bool)
 */
export const startNetworkListener = ({ onSyncComplete, onNetworkChange } = {}) => {
  if (unsubscribe) stopNetworkListener();

  onSyncCompleteCallback = onSyncComplete || null;
  onNetworkChangeCallback = onNetworkChange || null;

  unsubscribe = NetInfo.addEventListener(async (state) => {
    const isConnected = !!(state.isConnected && state.isInternetReachable !== false);

    if (onNetworkChangeCallback) {
      onNetworkChangeCallback(isConnected);
    }

    // Only trigger sync on transition from offline → online
    if (isConnected && !lastNetworkState) {
      console.log('[NetInfoService] Network restored — triggering sync.');
      const result = await syncPatients();
      if (onSyncCompleteCallback) {
        onSyncCompleteCallback(result);
      }
    }

    lastNetworkState = isConnected;
  });

  console.log('[NetInfoService] Network listener started.');
};

/**
 * Stop listening for network changes.
 */
export const stopNetworkListener = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    console.log('[NetInfoService] Network listener stopped.');
  }
};

/**
 * Manually check current network connectivity.
 * @returns {Promise<boolean>}
 */
export const checkConnectivity = async () => {
  try {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return false;
  }
};

/**
 * Manually trigger a sync if online.
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<object>} sync result
 */
export const triggerManualSync = async (onProgress = null) => {
  const connected = await checkConnectivity();
  if (!connected) {
    return { skipped: true, reason: 'No internet connection' };
  }
  return syncPatients(onProgress);
};
