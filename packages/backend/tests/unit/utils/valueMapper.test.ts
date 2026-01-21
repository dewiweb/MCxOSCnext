import { describe, it, expect } from 'vitest';
import { mapToScale, emberToOsc, oscToEmber } from '../../../src/utils/valueMapper';

describe('valueMapper', () => {
  describe('mapToScale', () => {
    describe('linear scaling', () => {
      it('should map value at minimum', () => {
        expect(mapToScale(0, [0, 100], [0, 1], 'lin')).toBe(0);
      });

      it('should map value at maximum', () => {
        expect(mapToScale(100, [0, 100], [0, 1], 'lin')).toBe(1);
      });

      it('should map midpoint correctly', () => {
        expect(mapToScale(50, [0, 100], [0, 1], 'lin')).toBe(0.5);
      });

      it('should handle inverted ranges', () => {
        expect(mapToScale(0, [0, 100], [1, 0], 'lin')).toBe(1);
        expect(mapToScale(100, [0, 100], [1, 0], 'lin')).toBe(0);
      });

      it('should clamp values below minimum', () => {
        expect(mapToScale(-10, [0, 100], [0, 1], 'lin')).toBe(0);
      });

      it('should clamp values above maximum', () => {
        expect(mapToScale(150, [0, 100], [0, 1], 'lin')).toBe(1);
      });

      it('should handle negative ranges', () => {
        expect(mapToScale(-50, [-100, 0], [0, 1], 'lin')).toBe(0.5);
      });
    });

    describe('logarithmic scaling', () => {
      it('should apply log curve', () => {
        const result = mapToScale(50, [0, 100], [0, 1], 'log');
        expect(result).toBeGreaterThan(0.5);
      });

      it('should map maximum correctly', () => {
        const result = mapToScale(100, [0, 100], [0, 1], 'log');
        expect(result).toBe(1);
      });

      it('should map minimum correctly', () => {
        const result = mapToScale(0, [0, 100], [0, 1], 'log');
        expect(result).toBe(0);
      });
    });

    it('should handle zero range gracefully', () => {
      expect(mapToScale(50, [50, 50], [0, 1], 'lin')).toBe(0);
    });
  });

  describe('emberToOsc', () => {
    it('should convert Ember+ value to OSC value', () => {
      expect(emberToOsc(500, 0, 1000, 0, 1, 'lin')).toBe(0.5);
    });

    it('should handle different ranges', () => {
      expect(emberToOsc(0, -100, 100, 0, 1, 'lin')).toBe(0.5);
    });
  });

  describe('oscToEmber', () => {
    it('should convert OSC value to Ember+ value', () => {
      expect(oscToEmber(0.5, 0, 1, 0, 1000, 'lin')).toBe(500);
    });

    it('should handle logarithmic curve', () => {
      const result = oscToEmber(0.5, 0, 1, 0, 1000, 'log');
      expect(result).toBeLessThan(500);
    });
  });
});
