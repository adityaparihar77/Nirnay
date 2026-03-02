/**
 * Application-wide constants for Nirnay triage system.
 */

export const APP_NAME = 'Nirnay';

export const STORAGE_KEYS = {
  PATIENT_QUEUE: '@nirnay_patient_queue',
  LAST_SYNC_TIME: '@nirnay_last_sync_time',
};

import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION base URL — AWS API Gateway.
// This is the ONLY URL used in every production / Vercel build.
// ─────────────────────────────────────────────────────────────────────────────
export const API_BASE = 'https://41grxvatmc.execute-api.ap-south-1.amazonaws.com/prod';

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL DEV ONLY — CORS proxy workaround.
// AWS API Gateway (REST) does not forward OPTIONS preflights for every route,
// which blocks PUT /patients/{id} in the browser before Lambda is ever called.
// proxy.js (port 8083) answers preflights locally and forwards to API_BASE.
//
// __DEV__ is set to `false` by Metro/Expo at build time (npm run build),
// so localhost is NEVER included in the production bundle.
// ─────────────────────────────────────────────────────────────────────────────
const _resolvedBase =
  Platform.OS === 'web' && typeof __DEV__ !== 'undefined' && __DEV__
    ? 'http://localhost:8083/prod'  // dev only — node proxy.js must be running
    : API_BASE;                      // production — direct to AWS

export const API = {
  BASE_URL: _resolvedBase,
  PATIENT_ENDPOINT: '/patients',      // GET all / POST new
  PATIENT_POST_ENDPOINT: '/patients', // back-compat alias
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
