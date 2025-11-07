"use client";
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Home, Users, Database, FolderKanban,
  Briefcase, Building2, UserPlus, Calendar,
  Megaphone, RefreshCcw, FileText, ClipboardList,
  ClockIcon, ClipboardCheck, BarChart3, X, ChevronRight
} from 'lucide-react';

const Sidebar = memo(({ collapsed, isMobile, currentPage, onNavigate, onClose }) => {
  const [expandedMenu, setExpandedMenu] = useState(null);

  const menuItems = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      page: 'dashboard'
    },
    {
      id: 'master-data',
      label: 'Master Data',
      icon: Database,
      submenu: [
        { id: 'data-karyawan', label: 'Data Karyawan', icon: Users, page: 'data-karyawan' },
        { id: 'data-jabatan', label: 'Data Jabatan', icon: Briefcase, page: 'data-jabatan' },
        { id: 'data-divisi', label: 'Data Penempatan', icon: Building2, page: 'data-divisi' },
        { id: 'data-project', label: 'Data Project', icon: FolderKanban, page: 'data-project' },
      ]
    },
    {
      id: 'kelola',
      label: 'Kelola Karyawan',
      icon: UserPlus,
      submenu: [
        { id: 'assign', label: 'Assign Karyawan', icon: UserPlus, page: 'assign-karyawan' },
        { id: 'jadwal', label: 'Jadwal Karyawan', icon: Calendar, page: 'jadwal-karyawan' },
        { id: 'tukar-shift', label: 'Info Tukar Shift', icon: RefreshCcw, page: 'tukar-shift' },
        { id: 'informasi', label: 'Informasi', icon: Megaphone, page: 'informasi' },
      ]
    },
    {
      id: 'presensi',
      label: 'Presensi',
      icon: ClipboardCheck,
      submenu: [
        { id: 'pengajuan', label: 'Pengajuan Izin', icon: FileText, page: 'pengajuan-izin' },
        { id: 'pengajuan-lembur', label: 'Pengajuan Lembur', icon: ClockIcon, page: 'pengajuan-lembur' },
        { id: 'harian', label: 'Presensi Harian', icon: ClipboardList, page: 'presensi-harian' },
        { id: 'bulanan', label: 'Rekap Bulanan', icon: BarChart3, page: 'rekap-bulanan' },
      ]
    }
  ], []);

  // Auto-expand parent menu based on current page
  useEffect(() => {
    if (!collapsed) {
      const parentMenu = menuItems.find(item =>
        item.submenu && item.submenu.some(subitem => subitem.page === currentPage)
      );
      if (parentMenu) {
        setExpandedMenu(parentMenu.id);
      }
    }
  }, [currentPage, collapsed, menuItems]);

  // 🚀 Handle menu click (NO router.push!)
  const handleMenuClick = useCallback((item) => {
    if (item.submenu && !collapsed) {
      setExpandedMenu(prev => prev === item.id ? null : item.id);
    } else if (item.page) {
      // Clear API cache before navigation
      if (typeof window !== 'undefined') {
        const { clearApiCache } = require('@/lib/axios');
        clearApiCache();
      }
      
      onNavigate(item.page);
      if (isMobile && onClose) {
        onClose();
      }
    }
  }, [collapsed, onNavigate, isMobile, onClose]);

  const handleSubmenuClick = useCallback((subitem) => {
    if (subitem.page) {
      // Clear API cache before navigation
      if (typeof window !== 'undefined') {
        const { clearApiCache } = require('@/lib/axios');
        clearApiCache();
      }
      
      onNavigate(subitem.page);
      if (isMobile && onClose) {
        onClose();
      }
    }
  }, [onNavigate, isMobile, onClose]);

  const isActive = useCallback((page) => {
    return currentPage === page;
  }, [currentPage]);

  const isParentActive = useCallback((item) => {
    if (item.page && currentPage === item.page) return true;
    if (item.submenu) {
      return item.submenu.some(subitem => currentPage === subitem.page);
    }
    return false;
  }, [currentPage]);

  return (
    <>
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600 flex-shrink-0">
        <div className={`flex items-center space-x-3 transition-all duration-300 ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain" />
          </div>
          {!collapsed && (
            <div className="text-white">
              <h1 className="text-l font-bold">PT Qiprah Multi Service</h1>
              <p className="text-xs text-orange-100">Sistem Presensi Karyawan</p>
            </div>
          )}
        </div>

        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white hover:bg-white hover:bg-opacity-10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-hide px-4 py-6">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const isItemActive = isParentActive(item);
            
            return (
              <div key={item.id} className="relative">
                <button
                  onClick={() => handleMenuClick(item)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                    isItemActive || expandedMenu === item.id
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:text-orange-700'
                  }`}
                  title={collapsed ? item.label : ''}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${
                      isItemActive || expandedMenu === item.id
                        ? 'text-white' 
                        : 'text-gray-500 group-hover:text-orange-600'
                    }`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && item.submenu && (
                    <ChevronRight
                      className={`w-4 h-4 transition-transform duration-200 ${
                        expandedMenu === item.id ? 'rotate-90' : ''
                      } ${
                        isItemActive || expandedMenu === item.id ? 'text-white' : 'text-gray-400 group-hover:text-orange-600'
                      }`}
                    />
                  )}
                </button>

                {item.submenu && expandedMenu === item.id && !collapsed && (
                  <div className="mt-2 ml-8 space-y-1">
                    {item.submenu.map((subitem) => (
                      <button
                        key={subitem.id}
                        onClick={() => handleSubmenuClick(subitem)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                          isActive(subitem.page)
                            ? 'bg-orange-100 text-orange-700 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-orange-600'
                        }`}
                      >
                        <subitem.icon className={`w-4 h-4 ${
                          isActive(subitem.page) ? 'text-orange-600' : 'text-gray-400'
                        }`} />
                        <span className="truncate">{subitem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {item.submenu && collapsed && (
                  <div className="absolute left-full top-0 ml-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]">
                    <div className="p-3">
                      <div className="text-xs font-semibold text-gray-900 mb-3 px-2">{item.label}</div>
                      <div className="space-y-1">
                        {item.submenu.map((subitem) => (
                          <button
                            key={subitem.id}
                            onClick={() => handleSubmenuClick(subitem)}
                            className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              isActive(subitem.page)
                                ? 'bg-orange-500 text-white'
                                : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                            }`}
                          >
                            <subitem.icon className={`w-4 h-4 ${
                              isActive(subitem.page) ? 'text-white' : 'text-gray-400'
                            }`} />
                            <span>{subitem.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!item.submenu && collapsed && (
                  <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] pointer-events-none">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;