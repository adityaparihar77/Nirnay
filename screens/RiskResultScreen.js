/**
 * RiskResultScreen.js
 * Full-screen triage result with animated traffic-light indicator
 * and voice feedback via expo-speech.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { THEME, SPACING, FONT } from '../utils/constants';
import { formatDateTime, makeShadow } from '../utils/helpers';

/* ─── Traffic Light ──────────────────────────────────────── */
/**
 * Renders a vertical traffic-light with the active level lit and pulsing.
 */
const TrafficLight = ({ riskLevel }) => {
  const redPulse    = useRef(new Animated.Value(1)).current;
  const yellowPulse = useRef(new Animated.Value(1)).current;
  const greenPulse  = useRef(new Animated.Value(1)).current;

  const pulseMap = { RED: redPulse, YELLOW: yellowPulse, GREEN: greenPulse };
  const activePulse = pulseMap[riskLevel] || greenPulse;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(activePulse, { toValue: 1.25, duration: 600, useNativeDriver: false }),
        Animated.timing(activePulse, { toValue: 1.0,  duration: 600, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [riskLevel]);

  const lights = [
    { level: 'RED',    activeColor: '#EF5350', dimColor: '#4E1A1A', shadowColor: '#EF535088' },
    { level: 'YELLOW', activeColor: '#FFD600', dimColor: '#4E4200', shadowColor: '#FFD60088' },
    { level: 'GREEN',  activeColor: '#66BB6A', dimColor: '#0D3B0F', shadowColor: '#66BB6A88' },
  ];

  return (
    <View style={tlStyles.housing}>
      <View style={tlStyles.pole} />
      {lights.map(({ level, activeColor, dimColor, shadowColor }) => {
        const isActive = riskLevel === level;
        const pulse    = pulseMap[level];
        return (
          <Animated.View
            key={level}
            style={[
              tlStyles.bulb,
              {
                backgroundColor: isActive ? activeColor : dimColor,
                transform: [{ scale: isActive ? pulse : 1 }],
                ...(Platform.OS !== 'web'
                  ? {
                      shadowColor:   isActive ? shadowColor : 'transparent',
                      shadowOffset:  { width: 0, height: 0 },
                      shadowRadius:  isActive ? 18 : 0,
                      shadowOpacity: isActive ? 0.9 : 0,
                      elevation:     isActive ? 10 : 0,
                    }
                  : { boxShadow: isActive ? `0 0 18px ${shadowColor}` : 'none' }),
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const tlStyles = StyleSheet.create({
  housing: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    borderWidth: 3,
    borderColor: '#333',
    ...makeShadow(6, 12, 0.4, 10),
  },
  pole: {
    display: 'none', // hidden — housing is enough
  },
  bulb: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
});

/* ─── Vital row ─────────────────────────────────────── */
const VitalRow = ({ icon, label, value, unit, highlight }) => (
  <View style={[styles.vitalRow, highlight && styles.vitalRowHighlight]}>
    <View style={styles.vitalLeft}>
      <Ionicons name={icon} size={18} color={highlight ? THEME.danger : THEME.primary} />
      <Text style={styles.vitalLabel}>{label}</Text>
    </View>
    <Text style={[styles.vitalValue, highlight && { color: THEME.danger }]}>
      {value}
      <Text style={styles.vitalUnit}> {unit}</Text>
    </Text>
  </View>
);

/* ─── AI score breakdown row ────────────────────────────── */
const BreakdownRow = ({ label, value, max, color }) => (
  <View style={styles.breakdownRow}>
    <Text style={styles.breakdownLabel}>{label}</Text>
    <View style={styles.breakdownBarTrack}>
      <View
        style={[
          styles.breakdownBarFill,
          { width: `${Math.round((value / max) * 100)}%`, backgroundColor: color },
        ]}
      />
    </View>
    <Text style={[styles.breakdownValue, { color }]}>{value}</Text>
  </View>
);

/* ─── AI Risk Card ───────────────────────────────────────── */
const PROB_COLORS = { High: '#D32F2F', Medium: '#F57F17', Low: '#2E7D32' };

const AIRiskCard = ({ aiRisk, fadeAnim, slideAnim }) => {
  if (!aiRisk) return null;
  const { score, probability, breakdown } = aiRisk;
  const probColor = PROB_COLORS[probability] ?? '#455A64';

  return (
    <Animated.View
      style={[
        styles.card,
        styles.aiCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <Ionicons name="analytics-outline" size={20} color="#7C4DFF" />
        <Text style={[styles.cardTitle, { color: '#7C4DFF' }]}>AI Risk Assessment</Text>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>

      {/* Score + probability */}
      <View style={styles.aiScoreRow}>
        {/* Circular score dial */}
        <View style={[styles.aiScoreDial, { borderColor: probColor }]}>
          <Text style={[styles.aiScoreNumber, { color: probColor }]}>{score}</Text>
          <Text style={styles.aiScoreMax}>/100</Text>
        </View>

        <View style={styles.aiScoreInfo}>
          <Text style={styles.aiScoreLabel}>AI Risk Score</Text>
          <Text style={[styles.aiScoreValue, { color: probColor }]}>{score}%</Text>
          <View style={[styles.probPill, { borderColor: probColor, backgroundColor: probColor + '18' }]}>
            <View style={[styles.probDot, { backgroundColor: probColor }]} />
            <Text style={[styles.probText, { color: probColor }]}>
              Risk Probability: {probability}
            </Text>
          </View>
        </View>
      </View>

      {/* Score bar */}
      <View style={styles.scoreBarWrap}>
        <View style={styles.scoreBarTrack}>
          <View
            style={[
              styles.scoreBarFill,
              { width: `${score}%`, backgroundColor: probColor },
            ]}
          />
        </View>
        <Text style={styles.scoreBarCaption}>{score}% of maximum risk</Text>
      </View>

      {/* Per-vital breakdown */}
      <Text style={styles.breakdownTitle}>Score Breakdown</Text>
      <BreakdownRow label="Blood Pressure" value={breakdown.bpContribution}   max={50} color="#5C6BC0" />
      <BreakdownRow label="Temperature"    value={breakdown.tempContribution} max={40} color="#26A69A" />
      <BreakdownRow label="Age Factor"     value={breakdown.ageContribution}  max={10} color="#FF7043" />

      <Text style={styles.aiDisclaimer}>
        AI score is advisory. Clinical judgement takes precedence.
      </Text>
    </Animated.View>
  );
};

/* ─── Reason item ────────────────────────────────────── */
const ReasonItem = ({ text, color }) => (
  <View style={styles.reasonItem}>
    <View style={[styles.reasonBullet, { backgroundColor: color }]} />
    <Text style={styles.reasonText}>{text}</Text>
  </View>
);

/* ─── Main screen ────────────────────────────────────── */
const RiskResultScreen = ({ route, navigation }) => {
  const { patient, riskLevel, riskConfig, reasons, aiRisk } = route.params;

  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();

    // Voice feedback — announce risk level aloud
    const label = riskConfig?.label || riskLevel;
    const msg   = riskConfig?.message || '';
    const speak = () => {
      try {
        Speech.speak(`Risk Level is ${riskLevel}. ${label}. ${msg}`, {
          language: 'en-IN',
          pitch: 1.0,
          rate:  0.9,
        });
      } catch (e) {
        // expo-speech not available on web — silent fallback
      }
    };
    const timer = setTimeout(speak, 600); // slight delay so screen renders first
    return () => {
      clearTimeout(timer);
      try { Speech.stop(); } catch (_) {}
    };
  }, []);

  const bpHighlight = patient.bloodPressure > 160;
  const tempHighlight = patient.temperature > 102;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: riskConfig.background }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={riskConfig.background}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Risk indicator card */}
        <Animated.View
          style={[
            styles.riskCard,
            {
              borderColor: riskConfig.borderColor,
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* ── Traffic light ── */}
          <TrafficLight riskLevel={riskLevel} />

          <View style={[styles.riskIconWrap, { backgroundColor: riskConfig.color }]}>
            <Ionicons name={riskConfig.icon} size={40} color="#fff" />
          </View>
          <Text style={[styles.riskLevelText, { color: riskConfig.color }]}>
            {riskLevel}
          </Text>
          <Text style={styles.riskLabelText}>{riskConfig.label}</Text>
          <Text style={styles.riskMessage}>{riskConfig.message}</Text>

          {/* Urgency strip */}
          <View style={[styles.urgencyStrip, { backgroundColor: riskConfig.color }]}>
            <Ionicons
              name={
                riskLevel === 'RED'
                  ? 'alarm-outline'
                  : riskLevel === 'YELLOW'
                  ? 'time-outline'
                  : 'checkmark-done-outline'
              }
              size={14}
              color="#fff"
            />
            <Text style={styles.urgencyText}>
              {riskLevel === 'RED'
                ? 'Priority 1 — Immediate Action'
                : riskLevel === 'YELLOW'
                ? 'Priority 2 — Monitor Closely'
                : 'Priority 3 — Routine Care'}
            </Text>
          </View>
        </Animated.View>

        {/* Patient details card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle-outline" size={20} color={THEME.primary} />
            <Text style={styles.cardTitle}>Patient Details</Text>
            <Text style={styles.recordId}>#{patient.id.slice(-6).toUpperCase()}</Text>
          </View>

          <View style={styles.patientNameRow}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <View style={styles.agePill}>
              <Text style={styles.agePillText}>{patient.age} yrs</Text>
            </View>
          </View>

          <Text style={styles.timestamp}>
            <Ionicons name="time-outline" size={12} /> {formatDateTime(patient.createdAt)}
          </Text>
        </Animated.View>

        {/* Vitals card */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="pulse-outline" size={20} color={THEME.primary} />
            <Text style={styles.cardTitle}>Vital Signs</Text>
          </View>

          <VitalRow
            icon="pulse-outline"
            label="Systolic BP"
            value={patient.bloodPressure}
            unit="mmHg"
            highlight={bpHighlight}
          />
          <View style={styles.divider} />
          <VitalRow
            icon="thermometer-outline"
            label="Temperature"
            value={patient.temperature}
            unit="°F"
            highlight={tempHighlight}
          />
        </Animated.View>

        {/* AI Risk Score card */}
        <AIRiskCard aiRisk={aiRisk} fadeAnim={fadeAnim} slideAnim={slideAnim} />

        {/* Assessment reasons */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="clipboard-outline" size={20} color={THEME.primary} />
            <Text style={styles.cardTitle}>Assessment Findings</Text>
          </View>
          {reasons.map((reason, idx) => (
            <ReasonItem key={idx} text={reason} color={riskConfig.color} />
          ))}
        </Animated.View>

        {/* Storage note */}
        <View style={styles.storageNote}>
          <Ionicons name="cloud-outline" size={14} color={THEME.textMuted} />
          <Text style={styles.storageNoteText}>
            Record saved offline — will sync automatically when online.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Dashboard')}
            activeOpacity={0.8}
          >
            <Ionicons name="grid-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('PatientInput')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color={THEME.primary} />
            <Text style={styles.secondaryButtonText}>New Patient</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    // Same web fix as HomeScreen — without an explicit height bound the
    // SafeAreaView grows to content and the inner ScrollView never scrolls.
    ...(Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }),
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },

  /* Risk card */
  riskCard: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    borderWidth: 2,
    padding: SPACING.lg,
    alignItems: 'center',
    overflow: 'hidden',
    ...makeShadow(4, 12, 0.1, 6),
  },
  riskIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...makeShadow(4, 8, 0.3, 8),
  },
  riskLevelText: {
    fontSize: FONT.sizes.hero,
    fontWeight: '900',
    letterSpacing: 4,
  },
  riskLabelText: {
    fontSize: FONT.sizes.xl,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginTop: 2,
  },
  riskMessage: {
    fontSize: FONT.sizes.md,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  urgencyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    marginTop: SPACING.xs,
  },
  urgencyText: {
    fontSize: FONT.sizes.sm,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* Generic card */
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: SPACING.md,
    ...makeShadow(2, 8, 0.06, 3),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: THEME.textPrimary,
    flex: 1,
  },
  recordId: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  patientName: {
    fontSize: FONT.sizes.xl,
    fontWeight: '700',
    color: THEME.textPrimary,
    flex: 1,
  },
  agePill: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: 20,
  },
  agePillText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: THEME.primary,
  },
  timestamp: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
  },

  /* Vitals */
  vitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 10,
  },
  vitalRowHighlight: {
    backgroundColor: '#FFF5F5',
  },
  vitalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  vitalLabel: {
    fontSize: FONT.sizes.md,
    color: THEME.textSecondary,
  },
  vitalValue: {
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  vitalUnit: {
    fontSize: FONT.sizes.sm,
    fontWeight: '400',
    color: THEME.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: SPACING.xs,
  },

  /* Reasons */
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  reasonBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  reasonText: {
    flex: 1,
    fontSize: FONT.sizes.md,
    color: THEME.textSecondary,
    lineHeight: 22,
  },

  /* Footer */
  storageNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
  },
  storageNoteText: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
  },
  actions: {
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: THEME.primary,
    paddingVertical: SPACING.md,
    borderRadius: 14,
    marginBottom: SPACING.xs,
  },
  primaryButtonText: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: THEME.surface,
    paddingVertical: SPACING.md,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  secondaryButtonText: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: THEME.primary,
  },

  /* ── AI Risk Card ─────────────────────────────────── */
  aiCard: {
    borderWidth: 1.5,
    borderColor: '#D1C4E9',
  },
  aiBadge: {
    backgroundColor: '#7C4DFF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },

  /* Score dial */
  aiScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  aiScoreDial: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  aiScoreNumber: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  aiScoreMax: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '600',
  },

  /* Score info */
  aiScoreInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  aiScoreLabel: {
    fontSize: FONT.sizes.sm,
    color: THEME.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  aiScoreValue: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },

  /* Probability pill */
  probPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: 4,
  },
  probDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  probText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
  },

  /* Score bar */
  scoreBarWrap: {
    marginBottom: SPACING.md,
    gap: 4,
  },
  scoreBarTrack: {
    height: 8,
    backgroundColor: '#E8EAF6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: 8,
    borderRadius: 4,
  },
  scoreBarCaption: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
    textAlign: 'right',
  },

  /* Breakdown */
  breakdownTitle: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 6,
  },
  breakdownLabel: {
    width: 110,
    fontSize: FONT.sizes.sm,
    color: THEME.textSecondary,
  },
  breakdownBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: 6,
    borderRadius: 3,
  },
  breakdownValue: {
    width: 32,
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    textAlign: 'right',
  },

  aiDisclaimer: {
    fontSize: 11,
    color: THEME.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});

export default RiskResultScreen;
