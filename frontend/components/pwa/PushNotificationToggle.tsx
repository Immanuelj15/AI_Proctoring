"use client";

import React, { useState, useEffect } from "react";
import {
  isPushNotificationSupported,
  getExistingSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  triggerTestPushNotification,
} from "@/lib/pushNotifications";

interface PushNotificationToggleProps {
  userId?: number | string;
  compact?: boolean;
}

export default function PushNotificationToggle({ userId, compact = false }: PushNotificationToggleProps) {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const supported = isPushNotificationSupported();
    setIsSupported(supported);

    if (supported && typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
      getExistingSubscription().then((sub) => {
        setIsSubscribed(Boolean(sub));
      });
    }
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    setFeedbackMessage(null);

    try {
      if (isSubscribed) {
        const success = await unsubscribeFromPushNotifications();
        if (success) {
          setIsSubscribed(false);
          setFeedbackMessage("Notifications turned off.");
        }
      } else {
        const res = await subscribeToPushNotifications(userId);
        if (res.success) {
          setIsSubscribed(true);
          setPermissionState("granted");
          setFeedbackMessage("Subscribed to exam reminders!");
        } else {
          setFeedbackMessage(res.error || "Subscription cancelled.");
        }
      }
    } catch (err: any) {
      setFeedbackMessage(err.message || "Action failed.");
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      const sent = await triggerTestPushNotification(userId);
      if (sent) {
        setFeedbackMessage("Test notification sent!");
      } else {
        setFeedbackMessage("Could not send test reminder.");
      }
    } catch (err) {
      setFeedbackMessage("Test dispatch error.");
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  if (!isSupported) {
    return null; // Gracefully hide if browser has no Push API support
  }

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading || permissionState === "denied"}
        className="nav-link-item"
        style={{
          background: isSubscribed ? "rgba(62, 128, 103, 0.15)" : "transparent",
          border: isSubscribed ? "1px solid rgba(62, 128, 103, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
          color: isSubscribed ? "#34d399" : "var(--text-muted)",
          cursor: permissionState === "denied" ? "not-allowed" : "pointer",
          padding: "0.35rem 0.65rem",
          borderRadius: "8px",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          fontSize: "0.76rem",
          fontWeight: 600,
          transition: "all 140ms ease",
        }}
        title={
          permissionState === "denied"
            ? "Notifications blocked in browser settings"
            : isSubscribed
            ? "Push notifications active for exam reminders"
            : "Click to enable exam reminder notifications"
        }
      >
        <span>{isSubscribed ? "🔔" : "🔕"}</span>
        <span>{isSubscribed ? "Reminders On" : "Reminders"}</span>
      </button>
    );
  }

  return (
    <div
      style={{
        background: "rgba(18, 23, 43, 0.6)",
        border: "1px solid rgba(46, 90, 172, 0.3)",
        borderRadius: "12px",
        padding: "0.85rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        maxWidth: "460px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
        <span style={{ fontSize: "1.3rem" }}>{isSubscribed ? "🔔" : "🔕"}</span>
        <div>
          <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#FFFFFF" }}>
            Exam Start Reminders
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {permissionState === "denied"
              ? "Notifications blocked in your browser settings."
              : isSubscribed
              ? "Active: You will receive 15-minute start reminders."
              : "Get instant desktop/mobile alerts before exams begin."}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        {isSubscribed && (
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={loading}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "6px",
              padding: "0.3rem 0.6rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Send an immediate test push reminder"
          >
            Test
          </button>
        )}

        <button
          type="button"
          onClick={handleToggle}
          disabled={loading || permissionState === "denied"}
          style={{
            background: isSubscribed ? "#C4483C" : "#2E5AAC",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "6px",
            padding: "0.35rem 0.75rem",
            fontSize: "0.76rem",
            fontWeight: 700,
            cursor: permissionState === "denied" ? "not-allowed" : "pointer",
            transition: "opacity 120ms ease",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Updating..." : isSubscribed ? "Disable" : "Enable"}
        </button>
      </div>

      {feedbackMessage && (
        <span style={{ fontSize: "0.7rem", color: "#fbbf24", marginLeft: "0.5rem" }}>
          {feedbackMessage}
        </span>
      )}
    </div>
  );
}
