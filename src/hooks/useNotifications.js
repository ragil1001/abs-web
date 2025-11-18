"use client";
import { useState, useEffect, useCallback } from "react";
import { notificationAPI } from "@/lib/api";
import {
  requestNotificationPermission,
  getFCMToken,
  onMessageListener,
  isMessagingSupported,
} from "@/lib/firebase";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);

  const initializeFCM = useCallback(async () => {
    try {
      // Check if Firebase Messaging is supported
      if (!isMessagingSupported()) {
        return;
      }

      const hasPermission = await requestNotificationPermission();

      if (hasPermission) {
        const token = await getFCMToken();
        if (token) {
          setFcmToken(token);

          // Store token in backend
          try {
            await notificationAPI.storeFCMToken({
              token,
              device_name: navigator.userAgent,
            });
            console.log("FCM token stored successfully");
          } catch (err) {
            console.error("Error storing FCM token:", err);
          }
        }
      }
    } catch (err) {
      console.error("Error initializing FCM:", err);
    }
  }, []);

  const fetchNotifications = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await notificationAPI.getAll({
        ...params,
        _t: Date.now(),
      });

      if (response.success) {
        setNotifications(response.data);
        setUnreadCount(response.unread_count);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.unread_count);
      }
    } catch (err) {
      if (!err.message?.includes("timeout")) {
        console.error("Error fetching unread count:", err);
      }
    }
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await notificationAPI.markAsRead(notificationId);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId
              ? { ...notif, is_read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }, []);

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
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  }, []);

  const deleteNotification = useCallback(
    async (notificationId) => {
      try {
        const response = await notificationAPI.delete(notificationId);
        if (response.success) {
          setNotifications((prev) =>
            prev.filter((notif) => notif.id !== notificationId)
          );
          fetchUnreadCount();
        }
      } catch (err) {
        console.error("Error deleting notification:", err);
      }
    },
    [fetchUnreadCount]
  );

  // Setup message listener only if messaging is supported
  useEffect(() => {
    if (!isMessagingSupported()) {
      console.log("Skipping message listener setup - messaging not supported");
      return;
    }

    let isActive = true;

    const setupListener = async () => {
      try {
        while (isActive) {
          const payload = await onMessageListener();

          if (!isActive) break;

          if (payload) {
            // Show browser notification if permission granted
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

            // Refresh notifications
            fetchNotifications();
            fetchUnreadCount();
          }
        }
      } catch (err) {
        console.error("Error in message listener:", err);
      }
    };

    setupListener();

    return () => {
      isActive = false;
    };
  }, [fetchNotifications, fetchUnreadCount]);

  // Initialize on mount
  useEffect(() => {
    // Initialize FCM (will gracefully fail if not supported)
    initializeFCM();

    // Always fetch notifications (works without FCM)
    fetchNotifications();
    fetchUnreadCount();

    // Refresh unread count periodically
    const refreshInterval = setInterval(() => {
      fetchUnreadCount();
    }, 15000);

    // Full refresh periodically
    const fullRefreshInterval = setInterval(() => {
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
    isMessagingSupported: isMessagingSupported(),
  };
};

export default useNotifications;
