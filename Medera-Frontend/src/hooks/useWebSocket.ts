/**
 * useWebSocket — connects to the cabinet WebSocket for real-time events.
 * Automatically reconnects on disconnect, always using the latest access token.
 */
import { useEffect, useRef, useCallback } from 'react';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '../services/tokenStore';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const RECONNECT_DELAY_MS = 3000;
const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type WSEventType =
  | 'NOTIFICATION'
  | 'NEW_APPOINTMENT'
  | 'APPOINTMENT_UPDATED'
  | 'NEW_MESSAGE'
  | 'NEW_PATIENT';

export interface WSMessage {
  type: WSEventType;
  data: Record<string, unknown>;
}

type Handler = (msg: WSMessage) => void;

/** Attempt to refresh access token silently. Returns new token or null. */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access) {
      setAccessToken(data.access);
      if (data.refresh) setRefreshToken(data.refresh);
      return data.access;
    }
    return null;
  } catch {
    return null;
  }
}

export function useWebSocket(
  _legacyToken: string | null,  // kept for backward compat — ignored, we use tokenStore directly
  onMessage: Handler,
  enabled = true
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef<Handler>(onMessage);
  onMessageRef.current = onMessage;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const connect = useCallback(async () => {
    if (!enabledRef.current) return;

    // Always grab the freshest token
    let token = getAccessToken();
    if (!token) {
      token = await refreshAccessToken();
    }
    if (!token) return;

    const url = `${WS_BASE}/ws/cabinet/?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to cabinet channel');
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        onMessageRef.current(msg);
      } catch (err) {
        console.warn('[WS] Failed to parse message', err);
      }
    };

    ws.onclose = async (event) => {
      console.log('[WS] Disconnected', event.code);
      if (!enabledRef.current) return;
      if (event.code === 1000) return; // clean close

      // If auth error, try to refresh token before reconnecting
      if (event.code === 4001 || event.code === 4003) {
        await refreshAccessToken();
      }

      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = (err) => {
      console.warn('[WS] Error', err);
    };
  }, []); // no deps — always reads from tokenStore directly

  useEffect(() => {
    connect();
    return () => {
      enabledRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, [connect]);
}
