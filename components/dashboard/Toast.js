/**
 * Toast.js
 * Slide-in / auto-dismiss toast notification.
 * Renders at the top of the screen via absolute positioning.
 * Auto-hides after 3.5 s; calls onHide when animation ends.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING } from '../../utils/constants';
import { makeShadow } from '../../utils/helpers';

const SHOW_DURATION_MS = 3500;

/**
 * @param {{
 *   visible: boolean,
 *   message: string,
 *   type?: 'danger' | 'success' | 'info',
 *   onHide: () => void,
 * }} props
 */
const Toast = ({ visible, message, type = 'danger', onHide }) => {
  const translateY = useRef(new Animated.Value(-90)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef(null);

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -90, duration: 280, useNativeDriver: false }),
      Animated.timing(opacity,    { toValue: 0,   duration: 280, useNativeDriver: false }),
    ]).start(() => onHide?.());
  };

  useEffect(() => {
    if (!visible) return;

    // Reset position before animating in
    translateY.setValue(-90);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 70, friction: 10, useNativeDriver: false }),
      Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: false }),
    ]).start();

    timerRef.current = setTimeout(hide, SHOW_DURATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const palette = {
    danger:  { bg: '#C62828', icon: 'alert-circle', iconColor: '#FFCDD2' },
    success: { bg: '#2E7D32', icon: 'checkmark-circle', iconColor: '#C8E6C9' },
    info:    { bg: '#0a6b94', icon: 'information-circle', iconColor: '#B3E5FC' },
  };
  const { bg, icon, iconColor } = palette[type] || palette.danger;

  return (
    <Animated.View
      style={[styles.toast, { backgroundColor: bg, transform: [{ translateY }], opacity, pointerEvents: 'box-none' }]}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      <TouchableOpacity onPress={hide} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderRadius: 14,
    ...makeShadow(4, 10, 0.22, 10),
  },
  message: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT.sizes.sm,
    letterSpacing: 0.1,
  },
});

export default Toast;
