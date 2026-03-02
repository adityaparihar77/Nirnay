/**
 * PatientForm.js
 * Patient vitals input form with real-time validation.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME, SPACING, FONT } from '../utils/constants';
import { makeShadow } from '../utils/helpers';
import { validatePatientForm } from '../utils/riskCalculator';

const InputField = ({
  label,
  icon,
  value,
  onChangeText,
  error,
  unit,
  keyboardType = 'default',
  placeholder,
  returnKeyType = 'next',
  onSubmitEditing,
  inputRef,
}) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputRow, error ? styles.inputRowError : styles.inputRowNormal]}>
      <Ionicons name={icon} size={18} color={error ? THEME.danger : THEME.primary} style={styles.inputIcon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.textMuted}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={returnKeyType === 'done'}
        autoCorrect={false}
      />
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
    </View>
    {error ? (
      <Text style={styles.errorText}>
        <Ionicons name="alert-circle-outline" size={12} /> {error}
      </Text>
    ) : null}
  </View>
);

const PatientForm = ({ onSubmit, isSubmitting }) => {
  const [form, setForm] = useState({
    name: '',
    age: '',
    bloodPressure: '',
    temperature: '',
  });
  const [errors, setErrors] = useState({});

  const ageRef = useRef(null);
  const bpRef = useRef(null);
  const tempRef = useRef(null);

  const update = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = () => {
    const { valid, errors: validationErrors } = validatePatientForm(form);
    if (!valid) {
      setErrors(validationErrors);
      return;
    }
    onSubmit({
      name: form.name.trim(),
      age: parseInt(form.age, 10),
      bloodPressure: parseFloat(form.bloodPressure),
      temperature: parseFloat(form.temperature),
    });
  };

  const handleReset = () => {
    setForm({ name: '', age: '', bloodPressure: '', temperature: '' });
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form header */}
        <View style={styles.formHeader}>
          <View style={styles.formIconWrap}>
            <Ionicons name="person-add-outline" size={22} color={THEME.primary} />
          </View>
          <View>
            <Text style={styles.formTitle}>Patient Assessment</Text>
            <Text style={styles.formSubtitle}>Enter vitals to calculate triage risk</Text>
          </View>
        </View>

        {/* Section: Personal Info */}
        <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>

        <InputField
          label="Full Name"
          icon="person-outline"
          value={form.name}
          onChangeText={update('name')}
          error={errors.name}
          placeholder="e.g. Ravi Kumar"
          returnKeyType="next"
          onSubmitEditing={() => ageRef.current?.focus()}
        />

        <InputField
          label="Age"
          icon="calendar-outline"
          value={form.age}
          onChangeText={update('age')}
          error={errors.age}
          placeholder="e.g. 45"
          keyboardType="numeric"
          unit="yrs"
          returnKeyType="next"
          onSubmitEditing={() => bpRef.current?.focus()}
          inputRef={ageRef}
        />

        {/* Section: Vital Signs */}
        <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>VITAL SIGNS</Text>

        <InputField
          label="Systolic Blood Pressure"
          icon="pulse-outline"
          value={form.bloodPressure}
          onChangeText={update('bloodPressure')}
          error={errors.bloodPressure}
          placeholder="e.g. 130"
          keyboardType="numeric"
          unit="mmHg"
          returnKeyType="next"
          onSubmitEditing={() => tempRef.current?.focus()}
          inputRef={bpRef}
        />

        <InputField
          label="Body Temperature"
          icon="thermometer-outline"
          value={form.temperature}
          onChangeText={update('temperature')}
          error={errors.temperature}
          placeholder="e.g. 98.6"
          keyboardType="decimal-pad"
          unit="°F"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          inputRef={tempRef}
        />

        {/* Risk guide */}
        <View style={styles.riskGuide}>
          <Text style={styles.riskGuideTitle}>
            <Ionicons name="information-circle-outline" size={13} /> Triage Reference
          </Text>
          <View style={styles.riskRow}>
            <View style={[styles.riskDot, { backgroundColor: '#D32F2F' }]} />
            <Text style={styles.riskGuideText}>BP &gt;160 or Temp &gt;102°F → Critical</Text>
          </View>
          <View style={styles.riskRow}>
            <View style={[styles.riskDot, { backgroundColor: '#F57F17' }]} />
            <Text style={styles.riskGuideText}>BP &gt;140 → Moderate</Text>
          </View>
          <View style={styles.riskRow}>
            <View style={[styles.riskDot, { backgroundColor: '#2E7D32' }]} />
            <Text style={styles.riskGuideText}>Otherwise → Stable</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={18} color={THEME.textSecondary} />
            <Text style={styles.resetText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={THEME.surface} />
            ) : (
              <Ionicons name="analytics-outline" size={20} color={THEME.surface} />
            )}
            <Text style={styles.submitText}>
              {isSubmitting ? 'Assessing…' : 'Assess Risk'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: THEME.primaryLight,
    padding: SPACING.md,
    borderRadius: 14,
  },
  formIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...makeShadow(1, 3, 1, 2, THEME.shadow),
  },
  formTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: THEME.primaryDark,
  },
  formSubtitle: {
    fontSize: FONT.sizes.sm,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginLeft: 2,
  },
  fieldWrapper: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: SPACING.xs,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm + 2 : 2,
    ...makeShadow(1, 4, 1, 2, THEME.shadow),
  },
  inputRowNormal: { borderColor: THEME.border },
  inputRowError: { borderColor: THEME.danger, backgroundColor: '#FFF5F5' },
  inputIcon: { marginRight: SPACING.sm },
  input: {
    flex: 1,
    fontSize: FONT.sizes.md,
    color: THEME.textPrimary,
    paddingVertical: Platform.OS === 'android' ? SPACING.sm : 0,
  },
  unit: {
    fontSize: FONT.sizes.sm,
    color: THEME.textMuted,
    fontWeight: '500',
    marginLeft: SPACING.xs,
  },
  errorText: {
    fontSize: FONT.sizes.xs,
    color: THEME.danger,
    marginTop: 4,
    marginLeft: 2,
  },
  riskGuide: {
    backgroundColor: THEME.primaryLight,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: THEME.primary,
  },
  riskGuideTitle: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskGuideText: {
    fontSize: FONT.sizes.xs,
    color: THEME.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  resetText: {
    fontSize: FONT.sizes.md,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.primary,
    paddingVertical: SPACING.md,
    borderRadius: 14,
    ...makeShadow(4, 8, 0.4, 6, THEME.primary),
  },
  submitDisabled: {
    backgroundColor: THEME.border,
    ...Platform.select({ web: { boxShadow: 'none' }, default: { shadowOpacity: 0, elevation: 0 } }),
  },
  submitText: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: THEME.surface,
  },
});

export default PatientForm;
