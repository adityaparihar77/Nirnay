/**
 * AlertBanner.js
 * Displays a prominent top-of-dashboard critical alert when one or
 * more RED-risk patients are in the current patient list.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING } from '../../utils/constants';

const DANGER = '#C62828';
const DANGER_BG = '#FFEBEE';
const DANGER_BORDER = '#EF9A9A';

/**
 * @param {{ redCount: number }} props
 */
const AlertBanner = ({ redCount }) => {
  const flashAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (redCount === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.45, duration: 700, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [redCount, flashAnim]);

  if (redCount === 0) return null;

  return (
    <View style={styles.banner}>
      <Animated.View style={[styles.iconWrap, { opacity: flashAnim }]}>
        <Ionicons name="warning" size={20} color={DANGER} />
      </Animated.View>
      <Text style={styles.text}>
        🚨 {redCount} Critical Patient{redCount > 1 ? 's' : ''} Require
        {redCount === 1 ? 's' : ''} Immediate Attention
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DANGER_BG,
    borderWidth: 1,
    borderColor: DANGER_BORDER,
    borderRadius: 12,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFCDD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: DANGER,
    fontWeight: '700',
    fontSize: FONT.sizes.sm,
    letterSpacing: 0.2,
  },
});

export default AlertBanner;
