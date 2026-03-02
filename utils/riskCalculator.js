/**
 * Risk Calculator Utility
 * Determines patient triage risk level based on vital signs.
 */

export const RISK_LEVELS = {
  RED: 'RED',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN',
};

export const RISK_CONFIG = {
  RED: {
    label: 'Critical',
    color: '#D32F2F',
    background: '#FFEBEE',
    borderColor: '#EF9A9A',
    icon: 'warning',
    priority: 1,
    message: 'Immediate medical attention required.',
  },
  YELLOW: {
    label: 'Moderate',
    color: '#F57F17',
    background: '#FFFDE7',
    borderColor: '#FFE082',
    icon: 'alert-circle',
    priority: 2,
    message: 'Monitor closely. Consult a doctor soon.',
  },
  GREEN: {
    label: 'Stable',
    color: '#2E7D32',
    background: '#E8F5E9',
    borderColor: '#A5D6A7',
    icon: 'checkmark-circle',
    priority: 3,
    message: 'Patient vitals are within normal range.',
  },
};

/**
 * Calculate risk level from patient vitals.
 * @param {number} bloodPressure - Systolic blood pressure (mmHg)
 * @param {number} temperature   - Body temperature (°F)
 * @returns {{ level: string, config: object, reasons: string[] }}
 */
export const calculateRisk = (bloodPressure, temperature) => {
  const bp = parseFloat(bloodPressure);
  const temp = parseFloat(temperature);
  const reasons = [];

  if (isNaN(bp) || isNaN(temp)) {
    throw new Error('Invalid vital sign values provided.');
  }

  if (bp > 160 || temp > 102) {
    if (bp > 160) reasons.push(`Blood pressure ${bp} mmHg is critically high (>160)`);
    if (temp > 102) reasons.push(`Temperature ${temp}°F is critically high (>102°F)`);
    return { level: RISK_LEVELS.RED, config: RISK_CONFIG.RED, reasons };
  }

  if (bp > 140) {
    reasons.push(`Blood pressure ${bp} mmHg is elevated (>140)`);
    return { level: RISK_LEVELS.YELLOW, config: RISK_CONFIG.YELLOW, reasons };
  }

  reasons.push('All vitals within acceptable range.');
  return { level: RISK_LEVELS.GREEN, config: RISK_CONFIG.GREEN, reasons };
};

/**
 * Validate patient form inputs.
 * @param {{ name, age, bloodPressure, temperature }} fields
 * @returns {{ valid: boolean, errors: object }}
 */
export const validatePatientForm = ({ name, age, bloodPressure, temperature }) => {
  const errors = {};

  if (!name || name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  }

  const parsedAge = parseInt(age, 10);
  if (!age || isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
    errors.age = 'Enter a valid age between 0 and 120.';
  }

  const parsedBP = parseFloat(bloodPressure);
  if (!bloodPressure || isNaN(parsedBP) || parsedBP < 50 || parsedBP > 300) {
    errors.bloodPressure = 'Enter a valid systolic BP between 50–300 mmHg.';
  }

  const parsedTemp = parseFloat(temperature);
  if (!temperature || isNaN(parsedTemp) || parsedTemp < 85 || parsedTemp > 115) {
    errors.temperature = 'Enter a valid temperature between 85–115°F.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};
