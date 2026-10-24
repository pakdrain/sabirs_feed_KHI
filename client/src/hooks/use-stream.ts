import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface StreamStats {
  bandwidth: string;
  fps: number;
  latency: number;
  droppedFrames: number;
  uptime: string;
  buffer: string;
}

interface UseStreamReturn {
  isConnected: boolean;
  isStreaming: boolean;
  streamStats: StreamStats | null;
  connectionError: string | null;
  startStream: () => void;
  stopStream: () => void;
  reconnectStream: () => void;
}

export function useStream(cameraId?: number): UseStreamReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldAutoRestart = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 20;
  const { toast } = useToast();

  const connectWebSocket = useCallback(() => {
    if (!cameraId) return;

    try {
      // Clear any existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/stream`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionError(null);
        
        // Auto-start stream immediately upon connection if camera is available
        if (cameraId && shouldAutoRestart.current) {
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'start_stream',
                cameraId,
              }));
            }
          }, 1000);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setIsStreaming(false);
        
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) { // Not a normal closure
          reconnectAttempts.current++;
          setConnectionError(`Connection lost. Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          // Auto-reconnect with exponential backoff
          const delay = Math.min(1000 + (reconnectAttempts.current * 1000), 5000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
            
            // Auto-restart stream if it was previously streaming
            if (shouldAutoRestart.current && cameraId) {
              setTimeout(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: 'start_stream',
                    cameraId,
                  }));
                }
              }, 2000);
            }
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Failed to connect to stream server');
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [cameraId]);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'connected':
        console.log('WebSocket connection acknowledged');
        break;

      case 'stream_started':
        console.log('Stream started:', data);
        setIsStreaming(true);
        break;

      case 'stream_connected':
        console.log('Stream connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        toast({
          title: "Stream Connected",
          description: "Camera feed is now live",
        });
        break;

      case 'stream_stopped':
        console.log('Stream stopped');
        setIsStreaming(false);
        setIsConnected(false);
        setStreamStats(null);
        break;

      case 'stream_stats':
        setStreamStats(data.stats);
        break;

      case 'error':
        console.error('Stream error:', data.message);
        setConnectionError(data.message);
        toast({
          title: "Stream Error",
          description: data.message,
          variant: "destructive",
        });
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const startStream = useCallback(() => {
    if (!cameraId || !wsRef.current) return;

    // Mark that stream should auto-restart on reconnection
    shouldAutoRestart.current = true;

    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start_stream',
        cameraId,
      }));
    } else {
      setConnectionError('WebSocket not connected');
    }
  }, [cameraId]);

  const stopStream = useCallback(() => {
    if (!wsRef.current) return;

    // Mark that stream should NOT auto-restart
    shouldAutoRestart.current = false;

    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop_stream',
      }));
    }
  }, []);

  const reconnectStream = useCallback(() => {
    setConnectionError(null);
    setIsConnected(false);
    setIsStreaming(false);
    setStreamStats(null);
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Reconnect
    setTimeout(() => {
      connectWebSocket();
    }, 1000);
  }, [connectWebSocket]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (cameraId) {
      // Set auto-restart flag to true by default for immediate streaming
      shouldAutoRestart.current = true;
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [cameraId, connectWebSocket]);

  return {
    isConnected,
    isStreaming,
    streamStats,
    connectionError,
    startStream,
    stopStream,
    reconnectStream,
  };
}
