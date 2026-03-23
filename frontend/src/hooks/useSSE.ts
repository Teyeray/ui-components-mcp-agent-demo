import { useState, useEffect, useRef } from 'react';

interface SSEEvent {
  event: string;
  data: any;
}

interface UseSSEReturn {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  error: string | null;
}

export function useSSE(url?: string): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const sseUrl = url || `${import.meta.env.VITE_SSE_URL || 'http://localhost:8000/events'}`;

  const connect = () => {
    try {
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('SSE connection established');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent(data);
          console.log('SSE event received:', data);
        } catch (err) {
          console.error('Failed to parse SSE event data:', err);
        }
      };

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        setIsConnected(false);
        setError('连接错误，正在尝试重连...');
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connect();
          }
        }, 3000) as unknown as number;
      };

      eventSource.addEventListener('close', () => {
        setIsConnected(false);
        console.log('SSE connection closed');
      });

    } catch (err) {
      console.error('Failed to create SSE connection:', err);
      setError('无法建立连接');
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [sseUrl]);

  return {
    isConnected,
    lastEvent,
    error
  };
}
