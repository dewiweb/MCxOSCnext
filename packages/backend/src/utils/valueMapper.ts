import type { CurveType, ScaleMode } from '../types/index.js';

/**
 * Normalize a value from [min, max] to [0, 1] linearly.
 */
function normalizeLinear(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Normalize a value from a logarithmic [min, max] to [0, 1] linear.
 * Assumes the scale is perceptually log (e.g. dB faders).
 * Uses log10(x*9+1) mapping so that log(0)=0 and log(1)=1.
 */
function normalizeLog(value: number, min: number, max: number): number {
  const linear = normalizeLinear(value, min, max);
  return Math.log10(linear * 9 + 1);
}

/**
 * Denormalize a [0,1] linear value to [min, max] linearly.
 */
function denormalizeLinear(normalized: number, min: number, max: number): number {
  return min + normalized * (max - min);
}

/**
 * Denormalize a [0,1] linear value to a logarithmic [min, max].
 * Inverse of normalizeLog.
 */
function denormalizeLog(normalized: number, min: number, max: number): number {
  const linear = (Math.pow(10, normalized) - 1) / 9;
  return min + linear * (max - min);
}

/**
 * Maps a value from Ember+ range to OSC range.
 *
 * scaleMode describes the nature of each scale:
 *   'lin-lin' : ember linear  → osc linear   (default, no curve)
 *   'log-lin' : ember log     → osc linear   (e.g. dB fader → 0..1 slider)
 *   'lin-log' : ember linear  → osc log      (rare)
 *   'log-log' : ember log     → osc log      (same curve, just remaps range)
 *
 * Legacy: if scaleMode is absent, falls back to the old curve parameter.
 */
export function emberToOsc(
  value: number,
  emberMin: number,
  emberMax: number,
  oscMin: number,
  oscMax: number,
  scaleMode: ScaleMode = 'lin-lin',
  _curve?: CurveType
): number {
  const [emberCurve, oscCurve] = scaleMode.split('-') as [CurveType, CurveType];

  const normalized =
    emberCurve === 'log'
      ? normalizeLog(value, emberMin, emberMax)
      : normalizeLinear(value, emberMin, emberMax);

  return oscCurve === 'log'
    ? denormalizeLog(normalized, oscMin, oscMax)
    : denormalizeLinear(normalized, oscMin, oscMax);
}

/**
 * Maps a value from OSC range to Ember+ range.
 * Inverse of emberToOsc — swaps ember and osc curve roles.
 */
export function oscToEmber(
  value: number,
  oscMin: number,
  oscMax: number,
  emberMin: number,
  emberMax: number,
  scaleMode: ScaleMode = 'lin-lin',
  _curve?: CurveType
): number {
  const [emberCurve, oscCurve] = scaleMode.split('-') as [CurveType, CurveType];

  // Normalize from OSC space (inverse of osc curve)
  const normalized =
    oscCurve === 'log'
      ? normalizeLog(value, oscMin, oscMax)
      : normalizeLinear(value, oscMin, oscMax);

  // Denormalize to Ember+ space (inverse of ember curve)
  return emberCurve === 'log'
    ? denormalizeLog(normalized, emberMin, emberMax)
    : denormalizeLinear(normalized, emberMin, emberMax);
}

/**
 * Legacy helper — kept for backward compatibility.
 * @deprecated Use emberToOsc/oscToEmber with scaleMode instead.
 */
export function mapToScale(
  value: number,
  inputRange: [number, number],
  outputRange: [number, number],
  curve: CurveType = 'lin'
): number {
  const scaleMode: ScaleMode = curve === 'log' ? 'log-lin' : 'lin-lin';
  return emberToOsc(value, inputRange[0], inputRange[1], outputRange[0], outputRange[1], scaleMode);
}
