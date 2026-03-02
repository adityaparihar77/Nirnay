/**
 * SummaryCards.js
 * Four metric cards: Total / RED / YELLOW / GREEN patient counts.
 * Tapping a card applies that filter.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING, THEME } from '../../utils/constants';
import { makeShadow } from '../../utils/helpers';

/**
 * Smoothly animates a numeric counter to a new target value.
 * Returns the current display integer.
 */
const useAnimatedCounter = (target) => {
  const animVal = useRef(new Animated.Value(target)).current;
  const [displayed, setDisplayed] = useState(target);

  useEffect(() => {
    const id = animVal.addListener(({ value }) => setDisplayed(Math.round(value)));
    Animated.timing(animVal, {
      toValue: target,
      duration: 600,
      useNativeDriver: false,
    }).start();
    return () => animVal.removeListener(id);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  return displayed;
};

const CARD_CONFIGS = [
  {
    key: 'ALL',
    label: 'Total Patients',
    icon: 'people',
    accentColor: THEME.primary,
    bgColor: THEME.primaryLight,
  },
  {
    key: 'RED',
    label: 'Critical',
    icon: 'alert-circle',
    accentColor: '#C62828',
    bgColor: '#FFEBEE',
  },
  {
    key: 'YELLOW',
    label: 'Monitor',
    icon: 'time',
    accentColor: '#E65100',
    bgColor: '#FFF3E0',
  },
  {
    key: 'GREEN',
    label: 'Stable',
    icon: 'checkmark-circle',
    accentColor: '#2E7D32',
    bgColor: '#E8F5E9',
  },
];

/**
 * @param {{
 *   counts: {ALL: number, RED: number, YELLOW: number, GREEN: number},
 *   activeFilter: string,
 *   onFilterChange: (key: string) => void,
 * }} props
 */
/**
 * Single animated card.
 */
const MetricCard = ({ label, icon, accentColor, bgColor, count, active, onPress, colWidth }) => {
  const displayedCount = useAnimatedCounter(count);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { width: colWidth, borderColor: active ? accentColor : THEME.border },
        active && { backgroundColor: bgColor },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={accentColor} />
      </View>
      <Text style={[styles.count, { color: accentColor }]}>{displayedCount}</Text>
      <Text style={styles.label}>{label}</Text>
      {active && <View style={[styles.activeDot, { backgroundColor: accentColor }]} />}
    </TouchableOpacity>
  );
};

const SummaryCards = ({ counts, activeFilter, onFilterChange }) => {
  const { width } = useWindowDimensions();
  const col = width >= 700 ? '23%' : '47%';

  return (
    <View style={styles.grid}>
      {CARD_CONFIGS.map(({ key, label, icon, accentColor, bgColor }) => (
        <MetricCard
          key={key}
          label={label}
          icon={icon}
          accentColor={accentColor}
          bgColor={bgColor}
          count={counts[key]}
          active={activeFilter === key}
          onPress={() => onFilterChange(key)}
          colWidth={col}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: SPACING.md,
    alignItems: 'flex-start',
    gap: 4,
    ...makeShadow(2, 6, 0.06, 2),
    position: 'relative',
    overflow: 'hidden',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  count: {
    fontSize: FONT.sizes.hero,
    fontWeight: '800',
    lineHeight: FONT.sizes.hero + 4,
  },
  label: {
    fontSize: FONT.sizes.xs,
    color: THEME.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  activeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default SummaryCards;
