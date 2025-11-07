"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';

// Components
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import LoginPage from '@/pages/Login';
import AdminDashboard from '@/pages/AdminDashboard';
import DataKaryawan from '@/pages/DataKaryawan';
import DataJabatan from '@/pages/DataJabatan';
import DataDivisi from '@/pages/DataDivisi';
import DataProject from '@/pages/DataProject';
import AssignKaryawan from '@/pages/AssignKaryawan';
import PresensiHarian from '@/pages/PresensiHarian';
import JadwalKaryawan from '@/pages/JadwalKaryawan';
import RekapPresensiBulanan from '@/pages/RekapPresensiBulanan';
import PengajuanIzin from '@/pages/PengajuanIzin';
import InfoTukarShift from '@/pages/InfoTukarShift';
import PengajuanLembur from '@/pages/PengajuanLembur';
import UbahPassword from '@/pages/UbahPassword';
import Pengaturan from '@/pages/Pengaturan';
import Informasi from '@/pages/Informasi';

export default function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  
  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // 🎯 Page state - with smart session handling
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check if this is a continuing session (refresh) or new session (browser closed)
      const isSessionActive = sessionStorage.getItem('session_active') === 'true';
      
      if (isSessionActive) {
        // Continuing session - restore last page
        const savedPage = localStorage.getItem('currentPage');
        console.log('🔄 Continuing session - restoring page:', savedPage || 'dashboard');
        return savedPage || 'dashboard';
      } else {
        // New session - start from dashboard
        console.log('🆕 New session - starting from dashboard');
        localStorage.removeItem('currentPage');
        return 'dashboard';
      }
    }
    return 'dashboard';
  });
  
  // 🎯 Navigation detail state
  const [navigationDetail, setNavigationDetail] = useState(null);
  
  // 💾 Save current page to localStorage whenever it changes (for refresh)
  useEffect(() => {
    if (typeof window !== 'undefined' && isAuthenticated) {
      localStorage.setItem('currentPage', currentPage);
      console.log('💾 Saved current page:', currentPage);
    }
  }, [currentPage, isAuthenticated]);

  // 🔒 Mark session as active when authenticated
  useEffect(() => {
    if (typeof window !== 'undefined' && isAuthenticated) {
      sessionStorage.setItem('session_active', 'true');
    }
  }, [isAuthenticated]);

  // Prevent browser back button
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
      
      const handlePopState = () => {
        window.history.pushState(null, '', '/');
        console.log('⚠️ Browser back disabled');
      };

      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, []);

  // 🔔 Listen for notification navigation events
  useEffect(() => {
    const handleNavigateToDetail = (event) => {
      const { page, detailType, detailId, filters } = event.detail;
      
      console.log('🎯 Navigation event received:', {
        page,
        detailType,
        detailId,
        filters
      });
      
      // Set page and detail state
      setCurrentPage(page);
      setNavigationDetail({
        type: detailType,
        id: detailId,
        filters: filters || {}
      });
      
      // Clear navigation detail after a short delay (to allow page to mount)
      setTimeout(() => {
        setNavigationDetail(null);
      }, 1000);
    };

    window.addEventListener('navigateToDetail', handleNavigateToDetail);
    
    return () => {
      window.removeEventListener('navigateToDetail', handleNavigateToDetail);
    };
  }, []);

  // Handle responsive
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load/save sidebar collapsed state
  useEffect(() => {
    if (typeof window !== 'undefined' && !isMobile) {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved) setSidebarCollapsed(JSON.parse(saved));
    }
  }, [isMobile]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isMobile) {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
    }
  }, [sidebarCollapsed, isMobile]);

  // Close sidebar on mobile when page changes
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [currentPage, isMobile]);

  const toggleSidebarCollapse = useCallback(() => {
    if (!isMobile) setSidebarCollapsed(prev => !prev);
  }, [isMobile]);

  // Navigate function
  const navigateTo = useCallback((page) => {
    console.log('📄 Navigate to:', page);
    setCurrentPage(page);
    setNavigationDetail(null); // Clear any navigation detail
  }, []);

  // Render page with navigation detail prop
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard onNavigate={navigateTo} />;
      case 'data-karyawan':
        return <DataKaryawan />;
      case 'data-jabatan':
        return <DataJabatan />;
      case 'data-divisi':
        return <DataDivisi />;
      case 'data-project':
        return <DataProject />;
      case 'assign-karyawan':
        return <AssignKaryawan />;
      case 'jadwal-karyawan':
        return <JadwalKaryawan />;
      case 'tukar-shift':
        return <InfoTukarShift navigationDetail={navigationDetail} />;
      case 'pengajuan-izin':
        return <PengajuanIzin navigationDetail={navigationDetail} />;
      case 'pengajuan-lembur':
        return <PengajuanLembur navigationDetail={navigationDetail} />;
      case 'presensi-harian':
        return <PresensiHarian />;
      case 'rekap-bulanan':
        return <RekapPresensiBulanan />;
      case 'ubah-password':
        return <UbahPassword />;
      case 'pengaturan':
        return <Pengaturan />;
      case 'informasi':
        return <Informasi />;
      default:
        return <AdminDashboard onNavigate={navigateTo} />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Dashboard layout
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white shadow-2xl transform transition-transform duration-200 ease-out lg:static lg:inset-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${!isMobile && sidebarCollapsed ? 'w-20' : 'w-75'}`}
      >
        <Sidebar 
          collapsed={sidebarCollapsed && !isMobile}
          isMobile={isMobile}
          currentPage={currentPage}
          onNavigate={navigateTo}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
  <div className="flex items-center justify-between h-16 px-4 lg:px-5">
    <div className="flex items-center space-x-3">
      {/* Mobile Menu */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>
      
      {/* Desktop Collapse */}
      <button
        onClick={toggleSidebarCollapse}
        className="hidden lg:flex w-8 h-8 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 text-gray-600 hover:text-orange-600 hover:border-orange-300 transition-all"
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>

    {/* ✅ Pass onNavigate prop to Navbar */}
    <Navbar onNavigate={navigateTo} />
  </div>
</header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 lg:p-8">
            {renderPage()}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}