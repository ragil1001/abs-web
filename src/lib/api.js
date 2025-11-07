// src/lib/api.js
import api from "./axios";

// 🚀 Helper to add cache buster to params
const addCacheBuster = (params = {}) => {
  return {
    ...params,
    _t: Date.now(),
  };
};

// Auth API
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post("/admin/login", credentials);
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/logout");
    return response.data;
  },

  me: async () => {
    const response = await api.get("/me", { params: addCacheBuster() });
    return response.data;
  },
};

// Master Data APIs
export const divisiAPI = {
  getAll: async (params = {}) => {
    const response = await api.get("/divisis", {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/divisis/${id}`, {
      params: addCacheBuster(),
    });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/divisis", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/divisis/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/divisis/${id}`);
    return response.data;
  },

  import: async (formData) => {
    const response = await api.post("/divisis/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  export: async () => {
    const response = await api.get("/divisis/export", {
      responseType: "blob",
    });
    return response;
  },
};

export const jabatanAPI = {
  getAll: async (params = {}) => {
    const response = await api.get("/jabatans", {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getAllSimple: async () => {
    const response = await api.get("/jabatans/all", {
      params: addCacheBuster(),
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/jabatans/${id}`, {
      params: addCacheBuster(),
    });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/jabatans", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/jabatans/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/jabatans/${id}`);
    return response.data;
  },

  import: async (formData) => {
    const response = await api.post("/jabatans/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  export: async () => {
    const response = await api.get("/jabatans/export", {
      responseType: "blob",
    });
    return response;
  },
};

export const karyawanAPI = {
  getAll: async (params = {}) => {
    const response = await api.get("/karyawans", {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/karyawans/${id}`, {
      params: addCacheBuster(),
    });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/karyawans", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/karyawans/${id}`, data);
    return response.data;
  },

  resetPassword: async (id) => {
    const response = await api.patch(`/karyawans/${id}/reset-password`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/karyawans/${id}`);
    return response.data;
  },

  validateImport: async (formData) => {
    const response = await api.post("/karyawans/validate-import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000,
    });
    return response.data;
  },

  import: async (formData) => {
    const response = await api.post("/karyawans/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000,
    });
    return response.data;
  },

  getImportProgress: async (data) => {
    const response = await api.post("/karyawans/import-progress", data);
    return response.data;
  },

  checkImportStatus: async (data) => {
    const response = await api.post("/karyawans/import-status", data);
    return response.data;
  },

  export: async () => {
    const response = await api.get("/karyawans/export", {
      responseType: "blob",
      timeout: 60000,
    });
    return response;
  },
};

export const projectAPI = {
  getAll: async (params = {}) => {
    const response = await api.get("/projects", {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/projects/${id}`, {
      params: addCacheBuster(),
    });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/projects", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  export: async () => {
    const response = await api.get("/projects/export", {
      responseType: "blob",
      timeout: 60000,
    });
    return response;
  },

  getShifts: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/shifts`, {
      params: addCacheBuster(),
    });
    return response.data;
  },
};

export const shiftProjectAPI = {
  getAll: async (params = {}) => {
    const response = await api.get("/shift-projects", {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/shift-projects/${id}`, {
      params: addCacheBuster(),
    });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/shift-projects", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/shift-projects/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/shift-projects/${id}`);
    return response.data;
  },
};

export const karyawanProjectAPI = {
  getAll: async (params = {}) => {
    const response = await api.get("/karyawan-projects", {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getByProject: async (projectId, params = {}) => {
    const response = await api.get(`/karyawan-projects/project/${projectId}`, {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getAvailableKaryawan: async (params = {}) => {
    const response = await api.get("/karyawan-projects/available", {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  assignKaryawan: async (data) => {
    const response = await api.post("/karyawan-projects", data);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/karyawan-projects/${id}`, {
      params: addCacheBuster(),
    });
    return response.data;
  },

  deactivate: async (id, data) => {
    const response = await api.patch(
      `/karyawan-projects/${id}/deactivate`,
      data
    );
    return response.data;
  },

  reactivate: async (id) => {
    const response = await api.patch(`/karyawan-projects/${id}/reactivate`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/karyawan-projects/${id}`);
    return response.data;
  },

  export: async (projectId) => {
    const response = await api.get(
      `/karyawan-projects/project/${projectId}/export`,
      {
        responseType: "blob",
        timeout: 60000,
      }
    );
    return response;
  },

  import: async (projectId, formData) => {
    const response = await api.post(
      `/karyawan-projects/project/${projectId}/import`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000,
      }
    );
    return response.data;
  },
};

export const jadwalKaryawanAPI = {
  getByProject: async (projectId, params = {}) => {
    const response = await api.get(`/jadwal-karyawan/project/${projectId}`, {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  import: async (projectId, formData) => {
    const response = await api.post(
      `/jadwal-karyawan/project/${projectId}/import`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000,
      }
    );
    return response.data;
  },

  export: async (projectId, params = {}) => {
    const response = await api.get(
      `/jadwal-karyawan/project/${projectId}/export`,
      {
        params,
        responseType: "blob",
        timeout: 60000,
      }
    );
    return response;
  },

  deleteByPeriode: async (projectId, data) => {
    const response = await api.delete(
      `/jadwal-karyawan/project/${projectId}/periode`,
      { data }
    );
    return response.data;
  },

  getSummary: async (projectId, params = {}) => {
    const response = await api.get(
      `/jadwal-karyawan/project/${projectId}/summary`,
      { params: addCacheBuster(params) }
    );
    return response.data;
  },
};

export const pengajuanIzinAPI = {
  getByProject: async (projectId, params = {}) => {
    const response = await api.get(`/pengajuan-izin/project/${projectId}`, {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/pengajuan-izin/${id}`, {
      params: addCacheBuster(),
    });
    return response.data;
  },

  prosesPengajuan: async (id, data) => {
    const response = await api.post(`/pengajuan-izin/${id}/proses`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/pengajuan-izin/${id}`);
    return response.data;
  },

  getSummary: async (projectId, params = {}) => {
    const response = await api.get(
      `/pengajuan-izin/project/${projectId}/summary`,
      { params: addCacheBuster(params) }
    );
    return response.data;
  },
};

export const presensiHarianAPI = {
  getRekapHarian: async (params) => {
    const response = await api.get("/presensi-harian", {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  updateStatus: async (presensiId, data) => {
    const response = await api.patch(
      `/presensi-harian/${presensiId}/status`,
      data
    );
    return response.data;
  },

  konfirmasiLembur: async (presensiId) => {
    const response = await api.post(
      `/presensi-harian/${presensiId}/konfirmasi-lembur`
    );
    return response.data;
  },
};

export const rekapBulananAPI = {
  getRekapBulanan: async (params) => {
    const response = await api.get("/rekap-bulanan", {
      params: addCacheBuster(params),
    });
    return response.data;
  },
};

export const tukarShiftAPI = {
  getByProject: async (projectId, params = {}) => {
    const response = await api.get(`/tukar-shift/project/${projectId}`, {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/tukar-shift/${id}`, {
      params: addCacheBuster(),
    });
    return response.data;
  },

  getSummary: async (projectId, params = {}) => {
    const response = await api.get(
      `/tukar-shift/project/${projectId}/summary`,
      { params: addCacheBuster(params) }
    );
    return response.data;
  },
};

export const notificationAPI = {
  getAll: async (params = {}) => {
    const response = await api.get("/notifications", {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get("/notifications/unread-count", {
      params: addCacheBuster(),
    });
    return response.data;
  },

  markAsRead: async (notificationId) => {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.post("/notifications/read-all");
    return response.data;
  },

  delete: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  storeFCMToken: async (data) => {
    const response = await api.post("/notifications/fcm-token", data);
    return response.data;
  },

  deleteFCMToken: async (token) => {
    const response = await api.delete("/notifications/fcm-token", {
      data: { token },
    });
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getData: async (params = {}) => {
    const response = await api.get("/dashboard/data", {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  clearCache: async () => {
    const response = await api.post("/dashboard/clear-cache");
    return response.data;
  },
};

export const pengajuanLemburAPI = {
  getByProject: async (projectId, params = {}) => {
    const response = await api.get(`/pengajuan-lembur/project/${projectId}`, {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/pengajuan-lembur/${id}`, {
      params: addCacheBuster(),
    });
    return response.data;
  },

  prosesPengajuan: async (id, data) => {
    const response = await api.post(`/pengajuan-lembur/${id}/proses`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/pengajuan-lembur/${id}`);
    return response.data;
  },

  getSummary: async (projectId, params = {}) => {
    const response = await api.get(
      `/pengajuan-lembur/project/${projectId}/summary`,
      { params: addCacheBuster(params) }
    );
    return response.data;
  },
};

export const informasiAPI = {
  getAll: async (params = {}) => {
    const response = await api.get("/informasi", {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/informasi/${id}`, {
      params: addCacheBuster(),
    });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/informasi", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  update: async (id, data) => {
    // Gunakan POST dengan _method untuk support FormData
    const response = await api.post(`/informasi/${id}`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  send: async (id) => {
    const response = await api.post(`/informasi/${id}/send`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/informasi/${id}`);
    return response.data;
  },

  getPenerima: async (id, params = {}) => {
    const response = await api.get(`/informasi/${id}/penerima`, {
      params: addCacheBuster(params),
    });
    return response.data;
  },

  getTargetOptions: async (type) => {
    const response = await api.get("/informasi/target-options", {
      params: addCacheBuster({ type }),
    });
    return response.data;
  },
};
