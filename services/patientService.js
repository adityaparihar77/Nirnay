/**
 * patientService.js
 * Centralised API layer for the triage dashboard.
 * Normalises every patient object to a consistent shape regardless
 * of what field names the API returns.
 */

import { API } from '../utils/constants';

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
