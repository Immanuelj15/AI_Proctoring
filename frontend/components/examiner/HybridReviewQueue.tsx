"use client";

import React, { useState, useEffect } from "react";
import { getReviewQueue, reviewProctorEvent, API_BASE_URL } from "@/lib/api";

interface ReviewQueueItem {
  id: string;
  session_id: string;
  candidate_name: string;
  candidate_email: string;
  exam_title: string;
  event_type: string;
  suspicion_increment: number;
  snapshot_url?: string;
  room_scan_url?: string;
  review_status: string;
  reviewed_by?: number;
  reviewed_at?: string;
  examiner_notes?: string;
  timestamp: string;
  session_ai_suspicion: number;
  session_confirmed_suspicion: number;
  identity_confidence?: number;
}

export default function HybridReviewQueue() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [filter, setFilter] = useState<string>("PENDING");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeMediaModal, setActiveMediaModal] = useState<{ type: "snapshot" | "roomscan"; url: string; title: string } | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReviewQueue(filter);
      setItems(data);
    } catch (err: any) {
      setError(err.message || "Failed to load review queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [filter]);

  const handleReviewAction = async (eventId: string, decision: "CONFIRM" | "DISMISS") => {
    setProcessingId(eventId);
    setActionSuccess(null);
    try {
      const notes = reviewNotes[eventId] || "";
      const res = await reviewProctorEvent(eventId, decision, notes);
      setActionSuccess(res.message || `Incident successfully ${decision.toLowerCase()}ed.`);
      // Reload queue
      await loadQueue();
    } catch (err: any) {
      setError(err.message || "Failed to update review status.");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = items.filter((i) => i.review_status === "PENDING").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header & Filter Controls */}
      <div className="panel-card">
        <div className="panel-header" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "1.4rem" }}>⚖️</span>
              <h3 className="panel-title" style={{ fontSize: "1.2rem", color: "#fff" }}>
                Hybrid Human-in-the-Loop Review Queue
              </h3>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              AI proctoring incidents require examiner confirmation before affecting official suspicion scores or grades.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {["PENDING", "CONFIRMED", "DISMISSED", "ALL"].map((f) => (
              <button
                key={f}
                type="button"
                className={`btn ${filter === f ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.4rem 0.85rem", fontSize: "0.78rem" }}
                onClick={() => setFilter(f)}
              >
                {f === "PENDING" && pendingCount > 0 ? `⏳ Pending (${pendingCount})` : f}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.78rem" }}
              onClick={loadQueue}
              title="Refresh queue"
            >
              🔄
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="alert-banner success" style={{ marginBottom: "1rem" }}>
            <span>✓</span> {actionSuccess}
          </div>
        )}

        {error && (
          <div className="alert-banner error" style={{ marginBottom: "1rem" }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Informational Guidance Box */}
        <div
          style={{
            background: "rgba(46, 90, 172, 0.08)",
            border: "1px solid rgba(46, 90, 172, 0.25)",
            borderRadius: "10px",
            padding: "0.85rem 1.1rem",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>🛡️</span>
          <div>
            <strong>Institutional Trust Guardrail:</strong> Algorithmic flags never automatically penalize student marks. Only violations confirmed by an examiner update the candidate&apos;s certified suspicion score. Flagged sessions include room scan clips for forensic verification.
          </div>
        </div>
      </div>

      {/* Queue Items List */}
      <div className="panel-card">
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <div className="pulse-dot pulse-dot-cyan" style={{ margin: "0 auto 1rem auto" }} />
            Loading review queue incidents...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>✓</span>
            <h4 style={{ color: "#fff", marginBottom: "0.25rem" }}>Review Queue Empty</h4>
            <p style={{ fontSize: "0.85rem", margin: 0 }}>
              {filter === "PENDING"
                ? "No pending AI-flagged incidents awaiting examiner review."
                : `No incidents found with status '${filter}'.`}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items.map((item) => {
              const isPending = item.review_status === "PENDING";
              const isConfirmed = item.review_status === "CONFIRMED";

              return (
                <div
                  key={item.id}
                  style={{
                    padding: "1.25rem",
                    borderRadius: "12px",
                    background: isPending
                      ? "rgba(217, 142, 41, 0.05)"
                      : isConfirmed
                      ? "rgba(196, 72, 60, 0.05)"
                      : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${
                      isPending
                        ? "rgba(217, 142, 41, 0.3)"
                        : isConfirmed
                        ? "rgba(196, 72, 60, 0.3)"
                        : "var(--border-subtle)"
                    }`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                  }}
                >
                  {/* Top Bar: Candidate & Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                        <span className="badge badge-student" style={{ fontWeight: 700 }}>
                          {item.candidate_name}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          ({item.candidate_email})
                        </span>
                        <span className="badge badge-examiner">
                          Session #{item.session_id}
                        </span>
                        <span
                          className="badge"
                          style={{
                            background: isPending
                              ? "rgba(217, 142, 41, 0.2)"
                              : isConfirmed
                              ? "rgba(196, 72, 60, 0.2)"
                              : "rgba(62, 128, 103, 0.2)",
                            color: isPending
                              ? "var(--color-amber)"
                              : isConfirmed
                              ? "var(--color-coral)"
                              : "var(--color-sage)",
                            border: `1px solid ${
                              isPending
                                ? "var(--color-amber)"
                                : isConfirmed
                                ? "var(--color-coral)"
                                : "var(--color-sage)"
                            }`,
                            fontWeight: 700,
                          }}
                        >
                          {item.review_status}
                        </span>
                      </div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                        {item.exam_title}
                      </h4>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.25rem", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "0.75rem", color: "#fca5a5" }}>
                          Provisional AI: <strong>{item.session_ai_suspicion}</strong>
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#6ee7b7" }}>
                          Confirmed: <strong>{item.session_confirmed_suspicion}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Incident Description & Telemetry */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.75rem 1rem",
                      background: "rgba(0, 0, 0, 0.25)",
                      borderRadius: "8px",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <span style={{ color: "var(--color-coral)", fontWeight: 700, fontSize: "0.85rem" }}>
                          🚨 Incident: {item.event_type.replace(/_/g, " ")}
                        </span>
                        <span className="badge badge-danger">
                          +{item.suspicion_increment} Suspicion Points
                        </span>
                      </div>
                      {item.identity_confidence !== undefined && (
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>
                          Pre-exam Identity Match: {(item.identity_confidence * 100).toFixed(1)}% Confidence
                        </p>
                      )}
                    </div>

                    {/* Forensic Media Inspection Buttons */}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {item.snapshot_url && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                          onClick={() =>
                            setActiveMediaModal({
                              type: "snapshot",
                              url: item.snapshot_url?.startsWith("http") ? item.snapshot_url : `${API_BASE_URL}${item.snapshot_url}`,
                              title: `Incident Snapshot: ${item.candidate_name} (${item.event_type})`,
                            })
                          }
                        >
                          📷 View Snapshot
                        </button>
                      )}

                      {item.room_scan_url ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.75rem",
                            border: "1px solid var(--primary-cyan)",
                            color: "var(--primary-cyan)",
                          }}
                          onClick={() =>
                            setActiveMediaModal({
                              type: "roomscan",
                              url: item.room_scan_url?.startsWith("http") ? item.room_scan_url : `${API_BASE_URL}${item.room_scan_url}`,
                              title: `360° Room Scan Clip: ${item.candidate_name}`,
                            })
                          }
                        >
                          📹 Inspect Room Scan
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", alignSelf: "center" }}>
                          No Room Scan Attached
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Examiner Action Controls */}
                  {isPending ? (
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", paddingTop: "0.25rem" }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Optional examiner rationale notes..."
                        value={reviewNotes[item.id] || ""}
                        onChange={(e) =>
                          setReviewNotes({ ...reviewNotes, [item.id]: e.target.value })
                        }
                        style={{ flex: 1, minWidth: "220px", fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
                      />
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={processingId === item.id}
                          onClick={() => handleReviewAction(item.id, "CONFIRM")}
                          style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}
                        >
                          {processingId === item.id ? "Saving..." : "✓ Confirm Violation"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={processingId === item.id}
                          onClick={() => handleReviewAction(item.id, "DISMISS")}
                          style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}
                        >
                          ✕ Dismiss False Positive
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        Adjudicated: <strong>{item.review_status}</strong> on{" "}
                        {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : "N/A"}
                        {item.examiner_notes && ` • Notes: "${item.examiner_notes}"`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReviewAction(item.id, isConfirmed ? "DISMISS" : "CONFIRM")}
                        style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.75rem", textDecoration: "underline" }}
                      >
                        Change to {isConfirmed ? "Dismissed" : "Confirmed"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Media Inspection Modal (Snapshot / Room Scan) */}
      {activeMediaModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            className="panel-card"
            style={{
              maxWidth: "680px",
              width: "100%",
              padding: "1.5rem",
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-light)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                {activeMediaModal.title}
              </h4>
              <button
                type="button"
                onClick={() => setActiveMediaModal(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "#000", borderRadius: "10px", overflow: "hidden", minHeight: "280px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {activeMediaModal.type === "roomscan" ? (
                <video
                  src={activeMediaModal.url}
                  controls
                  autoPlay
                  style={{ width: "100%", maxHeight: "420px" }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeMediaModal.url}
                  alt="Incident Forensic Snapshot"
                  style={{ width: "100%", maxHeight: "420px", objectFit: "contain" }}
                />
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveMediaModal(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
