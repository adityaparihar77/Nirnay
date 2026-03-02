/**
 * Application-wide constants for Nirnay triage system.
 */

export const APP_NAME = 'Nirnay';

export const STORAGE_KEYS = {
  PATIENT_QUEUE: '@nirnay_patient_queue',
  LAST_SYNC_TIME: '@nirnay_last_sync_time',
};

import { Platform } from 'react-native';

// On web in development, route through the local CORS proxy (node proxy.js)
// to work around API Gateway REST API not forwarding OPTIONS preflights for
// PUT /patients/{id}, which blocks the browser before Lambda is ever called.
// Platform.OS + __DEV__ is evaluated reliably by Metro at bundle time.
const _realBase = 'https://41grxvatmc.execute-api.ap-south-1.amazonaws.com/prod';
const _proxyBase = 'http://localhost:8083/prod';

export const API = {
  BASE_URL: Platform.OS === 'web' && __DEV__ ? _proxyBase : _realBase,
  PATIENT_ENDPOINT: '/patients',
  PATIENT_POST_ENDPOINT: '/patient',
  TIMEOUT_MS: 15000,
};

export const PATIENT_STATUS = {
  PENDING:  'Pending',
  REVIEWED: 'Reviewed',
};

export const THEME = {
  primary: '#0a6b94',
  primaryDark: '#074f6e',
  primaryLight: '#e8f4f9',
  secondary: '#26a69a',
  danger: '#D32F2F',
  warning: '#F57F17',
  success: '#2E7D32',
  background: '#F0F4F8',
  surface: '#FFFFFF',
  textPrimary: '#1A2B3C',
  textSecondary: '#5A6B7C',
  textMuted: '#8A9BAC',
  border: '#DDE5ED',
  shadow: 'rgba(10, 107, 148, 0.12)',
};

export const FONT = {
  regular: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    hero: 30,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
