/**
 * General helper utilities for Nirnay.
 */

import { Platform } from 'react-native';

/**
 * Returns cross-platform shadow styles.
 * On web: uses CSS `boxShadow` (avoids deprecated shadow* prop warnings).
 * On native: uses the standard React Native shadow props.
 *
 * @param {number} offsetY   - Vertical shadow offset in logical pixels
 * @param {number} blur      - Shadow blur radius
 * @param {number} opacity   - Shadow opacity (0–1)
 * @param {number} elevation - Android elevation
 * @param {string} color     - Shadow colour (hex string), default '#000'
 * @returns {object}
 */
export const makeShadow = (offsetY, blur, opacity, elevation, color = '#000') =>
  Platform.select({
    web: {
      // If `color` is already an rgba/rgb string it carries its own alpha, so
      // use it directly; otherwise build rgba from hex + opacity.
      boxShadow: `0px ${offsetY}px ${blur}px ${
        color.startsWith('rgba') || color.startsWith('rgb')
          ? color
          : `rgba(0,0,0,${opacity})`
      }`,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blur,
      elevation,
    },
  });

/**
 * Generate a simple unique ID without external dependencies.
 */
export const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
};

/**
 * Format an ISO timestamp into a human-readable string.
 * @param {string|null} isoString
 * @returns {string}
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format a relative time string (e.g., "2 min ago").
 * @param {string|null} isoString
 * @returns {string}
 */
export const formatRelativeTime = (isoString) => {
  if (!isoString) return 'Never';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
};

/**
 * Safely parse a float and return null if invalid.
 */
export const safeParseFloat = (value) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Capitalize the first letter of each word.
 */
export const titleCase = (str) =>
  str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
