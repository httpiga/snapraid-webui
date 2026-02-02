import { useEffect, useRef, useState, useCallback } from "react";
import type { WSMessage, SnapRaidCommand, SyncSafetySettings } from "@shared/types";

interface UseWebSocketOptions {
  onOutput?: (chunk: string) => void;
  onComplete?: (exitCode: number) => void;
  onError?: (error: string) => void;
  autoReconnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onOutput, onComplete, onError, autoReconnect = true } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const initialConnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(
    undefined
  );
  const closedByUsRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isCommandRunning, setIsCommandRunning] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<SnapRaidCommand | null>(
    null
  );
  const [output, setOutput] = useState<string>("");

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        switch (message.type) {
          case "connected":
            // Connection confirmed
            break;

          case "output":
            if (message.chunk) {
              setOutput((prev) => prev + message.chunk);
              onOutput?.(message.chunk);
            }
            break;

          case "complete":
            setIsCommandRunning(false);
            setCurrentCommand(null);
            if (message.exitCode !== undefined) {
              onComplete?.(message.exitCode);
            }
            break;

          case "error":
            if (message.error) {
              onError?.(message.error);
            }
            break;

          case "status":
            if (message.command) {
              setIsCommandRunning(true);
              setCurrentCommand(message.command as SnapRaidCommand);
            }
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      const wasClosedByUs = closedByUsRef.current;
      if (!wasClosedByUs) {
        console.log("WebSocket disconnected");
      }
      setIsConnected(false);
      wsRef.current = null;
      closedByUsRef.current = false;

      if (autoReconnect && !wasClosedByUs) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect...");
          connectRef.current();
        }, 3000);
      }
    };

    ws.onerror = () => {
      // Only log if we had connected before (avoids noisy first-connection/proxy errors)
      if (wsRef.current?.readyState === WebSocket.CONNECTING) {
        // Let onclose handle reconnection; avoid duplicate "WebSocket error" log
        return;
      }
      console.error("WebSocket error");
    };
  }, [onOutput, onComplete, onError, autoReconnect]);

  const disconnect = useCallback(() => {
    closedByUsRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Refs so the mount effect doesn't depend on connect/disconnect (which change when
  // parent passes new callbacks), avoiding disconnect/reconnect loops.
  const connectRef = useRef(connect);
  const disconnectRef = useRef(disconnect);
  connectRef.current = connect;
  disconnectRef.current = disconnect;

  const sendCommand = useCallback(
    (
      command: SnapRaidCommand,
      args: string[] = [],
      syncSafetySettings?: SyncSafetySettings
    ) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not connected");
        return false;
      }

      setOutput("");
      wsRef.current.send(
        JSON.stringify({ type: "command", command, args, syncSafetySettings })
      );
      return true;
    },
    []
  );

  const abort = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    wsRef.current.send(JSON.stringify({ type: "abort" }));
    return true;
  }, []);

  const clearOutput = useCallback(() => {
    setOutput("");
  }, []);

  useEffect(() => {
    // Delay initial connection so the dev proxy and backend are ready and to avoid
    // React Strict Mode double-mount leaving a stray "interrupted" connection.
    const timeoutId = setTimeout(() => {
      initialConnectTimeoutRef.current = undefined;
      connectRef.current();
    }, 200);
    initialConnectTimeoutRef.current = timeoutId;

    return () => {
      if (initialConnectTimeoutRef.current !== undefined) {
        clearTimeout(initialConnectTimeoutRef.current);
        initialConnectTimeoutRef.current = undefined;
      }
      disconnectRef.current();
    };
  }, []); // Intentionally empty: run only on mount/unmount to avoid disconnect/reconnect loops

  return {
    isConnected,
    isCommandRunning,
    currentCommand,
    output,
    setOutput,
    sendCommand,
    abort,
    clearOutput,
    connect,
    disconnect,
  };
}
