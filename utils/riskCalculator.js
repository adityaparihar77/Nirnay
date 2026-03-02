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
 * AI-Inspired Risk Scoring
 * Calculates a composite risk score (0–100) using weighted vital normalization.
 *
 * Weights  →  BP : 0.5 | Temp : 0.4 | Age : 0.1
 *
 * Normalization reference ranges:
 *   BP   : 90 mmHg (low-normal) → 200 mmHg (severe hypertension)
 *   Temp : 96 °F  (subnormal)   → 106 °F   (life-threatening fever)
 *   Age  : 0 yrs  (newborn)     → 100 yrs  (centenarian)
 *
 * @param {number} bloodPressure - Systolic BP (mmHg)
 * @param {number} temperature   - Body temperature (°F)
 * @param {number} [age=0]       - Patient age (years)
 * @returns {{
 *   score: number,
 *   probability: 'High' | 'Medium' | 'Low',
 *   breakdown: { bpContribution: number, tempContribution: number, ageContribution: number }
 * }}
 */
export const calculateAIRiskScore = (bloodPressure, temperature, age = 0) => {
  // Clamp inputs to valid physiological reference bounds
  const bp   = Math.max(90,  Math.min(200, parseFloat(bloodPressure) || 90));
  const temp = Math.max(96,  Math.min(106, parseFloat(temperature)   || 96));
  const a    = Math.max(0,   Math.min(100, parseFloat(age)           || 0));

  // Normalize each dimension to [0, 1]
  const bpNorm   = (bp   - 90) / (200 - 90);  // 0 = 90 mmHg, 1 = 200 mmHg
  const tempNorm = (temp - 96) / (106 - 96);  // 0 = 96 °F,   1 = 106 °F
  const ageNorm  = a / 100;                   // 0 = newborn,  1 = 100 yrs

  // Weighted composite score
  const raw   = bpNorm * 0.5 + tempNorm * 0.4 + ageNorm * 0.1;
  const score = Math.round(Math.min(100, Math.max(0, raw * 100)));

  // Probability band
  const probability = score >= 65 ? 'High' : score >= 35 ? 'Medium' : 'Low';

  return {
    score,
    probability,
    breakdown: {
      bpContribution:   +(bpNorm   * 0.5 * 100).toFixed(1),
      tempContribution: +(tempNorm * 0.4 * 100).toFixed(1),
      ageContribution:  +(ageNorm  * 0.1 * 100).toFixed(1),
    },
  };
};

/**
 * Calculate risk level from patient vitals.
 * Rule-based triage is preserved; an AI risk score is attached alongside.
 *
 * @param {number} bloodPressure - Systolic blood pressure (mmHg)
 * @param {number} temperature   - Body temperature (°F)
 * @param {number} [age=0]       - Patient age (years) — used for AI score only
 * @returns {{ level: string, config: object, reasons: string[], aiRisk: object }}
 */
export const calculateRisk = (bloodPressure, temperature, age = 0) => {
  const bp = parseFloat(bloodPressure);
  const temp = parseFloat(temperature);
  const reasons = [];

  if (isNaN(bp) || isNaN(temp)) {
    throw new Error('Invalid vital sign values provided.');
  }

  const aiRisk = calculateAIRiskScore(bp, temp, age);

  if (bp > 160 || temp > 102) {
    if (bp > 160) reasons.push(`Blood pressure ${bp} mmHg is critically high (>160)`);
    if (temp > 102) reasons.push(`Temperature ${temp}°F is critically high (>102°F)`);
    return { level: RISK_LEVELS.RED, config: RISK_CONFIG.RED, reasons, aiRisk };
  }

  if (bp > 140) {
    reasons.push(`Blood pressure ${bp} mmHg is elevated (>140)`);
    return { level: RISK_LEVELS.YELLOW, config: RISK_CONFIG.YELLOW, reasons, aiRisk };
  }

  reasons.push('All vitals within acceptable range.');
  return { level: RISK_LEVELS.GREEN, config: RISK_CONFIG.GREEN, reasons, aiRisk };
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
