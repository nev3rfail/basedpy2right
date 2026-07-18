/*
 * py2Support.test.ts
 * Tests for the Python 2.7 support fork. All py2 tests live here (greppable).
 */
import {
    isPython2,
    pythonVersion2_7,
    pythonVersion3_0,
    pythonVersion3_14,
} from '../common/pythonVersion';

test('pythonVersion2_7 constant is (2, 7)', () => {
    expect(pythonVersion2_7.major).toBe(2);
    expect(pythonVersion2_7.minor).toBe(7);
});

test('isPython2 discriminator', () => {
    expect(isPython2(pythonVersion2_7)).toBe(true);
    expect(isPython2(pythonVersion3_0)).toBe(false);
    expect(isPython2(pythonVersion3_14)).toBe(false);
});
