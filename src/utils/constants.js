export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Admin Presensi",
  TIMEOUT: 100000,
};

export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  LOGIN: "/",
  DATA_KARYAWAN: "/data-karyawan",
  DATA_JABATAN: "/data-jabatan",
  DATA_DIVISI: "/data-divisi",
  DATA_PROJECT: "/data-project",
  ASSIGN_KARYAWAN: "/assign",
  PRESENSI_HARIAN: "/harian",
  REKAP_BULANAN: "/bulanan",
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  AUTH_USER: "auth_user",
  SIDEBAR_COLLAPSED: "sidebarCollapsed",
  ACTIVE_MENU: "activeMenu",
  EXPANDED_MENU: "expandedMenu",
  CURRENT_PAGE: "currentPage",
};

export const API_STATUS = {
  SUCCESS: "success",
  ERROR: "error",
  LOADING: "loading",
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  DEFAULT_LIMITS: [10, 25, 50, 100],
};

export const DATE_FORMATS = {
  API_DATE: "YYYY-MM-DD",
  API_DATETIME: "YYYY-MM-DD HH:mm:ss",
  DISPLAY_DATE: "DD/MM/YYYY",
  DISPLAY_DATETIME: "DD/MM/YYYY HH:mm",
  DISPLAY_TIME: "HH:mm",
};

export const STATUS_TYPES = {
  AKTIF: "aktif",
  NONAKTIF: "nonaktif",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const EMPLOYEE_STATUS = {
  AKTIF: { value: "aktif", label: "Aktif", color: "green" },
  NONAKTIF: { value: "nonaktif", label: "Non-Aktif", color: "red" },
};

export const ATTENDANCE_TYPES = {
  HADIR: { value: "hadir", label: "Hadir", color: "green" },
  TERLAMBAT: { value: "terlambat", label: "Terlambat", color: "yellow" },
  IZIN: { value: "izin", label: "Izin", color: "blue" },
  SAKIT: { value: "sakit", label: "Sakit", color: "purple" },
  ALPHA: { value: "alpha", label: "Alpha", color: "red" },
};

export const GENDER_TYPES = {
  LAKI_LAKI: { value: "L", label: "Laki-laki" },
  PEREMPUAN: { value: "P", label: "Perempuan" },
};

export const SHIFT_TYPES = {
  PAGI: { value: "pagi", label: "Shift Pagi", time: "07:00-15:00" },
  SORE: { value: "sore", label: "Shift Sore", time: "15:00-23:00" },
  MALAM: { value: "malam", label: "Shift Malam", time: "23:00-07:00" },
};

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_USERNAME_LENGTH: 255,
  MAX_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 500,
  PHONE_REGEX: /^(\+62|62|0)8[1-9][0-9]{6,11}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PAGINATION: {
    DEFAULT_LIMITS: [10, 25, 50, 100],
  },
};

export const MESSAGE_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

export const MESSAGES = {
  LOGIN_SUCCESS: "Login berhasil",
  LOGIN_ERROR: "Username atau password salah",
  LOGOUT_SUCCESS: "Logout berhasil",
  SAVE_SUCCESS: "Data berhasil disimpan",
  UPDATE_SUCCESS: "Data berhasil diperbarui",
  DELETE_SUCCESS: "Data berhasil dihapus",
  DELETE_CONFIRM: "Apakah Anda yakin ingin menghapus data ini?",
  NETWORK_ERROR: "Koneksi ke server bermasalah. Silakan coba lagi.",
  SERVER_ERROR: "Terjadi kesalahan pada server. Silakan coba lagi.",
  VALIDATION_ERROR: "Data yang dimasukkan tidak valid.",
  UNAUTHORIZED: "Anda tidak memiliki akses untuk melakukan aksi ini.",
  NOT_FOUND: "Data tidak ditemukan.",
};

export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
};

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  "2XL": 1536,
};

export const KATEGORI_IZIN_TYPES = {
  SAKIT: { value: "sakit", label: "Sakit", kode: "S", color: "pink" },
  IZIN: { value: "izin", label: "Izin", kode: "I", color: "blue" },
  CUTI_TAHUNAN: {
    value: "cuti_tahunan",
    label: "Cuti Tahunan",
    kode: "CT",
    color: "indigo",
  },
  CUTI_KHUSUS: {
    value: "cuti_khusus",
    label: "Cuti Izin Khusus",
    kode: "IK",
    color: "cyan",
  },
};

export const SUB_KATEGORI_CUTI_KHUSUS = {
  PERNIKAHAN_KARYAWAN: {
    value: "pernikahan_karyawan",
    label: "Pernikahan Karyawan",
    durasi: 3,
  },
  PERNIKAHAN_ANAK: {
    value: "pernikahan_anak",
    label: "Pernikahan Putra/Putri",
    durasi: 2,
  },
  ISTRI_MELAHIRKAN: {
    value: "istri_melahirkan",
    label: "Istri Melahirkan/Keguguran",
    durasi: 2,
  },
  KEMATIAN_KELUARGA: {
    value: "kematian_keluarga",
    label: "Kematian Keluarga Inti",
    durasi: 2,
  },
  KEMATIAN_SERUMAH: {
    value: "kematian_serumah",
    label: "Kematian Orang Serumah",
    durasi: 1,
  },
  KHITANAN_BAPTIS: {
    value: "khitanan_baptis",
    label: "Khitanan/Baptisan Anak",
    durasi: 2,
  },
};
