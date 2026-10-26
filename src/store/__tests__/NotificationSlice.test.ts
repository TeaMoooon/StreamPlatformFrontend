import NotificationReducer, {
  AddNotification,
  ClearNotification,
  NotificationFetchSuccess,
} from '../slices/NotificationSlice';
import { buildNotificationLink, mapHubNotification } from '../actions/NotificationActions';

describe('NotificationSlice robustness', () => {
  test('NotificationFetchSuccess handles missing notifications without throwing', () => {
    const initState = NotificationReducer(undefined as any, { type: '@@INIT' } as any);

    // Malformed payloads happen when backend contract breaks.
    // This expectation assumes the reducer should guard against it.
    expect(() => NotificationReducer(initState, NotificationFetchSuccess({} as any))).not.toThrow();
  });

  test('NotificationFetchSuccess does not throw when payload is null', () => {
    const initState = NotificationReducer(undefined as any, { type: '@@INIT' } as any);

    // Adversarial: backend may send payload: null
    expect(() => NotificationReducer(initState, NotificationFetchSuccess(null as any))).not.toThrow();
  });

  test('NotificationFetchSuccess does not throw when payload is undefined', () => {
    const initState = NotificationReducer(undefined as any, { type: '@@INIT' } as any);

    // Adversarial: frontend state may be corrupted during hub reconnect
    expect(() => NotificationReducer(initState, NotificationFetchSuccess(undefined as any))).not.toThrow();
  });

  test('ClearNotification resets isError and isLoading', () => {
    const initState = NotificationReducer(undefined as any, { type: '@@INIT' } as any);
    const stateWithError = { ...initState, isError: 'prev error', isLoading: true } as any;

    const nextState = NotificationReducer(stateWithError, ClearNotification());

    // Expected behavior: logout/navigation clears transient error/loading flags too.
    expect(nextState.isError).toBeNull();
    expect(nextState.isLoading).toBe(false);
  });

  test('mapHubNotification returns null for invalid JSON payload', () => {
    const result = mapHubNotification({
      type: 'newfollower',
      payload: '{invalid json',
      date: '2020-01-01T00:00:00.000Z',
      isRead: false,
      id: 123,
    } as any);

    expect(result).toBeNull();
  });

  test('NotificationFetchSuccess should not throw when notifications array contains null', () => {
    const initState = NotificationReducer(undefined as any, { type: '@@INIT' } as any);

    // Adversarial: backend may send [null, {...}] instead of array of objects.
    expect(() =>
      NotificationReducer(initState, NotificationFetchSuccess({ notifications: [null] } as any))
    ).not.toThrow();
  });

  test('AddNotification should not throw when payload is null', () => {
    const initState = NotificationReducer(undefined as any, { type: '@@INIT' } as any);

    // Adversarial: hub message may contain corrupted item.
    expect(() => NotificationReducer(initState, AddNotification(null as any))).not.toThrow();
  });

  test('mapHubNotification should return null when notification id is missing', () => {
    const result = mapHubNotification({
      type: 'newfollower',
      payload: '{"SubscriberName":"x"}',
      date: '2020-01-01T00:00:00.000Z',
      isRead: false,
      id: undefined,
    } as any);

    // Defensive expectation: without stable id we should not render/merge the notification.
    expect(result).toBeNull();
  });

  test('buildNotificationLink deep-links support ticket reply to concrete ticket/message', () => {
    expect(buildNotificationLink('SupportTicketReply', { TicketId: 42, MessageId: 99 })).toBe(
      '/settings/support?ticket=42&message=99'
    );
  });

  test('buildNotificationLink deep-links sanction and appeal', () => {
    expect(buildNotificationLink('PlatformSanction', { SanctionId: 7 })).toBe('/settings/support?sanction=7');
    expect(buildNotificationLink('PlatformAppeal', { AppealId: 3 })).toBe('/settings/support?appeal=3');
  });

  test('buildNotificationLink uses streamer/subscriber nicknames', () => {
    expect(buildNotificationLink('StreamStarted', { StreamerName: 'SACKE3' })).toBe('/SACKE3');
    expect(buildNotificationLink('NewFollower', { SubscriberName: 'alice' })).toBe('/alice');
  });

  test('mapHubNotification includes deep link for support reply', () => {
    const result = mapHubNotification({
      type: 'SupportTicketReply',
      payload: JSON.stringify({ TicketId: 12, MessageId: 34, Subject: 'Ключ', Message: 'Ответ staff' }),
      date: '2020-01-01T00:00:00.000Z',
      isRead: false,
      id: 1,
    } as any);

    expect(result?.link).toBe('/settings/support?ticket=12&message=34');
    expect(result?.message).toBe('Ответ staff');
  });
});
