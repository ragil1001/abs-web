"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users, UserPlus, CheckCircle, Eye, Maximize, Minimize,
  Filter, Timer, User, XCircle, X, AlertCircle, Calendar,
  FileText, Clock, Download, RefreshCw, Loader2
} from 'lucide-react';
import { dashboardAPI, pengajuanIzinAPI } from '@/lib/api';
import { toast } from 'react-toastify';
import { forceDataRefresh } from '@/lib/axios';

const AdminDashboard = ({ onNavigate }) => {
  // State
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI States
  const [attendanceFullscreen, setAttendanceFullscreen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedShift, setSelectedShift] = useState('semua');
  const [selectedAttendanceType, setSelectedAttendanceType] = useState(null);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  
  // Modal States
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  // Refs
  const mountedRef = useRef(true);
  const fetchTimeoutRef = useRef(null);
  const autoRefreshIntervalRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];

  // 🚀 Fetch dashboard data - ALWAYS FRESH
  const fetchDashboardData = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      // Force clear cache before fetching
      forceDataRefresh();
      
      const params = {
        project_id: selectedProject,
        shift_code: selectedShift,
        _t: Date.now() // Cache buster
      };
      
      const result = await dashboardAPI.getData(params);
      
      if (result.success && mountedRef.current) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      if (mountedRef.current) {
        toast.error('Gagal memuat data dashboard');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedProject, selectedShift]);

  // 🔄 Auto-refresh every 30 seconds
  useEffect(() => {
    // Clear existing interval
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }

    // Set new interval for auto-refresh
    autoRefreshIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        fetchDashboardData(false);
      }
    }, 30000); // 30 seconds

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [fetchDashboardData]);

  // Debounced fetch on filter change
  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        fetchDashboardData(false);
      }
    }, 300);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [selectedProject, selectedShift, fetchDashboardData]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    fetchDashboardData(true);

    return () => {
      mountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, []);

  // 🎯 Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    forceDataRefresh();
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  // Navigation handler
  const handleNavigateTo = useCallback((page) => {
    if (onNavigate) {
      onNavigate(page);
    }
  }, [onNavigate]);

  const handleViewDetail = async (submission) => {
    try {
      const result = await pengajuanIzinAPI.getById(submission.id);
      if (result.success) {
        setSelectedSubmission(result.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      toast.error('Gagal memuat detail: ' + error.message);
    }
  };

  const handleConfirm = (submission, action) => {
    setSelectedSubmission(submission);
    setConfirmAction(action);
    setAdminNote('');
    setShowDetailModal(false);
    setShowConfirmModal(true);
  };

  const handleSubmitConfirmation = async () => {
    if (confirmAction === 'tolak' && !adminNote.trim()) {
      toast.error('Catatan wajib diisi saat menolak pengajuan');
      return;
    }

    setProcessing(true);
    try {
      const result = await pengajuanIzinAPI.prosesPengajuan(selectedSubmission.id, {
        action: confirmAction === 'approve' ? 'setujui' : 'tolak',
        catatan: adminNote.trim() || null
      });

      if (result.success) {
        toast.success(result.message || 'Pengajuan berhasil diproses');
        setShowConfirmModal(false);
        setSelectedSubmission(null);
        setAdminNote('');
        setConfirmAction('');
        
        // 🚀 Force refresh after approval
        forceDataRefresh();
        fetchDashboardData(false);
      }
    } catch (error) {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
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
      pending: 'bg-yellow-100 text-yellow-700',
      disetujui: 'bg-green-100 text-green-700',
      ditolak: 'bg-red-100 text-red-700',
      dibatalkan: 'bg-gray-100 text-gray-700'
    };
    const labels = {
      pending: 'Pending',
      disetujui: 'Disetujui',
      ditolak: 'Ditolak',
      dibatalkan: 'Dibatalkan'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handleDownloadFile = (fileUrl) => {
    if (!fileUrl) {
      toast.warning('File tidak tersedia');
      return;
    }
    window.open(fileUrl, '_blank');
  };

  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Loading Skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              {[1,2,3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded mb-3 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Extract data
  const employeeStats = dashboardData?.employee_stats || { total: 0, male: { count: 0, percentage: 0 }, female: { count: 0, percentage: 0 } };
  const attendanceStats = dashboardData?.attendance_stats || { chart_data: [], shifts: [] };
  const submissionList = dashboardData?.submissions || [];
  const projects = dashboardData?.projects || [];

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Dashboard HR</h2>
          <p className="text-gray-600">{currentDate}</p>
        </div>
        
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium text-gray-700">
            {refreshing ? 'Memuat...' : 'Refresh'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5 lg:p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">Karyawan</p>
              <p className="text-xs text-gray-500">Berdasarkan Jenis Kelamin</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex-shrink-0">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{employeeStats.male.percentage}% Laki-laki</p>
                  <p className="text-xs text-gray-500">{employeeStats.male.count} Orang</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{employeeStats.female.percentage}% Perempuan</p>
                  <p className="text-xs text-gray-500">{employeeStats.female.count} Orang</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Karyawan</p>
                  <p className="text-xs text-gray-500">{employeeStats.total} Orang</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm p-5 lg:p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">Aksi Cepat</p>
              <p className="text-xs text-gray-500">Navigasi cepat untuk admin</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleNavigateTo('data-karyawan')}
              className="flex items-center space-x-2 p-3 rounded-lg hover:bg-teal-50 transition-colors duration-200 text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-100 group-hover:bg-teal-200 flex items-center justify-center flex-shrink-0 transition-colors">
                <UserPlus className="w-4 h-4 text-teal-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-teal-600 truncate">Tambah Karyawan</p>
              </div>
            </button>

            <button 
              onClick={() => handleNavigateTo('presensi-harian')}
              className="flex items-center space-x-2 p-3 rounded-lg hover:bg-teal-50 transition-colors duration-200 text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-100 group-hover:bg-teal-200 flex items-center justify-center flex-shrink-0 transition-colors">
                <Clock className="w-4 h-4 text-teal-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-teal-600 truncate">Presensi Harian</p>
              </div>
            </button>

            <button 
              onClick={() => handleNavigateTo('pengajuan-izin')}
              className="flex items-center space-x-2 p-3 rounded-lg hover:bg-teal-50 transition-colors duration-200 text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-100 group-hover:bg-teal-200 flex items-center justify-center flex-shrink-0 transition-colors">
                <CheckCircle className="w-4 h-4 text-teal-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-teal-600 truncate">Approval Izin</p>
              </div>
            </button>

            <button 
              onClick={() => handleNavigateTo('jadwal-karyawan')}
              className="flex items-center space-x-2 p-3 rounded-lg hover:bg-teal-50 transition-colors duration-200 text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-100 group-hover:bg-teal-200 flex items-center justify-center flex-shrink-0 transition-colors">
                <Calendar className="w-4 h-4 text-teal-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-teal-600 truncate">Jadwal Karyawan</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        <div className={`xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 ${attendanceFullscreen ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Statistik Absensi Hari Ini</h3>
                <p className="text-sm text-gray-500 mt-1">Data presensi masuk real-time</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAttendanceFullscreen(!attendanceFullscreen)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  {attendanceFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    setSelectedShift('semua');
                  }}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="all">Semua Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.nama}</option>
                  ))}
                </select>
              </div>
              {attendanceStats.shifts.length > 1 && selectedProject !== 'all' && (
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4 text-gray-400" />
                  <select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {attendanceStats.shifts.map(shift => (
                      <option key={shift.id} value={shift.id}>{shift.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex items-center justify-center">
                <div className="relative w-64 h-64">
                  <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      stroke="#f3f4f6"
                      strokeWidth="20"
                      fill="none"
                    />
                    {attendanceStats.chart_data.map((item, index) => {
                      const total = attendanceStats.chart_data.reduce((sum, data) => sum + (data.value || 0), 0);
                      if (!total) return null;

                      const percentage = (item.value / total) * 100;
                      const strokeDasharray = `${((percentage / 100) * 502.65).toFixed(2)} 502.65`;
                      const prevSum = attendanceStats.chart_data.slice(0, index).reduce((sum, data) => sum + (data.value || 0), 0);
                      const strokeDashoffset = -502.65 * (prevSum / total);

                      const isSelected = selectedAttendanceType === item.name;
                      const isHovered = hoveredSegment === index;

                      return (
                        <circle
                          key={index}
                          cx="100"
                          cy="100"
                          r="80"
                          stroke={item.color}
                          strokeWidth="20"
                          fill="none"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={isNaN(strokeDashoffset) ? '0' : strokeDashoffset.toString()}
                          className="cursor-pointer transition-all duration-300 ease-out"
                          style={{
                            opacity: selectedAttendanceType && !isSelected ? 0.3 : 
                                    isHovered || isSelected ? 1 : 0.8,
                            strokeWidth: isHovered || isSelected ? '22' : '20',
                            filter: isHovered || isSelected ? `brightness(1.1) saturate(1.2)` : 'none'
                          }}
                          onMouseEnter={() => setHoveredSegment(index)}
                          onMouseLeave={() => setHoveredSegment(null)}
                          onClick={() => setSelectedAttendanceType(
                            selectedAttendanceType === item.name ? null : item.name
                          )}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      {selectedAttendanceType ? (
                        <>
                          <p className="text-xl font-bold text-gray-900 transition-all duration-300 ease-out">
                            {attendanceStats.chart_data.find(item => item.name === selectedAttendanceType)?.value ?? 0}
                          </p>
                          <p className="text-sm text-gray-500 transition-all duration-300 ease-out">{selectedAttendanceType}</p>
                          <p className="text-xs text-gray-400 transition-all duration-300 ease-out">
                            {(() => {
                              const selected = attendanceStats.chart_data.find(item => item.name === selectedAttendanceType);
                              const total = attendanceStats.chart_data.reduce((sum, data) => sum + data.value, 0);
                              const percent = (selected?.value / total) * 100;
                              return isNaN(percent) ? 0 : Math.round(percent);
                            })()}%
                          </p>
                        </>
                      ) : hoveredSegment !== null ? (
                        <>
                          <p className="text-xl font-bold text-gray-900 transition-all duration-300 ease-out">
                            {attendanceStats.chart_data[hoveredSegment]?.value ?? 0}
                          </p>
                          <p className="text-sm text-gray-500 transition-all duration-300 ease-out">
                            {attendanceStats.chart_data[hoveredSegment]?.name ?? '-'}
                          </p>
                          <p className="text-xs text-gray-400 transition-all duration-300 ease-out">
                            {(() => {
                              const hovered = attendanceStats.chart_data[hoveredSegment];
                              const total = attendanceStats.chart_data.reduce((sum, data) => sum + data.value, 0);
                              const percent = (hovered?.value / total) * 100;
                              return isNaN(percent) ? 0 : Math.round(percent);
                            })()}%
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-gray-900 transition-all duration-300 ease-out">
                            {attendanceStats.chart_data.reduce((sum, data) => sum + data.value, 0)}
                          </p>
                          <p className="text-sm text-gray-500 transition-all duration-300 ease-out">
                            Total Karyawan
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className={`absolute top-2 right-2 transition-all duration-300 ease-out ${
                    selectedAttendanceType ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}>
                    <button
                      onClick={() => setSelectedAttendanceType(null)}
                      className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs transition-colors duration-200 ease-out"
                      title="Reset selection"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  {attendanceStats.chart_data.map((item, index) => {
                    const total = attendanceStats.chart_data.reduce((sum, data) => sum + data.value, 0);
                    const isSelected = selectedAttendanceType === item.name;
                    const isHovered = hoveredSegment === index;
                    
                    return (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-300 ease-out ${
                          isSelected ? 'bg-blue-100 ring-2 ring-blue-300' : 
                          isHovered ? 'bg-gray-100' : 'bg-gray-50'
                        }`}
                        style={{
                          opacity: selectedAttendanceType && !isSelected ? 0.5 : 1
                        }}
                        onMouseEnter={() => setHoveredSegment(index)}
                        onMouseLeave={() => setHoveredSegment(null)}
                        onClick={() => setSelectedAttendanceType(
                          selectedAttendanceType === item.name ? null : item.name
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="rounded-full transition-all duration-300 ease-out"
                            style={{ 
                              backgroundColor: item.color,
                              width: isSelected || isHovered ? '20px' : '16px',
                              height: isSelected || isHovered ? '20px' : '16px'
                            }}
                          ></div>
                          <span className={`text-sm font-medium transition-colors duration-300 ease-out ${
                            isSelected ? 'font-semibold text-blue-800' : 
                            isHovered ? 'font-semibold text-gray-900' : 'text-gray-900'
                          }`}>
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold transition-colors duration-300 ease-out ${
                            isSelected ? 'text-blue-700' : 'text-gray-900'
                          }`}>
                            {item.value}
                          </span>
                          <span className={`text-xs ml-1 transition-colors duration-300 ease-out ${
                            isSelected ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            ({(() => {
                              const percent = (item.value / total) * 100;
                              return isNaN(percent) ? 0 : Math.round(percent);
                            })()}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className={`pt-2 border-t border-gray-200 transition-all duration-300 ease-out ${
                    selectedAttendanceType ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}>
                    <button
                      onClick={() => setSelectedAttendanceType(null)}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2 hover:bg-blue-50 rounded-lg transition-colors duration-200 ease-out"
                    >
                      Tampilkan Semua
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Daftar Permohonan</h3>
                <p className="text-sm text-gray-500 mt-1">Permohonan izin terbaru</p>
              </div>
              <button 
                onClick={() => handleNavigateTo('pengajuan-izin')}
                className="px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors duration-200"
              >
                Lihat Semua
              </button>
            </div>
          </div>
          <div className="p-6">
            {submissionList.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Tidak ada permohonan izin</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissionList.map((submission, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusBadge(submission.status)}
                        </div>
                        <p className="text-sm text-gray-900 font-medium mb-1">{submission.karyawan?.nama}</p>
                        <p className="text-xs text-gray-500 mb-1">{submission.kategori_izin}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(submission.tanggal_mulai)} - {formatDate(submission.tanggal_selesai)}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleViewDetail(submission)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {attendanceFullscreen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40"
          onClick={() => setAttendanceFullscreen(false)}
        />
      )}

      {showDetailModal && selectedSubmission && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Detail Pengajuan Izin</h2>
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
                    <p className="text-sm text-gray-600">Divisi</p>
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
                  <FileText className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Detail Izin</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Jenis Izin</p>
                    <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                      {selectedSubmission.kategori_izin}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Tanggal Mulai</p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedSubmission.tanggal_mulai)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tanggal Selesai</p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedSubmission.tanggal_selesai)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Durasi</p>
                      <p className="font-semibold text-gray-900">{selectedSubmission.durasi_hari} hari</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Keterangan/Alasan</p>
                    <p className="font-semibold text-gray-900 whitespace-pre-wrap">{selectedSubmission.keterangan || '-'}</p>
                  </div>
                  
                  {selectedSubmission.file_url && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">File Pendukung</p>
                      <button
                        onClick={() => handleDownloadFile(selectedSubmission.file_url)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download File PDF
                      </button>
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

            {selectedSubmission.status === 'pending' && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50 sticky bottom-0">
                <button
                  onClick={() => handleConfirm(selectedSubmission, 'tolak')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Tolak
                </button>
                <button
                  onClick={() => handleConfirm(selectedSubmission, 'approve')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Setujui
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {showConfirmModal && selectedSubmission && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {confirmAction === 'approve' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}
              </h2>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setAdminNote('');
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
                  <AlertCircle className={`w-5 h-5 ${confirmAction === 'approve' ? 'text-green-600' : 'text-red-600'} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      {confirmAction === 'approve' 
                        ? 'Anda akan menyetujui pengajuan izin ini'
                        : 'Anda akan menolak pengajuan izin ini'}
                    </p>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Karyawan:</span> {selectedSubmission.karyawan?.nama}</p>
                      <p><span className="font-medium">Jenis Izin:</span> {selectedSubmission.kategori_izin}</p>
                      <p><span className="font-medium">Periode:</span> {formatDate(selectedSubmission.tanggal_mulai)} - {formatDate(selectedSubmission.tanggal_selesai)} ({selectedSubmission.durasi_hari} hari)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan Admin {confirmAction === 'tolak' ? <span className="text-red-500">*</span> : '(Opsional)'}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={confirmAction === 'approve' 
                    ? 'Tambahkan catatan (opsional)...'
                    : 'Jelaskan alasan penolakan...'
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows="4"
                  disabled={processing}
                />
                {confirmAction === 'tolak' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Catatan wajib diisi saat menolak pengajuan izin
                  </p>
                )}
              </div>

              {confirmAction === 'approve' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700">
                      Sistem akan otomatis membuat data presensi dengan status izin untuk semua hari kerja dalam periode yang dipilih (hari libur akan dilewati).
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setAdminNote('');
                }}
                disabled={processing}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitConfirmation}
                disabled={processing || (confirmAction === 'tolak' && !adminNote.trim())}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  confirmAction === 'approve'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memproses...
                  </>
                ) : confirmAction === 'approve' ? (
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
    </>
  );
};

export default AdminDashboard;