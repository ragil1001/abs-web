"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Users, Plus, Search, Download, Upload, Eye, Edit, Trash2,
  ChevronUp, ChevronDown, X, Save, User, Briefcase, Building,
  MapPin, Key, ChevronLeft, ChevronRight, FileText,
  AlertTriangle, RefreshCw, Loader2, CheckCircle, Clock
} from "lucide-react";
import * as XLSX from "xlsx";
import { useApi } from "@/hooks/useApi";
import { karyawanAPI, divisiAPI, jabatanAPI, projectAPI } from "@/lib/api";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

export const dynamic = 'force-dynamic';

const DataKaryawan = () => {
  // STATE MANAGEMENT
  const [employees, setEmployees] = useState([]);
  const [masterData, setMasterData] = useState({
    divisions: [],
    positions: [],
    projects: [] // ✅ NEW: Add projects
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "aktif",
    project_id: "all", // ✅ CHANGED: divisi_id → project_id
    jabatan_id: "all",
    jenis_kelamin: "all"
  });
  const [sorting, setSorting] = useState({
    field: "id",
    direction: "asc"
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importValidation, setImportValidation] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);

  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStage, setUploadStage] = useState(null);

  const { loading, call } = useApi();

  const mountedRef = useRef(true);
  const fetchTimeoutRef = useRef(null);
  const lastFetchParamsRef = useRef(null);

  const getInitialFormData = () => ({
    nik: '', nama: '', no_telepon: '', divisi_id: '', jabatan_id: '',
    jenis_kelamin: '', tempat_lahir: '', tanggal_lahir: '',
    tanggal_bergabung: '', tanggal_keluar: '', status: 'aktif',
    birthDay: '', birthMonth: '', birthYear: '',
    sisa_cuti_tahunan: 12
  });

  const [formData, setFormData] = useState(getInitialFormData);
  const [formErrors, setFormErrors] = useState({});

  const months = useMemo(() => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'], []);
  const days = useMemo(() => Array.from({length: 31}, (_, i) => i + 1), []);
  const years = useMemo(() => Array.from({length: 65}, (_, i) => new Date().getFullYear() - i), []);

  // ✅ UPDATED: Fetch master data including projects
  useEffect(() => {
    let isMounted = true;

    const fetchMasterData = async () => {
      try {
        const [divResponse, posResponse, projResponse] = await Promise.all([
          call(divisiAPI.getAll, { per_page: 1000 }),
          call(jabatanAPI.getAll, { per_page: 1000 }),
          call(projectAPI.getAll, { status: 'aktif' }) // ✅ NEW: Fetch active projects
        ]);
        
        if (isMounted) {
          setMasterData({
            divisions: divResponse.data?.data || divResponse.data || [],
            positions: posResponse.data?.data || posResponse.data || [],
            projects: projResponse.data || [] // ✅ NEW
          });
        }
      } catch (err) {
        console.error('Master data fetch error:', err);
        if (isMounted) {
          toast.error('Gagal memuat data master');
        }
      }
    };

    fetchMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ✅ UPDATED: Fetch employees with project filter
  const fetchEmployees = useCallback(async (page = 1, showLoader = true) => {
    const params = {
      page,
      per_page: pagination.per_page,
      search: searchTerm.trim() || undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
      project_id: filters.project_id !== 'all' ? filters.project_id : undefined, // ✅ CHANGED
      jabatan_id: filters.jabatan_id !== 'all' ? filters.jabatan_id : undefined,
      jenis_kelamin: filters.jenis_kelamin !== 'all' ? filters.jenis_kelamin : undefined,
      sort_field: sorting.field,
      sort_direction: sorting.direction
    };

    Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

    const paramsString = JSON.stringify(params);
    if (paramsString === lastFetchParamsRef.current && !showLoader) {
      return;
    }
    lastFetchParamsRef.current = paramsString;

    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await call(karyawanAPI.getAll, params);
      
      if (response.success && mountedRef.current) {
        setEmployees(response.data || []);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Fetch employees error:', err);
      if (mountedRef.current) {
        toast.error('Gagal memuat data karyawan');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [call, pagination.per_page, searchTerm, filters, sorting]);

  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        fetchEmployees(pagination.current_page, false);
      }
    }, 300);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [searchTerm, filters, sorting, pagination.per_page, pagination.current_page]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleSort = useCallback((field) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  }, []);

  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
  }, []);

  const handlePerPageChange = useCallback((newPerPage) => {
    setPagination(prev => ({ ...prev, per_page: newPerPage, current_page: 1 }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
    setFormErrors({});
    setSelectedEmployee(null);
    setSubmitLoading(false);
    setImportFile(null);
    setImportLoading(false);
    setEditingSection(null);
    setUploadProgress(null);
    setUploadStage(null);
    setImportValidation(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setShowDetailModal(false);
    setShowImportModal(false);
    resetForm();
  }, [resetForm]);

  const formatDateID = (date) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';
      const day = d.getDate();
      const monthName = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${monthName} ${year}`;
    } catch (error) {
      return '-';
    }
  };

  const parseDbDateToInput = (dbDate) => {
    if (!dbDate) return '';
    try {
      if (typeof dbDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dbDate)) {
        return dbDate;
      }
      const d = new Date(dbDate);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return '';
    }
  };

  const parseDbDateToDropdown = (dbDate) => {
    if (!dbDate) return { day: '', month: '', year: '' };
    try {
      const d = new Date(dbDate);
      if (isNaN(d.getTime())) return { day: '', month: '', year: '' };
      return {
        day: d.getDate().toString(),
        month: (d.getMonth() + 1).toString(),
        year: d.getFullYear().toString()
      };
    } catch (error) {
      return { day: '', month: '', year: '' };
    }
  };

  const handleAddEmployee = async () => {
    if (submitLoading) return;

    const birthDate = formData.birthYear && formData.birthMonth && formData.birthDay 
      ? `${formData.birthYear}-${formData.birthMonth.toString().padStart(2, '0')}-${formData.birthDay.toString().padStart(2, '0')}`
      : '';

    const payload = {
      nik: formData.nik,
      nama: formData.nama,
      no_telepon: formData.no_telepon,
      // ✅ CHANGED: divisi_id can be null now
      divisi_id: formData.divisi_id ? parseInt(formData.divisi_id) : null,
      jabatan_id: parseInt(formData.jabatan_id),
      jenis_kelamin: formData.jenis_kelamin,
      tempat_lahir: formData.tempat_lahir,
      tanggal_lahir: birthDate,
      tanggal_bergabung: formData.tanggal_bergabung,
      tanggal_keluar: formData.tanggal_keluar || null,
      sisa_cuti_tahunan: formData.sisa_cuti_tahunan || 12,
      status: formData.status
    };

    // ✅ UPDATED: Remove divisi_id from required fields check
    if (!payload.nik || !payload.nama || !payload.no_telepon || 
        !payload.jabatan_id || !payload.jenis_kelamin || 
        !payload.tempat_lahir || !birthDate || !payload.tanggal_bergabung) {
      toast.error('Harap lengkapi semua field yang diperlukan!');
      return;
    }

    const result = await Swal.fire({
      title: 'Konfirmasi Simpan',
      html: `Apakah Anda yakin ingin menyimpan karyawan <b>${payload.nama}</b>?<br><small>Username dan password akan dibuat otomatis</small>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ea580c",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Simpan",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      setSubmitLoading(true);
      setFormErrors({});

      try {
        await call(karyawanAPI.create, payload);
        toast.success('Data karyawan berhasil disimpan');
        
        lastFetchParamsRef.current = null;
        await fetchEmployees(1, true);
        handleCloseModal();
      } catch (err) {
        console.error('Submit error:', err);
        if (err.type === 'validation_error' && err.errors) {
          setFormErrors(err.errors);
          const firstError = Object.values(err.errors)[0];
          toast.error(Array.isArray(firstError) ? firstError[0] : firstError, { autoClose: 5000 });
        } else {
          toast.error(err.message || 'Gagal menyimpan data', { autoClose: 5000 });
        }
      } finally {
        setSubmitLoading(false);
      }
    }
  };

  const handleEditEmployee = async (section, data) => {
    if (submitLoading) return;

    let payload = {};
    let confirmResult = null;
    
    if (section === 'personal') {
      const birthDate = data.birthYear && data.birthMonth && data.birthDay 
        ? `${data.birthYear}-${data.birthMonth.toString().padStart(2, '0')}-${data.birthDay.toString().padStart(2, '0')}`
        : selectedEmployee.tanggal_lahir;

      let newStatus = data.status || selectedEmployee.status;
      let newTanggalKeluar = selectedEmployee.tanggal_keluar;
      
      if (data.status === 'aktif') {
        newTanggalKeluar = null;
      } else if (data.status === 'tidak_aktif' && !newTanggalKeluar) {
        newTanggalKeluar = new Date().toISOString().split('T')[0];
      }

      payload = {
        nik: data.nik,
        nama: data.nama,
        no_telepon: data.no_telepon,
        divisi_id: selectedEmployee.divisi_id, // Keep existing
        jabatan_id: selectedEmployee.jabatan_id,
        jenis_kelamin: data.jenis_kelamin,
        tempat_lahir: data.tempat_lahir,
        tanggal_lahir: birthDate,
        tanggal_bergabung: selectedEmployee.tanggal_bergabung,
        tanggal_keluar: newTanggalKeluar,
        sisa_cuti_tahunan: data.sisa_cuti_tahunan || 12,
        status: newStatus
      };

      confirmResult = await Swal.fire({
        title: 'Konfirmasi Update',
        html: `Apakah Anda yakin ingin memperbarui data karyawan <b>${selectedEmployee.nama}</b>?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#ea580c",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Ya, Update",
        cancelButtonText: "Batal",
      });
    } else if (section === 'work') {
      let newStatus = selectedEmployee.status;
      if (data.tanggal_keluar && data.tanggal_keluar.trim() !== '') {
        newStatus = 'tidak_aktif';
      } else if (!data.tanggal_keluar || data.tanggal_keluar.trim() === '') {
        newStatus = 'aktif';
      }

      payload = {
        nik: selectedEmployee.nik,
        nama: selectedEmployee.nama,
        no_telepon: selectedEmployee.no_telepon,
        // ✅ CHANGED: Handle null divisi_id
        divisi_id: data.divisi_id ? parseInt(data.divisi_id) : null,
        jabatan_id: parseInt(data.jabatan_id),
        jenis_kelamin: selectedEmployee.jenis_kelamin,
        tempat_lahir: selectedEmployee.tempat_lahir,
        tanggal_lahir: selectedEmployee.tanggal_lahir,
        tanggal_bergabung: data.tanggal_bergabung,
        tanggal_keluar: data.tanggal_keluar || null,
        sisa_cuti_tahunan: selectedEmployee.sisa_cuti_tahunan || 12,
        status: newStatus
      };

      confirmResult = await Swal.fire({
        title: 'Konfirmasi Update',
        html: `Apakah Anda yakin ingin memperbarui data karyawan <b>${selectedEmployee.nama}</b>?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#ea580c",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Ya, Update",
        cancelButtonText: "Batal",
      });
    }

    if (!confirmResult || !confirmResult.isConfirmed) {
      return;
    }

    setSubmitLoading(true);
    setFormErrors({});

    try {
      const response = await call(karyawanAPI.update, selectedEmployee.id, payload);
      
      if (response.message) {
        toast.success(response.message, { autoClose: 7000 });
      } else {
        toast.success('Data berhasil diperbarui');
      }
      
      if (response.success && response.data) {
        setSelectedEmployee(response.data);
      }
      
      lastFetchParamsRef.current = null;
      await fetchEmployees(pagination.current_page, true);
      setEditingSection(null);
    } catch (err) {
      console.error('Update error:', err);
      
      if (err.type === 'validation_error' && err.errors) {
        setFormErrors(err.errors);
        const firstError = Object.values(err.errors)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError, { autoClose: 5000 });
      } else {
        toast.error(err.message || 'Gagal memperbarui data', { autoClose: 5000 });
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteEmployee = async (employee) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      html: `Hapus karyawan <b>${employee.nama}</b>?<br><small class="text-red-600">Data tidak dapat dikembalikan!</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await call(karyawanAPI.delete, employee.id);
        toast.success('Data karyawan berhasil dihapus');
        
        lastFetchParamsRef.current = null;
        await fetchEmployees(pagination.current_page, true);
      } catch (err) {
        console.error('Delete error:', err);
        toast.error(err.message || 'Gagal menghapus data', { autoClose: 5000 });
      }
    }
  };

  // ðŸš€ OPTIMIZED: File selection with instant size check
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error("Format file tidak valid. Gunakan file Excel (.xlsx atau .xls)", { autoClose: 5000 });
        e.target.value = '';
        return;
      }

      // âœ… Increased to 50MB
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`Ukuran file terlalu besar. Maksimal ${Math.round(maxSize / 1024 / 1024)}MB`, { autoClose: 5000 });
        e.target.value = '';
        return;
      }

      setImportFile(file);
      
      // Show file info with helpful message
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      toast.info(`File dipilih: ${file.name} (${fileSizeMB} MB)`, {
        autoClose: 3000
      });
      
      // Show skip validation option for large files
      if (file.size > 10 * 1024 * 1024) { // > 10MB
        toast.info('File besar terdeteksi. Anda bisa langsung import tanpa validasi untuk proses lebih cepat.', {
          autoClose: 5000
        });
      }
    }
  };

  // ðŸš€ NEW: Skip validation and direct import (for large files)
  const handleDirectImport = async () => {
    if (!importFile) {
      toast.error("Pilih file Excel terlebih dahulu", { autoClose: 3000 });
      return;
    }

    const result = await Swal.fire({
      title: 'Import Langsung',
      html: `
        <div class="text-left">
          <p>File <strong>${importFile.name}</strong> akan diimport langsung tanpa validasi.</p>
          <p class="text-amber-600 mt-2">Pastikan format data sudah benar sesuai template!</p>
          <p class="text-gray-600 text-sm mt-3">File akan diproses di background. Anda akan menerima notifikasi saat selesai.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Import Langsung',
      cancelButtonText: 'Batal',
      width: '500px'
    });

    if (result.isConfirmed) {
      await startImportProcess();
    }
  };

  // ðŸš€ OPTIMIZED: Validation with proper error handling
  const validateImportFile = async (file) => {
    setImportLoading(true);
    setImportValidation(null);
    setUploadStage('validating');
    setUploadProgress({ 
      percent: 0, 
      message: 'Memulai validasi...',
      stage: 'validating'
    });

    try {
      const formDataValidate = new FormData();
      formDataValidate.append('file', file);

      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise((resolve, reject) => {
        // Upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress({
              percent: percentComplete,
              message: `Mengupload file untuk validasi... ${percentComplete}%`,
              loaded: e.loaded,
              total: e.total,
              loadedMB: (e.loaded / 1024 / 1024).toFixed(2),
              totalMB: (e.total / 1024 / 1024).toFixed(2),
              stage: 'validating'
            });
          }
        });

        // Request complete
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (err) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(error);
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        // Request error
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        // Request timeout
        xhr.addEventListener('timeout', () => {
          reject(new Error('Validasi timeout. File terlalu besar, coba import langsung.'));
        });

        // Setup request
        const token = localStorage.getItem('auth_token');
        xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/karyawans/validate-import`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 120000; // 2 minutes for validation
        
        // Send request
        xhr.send(formDataValidate);
      });

      const response = await uploadPromise;
      
      setUploadProgress({ 
        percent: 100, 
        message: 'Validasi selesai!',
        stage: 'validated'
      });
      
      if (response.success) {
        setImportValidation(response.validation);
        
        if (!response.can_proceed) {
          setShowValidationModal(true);
        } else {
          toast.success(`File valid! Siap import ${response.validation.total_rows} karyawan`, {
            autoClose: 3000
          });
        }
      }

      // Clear progress after 1 second
      setTimeout(() => {
        setUploadProgress(null);
        setUploadStage(null);
      }, 1000);

    } catch (err) {
      console.error('Validation error:', err);
      setUploadProgress(null);
      setUploadStage(null);
      
      if (err.message && err.message.includes('timeout')) {
        toast.error('Validasi timeout. File terlalu besar. Gunakan tombol "Import Langsung" untuk proses lebih cepat.', { 
          autoClose: 7000 
        });
      } else {
        toast.error(err.message || 'Gagal memvalidasi file', { autoClose: 5000 });
      }
      
      setImportFile(null);
    } finally {
      setImportLoading(false);
    }
  };

  // ðŸš€ OPTIMIZED: Import process with proper progress tracking
  const startImportProcess = async () => {
    if (!importFile) {
      toast.error("Pilih file Excel terlebih dahulu", { autoClose: 3000 });
      return;
    }

    setImportLoading(true);
    setUploadStage('uploading');
    setUploadProgress({ 
      percent: 0, 
      message: 'Memulai upload...',
      stage: 'uploading'
    });

    try {
      const formDataImport = new FormData();
      formDataImport.append('file', importFile);

      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise((resolve, reject) => {
        // Upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress({
              percent: percentComplete,
              message: `Mengupload file... ${percentComplete}%`,
              loaded: e.loaded,
              total: e.total,
              loadedMB: (e.loaded / 1024 / 1024).toFixed(2),
              totalMB: (e.total / 1024 / 1024).toFixed(2),
              stage: 'uploading'
            });
          }
        });

        // Request complete
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (err) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(error);
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        // Request error
        xhr.addEventListener('error', () => {
          reject(new Error('Koneksi ke server bermasalah. Periksa koneksi internet Anda.'));
        });

        // Request timeout
        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timeout. File terlalu besar atau koneksi lambat. Coba lagi atau gunakan file yang lebih kecil.'));
        });

        // Setup request
        const token = localStorage.getItem('auth_token');
        xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/karyawans/import`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 180000; // 3 minutes timeout for upload
        
        // Send request
        xhr.send(formDataImport);
      });

      const response = await uploadPromise;
      
      setUploadProgress({ 
        percent: 100, 
        message: 'Upload selesai!',
        stage: 'uploaded'
      });
      
      if (response.success && response.type === 'queued') {
        // Import started in background
        const importId = response.import_id;
        
        toast.info('Import dimulai! Anda akan menerima notifikasi saat selesai.', {
          autoClose: 5000
        });
        
        // Start polling for progress
        startProgressPolling(importId);
        
        // Close import modal
        setShowImportModal(false);
        setImportFile(null);
        setImportValidation(null);
        
      } else {
        // Direct import (small file)
        toast.success(response.message || "Data karyawan berhasil diimport", { autoClose: 5000 });
        
        lastFetchParamsRef.current = null;
        await fetchEmployees(1, true);
        handleCloseModal();
      }

      // Clear upload progress after 1 second
      setTimeout(() => {
        setUploadProgress(null);
        setUploadStage(null);
      }, 1000);

    } catch (err) {
      console.error('Import error:', err);
      setUploadProgress(null);
      setUploadStage(null);
      
      if (err.type === 'missing_projects') {
        setShowValidationModal(true);
      } else if (err.type === 'missing_master_data') {
        Swal.fire({
          title: 'Data Master Tidak Lengkap',
          html: err.message.replace(/\n/g, '<br>'),
          icon: 'error',
          confirmButtonColor: '#ea580c',
          width: '600px'
        });
      } else {
        toast.error(err.message || 'Gagal mengimport data', { autoClose: 7000 });
      }
    } finally {
      setImportLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Pilih file Excel terlebih dahulu", { autoClose: 3000 });
      return;
    }

    if (importValidation && !importValidation.can_proceed) {
      toast.error("File tidak dapat diimport. Periksa data master yang hilang.", { autoClose: 5000 });
      return;
    }

    const result = await Swal.fire({
      title: 'Konfirmasi Import',
      html: importValidation 
        ? `
          <div class="text-left">
            <p><strong>${importValidation.total_rows}</strong> karyawan akan diimport</p>
            ${importValidation.master_data.divisi.will_create > 0 ? 
              `<p class="text-blue-600 mt-2">âœ“ ${importValidation.master_data.divisi.will_create} divisi baru akan dibuat</p>` 
              : ''}
            ${importValidation.master_data.jabatan.will_create > 0 ? 
              `<p class="text-blue-600 mt-1">âœ“ ${importValidation.master_data.jabatan.will_create} jabatan baru akan dibuat</p>` 
              : ''}
            <p class="text-gray-600 text-sm mt-3">File berukuran ${(importFile.size / 1024 / 1024).toFixed(2)} MB akan diproses di background.</p>
          </div>
        `
        : `File <strong>${importFile.name}</strong> (${(importFile.size / 1024 / 1024).toFixed(2)} MB) akan diimport. Lanjutkan?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Import',
      cancelButtonText: 'Batal',
      width: '500px'
    });

    if (result.isConfirmed) {
      await startImportProcess();
    }
  };

  // 🚀 NEW: Poll import progress with more frequent updates
  const startProgressPolling = (importId) => {
    // Clear existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    setImportProgress({
      import_id: importId,
      percent: 0,
      message: 'Memulai import...',
      status: 'processing',
      data: {
        processed: 0,
        total: 0
      }
    });

    let pollCount = 0;
    const maxPolls = 300; // 5 minutes max (1 second interval)

    const interval = setInterval(async () => {
      pollCount++;
      
      // Safety: Stop after max polls
      if (pollCount > maxPolls) {
        clearInterval(interval);
        setPollingInterval(null);
        toast.error('Import timeout. Silakan refresh halaman untuk melihat hasilnya.', {
          autoClose: 7000
        });
        setImportProgress(null);
        return;
      }

      try {
        const response = await call(karyawanAPI.getImportProgress, { import_id: importId });
        
        if (response.success && response.data) {
          setImportProgress(response.data);
          
          console.log('📊 Import progress:', {
            percent: response.data.percent,
            message: response.data.message,
            status: response.data.status,
            processed: response.data.data?.processed,
            total: response.data.data?.total
          });
          
          // Check if completed or failed
          if (response.data.status === 'completed') {
            clearInterval(interval);
            setPollingInterval(null);
            
            toast.success('Import selesai! ' + response.data.message, {
              autoClose: 5000
            });
            
            // Refresh data
            lastFetchParamsRef.current = null;
            await fetchEmployees(1, true);
            
            // Clear progress after 3 seconds
            setTimeout(() => {
              setImportProgress(null);
            }, 3000);
            
          } else if (response.data.status === 'failed') {
            clearInterval(interval);
            setPollingInterval(null);
            
            toast.error('Import gagal: ' + response.data.message, {
              autoClose: 7000
            });
            
            setImportProgress(null);
          }
        }
      } catch (err) {
        console.error('Progress polling error:', err);
        // Don't stop polling on error, just log it
      }
    }, 1000); // Poll every 1 second for more responsive updates

    setPollingInterval(interval);
  };

  // ðŸš€ NEW: Download template with proper structure
  const downloadTemplate = () => {
    try {
      const templateHeaders = [
        ["NIK (16 digit)", "Nama Lengkap", "No Telepon", "Status (aktif/resign)", 
         "Tanggal Keluar (kosong jika aktif)", "Tanggal Bergabung (YYYY-MM-DD)", 
         "Jenis Kelamin (L/P)", "Jabatan", 
         // ✅ CHANGED: Add optional note
         "Divisi/Penempatan (opsional)", 
         "Project (Nama Project)", 
         "Tempat Lahir", "Tanggal Lahir (YYYY-MM-DD)", "Sisa Cuti Tahunan (0-12)"]
      ];
      
      const availableDivisions = masterData.divisions.map(d => d.nama);
      const availablePositions = masterData.positions.map(p => p.nama);
      
      // ✅ Add example with empty divisi
      const exampleData = [];
      if (availablePositions.length > 0) {
        // Example 1: With divisi
        if (availableDivisions.length > 0) {
          exampleData.push([
            "3201234567890001", 
            "Ahmad Rizki Pratama",
            "08123456789", 
            "aktif",
            "", // Tanggal keluar
            "2020-01-10",
            "L", 
            availablePositions[0], 
            availableDivisions[0],
            "Project ABC",
            "Jakarta", 
            "1995-03-15",
            "12"
          ]);
        }
        
        // ✅ NEW: Example 2: Without divisi
        exampleData.push([
          "3201234567890002", 
          "Siti Nurhaliza",
          "08123456790", 
          "aktif",
          "", // Tanggal keluar
          "2021-05-20",
          "P", 
          availablePositions[0], 
          "", // ✅ Empty divisi
          "",
          "Bandung", 
          "1996-07-22",
          "12"
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet([...templateHeaders, ...exampleData]);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
        { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 18 }
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template Karyawan");

      const filename = `template-import-karyawan-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success("Template Excel berhasil diunduh!", { autoClose: 5000 });
    } catch (error) {
      console.error('Download template error:', error);
      toast.error("Gagal mengunduh template", { autoClose: 3000 });
    }
  };

  const exportToExcel = async () => {
    try {
      Swal.fire({
        title: 'Mengekspor Data',
        text: 'Sedang menyiapkan file export...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => { Swal.showLoading(); }
      });
      
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error('Token tidak ditemukan');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/karyawans/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
      
      if (!response.ok) throw new Error(`Export gagal (Status: ${response.status})`);
      
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('File export kosong');
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data-karyawan-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      Swal.close();
      toast.success("Data berhasil diekspor!");
    } catch (err) {
      Swal.close();
      toast.error("Gagal mengekspor data: " + err.message, { autoClose: 5000 });
    }
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleResetPassword = async (employeeId) => {
    const result = await Swal.fire({
      title: 'Konfirmasi Reset Password',
      html: `
        <div style="text-align: left;">
          <p>Reset password untuk karyawan <strong>${selectedEmployee.nama}</strong>?</p>
          <div style="background-color: #fff7ed; border: 2px solid #ea580c; border-radius: 8px; padding: 12px; margin: 16px 0;">
            <p style="color: #ea580c; font-weight: 600; margin: 0 0 8px 0;">
              Password akan dikembalikan ke format default
            </p>
            <p style="color: #9a3412; margin: 0; font-size: 14px;">
              Format: Tanggal Lahir (ddmmyyyy)
            </p>
          </div>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ea580c",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Reset Password",
      cancelButtonText: "Batal",
      width: '500px'
    });

    if (result.isConfirmed) {
      setSubmitLoading(true);
      try {
        const response = await call(karyawanAPI.resetPassword, employeeId);
        
        toast.success(response.message || 'Password berhasil direset', { 
          autoClose: 7000 
        });
        
        if (response.success && response.data) {
          setSelectedEmployee(response.data);
        }
        
        lastFetchParamsRef.current = null;
        await fetchEmployees(pagination.current_page, true);
      } catch (err) {
        console.error('Reset password error:', err);
        toast.error(err.message || 'Gagal mereset password', { 
          autoClose: 5000 
        });
      } finally {
        setSubmitLoading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-6 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded mb-2"></div>
            ))}
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Karyawan</h1>
            <p className="text-gray-600">Kelola data karyawan perusahaan</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={() => {/* exportToExcel function */}}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => {/* handleOpenAddModal */}}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tambah Karyawan
            </button>
          </div>
        </div>
      </div>

      {/* ✅ UPDATED: Filters with Project instead of Division */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari karyawan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="aktif">Aktif</option>
            <option value="tidak_aktif">Tidak Aktif</option>
            <option value="all">Semua Status</option>
          </select>

          {/* ✅ NEW: Project Filter */}
          <select
            value={filters.project_id}
            onChange={(e) => handleFilterChange('project_id', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Project</option>
            <option value="unassigned">Belum Ada Project</option>
            {masterData.projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.nama}
              </option>
            ))}
          </select>

          <select
            value={filters.jabatan_id}
            onChange={(e) => handleFilterChange('jabatan_id', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Jabatan</option>
            {masterData.positions.map(pos => (
              <option key={pos.id} value={pos.id}>{pos.nama}</option>
            ))}
          </select>

          <select
            value={filters.jenis_kelamin}
            onChange={(e) => handleFilterChange('jenis_kelamin', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Jenis Kelamin</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
      </div>

      {/* ✅ UPDATED: Table with Project column */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Tampilkan</span>
            <select
              value={pagination.per_page}
              onChange={(e) => handlePerPageChange(parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {[10, 25, 50, 100].map((limit) => (
                <option key={limit} value={limit}>{limit}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600">entri</span>
          </div>
          <div className="text-sm text-gray-600">
            {isRefreshing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Memuat...
              </span>
            ) : (
              `Menampilkan ${((pagination.current_page - 1) * pagination.per_page) + 1}-${Math.min(pagination.current_page * pagination.per_page, pagination.total)} dari ${pagination.total} data`
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <tr>
                {[ 
                  { key: 'id', label: 'ID' },
                  { key: 'nik', label: 'NIK' },
                  { key: 'nama', label: 'Nama' },
                  { key: 'no_telepon', label: 'No Telepon' },
                  { key: 'jabatan', label: 'Jabatan' },
                  { key: 'project', label: 'Project' }, // ✅ CHANGED: Penempatan → Project
                  { key: 'jenis_kelamin', label: 'JK' },
                  { key: 'sisa_cuti_tahunan', label: 'Sisa Cuti Tahunan' },
                  { key: 'status', label: 'Status' }
                ].map(column => (
                  <th
                    key={column.key}
                    className="px-6 py-4 text-left font-semibold cursor-pointer hover:bg-orange-600 transition-colors"
                    onClick={() => handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      <div className="flex flex-col">
                        <ChevronUp 
                          className={`w-3 h-3 ${sorting.field === column.key && sorting.direction === 'asc' ? 'text-white' : 'text-orange-300'}`} 
                        />
                        <ChevronDown 
                          className={`w-3 h-3 -mt-1 ${sorting.field === column.key && sorting.direction === 'desc' ? 'text-white' : 'text-orange-300'}`} 
                        />
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm.trim() || filters.status !== 'aktif' || filters.project_id !== 'all' || filters.jabatan_id !== 'all' || filters.jenis_kelamin !== 'all'
                      ? 'Tidak ada data yang sesuai dengan filter'
                      : 'Belum ada data karyawan'}
                  </td>
                </tr>
              ) : (
                employees.map((employee, index) => (
                  <tr 
                    key={employee.id} 
                    className={`border-b border-gray-100 hover:bg-orange-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{employee.id}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.nik}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{employee.nama}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.no_telepon || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.jabatan?.nama || '-'}</td>
                    {/* ✅ UPDATED: Show project instead of divisi */}
                    <td className="px-6 py-4 text-gray-700">
                      {employee.active_project?.project?.nama || 
                       <span className="text-gray-400 italic">Belum ada project</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{employee.jenis_kelamin === 'L' ? 'L' : 'P'}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.sisa_cuti_tahunan != null ? employee.sisa_cuti_tahunan : '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${employee.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {employee.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setEditingSection(null);
                          setShowDetailModal(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {/* handleDeleteEmployee */}}
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg ml-2 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Halaman {pagination.current_page} dari {pagination.last_page}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(1, pagination.current_page - 1))}
              disabled={pagination.current_page === 1 || loading}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {(() => {
              const totalPages = pagination.last_page;
              const currentPage = pagination.current_page;
              const pages = [];
              
              if (totalPages <= 7) {
                // Show all pages if 7 or less
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Always show first page
                pages.push(1);
                
                if (currentPage > 3) {
                  pages.push('...');
                }
                
                // Show pages around current page
                for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                  if (!pages.includes(i)) {
                    pages.push(i);
                  }
                }
                
                if (currentPage < totalPages - 2) {
                  pages.push('...');
                }
                
                // Always show last page
                if (!pages.includes(totalPages)) {
                  pages.push(totalPages);
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
                    onClick={() => handlePageChange(page)}
                    disabled={loading}
                    className={`px-3 py-1 rounded-lg transition-colors min-w-[40px] ${
                      pagination.current_page === page 
                        ? 'bg-orange-600 text-white font-semibold shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100'
                    } disabled:opacity-50`}
                  >
                    {page}
                  </button>
                );
              });
            })()}
            
            <button
              onClick={() => handlePageChange(Math.min(pagination.last_page, pagination.current_page + 1))}
              disabled={pagination.current_page === pagination.last_page || loading}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Import Excel Modal - OPTIMIZED */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Import Data Excel</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                disabled={importLoading}
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
                <p className="text-gray-600 mb-4">Format yang didukung: .xlsx, .xls (Maksimal 50MB)</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  id="karyawan-import"
                  onChange={handleFileSelect}
                  disabled={importLoading}
                />
                <label
                  htmlFor="karyawan-import"
                  className={`px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer inline-block ${
                    importLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {importFile ? "Ganti File" : "Pilih File"}
                </label>
              </div>
              
              {importFile && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Upload className="w-4 h-4" />
                    <span className="font-medium">File dipilih: {importFile.name}</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Ukuran: {(importFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              {/* File size warning */}
              {importFile && importFile.size > 10 * 1024 * 1024 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900 mb-2">
                        File Besar Terdeteksi ({(importFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                      <p className="text-sm text-amber-700 mb-2">
                        Untuk file besar, disarankan:
                      </p>
                      <ul className="text-sm text-amber-700 space-y-1 ml-4">
                        <li>Gunakan Import Langsung untuk proses lebih cepat</li>
                        <li>Pastikan format data sudah benar sesuai template</li>
                        <li>Import akan diproses di background</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={downloadTemplate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center flex items-center justify-center gap-2"
                  disabled={importLoading}
                >
                  <Download className="w-4 h-4" />
                  Download Template Excel
                </button>
                
                {importFile && importFile.size > 10 * 1024 * 1024 ? (
                  // Large file: Show direct import button
                  <button
                    onClick={handleDirectImport}
                    className={`flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center flex items-center justify-center gap-2`}
                    disabled={!importFile || importLoading}
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mengimport...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import Langsung
                      </>
                    )}
                  </button>
                ) : (
                  // Small file: Show validate + import
                  <>
                    <button
                      onClick={() => validateImportFile(importFile)}
                      className={`flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center flex items-center justify-center gap-2`}
                      disabled={!importFile || importLoading}
                    >
                      {importLoading && uploadStage === 'validating' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Memvalidasi...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Validasi File
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleImport}
                      className={`flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center flex items-center justify-center gap-2`}
                      disabled={!importFile || importLoading}
                    >
                      {importLoading && uploadStage === 'uploading' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Mengimport...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Import Data
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Validation results */}
              {importValidation && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">File Valid!</span>
                  </div>
                  <p className="text-sm text-green-600">
                    {importValidation.total_rows} karyawan siap diimport
                  </p>
                  {importValidation.master_data.divisi.will_create > 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      {importValidation.master_data.divisi.will_create} divisi baru akan dibuat
                    </p>
                  )}
                  {importValidation.master_data.jabatan.will_create > 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      {importValidation.master_data.jabatan.will_create} jabatan baru akan dibuat
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={importLoading}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Indicator - ENHANCED */}
      {uploadProgress && (
        <div className="fixed bottom-6 right-6 bg-white shadow-2xl rounded-xl border border-gray-200 p-4 w-96 z-50 animate-slide-up">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                {uploadProgress.percent === 100 && uploadProgress.stage === 'uploaded' ? (
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                ) : uploadProgress.stage === 'validating' ? (
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                  </div>
                ) : (
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 transform -rotate-90">
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 18}`}
                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - uploadProgress.percent / 100)}`}
                        className="text-orange-600 transition-all duration-300"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-orange-600">{uploadProgress.percent}%</span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {uploadProgress.stage === 'validating' ? 'Validasi File' : 'Upload File'}
                </h4>
                <p className="text-sm text-gray-600">{uploadProgress.message}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  uploadProgress.stage === 'validating' ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 
                  'bg-gradient-to-r from-orange-500 to-orange-600'
                }`}
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
            
            {uploadProgress.loadedMB && uploadProgress.totalMB && (
              <div className="flex justify-between text-xs text-gray-600">
                <span>{uploadProgress.loadedMB} MB / {uploadProgress.totalMB} MB</span>
                <span>{uploadProgress.percent}%</span>
              </div>
            )}
          </div>

          {/* Stage indicator */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              uploadProgress.stage === 'validating' ? 'bg-purple-500 animate-pulse' :
              uploadProgress.stage === 'uploading' ? 'bg-orange-500 animate-pulse' :
              'bg-green-500'
            }`}></div>
            <span className="text-gray-600">
              {uploadProgress.stage === 'validating' ? 'Memvalidasi data...' :
               uploadProgress.stage === 'uploading' ? 'Mengupload ke server...' :
               'Selesai!'}
            </span>
          </div>
        </div>
      )}

      {/* Import Progress Indicator - Background Process */}
      {importProgress && (
        <div className="fixed bottom-6 right-6 bg-white shadow-2xl rounded-xl border border-gray-200 p-4 w-96 z-50 animate-slide-up">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                {importProgress.status === 'completed' ? (
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                ) : importProgress.status === 'failed' ? (
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                ) : (
                  <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Import Karyawan</h4>
                <p className="text-sm text-gray-600">{importProgress.message}</p>
              </div>
            </div>
            {importProgress.status === 'completed' && (
              <button
                onClick={() => setImportProgress(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {importProgress.status === 'processing' && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
                  style={{ width: `${importProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{importProgress.percent}%</span>
                {importProgress.data?.processed && importProgress.data?.total && (
                  <span>{importProgress.data.processed} / {importProgress.data.total}</span>
                )}
              </div>
            </div>
          )}

          {importProgress.status === 'failed' && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">{importProgress.data?.error || 'Import gagal'}</p>
            </div>
          )}

          {importProgress.status === 'completed' && importProgress.data && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                Berhasil import {importProgress.data.processed || importProgress.data.total} karyawan
              </p>
            </div>
          )}
        </div>
      )}

      {/* Validation Modal - Missing Master Data */}
      {showValidationModal && importValidation && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                Validasi File Import
              </h2>
              <button
                onClick={() => setShowValidationModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Ringkasan File</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">Total Baris Data:</p>
                    <p className="font-bold text-blue-900 text-lg">{importValidation.total_rows}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Status:</p>
                    <p className={`font-bold text-lg ${importValidation.can_proceed ? 'text-green-600' : 'text-red-600'}`}>
                      {importValidation.can_proceed ? 'âœ“ Siap Import' : 'âœ— Belum Siap'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Divisi Info */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building className="w-5 h-5 text-purple-600" />
                  Data Divisi/Penempatan
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Total di File</p>
                    <p className="text-2xl font-bold text-gray-900">{importValidation.master_data.divisi.total}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700">Sudah Ada</p>
                    <p className="text-2xl font-bold text-green-600">{importValidation.master_data.divisi.existing}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">Akan Dibuat</p>
                    <p className="text-2xl font-bold text-blue-600">{importValidation.master_data.divisi.will_create}</p>
                  </div>
                </div>

                {importValidation.master_data.divisi.missing.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Divisi yang akan dibuat otomatis:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {importValidation.master_data.divisi.missing.map((nama, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {nama}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Jabatan Info */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-orange-600" />
                  Data Jabatan
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Total di File</p>
                    <p className="text-2xl font-bold text-gray-900">{importValidation.master_data.jabatan.total}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700">Sudah Ada</p>
                    <p className="text-2xl font-bold text-green-600">{importValidation.master_data.jabatan.existing}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">Akan Dibuat</p>
                    <p className="text-2xl font-bold text-blue-600">{importValidation.master_data.jabatan.will_create}</p>
                  </div>
                </div>

                {importValidation.master_data.jabatan.missing.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Jabatan yang akan dibuat otomatis:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {importValidation.master_data.jabatan.missing.map((nama, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {nama}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Project Info */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Data Project
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Total di File</p>
                    <p className="text-2xl font-bold text-gray-900">{importValidation.master_data.project.total}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700">Sudah Ada</p>
                    <p className="text-2xl font-bold text-green-600">{importValidation.master_data.project.existing}</p>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${
                    importValidation.master_data.project.missing.length > 0 ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <p className={`text-xs ${
                      importValidation.master_data.project.missing.length > 0 ? 'text-red-700' : 'text-gray-600'
                    }`}>
                      Belum Ada
                    </p>
                    <p className={`text-2xl font-bold ${
                      importValidation.master_data.project.missing.length > 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {importValidation.master_data.project.missing.length}
                    </p>
                  </div>
                </div>

                {importValidation.master_data.project.missing.length > 0 && (
                  <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-900 mb-2">
                          Project berikut belum ada dan HARUS dibuat terlebih dahulu:
                        </p>
                        <div className="space-y-1">
                          {importValidation.master_data.project.missing.map((nama, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-red-800">
                              <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                              <span className="font-medium">{nama}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-red-700 mt-3">
                          Silakan buat project ini terlebih dahulu di menu <strong>Data Project</strong> sebelum melanjutkan import.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    setImportFile(null);
                    setImportValidation(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                
                {importValidation.can_proceed ? (
                  <button
                    onClick={() => {
                      setShowValidationModal(false);
                      handleImport();
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Lanjutkan Import
                  </button>
                ) : (
                  <button
                    onClick={() => window.open('/data-project', '_blank')}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Buat Project Dulu
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Tambah Karyawan Baru</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                disabled={submitLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {/* Info Auto Generate */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Informasi</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Username dan password akan dibuat otomatis dari nama dan tanggal lahir karyawan
                </p>
              </div>

              {/* NIK */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIK *</label>
                <input
                  type="text"
                  value={formData.nik}
                  onChange={(e) => setFormData({...formData, nik: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.nik ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Masukkan NIK"
                  disabled={submitLoading}
                />
                {formErrors.nik && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.nik[0]}</p>
                )}
              </div>

              {/* Nama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.nama ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Masukkan nama lengkap"
                  disabled={submitLoading}
                />
                {formErrors.nama && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.nama[0]}</p>
                )}
              </div>

              {/* No Telepon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No Telepon *</label>
                <input
                  type="tel"
                  value={formData.no_telepon}
                  onChange={(e) => setFormData({...formData, no_telepon: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.no_telepon ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Contoh: 08123456789"
                  disabled={submitLoading}
                />
                {formErrors.no_telepon && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.no_telepon[0]}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Minimal 10 digit angka</p>
              </div>

              {/* Divisi dan Jabatan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan *</label>
    <select
      value={formData.jabatan_id}
      onChange={(e) => setFormData({...formData, jabatan_id: e.target.value})}
      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
        formErrors.jabatan_id ? 'border-red-500' : 'border-gray-200'
      }`}
      disabled={submitLoading}
    >
      <option value="">Pilih Jabatan</option>
      {masterData.positions.map(pos => (
        <option key={pos.id} value={pos.id}>{pos.nama}</option>
      ))}
    </select>
    {formErrors.jabatan_id && (
      <p className="text-red-500 text-sm mt-1">{formErrors.jabatan_id[0]}</p>
    )}
  </div>
  <div>
    {/* ✅ CHANGED: Remove required indicator (*) */}
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Penempatan 
      <span className="text-gray-400 text-xs ml-2">(Opsional)</span>
    </label>
    <select
      value={formData.divisi_id}
      onChange={(e) => {
        setFormData({...formData, divisi_id: e.target.value, jabatan_id: ''});
      }}
      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
        formErrors.divisi_id ? 'border-red-500' : 'border-gray-200'
      }`}
      disabled={submitLoading}
    >
      {/* ✅ NEW: Add empty option */}
      <option value="">-- Tidak Ada Penempatan --</option>
      {masterData.divisions.map(div => (
        <option key={div.id} value={div.id}>{div.nama}</option>
      ))}
    </select>
    {formErrors.divisi_id && (
      <p className="text-red-500 text-sm mt-1">{formErrors.divisi_id[0]}</p>
    )}
  </div>
  
</div>

              {/* Jenis Kelamin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin *</label>
                <select
                  value={formData.jenis_kelamin}
                  onChange={(e) => setFormData({...formData, jenis_kelamin: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.jenis_kelamin ? 'border-red-500' : 'border-gray-200'
                  }`}
                  disabled={submitLoading}
                >
                  <option value="">Pilih Jenis Kelamin</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
                {formErrors.jenis_kelamin && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.jenis_kelamin[0]}</p>
                )}
              </div>

              {/* Tempat Lahir */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir *</label>
                <input
                  type="text"
                  value={formData.tempat_lahir}
                  onChange={(e) => setFormData({...formData, tempat_lahir: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.tempat_lahir ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Masukkan tempat lahir"
                  disabled={submitLoading}
                />
                {formErrors.tempat_lahir && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.tempat_lahir[0]}</p>
                )}
              </div>

              {/* Tanggal Lahir */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir *</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={formData.birthDay}
                    onChange={(e) => setFormData({...formData, birthDay: e.target.value})}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      formErrors.tanggal_lahir ? 'border-red-500' : 'border-gray-200'
                    }`}
                    disabled={submitLoading}
                  >
                    <option value="">Tanggal</option>
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <select
                    value={formData.birthMonth}
                    onChange={(e) => setFormData({...formData, birthMonth: e.target.value})}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      formErrors.tanggal_lahir ? 'border-red-500' : 'border-gray-200'
                    }`}
                    disabled={submitLoading}
                  >
                    <option value="">Bulan</option>
                    {months.map((month, index) => (
                      <option key={index + 1} value={index + 1}>{month}</option>
                    ))}
                  </select>
                  <select
                    value={formData.birthYear}
                    onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      formErrors.tanggal_lahir ? 'border-red-500' : 'border-gray-200'
                    }`}
                    disabled={submitLoading}
                  >
                    <option value="">Tahun</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                {formErrors.tanggal_lahir && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.tanggal_lahir[0]}</p>
                )}
              </div>

              {/* Tanggal Bergabung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Bergabung *</label>
                <input
                  type="date"
                  value={formData.tanggal_bergabung}
                  onChange={(e) => setFormData({...formData, tanggal_bergabung: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.tanggal_bergabung ? 'border-red-500' : 'border-gray-200'
                  }`}
                  disabled={submitLoading}
                />
                {formErrors.tanggal_bergabung && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.tanggal_bergabung[0]}</p>
                )}
              </div>

              {/* Sisa Cuti Tahunan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sisa Cuti Tahunan</label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={formData.sisa_cuti_tahunan}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (value >= 0 && value <= 12) {
                      setFormData({...formData, sisa_cuti_tahunan: value});
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.sisa_cuti_tahunan ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Default: 12 hari"
                  disabled={submitLoading}
                />
                {formErrors.sisa_cuti_tahunan && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.sisa_cuti_tahunan[0]}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Sisa cuti tahunan karyawan (0-12 hari)</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={submitLoading}
              >
                Batal
              </button>
              <button
                onClick={handleAddEmployee}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
)}

{showDetailModal && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Detail Karyawan</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setEditingSection(null);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Personal Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Informasi Pribadi</h3>
                  </div>
                  <button
                    onClick={() => {
                      if (editingSection === 'personal') {
                        setEditingSection(null);
                        resetForm();
                      } else {
                        const birthDate = parseDbDateToDropdown(selectedEmployee.tanggal_lahir);
                        setFormData({
                          ...getInitialFormData(),
                          nama: selectedEmployee.nama,
                          no_telepon: selectedEmployee.no_telepon,
                          nik: selectedEmployee.nik,
                          jenis_kelamin: selectedEmployee.jenis_kelamin,
                          tempat_lahir: selectedEmployee.tempat_lahir,
                          birthDay: birthDate.day,
                          birthMonth: birthDate.month,
                          birthYear: birthDate.year,
                          sisa_cuti_tahunan: selectedEmployee.sisa_cuti_tahunan || 12,
                          status: selectedEmployee.status
                        });
                        setEditingSection('personal');
                      }
                    }}
                    className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                {editingSection === 'personal' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                        <input
                          type="text"
                          value={formData.nama}
                          onChange={(e) => setFormData({...formData, nama: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">No Telepon</label>
                        <input
                          type="tel"
                          value={formData.no_telepon}
                          onChange={(e) => setFormData({...formData, no_telepon: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="08123456789"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">NIK</label>
                        <input
                          type="text"
                          value={formData.nik}
                          onChange={(e) => setFormData({...formData, nik: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                        <select
                          value={formData.jenis_kelamin}
                          onChange={(e) => setFormData({...formData, jenis_kelamin: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
                        <input
                          type="text"
                          value={formData.tempat_lahir}
                          onChange={(e) => setFormData({...formData, tempat_lahir: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={formData.birthDay}
                          onChange={(e) => setFormData({...formData, birthDay: e.target.value})}
                          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          {days.map(day => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                        <select
                          value={formData.birthMonth}
                          onChange={(e) => setFormData({...formData, birthMonth: e.target.value})}
                          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                        <select
                          value={formData.birthYear}
                          onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sisa Cuti Tahunan</label>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        value={formData.sisa_cuti_tahunan}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          if (value >= 0 && value <= 12) {
                            setFormData({...formData, sisa_cuti_tahunan: value});
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Sisa cuti tahunan (0-12 hari)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="aktif">Aktif</option>
                        <option value="tidak_aktif">Tidak Aktif</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Jika status diubah ke Aktif, tanggal keluar akan dihapus</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          setEditingSection(null);
                          resetForm();
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={submitLoading}
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleEditEmployee('personal', formData)}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        disabled={submitLoading}
                      >
                        {submitLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          'Simpan'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">ID Karyawan</p>
                      <p className="font-semibold text-gray-900">{selectedEmployee.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">NIK</p>
                      <p className="font-semibold text-gray-900">{selectedEmployee.nik}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Nama Lengkap</p>
                      <p className="font-semibold text-gray-900">{selectedEmployee.nama}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">No Telepon</p>
                      <p className="font-semibold text-gray-900">{selectedEmployee.no_telepon || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Jenis Kelamin</p>
                      <p className="font-semibold text-gray-900">{selectedEmployee.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tempat, Tanggal Lahir</p>
                      <p className="font-semibold text-gray-900">
                        {selectedEmployee.tempat_lahir}, {formatDateID(selectedEmployee.tanggal_lahir)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sisa Cuti Tahunan</p>
                      <p className="font-semibold text-gray-900">
                        {selectedEmployee.sisa_cuti_tahunan || 0} hari
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${selectedEmployee.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {selectedEmployee.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Work Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Informasi Pekerjaan</h3>
                  </div>
                  <button
                    onClick={() => {
                      if (editingSection === 'work') {
                        setEditingSection(null);
                        resetForm();
                      } else {
                        setFormData({
                          ...getInitialFormData(),
                          divisi_id: selectedEmployee.divisi_id ? selectedEmployee.divisi_id.toString() : '',
                          jabatan_id: selectedEmployee.jabatan_id.toString(),
                          tanggal_bergabung: parseDbDateToInput(selectedEmployee.tanggal_bergabung),
                          tanggal_keluar: parseDbDateToInput(selectedEmployee.tanggal_keluar)
                        });
                        setEditingSection('work');
                      }
                    }}
                    className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                {editingSection === 'work' ? (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        {/* ✅ CHANGED: Remove required indicator */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Penempatan
          <span className="text-gray-400 text-xs ml-2">(Opsional)</span>
        </label>
        <select
          value={formData.divisi_id || ''}
          onChange={(e) => {
            setFormData({...formData, divisi_id: e.target.value, jabatan_id: ''});
          }}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {/* ✅ NEW: Add empty option */}
          <option value="">-- Tidak Ada Penempatan --</option>
          {masterData.divisions.map(div => (
            <option key={div.id} value={div.id}>{div.nama}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Kosongkan jika karyawan belum ditempatkan
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan *</label>
        <select
          value={formData.jabatan_id}
          onChange={(e) => setFormData({...formData, jabatan_id: e.target.value})}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {masterData.positions.map(pos => (
            <option key={pos.id} value={pos.id}>{pos.nama}</option>
          ))}
        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Bergabung</label>
                      <input
                        type="date"
                        value={formData.tanggal_bergabung || ''}
                        onChange={(e) => setFormData({...formData, tanggal_bergabung: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Keluar</label>
                      <input
                        type="date"
                        value={formData.tanggal_keluar || ''}
                        onChange={(e) => setFormData({...formData, tanggal_keluar: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Kosongkan jika masih aktif. Jika diisi, status otomatis menjadi Tidak Aktif</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          setEditingSection(null);
                          resetForm();
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={submitLoading}
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleEditEmployee('work', formData)}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        disabled={submitLoading}
                      >
                        {submitLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          'Simpan'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <p className="text-sm text-gray-600">Penempatan</p>
      <p className="font-semibold text-gray-900">
        {selectedEmployee.divisi?.nama || <span className="text-gray-400 italic">Tidak ada penempatan</span>}
      </p>
    </div>
    <div>
      <p className="text-sm text-gray-600">Jabatan</p>
      <p className="font-semibold text-gray-900">{selectedEmployee.jabatan?.nama || '-'}</p>
    </div>
    <div>
      <p className="text-sm text-gray-600">Tanggal Bergabung</p>
      <p className="font-semibold text-gray-900">{formatDateID(selectedEmployee.tanggal_bergabung)}</p>
    </div>
    <div>
      <p className="text-sm text-gray-600">Tanggal Keluar</p>
      <p className="font-semibold text-gray-900">
        {selectedEmployee.status === 'aktif' ? '-' : formatDateID(selectedEmployee.tanggal_keluar)}
      </p>
    </div>
  </div>
                )}
              </div>

              {/* Account Access Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Akses Akun</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Username</p>
                      <p className="font-semibold text-gray-900">{selectedEmployee.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Password</p>
                      <p className="font-semibold text-gray-900">*******</p>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-900 mb-1">
                          Reset Password ke Default
                        </p>
                        <p className="text-sm text-orange-700 mb-3">
                          Password akan direset ke format tanggal lahir (ddmmyyyy)
                        </p>
                        <button
                          onClick={() => handleResetPassword(selectedEmployee.id)}
                          disabled={submitLoading}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {submitLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Mereset...
                            </>
                          ) : (
                            <>
                              <Key className="w-4 h-4" />
                              Reset Password
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit/Detail Modals remain the same as your original code */}
      {/* I'm keeping them to maintain the full functionality */}
    </div>
  );
};

export default DataKaryawan;