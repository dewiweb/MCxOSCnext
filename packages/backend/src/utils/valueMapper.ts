import type { CurveType } from '../types/index.js';

/**
 * Maps a value from one range to another with optional curve type.
 */
export function mapToScale(
  value: number,
  inputRange: [number, number],
  outputRange: [number, number],
  curve: CurveType = 'lin'
): number {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;

  if (inMax === inMin) return outMin;

  let normalized = (value - inMin) / (inMax - inMin);
  normalized = Math.max(0, Math.min(1, normalized));

  if (curve === 'log') {
    normalized = Math.log10(normalized * 9 + 1);
  }

  return outMin + normalized * (outMax - outMin);
}

/**
 * Maps a value from Ember+ range to OSC range.
 */
export function emberToOsc(
  value: number,
  emberMin: number,
  emberMax: number,
  oscMin: number,
  oscMax: number,
  curve: CurveType = 'lin'
): number {
  return mapToScale(value, [emberMin, emberMax], [oscMin, oscMax], curve);
}

/**
 * Maps a value from OSC range to Ember+ range.
 */
export function oscToEmber(
  value: number,
  oscMin: number,
  oscMax: number,
  emberMin: number,
  emberMax: number,
  curve: CurveType = 'lin'
): number {
  if (curve === 'log') {
    const normalized = (value - oscMin) / (oscMax - oscMin);
    const denormalized = (Math.pow(10, normalized) - 1) / 9;
    return emberMin + denormalized * (emberMax - emberMin);
  }
  return mapToScale(value, [oscMin, oscMax], [emberMin, emberMax], 'lin');
}
