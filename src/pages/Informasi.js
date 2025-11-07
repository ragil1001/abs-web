"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, Eye, Edit, Trash2, Send, X, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, Loader2, FileText, Users, Eye as EyeIcon,
  User, CheckSquare, Square, FileX, Download
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { informasiAPI, karyawanAPI, karyawanProjectAPI } from "@/lib/api";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { clearApiCache } from "@/lib/axios";

const normalizeIds = (ids) => {
  if (!ids) return [];
  if (!Array.isArray(ids)) return [parseInt(ids)];
  return ids.map(id => parseInt(id)).filter(id => !isNaN(id));
};

const TARGET_TYPES = {
  semua: { label: 'Semua Karyawan', color: 'blue' },
  divisi: { label: 'Per Divisi', color: 'green' },
  jabatan: { label: 'Per Jabatan', color: 'purple' },
  project: { label: 'Per Project', color: 'orange' },
  karyawan: { label: 'Karyawan Spesifik', color: 'pink' }
};

const STATUS_TYPES = {
  draft: { label: 'Draft', color: 'gray' },
  terkirim: { label: 'Terkirim', color: 'green' }
};

// Komponen Karyawan Selector yang Dioptimalkan
const KaryawanSelector = ({ selectedIds, onChange, disabled, error }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [karyawanList, setKaryawanList] = useState([]);
  const [filteredKaryawan, setFilteredKaryawan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [jabatanFilter, setJabatanFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [jabatanList, setJabatanList] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [hasAppliedFilter, setHasAppliedFilter] = useState(false);
  const { call } = useApi();

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch jabatan
        const jabatanResponse = await call(informasiAPI.getTargetOptions, 'jabatan');
        if (jabatanResponse.success) {
          setJabatanList(jabatanResponse.data || []);
        }

        // Fetch project
        const projectResponse = await call(informasiAPI.getTargetOptions, 'project');
        if (projectResponse.success) {
          setProjectList(projectResponse.data || []);
        }
      } catch (err) {
        console.error('Fetch filter options error:', err);
      }
    };

    fetchFilterOptions();
  }, [call]);

  // Fetch karyawan when filter applied
  useEffect(() => {
    const fetchKaryawan = async () => {
      // Jangan fetch jika belum ada filter yang dipilih
      if (jabatanFilter === "all" && projectFilter === "all" && !searchTerm.trim()) {
        setKaryawanList([]);
        setFilteredKaryawan([]);
        setHasAppliedFilter(false);
        return;
      }

      setHasAppliedFilter(true);
      setLoading(true);

      try {
        let data = [];

        // Jika filter by project, ambil dari KaryawanProject yang aktif
        if (projectFilter !== "all") {
          const response = await call(karyawanProjectAPI.getByProject, projectFilter, {
            status: 'aktif',
            per_page: 1000
          });

          if (response.success) {
            // Extract karyawan dari response
            data = (response.data || []).map(item => ({
              id: item.karyawan.id,
              nik: item.karyawan.nik,
              nama: item.karyawan.nama,
              divisi: item.karyawan.divisi,
              jabatan: item.karyawan.jabatan
            }));
          }
        } else {
          // Fetch karyawan normal dengan filter
          const params = {
            per_page: 1000,
            status: 'aktif'
          };

          if (jabatanFilter !== "all") {
            params.jabatan_id = jabatanFilter;
          }
          if (searchTerm.trim()) {
            params.search = searchTerm.trim();
          }

          const response = await call(karyawanAPI.getAll, params);
          
          if (response.success) {
            data = response.data.data || response.data;
          }
        }

        // Apply additional filters for project results
        if (projectFilter !== "all") {
          if (jabatanFilter !== "all") {
            data = data.filter(k => k.jabatan?.id === parseInt(jabatanFilter));
          }
          if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            data = data.filter(k => 
              k.nama.toLowerCase().includes(search) ||
              k.nik.toLowerCase().includes(search)
            );
          }
        }

        setKaryawanList(data);
        setFilteredKaryawan(data);
      } catch (err) {
        console.error('Fetch karyawan error:', err);
        toast.error('Gagal memuat data karyawan');
        setKaryawanList([]);
        setFilteredKaryawan([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchKaryawan();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [jabatanFilter, projectFilter, searchTerm, call]);

  const normalizedSelectedIds = normalizeIds(selectedIds);
  
  const toggleKaryawan = (karyawanId) => {
    const idInt = parseInt(karyawanId);
    const currentIds = normalizeIds(normalizedSelectedIds);
    
    const newIds = currentIds.includes(idInt)
      ? currentIds.filter(id => id !== idInt)
      : [...currentIds, idInt];
    
    console.log('Toggle karyawan:', karyawanId, 'New IDs:', newIds); // Debug
    onChange(newIds);
  };

  const toggleAll = () => {
    const currentIds = normalizeIds(normalizedSelectedIds);
    const allIds = filteredKaryawan.map(k => parseInt(k.id));
    
    if (currentIds.length === allIds.length && allIds.length > 0) {
      onChange([]);
    } else {
      onChange(allIds);
    }
  };

  const clearSelection = () => {
    onChange([]);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setJabatanFilter("all");
    setProjectFilter("all");
    setKaryawanList([]);
    setFilteredKaryawan([]);
    setHasAppliedFilter(false);
    onChange([]);
  };

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          💡 <strong>Gunakan filter</strong> untuk menampilkan daftar karyawan. Pilih minimal satu filter (Jabatan, Project, atau Search).
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari nama/NIK..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <select
          value={jabatanFilter}
          onChange={(e) => setJabatanFilter(e.target.value)}
          disabled={disabled}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">Semua Jabatan</option>
          {jabatanList.map(jabatan => (
            <option key={jabatan.value} value={jabatan.value}>{jabatan.label}</option>
          ))}
        </select>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          disabled={disabled}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">Semua Project</option>
          {projectList.map(project => (
            <option key={project.value} value={project.value}>{project.label}</option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      {hasAppliedFilter && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {filteredKaryawan.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={toggleAll}
                  disabled={disabled}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50 flex items-center gap-1"
                >
                  {selectedIds.length === filteredKaryawan.length && filteredKaryawan.length > 0 ? (
                    <>
                      <Square className="w-4 h-4" />
                      Batalkan Semua
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      Pilih Semua
                    </>
                  )}
                </button>
                
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={disabled}
                    className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    Hapus Pilihan
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={resetFilters}
              disabled={disabled}
              className="text-sm text-gray-600 hover:text-gray-700 font-medium disabled:opacity-50 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Reset Filter
            </button>
          </div>
          
          <span className="text-sm text-gray-600">
            {selectedIds.length} dari {filteredKaryawan.length} dipilih
          </span>
        </div>
      )}

      {/* Karyawan List */}
      <div className="border rounded-lg max-h-96 overflow-y-auto">
        {!hasAppliedFilter ? (
          <div className="p-8 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">Gunakan Filter untuk Menampilkan Karyawan</p>
            <p className="text-sm mt-1">Pilih Jabatan, Project, atau cari berdasarkan Nama/NIK</p>
          </div>
        ) : loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Memuat data karyawan...</p>
          </div>
        ) : filteredKaryawan.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">Tidak ada karyawan ditemukan</p>
            <p className="text-sm mt-1">Coba ubah kriteria filter</p>
          </div>
        ) : (
          filteredKaryawan.map((karyawan, idx) => {
  const karyawanIdInt = parseInt(karyawan.id);
  const currentIds = normalizeIds(selectedIds);
  const isChecked = currentIds.includes(karyawanIdInt);
  
  return (
    <label
      key={karyawan.id}
      className={`flex items-start px-4 py-3 hover:bg-orange-50 cursor-pointer border-b last:border-b-0 ${
        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      }`}
    >
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => toggleKaryawan(karyawan.id)}
        disabled={disabled}
        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 mt-1"
      />
      <div className="ml-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{karyawan.nama}</span>
          <span className="text-xs text-gray-500">({karyawan.nik})</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
          {karyawan.divisi && (
            <>
              <span className="flex items-center gap-1">
                <span className="font-medium">Divisi:</span>
                {karyawan.divisi?.nama || '-'}
              </span>
              <span className="text-gray-400">•</span>
            </>
          )}
          <span className="flex items-center gap-1">
            <span className="font-medium">Jabatan:</span>
            {karyawan.jabatan?.nama || '-'}
          </span>
        </div>
      </div>
    </label>
  );
          })
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error[0]}</p>
      )}
    </div>
  );
};

const Informasi = () => {
  const [allInformasi, setAllInformasi] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPenerimaModal, setShowPenerimaModal] = useState(false);
  const [selectedInformasi, setSelectedInformasi] = useState(null);
  
  const [formData, setFormData] = useState({
    judul: '',
    konten: '',
    file: null,
    target_type: 'semua',
    target_ids: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [targetOptions, setTargetOptions] = useState([]);
  const [penerimaList, setPenerimaList] = useState([]);
  const [penerimaPage, setPenerimaPage] = useState(1);
  const [penerimaTotalPages, setPenerimaTotalPages] = useState(1);
  
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const { loading, call } = useApi();

  const fetchAllData = useCallback(async () => {
    try {
      clearApiCache('/informasi');
      
      const response = await call(informasiAPI.getAll, {
        per_page: 1000,
        _t: Date.now()
      });
      
      if (response.success) {
        setAllInformasi(response.data || []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setAllInformasi([]);
      toast.error('Gagal memuat data informasi');
    } finally {
      setInitialLoadComplete(true);
    }
  }, [call]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    const fetchTargetOptions = async () => {
      if (formData.target_type === 'semua' || formData.target_type === 'karyawan') {
        setTargetOptions([]);
        return;
      }

      try {
        const response = await call(informasiAPI.getTargetOptions, formData.target_type);
        if (response.success) {
          setTargetOptions(response.data || []);
        }
      } catch (err) {
        console.error('Fetch target options error:', err);
        setTargetOptions([]);
      }
    };

    if (showAddModal || showEditModal) {
      fetchTargetOptions();
    }
  }, [formData.target_type, showAddModal, showEditModal, call]);

  const processedData = useMemo(() => {
    let filtered = allInformasi;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(info =>
        info.judul.toLowerCase().includes(search) ||
        info.konten.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(info => info.status === statusFilter);
    }

    if (targetTypeFilter !== "all") {
      filtered = filtered.filter(info => info.target_type === targetTypeFilter);
    }

    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [allInformasi, searchTerm, statusFilter, targetTypeFilter, sortField, sortDirection]);

  const paginationData = useMemo(() => {
    const totalItems = processedData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = processedData.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      pagination: {
        current_page: currentPage,
        per_page: itemsPerPage,
        total: totalItems,
        last_page: totalPages,
      }
    };
  }, [processedData, currentPage, itemsPerPage]);

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  }, [sortField]);

  const resetForm = useCallback(() => {
    setFormData({
      judul: '',
      konten: '',
      file: null,
      target_type: 'semua',
      target_ids: []
    });
    setFormErrors({});
    setSelectedInformasi(null);
    setSubmitLoading(false);
  }, []);

  const handleOpenAddModal = useCallback(() => {
    resetForm();
    setShowAddModal(true);
  }, [resetForm]);

  const handleOpenEditModal = useCallback((info) => {
  console.log('Edit modal opened with info:', info); // Debug
  
  setSelectedInformasi(info);
  
  // Normalize target_ids ke array of integers
  const targetIds = normalizeIds(info.target_ids);
  
  console.log('Normalized target_ids:', targetIds); // Debug
  
  setFormData({
    judul: info.judul || '',
    konten: info.konten || '',
    file: null,
    target_type: info.target_type || 'semua',
    target_ids: targetIds
  });
  setFormErrors({});
  setSubmitLoading(false);
  setShowEditModal(true);
}, []);

  const handleOpenDetailModal = useCallback(async (info) => {
    setSelectedInformasi(info);
    setShowDetailModal(true);
  }, []);

  const handleOpenPenerimaModal = useCallback(async (info) => {
    setSelectedInformasi(info);
    setPenerimaPage(1);
    setShowPenerimaModal(true);
    
    try {
      const response = await call(informasiAPI.getPenerima, info.id, {
        page: 1,
        per_page: 10
      });
      
      if (response.success) {
        setPenerimaList(response.data || []);
        setPenerimaTotalPages(response.pagination?.last_page || 1);
      }
    } catch (err) {
      console.error('Fetch penerima error:', err);
      toast.error('Gagal memuat data penerima');
    }
  }, [call]);

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDetailModal(false);
    setShowPenerimaModal(false);
    resetForm();
  }, [resetForm]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 10MB");
        e.target.value = '';
        return;
      }
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleSubmit = async () => {
    if (submitLoading) return;

    const errors = {};
    if (!formData.judul.trim()) errors.judul = ['Judul wajib diisi'];
    if (!formData.konten.trim()) errors.konten = ['Konten wajib diisi'];
    if (formData.target_type !== 'semua' && formData.target_ids.length === 0) {
      errors.target_ids = ['Pilih minimal 1 target'];
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Lengkapi semua field yang wajib diisi');
      return;
    }

    const result = await Swal.fire({
      title: selectedInformasi ? 'Konfirmasi Update' : 'Konfirmasi Simpan',
      html: `${selectedInformasi ? 'Update' : 'Simpan'} informasi sebagai draft?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      confirmButtonText: 'Ya, Simpan',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      await performSubmit();
    }
  };

  const performSubmit = async () => {
    setSubmitLoading(true);
    setFormErrors({});

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('judul', formData.judul.trim());
      formDataToSend.append('konten', formData.konten.trim());
      formDataToSend.append('target_type', formData.target_type);
      
      if (formData.target_type !== 'semua') {
        formData.target_ids.forEach(id => {
          formDataToSend.append('target_ids[]', id);
        });
      }

      if (formData.file) {
        formDataToSend.append('file', formData.file);
      }

      if (selectedInformasi) {
        await call(informasiAPI.update, selectedInformasi.id, formDataToSend);
        toast.success('Informasi berhasil diperbarui');
      } else {
        await call(informasiAPI.create, formDataToSend);
        toast.success('Draft informasi berhasil disimpan');
      }

      clearApiCache();
      await fetchAllData();
      handleCloseModal();
    } catch (err) {
      console.error('Submit error:', err);
      if (err.type === 'validation_error' && err.errors) {
        setFormErrors(err.errors);
      }
      toast.error(err.message || 'Gagal menyimpan informasi');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSend = async (info) => {
    const result = await Swal.fire({
      title: 'Konfirmasi Kirim',
      html: `Kirim informasi "<b>${info.judul}</b>" ke ${info.target_names}?<br><small class="text-gray-600">Informasi yang sudah terkirim tidak dapat diubah</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      confirmButtonText: 'Ya, Kirim',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const response = await call(informasiAPI.send, info.id);
        toast.success(response.message || 'Informasi berhasil dikirim');
        clearApiCache();
        await fetchAllData();
      } catch (err) {
        toast.error(err.message || 'Gagal mengirim informasi');
      }
    }
  };

  const handleDelete = async (info) => {
    const result = await Swal.fire({
      title: 'Konfirmasi Hapus',
      html: `Hapus informasi "<b>${info.judul}</b>"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await call(informasiAPI.delete, info.id);
        toast.success('Informasi berhasil dihapus');
        clearApiCache();
        await fetchAllData();
      } catch (err) {
        toast.error(err.message || 'Gagal menghapus informasi');
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!initialLoadComplete) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 animate-pulse">
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm animate-pulse">
            <div className="p-6 space-y-4">
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
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Informasi</h1>
            <p className="text-gray-600">Kelola informasi untuk karyawan</p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4" /> Buat Informasi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari informasi..."
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
            <option value="all">Semua Status</option>
            {Object.entries(STATUS_TYPES).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Target</option>
            {Object.entries(TARGET_TYPES).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Tampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600">entri</span>
          </div>
          <div className="text-sm text-gray-600">
            {paginationData.pagination.total} data
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <tr>
                {[
                  { key: "judul", label: "Judul" },
                  { key: "target_type", label: "Target" },
                  { key: "total_penerima", label: "Penerima" },
                  { key: "total_dibaca", label: "Dibaca" },
                  { key: "status", label: "Status" },
                  { key: "dikirim_at", label: "Dikirim" }
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left cursor-pointer hover:bg-orange-600"
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
              {loading && paginationData.items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : paginationData.items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    Belum ada data informasi
                  </td>
                </tr>
              ) : (
                paginationData.items.map((info, idx) => (
                  <tr key={info.id} className={`border-b hover:bg-orange-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{info.judul}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${TARGET_TYPES[info.target_type]?.color}-100 text-${TARGET_TYPES[info.target_type]?.color}-700`}>
                        {TARGET_TYPES[info.target_type]?.label}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">{info.target_names}</div>
                    </td>
                    <td className="px-4 py-3 text-center">{info.total_penerima || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{info.total_dibaca || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        info.status === 'terkirim'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {STATUS_TYPES[info.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{info.time_ago || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenDetailModal(info)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg"
                          title="Lihat detail"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {info.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(info)}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSend(info)}
                              className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-lg"
                              title="Kirim"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(info)}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {info.status === 'terkirim' && (
                          <button
                            onClick={() => handleOpenPenerimaModal(info)}
                            className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg"
                            title="Lihat penerima"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>Halaman {paginationData.pagination.current_page} dari {paginationData.pagination.last_page}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(paginationData.pagination.last_page, 5) }, (_, i) => {
              let pageNum;
              if (paginationData.pagination.last_page <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= paginationData.pagination.last_page - 2) {
                pageNum = paginationData.pagination.last_page - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-lg ${
                    currentPage === pageNum
                      ? 'bg-orange-600 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(paginationData.pagination.last_page, currentPage + 1))}
              disabled={currentPage === paginationData.pagination.last_page}
              className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {selectedInformasi ? 'Edit Informasi' : 'Buat Informasi'}
              </h2>
              <button onClick={handleCloseModal} disabled={submitLoading}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul *
                </label>
                <input
                  type="text"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  placeholder="Masukkan judul informasi"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.judul ? 'border-red-500' : 'border-gray-200'
                  }`}
                  disabled={submitLoading}
                />
                {formErrors.judul && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.judul[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konten *
                </label>
                <textarea
                  value={formData.konten}
                  onChange={(e) => setFormData({ ...formData, konten: e.target.value })}
                  placeholder="Tulis konten informasi..."
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.konten ? 'border-red-500' : 'border-gray-200'
                  }`}
                  disabled={submitLoading}
                />
                {formErrors.konten && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.konten[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File Lampiran (Opsional)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={submitLoading}
                />
                <p className="text-xs text-gray-500 mt-1">Maksimal 10MB</p>
                {formData.file && (
                  <p className="text-sm text-green-600 mt-2">File dipilih: {formData.file.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Penerima *
                </label>
                <select
                  value={formData.target_type}
                  onChange={(e) => setFormData({ ...formData, target_type: e.target.value, target_ids: [] })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={submitLoading}
                >
                  {Object.entries(TARGET_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>

              {formData.target_type !== 'semua' && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Pilih {TARGET_TYPES[formData.target_type]?.label} *
    </label>
    
    {formData.target_type === 'karyawan' ? (
      <KaryawanSelector
        selectedIds={formData.target_ids}
        onChange={(ids) => setFormData({ ...formData, target_ids: ids })}
        disabled={submitLoading}
        error={formErrors.target_ids}
      />
    ) : (
      <>
        <div className="border rounded-lg max-h-60 overflow-y-auto">
          {targetOptions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Memuat data...
            </div>
          ) : (
            targetOptions.map((option, idx) => {
              const optionValueInt = parseInt(option.value);
              const currentIds = normalizeIds(formData.target_ids);
              const isChecked = currentIds.includes(optionValueInt);
              
              return (
                <label
                  key={option.value}
                  className={`flex items-center px-3 py-2 hover:bg-orange-50 cursor-pointer border-b last:border-b-0 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const valueInt = parseInt(option.value);
                      const currentIds = normalizeIds(formData.target_ids);
                      
                      const newIds = e.target.checked
                        ? [...currentIds, valueInt]
                        : currentIds.filter(id => id !== valueInt);
                      
                      setFormData({ ...formData, target_ids: newIds });
                    }}
                    disabled={submitLoading}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm">{option.label}</span>
                </label>
              );
            })
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {formData.target_ids.length} dipilih
        </p>
      </>
    )}
    
    {formErrors.target_ids && (
      <p className="text-red-500 text-sm mt-1">{formErrors.target_ids[0]}</p>
    )}
  </div>
)}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={handleCloseModal}
                disabled={submitLoading}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitLoading}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Draft'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedInformasi && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Detail Informasi</h2>
              <button onClick={handleCloseModal}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedInformasi.judul}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Dibuat: {formatDate(selectedInformasi.created_at)}</span>
                  {selectedInformasi.dikirim_at && (
                    <span>• Dikirim: {formatDate(selectedInformasi.dikirim_at)}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-${TARGET_TYPES[selectedInformasi.target_type]?.color}-100 text-${TARGET_TYPES[selectedInformasi.target_type]?.color}-700`}>
                  {TARGET_TYPES[selectedInformasi.target_type]?.label}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  selectedInformasi.status === 'terkirim'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {STATUS_TYPES[selectedInformasi.status]?.label}
                </span>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Konten</h4>
                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                  {selectedInformasi.konten}
                </div>
              </div>

              {/* File Lampiran dengan style konsisten seperti Izin/Lembur */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">File Lampiran</h4>
                {selectedInformasi.file_url ? (
                  <button
                    onClick={() => window.open(selectedInformasi.file_url, '_blank')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download {selectedInformasi.file_name || 'File Lampiran'}
                  </button>
                ) : (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <FileX className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Tidak Ada File Lampiran</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Informasi ini tidak memiliki file lampiran atau file telah dihapus dari sistem.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Target Penerima</h4>
                <p className="text-gray-700">{selectedInformasi.target_names}</p>
              </div>

              {selectedInformasi.status === 'terkirim' && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Statistik</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">{selectedInformasi.total_penerima}</div>
                      <div className="text-sm text-gray-600">Total Penerima</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">{selectedInformasi.total_dibaca}</div>
                      <div className="text-sm text-gray-600">Sudah Dibaca</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showPenerimaModal && selectedInformasi && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Daftar Penerima</h2>
                <p className="text-sm text-gray-600">{selectedInformasi.judul}</p>
              </div>
              <button onClick={handleCloseModal}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">NIK</th>
                    <th className="px-4 py-3 text-left">Nama</th>
                    <th className="px-4 py-3 text-left">Divisi</th>
                    <th className="px-4 py-3 text-left">Jabatan</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Dibaca</th>
                  </tr>
                </thead>
                <tbody>
                  {penerimaList.map((penerima, idx) => (
                    <tr key={penerima.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-3">{penerima.karyawan?.nik}</td>
                      <td className="px-4 py-3 font-medium">{penerima.karyawan?.nama}</td>
                      <td className="px-4 py-3">{penerima.karyawan?.divisi}</td>
                      <td className="px-4 py-3">{penerima.karyawan?.jabatan}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          penerima.is_read
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {penerima.is_read ? 'Sudah Dibaca' : 'Belum Dibaca'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {penerima.read_at ? formatDate(penerima.read_at) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Halaman {penerimaPage} dari {penerimaTotalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPenerimaPage(Math.max(1, penerimaPage - 1))}
                  disabled={penerimaPage === 1}
                  className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPenerimaPage(Math.min(penerimaTotalPages, penerimaPage + 1))}
                  disabled={penerimaPage === penerimaTotalPages}
                  className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Informasi;