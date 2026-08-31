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
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="button"
          className="btn"
          style={{ background: "#f1f5f9", color: "#1e293b", border: "1px solid #cbd5e1" }}
          onClick={() => fileInputRef.current?.click()}
        >
          📁 Choose File
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "auto" }}
          onClick={startCamera}
        >
          📷 Capture via Webcam
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
        <div style={{ padding: "1rem", background: "#0f172a", borderRadius: "12px", textAlign: "center" }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", maxHeight: "280px", borderRadius: "8px" }} />
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "0.75rem" }}>
            <button type="button" className="btn btn-primary" onClick={captureSnapshot}>
              📸 Take Snapshot
            </button>
            <button type="button" className="btn btn-danger" onClick={stopCamera}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Image Preview Container */}
      {preview && !isCameraActive && (
        <div style={{ padding: "0.75rem", border: "1px solid #a7f3d0", background: "#ecfdf5", borderRadius: "10px" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#065f46", marginBottom: "0.5rem" }}>
            ✓ Handwritten Script Attached:
          </p>
          <img src={preview} alt="Answer Script Preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "6px" }} />
        </div>
      )}
    </div>
  );
}
