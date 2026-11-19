import {
  MESSAGE_REPORT_CATEGORIES,
  PROFILE_REPORT_CATEGORIES,
  STREAM_REPORT_CATEGORIES,
  getCategoriesForTarget,
} from '../reportFlow';

describe('reportFlow categories', () => {
  test('message categories include urgent safety reasons first', () => {
    const reasons = MESSAGE_REPORT_CATEGORIES.map((c) => c.reason);
    expect(reasons.slice(0, 5)).toEqual(['child_safety', 'terrorism', 'violence', 'sexual', 'self_harm']);
    expect(MESSAGE_REPORT_CATEGORIES.filter((c) => c.urgent).length).toBeGreaterThanOrEqual(5);
  });

  test('stream categories include wrong_category and keep other last', () => {
    const reasons = STREAM_REPORT_CATEGORIES.map((c) => c.reason);
    expect(reasons).toContain('wrong_category');
    expect(reasons[reasons.length - 1]).toBe('other');
    expect(new Set(reasons).size).toBe(reasons.length);
  });

  test('profile categories do not include wrong_category', () => {
    expect(PROFILE_REPORT_CATEGORIES.some((c) => c.reason === 'wrong_category')).toBe(false);
  });

  test('getCategoriesForTarget routes by target type', () => {
    expect(getCategoriesForTarget('stream')).toBe(STREAM_REPORT_CATEGORIES);
    expect(getCategoriesForTarget('channel')).toBe(PROFILE_REPORT_CATEGORIES);
    expect(getCategoriesForTarget('user')).toBe(PROFILE_REPORT_CATEGORIES);
    expect(getCategoriesForTarget('message')).toBe(MESSAGE_REPORT_CATEGORIES);
    expect(getCategoriesForTarget('unknown')).toBe(MESSAGE_REPORT_CATEGORIES);
  });
});
