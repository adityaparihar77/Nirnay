/**
 * SyncStatusBar.js
 * Displays local queue count, network status, and last sync time.
 * Queue badge pulses orange when records are waiting to sync.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME, SPACING, FONT } from '../utils/constants';
import { formatRelativeTime, makeShadow } from '../utils/helpers';

/* ── Animated queue badge ────────────────────────────────── */
const QueueBadge = ({ count }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 500, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 500, useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [count > 0]);

  return (
    <Animated.View
      style={[
        styles.badge,
        count > 0 ? styles.badgeActive : styles.badgeEmpty,
        count > 0 && { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Text style={[styles.badgeText, count > 0 ? styles.badgeTextActive : styles.badgeTextEmpty]}>
        {count}
      </Text>
    </Animated.View>
  );
};

const SyncStatusBar = ({ queueCount, lastSyncTime, isOnline, isSyncing, onManualSync }) => {
  return (
    <View style={styles.container}>
      {/* Network status pill */}
      <View style={[styles.pill, isOnline ? styles.pillOnline : styles.pillOffline]}>
        <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
        <Text style={[styles.pillText, isOnline ? styles.pillTextOnline : styles.pillTextOffline]}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>

      {/* Queue count with animated badge */}
      <View style={styles.stat}>
        <Ionicons name="people-outline" size={14} color={THEME.textSecondary} />
        <Text style={styles.statLabel}>Queue</Text>
        <QueueBadge count={queueCount} />
      </View>

      {/* Last sync */}
      <View style={styles.stat}>
        <Ionicons name="time-outline" size={14} color={THEME.textSecondary} />
        <Text style={styles.statLabel}>Synced</Text>
        <Text style={styles.statValue}>{formatRelativeTime(lastSyncTime)}</Text>
      </View>

      {/* Manual sync button */}
      <TouchableOpacity
        style={[styles.syncButton, (!isOnline || isSyncing) && styles.syncButtonDisabled]}
        onPress={onManualSync}
        disabled={!isOnline || isSyncing}
        activeOpacity={0.7}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={THEME.surface} />
        ) : (
          <Ionicons name="cloud-upload-outline" size={16} color={THEME.surface} />
        )}
        <Text style={styles.syncButtonText}>{isSyncing ? 'Syncing…' : 'Sync'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 14,
    gap: SPACING.sm,
    ...makeShadow(2, 6, 1, 3, THEME.shadow),
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  pillOnline: { backgroundColor: '#E8F5E9' },
  pillOffline: { backgroundColor: '#FBE9E7' },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOnline: { backgroundColor: THEME.success },
  dotOffline: { backgroundColor: THEME.danger },
  pillText: {
    fontSize: FONT.sizes.xs,
    fontWeight: '600',
  },
  pillTextOnline: { color: THEME.success },
  pillTextOffline: { color: THEME.danger },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statLabel: {
    fontSize: FONT.sizes.xs,
    color: THEME.textSecondary,
  },
  statValue: {
    fontSize: FONT.sizes.xs,
    color: THEME.textPrimary,
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: { backgroundColor: THEME.primary },
  badgeEmpty: { backgroundColor: THEME.border },
  badgeText: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
  },
  badgeTextActive: { color: THEME.surface },
  badgeTextEmpty: { color: THEME.textSecondary },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  syncButtonDisabled: {
    backgroundColor: THEME.border,
  },
  syncButtonText: {
    fontSize: FONT.sizes.xs,
    color: THEME.surface,
    fontWeight: '600',
  },
});

export default SyncStatusBar;
