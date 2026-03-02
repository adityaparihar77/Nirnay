/**
 * SkeletonLoader.js
 * Pulsing shimmer skeleton that mirrors the patient table layout.
 * Shown while data is loading on first fetch.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SPACING, THEME } from '../../utils/constants';

/* ── Single shimmer block ──────────────────────────── */
const Bone = ({ width, height = 14, style }) => (
  <View style={[styles.bone, { width, height }, style]} />
);

/* ── One skeleton row ──────────────────────────────── */
const SkeletonRow = ({ delay = 0, shimmer }) => (
  <Animated.View style={[styles.row, { opacity: shimmer }]}>
    <Bone width={60} />
    <Bone width={120} />
    <Bone width={30} />
    <Bone width={70} />
    <Bone width={60} />
    <Bone width={72} height={22} style={styles.badgeBone} />
    <Bone width={110} />
  </Animated.View>
);

/* ── Header skeleton ───────────────────────────────── */
const SkeletonHeader = () => (
  <View style={styles.header}>
    {[80, 140, 40, 80, 70, 90, 120].map((w, i) => (
      <Bone key={i} width={w} height={11} />
    ))}
  </View>
);

/* ── Summary card skeletons ────────────────────────── */
const SkeletonCards = ({ shimmer }) => (
  <View style={styles.cardGrid}>
    {[0, 1, 2, 3].map((i) => (
      <Animated.View key={i} style={[styles.card, { opacity: shimmer }]}>
        <View style={styles.cardIcon} />
        <Bone width={40} height={28} style={{ borderRadius: 6 }} />
        <Bone width={70} height={10} />
      </Animated.View>
    ))}
  </View>
);

/* ── Main component ────────────────────────────────── */
const SkeletonLoader = () => {
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1,    duration: 750, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0.35, duration: 750, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <View style={styles.wrapper}>
      {/* Card skeletons */}
      <SkeletonCards shimmer={shimmer} />

      {/* Table skeleton */}
      <View style={styles.tableCard}>
        <SkeletonHeader />
        {[0, 60, 120, 180, 240, 300].map((delay, i) => (
          <SkeletonRow key={i} delay={delay} shimmer={shimmer} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: SPACING.md,
  },
  bone: {
    backgroundColor: '#DDE5ED',
    borderRadius: 6,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  card: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: THEME.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DDE5ED',
    marginBottom: 4,
  },
  tableCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  badgeBone: {
    borderRadius: 10,
  },
});

export default SkeletonLoader;
