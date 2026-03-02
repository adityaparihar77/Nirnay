/**
 * PatientModal.js
 * Full-screen modal overlay for reviewing a patient record.
 *
 * Features:
 *  - Full vitals display
 *  - Doctor Advice textarea
 *  - Mark as Reviewed button → PUT /patient/{id}
 *  - Toast on success/failure
 *  - Status badge (Pending / Reviewed)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING, THEME, API } from '../../utils/constants';
import { formatDateTime, formatRelativeTime, makeShadow } from '../../utils/helpers';
import AmbulanceDispatch from './AmbulanceDispatch';

/* ─── Status badge ───────────────────────────────────────── */
const STATUS_CONFIG = {
  Pending:  { bg: '#FFF3E0', text: '#E65100', icon: 'time-outline',           label: 'Pending Review' },
  Reviewed: { bg: '#E8F5E9', text: '#2E7D32', icon: 'checkmark-circle-outline', label: 'Reviewed' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={13} color={cfg.text} />
      <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
};

/* ─── Vital row ──────────────────────────────────────────── */
const VitalRow = ({ icon, label, value, unit, high }) => (
  <View style={[styles.vitalRow, high && styles.vitalRowHigh]}>
    <View style={styles.vitalLeft}>
      <Ionicons name={icon} size={16} color={high ? THEME.danger : THEME.primary} />
      <Text style={styles.vitalLabel}>{label}</Text>
    </View>
    <Text style={[styles.vitalValue, high && { color: THEME.danger }]}>
      {value}
      {unit ? <Text style={styles.vitalUnit}> {unit}</Text> : null}
    </Text>
  </View>
);

/* ─── Risk banner ────────────────────────────────────────── */
const RISK_COLORS = {
  RED:    { bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A', icon: 'alert-circle' },
  YELLOW: { bg: '#FFFDE7', text: '#F57F17', border: '#FFE082', icon: 'time' },
  GREEN:  { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7', icon: 'checkmark-circle' },
};

/* ─── Main modal ─────────────────────────────────────────── */
const PatientModal = ({ patient, visible, onClose, onReviewed }) => {
  const [advice, setAdvice]             = useState('');
  const [saving, setSaving]             = useState(false);
  const [toastMsg, setToastMsg]         = useState(null);
  const [dispatchVisible, setDispatchVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const toastAnim = useRef(new Animated.Value(-80)).current;

  const riskColors = RISK_COLORS[patient?.riskLevel] || RISK_COLORS.GREEN;

  /* Slide in/out */
  useEffect(() => {
    if (visible) {
      setAdvice(patient?.doctorAdvice || '');
      Animated.spring(slideAnim, {
        toValue: 0, tension: 65, friction: 11, useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600, duration: 250, useNativeDriver: false,
      }).start();
    }
  }, [visible]);

  const showToast = (msg) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 0,   useNativeDriver: false, tension: 80, friction: 10 }),
      Animated.delay(2800),
      Animated.timing(toastAnim, { toValue: -80, duration: 280, useNativeDriver: false }),
    ]).start(() => setToastMsg(null));
  };

  const handleMarkReviewed = async () => {
    if (!patient) return;
    setSaving(true);
    try {
      const res = await fetch(`${API.BASE_URL}${API.PATIENT_ENDPOINT}/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          status:       'Reviewed',
          doctorAdvice: advice.trim(),
          reviewedAt:   new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok || res.status === 200) {
        showToast({ icon: 'checkmark-circle', color: '#2E7D32', bg: '#E8F5E9', text: 'Marked as Reviewed!' });
        if (onReviewed) onReviewed({ ...patient, status: 'Reviewed', doctorAdvice: advice.trim() });
        setTimeout(onClose, 1800);
      } else {
        showToast({ icon: 'alert-circle', color: '#C62828', bg: '#FFEBEE', text: `Update failed (${res.status})` });
      }
    } catch (err) {
      showToast({ icon: 'alert-circle', color: '#C62828', bg: '#FFEBEE', text: 'Network error — try again' });
    } finally {
      setSaving(false);
    }
  };

  if (!patient) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Ambulance dispatch overlay — rendered inside the same Modal stack */}
      <AmbulanceDispatch
        visible={dispatchVisible}
        patient={patient}
        onClose={() => setDispatchVisible(false)}
      />
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex}
          >
            {/* Toast */}
            {toastMsg && (
              <Animated.View
                style={[styles.toast, { backgroundColor: toastMsg.bg, transform: [{ translateY: toastAnim }], pointerEvents: 'none' }]}
              >
                <Ionicons name={toastMsg.icon} size={18} color={toastMsg.color} />
                <Text style={[styles.toastText, { color: toastMsg.color }]}>{toastMsg.text}</Text>
              </Animated.View>
            )}

            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetDrag} />
              <View style={styles.sheetTitleRow}>
                <View>
                  <Text style={styles.sheetTitle}>Patient Record</Text>
                  <Text style={styles.sheetSubtitle}>#{String(patient.id).slice(-8).toUpperCase()}</Text>
                </View>
                <StatusBadge status={patient.status || 'Pending'} />
                <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                  <Ionicons name="close" size={22} color={THEME.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Risk banner */}
              <View style={[styles.riskBanner, { backgroundColor: riskColors.bg, borderColor: riskColors.border }]}>
                <Ionicons name={riskColors.icon} size={28} color={riskColors.text} />
                <View style={styles.riskBannerText}>
                  <Text style={[styles.riskLevel, { color: riskColors.text }]}>{patient.riskLevel} Risk</Text>
                  <Text style={[styles.riskTime, { color: riskColors.text + 'AA' }]}>
                    {formatRelativeTime(patient.timestamp || patient.createdAt)}
                  </Text>
                </View>
              </View>

              {/* Patient info card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="person-circle-outline" size={18} color={THEME.primary} />
                  <Text style={styles.cardTitle}>Patient Information</Text>
                </View>
                <Text style={styles.patientName}>{patient.name}</Text>
                <View style={styles.infoRow}>
                  <View style={styles.infoChip}>
                    <Ionicons name="calendar-outline" size={13} color={THEME.textSecondary} />
                    <Text style={styles.infoChipText}>{patient.age} years</Text>
                  </View>
                  <View style={styles.infoChip}>
                    <Ionicons name="time-outline" size={13} color={THEME.textSecondary} />
                    <Text style={styles.infoChipText}>
                      {formatDateTime(patient.timestamp || patient.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Vitals card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="pulse-outline" size={18} color={THEME.primary} />
                  <Text style={styles.cardTitle}>Vital Signs</Text>
                </View>
                <VitalRow
                  icon="pulse-outline"
                  label="Systolic BP"
                  value={patient.bp || patient.bloodPressure}
                  unit="mmHg"
                  high={(patient.bp || patient.bloodPressure) > 160}
                />
                <View style={styles.divider} />
                <VitalRow
                  icon="thermometer-outline"
                  label="Temperature"
                  value={patient.temp || patient.temperature}
                  unit="°F"
                  high={(patient.temp || patient.temperature) > 102}
                />
              </View>

              {/* Doctor advice */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="create-outline" size={18} color={THEME.primary} />
                  <Text style={styles.cardTitle}>Doctor Advice</Text>
                  <Text style={styles.optionalTag}>optional</Text>
                </View>
                <TextInput
                  style={styles.adviceInput}
                  value={advice}
                  onChangeText={setAdvice}
                  placeholder="Enter advice, medication, follow-up instructions…"
                  placeholderTextColor={THEME.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Emergency dispatch — only shown for CRITICAL (RED) patients */}
              {patient.riskLevel === 'RED' && (
                <TouchableOpacity
                  style={styles.dispatchButton}
                  onPress={() => setDispatchVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dispatchButtonEmoji}>🚑</Text>
                  <View style={styles.dispatchButtonText}>
                    <Text style={styles.dispatchButtonTitle}>Dispatch Ambulance</Text>
                    <Text style={styles.dispatchButtonSub}>Trigger emergency response</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Action buttons */}
              <TouchableOpacity
                style={[
                  styles.reviewButton,
                  (saving || patient.status === 'Reviewed') && styles.reviewButtonDisabled,
                ]}
                onPress={handleMarkReviewed}
                disabled={saving || patient.status === 'Reviewed'}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={patient.status === 'Reviewed' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={20}
                    color="#fff"
                  />
                )}
                <Text style={styles.reviewButtonText}>
                  {saving
                    ? 'Saving…'
                    : patient.status === 'Reviewed'
                    ? 'Already Reviewed'
                    : 'Mark as Reviewed'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    ...makeShadow(-4, 16, 0.15, 20),
  },
  sheetHeader: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  sheetDrag: {
    width: 40,
    height: 4,
    backgroundColor: THEME.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sheetTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  sheetSubtitle: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: { flex: 1 },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  /* Risk banner */
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  riskBannerText: { flex: 1 },
  riskLevel: { fontSize: FONT.sizes.lg, fontWeight: '800' },
  riskTime:  { fontSize: FONT.sizes.xs, marginTop: 2 },

  /* Status badge */
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: FONT.sizes.xs, fontWeight: '700' },

  /* Card */
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: THEME.textPrimary,
    flex: 1,
  },
  optionalTag: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
    fontWeight: '500',
  },

  /* Patient info */
  patientName: {
    fontSize: FONT.sizes.xl,
    fontWeight: '800',
    color: THEME.textPrimary,
    marginBottom: SPACING.xs,
  },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  infoChipText: { fontSize: FONT.sizes.xs, color: THEME.textSecondary, fontWeight: '600' },

  /* Vitals */
  vitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 10,
  },
  vitalRowHigh: { backgroundColor: '#FFF5F5' },
  vitalLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  vitalLabel: { fontSize: FONT.sizes.md, color: THEME.textSecondary },
  vitalValue: { fontSize: FONT.sizes.lg, fontWeight: '700', color: THEME.textPrimary },
  vitalUnit:  { fontSize: FONT.sizes.sm, fontWeight: '400', color: THEME.textMuted },
  divider:    { height: 1, backgroundColor: THEME.border, marginVertical: SPACING.xs },

  /* Advice textarea */
  adviceInput: {
    backgroundColor: THEME.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: SPACING.sm + 2,
    fontSize: FONT.sizes.md,
    color: THEME.textPrimary,
    minHeight: 100,
    fontFamily: 'System',
  },

  /* Buttons */
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: THEME.success,
    paddingVertical: SPACING.md,
    borderRadius: 14,
    ...makeShadow(4, 8, 0.3, 4, THEME.success),
  },
  reviewButtonDisabled: {
    backgroundColor: THEME.textMuted,
    ...Platform.select({ web: { boxShadow: 'none' }, default: { shadowOpacity: 0 } }),
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: FONT.sizes.md,
    fontWeight: '800',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm + 4,
  },
  cancelButtonText: {
    fontSize: FONT.sizes.md,
    color: THEME.textSecondary,
    fontWeight: '600',
  },

  /* Dispatch ambulance button */
  dispatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#C62828',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 14,
    ...makeShadow(4, 10, 0.35, 6, '#C62828'),
  },
  dispatchButtonEmoji: {
    fontSize: 26,
    lineHeight: 30,
  },
  dispatchButtonText: {
    flex: 1,
  },
  dispatchButtonTitle: {
    color: '#fff',
    fontSize: FONT.sizes.md,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dispatchButtonSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FONT.sizes.xs,
    marginTop: 1,
  },

  /* Toast */
  toast: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 12,
    zIndex: 999,
    ...makeShadow(4, 8, 0.12, 8),
  },
  toastText: { fontSize: FONT.sizes.sm, fontWeight: '700' },
});

export default PatientModal;
