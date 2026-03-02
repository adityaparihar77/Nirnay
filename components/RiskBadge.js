/**
 * RiskBadge.js
 * Compact badge component for displaying risk level inline.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RISK_CONFIG } from '../utils/riskCalculator';
import { FONT, SPACING } from '../utils/constants';

const RiskBadge = ({ level, size = 'md' }) => {
  const config = RISK_CONFIG[level];
  if (!config) return null;

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.background, borderColor: config.borderColor },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Ionicons
        name={config.icon}
        size={isSmall ? 12 : 16}
        color={config.color}
      />
      <Text
        style={[
          styles.label,
          { color: config.color },
          isSmall && styles.labelSmall,
        ]}
      >
        {level}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 1,
    borderRadius: 20,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  label: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: FONT.sizes.xs,
  },
});

export default RiskBadge;
