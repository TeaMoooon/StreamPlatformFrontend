import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import * as signalR from '@microsoft/signalr';
import { AppDispatch } from '../../store/store';
import { NotificationSlice } from '../../store/slices/NotificationSlice';
import { mapHubNotification } from '../../store/actions/NotificationActions';
import { hasAuthSession } from '../../api/authSession';
import { useHeaderModal } from '../../context/HeaderModalContext';
import { AlertType } from '../../types/share';

/** Connects to NotificationHub while authenticated and pushes into Redux + optional alert. */
export const useNotificationHub = (enabled: boolean) => {
  const hubRef = useRef<signalR.HubConnection | null>(null);
  const hubUrl = `${process.env.REACT_APP_API_LOCAL}/hubs/notificationHub`;
  const dispatch = useDispatch<AppDispatch>();
  const { showAlert } = useHeaderModal();
  const { AddNotification } = NotificationSlice.actions;
  const showAlertRef = useRef(showAlert);
  showAlertRef.current = showAlert;

  useEffect(() => {
    if (!enabled) return;
    if (!hasAuthSession()) return;

    const hub = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
        accessTokenFactory: () => '',
      })
      .withAutomaticReconnect()
      .build();

    hubRef.current = hub;

    hub.on('ReceiveNotification', (data: unknown) => {
      if (!data) return;
      dispatch(AddNotification(data as any));

      const mapped = mapHubNotification(data as any);
      if (!mapped) return;

      const type = String((data as any).type ?? (data as any).Type ?? '')
        .trim()
        .toLowerCase();
      const isSanction = type === 'platformsanction' || type === '8';
      const isAppeal = type === 'platformappeal' || type === '9';
      const isSupport = type === 'supportticketreply' || type === '7';

      if (isSanction || isAppeal || isSupport) {
        const alertType: AlertType = isSanction ? 'warning' : 'info';
        // Generic toast titles — specific wording lives in the message body.
        const toastTitle = isSanction ? 'Внимание' : 'Уведомление';
        showAlertRef.current(mapped.message, alertType, toastTitle, mapped.link || undefined);
      }
    });

    hub
      .start()
      .then(() => console.log('Connected to NotificationHub'))
      .catch((err) => console.error('NotificationHub connection failed:', err));

    return () => {
      hub.stop().catch(() => {});
      hubRef.current = null;
    };
  }, [AddNotification, dispatch, enabled, hubUrl]);
};
