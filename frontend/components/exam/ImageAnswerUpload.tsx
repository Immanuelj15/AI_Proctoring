"use client";

import React, { useState, useRef } from "react";

interface ImageAnswerUploadProps {
  onImageSelected: (base64OrPath: string) => void;
  currentImage?: string;
}

export default function ImageAnswerUpload({ onImageSelected, currentImage }: ImageAnswerUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        onImageSelected(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Unable to access camera. Please allow webcam permissions.");
      setIsCameraActive(false);
    }
  };

  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPreview(dataUrl);
        onImageSelected(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Upload & Camera Trigger Buttons */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: "0.6rem 1.25rem", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}
          onClick={() => fileInputRef.current?.click()}
        >
          📁 Browse Local Image / Scan
        </button>
        <button
          type="button"
          className="btn-cyan"
          style={{ padding: "0.6rem 1.25rem", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}
          onClick={startCamera}
        >
          📷 Capture via Camera
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {/* Live Camera Feed */}
      {isCameraActive && (
        <div style={{ padding: "1.25rem", background: "#000", border: "1px solid rgba(6, 182, 212, 0.4)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", maxHeight: "280px", borderRadius: "8px", objectFit: "cover" }} />
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }}>
            <button type="button" className="btn-emerald" style={{ padding: "0.5rem 1.25rem", fontSize: "0.88rem" }} onClick={captureSnapshot}>
              📸 Snap Image
            </button>
            <button type="button" className="btn-danger" style={{ padding: "0.5rem 1.25rem", fontSize: "0.88rem" }} onClick={stopCamera}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Image Preview Container */}
      {preview && !isCameraActive && (
        <div style={{
          padding: "1rem",
          border: "1px solid rgba(16, 185, 129, 0.4)",
          background: "rgba(16, 185, 129, 0.06)",
          borderRadius: "var(--radius-md)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#34d399", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              ✓ Handwritten Script Attached & Ready for OCR Extraction
            </span>
            <button
              type="button"
              onClick={() => { setPreview(null); onImageSelected(""); }}
              style={{ fontSize: "0.75rem", color: "#f87171", cursor: "pointer", background: "none" }}
            >
              Remove
            </button>
          </div>
          <img
            src={preview}
            alt="Answer Script Preview"
            style={{ maxWidth: "100%", maxHeight: "240px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>
      )}
    </div>
  );
}
