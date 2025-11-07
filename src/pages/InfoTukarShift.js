"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Eye, Calendar, Filter, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, X, User, Clock,
  AlertCircle, ArrowRightLeft, Phone, Loader2
} from "lucide-react";

import { projectAPI, tukarShiftAPI } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { dateHelpers, timeHelpers } from "@/utils/helpers";
import { toast } from "react-toastify";

const InfoTukarShift = ({ navigationDetail = null }) => {
  const [tukarShifts, setTukarShifts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTukarShift, setSelectedTukarShift] = useState(null);
  const [processedNavigationId, setProcessedNavigationId] = useState(null);

  const { loading: apiLoading, call } = useApi();

  const currentProject = useMemo(
    () => selectedProject === "all" ? null : projects.find(p => p.id === parseInt(selectedProject)),
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
        year: "numeric" 
      });
      const endMonth = periodEnd.toLocaleDateString("id-ID", { 
        month: "long", 
        year: "numeric" 
      });

      const label = startMonth === endMonth
        ? startMonth
        : `${startMonth} - ${endMonth}`;

      periods.push({
        value: dateHelpers.formatForAPI(periodStart),
        label,
        startDate: periodStart,
        endDate: periodEnd
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return periods;
  }, [currentProject]);

  // ✅ Helper to format shift display
  const formatShiftDisplay = useCallback((jadwalShift) => {
    if (!jadwalShift) return '-';
    
    const { shift_code, waktu_mulai, waktu_selesai } = jadwalShift;
    
    // Format waktu jika ada
    if (waktu_mulai && waktu_selesai) {
      const timeRange = timeHelpers.formatShiftRange(waktu_mulai, waktu_selesai);
      return `${shift_code} (${timeRange})`;
    }
    
    return shift_code;
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await call(projectAPI.getAll);
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (err) {
      console.error('Fetch projects error:', err);
      toast.error('Gagal memuat data project');
    } finally {
      setInitialLoadComplete(true);
    }
  }, [call]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (initialLoadComplete && projects.length > 0) {
      fetchTukarShifts();
      if (selectedProject !== "all" && selectedPeriod) {
        fetchSummary();
      } else {
        setSummary(null);
      }
    }
  }, [selectedProject, selectedPeriod, currentPage, itemsPerPage, sortField, sortDirection, statusFilter, searchTerm, initialLoadComplete, projects.length]);

  useEffect(() => {
    if (currentProject && periodOptions.length > 0 && !selectedPeriod) {
      const today = new Date();
      
      const currentPeriod = periodOptions.find(period => {
        const periodStart = new Date(period.startDate);
        const periodEnd = new Date(period.endDate);
        return today >= periodStart && today <= periodEnd;
      });
      
      if (currentPeriod) {
        setSelectedPeriod(currentPeriod.value);
      } else if (periodOptions.length > 0) {
        setSelectedPeriod(periodOptions[0].value);
      }
    }
  }, [currentProject, periodOptions, selectedPeriod]);

  useEffect(() => {
    if (navigationDetail && 
        navigationDetail.type === 'tukar-shift' && 
        navigationDetail.id && 
        initialLoadComplete && 
        tukarShifts.length > 0 &&
        processedNavigationId !== navigationDetail.id) {
      
      console.log('🎯 Processing tukar shift navigation detail:', navigationDetail);
      
      const { filters } = navigationDetail;
      
      if (filters.projectId) {
        setSelectedProject(filters.projectId.toString());
      }
      if (filters.status) {
        setStatusFilter(filters.status);
      }
      
      setTimeout(async () => {
        const tukarShift = tukarShifts.find(ts => ts.id === navigationDetail.id);
        
        if (tukarShift) {
          console.log('✅ Found tukar shift, opening detail:', tukarShift);
          await handleViewDetail(tukarShift);
        } else {
          console.log('⚠️ Tukar shift not found in current list, fetching directly...');
          try {
            const result = await call(tukarShiftAPI.getById, navigationDetail.id);
            if (result.success) {
              setSelectedTukarShift(result.data);
              setShowDetailModal(true);
            }
          } catch (err) {
            console.error('Error fetching tukar shift detail:', err);
            toast.error('Gagal membuka detail tukar shift');
          }
        }
        
        setProcessedNavigationId(navigationDetail.id);
      }, 500);
    }
  }, [navigationDetail, initialLoadComplete, tukarShifts, processedNavigationId]);

  const fetchSummary = useCallback(async () => {
    if (!currentProject || !selectedPeriod) return;
    
    try {
      const period = periodOptions.find(p => p.value === selectedPeriod);
      if (!period) return;

      const result = await call(tukarShiftAPI.getSummary, currentProject.id, {
        start_date: dateHelpers.formatForAPI(period.startDate),
        end_date: dateHelpers.formatForAPI(period.endDate)
      });

      if (result.success) {
        setSummary(result.data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  }, [currentProject, selectedPeriod, periodOptions, call]);

  const fetchTukarShifts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (selectedProject === "all") {
        const allProjects = projects.filter(p => p.status === 'aktif');
        
        if (allProjects.length === 0) {
          setTukarShifts([]);
          setTotalItems(0);
          setTotalPages(1);
          setLoading(false);
          return;
        }

        let allData = [];
        
        const today = new Date();
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        
        const startDate = dateHelpers.formatForAPI(threeMonthsAgo);
        const endDate = dateHelpers.formatForAPI(today);

        for (const project of allProjects) {
          try {
            const params = {
              page: 1,
              per_page: 1000,
              start_date: startDate,
              end_date: endDate,
              sort_field: sortField,
              sort_direction: sortDirection
            };

            if (statusFilter !== "all") {
              params.status = statusFilter;
            }

            if (searchTerm.trim()) {
              params.search = searchTerm;
            }

            const projectResult = await call(tukarShiftAPI.getByProject, project.id, params);
            
            if (projectResult.success && projectResult.data && Array.isArray(projectResult.data)) {
              allData = [...allData, ...projectResult.data];
            }
          } catch (err) {
            console.error(`Error fetching from project ${project.id}:`, err);
          }
        }

        const total = allData.length;
        const pages = Math.ceil(total / itemsPerPage) || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginated = allData.slice(startIndex, endIndex);

        setTukarShifts(paginated);
        setTotalItems(total);
        setTotalPages(pages);
        
      } else {
        if (!selectedPeriod) {
          setTukarShifts([]);
          setTotalItems(0);
          setTotalPages(1);
          setLoading(false);
          return;
        }

        const period = periodOptions.find(p => p.value === selectedPeriod);
        if (!period) {
          setLoading(false);
          return;
        }

        const params = {
          page: currentPage,
          per_page: itemsPerPage,
          sort_field: sortField,
          sort_direction: sortDirection,
          start_date: dateHelpers.formatForAPI(period.startDate),
          end_date: dateHelpers.formatForAPI(period.endDate)
        };

        if (statusFilter !== "all") {
          params.status = statusFilter;
        }

        if (searchTerm.trim()) {
          params.search = searchTerm;
        }

        const result = await call(tukarShiftAPI.getByProject, currentProject.id, params);
        
        if (result.success) {
          setTukarShifts(result.data || []);
          setTotalItems(result.pagination?.total || 0);
          setTotalPages(result.pagination?.last_page || 1);
        }
      }
      
    } catch (err) {
      setError(err.message || 'Gagal memuat data tukar shift');
      console.error('Error fetching tukar shifts:', err);
      setTukarShifts([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, projects, selectedPeriod, periodOptions, currentPage, itemsPerPage, sortField, sortDirection, statusFilter, searchTerm, call, currentProject]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleViewDetail = async (tukarShift) => {
    try {
      const result = await call(tukarShiftAPI.getById, tukarShift.id);
      if (result.success) {
        setSelectedTukarShift(result.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      toast.error('Gagal memuat detail: ' + err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-700",
      disetujui: "bg-green-100 text-green-700",
      ditolak: "bg-red-100 text-red-700",
      dibatalkan: "bg-gray-100 text-gray-700"
    };
    const labels = {
      pending: "Pending",
      disetujui: "Disetujui",
      ditolak: "Ditolak",
      dibatalkan: "Dibatalkan"
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (!initialLoadComplete) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Info Tukar Shift</h1>
            <p className="text-gray-600">Informasi transaksi penukaran shift karyawan</p>
          </div>
          {summary && selectedProject !== "all" && (
            <div className="flex flex-wrap gap-2">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                <p className="text-sm font-medium text-yellow-800">Pending: {summary.pending}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <p className="text-sm font-medium text-green-800">Disetujui: {summary.disetujui}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <p className="text-sm font-medium text-red-800">Ditolak: {summary.ditolak}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                <p className="text-sm font-medium text-gray-800">Dibatalkan: {summary.dibatalkan}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Pilih Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setSelectedPeriod("");
                setCurrentPage(1);
                setSummary(null);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Semua Project</option>
              {projects.filter(p => p.status === 'aktif').map(project => (
                <option key={project.id} value={project.id}>{project.nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Pilih Periode
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!currentProject}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
            >
              <option value="">-- Pilih Periode --</option>
              {periodOptions.map(period => (
                <option key={period.value} value={period.value}>{period.label}</option>
              ))}
            </select>
            {selectedProject === "all" && (
              <p className="text-xs text-gray-500 mt-1">Menampilkan data 3 bulan terakhir dari semua project</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="disetujui">Disetujui</option>
              <option value="ditolak">Ditolak</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Cari Karyawan
            </label>
            <input
              type="text"
              placeholder="Cari NIK/Nama..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Tampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600">entri</span>
          </div>
          <div className="text-sm text-gray-600">
            Total: {totalItems} data
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-orange-500" />
              <p className="mt-2">Memuat data...</p>
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-red-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              <p>Error: {error}</p>
            </div>
          ) : selectedProject !== "all" && !selectedPeriod ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Silakan pilih periode untuk melihat data tukar shift</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <tr>
                  {[
                    { key: "peminta", label: "Peminta" },
                    { key: "target", label: "Target" },
                    { key: "tanggal_peminta", label: "Shift Peminta" },
                    { key: "tanggal_target", label: "Shift Target" },
                    { key: "status", label: "Status" },
                    { key: "created_at", label: "Diajukan" }
                  ].map(column => (
                    <th
                      key={column.key}
                      className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-orange-600 transition-colors"
                      onClick={() => handleSort(column.key)}
                    >
                      <div className="flex items-center gap-2">
                        {column.label}
                        <div className="flex flex-col">
                          <ChevronUp className={`w-3 h-3 ${sortField === column.key && sortDirection === "asc" ? "text-white" : "text-orange-300"}`} />
                          <ChevronDown className={`w-3 h-3 -mt-1 ${sortField === column.key && sortDirection === "desc" ? "text-white" : "text-orange-300"}`} />
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tukarShifts.map((item, index) => (
                  <tr key={item.id} className={`border-b border-gray-100 hover:bg-orange-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.peminta?.nama || '-'}</p>
                      <p className="text-xs text-gray-500">{item.peminta?.nik || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.target?.nama || '-'}</p>
                      <p className="text-xs text-gray-500">{item.target?.nik || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{formatDate(item.jadwal_peminta?.tanggal)}</p>
                        <p className="text-xs text-gray-600 font-mono">
                          {formatShiftDisplay(item.jadwal_peminta)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{formatDate(item.jadwal_target?.tanggal)}</p>
                        <p className="text-xs text-gray-600 font-mono">
                          {formatShiftDisplay(item.jadwal_target)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3 text-sm">{formatDateTime(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleViewDetail(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tukarShifts.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Tidak ada data tukar shift</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalItems > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Halaman {currentPage} dari {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages, currentPage - 2 + i));
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-lg transition-colors ${currentPage === pageNum ? "bg-orange-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetailModal && selectedTukarShift && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Detail Tukar Shift</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTukarShift(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Status Permintaan</p>
                    <div className="mt-1">{getStatusBadge(selectedTukarShift.status)}</div>
                  </div>
                  <ArrowRightLeft className="w-8 h-8 text-orange-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Peminta</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-blue-700">NIK</p>
                      <p className="font-semibold text-blue-900">{selectedTukarShift.peminta?.nik || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">Nama</p>
                      <p className="font-semibold text-blue-900">{selectedTukarShift.peminta?.nama || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        No. Telepon
                      </p>
                      <p className="font-semibold text-blue-900">{selectedTukarShift.peminta?.no_telepon || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">Target</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-green-700">NIK</p>
                      <p className="font-semibold text-green-900">{selectedTukarShift.target?.nik || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700">Nama</p>
                      <p className="font-semibold text-green-900">{selectedTukarShift.target?.nama || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        No. Telepon
                      </p>
                      <p className="font-semibold text-green-900">{selectedTukarShift.target?.no_telepon || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Shift Peminta</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">Tanggal</p>
                      <p className="font-semibold">{formatDate(selectedTukarShift.jadwal_peminta?.tanggal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Shift</p>
                      <p className="font-semibold font-mono text-blue-700">
                        {formatShiftDisplay(selectedTukarShift.jadwal_peminta)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Shift Target</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">Tanggal</p>
                      <p className="font-semibold">{formatDate(selectedTukarShift.jadwal_target?.tanggal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Shift</p>
                      <p className="font-semibold font-mono text-green-700">
                        {formatShiftDisplay(selectedTukarShift.jadwal_target)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedTukarShift.catatan && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Catatan</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedTukarShift.catatan}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Diajukan</p>
                      <p className="text-xs text-gray-600">{formatDateTime(selectedTukarShift.tanggal_pengajuan)}</p>
                      <p className="text-xs text-gray-500">oleh {selectedTukarShift.peminta?.nama}</p>
                    </div>
                  </div>

                  {selectedTukarShift.tanggal_diproses && (
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        selectedTukarShift.status === 'disetujui' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {selectedTukarShift.status === 'disetujui' ? 'Disetujui' : 
                           selectedTukarShift.status === 'ditolak' ? 'Ditolak' : 'Diproses'}
                        </p>
                        <p className="text-xs text-gray-600">{formatDateTime(selectedTukarShift.tanggal_diproses)}</p>
                        <p className="text-xs text-gray-500">oleh {selectedTukarShift.target?.nama}</p>
                      </div>
                    </div>
                  )}

                  {selectedTukarShift.status === 'dibatalkan' && selectedTukarShift.dibatalkan_pada && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-gray-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Dibatalkan</p>
                        <p className="text-xs text-gray-600">{formatDateTime(selectedTukarShift.dibatalkan_pada)}</p>
                        <p className="text-xs text-gray-500">oleh {selectedTukarShift.peminta?.nama}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedTukarShift.status === 'ditolak' && selectedTukarShift.alasan_penolakan && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="font-semibold text-red-900 mb-2">Alasan Penolakan</h3>
                  <p className="text-red-800 whitespace-pre-wrap">{selectedTukarShift.alasan_penolakan}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 sticky bottom-0">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedTukarShift(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoTukarShift;