/**
 * AmbulanceDispatch.js
 *
 * Full-screen emergency dispatch overlay triggered when a CRITICAL (RED-risk)
 * patient is flagged for immediate ambulance response.
 *
 * Features:
 *  - Animated entry  (spring scale-in + fade)
 *  - 30-second live countdown with animated ring progress bar
 *  - Estimated Arrival Time  (now + ETA_MINUTES)
 *  - "Emergency Response Active" status badge with pulsing beacon dot
 *  - Pulsing ambulance icon + flashing danger border
 *  - Auto-advances to "En Route" confirmation at t=0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING, THEME } from '../../utils/constants';
import { makeShadow } from '../../utils/helpers';

/* ─── Constants ─────────────────────────────────────────── */
const COUNTDOWN_SECS = 30;
const ETA_MINUTES    = 8;

const C = {
  red:         '#C62828',
  redLight:    '#FFEBEE',
  redBorder:   '#EF9A9A',
  redMid:      '#E53935',
  amber:       '#F57F17',
  green:       '#2E7D32',
  greenLight:  '#E8F5E9',
  overlay:     'rgba(14,0,0,0.72)',
  cardBg:      '#FFFFFF',
  trackBg:     '#FFCDD2',
};

/* ─── Beacon dot (pulsing circle indicator) ─────────────── */
const BeaconDot = ({ color }) => {
  const ringAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringAnim,    { toValue: 2.0, duration: 900, useNativeDriver: false }),
          Animated.timing(ringAnim,    { toValue: 1.0, duration: 0,   useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0,   duration: 900, useNativeDriver: false }),
          Animated.timing(ringOpacity, { toValue: 0.8, duration: 0,   useNativeDriver: false }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={bdStyles.wrap}>
      {/* Expanding ring */}
      <Animated.View
        style={[
          bdStyles.ring,
          {
            borderColor: color,
            opacity: ringOpacity,
            transform: [{ scale: ringAnim }],
          },
        ]}
      />
      {/* Solid core dot */}
      <View style={[bdStyles.dot, { backgroundColor: color }]} />
    </View>
  );
};

const bdStyles = StyleSheet.create({
  wrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

/* ─── Circular countdown ring ───────────────────────────── */
/**
 * Draws a countdown ring using two Animated.View half-discs (clip technique).
 * Works identically on web + native — no SVG dependency.
 *
 * total  = full circumference seconds (COUNTDOWN_SECS)
 * remain = seconds remaining right now
 */
const CountdownRing = ({ remain, total, size = 140, stroke = 10, color = C.red }) => {
  const HALF = size / 2;
  const progress = remain / total;          // 1 → 0

  // Convert progress fraction to degrees (360° = full ring)
  const degrees = progress * 360;

  // We split the ring into two 180° halves.
  // Left  half: visible for degrees > 180
  // Right half: always visible, rotated to show partial arc
  const rightDeg = degrees >= 180 ? 180 : degrees;
  const showLeft = degrees > 180;
  const leftDeg  = degrees >= 180 ? degrees - 180 : 0;

  const containerStyle = {
    width:  size,
    height: size,
    borderRadius: HALF,
    overflow: 'hidden',
    position: 'relative',
  };

  // Half-disc factory
  const halfDisc = (rotate, extra = {}) => ({
    position: 'absolute',
    width:  size,
    height: size,
    borderRadius: HALF,
    overflow: 'hidden',
    ...extra,
    // Clip to right half
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track ring */}
      <View
        style={{
          position: 'absolute',
          width:  size,
          height: size,
          borderRadius:  HALF,
          borderWidth:   stroke,
          borderColor:   C.trackBg,
        }}
      />

      {/* Progress arc — right half */}
      {rightDeg > 0 && (
        <View
          style={{
            position: 'absolute',
            width:  size,
            height: size,
            borderRadius:  HALF,
            borderWidth:   stroke,
            borderColor:   color,
            // Clip left half to black (using overflow clip + covering View)
            ...(Platform.OS === 'web'
              ? {
                  clipPath: 'inset(0 0 0 50%)',
                  transform: `rotate(${-(180 - rightDeg)}deg)`,
                }
              : {}),
          }}
        />
      )}

      {/* Progress arc — left half (appears when > 180°) */}
      {showLeft && (
        <View
          style={{
            position: 'absolute',
            width:  size,
            height: size,
            borderRadius:  HALF,
            borderWidth:   stroke,
            borderColor:   color,
            ...(Platform.OS === 'web'
              ? {
                  clipPath:  'inset(0 50% 0 0)',
                  transform: `rotate(${-(180 - leftDeg)}deg)`,
                }
              : {}),
          }}
        />
      )}

      {/* Center number */}
      <View
        style={{
          width:  size - stroke * 2 - 8,
          height: size - stroke * 2 - 8,
          borderRadius: (size - stroke * 2 - 8) / 2,
          backgroundColor: remain === 0 ? C.greenLight : C.redLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[ringStyles.number, { color: remain === 0 ? C.green : color }]}>
          {remain}
        </Text>
        <Text style={[ringStyles.unit, { color: remain === 0 ? C.green : C.red + 'BB' }]}>
          {remain === 0 ? 'En Route' : remain === 1 ? 'second' : 'seconds'}
        </Text>
      </View>
    </View>
  );
};

const ringStyles = StyleSheet.create({
  number: {
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 42,
    letterSpacing: -1,
  },
  unit: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
});

/* ─── Progress bar (animated drain) ────────────────────── */
const LinearProgress = ({ remain, total }) => {
  const widthAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    widthAnim.setValue(remain / total);
  }, [remain]);

  const pct = `${Math.round((remain / total) * 100)}%`;

  return (
    <View style={pbStyles.track}>
      <Animated.View
        style={[
          pbStyles.fill,
          {
            width: pct,
            backgroundColor: remain > 10 ? C.redMid : C.amber,
          },
        ]}
      />
    </View>
  );
};

const pbStyles = StyleSheet.create({
  track: {
    height:          8,
    backgroundColor: C.trackBg,
    borderRadius:    4,
    overflow:        'hidden',
    width:           '100%',
  },
  fill: {
    height:       8,
    borderRadius: 4,
  },
});

/* ─── Main component ────────────────────────────────────── */
const AmbulanceDispatch = ({ visible, patient, onClose }) => {
  const [secondsLeft,  setSecondsLeft]  = useState(COUNTDOWN_SECS);
  const [isEnRoute,    setIsEnRoute]    = useState(false);

  /* Animated values */
  const scaleAnim   = useRef(new Animated.Value(0.7)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const ambulanceY  = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(1)).current;
  const borderFlash  = useRef(new Animated.Value(1)).current;

  /* Stable ETA string — captured once when modal opens */
  const etaRef = useRef('');

  /* ── Entry + loop animations ── */
  useEffect(() => {
    if (!visible) {
      // Reset all state for next open
      setSecondsLeft(COUNTDOWN_SECS);
      setIsEnRoute(false);
      scaleAnim.setValue(0.7);
      fadeAnim.setValue(0);
      ambulanceY.stopAnimation();
      flashOpacity.stopAnimation();
      borderFlash.stopAnimation();
      return;
    }

    // Calculate ETA once
    const d = new Date();
    d.setMinutes(d.getMinutes() + ETA_MINUTES);
    etaRef.current = d.toLocaleTimeString('en-IN', {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Entry spring
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue:  1,
        tension:  70,
        friction: 10,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue:  1,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();

    // Ambulance bounce
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(ambulanceY, { toValue: -8, duration: 400, useNativeDriver: false }),
        Animated.timing(ambulanceY, { toValue:  0, duration: 400, useNativeDriver: false }),
      ])
    );
    bounce.start();

    // Header flash
    const flash = Animated.loop(
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 0.4, duration: 550, useNativeDriver: false }),
        Animated.timing(flashOpacity, { toValue: 1.0, duration: 550, useNativeDriver: false }),
      ])
    );
    flash.start();

    // Border pulse
    const bFlash = Animated.loop(
      Animated.sequence([
        Animated.timing(borderFlash, { toValue: 0.35, duration: 700, useNativeDriver: false }),
        Animated.timing(borderFlash, { toValue: 1.0,  duration: 700, useNativeDriver: false }),
      ])
    );
    bFlash.start();

    return () => {
      bounce.stop();
      flash.stop();
      bFlash.stop();
    };
  }, [visible]);

  /* ── Countdown timer ── */
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsEnRoute(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 200, useNativeDriver: false }),
      Animated.timing(fadeAnim,  { toValue: 0,    duration: 200, useNativeDriver: false }),
    ]).start(onClose);
  }, [onClose]);

  if (!patient) return null;

  const patientName = patient.name || 'Unknown Patient';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >

          {/* ── Flashing danger header strip ── */}
          <Animated.View style={[styles.dangerStrip, { opacity: flashOpacity }]}>
            <Ionicons name="radio-button-on" size={12} color="#fff" />
            <Text style={styles.dangerStripText}>EMERGENCY DISPATCH ACTIVATED</Text>
            <Ionicons name="radio-button-on" size={12} color="#fff" />
          </Animated.View>

          {/* ── Ambulance icon ── */}
          <Animated.View
            style={[
              styles.ambulanceWrap,
              { transform: [{ translateY: ambulanceY }] },
            ]}
          >
            <Animated.View style={[styles.ambulanceRing, { opacity: borderFlash }]} />
            <Text style={styles.ambulanceEmoji}>🚑</Text>
          </Animated.View>

          {/* ── Title ── */}
          <Text style={styles.title}>Ambulance Dispatched</Text>
          <Text style={styles.subtitle}>
            Emergency response for{'\n'}
            <Text style={styles.patientName}>{patientName}</Text>
          </Text>

          {/* ── Countdown ring ── */}
          <View style={styles.ringWrap}>
            <CountdownRing
              remain={secondsLeft}
              total={COUNTDOWN_SECS}
              size={148}
              stroke={11}
              color={isEnRoute ? C.green : C.red}
            />
          </View>

          {/* ── Linear drain bar ── */}
          <View style={styles.barSection}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Response timer</Text>
              <Text style={styles.barPct}>
                {Math.round((secondsLeft / COUNTDOWN_SECS) * 100)}%
              </Text>
            </View>
            <LinearProgress remain={secondsLeft} total={COUNTDOWN_SECS} />
          </View>

          {/* ── ETA card ── */}
          <View style={styles.etaCard}>
            <View style={styles.etaRow}>
              <View style={styles.etaItem}>
                <Ionicons name="timer-outline" size={18} color={C.red} />
                <View>
                  <Text style={styles.etaItemLabel}>Response ETA</Text>
                  <Text style={styles.etaItemValue}>{ETA_MINUTES} min</Text>
                </View>
              </View>
              <View style={styles.etaSep} />
              <View style={styles.etaItem}>
                <Ionicons name="location-outline" size={18} color={C.red} />
                <View>
                  <Text style={styles.etaItemLabel}>Arrive by</Text>
                  <Text style={styles.etaItemValue}>{etaRef.current}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Status badge ── */}
          <View style={[styles.statusBadge, isEnRoute && styles.statusBadgeEnRoute]}>
            <BeaconDot color={isEnRoute ? C.green : C.red} />
            <Text style={[styles.statusBadgeText, isEnRoute && { color: C.green }]}>
              {isEnRoute ? '✓  Ambulance En Route' : 'Emergency Response Active'}
            </Text>
          </View>

          {/* ── Dismiss button ── */}
          <TouchableOpacity
            style={[styles.dismissBtn, isEnRoute && styles.dismissBtnActive]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isEnRoute ? 'checkmark-circle-outline' : 'close-circle-outline'}
              size={18}
              color={isEnRoute ? '#fff' : C.red}
            />
            <Text style={[styles.dismissText, isEnRoute && styles.dismissTextActive]}>
              {isEnRoute ? 'Confirm & Close' : 'Dismiss'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    // Web-safe — ensure it sits above everything
    ...(Platform.OS === 'web' && { zIndex: 9999 }),
  },

  card: {
    backgroundColor: C.cardBg,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: C.redBorder,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: SPACING.md,
    ...makeShadow(12, 24, 0.35, 20, C.red),
  },

  /* Header flash strip */
  dangerStrip: {
    alignSelf: 'stretch',
    backgroundColor: C.redMid,
    borderRadius: 10,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  dangerStripText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: FONT.sizes.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  /* Ambulance icon */
  ambulanceWrap: {
    marginTop: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
    height: 96,
  },
  ambulanceRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: C.redBorder,
    backgroundColor: C.redLight,
  },
  ambulanceEmoji: {
    fontSize: 52,
    lineHeight: 60,
  },

  /* Title */
  title: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '900',
    color: C.red,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginTop: -SPACING.xs,
  },
  subtitle: {
    fontSize: FONT.sizes.sm,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: -SPACING.sm,
  },
  patientName: {
    fontWeight: '800',
    color: THEME.textPrimary,
    fontSize: FONT.sizes.md,
  },

  /* Ring */
  ringWrap: {
    marginVertical: SPACING.xs,
  },

  /* Progress bar */
  barSection: {
    alignSelf: 'stretch',
    gap: 5,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  barPct: {
    fontSize: FONT.sizes.xs,
    color: C.red,
    fontWeight: '800',
  },

  /* ETA card */
  etaCard: {
    alignSelf: 'stretch',
    backgroundColor: C.redLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.redBorder,
    padding: SPACING.md,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  etaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  etaSep: {
    width: 1,
    height: 36,
    backgroundColor: C.redBorder,
  },
  etaItemLabel: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  etaItemValue: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: C.red,
    marginTop: 1,
  },

  /* Status badge */
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    alignSelf: 'stretch',
    backgroundColor: C.redLight,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.redBorder,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  statusBadgeEnRoute: {
    backgroundColor: C.greenLight,
    borderColor: '#A5D6A7',
  },
  statusBadgeText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '800',
    color: C.red,
    letterSpacing: 0.3,
  },

  /* Dismiss button */
  dismissBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.redBorder,
    backgroundColor: 'transparent',
    marginTop: -SPACING.xs,
  },
  dismissBtnActive: {
    backgroundColor: C.green,
    borderColor: C.green,
    ...makeShadow(3, 6, 0.25, 4, C.green),
  },
  dismissText: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: C.red,
  },
  dismissTextActive: {
    color: '#fff',
  },
});

export default AmbulanceDispatch;
