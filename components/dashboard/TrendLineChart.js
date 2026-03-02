/**
 * TrendLineChart.js
 *
 * Real-time multi-series line chart for the Nirnay dashboard.
 * Built entirely with React Native Views — no external chart library.
 *
 * Technique: each line segment between consecutive data points is rendered
 * as a thin positioned <View> rotated to the correct angle (atan2).
 * This is portable across web, iOS, and Android.
 *
 * Series tracked:
 *  🔴 Critical  (RED)
 *  🟡 Monitor   (YELLOW)
 *  🟢 Stable    (GREEN)
 *
 * A new snapshot is captured every time `dataVersion` changes (i.e. every
 * refresh / new patient submission). The chart keeps the last MAX_POINTS
 * snapshots so the line scrolls naturally as data arrives.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING, THEME } from '../../utils/constants';
import { makeShadow } from '../../utils/helpers';

/* ─── Config ─────────────────────────────────────────────── */
const MAX_POINTS = 10;   // rolling window
const CHART_H    = 160;  // px — chart plot area height
const PAD_LEFT   = 40;   // space for Y-axis labels
const PAD_RIGHT  = 12;
const PAD_TOP    = 14;
const PAD_BOTTOM = 28;   // space for X-axis labels
const PLOT_H     = CHART_H - PAD_TOP - PAD_BOTTOM; // 118 px

const SERIES = [
  { key: 'red',    label: 'Critical', color: '#EF5350', dotBorder: '#C62828' },
  { key: 'yellow', label: 'Monitor',  color: '#FFA726', dotBorder: '#E65100' },
  { key: 'green',  label: 'Stable',   color: '#66BB6A', dotBorder: '#2E7D32' },
];

/* ─── Time label helper ─────────────────────────────────── */
const toHHMM = (d) =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

/* ─── Single segment (rotated thin rect) ────────────────── */
const Segment = ({ x1, y1, x2, y2, color }) => {
  const dx  = x2 - x1;
  const dy  = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.5) return null;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const mx    = (x1 + x2) / 2;
  const my    = (y1 + y2) / 2;
  return (
    <View
      style={{
        position:        'absolute',
        left:            mx - len / 2,
        top:             my - 1.5,
        width:           len,
        height:          3,
        borderRadius:    1.5,
        backgroundColor: color,
        transform:       [{ rotate: `${angle}deg` }],
      }}
    />
  );
};

/* ─── Data dot ───────────────────────────────────────────── */
const Dot = ({ cx, cy, color, border }) => (
  <View
    style={{
      position:        'absolute',
      left:            cx - 5,
      top:             cy - 5,
      width:           10,
      height:          10,
      borderRadius:    5,
      backgroundColor: color,
      borderWidth:     2,
      borderColor:     border,
    }}
  />
);

/* ─── Y-axis grid lines + labels ─────────────────────────── */
const YAxis = ({ maxVal, plotWidth }) => {
  // Up to 4 horizontal guide lines
  const steps = maxVal <= 4 ? maxVal : 4;
  const ticks = Array.from({ length: steps + 1 }, (_, i) =>
    Math.round((maxVal / steps) * i)
  );
  return (
    <>
      {ticks.map((val) => {
        const y = PAD_TOP + (1 - val / Math.max(maxVal, 1)) * PLOT_H;
        return (
          <React.Fragment key={val}>
            {/* Grid line */}
            <View
              style={{
                position:        'absolute',
                left:            PAD_LEFT,
                top:             y,
                width:           plotWidth,
                height:          1,
                backgroundColor: val === 0 ? '#DDE5ED' : '#EEF2F5',
              }}
            />
            {/* Label */}
            <Text
              style={{
                position:  'absolute',
                left:      0,
                top:       y - 7,
                width:     PAD_LEFT - 6,
                textAlign: 'right',
                fontSize:  10,
                color:     THEME.textMuted,
                fontWeight: '600',
              }}
            >
              {val}
            </Text>
          </React.Fragment>
        );
      })}
    </>
  );
};

/* ─── X-axis time labels ─────────────────────────────────── */
const XAxis = ({ history, plotWidth }) => {
  const n = history.length;
  if (n === 0) return null;
  // Show a subset of labels to avoid overlap: first, middle, last
  const showSet = new Set([0, Math.floor((n - 1) / 2), n - 1]);
  return (
    <>
      {history.map((pt, i) => {
        if (!showSet.has(i)) return null;
        const x = PAD_LEFT + (n === 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
        return (
          <Text
            key={i}
            style={{
              position:  'absolute',
              left:      x - 20,
              top:       CHART_H - PAD_BOTTOM + 5,
              width:     40,
              fontSize:  9,
              color:     THEME.textMuted,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            {toHHMM(pt.time)}
          </Text>
        );
      })}
    </>
  );
};

/* ─── "No data" placeholder ──────────────────────────────── */
const EmptyPlot = ({ plotWidth }) => (
  <View
    style={{
      position:       'absolute',
      left:           PAD_LEFT,
      top:            PAD_TOP,
      width:          plotWidth,
      height:         PLOT_H,
      alignItems:     'center',
      justifyContent: 'center',
      gap:            6,
    }}
  >
    <Ionicons name="pulse-outline" size={28} color={THEME.border} />
    <Text style={{ fontSize: FONT.sizes.xs, color: THEME.textMuted, textAlign: 'center' }}>
      Waiting for patient data…{'\n'}Chart updates automatically.
    </Text>
  </View>
);

/* ─── New-point flash indicator ──────────────────────────── */
const UpdateFlash = () => {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    opacityAnim.setValue(1);
    Animated.timing(opacityAnim, {
      toValue:  0,
      duration: 1800,
      useNativeDriver: false,
    }).start();
  });

  return (
    <Animated.View style={[flashStyles.dot, { opacity: opacityAnim }]}>
      <View style={flashStyles.inner} />
    </Animated.View>
  );
};

const flashStyles = StyleSheet.create({
  dot: {
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: '#E3F2FD',
    alignItems:      'center',
    justifyContent:  'center',
  },
  inner: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: THEME.primary,
  },
});

/* ─── Main component ─────────────────────────────────────── */
/**
 * @param {{
 *   counts:      { RED: number, YELLOW: number, GREEN: number },
 *   dataVersion: number,
 * }} props
 */
const TrendLineChart = ({ counts, dataVersion }) => {
  /* Rolling history of snapshots */
  const [history, setHistory] = useState([]);
  const prevVersionRef = useRef(-1);

  /* Capture snapshot on every dataVersion increment */
  useEffect(() => {
    if (dataVersion === prevVersionRef.current) return;
    prevVersionRef.current = dataVersion;

    setHistory((prev) => {
      const next = [
        ...prev,
        { time: new Date(), red: counts.RED, yellow: counts.YELLOW, green: counts.GREEN },
      ];
      return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
    });
  }, [dataVersion, counts.RED, counts.YELLOW, counts.GREEN]);

  /* Measure the card width for responsive plotting */
  const [canvasWidth, setCanvasWidth] = useState(320);
  const plotWidth = canvasWidth - PAD_LEFT - PAD_RIGHT;

  /* Max Y for axis scale — at least 5 so empty chart has a sensible scale */
  const maxVal = Math.max(
    5,
    ...history.flatMap((pt) => [pt.red, pt.yellow, pt.green])
  );

  /* Compute (x,y) pixel coordinates for every series at every snapshot */
  const n = history.length;
  const coords = SERIES.map(({ key }) =>
    history.map((pt, i) => ({
      x: PAD_LEFT + (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth),
      y: PAD_TOP  + (1 - pt[key] / maxVal) * PLOT_H,
      v: pt[key],
    }))
  );

  /* Latest counts for the live readout row */
  const latest = history[history.length - 1];

  return (
    <View
      style={styles.card}
      onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Ionicons name="trending-up" size={18} color={THEME.primary} />
        <Text style={styles.title}>Patient Trend</Text>
        {n > 0 && (
          <View style={styles.liveChip}>
            <UpdateFlash key={dataVersion} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        <Text style={styles.subtitle}>{n} snapshot{n !== 1 ? 's' : ''}</Text>
      </View>

      {/* ── Canvas ── */}
      <View style={[styles.canvas, { height: CHART_H }]}>
        <YAxis maxVal={maxVal} plotWidth={plotWidth} />
        <XAxis history={history} plotWidth={plotWidth} />

        {n === 0 && <EmptyPlot plotWidth={plotWidth} />}

        {n > 0 && SERIES.map(({ key, color, dotBorder }, si) => (
          <React.Fragment key={key}>
            {/* Line segments */}
            {coords[si].slice(1).map((pt, i) => (
              <Segment
                key={`seg-${i}`}
                x1={coords[si][i].x}
                y1={coords[si][i].y}
                x2={pt.x}
                y2={pt.y}
                color={color}
              />
            ))}
            {/* Dots */}
            {coords[si].map((pt, i) => (
              <Dot key={`dot-${i}`} cx={pt.x} cy={pt.y} color={color} border={dotBorder} />
            ))}
          </React.Fragment>
        ))}
      </View>

      {/* ── Live readout chips ── */}
      {latest && (
        <View style={styles.readoutRow}>
          {SERIES.map(({ key, label, color }, si) => (
            <View key={key} style={[styles.readoutChip, { borderColor: color + '55', backgroundColor: color + '12' }]}>
              <View style={[styles.readoutDot, { backgroundColor: color }]} />
              <View>
                <Text style={[styles.readoutCount, { color }]}>{latest[key]}</Text>
                <Text style={styles.readoutLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Legend ── */}
      <View style={styles.legend}>
        {SERIES.map(({ label, color }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: color }]} />
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
        <Text style={styles.legendNote}>Updates on each new patient</Text>
      </View>
    </View>
  );
};

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.surface,
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     THEME.border,
    padding:         SPACING.md,
    gap:             SPACING.md,
    ...makeShadow(2, 8, 0.06, 2),
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            SPACING.sm,
  },
  title: {
    flex:       1,
    fontSize:   FONT.sizes.md,
    fontWeight: '700',
    color:      THEME.textPrimary,
  },
  liveChip: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius:   20,
  },
  liveText: {
    fontSize:   9,
    fontWeight: '800',
    color:      THEME.primary,
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize:  FONT.sizes.xs,
    color:     THEME.textMuted,
    fontWeight: '500',
  },
  canvas: {
    position:        'relative',
    backgroundColor: THEME.background,
    borderRadius:    10,
    overflow:        'hidden',
  },
  /* Live readout */
  readoutRow: {
    flexDirection: 'row',
    gap:           SPACING.sm,
    flexWrap:      'wrap',
  },
  readoutChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             SPACING.sm,
    flex:            1,
    minWidth:        80,
    borderWidth:     1.5,
    borderRadius:    10,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
  },
  readoutDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
  readoutCount: {
    fontSize:   FONT.sizes.xl,
    fontWeight: '900',
    lineHeight: FONT.sizes.xl + 2,
  },
  readoutLabel: {
    fontSize:   FONT.sizes.xs,
    color:      THEME.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  /* Legend */
  legend: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    alignItems:     'center',
    gap:            SPACING.md,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop:     SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  legendLine: {
    width:        12,
    height:       3,
    borderRadius: 1.5,
  },
  legendDot: {
    width:        7,
    height:       7,
    borderRadius: 3.5,
    marginLeft:   -4,
    borderWidth:  1.5,
    borderColor:  '#fff',
  },
  legendText: {
    fontSize:   FONT.sizes.xs,
    color:      THEME.textSecondary,
    fontWeight: '600',
  },
  legendNote: {
    marginLeft: 'auto',
    fontSize:   FONT.sizes.xs,
    color:      THEME.textMuted,
    fontStyle:  'italic',
  },
});

export default TrendLineChart;
