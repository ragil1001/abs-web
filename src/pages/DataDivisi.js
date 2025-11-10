"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  Download,
  Upload,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useApi } from "@/hooks/useApi";
import { divisiAPI } from "@/lib/api";
import { divisiValidator, getFirstError } from "@/utils/validation";
import { useAuth } from "@/context/AuthContext";
import { MESSAGES, VALIDATION } from "@/utils/constants";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { clearApiCache } from "@/lib/axios";

const DataDivisi = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [allDivisions, setAllDivisions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [formData, setFormData] = useState({ nama: "" });
  const [formErrors, setFormErrors] = useState({});
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const { loading: fetchLoading, error: fetchError, call } = useApi();

  const processedData = useMemo(() => {
    let filtered = allDivisions;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = allDivisions.filter(
        (division) =>
          division.nama.toLowerCase().includes(search) ||
          division.id.toString().toLowerCase().includes(search)
      );
    }

    filtered = [...filtered].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [allDivisions, searchTerm, sortField, sortDirection]);

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
      },
    };
  }, [processedData, currentPage, itemsPerPage]);

  const fetchAllData = useCallback(
    async (forceFresh = false) => {
      try {
        if (forceFresh) {
          clearApiCache("/divisis");

          if (typeof window !== "undefined") {
            localStorage.removeItem("divisi_cache");
            localStorage.removeItem("divisi_cache_timestamp");
          }
        }

        const response = await call(divisiAPI.getAll, {
          per_page: 1000,
          _t: Date.now(),
        });

        if (response.success) {
          const data = response.data.data || response.data || [];
          console.log("📊 Fetched divisions:", data.length);
          setAllDivisions(data);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setAllDivisions([]);
        toast.error("Gagal mengambil data penempatan", { autoClose: 3000 });
      } finally {
        setInitialLoadComplete(true);
      }
    },
    [call]
  );

  useEffect(() => {
    if (isAuthenticated && !initialLoadComplete) {
      console.log("🔄 Initial load - clearing all caches");
      fetchAllData(true);
    }
  }, [isAuthenticated, initialLoadComplete, fetchAllData]);

  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
      setCurrentPage(1);
    },
    [sortField]
  );

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleItemsPerPageChange = useCallback((newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback(
    (page) => {
      const totalPages = paginationData.pagination.last_page;
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [paginationData.pagination.last_page]
  );

  const resetForm = useCallback(() => {
    setFormData({ nama: "" });
    setFormErrors({});
    setSelectedDivision(null);
    setSubmitLoading(false);
    setImportFile(null);
    setImportLoading(false);
  }, []);

  useEffect(() => {
    if (!showAddModal && !showEditModal && !showImportModal) {
      resetForm();
    }
  }, [showAddModal, showEditModal, showImportModal, resetForm]);

  const handleOpenAddModal = useCallback(() => {
    resetForm();
    setShowAddModal(true);
  }, [resetForm]);

  const handleOpenEditModal = useCallback(
    (division) => {
      resetForm();
      setSelectedDivision(division);
      setFormData({ nama: division.nama });
      setShowEditModal(true);
    },
    [resetForm]
  );

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowImportModal(false);
    resetForm();
  }, [resetForm]);

  const handleSubmit = async () => {
    if (submitLoading) return;

    const validation = divisiValidator.validate(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      toast.error(getFirstError(validation.errors), { autoClose: 5000 });
      return;
    }

    const title = selectedDivision ? "Konfirmasi Update" : "Konfirmasi Simpan";
    const message = selectedDivision
      ? `Apakah Anda yakin ingin memperbarui penempatan <b>${
          selectedDivision.nama
        }</b> menjadi <b>${formData.nama.trim()}</b>?`
      : `Apakah Anda yakin ingin menyimpan penempatan <b>${formData.nama.trim()}</b>?`;

    const result = await Swal.fire({
      title: title,
      html: message,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ea580c",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, " + (selectedDivision ? "Update" : "Simpan"),
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      await performSubmit();
    }
  };

  const performSubmit = async () => {
    setSubmitLoading(true);
    setFormErrors({});

    try {
      const payload = { nama: formData.nama.trim() };

      if (selectedDivision) {
        await call(divisiAPI.update, selectedDivision.id, payload);
        toast.success(MESSAGES.UPDATE_SUCCESS);
      } else {
        await call(divisiAPI.create, payload);
        toast.success(MESSAGES.SAVE_SUCCESS);
      }

      clearApiCache("/divisis");
      clearApiCache();

      if (typeof window !== "undefined") {
        localStorage.removeItem("divisi_cache");
        localStorage.removeItem("divisi_cache_timestamp");
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      await fetchAllData(true);
      handleCloseModal();
    } catch (err) {
      console.error("Submit error:", err);

      if (err.type === "validation_error" && err.errors) {
        setFormErrors(err.errors);
        toast.error(getFirstError(err.errors), { autoClose: 5000 });
      } else {
        toast.error(err.message || MESSAGES.SERVER_ERROR, { autoClose: 5000 });
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = (division) => {
    Swal.fire({
      title: "Konfirmasi Hapus",
      html: `Hapus penempatan <b>${division.nama}</b>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await call(divisiAPI.delete, division.id);
          toast.success(MESSAGES.DELETE_SUCCESS);

          clearApiCache("/divisis");
          clearApiCache();

          if (typeof window !== "undefined") {
            localStorage.removeItem("divisi_cache");
            localStorage.removeItem("divisi_cache_timestamp");
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
          await fetchAllData(true);
        } catch (err) {
          toast.error(err.message || MESSAGES.SERVER_ERROR, {
            autoClose: 5000,
          });
        }
      }
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "Format file tidak valid. Gunakan file Excel (.xlsx atau .xls)",
          { autoClose: 5000 }
        );
        e.target.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran file terlalu besar. Maksimal 2MB", {
          autoClose: 5000,
        });
        e.target.value = "";
        return;
      }

      setImportFile(file);
    }
  };

  const processImportData = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          if (jsonData.length < 2) {
            reject(new Error("File Excel kosong atau tidak memiliki data"));
            return;
          }

          const [headers, ...rows] = jsonData;
          const namaIndex = headers.findIndex(
            (header) =>
              header && header.toString().toLowerCase().includes("nama")
          );

          if (namaIndex === -1) {
            reject(new Error("Kolom 'Nama Penempatan' tidak ditemukan"));
            return;
          }

          const validData = [];
          const errors = [];
          const existingNames = allDivisions.map((d) => d.nama.toLowerCase());
          const seenNames = new Set();

          rows.forEach((row, index) => {
            const rowNumber = index + 2;
            const nama = row[namaIndex];

            if (!nama || nama.toString().trim() === "") {
              errors.push(`Baris ${rowNumber}: Nama penempatan kosong`);
              return;
            }

            const namaClean = nama.toString().trim();
            const namaLower = namaClean.toLowerCase();

            if (existingNames.includes(namaLower)) {
              errors.push(
                `Baris ${rowNumber}: Penempatan "${namaClean}" sudah ada`
              );
              return;
            }

            if (seenNames.has(namaLower)) {
              errors.push(`Baris ${rowNumber}: Duplikat dalam file`);
              return;
            }

            if (namaClean.length > 255) {
              errors.push(`Baris ${rowNumber}: Nama terlalu panjang`);
              return;
            }

            validData.push({ nama: namaClean });
            seenNames.add(namaLower);
          });

          resolve({ validData, errors });
        } catch (error) {
          reject(new Error("Gagal membaca file Excel: " + error.message));
        }
      };

      reader.onerror = () => reject(new Error("Gagal membaca file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Pilih file Excel terlebih dahulu", { autoClose: 3000 });
      return;
    }

    setImportLoading(true);

    try {
      const { validData, errors } = await processImportData(importFile);

      if (validData.length === 0) {
        toast.error("Tidak ada data valid untuk diimport", { autoClose: 5000 });
        setImportLoading(false);
        return;
      }

      const result = await Swal.fire({
        title: "Konfirmasi Import",
        text: `${validData.length} penempatan akan diimport`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#ea580c",
      });

      if (result.isConfirmed) {
        for (const divisi of validData) {
          await call(divisiAPI.create, divisi);
        }

        clearApiCache("/divisis");
        clearApiCache();

        if (typeof window !== "undefined") {
          localStorage.removeItem("divisi_cache");
          localStorage.removeItem("divisi_cache_timestamp");
        }

        toast.success(`${validData.length} penempatan berhasil diimport`, {
          autoClose: 5000,
        });

        await new Promise((resolve) => setTimeout(resolve, 300));
        await fetchAllData(true);
        handleCloseModal();
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error(err.message || "Gagal mengimport file", { autoClose: 5000 });
    } finally {
      setImportLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      Swal.fire({
        title: "Mengekspor Data",
        text: "Sedang menyiapkan file export...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("Token tidak ditemukan");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/divisis/export`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        }
      );

      if (!response.ok)
        throw new Error(`Export gagal (Status: ${response.status})`);

      const blob = await response.blob();
      if (blob.size === 0) throw new Error("File export kosong");

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data-penempatan-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
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

  const downloadTemplate = () => {
    try {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Nama Penempatan"],
        ["IT"],
        ["HRD"],
        ["Finance"],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, `template-penempatan.xlsx`);
      toast.success("Template berhasil diunduh!");
    } catch (error) {
      toast.error("Gagal mengunduh template", { autoClose: 3000 });
    }
  };

  if (!initialLoadComplete) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
              <div className="flex gap-2">
                <div className="h-10 bg-gray-200 rounded w-32"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
                <div className="h-10 bg-gray-200 rounded w-40"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-8 bg-gray-200 rounded w-48"></div>
                <div className="h-8 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="h-12 bg-gray-300 rounded"></div>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Data Penempatan
          </h1>
          <p className="text-gray-600">Kelola daftar penempatan perusahaan</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2 hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Penempatan
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari penempatan..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              onChange={(e) =>
                handleItemsPerPageChange(parseInt(e.target.value))
              }
              className="px-3 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {VALIDATION.PAGINATION.DEFAULT_LIMITS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600">entri</span>
          </div>
          <div className="text-sm text-gray-600">
            {paginationData.pagination.total} data
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <tr>
                {[
                  { key: "id", label: "ID Penempatan" },
                  { key: "nama", label: "Nama Penempatan" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-6 py-4 text-left font-semibold cursor-pointer hover:bg-orange-600 transition-colors"
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      <div className="flex flex-col">
                        <ChevronUp
                          className={`w-3 h-3 ${
                            sortField === col.key && sortDirection === "asc"
                              ? "text-white"
                              : "text-orange-300"
                          }`}
                        />
                        <ChevronDown
                          className={`w-3 h-3 -mt-1 ${
                            sortField === col.key && sortDirection === "desc"
                              ? "text-white"
                              : "text-orange-300"
                          }`}
                        />
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginationData.items.map((d, index) => (
                <tr
                  key={d.id}
                  className={`border-b hover:bg-orange-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {d.id}
                  </td>
                  <td className="px-6 py-4 text-gray-900">{d.nama}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleOpenEditModal(d)}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Edit penempatan"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg ml-2 transition-colors"
                      title="Hapus penempatan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {paginationData.items.length === 0 && (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {searchTerm.trim()
                      ? "Tidak ada data yang sesuai dengan pencarian"
                      : "Belum ada data penempatan"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div>
            Halaman {paginationData.pagination.current_page} dari{" "}
            {paginationData.pagination.last_page}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={() =>
                handlePageChange(
                  Math.max(1, paginationData.pagination.current_page - 1)
                )
              }
              disabled={paginationData.pagination.current_page === 1}
              className="p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {(() => {
              const totalPages = paginationData.pagination.last_page;
              const currentPage = paginationData.pagination.current_page;
              const pages = [];

              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (currentPage > 3) pages.push("...");
                for (
                  let i = Math.max(2, currentPage - 1);
                  i <= Math.min(totalPages - 1, currentPage + 1);
                  i++
                ) {
                  if (!pages.includes(i)) pages.push(i);
                }
                if (currentPage < totalPages - 2) pages.push("...");
                if (!pages.includes(totalPages)) pages.push(totalPages);
              }

              return pages.map((page, index) => {
                if (page === "...") {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-3 py-1 text-gray-400"
                    >
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={`page-${page}`}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded-lg transition-colors min-w-[40px] ${
                      paginationData.pagination.current_page === page
                        ? "bg-orange-600 text-white font-semibold shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              });
            })()}

            <button
              onClick={() =>
                handlePageChange(
                  Math.min(
                    paginationData.pagination.last_page,
                    paginationData.pagination.current_page + 1
                  )
                )
              }
              disabled={
                paginationData.pagination.current_page ===
                paginationData.pagination.last_page
              }
              className="p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Tambah Penempatan</h2>
              <button onClick={handleCloseModal} disabled={submitLoading}>
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Penempatan *
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) =>
                  setFormData({ ...formData, nama: e.target.value })
                }
                placeholder="Masukkan nama penempatan"
                className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  formErrors.nama ? "border-red-500" : "border-gray-200"
                }`}
                disabled={submitLoading}
                maxLength={255}
              />
              {formErrors.nama && (
                <p className="text-red-500 text-sm mt-1">
                  {formErrors.nama[0]}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Maksimal 255 karakter
              </p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={submitLoading}
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Edit Penempatan</h2>
              <button onClick={handleCloseModal} disabled={submitLoading}>
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Penempatan *
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) =>
                  setFormData({ ...formData, nama: e.target.value })
                }
                placeholder="Masukkan nama penempatan"
                className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  formErrors.nama ? "border-red-500" : "border-gray-200"
                }`}
                disabled={submitLoading}
                maxLength={255}
              />
              {formErrors.nama && (
                <p className="text-red-500 text-sm mt-1">
                  {formErrors.nama[0]}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Maksimal 255 karakter
              </p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={submitLoading}
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Import Data Excel
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
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
                <p className="text-gray-600 mb-4">
                  Format: .xlsx, .xls (Maksimal 2MB)
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  id="divisi-import"
                  onChange={handleFileSelect}
                  disabled={importLoading}
                />
                <label
                  htmlFor="divisi-import"
                  className={`px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer inline-block ${
                    importLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {importFile ? "Ganti File" : "Pilih File"}
                </label>
              </div>

              {importFile && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Upload className="w-4 h-4" />
                    <span className="font-medium">
                      File dipilih: {importFile.name}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Ukuran: {(importFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">
                  Catatan Penting:
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Nama penempatan harus unik (tidak boleh duplikat)</li>
                  <li>• Maksimal 255 karakter per nama</li>
                  <li>• Data duplikat akan diabaikan</li>
                  <li>• Gunakan template untuk format yang benar</li>
                </ul>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={downloadTemplate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={importLoading}
                >
                  Download Template
                </button>
                <button
                  onClick={handleImport}
                  className={`flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    !importFile ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={!importFile || importLoading}
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
            <div className="px-6 py-4 border-t flex items-center justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={importLoading}
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

export default DataDivisi;
