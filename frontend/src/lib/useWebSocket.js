'use client';
import { useRef, useEffect, useCallback, useState } from 'react';

const MAX_RETRIES = 10;
const BASE_DELAY = 1000;

export function useWebSocket(url, { onMessage, enabled = true } = {}) {
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const timerRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!url || !enabled) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retriesRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (retriesRef.current < MAX_RETRIES && enabled) {
          const delay = Math.min(BASE_DELAY * 2 ** retriesRef.current, 30000);
          retriesRef.current += 1;
          timerRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => ws.close();
    } catch {}
  }, [url, enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  return { connected, send };
}
