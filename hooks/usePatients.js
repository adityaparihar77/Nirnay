/**
 * usePatients.js
 * React hook that manages patient data, auto-refresh, filtering,
 * and per-risk counters for the triage dashboard.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchPatients } from '../services/patientService';

const AUTO_REFRESH_INTERVAL_MS = 10000; // 10 s

/**
 * @typedef {'ALL'|'RED'|'YELLOW'|'GREEN'} FilterKey
 */

/**
 * Central data hook for the triage dashboard.
 *
 * @param {{autoRefresh?: boolean}} options
 * @returns {{
 *   patients: PatientRecord[],
 *   filtered: PatientRecord[],
 *   counts: {ALL: number, RED: number, YELLOW: number, GREEN: number},
 *   filter: FilterKey,
 *   setFilter: (key: FilterKey) => void,
 *   isLoading: boolean,
 *   isRefreshing: boolean,
 *   error: string,
 *   lastUpdated: Date|null,
 *   autoRefresh: boolean,
 *   setAutoRefresh: (on: boolean) => void,
 *   refresh: () => void,
 *   pullRefresh: () => void,
 * }}
 */
const usePatients = () => {
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [newRedAlert, setNewRedAlert] = useState(false);
  const [newPatientIds, setNewPatientIds] = useState(new Set());
  const [dataVersion, setDataVersion] = useState(0);

  const intervalRef      = useRef(null);
  const prevIdsRef       = useRef(new Set());
  const prevRedCountRef  = useRef(-1); // -1 = initial load not yet done

  /** Fetch patients; silent=true skips the full-screen loader. */
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setError('');

    try {
      const data = await fetchPatients();

      // Detect brand-new patient IDs (not present in previous fetch)
      const isFirstLoad = prevRedCountRef.current === -1;
      const incomingIds = new Set(data.map((p) => p.id));

      if (!isFirstLoad) {
        const brandNew = data.filter((p) => !prevIdsRef.current.has(p.id));
        if (brandNew.length > 0) {
          setNewPatientIds(new Set(brandNew.map((p) => p.id)));
          // Clear "new" highlight after 8 s
          setTimeout(() => setNewPatientIds(new Set()), 8000);
        }
        // Fire toast if RED count increased
        const newRedCount = data.filter((p) => p.riskLevel === 'RED').length;
        if (newRedCount > prevRedCountRef.current) {
          setNewRedAlert(true);
        }
        prevRedCountRef.current = newRedCount;
      } else {
        prevRedCountRef.current = data.filter((p) => p.riskLevel === 'RED').length;
      }

      prevIdsRef.current = incomingIds;
      setPatients(data);
      setDataVersion((v) => v + 1);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load patients.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  /** Initial load */
  useEffect(() => {
    load();
  }, [load]);

  /** Auto-refresh interval management */
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (autoRefresh) {
      intervalRef.current = setInterval(() => load({ silent: true }), AUTO_REFRESH_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, load]);

  /** Derived counts (memoised) */
  const counts = useMemo(() => {
    const c = { ALL: patients.length, RED: 0, YELLOW: 0, GREEN: 0 };
    patients.forEach(({ riskLevel }) => {
      if (riskLevel === 'RED') c.RED += 1;
      else if (riskLevel === 'YELLOW') c.YELLOW += 1;
      else if (riskLevel === 'GREEN') c.GREEN += 1;
    });
    return c;
  }, [patients]);

  /** Filtered list (memoised) */
  const filtered = useMemo(
    () => (filter === 'ALL' ? patients : patients.filter((p) => p.riskLevel === filter)),
    [patients, filter]
  );

  const refresh = useCallback(() => load(), [load]);

  const pullRefresh = useCallback(() => {
    setIsRefreshing(true);
    load();
  }, [load]);

  const dismissRedAlert = useCallback(() => setNewRedAlert(false), []);

  return {
    patients,
    filtered,
    counts,
    filter,
    setFilter,
    isLoading,
    isRefreshing,
    error,
    newRedAlert,
    dismissRedAlert,
    newPatientIds,
    dataVersion,
    lastUpdated,
    autoRefresh,
    setAutoRefresh,
    refresh,
    pullRefresh,
  };
};

export default usePatients;
