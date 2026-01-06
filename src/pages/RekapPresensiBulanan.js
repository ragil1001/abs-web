"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Filter,
  Users,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building,
  Briefcase,
  MapPin,
  ExternalLink,
  RefreshCw,
  UserCheck,
  X,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { projectAPI, rekapBulananAPI } from "@/lib/api";
import { dateHelpers } from "@/utils/helpers";
import { toast } from "react-toastify";
import exportRekapBulanan from "@/utils/exportFunctions/exportRekapBulanan";
import exportRekapPerKaryawan from "@/utils/exportFunctions/exportRekapPerKaryawan";

const RekapPresensiBulanan = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("nik");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [rekapData, setRekapData] = useState([]);
  const [projectInfo, setProjectInfo] = useState(null);
  const [daysInMonth, setDaysInMonth] = useState([]);

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedKaryawanIds, setSelectedKaryawanIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState("");

  const { loading, call } = useApi();

  const statusConfig = {
    H: {
      label: "Hadir",
      color: "bg-green-100 text-green-700",
      fullName: "Hadir",
    },
    T: {
      label: "Terlambat",
      color: "bg-yellow-100 text-yellow-700",
      fullName: "Terlambat",
    },
    S: {
      label: "Sakit",
      color: "bg-pink-100 text-pink-700",
      fullName: "Sakit",
    },
    I: { label: "Izin", color: "bg-blue-100 text-blue-700", fullName: "Izin" },
    CT: {
      label: "Cuti Tahunan",
      color: "bg-indigo-100 text-indigo-700",
      fullName: "Cuti Tahunan",
    },
    IK: {
      label: "Izin Khusus",
      color: "bg-cyan-100 text-cyan-700",
      fullName: "Izin Khusus",
    },
    A: { label: "Alpa", color: "bg-red-100 text-red-700", fullName: "Alpa" },
    L: {
      label: "Libur",
      color: "bg-purple-100 text-purple-700",
      fullName: "Libur",
    },
    LB: {
      label: "Lembur",
      color: "bg-orange-100 text-orange-700",
      fullName: "Lembur (Dikonfirmasi)",
    },
    "LB*": {
      label: "Lembur*",
      color: "bg-amber-100 text-amber-700",
      fullName: "Lembur Pending",
    },
    TPP: {
      label: "Tidak Presensi Pulang",
      color: "bg-red-100 text-red-700",
      fullName: "Tidak Presensi Pulang",
    },
    PC: {
      label: "Pulang Cepat",
      color: "bg-yellow-100 text-yellow-700",
      fullName: "Pulang Cepat",
    },
  };

  const currentProject = useMemo(
    () => projects.find((p) => p.id === parseInt(selectedProject)),
    [selectedProject, projects]
  );

  const periodOptions = useMemo(() => {
    if (!currentProject) return [];

    const projectStart = new Date(currentProject.tanggal_mulai);
    const today = new Date();
    const periods = [];
    let currentDate = new Date(projectStart);
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3);

    while (currentDate <= endDate) {
      const periodStart = new Date(currentDate);
      const periodEnd = new Date(currentDate);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(periodEnd.getDate() - 1);

      const startMonth = periodStart.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
      const endMonth = periodEnd.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });

      const label =
        startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;

      periods.push({
        value: dateHelpers.formatForAPI(periodStart),
        label,
        startDate: periodStart,
        endDate: periodEnd,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return periods;
  }, [currentProject]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (periodOptions.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periodOptions[0].value);
    }
  }, [periodOptions, selectedPeriod]);

  useEffect(() => {
    if (selectedProject && selectedPeriod) {
      fetchRekapData();
    }
  }, [selectedProject, selectedPeriod]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await call(projectAPI.getAll, {
        status: "aktif",
        per_page: 1000,
      });
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (err) {
      console.error("Fetch projects error:", err);
      toast.error("Gagal memuat data project");
    }
  }, [call]);

  const fetchRekapData = useCallback(async () => {
    try {
      const selectedPeriodObj = periodOptions.find(
        (p) => p.value === selectedPeriod
      );
      if (!selectedPeriodObj) return;

      const bulan = `${selectedPeriodObj.startDate.getFullYear()}-${(
        selectedPeriodObj.startDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}`;

      const response = await call(rekapBulananAPI.getRekapBulanan, {
        project_id: selectedProject,
        bulan: bulan,
      });

      if (response.success) {
        setRekapData(response.data || []);
        setProjectInfo(response.project);
        setDaysInMonth(response.days_in_month || []);
      }
    } catch (err) {
      console.error("Fetch rekap error:", err);
      toast.error("Gagal memuat data rekap");
      setRekapData([]);
    }
  }, [selectedProject, selectedPeriod, periodOptions, call]);

  const filteredEmployees = useMemo(() => {
    const filtered = rekapData.filter(
      (emp) =>
        emp.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.nik.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.divisi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      return sortDirection === "asc"
        ? aValue > bValue
          ? 1
          : -1
        : aValue < bValue
        ? 1
        : -1;
    });
  }, [rekapData, searchTerm, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField]
  );

  const openGoogleMaps = useCallback((lat, lng) => {
    if (lat && lng) {
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(url, "_blank");
    }
  }, []);

  const leftTableRef = React.useRef(null);
  const rightTableRef = React.useRef(null);

  useEffect(() => {
    const syncRowHeights = () => {
      const leftRows = leftTableRef.current?.querySelectorAll("tbody tr") || [];
      const rightRows =
        rightTableRef.current?.querySelectorAll("tbody tr") || [];

      leftRows.forEach((leftRow, i) => {
        const rightRow = rightRows[i];
        if (!rightRow) return;
        const maxHeight = Math.max(leftRow.offsetHeight, rightRow.offsetHeight);
        leftRow.style.height = `${maxHeight}px`;
        rightRow.style.height = `${maxHeight}px`;
      });
    };

    setTimeout(syncRowHeights, 100);

    window.addEventListener("resize", syncRowHeights);
    return () => window.removeEventListener("resize", syncRowHeights);
  }, [paginatedEmployees, daysInMonth]);

  const handleExport = useCallback(async () => {
    if (!selectedProject || !selectedPeriod || rekapData.length === 0) {
      toast.warning("Tidak ada data untuk diekspor");
      return;
    }

    try {
      const selectedPeriodObj = periodOptions.find(
        (p) => p.value === selectedPeriod
      );
      if (!selectedPeriodObj) return;

      const bulan = `${selectedPeriodObj.startDate.getFullYear()}-${(
        selectedPeriodObj.startDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}`;

      await exportRekapBulanan({
        data: rekapData,
        projectInfo: projectInfo,
        daysInMonth: daysInMonth,
        bulan: bulan,
      });

      toast.success("Data berhasil diekspor");
    } catch (err) {
      console.error("Export error:", err);
      toast.error(err.message || "Gagal mengekspor data");
    }
  }, [rekapData, projectInfo, daysInMonth, selectedPeriod, periodOptions]);

  const handleRefresh = useCallback(() => {
    fetchRekapData();
  }, [fetchRekapData]);

  const openExportModal = () => {
    if (!currentProject) {
      toast.warning("Pilih project terlebih dahulu");
      return;
    }

    // Set default dates to current period
    const selectedPeriodObj = periodOptions.find(
      (p) => p.value === selectedPeriod
    );
    if (selectedPeriodObj) {
      setExportStartDate(
        selectedPeriodObj.startDate.toISOString().slice(0, 10)
      );
      setExportEndDate(selectedPeriodObj.endDate.toISOString().slice(0, 10));
    }

    setSelectedKaryawanIds([]);
    setSelectAll(false);
    setModalSearchTerm("");
    setShowExportModal(true);
  };

  const closeExportModal = () => {
    setShowExportModal(false);
    setSelectedKaryawanIds([]);
    setSelectAll(false);
    setExportStartDate("");
    setExportEndDate("");
    setModalSearchTerm("");
  };

  const toggleKaryawan = (karyawanId) => {
    setSelectedKaryawanIds((prev) => {
      if (prev.includes(karyawanId)) {
        return prev.filter((id) => id !== karyawanId);
      } else {
        return [...prev, karyawanId];
      }
    });
  };
  const filteredModalData = useMemo(() => {
    if (!modalSearchTerm) return rekapData;

    const searchLower = modalSearchTerm.toLowerCase();
    return rekapData.filter(
      (emp) =>
        emp.nama.toLowerCase().includes(searchLower) ||
        emp.nik.toLowerCase().includes(searchLower) ||
        emp.divisi.toLowerCase().includes(searchLower) ||
        emp.jabatan.toLowerCase().includes(searchLower)
    );
  }, [rekapData, modalSearchTerm]);

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedKaryawanIds([]);
    } else {
      // Filter berdasarkan search term jika ada
      const filteredNiks = filteredModalData.map((emp) => emp.nik);
      setSelectedKaryawanIds(filteredNiks);
    }
    setSelectAll(!selectAll);
  };

  const handleExportPerKaryawan = async () => {
    if (selectedKaryawanIds.length === 0) {
      toast.warning("Pilih minimal 1 karyawan");
      return;
    }

    if (!exportStartDate || !exportEndDate) {
      toast.warning("Pilih tanggal mulai dan selesai");
      return;
    }

    setExportLoading(true);

    try {
      const response = await call(rekapBulananAPI.getRekapPerKaryawan, {
        project_id: selectedProject,
        karyawan_niks: selectedKaryawanIds,
        tanggal_mulai: exportStartDate,
        tanggal_selesai: exportEndDate,
      });

      if (response.success) {
        await exportRekapPerKaryawan({
          data: response.data,
          projectInfo: response.project,
          periode: response.periode,
        });

        toast.success("Export berhasil!");
        closeExportModal();
      }
    } catch (err) {
      console.error("Export per karyawan error:", err);
      toast.error(err.message || "Gagal mengekspor data");
    } finally {
      setExportLoading(false);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold">Rekap Presensi Bulanan</h1>
            <p className="text-sm text-gray-600">
              Laporan presensi karyawan per bulan berdasarkan project
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={!selectedProject || !selectedPeriod || loading}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={openExportModal}
              disabled={
                !selectedProject || !selectedPeriod || rekapData.length === 0
              }
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserCheck className="w-3.5 h-3.5" /> Export Per Karyawan
            </button>
            <button
              onClick={handleExport}
              disabled={
                !selectedProject || !selectedPeriod || rekapData.length === 0
              }
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <Filter className="w-3.5 h-3.5 inline mr-1" />
              Pilih Project *
            </label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setSelectedPeriod("");
                setCurrentPage(1);
              }}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">-- Pilih Project --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.nama}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Pilih Periode *
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!currentProject}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- Pilih Periode --</option>
              {periodOptions.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <Search className="w-3.5 h-3.5 inline mr-1" />
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
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Export Rekap Per Karyawan</h2>
              <button
                onClick={closeExportModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Mulai *
                  </label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Selesai *
                  </label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    min={exportStartDate}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Karyawan Selection */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Pilih Karyawan *
                  </label>
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    {selectAll ? "Hapus Semua" : "Pilih Semua"}
                  </button>
                </div>

                {/* Search Input */}
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari berdasarkan NIK, nama, jabatan, atau divisi..."
                      value={modalSearchTerm}
                      onChange={(e) => setModalSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {modalSearchTerm && (
                      <button
                        onClick={() => setModalSearchTerm("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto">
                  {filteredModalData.length > 0 ? (
                    <div className="divide-y">
                      {filteredModalData.map((emp) => (
                        <label
                          key={emp.nik}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedKaryawanIds.includes(emp.nik)}
                            onChange={() => toggleKaryawan(emp.nik)}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {emp.nama}
                            </div>
                            <div className="text-xs text-gray-500">
                              {emp.nik} • {emp.divisi} • {emp.jabatan}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="font-medium">
                        Tidak ada karyawan ditemukan
                      </p>
                      <p className="text-sm">
                        Coba gunakan kata kunci pencarian yang berbeda
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-2 text-sm text-gray-600">
                  {selectedKaryawanIds.length} dari {filteredModalData.length}{" "}
                  karyawan dipilih
                  {modalSearchTerm && ` (${rekapData.length} total karyawan)`}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={closeExportModal}
                disabled={exportLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleExportPerKaryawan}
                disabled={
                  exportLoading ||
                  selectedKaryawanIds.length === 0 ||
                  !exportStartDate ||
                  !exportEndDate
                }
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Mengekspor...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentProject && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Building className="w-4 h-4 text-orange-600" />
            Detail Project
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Briefcase className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-xs font-medium text-gray-600">
                  Nama Project
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {currentProject.nama}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-xs font-medium text-gray-600">
                  Lokasi
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 flex-1">
                  {currentProject.lokasi_nama || currentProject.lokasi?.nama}
                </p>
                <button
                  onClick={() =>
                    openGoogleMaps(
                      currentProject.lokasi_latitude ||
                        currentProject.lokasi?.latitude,
                      currentProject.lokasi_longitude ||
                        currentProject.lokasi?.longitude
                    )
                  }
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  title="Lihat di Google Maps"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-xs font-medium text-gray-600">
                  Tanggal Mulai
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(currentProject.tanggal_mulai).toLocaleDateString(
                  "id-ID",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Users className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-xs font-medium text-gray-600">
                  Total Karyawan
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {filteredEmployees.length} orang
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">Keterangan Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(statusConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${config.color}`}
              >
                {key}
              </span>
              <span className="text-xs text-gray-600">{config.fullName}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-600 space-y-1">
          <p>
            <strong>Catatan:</strong> Status dalam satu hari dapat berisi
            beberapa kode (misal: H, LB = Hadir dan Lembur)
          </p>
          <p>
            <strong>LB*</strong> = Lembur Pending (menunggu konfirmasi admin
            setelah upload SKL)
          </p>
          <p>
            <strong>LB</strong> = Lembur yang sudah dikonfirmasi
          </p>
        </div>
      </div>

      {selectedProject && selectedPeriod ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b flex justify-between items-center text-xs text-gray-600">
            <div className="flex items-center gap-2">
              Tampilkan
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              entri
            </div>
            <div>
              Menampilkan {startIndex + 1}-
              {Math.min(startIndex + itemsPerPage, filteredEmployees.length)}{" "}
              dari {filteredEmployees.length} data
            </div>
          </div>

          <div className="relative">
            <div className="flex">
              <div className="flex-shrink-0 border-r-2 border-gray-200">
                <table ref={leftTableRef} className="text-xs">
                  <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <tr>
                      <th
                        className="px-2 py-1.5 text-left font-semibold w-20 border-r border-orange-400"
                        rowSpan={2}
                        style={{ height: "72px" }}
                      >
                        <div
                          className="flex items-center gap-0.5 cursor-pointer"
                          onClick={() => handleSort("nik")}
                        >
                          NIK
                          <div className="flex flex-col">
                            <ChevronUp
                              className={`w-2.5 h-2.5 ${
                                sortField === "nik" && sortDirection === "asc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                            <ChevronDown
                              className={`w-2.5 h-2.5 -mt-0.5 ${
                                sortField === "nik" && sortDirection === "desc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                          </div>
                        </div>
                      </th>
                      <th
                        className="px-2 py-1.5 text-left font-semibold w-32 border-r border-orange-400"
                        rowSpan={2}
                      >
                        <div
                          className="flex items-center gap-0.5 cursor-pointer"
                          onClick={() => handleSort("nama")}
                        >
                          Nama
                          <div className="flex flex-col">
                            <ChevronUp
                              className={`w-2.5 h-2.5 ${
                                sortField === "nama" && sortDirection === "asc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                            <ChevronDown
                              className={`w-2.5 h-2.5 -mt-0.5 ${
                                sortField === "nama" && sortDirection === "desc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                          </div>
                        </div>
                      </th>
                      <th
                        className="px-2 py-1.5 text-left font-semibold w-24 border-r border-orange-400"
                        rowSpan={2}
                      >
                        <div
                          className="flex items-center gap-0.5 cursor-pointer"
                          onClick={() => handleSort("divisi")}
                        >
                          Penempatan
                          <div className="flex flex-col">
                            <ChevronUp
                              className={`w-2.5 h-2.5 ${
                                sortField === "divisi" &&
                                sortDirection === "asc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                            <ChevronDown
                              className={`w-2.5 h-2.5 -mt-0.5 ${
                                sortField === "divisi" &&
                                sortDirection === "desc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                          </div>
                        </div>
                      </th>
                      <th
                        className="px-2 py-1.5 text-left font-semibold w-28 border-r border-orange-400"
                        rowSpan={2}
                      >
                        <div
                          className="flex items-center gap-0.5 cursor-pointer"
                          onClick={() => handleSort("jabatan")}
                        >
                          Jabatan
                          <div className="flex flex-col">
                            <ChevronUp
                              className={`w-2.5 h-2.5 ${
                                sortField === "jabatan" &&
                                sortDirection === "asc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                            <ChevronDown
                              className={`w-2.5 h-2.5 -mt-0.5 ${
                                sortField === "jabatan" &&
                                sortDirection === "desc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                          </div>
                        </div>
                      </th>
                      <th
                        className="px-2 py-1.5 text-center font-semibold border-r border-orange-400"
                        colSpan={6}
                      >
                        Rekap
                      </th>
                    </tr>
                    <tr>
                      <th className="px-1.5 py-1.5 text-center font-semibold w-12 border-r border-orange-400 text-[10px]">
                        Hadir
                      </th>
                      <th className="px-1.5 py-1.5 text-center font-semibold w-12 border-r border-orange-400 text-[10px]">
                        Sakit
                      </th>
                      <th className="px-1.5 py-1.5 text-center font-semibold w-12 border-r border-orange-400 text-[10px]">
                        Izin
                      </th>
                      <th className="px-1.5 py-1.5 text-center font-semibold w-12 border-r border-orange-400 text-[10px]">
                        Cuti
                      </th>
                      <th className="px-1.5 py-1.5 text-center font-semibold w-12 border-r border-orange-400 text-[10px]">
                        Alpa
                      </th>
                      <th className="px-1.5 py-1.5 text-center font-semibold w-12 text-[10px]">
                        Libur
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEmployees.length > 0 ? (
                      paginatedEmployees.map((employee, idx) => (
                        <tr
                          key={employee.nik}
                          className={`border-b border-gray-100 ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="px-2 py-1.5 font-medium w-20 border-r border-gray-200">
                            {employee.nik}
                          </td>
                          <td className="px-2 py-1.5 font-medium w-32 border-r border-gray-200">
                            {employee.nama}
                          </td>
                          <td className="px-2 py-1.5 w-24 border-r border-gray-200">
                            {employee.divisi}
                          </td>
                          <td className="px-2 py-1.5 w-28 border-r border-gray-200">
                            {employee.jabatan}
                          </td>
                          <td className="px-1.5 py-1.5 text-center w-12 border-r border-gray-200">
                            <span className="text-[10px] font-semibold">
                              {employee.rekap.hadir || 0}
                            </span>
                          </td>
                          <td className="px-1.5 py-1.5 text-center w-12 border-r border-gray-200">
                            <span className="text-[10px] font-semibold">
                              {employee.rekap.sakit || 0}
                            </span>
                          </td>
                          <td className="px-1.5 py-1.5 text-center w-12 border-r border-gray-200">
                            <span className="text-[10px] font-semibold">
                              {employee.rekap.izin || 0}
                            </span>
                          </td>
                          <td className="px-1.5 py-1.5 text-center w-12 border-r border-gray-200">
                            <span className="text-[10px] font-semibold">
                              {employee.rekap.cuti || 0}
                            </span>
                          </td>
                          <td className="px-1.5 py-1.5 text-center w-12 border-r border-gray-200">
                            <span className="text-[10px] font-semibold">
                              {employee.rekap.alpa || 0}
                            </span>
                          </td>
                          <td className="px-1.5 py-1.5 text-center w-12">
                            <span className="text-[10px] font-semibold">
                              {employee.rekap.libur || 0}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Calendar className="w-10 h-10 text-gray-300" />
                            <div>
                              <p className="text-sm text-gray-700 font-medium mb-0.5">
                                {searchTerm
                                  ? "Tidak ada data yang sesuai dengan pencarian"
                                  : "Tidak ada data rekap"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {searchTerm
                                  ? "Coba gunakan kata kunci pencarian yang berbeda"
                                  : "Belum ada karyawan atau belum ada jadwal untuk periode ini"}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table ref={rightTableRef} className="text-xs min-w-full">
                  <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <tr>
                      <th
                        className="px-1.5 py-1.5 text-center font-semibold text-[10px]"
                        colSpan={daysInMonth.length}
                      >
                        {periodOptions.find((p) => p.value === selectedPeriod)
                          ?.label || ""}
                      </th>
                    </tr>
                    <tr>
                      {daysInMonth.map((day, idx) => (
                        <th
                          key={`date-${idx}`}
                          className={`px-1 py-1.5 text-center font-semibold min-w-[40px] border-l border-orange-400 ${
                            day.is_weekend ? "bg-red-600" : ""
                          }`}
                        >
                          <div className="text-[10px] font-bold">{day.day}</div>
                          <div className="text-[9px] font-normal opacity-75">
                            {
                              ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][
                                new Date(day.date).getDay()
                              ]
                            }
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEmployees.length > 0 ? (
                      paginatedEmployees.map((employee, rowIdx) => (
                        <tr
                          key={`right-${employee.nik}`}
                          className={`border-b border-gray-100 ${
                            rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          {daysInMonth.map((day, dayIdx) => {
                            const dayStatuses = employee.daily_data[
                              day.day
                            ] || ["-"];

                            return (
                              <td
                                key={`day-${dayIdx}`}
                                className={`px-0.5 py-1.5 text-center min-w-[40px] border-l border-gray-200 ${
                                  day.is_weekend ? "bg-red-50" : ""
                                }`}
                              >
                                <div className="inline-flex flex-row items-center justify-center gap-0.5">
                                  {dayStatuses.map((status, statusIdx) => (
                                    <span
                                      key={statusIdx}
                                      className={`px-1 py-0.5 text-[9px] font-semibold rounded whitespace-nowrap ${
                                        statusConfig[status]?.color ||
                                        "bg-gray-100 text-gray-700"
                                      }`}
                                      title={
                                        statusConfig[status]?.fullName || status
                                      }
                                    >
                                      {status}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={daysInMonth.length}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Tidak ada data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 border-t flex justify-between items-center text-xs">
            <div>
              Halaman {currentPage} dari {totalPages}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 disabled:opacity-50 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {totalPages > 0 &&
                (() => {
                  const startPage = Math.max(1, currentPage - 2);
                  const endPage = Math.min(totalPages, startPage + 4);
                  const pages = [];
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                  }
                  return pages.map((pageNum) => (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2.5 py-0.5 rounded transition-colors text-xs ${
                        currentPage === pageNum
                          ? "bg-orange-600 text-white"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ));
                })()}

              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 disabled:opacity-50 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1.5">
            Pilih Project dan Periode
          </h3>
          <p className="text-sm text-gray-600">
            Silakan pilih project dan periode untuk melihat rekap presensi
            bulanan
          </p>
        </div>
      )}
    </div>
  );
};

export default RekapPresensiBulanan;
