/**
 * patientService.js
 * Centralised API layer for the triage dashboard.
 * Normalises every patient object to a consistent shape regardless
 * of what field names the API returns.
 *
 * Production base: https://41grxvatmc.execute-api.ap-south-1.amazonaws.com/prod
 * All patient operations use: ${API.BASE_URL}/patients
 */

import { API } from '../utils/constants';

/** Shared JSON headers for POST / PUT requests */
const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/** Single source of truth – resolves to prod or local proxy automatically */
const PATIENTS_URL = `${API.BASE_URL}${API.PATIENT_ENDPOINT}`;
const TIMEOUT_MS = API.TIMEOUT_MS;

/**
 * Derive a normalised risk level from any API response shape.
 * @param {object} raw
 * @returns {'RED'|'YELLOW'|'GREEN'|''}
 */
const resolveRisk = (raw) => {
  const val =
    raw?.riskLevel ||
    raw?.risk ||
    raw?.triageLevel ||
    raw?.triageColor ||
    raw?.level ||
    '';
  return String(val).trim().toUpperCase();
};

/**
 * Map a raw API patient object to a stable display shape.
 * @param {object} raw
 * @param {number} index
 * @returns {PatientRecord}
 */
export const normalisePatient = (raw, index) => ({
  id: raw?.patientId || raw?.id || `P-${index + 1}`,
  name: raw?.name || raw?.patientName || 'Unknown',
  age: raw?.age ?? '—',
  bp: raw?.bp || raw?.bloodPressure || '—',
  temp: raw?.temp || raw?.temperature || '—',
  riskLevel: resolveRisk(raw),
  timestamp: raw?.timestamp || raw?.createdAt || raw?.updatedAt || null,
});

/**
 * Fetch all patients from the triage API.
 * Returns a normalised array or throws on error.
 * @returns {Promise<PatientRecord[]>}
 */
export const fetchPatients = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(PATIENTS_URL, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();

    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.patients)
      ? payload.patients
      : [];

    return list.map(normalisePatient);
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection and retry.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * POST a new patient record to the API.
 * @param {object} patientData  - raw patient fields
 * @returns {Promise<object>}   - the created record (normalised)
 */
export const submitPatient = async (patientData) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(PATIENTS_URL, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(patientData),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`POST failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return normalisePatient(data, 0);
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection and retry.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * PUT (update) an existing patient record.
 * @param {string} patientId
 * @param {object} updates    - fields to update
 * @returns {Promise<object>} - the updated record (normalised)
 */
export const updatePatient = async (patientId, updates) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${PATIENTS_URL}/${patientId}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(updates),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`PUT failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return normalisePatient(data, 0);
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection and retry.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};
