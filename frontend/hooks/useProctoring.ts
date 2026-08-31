"use client";

import { useEffect, useRef, useState } from "react";

export interface ProctorMetrics {
  faceCount: number;
  isGazeCenter: boolean;
  suspicionScore: number;
  violationCount: number;
  lastEventType: string | null;
}

export interface UseProctoringOptions {
  sessionId: string;
  onViolation?: (eventType: string, increment: number) => void;
  onDisqualify?: () => void;
}

export function useProctoring({ sessionId, onViolation, onDisqualify }: UseProctoringOptions) {
  const [metrics, setMetrics] = useState<ProctorMetrics>({
    faceCount: 1,
    isGazeCenter: true,
    suspicionScore: 0,
    violationCount: 0,
    lastEventType: null,
  });

  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize MediaPipe Webcam & WebSocket stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Webcam access restricted or unavailable.");
      }
    }

    initCamera();

    // Establish WebSocket telemetry stream to FastAPI backend
    try {
      const wsUrl = `ws://127.0.0.1:8000/api/v1/proctor/stream?session_id=${sessionId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
    } catch (err) {
      setWsConnected(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId]);

  // Anti-Cheat Event Listeners & Suspicion Accumulator
  useEffect(() => {
    const triggerViolation = (eventType: string, inc: number) => {
      setMetrics((prev) => {
        const newScore = Math.min(100, prev.suspicionScore + inc);
        const newCount = prev.violationCount + 1;

        if (newScore >= 100 && onDisqualify) {
          onDisqualify();
        }

        return {
          ...prev,
          suspicionScore: newScore,
          violationCount: newCount,
          lastEventType: eventType,
        };
      });

      if (onViolation) {
        onViolation(eventType, inc);
      }

      // Broadcast heartbeat over WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event_type: eventType,
            suspicion_increment: inc,
            timestamp: new Date().toISOString(),
          })
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("TAB_SWITCH", 25);
      }
    };

    const handleWindowBlur = () => {
      triggerViolation("TAB_SWITCH", 25);
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerViolation("FULLSCREEN_EXIT", 25);
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopyPaste = (e: ClipboardEvent) => e.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
    };
  }, [onViolation, onDisqualify]);

  return {
    metrics,
    wsConnected,
    videoRef,
    canvasRef,
  };
}
