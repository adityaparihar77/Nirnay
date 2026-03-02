/**
 * ERCapacityPanel.js
 *
 * Real-time Emergency Room capacity indicator for the Nirnay dashboard.
 *
 * Rules:
 *  - Total ER beds        : ER_CAPACITY (20)
 *  - Occupied beds        : one per CRITICAL (RED) patient, capped at capacity
 *  - < 60 % load          : Normal   — green bar
 *  - 60 – 79 % load       : Elevated — amber bar, advisory note
 *  - 80 – 99 % load       : Critical — orange bar  + flashing warning banner
 *  - 100 % load           : Full     — red bar + "Redirecting to Nearby Hospital"
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING, THEME } from '../../utils/constants';
import { makeShadow } from '../../utils/helpers';

/* ─── Configuration ─────────────────────────────────────── */
const ER_CAPACITY = 20;

const LOAD_STATES = {
  NORMAL:   { threshold: 0.60, bar: '#4CAF50', bg: '#E8F5E9', border: '#A5D6A7', text: '#1B5E20', label: 'Normal Load' },
  ELEVATED: { threshold: 0.80, bar: '#FFA726', bg: '#FFF8E1', border: '#FFD54F', text: '#E65100', label: 'Elevated Load' },
  CRITICAL: { threshold: 1.00, bar: '#F4511E', bg: '#FBE9E7', border: '#FFAB91', text: '#BF360C', label: 'Critical Load' },
  FULL:     { threshold: Infinity, bar: '#C62828', bg: '#FFEBEE', border: '#EF9A9A', text: '#B71C1C', label: 'At Full Capacity' },
};

const getLoadState = (pct) => {
  if (pct < LOAD_STATES.NORMAL.threshold)   return { key: 'NORMAL',   ...LOAD_STATES.NORMAL   };
  if (pct < LOAD_STATES.ELEVATED.threshold) return { key: 'ELEVATED', ...LOAD_STATES.ELEVATED };
  if (pct < LOAD_STATES.CRITICAL.threshold) return { key: 'CRITICAL', ...LOAD_STATES.CRITICAL };
  return                                           { key: 'FULL',     ...LOAD_STATES.FULL     };
};

/* ─── Animated capacity bar ─────────────────────────────── */
const CapacityBar = ({ pct, color }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: Math.min(pct, 1) * 100,
      tension: 55,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  // Segment tick marks (every 25% = 5 beds)
  const ticks = [25, 50, 75];

  return (
    <View style={barStyles.wrap}>
      {/* Track */}
      <View style={barStyles.track}>
        {/* Fill */}
        <Animated.View
          style={[
            barStyles.fill,
            {
              width: widthAnim.interpolate({
                inputRange:  [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
              backgroundColor: color,
            },
          ]}
        />
        {/* Tick marks at 25%, 50%, 75% */}
        {ticks.map((t) => (
          <View
            key={t}
            style={[barStyles.tick, { left: `${t}%` }]}
          />
        ))}
      </View>
      {/* Axis labels */}
      <View style={barStyles.axisRow}>
        <Text style={barStyles.axisLabel}>0</Text>
        <Text style={barStyles.axisLabel}>5</Text>
        <Text style={barStyles.axisLabel}>10</Text>
        <Text style={barStyles.axisLabel}>15</Text>
        <Text style={barStyles.axisLabel}>{ER_CAPACITY}</Text>
      </View>
    </View>
  );
};

const barStyles = StyleSheet.create({
  wrap: { gap: 4 },
  track: {
    height: 18,
    backgroundColor: '#ECEFF1',
    borderRadius: 9,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    borderRadius: 9,
  },
  tick: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: 1.5,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  axisLabel: {
    fontSize: 10,
    color: THEME.textMuted,
    fontWeight: '600',
  },
});

/* ─── Bed grid visualisation ─────────────────────────────── */
const BedGrid = ({ occupied, total, occupiedColor }) => {
  const beds = Array.from({ length: total }, (_, i) => i < occupied);
  return (
    <View style={bedStyles.grid}>
      {beds.map((occ, i) => (
        <View
          key={i}
          style={[
            bedStyles.bed,
            occ
              ? { backgroundColor: occupiedColor, borderColor: occupiedColor }
              : { backgroundColor: '#F5F7FA', borderColor: '#DDE5ED' },
          ]}
        >
          {occ && <Ionicons name="bed" size={9} color="#fff" />}
        </View>
      ))}
    </View>
  );
};

const bedStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  bed: {
    width: 24,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/* ─── Flashing warning banner ────────────────────────────── */
const FlashBanner = ({ icon, text, bg, borderColor, textColor }) => {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 0.35, duration: 600, useNativeDriver: false }),
        Animated.timing(opacityAnim, { toValue: 1.0,  duration: 600, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={[bannerStyles.wrap, { backgroundColor: bg, borderColor }]}>
      <Animated.View style={{ opacity: opacityAnim }}>
        <Ionicons name={icon} size={16} color={textColor} />
      </Animated.View>
      <Text style={[bannerStyles.text, { color: textColor }]}>{text}</Text>
    </View>
  );
};

const bannerStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm + 2,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  text: {
    flex: 1,
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    lineHeight: 18,
  },
});

/* ─── Redirect notice ────────────────────────────────────── */
const RedirectNotice = () => (
  <View style={redirectStyles.wrap}>
    <View style={redirectStyles.iconRow}>
      <Ionicons name="navigate-circle" size={22} color="#B71C1C" />
      <Text style={redirectStyles.title}>Redirecting to Nearby Hospital</Text>
    </View>
    <Text style={redirectStyles.body}>
      All ER beds are occupied. New critical patients will be automatically
      transferred to the nearest available facility.
    </Text>
    <View style={redirectStyles.chipRow}>
      {['City Medical Centre', 'Apollo ER — 2.1 km', 'AIIMS Annex — 3.4 km'].map((h) => (
        <View key={h} style={redirectStyles.chip}>
          <Ionicons name="location" size={10} color="#B71C1C" />
          <Text style={redirectStyles.chipText}>{h}</Text>
        </View>
      ))}
    </View>
  </View>
);

const redirectStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF9A9A',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT.sizes.md,
    fontWeight: '800',
    color: '#B71C1C',
    flex: 1,
  },
  body: {
    fontSize: FONT.sizes.sm,
    color: '#C62828',
    lineHeight: 19,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFCDD2',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 10,
    color: '#B71C1C',
    fontWeight: '700',
  },
});

/* ─── Main component ─────────────────────────────────────── */
/**
 * @param {{ criticalCount: number }} props
 *  criticalCount — number of RED-risk patients currently in the system
 */
const ERCapacityPanel = ({ criticalCount = 0 }) => {
  const occupied  = Math.min(criticalCount, ER_CAPACITY);
  const available = ER_CAPACITY - occupied;
  const pct       = occupied / ER_CAPACITY;
  const state     = getLoadState(pct);
  const pctDisplay = Math.round(pct * 100);

  const isCritical = state.key === 'CRITICAL';
  const isFull     = state.key === 'FULL';
  const showWarning = isCritical || isFull;

  return (
    <View style={[styles.card, { borderColor: state.border }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: state.bg }]}>
          <Ionicons name="medkit" size={18} color={state.text} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>ER Capacity Monitor</Text>
          <Text style={[styles.stateLabel, { color: state.text }]}>{state.label}</Text>
        </View>
        {/* Big capacity readout */}
        <View style={[styles.capacityBadge, { backgroundColor: state.bg, borderColor: state.border }]}>
          <Text style={[styles.capacityNumerator, { color: state.text }]}>{occupied}</Text>
          <Text style={[styles.capacitySlash, { color: state.text + '88' }]}> / </Text>
          <Text style={[styles.capacityDenominator, { color: state.text + 'AA' }]}>{ER_CAPACITY}</Text>
        </View>
      </View>

      {/* ── Bar ── */}
      <CapacityBar pct={pct} color={state.bar} />

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: state.bar }]} />
          <Text style={styles.statLabel}>Occupied</Text>
          <Text style={[styles.statValue, { color: state.text }]}>{occupied} beds</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.statLabel}>Available</Text>
          <Text style={[styles.statValue, { color: '#2E7D32' }]}>{available} beds</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: THEME.primary }]} />
          <Text style={styles.statLabel}>Utilisation</Text>
          <Text style={[styles.statValue, { color: state.text }]}>{pctDisplay}%</Text>
        </View>
      </View>

      {/* ── Bed grid ── */}
      <BedGrid occupied={occupied} total={ER_CAPACITY} occupiedColor={state.bar} />

      {/* ── Warning banner (≥ 80%) ── */}
      {isCritical && !isFull && (
        <FlashBanner
          icon="warning"
          text={`⚠️  ER load at ${pctDisplay}% — nearing full capacity. Prepare overflow protocols.`}
          bg={state.bg}
          borderColor={state.border}
          textColor={state.text}
        />
      )}

      {/* ── Full redirect notice ── */}
      {isFull && <RedirectNotice />}
    </View>
  );
};

/* ─── Card styles ────────────────────────────────────────── */
const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: SPACING.md,
    gap: SPACING.md,
    ...makeShadow(2, 8, 0.06, 2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  stateLabel: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  /* Capacity badge — "14 / 20" */
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  capacityNumerator: {
    fontSize: FONT.sizes.xl,
    fontWeight: '900',
    lineHeight: FONT.sizes.xl + 4,
  },
  capacitySlash: {
    fontSize: FONT.sizes.lg,
    fontWeight: '400',
  },
  capacityDenominator: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
  },
  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.background,
    borderRadius: 12,
    padding: SPACING.sm + 2,
    justifyContent: 'space-evenly',
  },
  statItem: {
    alignItems: 'center',
    gap: 3,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: FONT.sizes.md,
    fontWeight: '800',
  },
  statSep: {
    width: 1,
    height: 36,
    backgroundColor: THEME.border,
  },
});

export default ERCapacityPanel;
