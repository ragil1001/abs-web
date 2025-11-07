"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Users,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Loader2,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { projectAPI, karyawanProjectAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { clearApiCache } from "@/lib/axios";

const AssignPage = ({ onNavigateToDetail }) => {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectStats, setProjectStats] = useState({}); // 🔥 NEW: Store karyawan count per project
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("aktif");
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const { loading: fetchLoading, call } = useApi();

  // 🔥 NEW: Fetch karyawan count for each project
  const fetchProjectStats = useCallback(
    async (projectList) => {
      const stats = {};

      // Fetch count for each project
      const promises = projectList.map(async (project) => {
        try {
          const response = await call(
            karyawanProjectAPI.getByProject,
            project.id,
            {
              status: "aktif",
              per_page: 1, // Only need count, not data
            }
          );

          if (response.success && response.pagination) {
            stats[project.id] = response.pagination.total;
          } else {
            stats[project.id] = 0;
          }
        } catch (err) {
          console.error(`Error fetching stats for project ${project.id}:`, err);
          stats[project.id] = 0;
        }
      });

      await Promise.all(promises);
      setProjectStats(stats);
    },
    [call]
  );

  // 🚀 OPTIMIZED: Fetch data dengan initial load flag
  const fetchAllData = useCallback(async () => {
    try {
      clearApiCache();

      const response = await call(projectAPI.getAll);
      if (response.success) {
        const projectList = response.data || [];
        setProjects(projectList);
        setCurrentPage(1);

        // 🔥 Fetch real-time karyawan count
        await fetchProjectStats(projectList);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setProjects([]);
      toast.error("Gagal memuat data project");
    } finally {
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    }
  }, [call, initialLoadComplete, fetchProjectStats]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = projects.filter(
      (p) =>
        (statusFilter === "all" ? true : p.status === statusFilter) &&
        (p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.id &&
            p.id.toString().toLowerCase().includes(searchTerm.toLowerCase())))
    );

    filtered = [...filtered].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      return sortDirection === "asc"
        ? aVal > bVal
          ? 1
          : -1
        : aVal < bVal
        ? 1
        : -1;
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
      },
    };
  }, [processedData, currentPage, itemsPerPage]);

  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
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

  const handleFilterChange = useCallback((value) => {
    setStatusFilter(value);
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

  const handleItemsPerPageChange = useCallback((newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
  }, []);

  const formatShifts = (shifts) => {
    if (!shifts || shifts.length === 0) return "-";
    return shifts.map((s, idx) => ({
      name: `Shift ${idx + 1}`,
      time: `${s.waktu_mulai} - ${s.waktu_selesai}`,
    }));
  };

  const openGoogleMaps = (lat, lng) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
    }
  };

  // 🚀 CRITICAL: Show loading skeleton until initial load complete
  if (!initialLoadComplete) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
          </div>

          {/* Search Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 animate-pulse space-y-4">
              <div className="flex justify-between">
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
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Assign Karyawan ke Project</h1>
            <p className="text-gray-600">
              Kelola penugasan karyawan untuk setiap project
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
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

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center gap-2">
            Tampilkan
            <select
              value={itemsPerPage}
              onChange={(e) =>
                handleItemsPerPageChange(parseInt(e.target.value))
              }
              className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            entri
          </div>
          <div>
            Menampilkan{" "}
            {(paginationData.pagination.current_page - 1) *
              paginationData.pagination.per_page +
              1}
            -
            {Math.min(
              paginationData.pagination.current_page *
                paginationData.pagination.per_page,
              paginationData.pagination.total
            )}{" "}
            dari {paginationData.pagination.total} data
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <tr>
                {[
                  { key: "id", label: "ID Project" },
                  { key: "nama", label: "Nama Project" },
                  { key: "shifts", label: "Shift" },
                  { key: "lokasi_nama", label: "Lokasi" },
                  { key: "bagian", label: "Bagian" },
                  { key: "status", label: "Status" },
                  { key: "total_karyawan", label: "Total Karyawan" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left cursor-pointer hover:bg-orange-600 transition-colors"
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <div className="flex flex-col">
                        <ChevronUp
                          className={`w-3 h-3 ${
                            sortField === col.key && sortDirection === "asc"
                              ? "text-white"
                              : "text-orange-200"
                          }`}
                        />
                        <ChevronDown
                          className={`w-3 h-3 -mt-1 ${
                            sortField === col.key && sortDirection === "desc"
                              ? "text-white"
                              : "text-orange-200"
                          }`}
                        />
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
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                      <p className="text-gray-600">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : paginationData.items.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {searchTerm
                      ? "Tidak ada data yang sesuai dengan pencarian"
                      : "Belum ada data project"}
                  </td>
                </tr>
              ) : (
                paginationData.items.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-100 hover:bg-orange-50 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">
                      PRJ{String(p.id).padStart(3, "0")}
                    </td>
                    <td className="px-4 py-3 font-medium">{p.nama}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {formatShifts(p.shifts).map((shift, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium text-gray-700">
                              {shift.name}:
                            </span>
                            <span className="text-gray-600 ml-1">
                              {shift.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {p.lokasi_nama || p.lokasi?.nama}
                        </div>
                        <button
                          onClick={() =>
                            openGoogleMaps(
                              p.lokasi_latitude || p.lokasi?.latitude,
                              p.lokasi_longitude || p.lokasi?.longitude
                            )
                          }
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-0.5 flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          {p.lokasi_latitude || p.lokasi?.latitude},{" "}
                          {p.lokasi_longitude || p.lokasi?.longitude}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">{p.bagian}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                          ${
                            p.status === "aktif"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                      >
                        {p.status === "aktif" ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm">
                        <Users className="w-4 h-4" />
                        {/* 🔥 FIXED: Use real-time count from projectStats */}
                        {projectStats[p.id] !== undefined ? (
                          projectStats[p.id]
                        ) : (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onNavigateToDetail(p)}
                        className="px-3 py-1.5 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors text-sm font-medium"
                        title="Kelola Karyawan"
                      >
                        Kelola
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Fixed Pagination */}
        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div>
            Halaman {paginationData.pagination.current_page} dari{" "}
            {paginationData.pagination.last_page}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={() =>
                handlePageChange(paginationData.pagination.current_page - 1)
              }
              disabled={
                paginationData.pagination.current_page === 1 || fetchLoading
              }
              className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {(() => {
              const totalPages = paginationData.pagination.last_page;
              const currentPage = paginationData.pagination.current_page;
              const pages = [];

              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                pages.push(1);

                if (currentPage > 3) {
                  pages.push("...");
                }

                for (
                  let i = Math.max(2, currentPage - 1);
                  i <= Math.min(totalPages - 1, currentPage + 1);
                  i++
                ) {
                  if (!pages.includes(i)) {
                    pages.push(i);
                  }
                }

                if (currentPage < totalPages - 2) {
                  pages.push("...");
                }

                if (!pages.includes(totalPages)) {
                  pages.push(totalPages);
                }
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
                    disabled={fetchLoading}
                    className={`px-3 py-1 rounded-lg transition-colors min-w-[40px] ${
                      paginationData.pagination.current_page === page
                        ? "bg-orange-600 text-white font-semibold shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    } disabled:opacity-50`}
                  >
                    {page}
                  </button>
                );
              });
            })()}

            <button
              onClick={() =>
                handlePageChange(paginationData.pagination.current_page + 1)
              }
              disabled={
                paginationData.pagination.current_page ===
                  paginationData.pagination.last_page || fetchLoading
              }
              className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignPage;
