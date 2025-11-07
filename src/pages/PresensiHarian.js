"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar, Filter, Users, Clock, CheckCircle, XCircle, AlertTriangle,
  Eye, MapPin, Download, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  User, Building, Briefcase, Camera, FileText, ExternalLink, Check, X,
  UserCheck, UserX, AlertCircle as AlertCircleIcon, Home, Timer, Loader2
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { projectAPI, presensiHarianAPI } from "@/lib/api";
import { toast } from "react-toastify";
import exportPresensiHarian from "@/utils/exportFunctions/exportPresensiHarian";
import Swal from "sweetalert2";

const PresensiHarian = () => {
  // CRITICAL: Add initial load complete flag
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // State management
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState("masuk");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("nik");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  
  // Backend data
  const [attendanceData, setAttendanceData] = useState([]);
  const [projectInfo, setProjectInfo] = useState(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    masuk: { hadir: 0, terlambat: 0, izin: 0, alpa: 0, libur: 0 },
    pulang: { hadir: 0, lembur: 0, tidak_presensi_pulang: 0, pulang_cepat: 0, izin: 0, alpa: 0, libur: 0 }
  });
  const [loadingData, setLoadingData] = useState(false);

  const { loading, call } = useApi();

  // Status configurations
  const statusConfig = {
  hadir: { label: "Hadir", color: "bg-green-100 text-green-700", icon: CheckCircle },
  terlambat: { label: "Terlambat", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  izin: { label: "Izin", color: "bg-blue-100 text-blue-700", icon: FileText },
  alpa: { label: "Alpa", color: "bg-red-100 text-red-700", icon: XCircle },
  libur: { label: "Libur", color: "bg-purple-100 text-purple-700", icon: Home },
  lembur: { label: "Lembur", color: "bg-orange-100 text-orange-700", icon: Timer },
  lembur_pending: { label: "Lembur (Pending)", color: "bg-amber-100 text-amber-700", icon: Timer }, // ✅ NEW
  tidak_presensi_pulang: { label: "Tidak Presensi Pulang", color: "bg-red-100 text-red-700", icon: XCircle },
  pulang_cepat: { label: "Pulang Cepat", color: "bg-yellow-100 text-yellow-700", icon: Clock }
};

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch attendance data when project/date changes
  useEffect(() => {
    if (selectedProject && selectedDate) {
      fetchAttendanceData();
    }
  }, [selectedProject, selectedDate]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await call(projectAPI.getAll, { status: 'aktif', per_page: 1000 });
      if (response.success) {
        setProjects(response.data || []);
        // Mark initial load as complete after projects are loaded
        setInitialLoadComplete(true);
      }
    } catch (err) {
      console.error('Fetch projects error:', err);
      toast.error('Gagal memuat data project');
      setInitialLoadComplete(true);
    }
  }, [call]);

  const fetchAttendanceData = useCallback(async () => {
    setLoadingData(true);
    try {
      const response = await call(presensiHarianAPI.getRekapHarian, {
        project_id: selectedProject,
        tanggal: selectedDate
      });

      if (response.success) {
        setAttendanceData(response.data || []);
        setProjectInfo(response.project);
        setStatistics(response.statistik);
      }
    } catch (err) {
      console.error('Fetch attendance error:', err);
      toast.error('Gagal memuat data presensi');
      setAttendanceData([]);
    } finally {
      setLoadingData(false);
    }
  }, [selectedProject, selectedDate, call]);

  // Get current project info
  const currentProject = useMemo(
    () => projects.find(p => p.id === parseInt(selectedProject)),
    [selectedProject, projects]
  );

  // Filter data
  const filteredData = useMemo(() => {
    return attendanceData.filter(item =>
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.divisi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [attendanceData, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      return sortDirection === "asc" 
        ? (aValue > bValue ? 1 : -1)
        : (aValue < bValue ? 1 : -1);
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  // Handlers
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField]);

  const handleStatusChange = useCallback(async (item, newStatus) => {
  const presensiField = activeTab === "masuk" ? "presensi_masuk" : "presensi_pulang";
  const presensi = item[presensiField];
  
  if (!presensi) {
    toast.warning('Tidak ada data presensi untuk diubah');
    return;
  }

  const result = await Swal.fire({
    title: 'Konfirmasi Perubahan Status',
    html: `Ubah status presensi <b>${activeTab === "masuk" ? "masuk" : "pulang"}</b> karyawan <b>${item.nama}</b> menjadi <b>${statusConfig[newStatus]?.label}</b>?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#ea580c',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Ya, Ubah',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  try {
    const response = await call(presensiHarianAPI.updateStatus, presensi.id, {
      status: newStatus
    });

    if (response.success) {
      toast.success('Status presensi berhasil diubah');
      await fetchAttendanceData();
    }
  } catch (err) {
    console.error('Update status error:', err);
    toast.error(err.message || 'Gagal mengubah status presensi');
  }
}, [activeTab, call, fetchAttendanceData]);

  const openGoogleMaps = useCallback((lat, lng, locationName) => {
    if (lat && lng) {
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(url, '_blank');
    }
  }, []);

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    
    if (timeString.includes(':') && timeString.length <= 5) {
      return timeString;
    }
    
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return timeString;
    }
  };

  const handleExport = useCallback(async () => {
    if (!selectedProject || !selectedDate || attendanceData.length === 0) {
      toast.warning('Tidak ada data untuk diekspor');
      return;
    }

    try {
      await exportPresensiHarian({
        data: attendanceData,
        projectInfo: projectInfo,
        statistik: statistics,
        tanggal: selectedDate
      });

      toast.success('Data berhasil diekspor');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(err.message || 'Gagal mengekspor data');
    }
  }, [selectedDate, attendanceData, projectInfo, statistics]);

  // Get status for display
  const getDisplayStatus = useCallback((item) => {
    const presensiField = activeTab === "masuk" ? "presensi_masuk" : "presensi_pulang";
    const presensi = item[presensiField];
    
    if (!presensi) {
      return item.shift_code === 'L' ? 'libur' : 'alpa';
    }
    
    return presensi.status;
  }, [activeTab]);

  // CRITICAL: Show full loading skeleton until initial load is complete
  if (!initialLoadComplete) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="space-y-8">
                    <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
              <div className="flex gap-2">
                <div className="h-10 bg-gray-200 rounded w-32"></div>
                <div className="h-10 bg-gray-200 rounded w-40"></div>
              </div>
            </div>
          </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {[1,2,3,4,5,6,7,8].map(i => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

                    <div className="bg-white rounded-2xl shadow-sm">
            <div className="flex border-b border-gray-200">
              <div className="flex-1 px-6 py-4">
                <div className="h-6 bg-gray-200 rounded w-40"></div>
              </div>
              <div className="flex-1 px-6 py-4">
                <div className="h-6 bg-gray-200 rounded w-40"></div>
              </div>
            </div>
          </div>

                    <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 animate-pulse space-y-4">
              <div className="h-12 bg-gray-300 rounded"></div>
              {[1,2,3,4,5,6,7,8,9,10].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
              <div className="flex justify-between items-center pt-4">
                <div className="h-8 bg-gray-200 rounded w-32"></div>
                <div className="h-8 bg-gray-200 rounded w-64"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Presensi Harian</h1>
            <p className="text-gray-600">Rekap absensi karyawan berdasarkan project dan tanggal</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchAttendanceData}
              disabled={!selectedProject || !selectedDate || loadingData}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Loader2 className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={!selectedProject || !selectedDate || attendanceData.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>
      </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Pilih Project *
            </label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">-- Pilih Project --</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.nama}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Pilih Tanggal *
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Cari Karyawan
            </label>
            <input
              type="text"
              placeholder="Cari berdasarkan nama, NIK..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

            {projectInfo && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Building className="w-5 h-5 text-orange-600" />
            Detail Project & Statistik Presensi {activeTab === "masuk" ? "Masuk" : "Pulang"}
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">Nama Project</span>
                  </div>
                  <p className="font-semibold text-gray-900">{projectInfo.nama}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">Lokasi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 flex-1">{projectInfo.lokasi?.nama || '-'}</p>
                    {projectInfo.lokasi?.latitude && projectInfo.lokasi?.longitude && (
                      <button
                        onClick={() => openGoogleMaps(projectInfo.lokasi.latitude, projectInfo.lokasi.longitude, projectInfo.lokasi.nama)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Lihat di Google Maps"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">Total Karyawan</span>
                  </div>
                  <p className="font-semibold text-gray-900">{projectInfo.total_karyawan} orang</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">Tanggal</span>
                  </div>
                  <p className="font-semibold text-gray-900">{new Date(selectedDate).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                </div>
              </div>
            </div>

                        <div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-slate-700">{statistics.total}</div>
                  <div className="text-xs text-slate-600 mt-1">Total</div>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 border border-emerald-300 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-700">
                    {activeTab === "masuk" ? statistics.masuk.hadir : statistics.pulang.hadir}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">Hadir</div>
                </div>
                
                {activeTab === "masuk" ? (
                  <div className="bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-700">{statistics.masuk.terlambat}</div>
                    <div className="text-xs text-amber-600 mt-1">Terlambat</div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-rose-100 to-rose-200 border border-rose-300 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-rose-700">{statistics.pulang.tidak_presensi_pulang}</div>
                    <div className="text-xs text-rose-600 mt-1">Tidak Presensi Pulang</div>
                  </div>
                )}
                
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {activeTab === "masuk" ? statistics.masuk.izin : statistics.pulang.izin}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">Izin</div>
                </div>
                
                <div className="bg-gradient-to-br from-red-100 to-red-200 border border-red-300 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">
                    {activeTab === "masuk" ? statistics.masuk.alpa : statistics.pulang.alpa}
                  </div>
                  <div className="text-xs text-red-600 mt-1">Alpa</div>
                </div>
                
                <div className="bg-gradient-to-br from-violet-100 to-violet-200 border border-violet-300 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-violet-700">
                    {activeTab === "masuk" ? statistics.masuk.libur : statistics.pulang.libur}
                  </div>
                  <div className="text-xs text-violet-600 mt-1">Libur</div>
                </div>
                
                {activeTab === "pulang" && (
  <>
    <div className="bg-gradient-to-br from-orange-100 to-orange-200 border border-orange-300 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-orange-700">{statistics.pulang.lembur}</div>
      <div className="text-xs text-orange-600 mt-1">Lembur</div>
    </div>

        <div className="bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-amber-700">{statistics.pulang.lembur_pending || 0}</div>
      <div className="text-xs text-amber-600 mt-1">Lembur Pending</div>
    </div>

    <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 border border-yellow-300 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-yellow-700">{statistics.pulang.pulang_cepat}</div>
      <div className="text-xs text-yellow-600 mt-1">Pulang Cepat</div>
    </div>
  </>
)}
              </div>
            </div>
          </div>
        </div>
      )}

            <div className="bg-white rounded-2xl shadow-sm mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("masuk")}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === "masuk"
                ? "text-orange-600 border-b-2 border-orange-600 bg-orange-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <UserCheck className="w-5 h-5 inline mr-2" />
            Presensi Masuk
          </button>
          <button
            onClick={() => setActiveTab("pulang")}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === "pulang"
                ? "text-orange-600 border-b-2 border-orange-600 bg-orange-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <UserX className="w-5 h-5 inline mr-2" />
            Presensi Pulang
          </button>
        </div>
      </div>

            {selectedProject && selectedDate ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b flex justify-between items-center text-sm text-gray-600">
            <div className="flex items-center gap-2">
              Tampilkan
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              entri
            </div>
            <div>
              Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedData.length)} dari {sortedData.length} data
            </div>
          </div>

                    <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <tr>
                  {[
                    { key: "nik", label: "NIK" },
                    { key: "nama", label: "Nama" },
                    { key: "divisi", label: "Penempatan" },
                    { key: "jabatan", label: "Jabatan" },
                    { key: "shift", label: "Shift" }
                  ].map(col => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left cursor-pointer hover:bg-orange-600 transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <div className="flex flex-col">
                          <ChevronUp className={`w-3 h-3 ${sortField === col.key && sortDirection === "asc" ? "text-white" : "text-orange-200"}`} />
                          <ChevronDown className={`w-3 h-3 -mt-1 ${sortField === col.key && sortDirection === "desc" ? "text-white" : "text-orange-200"}`} />
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left">Foto</th>
                  <th className="px-4 py-3 text-left">Lokasi</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Keterangan</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, idx) => {
                    const presensiField = activeTab === "masuk" ? "presensi_masuk" : "presensi_pulang";
                    const presensi = item[presensiField];
                    const currentStatus = getDisplayStatus(item);
                    const statusInfo = statusConfig[currentStatus] || statusConfig.alpa;
                    
                    return (
                      <tr key={item.id} className={`border-b border-gray-100 hover:bg-orange-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="px-4 py-3 font-medium">{item.nik}</td>
                        <td className="px-4 py-3 font-medium">{item.nama}</td>
                        <td className="px-4 py-3">{item.divisi}</td>
                        <td className="px-4 py-3">{item.jabatan}</td>
                        <td className="px-4 py-3">{item.shift}</td>
                        <td className="px-4 py-3">
                          {presensi?.foto ? (
                            <img 
                              src={presensi.foto} 
                              alt="Foto presensi" 
                              className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:scale-110 transition-transform"
                              onClick={() => window.open(presensi.foto, '_blank')}
                              title="Klik untuk melihat foto"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Camera className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {presensi?.latitude && presensi?.longitude ? (
                            <button
                              onClick={() => openGoogleMaps(presensi.latitude, presensi.longitude, presensi.lokasi_nama)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              title="Lihat di Google Maps"
                            >
                              <MapPin className="w-4 h-4" />
                              {presensi.lokasi_nama}
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select
  value={currentStatus}
  onChange={(e) => handleStatusChange(item, e.target.value)}
  disabled={!presensi}
  className={`text-xs font-medium px-3 py-1 rounded-full border-0 focus:ring-2 focus:ring-orange-500 ${statusInfo.color} disabled:opacity-50 disabled:cursor-not-allowed`}
>
  <option value="hadir">Hadir</option>
  {activeTab === "masuk" && <option value="terlambat">Terlambat</option>}
  <option value="izin">Izin</option>
  <option value="alpa">Alpa</option>
  <option value="libur">Libur</option>
  {activeTab === "pulang" && (
    <>
      <option value="lembur">Lembur</option>
      <option value="lembur_pending">Lembur (Pending)</option>       <option value="tidak_presensi_pulang">Tidak Presensi Pulang</option>
      <option value="pulang_cepat">Pulang Cepat</option>
    </>
  )}
</select>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate" title={presensi?.keterangan || '-'}>
                          {presensi?.keterangan || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedAttendance(item);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Calendar className="w-12 h-12 text-gray-300" />
                        <div>
                          <p className="text-gray-700 font-medium mb-1">
                            {searchTerm ? 'Tidak ada data yang sesuai dengan pencarian' : 'Tidak ada data presensi'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {searchTerm 
                              ? 'Coba gunakan kata kunci pencarian yang berbeda' 
                              : 'Belum ada karyawan yang melakukan presensi untuk tanggal ini'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6 px-6 pb-6">
  <div className="text-sm text-gray-600">
    Menampilkan {Math.min(startIndex + 1, sortedData.length)}–
    {Math.min(startIndex + itemsPerPage, sortedData.length)} dari {sortedData.length} data
  </div>

  <div className="flex items-center gap-1">
        <button
      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ChevronLeft className="w-4 h-4" />
    </button>

        {(() => {
      const buttons = [];
      const maxVisible = 3;

      // Tentukan rentang halaman
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages, currentPage + 1);

      // Pastikan tetap 3 jika bisa
      if (currentPage === 1) end = Math.min(totalPages, start + 2);
      if (currentPage === totalPages) start = Math.max(1, totalPages - 2);

      // Halaman pertama
      if (start > 1) {
        buttons.push(
          <button
            key="page-1"
            onClick={() => setCurrentPage(1)}
            className={`px-3 py-1 rounded-lg border transition-colors ${
              currentPage === 1
                ? "bg-orange-600 text-white border-orange-600"
                : "hover:bg-gray-100 border-gray-200"
            }`}
          >
            1
          </button>
        );
        if (start > 2) buttons.push(<span key="start-ellipsis" className="px-2">...</span>);
      }

      // Halaman tengah
      for (let i = start; i <= end; i++) {
        buttons.push(
          <button
            key={`page-${i}`}
            onClick={() => setCurrentPage(i)}
            className={`px-3 py-1 rounded-lg border transition-colors ${
              currentPage === i
                ? "bg-orange-600 text-white border-orange-600"
                : "hover:bg-gray-100 border-gray-200"
            }`}
          >
            {i}
          </button>
        );
      }

      // Halaman terakhir
      if (end < totalPages) {
        if (end < totalPages - 1) buttons.push(<span key="end-ellipsis" className="px-2">...</span>);
        buttons.push(
          <button
            key={`page-${totalPages}`}
            onClick={() => setCurrentPage(totalPages)}
            className={`px-3 py-1 rounded-lg border transition-colors ${
              currentPage === totalPages
                ? "bg-orange-600 text-white border-orange-600"
                : "hover:bg-gray-100 border-gray-200"
            }`}
          >
            {totalPages}
          </button>
        );
      }

      return buttons;
    })()}

        <button
      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages}
      className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
</div>

        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Pilih Project dan Tanggal</h3>
          <p className="text-gray-600">Silakan pilih project dan tanggal untuk melihat data presensi harian</p>
        </div>
      )}

            {showDetailModal && selectedAttendance && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Detail Presensi {activeTab === "masuk" ? "Masuk" : "Pulang"}</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-600" />
                    Identitas Karyawan
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500">NIK:</span>
                      <p className="font-medium">{selectedAttendance.nik}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Nama:</span>
                      <p className="font-medium">{selectedAttendance.nama}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Penempatan:</span>
                      <p className="font-medium">{selectedAttendance.divisi}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Jabatan:</span>
                      <p className="font-medium">{selectedAttendance.jabatan}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Shift:</span>
                      <p className="font-medium">{selectedAttendance.shift}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Detail Presensi
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500">Tanggal:</span>
                      <p className="font-medium">{new Date(selectedDate).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Waktu {activeTab === "masuk" ? "Masuk" : "Pulang"}:</span>
                      <p className="font-medium">
                        {activeTab === "masuk" 
                          ? (selectedAttendance.presensi_masuk?.waktu || "-")
                          : (selectedAttendance.presensi_pulang?.waktu || "-")
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Status:</span>
                      <div className="mt-1">
                        {(() => {
                          const currentStatus = getDisplayStatus(selectedAttendance);
                          const statusInfo = statusConfig[currentStatus] || statusConfig.alpa;
                          const StatusIcon = statusInfo.icon;
                          
                          return (
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              <StatusIcon className="w-4 h-4" />
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Keterangan:</span>
                      <p className="font-medium">
                        {activeTab === "masuk" 
                          ? (selectedAttendance.presensi_masuk?.keterangan || "-")
                          : (selectedAttendance.presensi_pulang?.keterangan || "-")
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {(() => {
                const presensi = activeTab === "masuk" ? selectedAttendance.presensi_masuk : selectedAttendance.presensi_pulang;
                if (presensi?.latitude && presensi?.longitude) {
                  return (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-orange-600" />
                        Informasi Lokasi
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Nama Lokasi:</span>
                          <p className="font-medium">{presensi.lokasi_nama || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Koordinat:</span>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{presensi.latitude}, {presensi.longitude}</p>
                            <button
                              onClick={() => openGoogleMaps(presensi.latitude, presensi.longitude, presensi.lokasi_nama)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Buka Maps
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {(() => {
                const presensi = activeTab === "masuk" ? selectedAttendance.presensi_masuk : selectedAttendance.presensi_pulang;
                if (presensi?.foto) {
                  return (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-orange-600" />
                        Foto Presensi
                      </h3>
                      <div className="flex justify-center">
                        <img 
                          src={presensi.foto} 
                          alt="Foto presensi" 
                          className="max-w-md max-h-64 object-contain rounded-lg border border-gray-200 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(presensi.foto, '_blank')}
                          title="Klik untuk melihat ukuran penuh"
                        />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresensiHarian;