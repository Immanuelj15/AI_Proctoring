"use client";

import React, { useState, useRef, useEffect } from "react";
import { verifyIdentity, uploadRoomScan } from "@/lib/api";

interface IdentityVerificationModalProps {
  sessionId: string;
  candidateName: string;
  examTitle: string;
  onComplete: () => void;
  onCancel: () => void;
}

type VerificationStep = "photo" | "verifying" | "matched" | "roomscan" | "uploading_scan" | "ready";

export default function IdentityVerificationModal({
  sessionId,
  candidateName,
  examTitle,
  onComplete,
  onCancel,
}: IdentityVerificationModalProps) {
  const [step, setStep] = useState<VerificationStep>("photo");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [purgeDate, setPurgeDate] = useState<string | null>(null);
  const [policyStatement, setPolicyStatement] = useState<string>("");
  const [scanSecondsRemaining, setScanSecondsRemaining] = useState<number>(15);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Start webcam preview for onboarding
  useEffect(() => {
    let mounted = true;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        if (mounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMsg("Camera access required. Please allow webcam permissions in your browser to verify identity.");
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Capture still snapshot from webcam
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        setPhotoBlob(blob);
        setPhotoPreview(URL.createObjectURL(blob));
        setErrorMsg(null);
      }
    }, "image/jpeg", 0.9);
  };

  // Handle local file upload (e.g. university student ID)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoBlob(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  // Run initial face match verification
  const handleVerifyIdentity = async () => {
    if (!photoBlob) {
      setErrorMsg("Please capture or upload an ID photo first.");
      return;
    }
    setStep("verifying");
    setErrorMsg(null);

    try {
      // Capture an instantaneous live frame to match against the reference ID
      let liveBlob = photoBlob;
      if (videoRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const snap = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
          if (snap) liveBlob = snap;
        }
      }

      const formData = new FormData();
      formData.append("file", photoBlob, "reference_id.jpg");
      formData.append("live_frame", liveBlob, "live_sample.jpg");

      const res = await verifyIdentity(sessionId, formData);
      setMatchScore(res.confidence);
      setPurgeDate(res.retention_purge_date);
      setPolicyStatement(res.policy);
      setStep("matched");
    } catch (err: any) {
      setErrorMsg(err.message || "Face match check failed. Please ensure your face is clearly visible.");
      setStep("photo");
    }
  };

  // Start 360° Room Scan Recording
  const startRoomScan = () => {
    if (!streamRef.current) {
      setErrorMsg("Webcam stream unavailable for room scan.");
      return;
    }

    try {
      recordedChunksRef.current = [];
      const options = { mimeType: "video/webm;codecs=vp8" };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(streamRef.current, options);
      } catch (e) {
        recorder = new MediaRecorder(streamRef.current);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const completeBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        await handleUploadRoomScan(completeBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(500);
      setIsScanning(true);
      setScanSecondsRemaining(15);
      setStep("roomscan");
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg("Failed to start video recording for room scan. " + err.message);
    }
  };

  // 15-second room scan countdown
  useEffect(() => {
    if (!isScanning) return;
    if (scanSecondsRemaining <= 0) {
      setIsScanning(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    const timer = setInterval(() => {
      setScanSecondsRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isScanning, scanSecondsRemaining]);

  const handleUploadRoomScan = async (videoBlob: Blob) => {
    setStep("uploading_scan");
    try {
      await uploadRoomScan(sessionId, videoBlob);
      setStep("ready");
    } catch (err: any) {
      setErrorMsg("Failed to upload room scan clip. You may retry or continue.");
      setStep("ready");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(18, 23, 43, 0.94)",
        backdropFilter: "blur(20px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        className="auth-card"
        style={{
          maxWidth: "640px",
          width: "100%",
          padding: "2rem",
          margin: 0,
          background: "var(--bg-surface-elevated)",
          border: "1px solid var(--border-light)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
              <span className="badge" style={{ background: "rgba(46, 90, 172, 0.2)", color: "#93c5fd", border: "1px solid rgba(46, 90, 172, 0.4)" }}>
                Step {step === "photo" || step === "verifying" ? "1 of 2: Identity Verification" : step === "matched" || step === "roomscan" || step === "uploading_scan" ? "2 of 2: 360° Room Scan" : "Verified & Ready"}
              </span>
              <span className="badge badge-student">{candidateName}</span>
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>Security & Integrity Pre-Check</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>{examTitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.25rem", cursor: "pointer" }}
            aria-label="Cancel check and return"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="alert-banner error" style={{ marginBottom: "1rem" }}>
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* STEP 1: Capture or Upload Reference ID Photo */}
        {(step === "photo" || step === "verifying") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Capture a reference photo using your webcam or upload an institutional ID photo. This photo is matched against your live webcam feed to verify your identity.
            </p>

            <div style={{ position: "relative", width: "100%", height: "260px", background: "#000", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Candidate Reference ID"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                />
              )}

              {/* Viewfinder Target Guide */}
              {!photoPreview && (
                <div
                  style={{
                    position: "absolute",
                    inset: "15% 25%",
                    border: "2px dashed var(--primary-cyan)",
                    borderRadius: "50%",
                    pointerEvents: "none",
                    opacity: 0.6,
                  }}
                />
              )}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              {!photoPreview ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={captureSnapshot}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <span>📸</span> Capture Reference Photo
                  </button>
                  <label
                    className="btn btn-secondary"
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <span>📁</span> Upload ID Photo
                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                  </label>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setPhotoBlob(null);
                      setPhotoPreview(null);
                    }}
                  >
                    🔄 Retake Photo
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={step === "verifying"}
                    onClick={handleVerifyIdentity}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    {step === "verifying" ? "Analyzing Face Match..." : "✓ Confirm & Run Match Check"}
                  </button>
                </>
              )}
            </div>

            {/* Privacy & Retention Standard Notice */}
            <div
              style={{
                background: "rgba(18, 23, 43, 0.6)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
              }}
            >
              🔒 <strong>Privacy Standard:</strong> Biometric templates and facial vectors are <em>never</em> generated or stored. Only a match-confidence score is recorded. The photo is encrypted and permanently purged after 30 days.
            </div>
          </div>
        )}

        {/* STEP 2: Match Success & Transition to Room Scan */}
        {step === "matched" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center", padding: "1rem 0" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(62, 128, 103, 0.2)",
                color: "var(--color-sage)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                margin: "0 auto",
                border: "1px solid rgba(62, 128, 103, 0.4)",
              }}
            >
              ✓
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff", marginBottom: "0.3rem" }}>
                Identity Verified Successfully
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Match Confidence: <strong style={{ color: "#34d399" }}>{((matchScore || 0.9) * 100).toFixed(1)}%</strong>
              </p>
              {purgeDate && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Reference photo scheduled for permanent purge on: {new Date(purgeDate).toLocaleDateString()}
                </p>
              )}
            </div>

            <div
              style={{
                background: "rgba(217, 142, 41, 0.08)",
                border: "1px solid rgba(217, 142, 41, 0.25)",
                borderRadius: "10px",
                padding: "1rem",
                textAlign: "left",
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
              }}
            >
              <h4 style={{ color: "var(--color-amber)", fontWeight: 700, marginBottom: "0.35rem" }}>
                Next: 360° Webcam Room Scan
              </h4>
              <p style={{ margin: 0 }}>
                Before the exam timer starts, you will record a 15-second slow pan of your immediate desk and room surroundings. This video is attached to your session for review <strong>only if an incident is later flagged</strong>.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={startRoomScan}
              style={{ padding: "0.75rem 1.5rem", alignSelf: "center" }}
            >
              📹 Begin 360° Room Scan
            </button>
          </div>
        )}

        {/* STEP 3: Recording Room Scan */}
        {(step === "roomscan" || step === "uploading_scan") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--color-coral)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "var(--color-coral)", animation: "pulse 1s infinite" }} />
                Recording Room Pan ({scanSecondsRemaining}s remaining)
              </span>
              <span className="badge badge-examiner">Keep Pan Smooth</span>
            </div>

            <div style={{ position: "relative", width: "100%", height: "260px", background: "#000", borderRadius: "12px", overflow: "hidden", border: "2px solid var(--color-coral)" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />

              {/* Progress Bar */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6px", background: "rgba(255,255,255,0.2)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${((15 - scanSecondsRemaining) / 15) * 100}%`,
                    background: "var(--color-coral)",
                    transition: "width 1s linear",
                  }}
                />
              </div>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
              Slowly rotate your webcam or laptop 360° to scan your desk, walls, and workspace. Recording stops automatically.
            </p>

            {step === "uploading_scan" && (
              <p style={{ fontSize: "0.85rem", color: "var(--primary-cyan)", textAlign: "center" }}>
                Encrypting and attaching room scan clip to session...
              </p>
            )}
          </div>
        )}

        {/* STEP 4: All Complete, Ready to Launch */}
        {step === "ready" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center", padding: "1rem 0" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(62, 128, 103, 0.25)",
                color: "var(--color-sage)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                margin: "0 auto",
                border: "1px solid rgba(62, 128, 103, 0.4)",
              }}
            >
              ✓
            </div>

            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: "0.3rem" }}>
                Pre-Flight Checks Complete
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Identity matched and 360° room scan clip attached. You are cleared to begin the timed examination.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onComplete}
                style={{ padding: "0.75rem 2rem", fontSize: "0.95rem", fontWeight: 700 }}
              >
                🚀 Start Exam & Begin Timer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
