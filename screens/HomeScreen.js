/**
 * HomeScreen.js
 * Production-grade healthcare triage dashboard.
 *
 * Layout (top â†’ bottom):
 *   Header  â†’  AlertBanner  â†’  SummaryCards  â†’  RiskChart
 *           â†’  FilterBar    â†’  PatientTable
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import usePatients from '../hooks/usePatients';
import AlertBanner from '../components/dashboard/AlertBanner';
import SummaryCards from '../components/dashboard/SummaryCards';
import RiskChart from '../components/dashboard/RiskChart';
import FilterBar from '../components/dashboard/FilterBar';
import PatientTable from '../components/dashboard/PatientTable';
import Toast from '../components/dashboard/Toast';
import SkeletonLoader from '../components/dashboard/SkeletonLoader';
import PatientModal from '../components/dashboard/PatientModal';

import { FONT, SPACING, THEME } from '../utils/constants';
import { makeShadow } from '../utils/helpers';

/* â”€â”€â”€ Loading skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const LoadingState = () => (
  <View style={styles.centerBlock}>
    <ActivityIndicator size="large" color={THEME.primary} />
    <Text style={styles.centerText}>Loading patient recordsâ€¦</Text>
  </View>
);

/* â”€â”€â”€ Error state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ErrorState = ({ message }) => (
  <View style={styles.centerBlock}>
    <View style={styles.errorIconWrap}>
      <Ionicons name="warning" size={28} color="#C62828" />
    </View>
    <Text style={styles.errorTitle}>Unable to load data</Text>
    <Text style={styles.errorMsg}>{message}</Text>
  </View>
);

/* â”€â”€â”€ Main screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const HomeScreen = ({ navigation }) => {
  const {
    filtered,
    counts,
    filter,
    setFilter,
    isLoading,
    isRefreshing,
    error,
    newRedAlert,
    dismissRedAlert,
    newPatientIds,
    dataVersion,
    lastUpdated,
    autoRefresh,
    setAutoRefresh,
    refresh,
    pullRefresh,
  } = usePatients();

  const [toastVisible, setToastVisible]      = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [modalVisible, setModalVisible]       = useState(false);

  useEffect(() => {
    if (newRedAlert) {
      setToastVisible(true);
      dismissRedAlert();
    }
  }, [newRedAlert]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRowPress = useCallback((patient) => {
    setSelectedPatient(patient);
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setSelectedPatient(null), 300);
  }, []);

  const handlePatientReviewed = useCallback(() => {
    setTimeout(refresh, 400);
  }, [refresh]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primaryDark} />

      {/* Toast overlay */}
      <Toast
        visible={toastVisible}
        message="🚨 New Critical Case Detected"
        type="danger"
        onHide={() => setToastVisible(false)}
      />

      {/* Patient detail modal */}
      <PatientModal
        patient={selectedPatient}
        visible={modalVisible}
        onClose={handleModalClose}
        onReviewed={handlePatientReviewed}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoWrap}>
            <Ionicons name="pulse" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.appTitle}>Nirnay Dashboard</Text>
            <Text style={styles.appSubtitle}>Healthcare Triage · Live Monitor</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addPatientButton}
          onPress={() => navigation?.navigate('PatientInput')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={16} color="#fff" />
          <Text style={styles.addPatientText}>Add Patient</Text>
        </TouchableOpacity>
      </View>
      {/* â”€â”€ Body â”€â”€ */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={pullRefresh}
            tintColor={THEME.primary}
            colors={[THEME.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Critical alert banner */}
        {counts.RED > 0 && <AlertBanner redCount={counts.RED} />}

        {/* Summary metric cards */}
        <SummaryCards
          counts={counts}
          activeFilter={filter}
          onFilterChange={setFilter}
        />

        {/* Risk distribution chart */}
        <RiskChart counts={counts} />

        {/* Filter bar + refresh controls */}
        <FilterBar
          filter={filter}
          onFilterChange={setFilter}
          onRefresh={refresh}
          isLoading={isLoading && !isRefreshing}
          autoRefresh={autoRefresh}
          onAutoRefreshToggle={setAutoRefresh}
          lastUpdated={lastUpdated}
        />

        {/* Patient table */}
        {isLoading && !isRefreshing ? (
          <SkeletonLoader />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <PatientTable
            patients={filtered}
            filter={filter}
            newPatientIds={newPatientIds}
            dataVersion={dataVersion}
            onRowPress={handleRowPress}
          />
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Nirnay Triage System Â· {new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/* â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    // On web, flex:1 alone doesn't bound the height (no html/body height:100%
    // constraint by default), so the inner ScrollView expands to content and
    // nothing scrolls. '100vh' gives an explicit viewport-height bound.
    ...(Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }),
    backgroundColor: THEME.primaryDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.primary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    ...makeShadow(3, 6, 0.15, 5),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: FONT.sizes.lg,
    letterSpacing: 0.3,
  },
  appSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FONT.sizes.xs,
    letterSpacing: 0.4,
    marginTop: 1,
  },
  addPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  addPatientText: {
    color: '#fff',
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    padding: SPACING.md,
    rowGap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  centerBlock: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: SPACING.xl + 8,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  centerText: {
    color: THEME.textSecondary,
    fontSize: FONT.sizes.sm,
  },
  errorIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  errorMsg: {
    fontSize: FONT.sizes.sm,
    color: THEME.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  footer: {
    alignItems: 'center',
    paddingTop: SPACING.md,
  },
  footerText: {
    fontSize: FONT.sizes.xs,
    color: THEME.textMuted,
  },
});

export default HomeScreen;
