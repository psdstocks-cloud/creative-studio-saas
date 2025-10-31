import { useEffect, useRef } from 'react';
import { useQueryClient } from '../lib/queryClient';
import { DOWNLOAD_JOBS_QUERY_KEY } from './queries/useDownloads';
import { useDownloadsStore, type DownloadEvent } from '../stores/downloadsStore';

const buildWebSocketUrl = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const base = (explicit && explicit.trim().length > 0 ? explicit.trim() : window.location.origin).replace(/\/+$/, '');
  const withoutApi = base.replace(/\/api$/i, '');

  try {
    const url = new URL(withoutApi);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = `${url.pathname.replace(/\/$/, '')}/ws/downloads`;
    return url.toString();
  } catch (error) {
    console.error('Failed to build downloads websocket URL', error);
    return '';
  }
};

const POLLING_INTERVAL_MS = 5000;

export const useDownloadsRealtime = () => {
  const handleEvent = useDownloadsStore((state) => state.handleEvent);
  const setConnectionStatus = useDownloadsStore((state) => state.setConnectionStatus);
  const connectionStatus = useDownloadsStore((state) => state.connectionStatus);
  const queryClient = useQueryClient();
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const manualCloseRef = useRef(false);

  useEffect(() => {
    const connect = () => {
      const url = buildWebSocketUrl();
      if (!url) {
        setConnectionStatus('error');
        return;
      }

      setConnectionStatus('connecting');

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnectionStatus('connected');
      };

      socket.onerror = () => {
        setConnectionStatus('error');
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (!manualCloseRef.current) {
          setConnectionStatus('error');
          reconnectTimer.current = setTimeout(() => {
            connect();
          }, POLLING_INTERVAL_MS);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as DownloadEvent;
          handleEvent(data);
        } catch (error) {
          console.error('Failed to parse download event', error, event.data);
        }
      };
    };

    manualCloseRef.current = false;
    connect();

    return () => {
      manualCloseRef.current = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      socketRef.current = null;
    };
  }, [handleEvent, setConnectionStatus]);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      return;
    }
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: DOWNLOAD_JOBS_QUERY_KEY });
    }, POLLING_INTERVAL_MS);
    return () => {
      clearInterval(id);
    };
  }, [connectionStatus, queryClient]);
};
