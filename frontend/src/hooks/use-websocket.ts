import { useEffect, useRef, useState, useCallback } from "react";
import type { WSMessage, SnapRaidCommand } from "@shared/types";

interface UseWebSocketOptions {
  onOutput?: (chunk: string) => void;
  onComplete?: (exitCode: number) => void;
  onError?: (error: string) => void;
  autoReconnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onOutput, onComplete, onError, autoReconnect = true } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

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
      console.log("WebSocket disconnected");
      setIsConnected(false);
      wsRef.current = null;

      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect...");
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, [onOutput, onComplete, onError, autoReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendCommand = useCallback(
    (command: SnapRaidCommand, args: string[] = []) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not connected");
        return false;
      }

      setOutput("");
      wsRef.current.send(JSON.stringify({ type: "command", command, args }));
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
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    isCommandRunning,
    currentCommand,
    output,
    sendCommand,
    abort,
    clearOutput,
    connect,
    disconnect,
  };
}
