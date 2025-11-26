"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  List,
  ArrowRightLeft,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const NotificationDropdown = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setTimeout(() => setShowAllNotifications(false), 300);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleShowAllNotifications = async () => {
    setShowAllNotifications(true);
    await fetchNotifications({ per_page: 100 });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "izin_pending":
      case "izin_approved":
      case "izin_rejected":
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case "tukar_shift_pending":
      case "tukar_shift_approved":
      case "tukar_shift_rejected":
        return <ArrowRightLeft className="w-5 h-5 text-purple-500" />;
      case "lembur_new":
      case "lembur_approved":
      case "lembur_rejected":
        return <Clock className="w-5 h-5 text-orange-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Baru saja";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} menit lalu`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Close dropdown
    setIsOpen(false);
    setShowAllNotifications(false);

    const notifData = notification.data || {};
    const notifType = notification.type;

    // 🔥 PERBAIKAN UTAMA: Handle Web Admin Notifications
    if (notifType.startsWith("izin_")) {
      const pengajuanIzinId = notifData.pengajuan_izin_id;
      const projectId = notifData.project_id;
      const karyawanId = notifData.karyawan_id;
      const karyawanNama = notifData.karyawan_nama;
      const karyawanNik = notifData.karyawan_nik;
      const kategoriIzin = notifData.kategori_izin;

      let statusFilter = "all";
      if (notifType === "izin_pending") statusFilter = "pending";
      else if (notifType === "izin_approved") statusFilter = "disetujui";
      else if (notifType === "izin_rejected") statusFilter = "ditolak";

      // Dispatch navigation event untuk Web Admin
      const navigationEvent = new CustomEvent("navigateToDetail", {
        detail: {
          page: "pengajuan-izin",
          detailType: "izin",
          detailId: pengajuanIzinId,
          filters: {
            pengajuanIzinId,
            projectId,
            karyawanId,
            karyawanNama,
            karyawanNik,
            kategoriIzin,
            status: statusFilter,
            openDetail: true,
          },
        },
      });

      window.dispatchEvent(navigationEvent);
    }
    // 🔥 Handle LEMBUR Notifications
    else if (notifType.startsWith("lembur_")) {
      const pengajuanLemburId = notifData.pengajuan_lembur_id;
      const projectId = notifData.project_id;
      const karyawanId = notifData.karyawan_id;
      const karyawanNama = notifData.karyawan_nama;
      const karyawanNik = notifData.karyawan_nik;

      let statusFilter = "all";
      if (notifType === "lembur_new") statusFilter = "pending";

      // Dispatch navigation event untuk Web Admin
      const navigationEvent = new CustomEvent("navigateToDetail", {
        detail: {
          page: "pengajuan-lembur",
          detailType: "lembur",
          detailId: pengajuanLemburId,
          filters: {
            pengajuanLemburId,
            projectId,
            karyawanId,
            karyawanNama,
            karyawanNik,
            status: statusFilter,
            openDetail: true,
          },
        },
      });

      window.dispatchEvent(navigationEvent);
    }
    // 🔥 Handle TUKAR SHIFT Notifications
    else if (notifType.startsWith("tukar_shift_")) {
      const tukarShiftId = notifData.tukar_shift_id;
      const projectId = notifData.project_id;

      let statusFilter = "all";
      if (notifType === "tukar_shift_pending") statusFilter = "pending";
      else if (notifType === "tukar_shift_approved") statusFilter = "disetujui";
      else if (notifType === "tukar_shift_rejected") statusFilter = "ditolak";

      const navigationEvent = new CustomEvent("navigateToDetail", {
        detail: {
          page: "tukar-shift",
          detailType: "tukar-shift",
          detailId: tukarShiftId,
          filters: {
            tukarShiftId,
            projectId,
            status: statusFilter,
            openDetail: true,
          },
        },
      });

      window.dispatchEvent(navigationEvent);
    }
    // Fallback: jika ada click_action (untuk compatibility)
    else if (notifData.click_action) {
      // Jangan gunakan full URL, extract page info
      console.warn("Using deprecated click_action:", notifData.click_action);
    }
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const displayedNotifications = showAllNotifications
    ? notifications
    : notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-xl">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Notifikasi
              </h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500">
                  {unreadCount} belum dibaca
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                title="Tandai semua sebagai dibaca"
              >
                <CheckCheck className="w-4 h-4" />
                Tandai dibaca
              </button>
            )}
          </div>

          <div
            className="overflow-y-auto"
            style={{
              maxHeight: showAllNotifications ? "50vh" : "384px",
            }}
          >
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm">Memuat notifikasi...</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Tidak ada notifikasi</p>
              </div>
            ) : (
              displayedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.is_read ? "bg-orange-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4
                          className={`text-sm font-medium ${
                            !notification.is_read
                              ? "text-gray-900"
                              : "text-gray-700"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1"></span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {notification.body}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(notification.created_at)}
                        </div>

                        <button
                          onClick={(e) => handleDelete(e, notification.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl sticky bottom-0">
              {!showAllNotifications && notifications.length > 5 ? (
                <button
                  onClick={handleShowAllNotifications}
                  className="w-full text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center justify-center gap-2"
                >
                  <List className="w-4 h-4" />
                  Lihat semua notifikasi ({notifications.length})
                </button>
              ) : showAllNotifications ? (
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2">
                    Menampilkan {displayedNotifications.length} dari{" "}
                    {notifications.length} notifikasi
                  </p>
                  <button
                    onClick={() => setShowAllNotifications(false)}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Tampilkan lebih sedikit
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs text-gray-500">
                  Menampilkan semua notifikasi
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
