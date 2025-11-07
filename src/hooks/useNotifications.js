// src/hooks/useNotifications.js
"use client";
import { useState, useEffect, useCallback } from "react";
import { notificationAPI } from "@/lib/api";
import {
  requestNotificationPermission,
  getFCMToken,
  onMessageListener,
} from "@/lib/firebase";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);

  // Initialize FCM and request permission
  const initializeFCM = useCallback(async () => {
    try {
      const hasPermission = await requestNotificationPermission();

      if (hasPermission) {
        const token = await getFCMToken();
        if (token) {
          setFcmToken(token);
          // Store token to backend
          await notificationAPI.storeFCMToken({
            token,
            device_name: navigator.userAgent,
          });
          console.log("✅ FCM token stored successfully");
        }
      }
    } catch (err) {
      console.error("Error initializing FCM:", err);
    }
  }, []);

  // 🚀 Fetch notifications - ALWAYS FRESH
  const fetchNotifications = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Add cache buster
      const response = await notificationAPI.getAll({
        ...params,
        _t: Date.now(),
      });

      if (response.success) {
        setNotifications(response.data);
        setUnreadCount(response.unread_count);
        console.log(
          "✅ Notifications refreshed:",
          response.data.length,
          "items"
        );
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🚀 Fetch unread count only - ALWAYS FRESH
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.unread_count);
        console.log("✅ Unread count refreshed:", response.unread_count);
      }
    } catch (err) {
      // Silently fail for unread count - don't spam console
      if (!err.message?.includes("timeout")) {
        console.error("Error fetching unread count:", err);
      }
      // Keep existing count on error
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await notificationAPI.markAsRead(notificationId);
      if (response.success) {
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId
              ? { ...notif, is_read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        console.log("✅ Notification marked as read:", notificationId);
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await notificationAPI.markAllAsRead();
      if (response.success) {
        setNotifications((prev) =>
          prev.map((notif) => ({
            ...notif,
            is_read: true,
            read_at: new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
        console.log("✅ All notifications marked as read");
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId) => {
      try {
        const response = await notificationAPI.delete(notificationId);
        if (response.success) {
          setNotifications((prev) =>
            prev.filter((notif) => notif.id !== notificationId)
          );
          fetchUnreadCount(); // Refresh count
          console.log("✅ Notification deleted:", notificationId);
        }
      } catch (err) {
        console.error("Error deleting notification:", err);
      }
    },
    [fetchUnreadCount]
  );

  // 🔔 Listen for foreground messages
  useEffect(() => {
    let unsubscribe;

    const setupListener = async () => {
      try {
        const payload = await onMessageListener();
        if (payload) {
          console.log("🔔 Foreground message received:", payload);

          // Show browser notification
          if (Notification.permission === "granted") {
            new Notification(
              payload.notification?.title || "New Notification",
              {
                body: payload.notification?.body || "",
                icon: "/icon.png",
                badge: "/badge.png",
                tag: payload.data?.type || "default",
                requireInteraction: true,
                data: payload.data,
              }
            );
          }

          // 🚀 Immediately refresh notifications
          console.log("🔄 Auto-refreshing notifications after new message...");
          fetchNotifications();
          fetchUnreadCount();
        }
      } catch (err) {
        console.error("Error in message listener:", err);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [fetchNotifications, fetchUnreadCount]);

  // 🔄 Auto-refresh notifications every 15 seconds
  useEffect(() => {
    // Initial fetch
    initializeFCM();
    fetchNotifications();
    fetchUnreadCount();

    // Set up auto-refresh interval (15 seconds)
    const refreshInterval = setInterval(() => {
      console.log("🔄 Auto-refreshing notifications (15s interval)...");
      fetchUnreadCount(); // Only refresh count to be lightweight
    }, 15000);

    // Full refresh every 60 seconds
    const fullRefreshInterval = setInterval(() => {
      console.log("🔄 Full notification refresh (60s interval)...");
      fetchNotifications({ per_page: 20 });
    }, 60000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(fullRefreshInterval);
    };
  }, [initializeFCM, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fcmToken,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    initializeFCM,
  };
};

export default useNotifications;
