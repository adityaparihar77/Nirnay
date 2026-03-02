/**
 * PatientTable.js
 * Horizontally-scrollable patient table with:
 *  - RED row highlighting
 *  - Risk level badges (colour-coded)
 *  - Relative + absolute timestamps
 *  - Empty and error states
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING, THEME } from '../../utils/constants';
import { formatDateTime, formatRelativeTime, makeShadow } from '../../utils/helpers';

/* ── Column widths ─────────────────────────────────────── */
const COL = {
  id:    80,
  name:  180,
  age:   60,
  bp:    100,
  temp:  90,
  risk:  110,
  time:  210,
};
const TABLE_MIN_WIDTH = Object.values(COL).reduce((a, b) => a + b, 0) + SPACING.md * 2;

/* ── Badge colours ─────────────────────────────────────── */
const BADGE = {
  RED:    { bg: '#FFEBEE', text: '#C62828', icon: 'alert-circle' },
  YELLOW: { bg: '#FFF3E0', text: '#E65100', icon: 'time' },
  GREEN:  { bg: '#E8F5E9', text: '#2E7D32', icon: 'checkmark-circle' },
};
const defaultBadge = { bg: '#F5F5F5', text: '#757575', icon: 'help-circle' };

const getBadge = (level) => BADGE[level] || defaultBadge;

/* ── Header cell ───────────────────────────────────────── */
const TH = ({ label, width, align = 'left' }) => (
  <Text style={[styles.th, { width, textAlign: align }]}>{label}</Text>
);

/* ── Data row ──────────────────────────────────────────── */
const PatientRow = ({ patient, index, isNew, onPress }) => {
  const isRed = patient.riskLevel === 'RED';
  const badge = getBadge(patient.riskLevel);
  const relTime = formatRelativeTime(patient.timestamp);
  const absTime = formatDateTime(patient.timestamp);

  // Entrance animation — staggered per row
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const delay = index * 40;
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 280, delay, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 260, delay, useNativeDriver: false }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TouchableOpacity onPress={() => onPress && onPress(patient)} activeOpacity={onPress ? 0.75 : 1}>
    <Animated.View
      style={[
        styles.row,
        index % 2 === 0 && styles.rowEven,
        isRed && styles.rowRed,
        isNew && styles.rowNew,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* ID */}
      <Text style={[styles.td, { width: COL.id }]} numberOfLines={1}>
        {String(patient.id).slice(-6).toUpperCase()}
      </Text>

      {/* Name */}
      <View style={[styles.nameCell, { width: COL.name }]}>
        {isRed && (
          <Ionicons name="alert-circle" size={13} color="#C62828" style={{ marginRight: 4 }} />
        )}
        <Text style={[styles.td, styles.nameText, isRed && styles.redText]} numberOfLines={1}>
          {patient.name}
        </Text>
      </View>

      {/* Age */}
      <Text style={[styles.td, { width: COL.age, textAlign: 'center' }]}>{patient.age}</Text>

      {/* BP */}
      <Text style={[styles.td, { width: COL.bp }]}>{patient.bp}</Text>

      {/* Temp */}
      <Text style={[styles.td, { width: COL.temp }]}>{patient.temp}</Text>

      {/* Risk badge */}
      <View style={[styles.badgeCell, { width: COL.risk }]}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Ionicons name={badge.icon} size={11} color={badge.text} />
          <Text style={[styles.badgeText, { color: badge.text }]}>
            {patient.riskLevel || 'N/A'}
          </Text>
        </View>
      </View>

      {/* Timestamp */}
      <View style={[styles.timeCell, { width: COL.time }]}>
        <View style={styles.timeLine}>
          <Text style={styles.relTime}>{relTime}</Text>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.absTime}>{absTime}</Text>
      </View>
    </Animated.View>
    </TouchableOpacity>
  );
};

/* ── Main component ────────────────────────────────────── */
/**
 * @param {{
 *   patients: PatientRecord[],
 *   filter: string,
 *   newPatientIds?: Set<string>,
 *   dataVersion?: number,
 *   onRowPress?: (patient: PatientRecord) => void,
 * }} props
 */
const PatientTable = ({ patients, filter, newPatientIds = new Set(), dataVersion = 0, onRowPress }) => {
  const tableContent = (
    <View style={{ minWidth: TABLE_MIN_WIDTH }}>
      {/* Table header */}
      <View style={styles.thead}>
        <TH label="ID"        width={COL.id} />
        <TH label="Name"      width={COL.name} />
        <TH label="Age"       width={COL.age}  align="center" />
        <TH label="BP"        width={COL.bp} />
        <TH label="Temp"      width={COL.temp} />
        <TH label="Risk"      width={COL.risk} />
        <TH label="Recorded"  width={COL.time} />
      </View>

      {/* Rows */}
      {patients.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={32} color={THEME.textMuted} />
          <Text style={styles.emptyText}>No patients found for "{filter}"</Text>
        </View>
      ) : (
        patients.map((p, i) => (
          <PatientRow
            key={`${p.id}-${dataVersion}`}
            patient={p}
            index={i}
            isNew={newPatientIds.has(p.id)}
            onPress={onRowPress}
          />
        ))
      )}
    </View>
  );

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <Ionicons name="list" size={17} color={THEME.primary} />
        <Text style={styles.cardTitle}>Patient Records</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{patients.length}</Text>
        </View>
      </View>

      {/* On web a horizontal ScrollView sets overflow-y:hidden which clips all
          rows vertically — the outer page ScrollView can no longer see or scroll
          through them.  On web we use a plain View with overflowX:auto instead. */}
      {Platform.OS === 'web' ? (
        <View style={styles.tableScrollWeb}>{tableContent}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={true} nestedScrollEnabled={true}>
          {tableContent}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    // overflow:hidden clips border-radius on native; on web it overrides the
    // child's overflowX:auto and collapses the table — use visible instead.
    ...(Platform.OS !== 'web' && { overflow: 'hidden' }),
    // On web, flex layout can shrink the card and hide rows — prevent that.
    ...(Platform.OS === 'web' && { flexShrink: 0 }),
    ...makeShadow(2, 8, 0.06, 2),
  },
  // On web a horizontal ScrollView hard-codes overflow-y:hidden which clips
  // all patient rows. Use a plain block div that only scrolls horizontally.
  // flexShrink:0 stops flex from compressing this container and clipping rows
  // (CSS: overflow-x:auto implicitly computes overflow-y to auto, so if the
  // element gets a constrained height from flex, rows vanish behind a clip).
  tableScrollWeb: {
    overflowX: 'auto',
    flexShrink: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: SPACING.sm,
    backgroundColor: THEME.primaryLight,
  },
  cardTitle: {
    flex: 1,
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: THEME.primaryDark,
  },
  countBadge: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
  },
  thead: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingHorizontal: SPACING.sm,
  },
  th: {
    fontSize: FONT.sizes.xs,
    fontWeight: '800',
    color: THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
    paddingHorizontal: SPACING.sm,
  },
  rowEven: {
    backgroundColor: '#FAFCFE',
  },
  rowRed: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 3,
    borderLeftColor: '#EF5350',
  },
  td: {
    fontSize: FONT.sizes.sm,
    color: THEME.textPrimary,
    paddingVertical: 11,
    paddingHorizontal: 6,
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 6,
  },
  nameText: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  redText: {
    color: '#C62828',
    fontWeight: '700',
  },
  badgeCell: {
    paddingVertical: 11,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: FONT.sizes.xs,
    fontWeight: '800',
  },
  timeCell: {
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  relTime: {
    fontSize: FONT.sizes.sm,
    color: THEME.textPrimary,
    fontWeight: '600',
  },
  absTime: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
    marginTop: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT.sizes.sm,
    color: THEME.textMuted,
  },
  rowNew: {
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D32',
    backgroundColor: '#F1F8E9',
  },
  timeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newBadge: {
    backgroundColor: '#2E7D32',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default PatientTable;
