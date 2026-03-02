/**
 * FilterBar.js
 * Filter pills (ALL / RED / YELLOW / GREEN), manual refresh button,
 * auto-refresh toggle, and last-updated timestamp.
 */

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING, THEME } from '../../utils/constants';
import { makeShadow } from '../../utils/helpers';

const FILTER_KEYS = ['ALL', 'RED', 'YELLOW', 'GREEN'];

const FILTER_COLORS = {
  ALL:    { active: THEME.primary,  bg: THEME.primaryLight },
  RED:    { active: '#C62828',      bg: '#FFEBEE' },
  YELLOW: { active: '#E65100',      bg: '#FFF3E0' },
  GREEN:  { active: '#2E7D32',      bg: '#E8F5E9' },
};

/**
 * @param {{
 *  filter: string,
 *  onFilterChange: (key: string) => void,
 *  onRefresh: () => void,
 *  isLoading: boolean,
 *  autoRefresh: boolean,
 *  onAutoRefreshToggle: (val: boolean) => void,
 *  lastUpdated: Date|null,
 * }} props
 */
const FilterBar = ({
  filter,
  onFilterChange,
  onRefresh,
  isLoading,
  autoRefresh,
  onAutoRefreshToggle,
  lastUpdated,
}) => {
  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <View style={styles.wrapper}>
      {/* Filter pills */}
      <View style={styles.pills}>
        {FILTER_KEYS.map((key) => {
          const active = filter === key;
          const { active: activeColor, bg } = FILTER_COLORS[key];
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.pill,
                active
                  ? { backgroundColor: activeColor, borderColor: activeColor }
                  : { backgroundColor: THEME.surface, borderColor: THEME.border },
              ]}
              onPress={() => onFilterChange(key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, { color: active ? '#fff' : THEME.textSecondary }]}>
                {key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Controls row */}
      <View style={styles.controls}>
        {/* Last updated */}
        <View style={styles.lastUpdated}>
          <Ionicons name="time-outline" size={13} color={THEME.textMuted} />
          <Text style={styles.lastUpdatedText}>Updated {lastUpdatedLabel}</Text>
        </View>

        {/* Auto-refresh toggle */}
        <View style={styles.autoRefreshRow}>
          <Ionicons
            name="refresh-circle-outline"
            size={14}
            color={autoRefresh ? THEME.secondary : THEME.textMuted}
          />
          <Text
            style={[
              styles.autoLabel,
              { color: autoRefresh ? THEME.secondary : THEME.textMuted },
            ]}
          >
            Auto (10s)
          </Text>
          <Switch
            value={autoRefresh}
            onValueChange={onAutoRefreshToggle}
            trackColor={{ false: THEME.border, true: THEME.secondary }}
            thumbColor={THEME.surface}
            style={styles.switch}
          />
        </View>

        {/* Manual refresh */}
        <TouchableOpacity
          style={[styles.refreshBtn, isLoading && styles.refreshBtnDisabled]}
          onPress={onRefresh}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={THEME.surface} />
          ) : (
            <Ionicons name="sync-outline" size={15} color={THEME.surface} />
          )}
          <Text style={styles.refreshText}>{isLoading ? 'Loading…' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: THEME.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...makeShadow(1, 4, 0.05, 1),
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  pillText: {
    fontWeight: '700',
    fontSize: FONT.sizes.xs,
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  lastUpdated: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastUpdatedText: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
  },
  autoRefreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  autoLabel: {
    fontSize: FONT.sizes.xs,
    fontWeight: '600',
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  refreshBtnDisabled: {
    backgroundColor: THEME.border,
  },
  refreshText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT.sizes.xs,
  },
});

export default FilterBar;
