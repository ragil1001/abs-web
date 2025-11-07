// src/components/Navbar.js
"use client";
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, KeyRound, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import NotificationDropdown from './NotificationDropdown';

const Navbar = ({ onNavigate }) => {
  const { user, logout, getUserInitials, getDisplayName } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMenuClick = (page) => {
    setProfileDropdownOpen(false);
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Notification Dropdown */}
      <NotificationDropdown />

      {/* Profile Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white font-semibold text-sm">
              {getUserInitials()}
            </span>
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-semibold text-gray-900">
              {getDisplayName()}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 hidden lg:block transition-transform duration-200 ${
            profileDropdownOpen ? 'rotate-180' : ''
          }`} />
        </button>

        {profileDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-2">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold">
                    {getUserInitials()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {getDisplayName()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="py-2">
              <button 
                onClick={() => handleMenuClick('ubah-password')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                <KeyRound className="w-4 h-4 text-gray-500" />
                <span>Ubah Password</span>
              </button>
              
              <button 
                onClick={() => handleMenuClick('pengaturan')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                <Settings className="w-4 h-4 text-gray-500" />
                <span>Pengaturan</span>
              </button>
              
              <hr className="my-2 border-gray-100" />
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;