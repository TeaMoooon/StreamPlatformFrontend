import { STAFF_DEFAULT_SECTION, getStaffNavItems, isStaffSection } from '../staff.constants';

describe('staff.constants', () => {
  test('Safety nav includes mute/ban, reports, appeals; default is users', () => {
    expect(STAFF_DEFAULT_SECTION).toBe('users');
    const items = getStaffNavItems(true);
    expect(items.map((i) => i.value)).toEqual(['users', 'reports', 'appeals', 'tickets', 'audit']);
  });

  test('Support nav hides Safety-only sections', () => {
    const items = getStaffNavItems(false);
    expect(items.map((i) => i.value)).toEqual(['tickets', 'audit']);
    expect(items.some((i) => i.value === 'users')).toBe(false);
    expect(items.some((i) => i.value === 'reports')).toBe(false);
  });

  test('isStaffSection validates known sections only', () => {
    expect(isStaffSection('tickets')).toBe(true);
    expect(isStaffSection('reports')).toBe(true);
    expect(isStaffSection('users')).toBe(true);
    expect(isStaffSection('open')).toBe(false);
    expect(isStaffSection(undefined)).toBe(false);
  });
});
