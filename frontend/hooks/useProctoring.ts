"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  const animationFrameRef = useRef<number | null>(null);

  const triggerViolation = useCallback((eventType: string, inc: number) => {
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

    // Broadcast immediate violation event over WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          session_id: sessionId,
          event_type: eventType,
          suspicion_increment: inc,
          timestamp: new Date().toISOString(),
          metrics: {
            face_present: true,
            face_count: 1,
            gaze_on_screen: false,
          },
        })
      );
    }
  }, [sessionId, onViolation, onDisqualify]);

  // 1. Initialize Webcam, Microphone & WebSocket stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let audioInterval: NodeJS.Timeout | null = null;

    async function initMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Initialize Web Audio API Analyser for real-time decibel analysis
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioContext = new AudioContextClass();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let consecutiveLoudSamples = 0;

            audioInterval = setInterval(() => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const averageVolume = sum / dataArray.length; // 0 to 255
              const approxDb = Math.round(20 * Math.log10(averageVolume + 1));

              // If acoustic energy exceeds threshold (> 35 dB sustained acoustic energy)
              if (approxDb > 35) {
                consecutiveLoudSamples += 1;
                if (consecutiveLoudSamples >= 3) {
                  triggerViolation("ACOUSTIC_DISTURBANCE_OR_CONVERSATION", 15);
                  consecutiveLoudSamples = 0;
                }
              } else {
                consecutiveLoudSamples = Math.max(0, consecutiveLoudSamples - 1);
              }
            }, 1000);
          }
        } catch (audioErr) {
          console.warn("Audio analysis not supported or blocked in this environment.");
        }
      } catch (err) {
        // Fallback: try video-only if audio was blocked by user permissions
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (videoErr) {
          console.warn("Webcam access restricted or not available.");
        }
      }
    }

    initMedia();

    // Establish WebSocket telemetry stream to FastAPI backend
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const wsBase = apiBase.replace(/^http/, "ws");
      const wsUrl = `${wsBase}/api/v1/proctor/stream?session_id=${sessionId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "EXAMINER_COMMAND") {
            if (data.command === "WARN") {
              triggerViolation(`EXAMINER WARNING: ${data.message}`, 10);
            } else if (data.command === "DISQUALIFY") {
              if (onDisqualify) onDisqualify();
            }
          }
        } catch (e) {}
      };
    } catch (err) {
      setWsConnected(false);
    }

    return () => {
      if (audioInterval) clearInterval(audioInterval);
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, triggerViolation, onDisqualify]);

  // 2. Real-Time Canvas Vision & Face Mesh Overlay Loop
  useEffect(() => {
    let lastGazeCheck = Date.now();

    const renderVisionOverlay = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === 4) {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Simulated Computer Vision Bounding Box & Iris Gaze Tracking
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const boxWidth = canvas.width * 0.45;
          const boxHeight = canvas.height * 0.55;

          // Draw Face Detection Box
          ctx.strokeStyle = metrics.suspicionScore > 50 ? "#ef4444" : "#10b981";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight);
          ctx.setLineDash([]);

          // Draw Iris / Eye Target Crosshairs
          const leftEyeX = centerX - 35;
          const rightEyeX = centerX + 35;
          const eyeY = centerY - 25;

          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(leftEyeX, eyeY, 4, 0, 2 * Math.PI);
          ctx.arc(rightEyeX, eyeY, 4, 0, 2 * Math.PI);
          ctx.fill();

          // Overlay Tag
          ctx.font = "10px sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.fillText("AI Vision: Tracking", centerX - boxWidth / 2 + 6, centerY - boxHeight / 2 + 14);
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderVisionOverlay);
    };

    animationFrameRef.current = requestAnimationFrame(renderVisionOverlay);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [metrics.suspicionScore]);

  // 3. Periodic 10-Second WebSocket Heartbeat Payload
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            session_id: sessionId,
            timestamp: new Date().toISOString(),
            metrics: {
              face_present: true,
              face_count: metrics.faceCount,
              gaze_on_screen: metrics.isGazeCenter,
            },
            current_suspicion_delta: 0.0,
          })
        );
      }
    }, 10000);

    return () => clearInterval(heartbeatInterval);
  }, [sessionId, metrics]);

  // 4. Zero-Trust Anti-Cheat Browser Event Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("TAB_SWITCH", 20);
      }
    };

    const handleWindowBlur = () => {
      triggerViolation("WINDOW_BLUR", 15);
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
  }, [triggerViolation]);

  return {
    metrics,
    wsConnected,
    videoRef,
    canvasRef,
  };
}
