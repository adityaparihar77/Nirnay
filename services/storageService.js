/**
 * storageService.js
 * Handles all AsyncStorage operations for patient records.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { generateId } from '../utils/helpers';

/**
 * Retrieve the full patient queue from local storage.
 * @returns {Promise<Array>}
 */
export const getPatientQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PATIENT_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[StorageService] Failed to read patient queue:', error);
    return [];
  }
};

/**
 * Save a new patient record to local storage.
 * @param {object} patientData - Raw patient form data + risk result
 * @returns {Promise<object>} - The saved patient record with generated ID
 */
export const savePatient = async (patientData) => {
  try {
    const queue = await getPatientQueue();
    const record = {
      id: generateId(),
      ...patientData,
      synced: false,
      createdAt: new Date().toISOString(),
    };
    queue.push(record);
    await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_QUEUE, JSON.stringify(queue));
    return record;
  } catch (error) {
    console.error('[StorageService] Failed to save patient:', error);
    throw error;
  }
};

/**
 * Mark a list of patient IDs as synced (removes them from queue).
 * @param {string[]} syncedIds - Array of patient IDs to remove
 * @returns {Promise<Array>} - Remaining queue after removal
 */
export const markPatientsSynced = async (syncedIds) => {
  try {
    const queue = await getPatientQueue();
    const remaining = queue.filter((p) => !syncedIds.includes(p.id));
    await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_QUEUE, JSON.stringify(remaining));
    return remaining;
  } catch (error) {
    console.error('[StorageService] Failed to mark patients synced:', error);
    throw error;
  }
};

/**
 * Retrieve all unsynced patient records.
 * @returns {Promise<Array>}
 */
export const getUnsyncedPatients = async () => {
  const queue = await getPatientQueue();
  return queue.filter((p) => !p.synced);
};

/**
 * Get the count of records currently in local queue.
 * @returns {Promise<number>}
 */
export const getQueueCount = async () => {
  const queue = await getPatientQueue();
  return queue.length;
};

/**
 * Set the last sync timestamp.
 * @param {string} isoString
 */
export const setLastSyncTime = async (isoString) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, isoString);
  } catch (error) {
    console.error('[StorageService] Failed to save last sync time:', error);
  }
};

/**
 * Get the last sync timestamp.
 * @returns {Promise<string|null>}
 */
export const getLastSyncTime = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
  } catch {
    return null;
  }
};

/**
 * Clear all patient data (for testing/reset purposes).
 */
export const clearAllData = async () => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.PATIENT_QUEUE,
    STORAGE_KEYS.LAST_SYNC_TIME,
  ]);
};
