// Custom hook for real-time scheduler updates
import { useState, useEffect, useCallback, useRef } from 'react';
import { SchedulerDataAdapter } from '../lib/adapters/base/SchedulerDataAdapter';

export interface UseSchedulerRealtimeOptions {
  adapter?: SchedulerDataAdapter;
  channels?: string[];
  autoConnect?: boolean;
  onUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
}

export interface UseSchedulerRealtimeResult {
  connected: boolean;
  connectionError: string | null;
  lastUpdate: Date | null;
  reconnect: () => void;
  disconnect: () => void;
  sendMessage: (channel: string, message: any) => Promise<void>;
}

export function useSchedulerRealtime(options: UseSchedulerRealtimeOptions = {}): UseSchedulerRealtimeResult {
  const {
    adapter,
    channels = ['jobs', 'resources', 'conflicts'],
    autoConnect = true,
    onUpdate,
    onError
  } = options;

  const [connected, setConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const adapterRef = useRef<SchedulerDataAdapter | undefined>(adapter);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // For demo purposes, we'll simulate WebSocket connection
      // In production, you'd connect to actual WebSocket server
      const ws = new WebSocket(`ws://localhost:8080/scheduler/realtime`);

      ws.onopen = () => {
        setConnected(true);
        setConnectionError(null);
        // Subscribe to channels
        channels.forEach(channel => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastUpdate(new Date());
          onUpdate?.(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        setConnectionError('Connection error occurred');
        onError?.(error instanceof Error ? error : new Error('WebSocket error'));
      };

      ws.onclose = () => {
        setConnected(false);
        // Attempt to reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      socketRef.current = ws;
    } catch (err) {
      setConnectionError('Failed to establish connection');
      onError?.(err instanceof Error ? err : new Error('Connection failed'));
    }
  }, [channels, onUpdate, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  const sendMessage = useCallback(async (channel: string, message: any): Promise<void> => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    return new Promise((resolve, reject) => {
      socketRef.current!.send(JSON.stringify({ type: 'message', channel, data: message }));
      resolve();
    });
  }, []);

  // Initial connection
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connected,
    connectionError,
    lastUpdate,
    reconnect,
    disconnect,
    sendMessage
  };
}
