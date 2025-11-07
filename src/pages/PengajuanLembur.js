// src/pages/PengajuanLembur.js
"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Eye, CheckCircle, XCircle, Calendar,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  X, FileText, User, AlertCircle, Download, Trash2, Clock, Loader2, FileX, Sun
} from "lucide-react";
import { pengajuanLemburAPI, projectAPI } from "@/lib/api";
import { toast } from "react-toastify";

const PengajuanLembur = ({ navigationDetail = null }) => {
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [processedNavigationId, setProcessedNavigationId] = useState(null);

  // State untuk data
  const [submissions, setSubmissions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  // State untuk filter dan pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // State untuk modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [confirmAction, setConfirmAction] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const result = await projectAPI.getAll();
      if (result.success) {
        setProjects(result.data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    if (!projects.length) return;
    
    setLoading(true);
    setError(null);

    try {
      let allData = [];

      if (projectFilter === "all") {
        const promises = projects.map(project => 
          pengajuanLemburAPI.getByProject(project.id, {
            page: 1,
            per_page: 999,
          }).catch(err => {
            console.error(`Error fetching from project ${project.id}:`, err);
            return { success: false, data: [] };
          })
        );

        const results = await Promise.all(promises);
        
        results.forEach((result, index) => {
          if (result.success && result.data) {
            const projectData = result.data.map(item => ({
              ...item,
              project_name: projects[index].nama,
              project_id: projects[index].id
            }));
            allData = [...allData, ...projectData];
          }
        });
      } else {
        const result = await pengajuanLemburAPI.getByProject(projectFilter, {
          page: 1,
          per_page: 999,
        });

        if (result.success && result.data) {
          const selectedProject = projects.find(p => p.id == projectFilter);
          const projectData = result.data.map(item => ({
            ...item,
            project_name: selectedProject?.nama || 'Unknown',
            project_id: projectFilter
          }));
          allData = [...projectData];
        }
      }

      // Apply filters
      let filteredData = [...allData];

      if (statusFilter !== "all") {
        filteredData = filteredData.filter(item => item.status === statusFilter);
      }

      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        filteredData = filteredData.filter(item => 
          item.karyawan?.nik?.toLowerCase().includes(search) ||
          item.karyawan?.nama?.toLowerCase().includes(search)
        );
      }

      // Apply custom sorting
      filteredData.sort((a, b) => {
        const aIsPending = a.status === 'pending';
        const bIsPending = b.status === 'pending';

        if (aIsPending && !bIsPending) return -1;
        if (!aIsPending && bIsPending) return 1;

        if (aIsPending && bIsPending) {
          return new Date(a.created_at) - new Date(b.created_at);
        }

        return new Date(b.created_at) - new Date(a.created_at);
      });

      // Apply pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      setSubmissions(paginatedData);
      setTotalItems(filteredData.length);
      setTotalPages(Math.ceil(filteredData.length / itemsPerPage));

      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }

    } catch (err) {
      setError(err.message || 'Gagal memuat data pengajuan lembur');
      console.error('Error fetching submissions:', err);
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    } finally {
      setLoading(false);
    }
  }, [projects, projectFilter, statusFilter, searchTerm, currentPage, itemsPerPage, initialLoadComplete]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    if (projectFilter === "all") {
      if (!projects.length) return;
      
      try {
        const promises = projects.map(project => 
          pengajuanLemburAPI.getSummary(project.id).catch(() => null)
        );
        
        const results = await Promise.all(promises);
        
        const combinedSummary = {
          total: 0,
          pending: 0,
          disetujui: 0,
          ditolak: 0,
          dibatalkan: 0
        };

        results.forEach(result => {
          if (result?.success && result.data) {
            combinedSummary.total += result.data.total || 0;
            combinedSummary.pending += result.data.pending || 0;
            combinedSummary.disetujui += result.data.disetujui || 0;
            combinedSummary.ditolak += result.data.ditolak || 0;
            combinedSummary.dibatalkan += result.data.dibatalkan || 0;
          }
        });

        setSummary(combinedSummary);
      } catch (err) {
        console.error('Error fetching combined summary:', err);
      }
    } else {
      try {
        const result = await pengajuanLemburAPI.getSummary(projectFilter);
        if (result.success) {
          setSummary(result.data);
        }
      } catch (err) {
        console.error('Error fetching summary:', err);
      }
    }
  }, [projectFilter, projects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (projects.length > 0) {
      fetchSubmissions();
    }
  }, [projectFilter, projects.length, statusFilter, searchTerm, currentPage, itemsPerPage, fetchSubmissions]);

  useEffect(() => {
    if (projects.length > 0) {
      fetchSummary();
    }
  }, [projectFilter, projects.length, fetchSummary]);

  // Handle navigation detail from notification
  useEffect(() => {
    if (navigationDetail && 
        navigationDetail.type === 'lembur' && 
        navigationDetail.id && 
        initialLoadComplete && 
        submissions.length > 0 &&
        processedNavigationId !== navigationDetail.id) {
      
      console.log('🎯 Processing navigation detail:', navigationDetail);
      
      const { filters } = navigationDetail;
      
      if (filters.projectId) {
        setProjectFilter(filters.projectId.toString());
      }
      if (filters.status) {
        setStatusFilter(filters.status);
      }
      if (filters.karyawanNik || filters.karyawanNama) {
        setSearchTerm(filters.karyawanNik || filters.karyawanNama || '');
      }
      
      setTimeout(async () => {
        const submission = submissions.find(s => s.id === navigationDetail.id);
        
        if (submission) {
          await handleViewDetail(submission);
        } else {
          try {
            const result = await pengajuanLemburAPI.getById(navigationDetail.id);
            if (result.success) {
              setSelectedSubmission(result.data);
              setShowDetailModal(true);
            }
          } catch (err) {
            toast.error('Gagal membuka detail pengajuan lembur');
          }
        }
        
        setProcessedNavigationId(navigationDetail.id);
      }, 500);
    }
  }, [navigationDetail, initialLoadComplete, submissions, processedNavigationId]);

  const handleViewDetail = async (submission) => {
    try {
      const result = await pengajuanLemburAPI.getById(submission.id);
      if (result.success) {
        setSelectedSubmission(result.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      toast.error('Gagal memuat detail: ' + err.message);
    }
  };

  const handleConfirm = (submission, action) => {
    setSelectedSubmission(submission);
    setConfirmAction(action);
    setAdminNote("");
    setShowConfirmModal(true);
  };

  const handleSubmitConfirmation = async () => {
    if (confirmAction === "reject" && !adminNote.trim()) {
      toast.error("Catatan wajib diisi saat menolak pengajuan");
      return;
    }

    setProcessing(true);

    try {
      const result = await pengajuanLemburAPI.prosesPengajuan(selectedSubmission.id, {
        action: confirmAction === "approve" ? "setujui" : "tolak",
        catatan: adminNote.trim() || null
      });

      if (result.success) {
        toast.success(result.message || 'Pengajuan berhasil diproses');
        
        setShowConfirmModal(false);
        setShowDetailModal(false);
        setSelectedSubmission(null);
        setAdminNote("");
        setConfirmAction("");
        
        fetchSubmissions();
        fetchSummary();
      }
    } catch (err) {
      console.error('Error processing submission:', err);
      toast.error('Error: ' + (err.response?.data?.message || err.message || 'Gagal memproses pengajuan'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteConfirm = (submission) => {
    setSelectedSubmission(submission);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    setProcessing(true);
    try {
      const result = await pengajuanLemburAPI.delete(selectedSubmission.id);
      if (result.success) {
        toast.success(result.message || 'Pengajuan berhasil dihapus');
        setShowDeleteModal(false);
        setShowDetailModal(false);
        setSelectedSubmission(null);
        
        fetchSubmissions();
        fetchSummary();
      }
    } catch (err) {
      toast.error('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessing(false);
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

  const getKodeHariBadge = (kodeHari) => {
    if (kodeHari === 'L') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          <Sun className="w-3 h-3" />
          Hari Libur
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Clock className="w-3 h-3" />
        Hari Kerja
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 animate-pulse space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pengajuan Lembur</h1>
            <p className="text-gray-600">
              {projectFilter === "all" 
                ? "Menampilkan pengajuan lembur dari semua project"
                : "Kelola pengajuan lembur dari karyawan"}
            </p>
          </div>
          {summary && (
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

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Project</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.nama}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari NIK atau Nama..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
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
              <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2">Loading...</p>
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-red-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              <p>Error: {error}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <tr>
                  {projectFilter === "all" && (
                    <th className="px-4 py-3 text-left font-semibold">Project</th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold">NIK</th>
                  <th className="px-4 py-3 text-left font-semibold">Nama</th>
                  <th className="px-4 py-3 text-left font-semibold">Tanggal Lembur</th>
                  <th className="px-4 py-3 text-left font-semibold">Jenis</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission, index) => (
                  <tr key={submission.id} className={`border-b border-gray-100 hover:bg-orange-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    {projectFilter === "all" && (
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {submission.project_name}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">{submission.karyawan?.nik || '-'}</td>
                    <td className="px-4 py-3 font-medium">{submission.karyawan?.nama || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(submission.tanggal)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getKodeHariBadge(submission.kode_hari)}</td>
                    <td className="px-4 py-3">{getStatusBadge(submission.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => handleViewDetail(submission)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {submission.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleConfirm(submission, "approve")}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                              title="Setujui"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirm(submission, "reject")}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Tolak"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={projectFilter === "all" ? "7" : "6"} className="px-6 py-8 text-center text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Tidak ada pengajuan lembur</p>
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
                    key={pageNum}
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

      {/* Detail Modal */}
      {showDetailModal && selectedSubmission && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Detail Pengajuan Lembur</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedSubmission(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Data Karyawan</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">NIK</p>
                    <p className="font-semibold text-gray-900">{selectedSubmission.karyawan?.nik || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nama Lengkap</p>
                    <p className="font-semibold text-gray-900">{selectedSubmission.karyawan?.nama || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Penempatan</p>
                    <p className="font-semibold text-gray-900">{selectedSubmission.karyawan?.divisi || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Jabatan</p>
                    <p className="font-semibold text-gray-900">{selectedSubmission.karyawan?.jabatan || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Detail Lembur</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Tanggal Lembur</p>
                    <p className="font-semibold text-gray-900">{formatDate(selectedSubmission.tanggal)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Jenis Lembur</p>
                    {getKodeHariBadge(selectedSubmission.kode_hari)}
                  </div>

                  {/* Show jam kerja if hari libur */}
                  {selectedSubmission.kode_hari === 'L' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-purple-900 mb-2">Jam Kerja Lembur (Hari Libur)</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-purple-700">Jam Mulai</p>
                          <p className="font-semibold text-purple-900">{selectedSubmission.jam_mulai || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-purple-700">Jam Selesai</p>
                          <p className="font-semibold text-purple-900">{selectedSubmission.jam_selesai || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* File SKL */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">File SKL (Surat Keterangan Lembur)</p>
                    {selectedSubmission.file_skl_url ? (
                      <button
                        onClick={() => window.open(selectedSubmission.file_skl_url, '_blank')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download File SKL
                      </button>
                    ) : (
                      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <FileX className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-900">File SKL Tidak Tersedia</p>
                          <p className="text-sm text-amber-700 mt-1">
                            File Surat Keterangan Lembur untuk pengajuan ini sudah tidak tersedia atau telah dihapus dari sistem.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Keterangan Karyawan */}
                  {selectedSubmission.keterangan_karyawan && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-900 mb-1">Keterangan dari Karyawan</p>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">{selectedSubmission.keterangan_karyawan}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                  </div>

                  {selectedSubmission.catatan_admin && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-amber-900 mb-1">Catatan Admin</p>
                      <p className="text-sm text-amber-800 whitespace-pre-wrap">{selectedSubmission.catatan_admin}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Diajukan Pada</p>
                      <p className="font-semibold text-gray-900">{formatDateTime(selectedSubmission.created_at)}</p>
                    </div>
                    {selectedSubmission.diproses_pada && (
                      <div>
                        <p className="text-sm text-gray-600">Diproses Pada</p>
                        <p className="font-semibold text-gray-900">{formatDateTime(selectedSubmission.diproses_pada)}</p>
                      </div>
                    )}
                  </div>
                  {selectedSubmission.diproses_oleh && (
                    <div>
                      <p className="text-sm text-gray-600">Diproses Oleh</p>
                      <p className="font-semibold text-gray-900">{selectedSubmission.diproses_oleh}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 sticky bottom-0">
              <div>
                {(selectedSubmission.status === "dibatalkan" || selectedSubmission.status === "ditolak") && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleDeleteConfirm(selectedSubmission);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus Pengajuan
                  </button>
                )}
              </div>
              {selectedSubmission.status === "pending" && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleConfirm(selectedSubmission, "reject")}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Tolak
                  </button>
                  <button
                    onClick={() => handleConfirm(selectedSubmission, "approve")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Setujui
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && selectedSubmission && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {confirmAction === "approve" ? "Setujui Pengajuan" : "Tolak Pengajuan"}
              </h2>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setAdminNote("");
                }}
                disabled={processing}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className={`w-5 h-5 ${confirmAction === "approve" ? "text-green-600" : "text-red-600"} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      {confirmAction === "approve" 
                        ? selectedSubmission.kode_hari === 'L'
                          ? "Anda akan menyetujui pengajuan lembur di hari libur ini. Status presensi akan berubah menjadi 'Lembur'."
                          : "Anda akan menyetujui pengajuan lembur ini. Status presensi pulang akan berubah menjadi 'Lembur'."
                        : "Anda akan menolak pengajuan lembur ini. Status presensi akan dikembalikan ke kondisi semula."}
                    </p>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Karyawan:</span> {selectedSubmission.karyawan?.nama}</p>
                      <p><span className="font-medium">Tanggal:</span> {formatDate(selectedSubmission.tanggal)}</p>
                      <p><span className="font-medium">Jenis:</span> {selectedSubmission.kode_hari === 'L' ? 'Hari Libur' : 'Hari Kerja'}</p>
                      {selectedSubmission.kode_hari === 'L' && selectedSubmission.jam_mulai && selectedSubmission.jam_selesai && (
                        <p><span className="font-medium">Jam Kerja:</span> {selectedSubmission.jam_mulai} - {selectedSubmission.jam_selesai}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan Admin {confirmAction === "reject" ? <span className="text-red-500">*</span> : "(Opsional)"}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={confirmAction === "approve" 
                    ? "Tambahkan catatan (opsional)..."
                    : "Jelaskan alasan penolakan..."
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows="4"
                  disabled={processing}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setAdminNote("");
                }}
                disabled={processing}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitConfirmation}
                disabled={processing || (confirmAction === "reject" && !adminNote.trim())}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  confirmAction === "approve"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : confirmAction === "approve" ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Setujui Pengajuan
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Tolak Pengajuan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedSubmission && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Konfirmasi Hapus</h2>
            </div>
            
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900 mb-1">
                      Apakah Anda yakin ingin menghapus pengajuan ini?
                    </p>
                    <p className="text-sm text-red-700">
                      Data yang dihapus tidak dapat dikembalikan.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Karyawan:</span> {selectedSubmission.karyawan?.nama}</p>
                <p><span className="font-medium">Tanggal:</span> {formatDate(selectedSubmission.tanggal)}</p>
                <p><span className="font-medium">Jenis:</span> {selectedSubmission.kode_hari === 'L' ? 'Hari Libur' : 'Hari Kerja'}</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSubmission(null);
                }}
                disabled={processing}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Hapus Pengajuan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PengajuanLembur;