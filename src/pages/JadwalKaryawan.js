"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { generateExcelTemplate } from "@/utils/exportFunctions/exportScheduleToExcel";
import exportScheduleToExcel from "@/utils/exportFunctions/exportScheduleToExcel";
import {
  Calendar,
  Upload,
  Download,
  Search,
  Filter,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Building,
  MapPin,
  Briefcase,
  ExternalLink,
  Users,
  Clock,
  X,
  FileText,
  AlertCircle,
  ChevronDown,
  Trash2,
  Loader2,
} from "lucide-react";
import { dateHelpers } from "@/utils/helpers";
import { useApi } from "@/hooks/useApi";
import { jadwalKaryawanAPI, projectAPI, karyawanProjectAPI } from "@/lib/api";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { clearApiCache } from "@/lib/axios";

const JadwalKaryawan = () => {
  const HEADER_ROW_HEIGHT = 20;

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [scheduleData, setScheduleData] = useState([]);
  const [assignedKaryawan, setAssignedKaryawan] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState("nama");
  const [sortDirection, setSortDirection] = useState("asc");

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importProjectId, setImportProjectId] = useState("");
  const [importPeriod, setImportPeriod] = useState("");
  const [selectedTemplateDate, setSelectedTemplateDate] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportDate, setSelectedExportDate] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const [earliestScheduleDate, setEarliestScheduleDate] = useState(null);

  const { loading, call } = useApi();

  const currentProject = useMemo(
    () => projects.find((p) => p.id === parseInt(selectedProject)),
    [selectedProject, projects]
  );

  const importProject = useMemo(
    () => projects.find((p) => p.id === parseInt(importProjectId)),
    [importProjectId, projects]
  );

  const periodOptions = useMemo(() => {
    if (!currentProject) return [];

    const projectStartDate = new Date(currentProject.tanggal_mulai);

    let startDate;
    if (earliestScheduleDate) {
      const earliestDate = new Date(earliestScheduleDate);
      startDate =
        projectStartDate < earliestDate ? projectStartDate : earliestDate;
    } else {
      startDate = projectStartDate;
    }

    const today = new Date();
    const periods = [];
    let currentDate = new Date(startDate);

    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 12);

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
  }, [currentProject, earliestScheduleDate]);

  const importPeriodOptions = useMemo(() => {
    if (!importProject) return [];

    const projectStartDate = new Date(importProject.tanggal_mulai);
    const today = new Date();
    const periods = [];
    let currentDate = new Date(projectStartDate);

    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 12);

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
  }, [importProject]);

  const calendarData = useMemo(() => {
    if (!selectedPeriod || periodOptions.length === 0) return null;

    const period = periodOptions.find((p) => p.value === selectedPeriod);
    if (!period) return null;

    const { startDate, endDate } = period;
    const days = [];
    const dayNames = ["Mgg", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      days.push({
        date: currentDate.getDate(),
        fullDate: dateHelpers.formatForAPI(currentDate),
        dayName: dayNames[currentDate.getDay()],
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
        month: currentDate.getMonth(),
        year: currentDate.getFullYear(),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const startMonth = `${
      monthNames[startDate.getMonth()]
    } ${startDate.getFullYear()}`;
    const endMonth = `${
      monthNames[endDate.getMonth()]
    } ${endDate.getFullYear()}`;
    const monthHeader =
      startMonth === endMonth
        ? startMonth
        : `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()} - ${
            monthNames[endDate.getMonth()]
          } ${endDate.getFullYear()}`;

    return { days, monthHeader, totalDays: days.length };
  }, [selectedPeriod, periodOptions]);

  const fetchProjects = useCallback(async () => {
    try {
      clearApiCache();
      const response = await call(projectAPI.getAll);
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (err) {
      console.error("Fetch projects error:", err);
      toast.error("Gagal memuat data project");
      setProjects([]);
    } finally {
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    }
  }, [call, initialLoadComplete]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchEarliestScheduleDate = useCallback(async () => {
    if (!currentProject) return;

    try {
      const response = await call(
        jadwalKaryawanAPI.getByProject,
        currentProject.id,
        {
          start_date: currentProject.tanggal_mulai,
          end_date: dateHelpers.formatForAPI(
            new Date(new Date().setFullYear(new Date().getFullYear() + 2))
          ),
        }
      );

      if (response.success && response.data && response.data.length > 0) {
        let earliest = null;

        response.data.forEach((item) => {
          if (item.jadwals && item.jadwals.length > 0) {
            item.jadwals.forEach((jadwal) => {
              if (!earliest || jadwal.tanggal < earliest) {
                earliest = jadwal.tanggal;
              }
            });
          }
        });

        if (earliest) {
          setEarliestScheduleDate(earliest);
        } else {
          setEarliestScheduleDate(null);
        }
      } else {
        setEarliestScheduleDate(null);
      }
    } catch (err) {
      console.error("Error fetching earliest schedule date:", err);
      setEarliestScheduleDate(null);
    }
  }, [currentProject, call]);

  useEffect(() => {
    if (currentProject) {
      fetchEarliestScheduleDate();
    } else {
      setEarliestScheduleDate(null);
    }
  }, [currentProject, fetchEarliestScheduleDate]);

  useEffect(() => {
    if (periodOptions.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periodOptions[0].value);
    }
  }, [periodOptions, selectedPeriod]);

  useEffect(() => {
    if (currentProject && calendarData) {
      fetchScheduleData();
      fetchAssignedKaryawan();
    }
  }, [currentProject, calendarData]);

  const fetchAssignedKaryawan = useCallback(async () => {
    if (!currentProject) return;

    try {
      const response = await call(
        karyawanProjectAPI.getByProject,
        currentProject.id,
        {
          status: "aktif",
          per_page: 1000,
        }
      );

      if (response.success) {
        setAssignedKaryawan(response.data || []);
      }
    } catch (err) {
      console.error("Fetch assigned karyawan error:", err);
      setAssignedKaryawan([]);
    }
  }, [currentProject, call]);

  const fetchScheduleData = useCallback(async () => {
    if (!currentProject || !calendarData) return;

    setScheduleLoading(true);
    try {
      const response = await call(
        jadwalKaryawanAPI.getByProject,
        currentProject.id,
        {
          start_date: calendarData.days[0].fullDate,
          end_date: calendarData.days[calendarData.days.length - 1].fullDate,
        }
      );

      if (response.success && response.data && response.data.length > 0) {
        const mappedData = response.data.map((item, index) => {
          const dateJadwalMap = {};
          if (item.jadwals && item.jadwals.length > 0) {
            item.jadwals.forEach((jadwal) => {
              dateJadwalMap[jadwal.tanggal] = jadwal;
            });
          }

          const jadwalsData = calendarData.days.map((day) => {
            return dateJadwalMap[day.fullDate] || null;
          });

          const shifts = jadwalsData.map((j) => (j ? j.shift_code : "-"));

          return {
            no: index + 1,
            nik: item.karyawan.nik,
            nama: item.karyawan.nama,
            karyawan_project_id: item.karyawan_project_id,
            shifts: shifts,
            jadwals: jadwalsData,
          };
        });

        setScheduleData(mappedData);
      } else {
        if (assignedKaryawan.length > 0) {
          const emptySchedule = assignedKaryawan.map((kp, index) => ({
            no: index + 1,
            nik: kp.karyawan.nik,
            nama: kp.karyawan.nama,
            karyawan_project_id: kp.id,
            shifts: Array(calendarData.days.length).fill("-"),
            jadwals: [],
          }));
          setScheduleData(emptySchedule);
        } else {
          setScheduleData([]);
        }
      }
    } catch (err) {
      console.error("Fetch schedule error:", err);
      if (assignedKaryawan.length > 0 && calendarData) {
        const emptySchedule = assignedKaryawan.map((kp, index) => ({
          no: index + 1,
          nik: kp.karyawan.nik,
          nama: kp.karyawan.nama,
          karyawan_project_id: kp.id,
          shifts: Array(calendarData.days.length).fill("-"),
          jadwals: [],
        }));
        setScheduleData(emptySchedule);
      } else {
        setScheduleData([]);
      }
    } finally {
      setScheduleLoading(false);
    }
  }, [currentProject, calendarData, assignedKaryawan, call]);

  const formatTime = (timeString) => {
    if (!timeString) return "";
    return timeString.substring(0, 5);
  };

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
      window.open(`https://www.google.com/maps/@${lat},${lng},18z`, "_blank");
    }
  }, []);

  const handleDownloadTemplate = useCallback(async () => {
    if (!selectedTemplateDate || !importProject) {
      toast.warning(
        "Silakan pilih project dan periode template terlebih dahulu"
      );
      return;
    }

    try {
      const response = await call(
        karyawanProjectAPI.getByProject,
        importProject.id,
        {
          status: "aktif",
          per_page: 1000,
        }
      );

      if (response.success && response.data.length === 0) {
        toast.warning("Tidak ada karyawan yang di-assign ke project ini");
        return;
      }

      const karyawanForTemplate = response.data.map((kp, index) => ({
        no: index + 1,
        nik: kp.karyawan.nik,
        nama: kp.karyawan.nama,
        divisi: kp.karyawan.divisi?.nama || "-",
      }));

      const projectWithShifts = {
        ...importProject,
        shiftCodes: (
          importProject.shifts ||
          importProject.shiftProjects ||
          []
        ).map((s) => ({
          code: s.kode,
          jam: `${formatTime(s.waktu_mulai)} - ${formatTime(s.waktu_selesai)}`,
          label: s.kode,
        })),
      };

      await generateExcelTemplate({
        currentProject: projectWithShifts,
        templatePeriodOptions: importPeriodOptions,
        dummyEmployees: karyawanForTemplate,
        templateDate: selectedTemplateDate,
      });

      toast.success("Template berhasil diunduh!");
    } catch (error) {
      console.error("Error generating template:", error);
      toast.error("Gagal membuat template. Silakan coba lagi.");
    }
  }, [selectedTemplateDate, importProject, importPeriodOptions, call]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = [".csv", ".xlsx", ".xls"];
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf("."));

      if (!allowedTypes.includes(fileExtension)) {
        toast.error(
          "Format file tidak didukung. Gunakan file CSV atau Excel (.xlsx/.xls)"
        );
        event.target.value = "";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file terlalu besar. Maksimal 5MB");
        event.target.value = "";
        return;
      }

      setImportFile(file);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!importFile || !importProject || !importPeriod) {
      toast.error(
        "Lengkapi semua data terlebih dahulu (project, periode, dan file)"
      );
      return;
    }

    const result = await Swal.fire({
      title: "Konfirmasi Import",
      html: `Import jadwal untuk project <b>${importProject.nama}</b>?<br><small>Data jadwal yang sudah ada akan diganti (kecuali tanggal yang sudah lewat).</small>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Import",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    setImportLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("period_start", importPeriod);

      const response = await call(
        jadwalKaryawanAPI.import,
        importProject.id,
        formData
      );

      if (response.success) {
        toast.success(response.message || "Jadwal berhasil diimport!");

        if (response.errors && response.errors.length > 0) {
          const errorList = response.errors.slice(0, 10).join("<br>");
          const moreErrors =
            response.errors.length > 10
              ? `<br>...dan ${response.errors.length - 10} error lainnya`
              : "";

          await Swal.fire({
            title: "Beberapa Data Gagal Diimport",
            html: errorList + moreErrors,
            icon: "warning",
            confirmButtonColor: "#ea580c",
          });
        }

        clearApiCache();

        if (currentProject && currentProject.id === importProject.id) {
          await fetchEarliestScheduleDate();
          await fetchScheduleData();
        }

        setShowImportModal(false);
        setImportFile(null);
        setImportProjectId("");
        setImportPeriod("");
        setSelectedTemplateDate("");
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error(err.message || "Gagal mengimport jadwal");
    } finally {
      setImportLoading(false);
    }
  }, [
    importFile,
    importProject,
    importPeriod,
    call,
    fetchScheduleData,
    fetchEarliestScheduleDate,
    currentProject,
  ]);

  const handleExportClick = useCallback(() => {
    if (!currentProject) {
      toast.warning("Pilih project terlebih dahulu");
      return;
    }
    setSelectedExportDate(selectedPeriod || "");
    setShowExportModal(true);
  }, [currentProject, selectedPeriod]);

  const handleExport = useCallback(async () => {
    if (!selectedExportDate || !currentProject) {
      toast.warning("Silakan pilih periode export terlebih dahulu");
      return;
    }

    setExportLoading(true);

    try {
      const selectedExportPeriod = periodOptions.find(
        (p) => p.value === selectedExportDate
      );
      if (!selectedExportPeriod) {
        throw new Error("Periode tidak valid");
      }

      const response = await call(
        jadwalKaryawanAPI.getByProject,
        currentProject.id,
        {
          start_date: dateHelpers.formatForAPI(selectedExportPeriod.startDate),
          end_date: dateHelpers.formatForAPI(selectedExportPeriod.endDate),
        }
      );

      let employeesForExport = [];

      if (response.success && response.data && response.data.length > 0) {
        employeesForExport = response.data.map((item, index) => ({
          no: index + 1,
          nik: item.karyawan.nik,
          nama: item.karyawan.nama,
          shifts: item.jadwals.map((j) => j.shift_code),
        }));
      } else {
        const karyawanResponse = await call(
          karyawanProjectAPI.getByProject,
          currentProject.id,
          {
            status: "aktif",
            per_page: 1000,
          }
        );

        if (karyawanResponse.success && karyawanResponse.data.length > 0) {
          const dayCount =
            Math.ceil(
              (selectedExportPeriod.endDate - selectedExportPeriod.startDate) /
                (1000 * 60 * 60 * 24)
            ) + 1;
          employeesForExport = karyawanResponse.data.map((kp, index) => ({
            no: index + 1,
            nik: kp.karyawan.nik,
            nama: kp.karyawan.nama,
            shifts: Array(dayCount).fill(""),
          }));
        }
      }

      if (employeesForExport.length === 0) {
        toast.warning("Tidak ada data untuk diekspor");
        setExportLoading(false);
        return;
      }

      const projectWithShifts = {
        ...currentProject,
        shiftCodes: (
          currentProject.shifts ||
          currentProject.shiftProjects ||
          []
        ).map((s) => ({
          code: s.kode,
          jam: `${formatTime(s.waktu_mulai)} - ${formatTime(s.waktu_selesai)}`,
        })),
      };

      await exportScheduleToExcel({
        currentProject: projectWithShifts,
        exportPeriodOptions: periodOptions,
        exportDate: selectedExportDate,
        employees: employeesForExport,
      });

      toast.success("Jadwal berhasil diekspor!");
      setShowExportModal(false);
      setSelectedExportDate("");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Gagal mengekspor jadwal. Silakan coba lagi.");
    } finally {
      setExportLoading(false);
    }
  }, [selectedExportDate, currentProject, periodOptions, call]);

  const handleDeletePeriode = useCallback(async () => {
    if (!currentProject || !calendarData) {
      toast.warning("Pilih project dan periode terlebih dahulu");
      return;
    }

    const result = await Swal.fire({
      title: "Hapus Jadwal Periode Ini?",
      html: `Hapus semua jadwal untuk periode <b>${calendarData.monthHeader}</b>?<br><small class="text-red-600">Aksi ini tidak dapat dibatalkan!</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await call(
        jadwalKaryawanAPI.deleteByPeriode,
        currentProject.id,
        {
          start_date: calendarData.days[0].fullDate,
          end_date: calendarData.days[calendarData.days.length - 1].fullDate,
        }
      );

      if (response.success) {
        toast.success(response.message || "Jadwal periode berhasil dihapus");
        clearApiCache();
        await fetchEarliestScheduleDate();
        await fetchScheduleData();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.message || "Gagal menghapus jadwal");
    }
  }, [
    currentProject,
    calendarData,
    call,
    fetchScheduleData,
    fetchEarliestScheduleDate,
  ]);

  const resetImportModal = useCallback(() => {
    setShowImportModal(false);
    setImportFile(null);
    setImportProjectId("");
    setImportPeriod("");
    setSelectedTemplateDate("");
    setImportLoading(false);
  }, []);

  const resetExportModal = useCallback(() => {
    setShowExportModal(false);
    setSelectedExportDate("");
    setExportLoading(false);
  }, []);

  const handleOpenImportModal = useCallback(() => {
    setImportProjectId(selectedProject || "");
    setImportPeriod(selectedPeriod || "");
    setSelectedTemplateDate(selectedPeriod || "");
    setShowImportModal(true);
  }, [selectedProject, selectedPeriod]);

  const filteredEmployees = useMemo(() => {
    const filtered = scheduleData.filter(
      (emp) =>
        emp.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.nik.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [scheduleData, searchTerm, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedEmployees = useMemo(() => {
    return filteredEmployees
      .slice(startIndex, startIndex + itemsPerPage)
      .map((emp, index) => ({
        ...emp,
        displayNo: startIndex + index + 1,
      }));
  }, [filteredEmployees, startIndex, itemsPerPage]);

  const leftTableRef = useRef(null);
  const rightTableRef = useRef(null);

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
  }, [paginatedEmployees, calendarData]);

  if (!initialLoadComplete) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 animate-pulse space-y-4">
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
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Jadwal Karyawan
            </h1>
            <p className="text-gray-600">
              Kelola jadwal shift karyawan per periode untuk setiap project
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Pilih Project *
            </label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setSelectedPeriod("");
                setCurrentPage(1);
                setScheduleData([]);
                setEarliestScheduleDate(null);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">-- Pilih Project --</option>
              {projects
                .filter((p) => p.status === "aktif")
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.nama}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Pilih Periode *
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!currentProject}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Cari Karyawan
            </label>
            <input
              type="text"
              placeholder="Cari NIK/Nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleOpenImportModal}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportClick}
                disabled={!selectedProject}
                className="px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                title="Export Jadwal"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
              <button
                onClick={handleDeletePeriode}
                disabled={
                  !selectedProject ||
                  !selectedPeriod ||
                  scheduleData.length === 0
                }
                className="px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                title="Hapus Jadwal Periode"
              >
                <Trash2 className="w-3 h-3" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      </div>

      {currentProject && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-orange-600" />
            Detail Project
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">
                  Nama Project
                </span>
              </div>
              <p className="font-semibold text-gray-900">
                {currentProject.nama}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">
                  Lokasi
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 flex-1">
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
                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Lihat di Google Maps"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">
                  Tanggal Mulai
                </span>
              </div>
              <p className="font-semibold text-gray-900">
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

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">
                  Total Karyawan
                </span>
              </div>
              <p className="font-semibold text-gray-900">
                {filteredEmployees.length} orang
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedProject && selectedPeriod && calendarData ? (
        <>
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Keterangan Kode Shift
              </h3>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              {currentProject.shifts && currentProject.shifts.length > 0 ? (
                currentProject.shifts.map((shift) => (
                  <div key={shift.id}>
                    <span className="font-semibold">{shift.kode}</span> ={" "}
                    {shift.kode} ({formatTime(shift.waktu_mulai)} -{" "}
                    {formatTime(shift.waktu_selesai)})
                  </div>
                ))
              ) : currentProject.shiftProjects &&
                currentProject.shiftProjects.length > 0 ? (
                currentProject.shiftProjects.map((shift) => (
                  <div key={shift.id}>
                    <span className="font-semibold">{shift.kode}</span> ={" "}
                    {shift.kode} ({formatTime(shift.waktu_mulai)} -{" "}
                    {formatTime(shift.waktu_selesai)})
                  </div>
                ))
              ) : (
                <p className="text-gray-500">
                  Tidak ada data shift untuk project ini
                </p>
              )}
              <div>
                <span className="font-semibold">L</span> = Libur (-)
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center text-sm text-gray-600">
              <div className="flex items-center gap-2">
                Tampilkan
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
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

            <div className="flex">
              <div className="flex-none w-[432px] border-r border-gray-100 bg-white">
                <table
                  ref={leftTableRef}
                  className="text-sm min-w-full border-collapse"
                >
                  <thead>
                    <tr>
                      <th
                        rowSpan={3}
                        className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white z-30 px-4 py-3 text-center font-semibold w-16 border-r border-orange-400 align-middle"
                        style={{
                          height: `${HEADER_ROW_HEIGHT * 5}px`,
                          minHeight: `${HEADER_ROW_HEIGHT * 5}px`,
                          boxSizing: "border-box",
                        }}
                      >
                        <div className="flex items-center justify-center h-full">
                          No
                        </div>
                      </th>

                      <th
                        rowSpan={3}
                        className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white z-30 px-4 py-3 text-center font-semibold w-40 border-r border-orange-400 align-middle cursor-pointer"
                        onClick={() => handleSort("nik")}
                        style={{
                          height: `${HEADER_ROW_HEIGHT * 5}px`,
                          minHeight: `${HEADER_ROW_HEIGHT * 5}px`,
                          boxSizing: "border-box",
                        }}
                      >
                        <div className="flex items-center justify-center gap-1 h-full">
                          NIK
                          <div className="flex flex-col ml-1">
                            <ChevronUp
                              className={`w-3 h-3 ${
                                sortField === "nik" && sortDirection === "asc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                            <ChevronDown
                              className={`w-3 h-3 -mt-1 ${
                                sortField === "nik" && sortDirection === "desc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                          </div>
                        </div>
                      </th>

                      <th
                        rowSpan={3}
                        className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white z-30 px-4 py-3 text-center font-semibold w-52 border-r border-orange-400 align-middle cursor-pointer"
                        onClick={() => handleSort("nama")}
                        style={{
                          height: `${HEADER_ROW_HEIGHT * 5}px`,
                          minHeight: `${HEADER_ROW_HEIGHT * 5}px`,
                          boxSizing: "border-box",
                        }}
                      >
                        <div className="flex items-center justify-center gap-1 h-full">
                          Nama
                          <div className="flex flex-col ml-1">
                            <ChevronUp
                              className={`w-3 h-3 ${
                                sortField === "nama" && sortDirection === "asc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                            <ChevronDown
                              className={`w-3 h-3 -mt-1 ${
                                sortField === "nama" && sortDirection === "desc"
                                  ? "text-white"
                                  : "text-orange-200"
                              }`}
                            />
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {scheduleLoading ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-3">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                            <p className="text-gray-600">Memuat jadwal...</p>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedEmployees.length === 0 ? (
                      <tr>
                        <td
                          colSpan="3"
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          {searchTerm
                            ? "Tidak ada data yang sesuai"
                            : "Belum ada jadwal"}
                        </td>
                      </tr>
                    ) : (
                      paginatedEmployees.map((employee, rowIdx) => (
                        <tr
                          key={employee.nik}
                          className={`border-b border-gray-100 ${
                            rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="px-4 py-3 text-center font-medium w-16 border-r border-gray-200">
                            {employee.displayNo}
                          </td>
                          <td className="px-4 py-3 font-medium w-40 border-r border-gray-200">
                            {employee.nik}
                          </td>
                          <td className="px-4 py-3 font-medium w-52 border-r border-gray-200">
                            {employee.nama}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table
                  ref={rightTableRef}
                  className="text-sm min-w-max border-collapse"
                >
                  <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <tr style={{ height: `${HEADER_ROW_HEIGHT}px` }}>
                      <th
                        className="px-2 py-2 text-center font-semibold"
                        colSpan={calendarData.totalDays}
                        style={{
                          height: `${HEADER_ROW_HEIGHT}px`,
                          boxSizing: "border-box",
                        }}
                      >
                        <div
                          className="sticky top-0 z-20"
                          style={{
                            height: `${HEADER_ROW_HEIGHT}px`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {calendarData.monthHeader}
                        </div>
                      </th>
                    </tr>

                    <tr style={{ height: `${HEADER_ROW_HEIGHT}px` }}>
                      {calendarData.days.map((day, idx) => (
                        <th
                          key={`date-${idx}`}
                          className={`px-2 py-2 text-center font-semibold min-w-[48px] border-l border-orange-400 ${
                            day.isWeekend ? "bg-red-600" : ""
                          }`}
                          style={{
                            height: `${HEADER_ROW_HEIGHT}px`,
                            boxSizing: "border-box",
                          }}
                        >
                          <div className="text-xs font-bold">{day.date}</div>
                        </th>
                      ))}
                    </tr>

                    <tr style={{ height: `${HEADER_ROW_HEIGHT}px` }}>
                      {calendarData.days.map((day, idx) => (
                        <th
                          key={`day-${idx}`}
                          className={`px-2 py-2 text-center font-semibold min-w-[48px] border-l border-orange-400 text-xs ${
                            day.isWeekend ? "bg-red-600" : ""
                          }`}
                          style={{
                            height: `${HEADER_ROW_HEIGHT}px`,
                            boxSizing: "border-box",
                          }}
                        >
                          {day.dayName}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {scheduleLoading ? (
                      <tr>
                        <td
                          colSpan={calendarData.totalDays}
                          className="px-6 py-12 text-center"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                            <p className="text-gray-600">Memuat jadwal...</p>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedEmployees.length > 0 ? (
                      paginatedEmployees.map((employee, rowIdx) => (
                        <tr
                          key={`right-${employee.nik}`}
                          className={`border-b border-gray-100 ${
                            rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          {employee.jadwals && employee.jadwals.length > 0
                            ? employee.jadwals.map((jadwalObj, shiftIdx) => {
                                const day = calendarData.days[shiftIdx];

                                const shift = jadwalObj
                                  ? jadwalObj.shift_code
                                  : "-";
                                const isDitukar = jadwalObj
                                  ? jadwalObj.is_ditukar
                                  : false;
                                const tukarInfo = jadwalObj
                                  ? jadwalObj.tukar_shift_info
                                  : null;

                                return (
                                  <td
                                    key={`shift-${shiftIdx}`}
                                    className={`px-2 py-3 text-center min-w-[48px] border-l border-gray-200 relative ${
                                      day?.isWeekend ? "bg-red-50" : ""
                                    } ${isDitukar ? "bg-amber-50" : ""}`}
                                    title={
                                      isDitukar && tukarInfo
                                        ? `Ditukar dengan ${tukarInfo.dengan}`
                                        : ""
                                    }
                                  >
                                    <div className="relative inline-block">
                                      <span
                                        className={`text-xs font-semibold ${
                                          isDitukar
                                            ? "text-amber-700"
                                            : "text-gray-700"
                                        }`}
                                      >
                                        {shift || "-"}
                                      </span>
                                      {isDitukar && (
                                        <span className="absolute -top-1 -right-2 text-amber-500">
                                          *
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })
                            : calendarData.days.map((day, shiftIdx) => (
                                <td
                                  key={`shift-empty-${shiftIdx}`}
                                  className={`px-2 py-3 text-center min-w-[48px] border-l border-gray-200 ${
                                    day?.isWeekend ? "bg-red-50" : ""
                                  }`}
                                >
                                  <span className="text-xs font-semibold text-gray-400">
                                    -
                                  </span>
                                </td>
                              ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={calendarData.totalDays}
                          className="px-6 py-12 text-center"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <Calendar className="w-12 h-12 text-gray-300" />
                            <div>
                              <p className="text-gray-700 font-medium mb-1">
                                {searchTerm
                                  ? "Tidak ada data yang sesuai dengan pencarian"
                                  : "Belum ada jadwal untuk periode ini"}
                              </p>
                              <p className="text-sm text-gray-500">
                                {searchTerm
                                  ? "Coba gunakan kata kunci pencarian yang berbeda"
                                  : "Silakan import jadwal atau karyawan belum memiliki jadwal"}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-between items-center text-sm">
              <div>
                Halaman {currentPage} dari {totalPages}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || scheduleLoading}
                  className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
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
                  disabled={currentPage === totalPages || scheduleLoading}
                  className="p-2 disabled:opacity-50 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Pilih Project dan Periode
          </h3>
          <p className="text-gray-600">
            Silakan pilih project dan periode untuk melihat jadwal karyawan
          </p>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Import Jadwal Karyawan</h2>
              <button
                onClick={resetImportModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
                disabled={importLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-blue-900">
                  Pilih Project & Periode Import
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project *
                  </label>
                  <select
                    value={importProjectId}
                    onChange={(e) => {
                      setImportProjectId(e.target.value);
                      setImportPeriod("");
                      setSelectedTemplateDate("");
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={importLoading}
                  >
                    <option value="">-- Pilih Project --</option>
                    {projects
                      .filter((p) => p.status === "aktif")
                      .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.nama}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periode Import *
                  </label>
                  <select
                    value={importPeriod}
                    onChange={(e) => setImportPeriod(e.target.value)}
                    disabled={!importProject || importLoading}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Pilih Periode --</option>
                    {importPeriodOptions.map((period) => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Periode ini akan digunakan untuk import jadwal. Tanggal yang
                    sudah lewat tidak akan diubah.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  1. Download Template Excel
                </h3>
                <p className="text-sm text-gray-600">
                  Template akan berisi daftar karyawan yang sudah di-assign ke
                  project ini dan format jadwal yang sesuai.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Periode Template *
                  </label>
                  <select
                    value={selectedTemplateDate}
                    onChange={(e) => setSelectedTemplateDate(e.target.value)}
                    disabled={!importProject || importLoading}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Pilih Periode --</option>
                    {importPeriodOptions.map((period) => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleDownloadTemplate}
                  disabled={
                    !selectedTemplateDate || !importProject || importLoading
                  }
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-5 h-5" />
                  Download Template Excel
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  2. Upload File Excel
                </h3>
                <p className="text-sm text-gray-600">
                  Upload file Excel yang telah diisi dengan data jadwal
                  karyawan. Pastikan format sesuai dengan template.
                </p>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="import-file"
                    disabled={importLoading}
                  />
                  <label
                    htmlFor="import-file"
                    className={`cursor-pointer flex flex-col items-center gap-2 ${
                      importLoading ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    <Upload className="w-12 h-12 text-gray-400" />
                    <span className="text-gray-600">
                      {importFile
                        ? importFile.name
                        : "Klik untuk pilih file atau drag & drop"}
                    </span>
                    <span className="text-xs text-gray-500">
                      Format yang didukung: CSV, Excel (.xlsx, .xls)
                    </span>
                  </label>
                </div>

                {importFile && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700">
                        File siap diimport: {importFile.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <h4 className="font-semibold mb-2">Petunjuk Import:</h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Pilih project dan periode import terlebih dahulu</li>
                      <li>
                        Download template sesuai project dan periode yang
                        dipilih
                      </li>
                      <li>
                        Isi kolom shift dengan kode shift yang telah ditentukan
                      </li>
                      <li>
                        Jangan mengubah struktur template atau header tabel
                      </li>
                      <li>Pastikan NIK karyawan sesuai dengan data yang ada</li>
                      <li>
                        Hanya karyawan yang sudah di-assign ke project yang bisa
                        diimport
                      </li>
                      <li>
                        <strong>
                          Tanggal yang sudah lewat tidak akan diubah
                        </strong>
                      </li>
                      <li>
                        Data jadwal masa depan akan diganti dengan data baru
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={resetImportModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={importLoading}
              >
                Batal
              </button>
              <button
                onClick={handleImport}
                disabled={
                  !importFile ||
                  !importProject ||
                  !importPeriod ||
                  importLoading
                }
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importLoading ? (
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
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Export Jadwal Karyawan</h2>
              <button
                onClick={resetExportModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
                disabled={exportLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Project Terpilih
                </h3>
                <p className="text-blue-800">{currentProject?.nama}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Pilih Periode Export
                </h3>
                <p className="text-sm text-gray-600">
                  Pilih periode yang ingin diekspor. File Excel akan berisi data
                  jadwal karyawan untuk periode tersebut.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periode Export *
                  </label>
                  <select
                    value={selectedExportDate}
                    onChange={(e) => setSelectedExportDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={exportLoading}
                  >
                    <option value="">-- Pilih Periode --</option>
                    {periodOptions.map((period) => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <h4 className="font-semibold mb-2">Informasi Export:</h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>
                        File Excel akan memiliki format yang sama dengan
                        template import
                      </li>
                      <li>
                        Kolom shift akan diisi dengan data jadwal yang sudah ada
                      </li>
                      <li>Jika belum ada jadwal, kolom shift akan kosong</li>
                      <li>
                        File dapat langsung digunakan untuk backup atau
                        referensi
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={resetExportModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={exportLoading}
              >
                Batal
              </button>
              <button
                onClick={handleExport}
                disabled={!selectedExportDate || exportLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengekspor...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export ke Excel
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

export default JadwalKaryawan;
