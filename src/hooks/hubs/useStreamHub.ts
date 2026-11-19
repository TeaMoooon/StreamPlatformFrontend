import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { createGuestKey } from '../../utils/createGuestKey';
import { IStream } from '../../types/share';
import { hasAuthSession } from '../../api/authSession';
import { mapStreamFromHub } from './streamHub.utils';

interface UseStreamHubProps {
  nickname: string | undefined;
  userData: { id: number } | null;
  /** Logged-in viewer id; used to detect login/logout and reconnect SignalR with/without JWT. */
  authUserId?: number | null;
}

const STATUS_POLL_MS = 8000;

export const useStreamHub = ({ nickname, userData, authUserId = null }: UseStreamHubProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hubRef = useRef<signalR.HubConnection | null>(null);
  const intervalRef = useRef<NodeJS.Timer | null>(null);
  const userTokenRef = useRef<string | null>(null);
  const nicknameRef = useRef<string | undefined>(nickname);
  const streamerIdRef = useRef<number | undefined>(userData?.id);
  const joinedNicknameRef = useRef<string | null>(null);
  /** Whether the current hub was negotiated with a JWT (cookie). */
  const connectedWithAuthRef = useRef(false);
  const hubUrlRef = useRef(`${process.env.REACT_APP_API_LOCAL}/hubs/streamHub`);
  const startGenerationRef = useRef(0);

  const [currentStream, setCurrentStream] = useState<IStream | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  const hubUrl = hubUrlRef.current;

  nicknameRef.current = nickname;
  streamerIdRef.current = userData?.id;

  const handlersRef = useRef({
    handleStreamJoined: (_streamInfo: unknown) => {},
    handleUpdateViewerCount: (_count: number) => {},
    handleStreamStatusChanged: (_data: unknown) => {},
  });

  const bindHandlers = (hub: signalR.HubConnection) => {
    handlersRef.current.handleStreamJoined = (streamInfo: unknown) => {
      setCurrentStream(mapStreamFromHub(streamInfo as Record<string, unknown>));
    };

    handlersRef.current.handleUpdateViewerCount = (count: number) => {
      setViewerCount(count);
    };

    handlersRef.current.handleStreamStatusChanged = (data: any) => {
      const status = String(data?.status ?? data?.Status ?? '').toLowerCase();
      const streamPayload = data?.stream ?? data?.Stream;

      if (['offline', 'stopped'].includes(status)) {
        setCurrentStream(null);
        return;
      }

      const mapped = mapStreamFromHub(streamPayload as Record<string, unknown> | undefined);

      if (mapped) {
        setCurrentStream(mapped);
        const nick = nicknameRef.current;
        const hubConn = hubRef.current;
        if (nick && hubConn?.state === signalR.HubConnectionState.Connected) {
          hubConn.invoke('JoinStream', nick, userTokenRef.current).catch(console.error);
        }
        return;
      }

      if (['live', 'started', 'on'].includes(status) && streamPayload) {
        handlersRef.current.handleStreamJoined(streamPayload);
        return;
      }
    };

    hub.off('StreamJoined', handlersRef.current.handleStreamJoined);
    hub.off('UpdateViewerCount', handlersRef.current.handleUpdateViewerCount);
    hub.off('StreamStatusChanged', handlersRef.current.handleStreamStatusChanged);

    hub.on('StreamJoined', handlersRef.current.handleStreamJoined);
    hub.on('UpdateViewerCount', handlersRef.current.handleUpdateViewerCount);
    hub.on('StreamStatusChanged', handlersRef.current.handleStreamStatusChanged);
  };

  const joinStream = (hub: signalR.HubConnection) => {
    const nick = nicknameRef.current;
    const streamerId = streamerIdRef.current;
    if (!nick) return;

    // Await JoinStream so ConnectionMap is ready before UpdateStreamStatus (hub gates on join).
    hub
      .invoke('JoinStream', nick, userTokenRef.current)
      .then(() => {
        joinedNicknameRef.current = nick;
        if (streamerId) {
          hub.invoke('UpdateStreamStatus', streamerId).catch(console.error);
        }
      })
      .catch(console.error);
  };

  const ensureStatusPoll = (hub: signalR.HubConnection) => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      const streamerId = streamerIdRef.current;
      if (hub.state === signalR.HubConnectionState.Connected && streamerId) {
        hub.invoke('UpdateStreamStatus', streamerId).catch(console.error);
      }
    }, STATUS_POLL_MS);
  };

  const clearStatusPoll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startHub = () => {
    const generation = ++startGenerationRef.current;
    const hasAuthToken = hasAuthSession();
    connectedWithAuthRef.current = hasAuthToken;

    const hub = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
        accessTokenFactory: () => '',
      })
      .withAutomaticReconnect()
      .build();

    hubRef.current = hub;
    bindHandlers(hub);

    hub
      .start()
      .then(() => {
        if (startGenerationRef.current !== generation || hubRef.current !== hub) return;
        setConnection(hub);
        joinStream(hub);
        ensureStatusPoll(hub);
      })
      .catch(console.error);

    hub.onreconnected(() => {
      if (hubRef.current !== hub) return;
      setConnection(hub);
      joinStream(hub);
    });

    return hub;
  };

  const stopHub = (hub: signalR.HubConnection) => {
    hub.off('StreamJoined', handlersRef.current.handleStreamJoined);
    hub.off('UpdateViewerCount', handlersRef.current.handleUpdateViewerCount);
    hub.off('StreamStatusChanged', handlersRef.current.handleStreamStatusChanged);
    hub.stop().catch(() => {});
    if (hubRef.current === hub) {
      hubRef.current = null;
      connectedWithAuthRef.current = false;
    }
  };

  // Primary connection lifecycle (streamer page).
  useEffect(() => {
    if (!nickname || !userData?.id) return;

    const nicknameChanged = joinedNicknameRef.current !== null && joinedNicknameRef.current !== nickname;
    if (nicknameChanged || joinedNicknameRef.current === null) {
      setCurrentStream(null);
      setViewerCount(0);
    }

    if (!userTokenRef.current) {
      userTokenRef.current = createGuestKey();
    }

    const existingHub = hubRef.current;
    if (existingHub && existingHub.state !== signalR.HubConnectionState.Disconnected) {
      bindHandlers(existingHub);
      joinStream(existingHub);
      setConnection(existingHub);
      ensureStatusPoll(existingHub);
      return;
    }

    const hub = startHub();

    return () => {
      clearStatusPoll();
      stopHub(hub);
      joinedNicknameRef.current = null;
      setConnection(null);
    };
  }, [nickname, userData?.id, hubUrl]);

  // After login/logout the JWT cookie changes, but SignalR only sends it at negotiate —
  // rebuild the hub when cookie auth no longer matches the live connection.
  useEffect(() => {
    if (!nickname || !userData?.id) return;

    const hasAuthToken = hasAuthSession();
    const existingHub = hubRef.current;
    if (!existingHub) return;
    if (hasAuthToken === connectedWithAuthRef.current) {
      // Profile hydrated after a cookie-backed connection — just refresh chat ACL.
      if (existingHub.state === signalR.HubConnectionState.Connected) {
        joinStream(existingHub);
      }
      return;
    }

    clearStatusPoll();
    stopHub(existingHub);
    setConnection(null);
    setCurrentStream(null);
    setViewerCount(0);

    const hub = startHub();
    return () => {
      // Only tear down if this effect still owns the hub (streamer effect may replace it).
      if (hubRef.current === hub) {
        clearStatusPoll();
        stopHub(hub);
        setConnection(null);
      }
    };
  }, [authUserId, nickname, userData?.id]);

  return {
    videoRef,
    currentStream,
    viewerCount,
    connection,
  };
};
