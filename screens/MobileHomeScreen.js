/**
 * MobileHomeScreen.js
 * Offline-first patient vitals entry screen for field health workers.
 *
 * Flow:
 *   1. Worker fills in patient form
 *   2. Risk is calculated locally (no internet needed)
 *   3. Record saved to AsyncStorage queue
 *   4. Navigate to RiskResultScreen
 *   5. In background: attempt cloud sync, show status toast
 *   6. NetworkListener auto-syncs when internet returns
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING, THEME } from '../utils/constants';
import { calculateRisk } from '../utils/riskCalculator';
import { savePatient, getPatientQueue, setLastSyncTime, getLastSyncTime } from '../services/storageService';
import { syncPatients } from '../services/syncService';
import { startNetworkListener, stopNetworkListener } from '../services/netInfoService';
import { formatRelativeTime, makeShadow } from '../utils/helpers';
import PatientForm from '../components/PatientForm';
import SyncStatusBar from '../components/SyncStatusBar';

/* ─── Sync status message types ────────────────────────── */
const STATUS = {
  IDLE:          null,
  SAVED_OFFLINE: { type: 'offline',  icon: 'cloud-offline-outline',  text: 'Saved Offline',      color: '#E65100', bg: '#FFF3E0' },
  SYNCED:        { type: 'synced',   icon: 'cloud-done-outline',      text: 'Synced to Cloud ✓',  color: '#2E7D32', bg: '#E8F5E9' },
  SYNC_FAILED:   { type: 'failed',   icon: 'cloud-offline-outline',   text: 'Sync Failed — will retry', color: '#C62828', bg: '#FFEBEE' },
  SYNCING:       { type: 'syncing',  icon: 'cloud-upload-outline',    text: 'Syncing to cloud…',  color: THEME.primary, bg: THEME.primaryLight },
};

/* ─── Toast banner ──────────────────────────────────────── */
const StatusToast = ({ status }) => {
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const prevType = useRef(null);

  useEffect(() => {
    if (status && status.type !== prevType.current) {
      prevType.current = status.type;
      Animated.sequence([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 }),
        Animated.delay(3000),
        Animated.timing(slideAnim, { toValue: -80, duration: 300, useNativeDriver: false }),
      ]).start();
    }
  }, [status]);

  if (!status) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: status.bg, transform: [{ translateY: slideAnim }], pointerEvents: 'none' },
      ]}
    >
      <Ionicons name={status.icon} size={18} color={status.color} />
      <Text style={[styles.toastText, { color: status.color }]}>{status.text}</Text>
    </Animated.View>
  );
};

/* ─── Main screen ───────────────────────────────────────── */
const MobileHomeScreen = ({ navigation }) => {
  const [queueCount, setQueueCount]     = useState(0);
  const [lastSyncTime, setLastSyncTimeState] = useState(null);
  const [isOnline, setIsOnline]         = useState(false);
  const [isSyncing, setIsSyncing]       = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);

  /* ── Load initial state ── */
  useEffect(() => {
    (async () => {
      const queue = await getPatientQueue();
      setQueueCount(queue.filter((p) => !p.synced).length);
      const lastSync = await getLastSyncTime();
      setLastSyncTimeState(lastSync);
    })();
  }, []);

  /* ── Network listener ── */
  useEffect(() => {
    startNetworkListener({
      onNetworkChange: (connected) => setIsOnline(connected),
      onSyncComplete:  async (result) => {
        const queue = await getPatientQueue();
        setQueueCount(queue.filter((p) => !p.synced).length);
        const lastSync = await getLastSyncTime();
        setLastSyncTimeState(lastSync);
        setIsSyncing(false);
        setCurrentStatus(result.synced > 0 ? STATUS.SYNCED : STATUS.SYNC_FAILED);
      },
    });
    return () => stopNetworkListener();
  }, []);

  /* ── Form submit handler ── */
  const handleSubmit = useCallback(async (formData) => {
    setIsSubmitting(true);
    try {
      const { level, config, reasons } = calculateRisk(
        formData.bloodPressure,
        formData.temperature
      );

      const patientRecord = await savePatient({
        ...formData,
        riskLevel: level,
      });

      const queue = await getPatientQueue();
      setQueueCount(queue.filter((p) => !p.synced).length);
      setCurrentStatus(STATUS.SAVED_OFFLINE);

      // Navigate immediately — sync happens in background
      navigation.navigate('RiskResult', {
        patient:    patientRecord,
        riskLevel:  level,
        riskConfig: config,
        reasons,
      });

      // Attempt background sync if online
      if (isOnline) {
        setCurrentStatus(STATUS.SYNCING);
        setIsSyncing(true);
        try {
          const result = await syncPatients();
          const updatedQueue = await getPatientQueue();
          setQueueCount(updatedQueue.filter((p) => !p.synced).length);
          const lastSync = await getLastSyncTime();
          setLastSyncTimeState(lastSync);
          setCurrentStatus(result.synced > 0 ? STATUS.SYNCED : STATUS.SYNC_FAILED);
        } catch {
          setCurrentStatus(STATUS.SYNC_FAILED);
        } finally {
          setIsSyncing(false);
        }
      }
    } catch (err) {
      console.error('[MobileHome] Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [isOnline, navigation]);

  /* ── Manual sync ── */
  const handleManualSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    setCurrentStatus(STATUS.SYNCING);
    try {
      const result = await syncPatients();
      const queue = await getPatientQueue();
      setQueueCount(queue.filter((p) => !p.synced).length);
      const lastSync = await getLastSyncTime();
      setLastSyncTimeState(lastSync);
      setCurrentStatus(result.synced > 0 ? STATUS.SYNCED : STATUS.SYNC_FAILED);
    } catch {
      setCurrentStatus(STATUS.SYNC_FAILED);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primaryDark} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Dashboard')}
          activeOpacity={0.7}
        >
          <Ionicons name="grid-outline" size={18} color="rgba(255,255,255,0.85)" />
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.logoWrap}>
            <Ionicons name="medkit-outline" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Patient Triage</Text>
            <Text style={styles.headerSubtitle}>Offline-First Input</Text>
          </View>
        </View>

        {/* Queue badge */}
        {queueCount > 0 && (
          <View style={styles.queueBadgeWrap}>
            <Ionicons name="cloud-upload-outline" size={14} color="rgba(255,255,255,0.9)" />
            <View style={styles.queueBadge}>
              <Text style={styles.queueBadgeText}>{queueCount}</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Toast overlay ── */}
      <StatusToast status={currentStatus} />

      {/* ── Sync status bar ── */}
      <SyncStatusBar
        queueCount={queueCount}
        lastSyncTime={lastSyncTime}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
      />

      {/* ── Patient form ── */}
      <PatientForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    // On web, flex:1 alone doesn't bound the height, so the inner ScrollView
    // expands to content and nothing scrolls. '100vh' gives an explicit bound.
    ...(Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }),
    backgroundColor: THEME.primaryDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    gap: SPACING.sm,
    ...makeShadow(3, 6, 0.15, 5),
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  backText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT.sizes.xs,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  logoWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: FONT.sizes.md,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT.sizes.xs,
  },
  queueBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  queueBadge: {
    backgroundColor: '#FF6F00',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  queueBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Toast */
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 88 : 72,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 12,
    zIndex: 999,
    ...makeShadow(4, 8, 0.15, 8),
  },
  toastText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
  },
});

export default MobileHomeScreen;
