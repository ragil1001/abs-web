"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft, Search, Users, MapPin, Clock, UserPlus, Upload, Download,
  ChevronUp, ChevronDown, X, ChevronRight, Loader2
} from "lucide-react";
import * as XLSX from "xlsx";
import { useApi } from "@/hooks/useApi";
import { karyawanProjectAPI } from "@/lib/api";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { clearApiCache } from "@/lib/axios";

export const dynamic = 'force-dynamic';

const AssignKaryawanDetail = ({ project, onBack }) => {
  const [projectAssignments, setProjectAssignments] = useState([]);
  const [availableKaryawan, setAvailableKaryawan] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [positions, setPositions] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("aktif");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [sortField, setSortField] = useState("tanggal_assign");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  // 🚀 CRITICAL: Add initial load complete flag
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Modal states
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(10);
  const [modalDivisionFilter, setModalDivisionFilter] = useState("all");
  const [modalPositionFilter, setModalPositionFilter] = useState("all");

  const { loading, call } = useApi();
  const [totalActiveKaryawan, setTotalActiveKaryawan] = useState(0); // 🔥 NEW


  // 🚀 OPTIMIZED: Fetch assignments dengan cache clearing
  const fetchAssignments = useCallback(async () => {
  try {
    clearApiCache();
    
    // 🔥 CRITICAL: Always fetch ALL data first untuk count yang aktif
    const allResponse = await call(karyawanProjectAPI.getByProject, project.id, {
      status: 'aktif', // Always get aktif for count
      per_page: 10000 // Get all active
    });
    
    if (allResponse.success) {
      // 🔥 Store total ACTIVE count (tidak berubah meskipun filter berubah)
      setTotalActiveKaryawan(allResponse.pagination?.total || 0);
    }
    
    // Then fetch filtered data for display
    const response = await call(karyawanProjectAPI.getByProject, project.id, {
      status: statusFilter === "all" ? undefined : statusFilter,
      divisi_id: divisionFilter === "all" ? undefined : divisionFilter,
      jabatan_id: positionFilter === "all" ? undefined : positionFilter,
      search: searchTerm,
      sort_field: sortField,
      sort_direction: sortDirection,
      per_page: 1000
    });

    if (response.success) {
      setProjectAssignments(response.data || []);
      
      const uniqueDivisions = [];
      const uniquePositions = [];
      const divMap = new Map();
      const posMap = new Map();
      
      response.data.forEach(assignment => {
        if (assignment.karyawan?.divisi && !divMap.has(assignment.karyawan.divisi.id)) {
          divMap.set(assignment.karyawan.divisi.id, assignment.karyawan.divisi);
          uniqueDivisions.push(assignment.karyawan.divisi);
        }
        if (assignment.karyawan?.jabatan && !posMap.has(assignment.karyawan.jabatan.id)) {
          posMap.set(assignment.karyawan.jabatan.id, assignment.karyawan.jabatan);
          uniquePositions.push(assignment.karyawan.jabatan);
        }
      });
      
      setDivisions(uniqueDivisions);
      setPositions(uniquePositions);
    }
  } catch (err) {
    console.error('Fetch assignments error:', err);
    toast.error(err.message || 'Gagal memuat data karyawan project');
  } finally {
    if (!initialLoadComplete) {
      setInitialLoadComplete(true);
    }
  }
}, [call, project.id, statusFilter, divisionFilter, positionFilter, searchTerm, sortField, sortDirection, initialLoadComplete]);

  const fetchAvailableKaryawan = useCallback(async () => {
    try {
      const response = await call(karyawanProjectAPI.getAvailableKaryawan, {
        search: modalSearchTerm,
        divisi_id: modalDivisionFilter === "all" ? undefined : modalDivisionFilter,
        jabatan_id: modalPositionFilter === "all" ? undefined : modalPositionFilter,
        per_page: 1000
      });

      if (response.success) {
        setAvailableKaryawan(response.data.data || response.data || []);
      }
    } catch (err) {
      console.error('Fetch available karyawan error:', err);
      toast.error(err.message || 'Gagal memuat karyawan yang tersedia');
    }
  }, [call, modalSearchTerm, modalDivisionFilter, modalPositionFilter]);

  useEffect(() => {
    if (project?.id) {
      fetchAssignments();
    }
  }, [project, fetchAssignments]);

  useEffect(() => {
    if (showAddEmployeeModal) {
      fetchAvailableKaryawan();
    }
  }, [showAddEmployeeModal, fetchAvailableKaryawan]);

  const filteredAssignments = useMemo(() => {
    let filtered = projectAssignments;

    if (statusFilter !== "all") {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.karyawan?.nama?.toLowerCase().includes(search) ||
        a.karyawan?.nik?.toLowerCase().includes(search)
      );
    }

    if (divisionFilter !== "all") {
      filtered = filtered.filter(a => a.karyawan?.divisi?.id == divisionFilter);
    }

    if (positionFilter !== "all") {
      filtered = filtered.filter(a => a.karyawan?.jabatan?.id == positionFilter);
    }

    filtered.sort((a, b) => {
      let aVal = sortField.includes('.') 
        ? sortField.split('.').reduce((obj, key) => obj?.[key], a)
        : a[sortField];
      let bVal = sortField.includes('.')
        ? sortField.split('.').reduce((obj, key) => obj?.[key], b)
        : b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase();
      }

      return sortDirection === "asc"
        ? aVal > bVal ? 1 : -1
        : aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [projectAssignments, statusFilter, searchTerm, divisionFilter, positionFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, startIndex + itemsPerPage);

  const filteredModalEmployees = useMemo(() => {
    return availableKaryawan;
  }, [availableKaryawan]);

  const modalTotalPages = Math.ceil(filteredModalEmployees.length / modalItemsPerPage);
  const modalStartIndex = (modalCurrentPage - 1) * modalItemsPerPage;
  const modalPaginatedEmployees = filteredModalEmployees.slice(modalStartIndex, modalStartIndex + modalItemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleAddEmployees = () => {
    setSelectedEmployees([]);
    setModalSearchTerm("");
    setModalCurrentPage(1);
    setModalDivisionFilter("all");
    setModalPositionFilter("all");
    setShowAddEmployeeModal(true);
  };

  const handleConfirmAddEmployees = async () => {
    if (selectedEmployees.length === 0) {
      toast.warning("Pilih minimal 1 karyawan");
      return;
    }

    const result = await Swal.fire({
      title: 'Konfirmasi',
      html: `Tambah <b>${selectedEmployees.length}</b> karyawan ke project <b>${project.nama}</b>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Tambah',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const response = await call(karyawanProjectAPI.assignKaryawan, {
          project_id: project.id,
          karyawan_ids: selectedEmployees,
          tanggal_assign: new Date().toISOString().split('T')[0],
          keterangan: null
        });

        if (response.success) {
          toast.success(response.message || `${response.success_count} karyawan berhasil ditambahkan`);
          
          if (response.errors && response.errors.length > 0) {
            const errorList = response.errors.slice(0, 5).join('<br>');
            const moreErrors = response.errors.length > 5 ? `<br>...dan ${response.errors.length - 5} error lainnya` : '';
            
            await Swal.fire({
              title: 'Beberapa Karyawan Gagal Ditambahkan',
              html: errorList + moreErrors,
              icon: 'warning',
              confirmButtonColor: '#ea580c'
            });
          }

          clearApiCache();
          await fetchAssignments();
          setShowAddEmployeeModal(false);
          setSelectedEmployees([]);
        }
      } catch (err) {
        console.error('Assign error:', err);
        toast.error(err.message || 'Gagal menambahkan karyawan');
      }
    }
  };

  const handleDeactivateEmployee = async (assignment) => {
    const { value: tanggalSelesai } = await Swal.fire({
      title: 'Nonaktifkan Karyawan',
      html: `
        <p class="mb-4">Nonaktifkan <b>${assignment.karyawan?.nama}</b> dari project?</p>
        <label class="block text-left mb-2 text-sm font-medium">Tanggal Selesai *</label>
        <input type="date" id="tanggal-selesai" class="swal2-input" value="${new Date().toISOString().split('T')[0]}" max="${new Date().toISOString().split('T')[0]}">
        <label class="block text-left mb-2 text-sm font-medium mt-4">Keterangan (opsional)</label>
        <textarea id="keterangan" class="swal2-textarea" placeholder="Alasan dinonaktifkan (opsional)"></textarea>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Nonaktifkan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const tanggal = document.getElementById('tanggal-selesai').value;
        const keterangan = document.getElementById('keterangan').value;
        
        if (!tanggal) {
          Swal.showValidationMessage('Tanggal selesai wajib diisi');
          return false;
        }
        
        return { tanggal, keterangan };
      }
    });

    if (tanggalSelesai) {
      try {
        await call(karyawanProjectAPI.deactivate, assignment.id, {
          tanggal_selesai: tanggalSelesai.tanggal,
          keterangan: tanggalSelesai.keterangan || null
        });

        toast.success('Karyawan berhasil dinonaktifkan');
        clearApiCache();
        await fetchAssignments();
      } catch (err) {
        console.error('Deactivate error:', err);
        toast.error(err.message || 'Gagal menonaktifkan karyawan');
      }
    }
  };

  const handleActivateEmployee = async (assignment) => {
    const result = await Swal.fire({
      title: 'Konfirmasi Aktifkan',
      html: `Yakin mengaktifkan kembali <b>${assignment.karyawan?.nama}</b>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Aktifkan',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await call(karyawanProjectAPI.reactivate, assignment.id);
        toast.success('Karyawan berhasil diaktifkan kembali');
        clearApiCache();
        await fetchAssignments();
      } catch (err) {
        console.error('Reactivate error:', err);
        toast.error(err.message || 'Gagal mengaktifkan karyawan');
      }
    }
  };

  const exportTemplate = () => {
    const wsData = [["NIK", "Nama", "Penempatan", "Jabatan"]];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `template-assign-${project.nama}.xlsx`);
    toast.success("Template berhasil diunduh!");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error("Format file tidak valid. Gunakan file Excel (.xlsx atau .xls)");
        e.target.value = '';
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran file terlalu besar. Maksimal 2MB");
        e.target.value = '';
        return;
      }

      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Pilih file Excel terlebih dahulu");
      return;
    }

    const result = await Swal.fire({
      title: 'Konfirmasi Import',
      text: 'Data karyawan akan diimport ke project ini. Lanjutkan?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Import',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setImportLoading(true);

      try {
        const formData = new FormData();
        formData.append('file', importFile);

        const response = await call(karyawanProjectAPI.import, project.id, formData);

        if (response.success) {
          toast.success(response.message || `${response.success_count} karyawan berhasil diimport`);
          
          if (response.errors && response.errors.length > 0) {
            const errorList = response.errors.slice(0, 10).join('<br>');
            const moreErrors = response.errors.length > 10 ? `<br>...dan ${response.errors.length - 10} error lainnya` : '';
            
            await Swal.fire({
              title: 'Beberapa Data Gagal Diimport',
              html: errorList + moreErrors,
              icon: 'warning',
              confirmButtonColor: '#ea580c'
            });
          }

          clearApiCache();
          await fetchAssignments();
          setShowImportModal(false);
          setImportFile(null);
        }
      } catch (err) {
        console.error('Import error:', err);
        toast.error(err.message || 'Gagal mengimport data');
      } finally {
        setImportLoading(false);
      }
    }
  };

  const handleExport = async () => {
    try {
      Swal.fire({
        title: 'Mengekspor Data',
        text: 'Sedang menyiapkan file export...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
      });

      const response = await call(karyawanProjectAPI.export, project.id);
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `karyawan-${project.nama}-${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      Swal.close();
      toast.success("Data berhasil diekspor!");
    } catch (err) {
      Swal.close();
      console.error('Export error:', err);
      toast.error(err.message || 'Gagal mengekspor data');
    }
  };

  const formatShifts = (shifts) => {
    if (!shifts || shifts.length === 0) return '-';
    return shifts.map((s, idx) => ({
      name: `Shift ${idx + 1}`,
      time: `${s.waktu_mulai} - ${s.waktu_selesai}`
    }));
  };

  const openGoogleMaps = (lat, lng) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const activeCount = totalActiveKaryawan;

  // 🚀 Render Smart Pagination Helper
  const renderPagination = (current, total, onPageChange, disabled = false) => {
    const pages = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (current > 3) {
        pages.push('...');
      }
      
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (current < total - 2) {
        pages.push('...');
      }
      
      if (!pages.includes(total)) {
        pages.push(total);
      }
    }
    
    return pages.map((page, index) => {
      if (page === '...') {
        return (
          <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-400">
            ...
          </span>
        );
      }
      
      return (
        <button
          key={`page-${page}`}
          onClick={() => onPageChange(page)}
          disabled={disabled}
          className={`px-3 py-1 rounded-lg transition-colors min-w-[40px] ${
            current === page 
              ? "bg-orange-600 text-white font-semibold shadow-sm" 
              : "text-gray-600 hover:bg-gray-100"
          } disabled:opacity-50`}
        >
          {page}
        </button>
      );
    });
  };

  if (!initialLoadComplete) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="space-y-4">
                  {[1,2].map(i => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
                <div className="space-y-4">
                  {[1,2].map(i => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 animate-pulse space-y-4">
              <div className="h-12 bg-gray-300 rounded"></div>
              {[1,2,3,4,5,6,7,8,9,10].map(i => (
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
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{project.nama}</h1>
            <p className="text-gray-600">Kelola karyawan yang ditugaskan pada project ini</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Shift</p>
                {Array.isArray(project.shifts) && project.shifts.length > 0 ? (
                  <div className="space-y-1">
                    {formatShifts(project.shifts).map((shift, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium text-gray-900">{shift.name}:</span>
                        <span className="text-gray-700 ml-1">{shift.time}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">-</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Lokasi</p>
                <p className="font-medium text-gray-900">{project.lokasi_nama || project.lokasi?.nama}</p>
                <button
                  onClick={() => openGoogleMaps(project.lokasi_latitude || project.lokasi?.latitude, project.lokasi_longitude || project.lokasi?.longitude)}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-0.5 inline-flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  {project.lokasi_latitude || project.lokasi?.latitude}, {project.lokasi_longitude || project.lokasi?.longitude}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
  <Users className="w-5 h-5 text-orange-600 mt-0.5" />
  <div className="flex-1">
    <p className="text-sm text-gray-600 mb-1">Total Karyawan</p>
    <p className="font-medium text-gray-900">{activeCount} Karyawan</p>
    {statusFilter !== 'aktif' && (
      <p className="text-xs text-gray-500 mt-1">
        Menampilkan: {filteredAssignments.length} ({statusFilter === 'all' ? 'semua status' : 'tidak aktif'})
      </p>
    )}
  </div>
</div>

            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              <button
                onClick={handleAddEmployees}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Tambah Karyawan
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" /> Import Excel
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" /> Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari karyawan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="aktif">Aktif</option>
            <option value="tidak_aktif">Tidak Aktif</option>
            <option value="all">Semua Status</option>
          </select>

          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Penempatan</option>
            {divisions.map(div => (
              <option key={div.id} value={div.id}>{div.nama}</option>
            ))}
          </select>

          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Jabatan</option>
            {positions.map(pos => (
              <option key={pos.id} value={pos.id}>{pos.nama}</option>
            ))}
          </select>
        </div>
      </div>

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
            Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAssignments.length)} dari {filteredAssignments.length} data
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <tr>
                {[
                  { key: "karyawan.nik", label: "NIK" },
                  { key: "karyawan.nama", label: "Nama" },
                  { key: "karyawan.jabatan.nama", label: "Jabatan" },
                  { key: "karyawan.divisi.nama", label: "Penempatan" },
                  { key: "tanggal_assign", label: "Tanggal Assign" },
                  { key: "tanggal_selesai", label: "Tanggal Selesai" },
                  { key: "status", label: "Status" }
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
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && paginatedAssignments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                      <p className="text-gray-600">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedAssignments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'Tidak ada data yang sesuai dengan pencarian' : 'Belum ada karyawan yang ditugaskan'}
                  </td>
                </tr>
              ) : (
                paginatedAssignments.map((assignment, idx) => (
                  <tr key={assignment.id} className={`border-b border-gray-100 hover:bg-orange-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-medium">{assignment.karyawan?.nik}</td>
                    <td className="px-4 py-3 font-medium">{assignment.karyawan?.nama}</td>
                    <td className="px-4 py-3">{assignment.karyawan?.jabatan?.nama}</td>
                    <td className="px-4 py-3">{assignment.karyawan?.divisi?.nama}</td>
                    <td className="px-4 py-3">{formatDate(assignment.tanggal_assign)}</td>
                    <td className="px-4 py-3">{formatDate(assignment.tanggal_selesai)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        assignment.status === "aktif" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {assignment.status === "aktif" ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {assignment.status === "aktif" ? (
                        <button
                          onClick={() => handleDeactivateEmployee(assignment)}
                          className="px-3 py-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                        >
                          Nonaktifkan
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateEmployee(assignment)}
                          className="px-3 py-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors text-sm font-medium"
                        >
                          Aktifkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div>Halaman {currentPage} dari {totalPages}</div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {renderPagination(currentPage, totalPages, setCurrentPage, loading)}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || loading}
              className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Tambah Karyawan ke Project</h2>
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Cari karyawan..."
                    value={modalSearchTerm}
                    onChange={(e) => {
                      setModalSearchTerm(e.target.value);
                      setModalCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <select
                  value={modalDivisionFilter}
                  onChange={(e) => setModalDivisionFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">Semua Penempatan</option>
                  {divisions.map(div => (
                    <option key={div.id} value={div.id}>{div.nama}</option>
                  ))}
                </select>
                <select
                  value={modalPositionFilter}
                  onChange={(e) => setModalPositionFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">Semua Jabatan</option>
                  {positions.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.nama}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  Tampilkan
                  <select
                    value={modalItemsPerPage}
                    onChange={(e) => { setModalItemsPerPage(parseInt(e.target.value)); setModalCurrentPage(1); }}
                    className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  entri
                </div>
                <div>
                  Menampilkan {modalStartIndex + 1}-{Math.min(modalStartIndex + modalItemsPerPage, filteredModalEmployees.length)} dari {filteredModalEmployees.length} data
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.length === modalPaginatedEmployees.length && modalPaginatedEmployees.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmployees(prev => [
                                ...new Set([...prev, ...modalPaginatedEmployees.map(emp => emp.id)])
                              ]);
                            } else {
                              setSelectedEmployees(prev => 
                                prev.filter(id => !modalPaginatedEmployees.some(emp => emp.id === id))
                              );
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NIK</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penempatan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jabatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalPaginatedEmployees.map((employee) => (
                      <tr key={employee.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(employee.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmployees([...selectedEmployees, employee.id]);
                              } else {
                                setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-4 font-medium">{employee.nik}</td>
                        <td className="px-4 py-4">{employee.nama}</td>
                        <td className="px-4 py-4">{employee.divisi?.nama}</td>
                        <td className="px-4 py-4">{employee.jabatan?.nama}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {modalPaginatedEmployees.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {modalSearchTerm ? 'Tidak ada data yang sesuai dengan pencarian' : 'Tidak ada karyawan yang tersedia'}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                <div>Halaman {modalCurrentPage} dari {modalTotalPages}</div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => setModalCurrentPage(Math.max(1, modalCurrentPage - 1))}
                    disabled={modalCurrentPage === 1}
                    className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {renderPagination(modalCurrentPage, modalTotalPages, setModalCurrentPage)}
                  
                  <button
                    onClick={() => setModalCurrentPage(Math.min(modalTotalPages, modalCurrentPage + 1))}
                    disabled={modalCurrentPage === modalTotalPages}
                    className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedEmployees.length > 0 && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-700">
                    {selectedEmployees.length} karyawan dipilih untuk ditambahkan ke project
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmAddEmployees}
                disabled={selectedEmployees.length === 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tambah {selectedEmployees.length} Karyawan
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Import Data Excel</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {importFile ? importFile.name : "Pilih file Excel"}
                </h3>
                <p className="text-gray-600 mb-4">Format yang didukung: .xlsx, .xls (Maksimal 2MB)</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  id="import-file"
                  onChange={handleFileSelect}
                  disabled={importLoading}
                />
                <label
                  htmlFor="import-file"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer inline-block"
                >
                  {importFile ? "Ganti File" : "Pilih File"}
                </label>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Format yang diperlukan:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• NIK - untuk mencari karyawan di database</li>
                  <li>• Nama - untuk konfirmasi (opsional)</li>
                  <li>• Penempatan - untuk konfirmasi (opsional)</li>
                  <li>• Jabatan - untuk konfirmasi (opsional)</li>
                </ul>
                <p className="text-sm text-yellow-700 mt-2">
                  * Sistem akan mencari karyawan berdasarkan NIK dan memvalidasi data penempatan/jabatan
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={exportTemplate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  disabled={importLoading}
                >
                  <Download className="w-4 h-4" /> Download Template
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengimport...
                    </>
                  ) : (
                    "Import Data"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export async function getServerSideProps() {
  return {
    props: {},
  };
}

export default AssignKaryawanDetail;