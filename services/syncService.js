/**
 * syncService.js
 * Handles syncing local patient records to the remote API.
 */

import { API } from '../utils/constants';
import {
  getUnsyncedPatients,
  markPatientsSynced,
  setLastSyncTime,
} from './storageService';

let isSyncing = false;

/**
 * POST a single patient record to the remote API.
 * @param {object} patient
 * @returns {Promise<boolean>} - true if successful
 */
const uploadPatient = async (patient) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API.TIMEOUT_MS);

  try {
    const response = await fetch(`${API.BASE_URL}${API.PATIENT_POST_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        id: patient.id,
        name: patient.name,
        age: patient.age,
        bloodPressure: patient.bloodPressure,
        temperature: patient.temperature,
        riskLevel: patient.riskLevel,
        createdAt: patient.createdAt,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok || response.status === 201 || response.status === 200;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      console.warn('[SyncService] Upload timed out for patient:', patient.id);
    } else {
      console.warn('[SyncService] Upload failed for patient:', patient.id, error.message);
    }
    return false;
  }
};

/**
 * Sync all unsynced local records to the remote API.
 * Uses a guard to avoid concurrent sync operations.
 *
 * @param {function} onProgress - Optional callback(syncedCount, totalCount)
 * @returns {Promise<{ synced: number, failed: number, remaining: number }>}
 */
export const syncPatients = async (onProgress = null) => {
  if (isSyncing) {
    console.log('[SyncService] Sync already in progress, skipping.');
    return { synced: 0, failed: 0, remaining: 0, skipped: true };
  }

  isSyncing = true;

  try {
    const unsynced = await getUnsyncedPatients();

    if (unsynced.length === 0) {
      return { synced: 0, failed: 0, remaining: 0 };
    }

    console.log(`[SyncService] Starting sync of ${unsynced.length} records.`);

    const syncedIds = [];
    let failed = 0;

    for (let i = 0; i < unsynced.length; i++) {
      const patient = unsynced[i];
      const success = await uploadPatient(patient);

      if (success) {
        syncedIds.push(patient.id);
      } else {
        failed++;
      }

      if (onProgress) {
        onProgress(syncedIds.length + failed, unsynced.length);
      }
    }

    if (syncedIds.length > 0) {
      const remaining = await markPatientsSynced(syncedIds);
      await setLastSyncTime(new Date().toISOString());
      console.log(
        `[SyncService] Synced ${syncedIds.length} records. ${failed} failed. ${remaining.length} remaining.`
      );
      return { synced: syncedIds.length, failed, remaining: remaining.length };
    }

    return { synced: 0, failed, remaining: unsynced.length };
  } catch (error) {
    console.error('[SyncService] Sync error:', error);
    return { synced: 0, failed: 0, remaining: 0, error: error.message };
  } finally {
    isSyncing = false;
  }
};

/**
 * Returns whether a sync operation is currently in progress.
 */
export const getSyncingStatus = () => isSyncing;
