/**
 * RiskChart.js
 * Responsive horizontal bar chart built entirely with React Native Views.
 * No third-party chart library required — works on web, iOS, and Android.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING, THEME } from '../../utils/constants';
import { makeShadow } from '../../utils/helpers';

const BARS = [
  { key: 'RED',    label: 'Critical',  color: '#EF5350', bg: '#FFEBEE', icon: 'alert-circle' },
  { key: 'YELLOW', label: 'Monitor',   color: '#FFA726', bg: '#FFF3E0', icon: 'time' },
  { key: 'GREEN',  label: 'Stable',    color: '#66BB6A', bg: '#E8F5E9', icon: 'checkmark-circle' },
];

/**
 * @param {{ counts: {RED: number, YELLOW: number, GREEN: number, ALL: number} }} props
 */
const RiskChart = ({ counts }) => {
  const max = useMemo(
    () => Math.max(counts.RED, counts.YELLOW, counts.GREEN, 1),
    [counts]
  );

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="bar-chart" size={18} color={THEME.primary} />
        <Text style={styles.title}>Risk Distribution</Text>
        <Text style={styles.subtitle}>{counts.ALL} patients total</Text>
      </View>

      {/* Bars */}
      <View style={styles.barsWrap}>
        {BARS.map(({ key, label, color, bg, icon }) => {
          const value = counts[key];
          const pct = max > 0 ? (value / max) * 100 : 0;
          const displayPct =
            counts.ALL > 0 ? Math.round((value / counts.ALL) * 100) : 0;

          return (
            <View key={key} style={styles.row}>
              {/* Left label */}
              <View style={styles.labelWrap}>
                <View style={[styles.iconCircle, { backgroundColor: bg }]}>
                  <Ionicons name={icon} size={13} color={color} />
                </View>
                <Text style={styles.barLabel}>{label}</Text>
              </View>

              {/* Track + fill */}
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]}>
                  {pct > 18 && (
                    <Text style={styles.inlineCount}>{value}</Text>
                  )}
                </View>
                {pct <= 18 && value > 0 && (
                  <Text style={[styles.externalCount, { color }]}>{value}</Text>
                )}
              </View>

              {/* Percentage */}
              <Text style={[styles.pct, { color }]}>{displayPct}%</Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {BARS.map(({ key, label, color }) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{counts[key]} {label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: SPACING.md,
    gap: SPACING.md,
    ...makeShadow(2, 8, 0.06, 2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    flex: 1,
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  subtitle: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  barsWrap: {
    gap: SPACING.sm + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    gap: SPACING.xs,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barLabel: {
    fontSize: FONT.sizes.xs,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 26,
    backgroundColor: '#F3F6F9',
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: SPACING.xs,
    minWidth: 4,
  },
  inlineCount: {
    color: '#fff',
    fontSize: FONT.sizes.xs,
    fontWeight: '800',
    paddingRight: 6,
  },
  externalCount: {
    fontSize: FONT.sizes.xs,
    fontWeight: '800',
    paddingLeft: 6,
  },
  pct: {
    width: 34,
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    textAlign: 'right',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONT.sizes.xs,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
});

export default RiskChart;
