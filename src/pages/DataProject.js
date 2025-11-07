"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, Download, Eye, Edit, Trash2,
  ChevronUp, ChevronDown, X, Save,
  ChevronLeft, ChevronRight, AlertTriangle,
  Check, MapPin, Calendar, Briefcase, ExternalLink, Shield, Loader2, FileText 
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { projectAPI, jabatanAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MESSAGES } from "@/utils/constants";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { clearApiCache } from "@/lib/axios";

// Dynamic import untuk Leaflet components
let MapContainer, TileLayer, Circle, Popup, Marker;
let L;
if (typeof window !== 'undefined') {
  const leaflet = require('react-leaflet');
  L = require('leaflet');
  MapContainer = leaflet.MapContainer;
  TileLayer = leaflet.TileLayer;
  Circle = leaflet.Circle;
  Popup = leaflet.Popup;
  Marker = leaflet.Marker;
}

const DataProject = () => {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [allJabatans, setAllJabatans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("aktif");
  
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [formData, setFormData] = useState({
    nama: "",
    tanggal_mulai: "",
    bagian: "",
    lokasi: { nama: "", latitude: "", longitude: "" },
    radius: 50,
    waktu_toleransi: "",
    excluded_jabatan_ids: [],
    enabled_izin_categories: ['sakit', 'izin'], // ✅ Default: sakit & izin selalu aktif
    enabled_sub_kategori_izin: [],
    status: "aktif",
    shifts: [{ id: null, kode: "", waktu_mulai: "", waktu_selesai: "" }]
  });

  const [formErrors, setFormErrors] = useState({});

  const { loading: fetchLoading, call } = useApi();

  // Fetch all jabatan untuk dropdown
  const fetchAllJabatans = useCallback(async () => {
    try {
      const response = await call(jabatanAPI.getAllSimple);
      if (response.success) {
        setAllJabatans(response.data || []);
      }
    } catch (err) {
      console.error('Fetch jabatan error:', err);
      setAllJabatans([]);
    }
  }, [call]);

  const fetchAllData = useCallback(async () => {
    try {
      clearApiCache();
      
      const response = await call(projectAPI.getAll);
      if (response.success) {
        setProjects(response.data || []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setProjects([]);
    } finally {
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    }
  }, [call, initialLoadComplete]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
      fetchAllJabatans();
    }
  }, [isAuthenticated, fetchAllData, fetchAllJabatans]);

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = projects.filter((p) =>
      (statusFilter === "all" ? true : p.status === statusFilter) &&
      (p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.id && p.id.toString().toLowerCase().includes(searchTerm.toLowerCase())))
    );

    filtered = [...filtered].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      return sortDirection === "asc"
        ? aVal > bVal ? 1 : -1
        : aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [projects, searchTerm, sortField, sortDirection, statusFilter]);

  // Memoized pagination data
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

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    const totalPages = paginationData.pagination.last_page;
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [paginationData.pagination.last_page]);

  const handleItemsPerPageChange = useCallback((newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [formErrors]);

  const handleLokasiChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      lokasi: { ...prev.lokasi, [field]: value }
    }));
  }, []);

  const handleShiftChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const newShifts = [...prev.shifts];
      newShifts[index] = { ...newShifts[index], [field]: value };
      return { ...prev, shifts: newShifts };
    });
  }, []);

  const addShift = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      shifts: [...prev.shifts, { id: null, kode: "", waktu_mulai: "", waktu_selesai: "" }]
    }));
  }, []);

  const removeShift = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      shifts: prev.shifts.filter((_, i) => i !== index)
    }));
  }, []);

  const handleExcludedJabatanToggle = useCallback((jabatanId) => {
    setFormData(prev => {
      const currentExcluded = prev.excluded_jabatan_ids || [];
      const isExcluded = currentExcluded.includes(jabatanId);
      
      return {
        ...prev,
        excluded_jabatan_ids: isExcluded
          ? currentExcluded.filter(id => id !== jabatanId)
          : [...currentExcluded, jabatanId]
      };
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      nama: "",
      tanggal_mulai: "",
      bagian: "",
      lokasi: { nama: "", latitude: "", longitude: "" },
      radius: 50,
      waktu_toleransi: "",
      excluded_jabatan_ids: [],
      enabled_izin_categories: ['sakit', 'izin'], // ✅ Reset ke default
      enabled_sub_kategori_izin: [],
      status: "aktif",
      shifts: [{ id: null, kode: "", waktu_mulai: "", waktu_selesai: "" }]
    });
    setFormErrors({});
    setSelectedProject(null);
    setSubmitLoading(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setShowEditModal(false);
    resetForm();
  }, [resetForm]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.nama.trim()) errors.nama = "Nama project wajib diisi";
    if (!formData.tanggal_mulai) errors.tanggal_mulai = "Tanggal mulai wajib diisi";
    if (!formData.bagian.trim()) errors.bagian = "Bagian/Jabatan wajib diisi";
    if (!formData.lokasi.nama.trim()) errors.lokasi_nama = "Nama lokasi wajib diisi";
    if (!formData.lokasi.latitude) errors.lokasi_latitude = "Latitude wajib diisi";
    if (!formData.lokasi.longitude) errors.lokasi_longitude = "Longitude wajib diisi";
    if (!formData.radius || formData.radius < 10 || formData.radius > 1000) {
      errors.radius = "Radius harus antara 10-1000 meter";
    }
    
    formData.shifts.forEach((shift, index) => {
      if (!shift.kode || !shift.kode.trim()) errors[`shift_${index}_kode`] = "Kode shift wajib diisi";
      if (!shift.waktu_mulai) errors[`shift_${index}_mulai`] = "Waktu mulai wajib diisi";
      if (!shift.waktu_selesai) errors[`shift_${index}_selesai`] = "Waktu selesai wajib diisi";
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (submitLoading) return;

    if (!validateForm()) {
      toast.error("Harap lengkapi semua field yang wajib diisi!", { autoClose: 5000 });
      return;
    }

    const action = selectedProject ? 'memperbarui' : 'menyimpan';
    const title = selectedProject ? 'Konfirmasi Update' : 'Konfirmasi Simpan';
    const message = selectedProject 
      ? `Apakah Anda yakin ingin memperbarui project <b>${selectedProject.nama}</b>?`
      : `Apakah Anda yakin ingin menyimpan project <b>${formData.nama.trim()}</b>?`;

    const result = await Swal.fire({
      title: title,
      html: message,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ea580c",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, " + (selectedProject ? 'Update' : 'Simpan'),
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      await performSubmit();
    }
  };

  const performSubmit = async () => {
    setSubmitLoading(true);

    try {
      // ✅ Pastikan sakit & izin selalu ada
      let categories = [...formData.enabled_izin_categories];
      if (!categories.includes('sakit')) categories.push('sakit');
      if (!categories.includes('izin')) categories.push('izin');

      // ✅ Jika cuti_khusus dipilih, aktifkan semua sub kategori
      let subCategories = [];
      if (categories.includes('cuti_khusus')) {
        subCategories = [
          'pernikahan_karyawan',
          'pernikahan_anak',
          'istri_melahirkan',
          'kematian_keluarga',
          'kematian_serumah',
          'khitanan_baptis'
        ];
      }

      const payload = {
        nama: formData.nama.trim(),
        bagian: formData.bagian.trim(),
        lokasi: {
          nama: formData.lokasi.nama.trim(),
          latitude: parseFloat(formData.lokasi.latitude),
          longitude: parseFloat(formData.lokasi.longitude)
        },
        tanggal_mulai: formData.tanggal_mulai,
        radius: parseInt(formData.radius),
        waktu_toleransi: formData.waktu_toleransi ? parseInt(formData.waktu_toleransi) : null,
        excluded_jabatan_ids: formData.excluded_jabatan_ids || [],
        enabled_izin_categories: categories,
        enabled_sub_kategori_izin: subCategories,
        status: formData.status,
        shifts: formData.shifts.map(s => ({
          id: s.id || null,
          kode: s.kode.trim(),
          waktu_mulai: s.waktu_mulai,
          waktu_selesai: s.waktu_selesai
        }))
      };
      
      if (selectedProject) {
        await call(projectAPI.update, selectedProject.id, payload);
        toast.success(MESSAGES.UPDATE_SUCCESS);
      } else {
        await call(projectAPI.create, payload);
        toast.success(MESSAGES.SAVE_SUCCESS);
      }

      clearApiCache();
      await fetchAllData();
      handleCloseModal();
    } catch (err) {
      console.error('Submit error:', err);
      if (err.errors) {
        setFormErrors(err.errors);
      }
      toast.error(err.message || MESSAGES.SERVER_ERROR, { autoClose: 5000 });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = (project) => {
    Swal.fire({
      title: "Konfirmasi Nonaktifkan",
      html: `Apakah Anda yakin ingin menonaktifkan project <b>${project.nama}</b>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Nonaktifkan",
      cancelButtonText: "Batal"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await call(projectAPI.delete, project.id);
          toast.success("Project berhasil dinonaktifkan");
          clearApiCache();
          await fetchAllData();
        } catch (err) {
          toast.error(err.message || MESSAGES.SERVER_ERROR, { autoClose: 5000 });
        }
      }
    });
  };

  const exportToExcel = async () => {
    try {
      Swal.fire({
        title: 'Mengekspor Data',
        text: 'Sedang menyiapkan file export...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
      });
      
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error('Token tidak ditemukan');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
      
      if (!response.ok) throw new Error(`Gagal mengekspor data (Status: ${response.status})`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `projects-${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      Swal.close();
      toast.success("Data berhasil diekspor!");
    } catch (err) {
      Swal.close();
      toast.error("Gagal mengekspor data: " + err.message, { autoClose: 5000 });
    }
  };

  const openGoogleMaps = useCallback((lat, lng) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/@${lat},${lng},18z`, '_blank');
    }
  }, []);

  const handleOpenEditModal = useCallback((project) => {
    resetForm();
    setSelectedProject(project);
    
    let tanggalMulai = '';
    if (project.tanggal_mulai) {
      if (typeof project.tanggal_mulai === 'string') {
        tanggalMulai = project.tanggal_mulai.split('T')[0];
      }
    }
    
    // ✅ Pastikan sakit & izin selalu ada di enabled categories
    let categories = project.enabled_izin_categories || ['sakit', 'izin'];
    if (!categories.includes('sakit')) categories.push('sakit');
    if (!categories.includes('izin')) categories.push('izin');
    
    setFormData({
      nama: project.nama,
      tanggal_mulai: tanggalMulai,
      bagian: project.bagian,
      lokasi: {
        nama: project.lokasi_nama || project.lokasi?.nama || "",
        latitude: project.lokasi_latitude || project.lokasi?.latitude || "",
        longitude: project.lokasi_longitude || project.lokasi?.longitude || ""
      },
      radius: project.radius || 50,
      waktu_toleransi: project.waktu_toleransi || "",
      excluded_jabatan_ids: project.excluded_jabatan_ids || [],
      enabled_izin_categories: categories,
      enabled_sub_kategori_izin: project.enabled_sub_kategori_izin || [],
      status: project.status,
      shifts: project.shifts && project.shifts.length > 0 
        ? project.shifts.map(s => ({
            id: s.id || null,
            kode: s.kode,
            waktu_mulai: s.waktu_mulai,
            waktu_selesai: s.waktu_selesai
          }))
        : [{ id: null, kode: "", waktu_mulai: "", waktu_selesai: "" }]
    });
    setShowEditModal(true);
  }, [resetForm]);

  const formatTanggal = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString.split('T')[0]);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Map Display
  const MapDisplay = useMemo(() => {
    if (typeof window === 'undefined' || !MapContainer) return null;
    
    const lat = parseFloat(formData.lokasi.latitude);
    const lng = parseFloat(formData.lokasi.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      return (
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Masukkan koordinat untuk menampilkan peta</p>
        </div>
      );
    }

    const customIcon = L && L.divIcon({
      className: 'custom-marker-icon',
      html: `<div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });
    
    return (
      <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
        <MapContainer center={[lat, lng]} zoom={16} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[lat, lng]} icon={customIcon}>
            <Popup>
              <strong>{formData.lokasi.nama || 'Lokasi Project'}</strong><br />
              Koordinat: {lat}, {lng}
            </Popup>
          </Marker>
          {formData.radius && (
            <Circle center={[lat, lng]} radius={parseInt(formData.radius)} color="#f97316" fillColor="#fb923c" fillOpacity={0.2} />
          )}
        </MapContainer>
      </div>
    );
  }, [formData.lokasi, formData.radius]);

  // Modal Content
  const renderModalContent = useCallback(() => (
    <div className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Project *</label>
        <input
          type="text"
          value={formData.nama}
          onChange={(e) => handleFormChange("nama", e.target.value)}
          className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${formErrors.nama ? 'border-red-500' : 'border-gray-200'}`}
          placeholder="Masukkan nama project"
        />
        {formErrors.nama && <p className="text-red-500 text-sm mt-1">{formErrors.nama}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai *</label>
          <input
            type="date"
            value={formData.tanggal_mulai}
            onChange={(e) => handleFormChange("tanggal_mulai", e.target.value)}
            className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${formErrors.tanggal_mulai ? 'border-red-500' : 'border-gray-200'}`}
          />
          {formErrors.tanggal_mulai && <p className="text-red-500 text-sm mt-1">{formErrors.tanggal_mulai}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bagian/Jabatan *</label>
          <input
            type="text"
            value={formData.bagian}
            onChange={(e) => handleFormChange("bagian", e.target.value)}
            className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${formErrors.bagian ? 'border-red-500' : 'border-gray-200'}`}
            placeholder="Masukkan jabatan"
          />
          {formErrors.bagian && <p className="text-red-500 text-sm mt-1">{formErrors.bagian}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lokasi *</label>
          <input
            type="text"
            value={formData.lokasi.nama}
            onChange={(e) => handleLokasiChange("nama", e.target.value)}
            className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${formErrors.lokasi_nama ? 'border-red-500' : 'border-gray-200'}`}
            placeholder="Masukkan nama lokasi"
          />
          {formErrors.lokasi_nama && <p className="text-red-500 text-sm mt-1">{formErrors.lokasi_nama}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Toleransi (menit)</label>
          <input
            type="number"
            value={formData.waktu_toleransi}
            onChange={(e) => handleFormChange("waktu_toleransi", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Opsional"
            min="0"
            max="60"
          />
          <p className="text-xs text-gray-500 mt-1">Berapa menit sebelum shift dimulai karyawan bisa absen (opsional)</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Koordinat Lokasi (Latitude, Longitude) *</label>
        <input
          type="text"
          value={formData.lokasi.latitude && formData.lokasi.longitude 
            ? `${formData.lokasi.latitude}, ${formData.lokasi.longitude}` 
            : ''}
          onChange={(e) => {
            const value = e.target.value;
            const parts = value.split(',').map(p => p.trim());
            
            if (parts.length >= 1) {
              handleLokasiChange("latitude", parts[0]);
            }
            if (parts.length >= 2) {
              handleLokasiChange("longitude", parts[1]);
            }
            
            if (!value.trim()) {
              handleLokasiChange("latitude", "");
              handleLokasiChange("longitude", "");
            }
          }}
          className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
            formErrors.lokasi_latitude || formErrors.lokasi_longitude ? 'border-red-500' : 'border-gray-200'
          }`}
          placeholder="Contoh: -6.2088, 106.8456"
        />
        {(formErrors.lokasi_latitude || formErrors.lokasi_longitude) && (
          <p className="text-red-500 text-sm mt-1">
            {formErrors.lokasi_latitude || formErrors.lokasi_longitude}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Format: latitude, longitude (gunakan koma sebagai pemisah)
        </p>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-600">Buka Google Maps untuk mendapatkan koordinat</p>
        <button
          type="button"
          onClick={() => window.open('https://www.google.com/maps', '_blank')}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
        >
          <ExternalLink className="w-3 h-3" />
          Google Maps
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Radius Absensi (meter) *</label>
        <input
          type="number"
          value={formData.radius}
          onChange={(e) => handleFormChange("radius", e.target.value)}
          className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${formErrors.radius ? 'border-red-500' : 'border-gray-200'}`}
          placeholder="Masukkan radius dalam meter"
          min="10"
          max="1000"
        />
        {formErrors.radius && <p className="text-red-500 text-sm mt-1">{formErrors.radius}</p>}
        <p className="text-xs text-gray-500 mt-1">Jarak maksimal dari titik lokasi untuk dapat melakukan absensi (10-1000 meter)</p>
      </div>

            <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-orange-600" />
          <label className="block text-sm font-medium text-gray-700">
            Pengecualian Radius (Opsional)
          </label>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Pilih jabatan yang tidak perlu berada dalam radius untuk presensi (contoh: Driver, Kurir, dll)
        </p>
        
        {allJabatans.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-500">Memuat daftar jabatan...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg">
            {allJabatans.map((jabatan) => {
              const isExcluded = (formData.excluded_jabatan_ids || []).includes(jabatan.id);
              return (
                <label
                  key={jabatan.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    isExcluded
                      ? 'bg-orange-100 border-2 border-orange-500'
                      : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isExcluded}
                    onChange={() => handleExcludedJabatanToggle(jabatan.id)}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <span className={`text-sm ${isExcluded ? 'font-semibold text-orange-700' : 'text-gray-700'}`}>
                    {jabatan.nama}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        
        {formData.excluded_jabatan_ids && formData.excluded_jabatan_ids.length > 0 && (
          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-800">
              <strong>{formData.excluded_jabatan_ids.length}</strong> jabatan dikecualikan dari pengecekan radius.
              Karyawan dengan jabatan tersebut dapat presensi dari lokasi manapun.
            </p>
          </div>
        )}
      </div>

            <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-orange-600" />
          <label className="block text-sm font-medium text-gray-700">
            Konfigurasi Kategori Izin (Opsional)
          </label>
        </div>
        
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex gap-3">
            <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Kategori Izin yang Otomatis Aktif:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Sakit</strong> - Tersedia di semua project (wajib lampir surat dokter)</li>
                <li><strong>Izin Umum</strong> - Tersedia di semua project (urusan pribadi)</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-4">
          Pilih kategori izin tambahan yang ingin diaktifkan untuk project ini:
        </p>

                <div className="space-y-3">
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-indigo-900 mb-3">Kategori Tambahan (Opsional)</h4>
            
            <div className="space-y-2">
                            <label
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  (formData.enabled_izin_categories || []).includes('cuti_tahunan')
                    ? 'bg-indigo-100 border-2 border-indigo-500'
                    : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={(formData.enabled_izin_categories || []).includes('cuti_tahunan')}
                  onChange={(e) => {
                    let categories = [...(formData.enabled_izin_categories || ['sakit', 'izin'])];
                    
                    if (e.target.checked) {
                      if (!categories.includes('cuti_tahunan')) {
                        categories.push('cuti_tahunan');
                      }
                    } else {
                      categories = categories.filter(k => k !== 'cuti_tahunan');
                    }
                    
                    // Pastikan sakit & izin tetap ada
                    if (!categories.includes('sakit')) categories.push('sakit');
                    if (!categories.includes('izin')) categories.push('izin');
                    
                    handleFormChange('enabled_izin_categories', categories);
                  }}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 flex-shrink-0 mt-1"
                />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    (formData.enabled_izin_categories || []).includes('cuti_tahunan')
                      ? 'text-indigo-900'
                      : 'text-gray-700'
                  }`}>
                    Cuti Tahunan
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Cuti tahunan 12 hari per tahun
                  </p>
                </div>
              </label>

                            <label
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  (formData.enabled_izin_categories || []).includes('cuti_khusus')
                    ? 'bg-purple-100 border-2 border-purple-500'
                    : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={(formData.enabled_izin_categories || []).includes('cuti_khusus')}
                  onChange={(e) => {
                    let categories = [...(formData.enabled_izin_categories || ['sakit', 'izin'])];
                    
                    if (e.target.checked) {
                      if (!categories.includes('cuti_khusus')) {
                        categories.push('cuti_khusus');
                      }
                    } else {
                      categories = categories.filter(k => k !== 'cuti_khusus');
                    }
                    
                    // Pastikan sakit & izin tetap ada
                    if (!categories.includes('sakit')) categories.push('sakit');
                    if (!categories.includes('izin')) categories.push('izin');
                    
                    handleFormChange('enabled_izin_categories', categories);
                  }}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0 mt-1"
                />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    (formData.enabled_izin_categories || []).includes('cuti_khusus')
                      ? 'text-purple-900'
                      : 'text-gray-700'
                  }`}>
                    Cuti Izin Khusus
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Cuti khusus untuk acara penting (pernikahan, kematian, dll). Semua sub kategori akan otomatis aktif.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

                {(formData.enabled_izin_categories || []).includes('cuti_khusus') && (
          <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-800">
                <p className="font-medium mb-2">Sub Kategori Cuti Khusus (Semua Aktif):</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span>Pernikahan Karyawan (3 hari)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span>Pernikahan Putra/Putri (2 hari)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span>Istri Melahirkan/Keguguran (2 hari)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span>Kematian Keluarga Inti (2 hari)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span>Kematian Orang Serumah (1 hari)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span>Khitanan/Baptisan Anak (2 hari)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Ringkasan Konfigurasi:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Sakit</strong> dan <strong>Izin Umum</strong> otomatis aktif di semua project</li>
                <li><strong>Cuti Tahunan</strong> bersifat opsional dan dapat dipilih sesuai kebutuhan</li>
                <li><strong>Cuti Khusus</strong> jika diaktifkan, semua sub kategorinya akan otomatis tersedia</li>
                <li>Konfigurasi ini menentukan kategori izin yang dapat diajukan karyawan di project ini</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {selectedProject && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
          <select
            value={formData.status}
            onChange={(e) => handleFormChange("status", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="aktif">Aktif</option>
            <option value="tidak_aktif">Tidak Aktif</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Preview Lokasi</label>
        {MapDisplay}
      </div>

            <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Shift Project *</label>
        {formData.shifts.map((s, i) => (
          <div key={`shift-${i}`} className="space-y-2 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Shift {i + 1}</span>
              {formData.shifts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeShift(i)}
                  className="text-red-600 hover:bg-red-100 rounded px-2 py-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kode Shift *</label>
              <input
                type="text"
                value={s.kode}
                onChange={(e) => handleShiftChange(i, "kode", e.target.value)}
                className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  formErrors[`shift_${i}_kode`] ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="Contoh: Pagi, Sore, Malam, A, B, C"
              />
              {formErrors[`shift_${i}_kode`] && (
                <p className="text-red-500 text-xs mt-1">{formErrors[`shift_${i}_kode`]}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Waktu Mulai *</label>
                <input
                  type="time"
                  value={s.waktu_mulai}
                  onChange={(e) => handleShiftChange(i, "waktu_mulai", e.target.value)}
                  className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors[`shift_${i}_mulai`] ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {formErrors[`shift_${i}_mulai`] && (
                  <p className="text-red-500 text-xs mt-1">{formErrors[`shift_${i}_mulai`]}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Waktu Selesai *</label>
                <input
                  type="time"
                  value={s.waktu_selesai}
                  onChange={(e) => handleShiftChange(i, "waktu_selesai", e.target.value)}
                  className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors[`shift_${i}_selesai`] ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {formErrors[`shift_${i}_selesai`] && (
                  <p className="text-red-500 text-xs mt-1">{formErrors[`shift_${i}_selesai`]}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addShift}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Tambah Shift
        </button>
      </div>
    </div>
  ), [formData, formErrors, allJabatans, handleFormChange, handleLokasiChange, handleShiftChange, handleExcludedJabatanToggle, addShift, removeShift, MapDisplay, selectedProject]);

  // Loading skeleton
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
                <div className="md:col-span-2 h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-8 bg-gray-200 rounded w-48"></div>
                <div className="h-8 bg-gray-200 rounded w-48"></div>
              </div>
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
            <h1 className="text-2xl font-bold">Data Project</h1>
            <p className="text-gray-600">Kelola data project perusahaan dengan lokasi koordinat</p>
          </div>
          <div className="flex flex-row gap-2 lg:gap-3 w-full sm:w-auto lg:w-auto">
            <button
              onClick={exportToExcel}
              className="flex-1 sm:flex-none lg:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="flex-1 sm:flex-none lg:flex-none px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Tambah Project
            </button>
          </div>
        </div>
      </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari project..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="aktif">Aktif</option>
              <option value="tidak_aktif">Tidak Aktif</option>
              <option value="all">Semua</option>
            </select>
          </div>
        </div>
      </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center gap-2">
            Tampilkan
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            entri
          </div>
          <div>
            Menampilkan {((paginationData.pagination.current_page - 1) * paginationData.pagination.per_page) + 1}-
            {Math.min(paginationData.pagination.current_page * paginationData.pagination.per_page, paginationData.pagination.total)} dari {paginationData.pagination.total} data
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <tr>
                {[
                  { key: "id", label: "ID" },
                  { key: "nama", label: "Nama Project" },
                  { key: "tanggal_mulai", label: "Tanggal Mulai" },
                  { key: "bagian", label: "Bagian" },
                  { key: "lokasi_nama", label: "Lokasi" },
                  { key: "radius", label: "Radius (m)" },
                  { key: "waktu_toleransi", label: "Toleransi (mnt)" },
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
              {fetchLoading && paginationData.items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                      <p className="text-gray-600">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : paginationData.items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'Tidak ada data yang sesuai dengan pencarian' : 'Belum ada data project'}
                  </td>
                </tr>
              ) : (
                paginationData.items.map((p, idx) => (
                  <tr key={p.id} className={`border-b border-gray-100 hover:bg-orange-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-medium">PRJ{String(p.id).padStart(3, '0')}</td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{p.nama}</div>
                        {p.excluded_jabatan_ids && p.excluded_jabatan_ids.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Shield className="w-3 h-3 text-orange-600" />
                            <span className="text-xs text-orange-600">
                              {p.excluded_jabatan_ids.length} jabatan dikecualikan
                            </span>
                          </div>
                        )}
                        {p.enabled_izin_categories && p.enabled_izin_categories.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <FileText className="w-3 h-3 text-blue-600" />
                            <span className="text-xs text-blue-600">
                              {p.enabled_izin_categories.length} kategori izin aktif
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatTanggal(p.tanggal_mulai)}</td>
                    <td className="px-4 py-3">{p.bagian}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{p.lokasi_nama || p.lokasi?.nama}</span>
                        <button
                          onClick={() => openGoogleMaps(p.lokasi_latitude || p.lokasi?.latitude, p.lokasi_longitude || p.lokasi?.longitude)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Lihat di Google Maps"
                        >
                          <MapPin className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">{p.radius}m</td>
                    <td className="px-4 py-3">{p.waktu_toleransi || '-'} {p.waktu_toleransi ? 'menit' : ''}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                          ${p.status === "aktif" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {p.status === "aktif" ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {p.status === "aktif" && (
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Nonaktifkan"
                          >
                            <Trash2 className="w-4 h-4" />
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

        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div>Halaman {paginationData.pagination.current_page} dari {paginationData.pagination.last_page}</div>
          <div className="flex gap-1 items-center flex-wrap justify-center">
            <button
              onClick={() => handlePageChange(paginationData.pagination.current_page - 1)}
              disabled={paginationData.pagination.current_page === 1 || fetchLoading}
              className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded transition-colors disabled:cursor-not-allowed"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {(() => {
              const totalPages = paginationData.pagination.last_page;
              const currentPage = paginationData.pagination.current_page;
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
                    disabled={fetchLoading}
                    className={`px-3 py-1 rounded transition-colors min-w-[40px] ${
                      paginationData.pagination.current_page === page 
                        ? "bg-orange-600 text-white font-semibold shadow-sm" 
                        : "hover:bg-gray-100"
                    } disabled:opacity-50`}
                  >
                    {page}
                  </button>
                );
              });
            })()}
            
            <button
              onClick={() => handlePageChange(paginationData.pagination.current_page + 1)}
              disabled={paginationData.pagination.current_page === paginationData.pagination.last_page || fetchLoading}
              className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded transition-colors disabled:cursor-not-allowed"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

            {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">Tambah Project</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg" disabled={submitLoading}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderModalContent()}
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={submitLoading}
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
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

            {showEditModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">Edit Project</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg" disabled={submitLoading}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderModalContent()}
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={submitLoading}
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
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
                    Update
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

export default DataProject;