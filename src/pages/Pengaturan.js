// src/pages/Pengaturan.js
"use client";
import React, { useState } from 'react';
import { 
  Settings, Bell, Lock, Monitor, Database, 
  Clock, Calendar, MapPin, Mail, Globe, Shield
} from 'lucide-react';

const Pengaturan = () => {
  const [settings, setSettings] = useState({
    // Notifikasi
    emailNotifications: true,
    pushNotifications: true,
    notifyNewEmployee: true,
    notifyLeaveRequest: true,
    notifyOvertimeRequest: true,
    notifyShiftSwap: true,
    
    // Keamanan
    sessionTimeout: '8',
    requirePasswordChange: false,
    passwordChangeInterval: '90',
    
    // Tampilan
    theme: 'light',
    language: 'id',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24',
    
    // Sistem
    autoBackup: true,
    backupFrequency: 'daily',
    dataRetention: '365',
    
    // Presensi
    attendanceRadius: '100',
    lateThreshold: '15',
    autoClockOut: true,
    clockOutTime: '18:00',
  });

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
            <p className="text-gray-600 text-sm">Kelola pengaturan sistem presensi</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Notifikasi */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notifikasi</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Notifikasi Email</p>
                <p className="text-sm text-gray-600">Terima pemberitahuan melalui email</p>
              </div>
              <button
                onClick={() => handleToggle('emailNotifications')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.emailNotifications ? 'bg-orange-600' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.emailNotifications ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Push Notification</p>
                <p className="text-sm text-gray-600">Terima pemberitahuan push</p>
              </div>
              <button
                onClick={() => handleToggle('pushNotifications')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.pushNotifications ? 'bg-orange-600' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.pushNotifications ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>

            <hr className="border-gray-200" />

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Notifikasi untuk:</p>
              
              {[
                { key: 'notifyNewEmployee', label: 'Karyawan baru ditambahkan' },
                { key: 'notifyLeaveRequest', label: 'Pengajuan izin baru' },
                { key: 'notifyOvertimeRequest', label: 'Pengajuan lembur baru' },
                { key: 'notifyShiftSwap', label: 'Permintaan tukar shift' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">{item.label}</p>
                  <button
                    onClick={() => handleToggle(item.key)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      settings[item.key] ? 'bg-orange-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings[item.key] ? 'translate-x-5' : ''
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Keamanan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Keamanan</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeout Sesi (jam)
              </label>
              <select
                value={settings.sessionTimeout}
                onChange={(e) => handleSelectChange('sessionTimeout', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="1">1 jam</option>
                <option value="2">2 jam</option>
                <option value="4">4 jam</option>
                <option value="8">8 jam</option>
                <option value="12">12 jam</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Wajib Ubah Password Berkala</p>
                <p className="text-sm text-gray-600">Admin harus mengubah password secara berkala</p>
              </div>
              <button
                onClick={() => handleToggle('requirePasswordChange')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.requirePasswordChange ? 'bg-orange-600' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.requirePasswordChange ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>

            {settings.requirePasswordChange && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interval Ubah Password (hari)
                </label>
                <select
                  value={settings.passwordChangeInterval}
                  onChange={(e) => handleSelectChange('passwordChangeInterval', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="30">30 hari</option>
                  <option value="60">60 hari</option>
                  <option value="90">90 hari</option>
                  <option value="180">180 hari</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tampilan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Monitor className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Tampilan</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tema
              </label>
              <select
                value={settings.theme}
                onChange={(e) => handleSelectChange('theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="light">Terang</option>
                <option value="dark">Gelap</option>
                <option value="auto">Otomatis (Sistem)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bahasa
              </label>
              <select
                value={settings.language}
                onChange={(e) => handleSelectChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format Tanggal
                </label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => handleSelectChange('dateFormat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format Waktu
                </label>
                <select
                  value={settings.timeFormat}
                  onChange={(e) => handleSelectChange('timeFormat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="24">24 Jam</option>
                  <option value="12">12 Jam (AM/PM)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sistem */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Sistem & Data</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Backup Otomatis</p>
                <p className="text-sm text-gray-600">Backup data sistem secara otomatis</p>
              </div>
              <button
                onClick={() => handleToggle('autoBackup')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.autoBackup ? 'bg-orange-600' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.autoBackup ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>

            {settings.autoBackup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frekuensi Backup
                </label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => handleSelectChange('backupFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="hourly">Setiap Jam</option>
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retensi Data (hari)
              </label>
              <select
                value={settings.dataRetention}
                onChange={(e) => handleSelectChange('dataRetention', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="30">30 hari</option>
                <option value="90">90 hari</option>
                <option value="180">180 hari</option>
                <option value="365">365 hari (1 tahun)</option>
                <option value="730">730 hari (2 tahun)</option>
                <option value="unlimited">Unlimited</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Berapa lama data presensi disimpan</p>
            </div>
          </div>
        </div>

        {/* Presensi */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Pengaturan Presensi</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Radius Presensi (meter)
              </label>
              <input
                type="number"
                value={settings.attendanceRadius}
                onChange={(e) => handleSelectChange('attendanceRadius', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                min="50"
                max="500"
                step="10"
              />
              <p className="mt-1 text-xs text-gray-500">
                Jarak maksimal dari lokasi project untuk bisa presensi
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batas Keterlambatan (menit)
              </label>
              <input
                type="number"
                value={settings.lateThreshold}
                onChange={(e) => handleSelectChange('lateThreshold', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                min="5"
                max="60"
                step="5"
              />
              <p className="mt-1 text-xs text-gray-500">
                Toleransi keterlambatan sebelum dianggap terlambat
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Auto Clock Out</p>
                <p className="text-sm text-gray-600">Otomatis clock out di akhir shift</p>
              </div>
              <button
                onClick={() => handleToggle('autoClockOut')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.autoClockOut ? 'bg-orange-600' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.autoClockOut ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>

            {settings.autoClockOut && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waktu Auto Clock Out
                </label>
                <input
                  type="time"
                  value={settings.clockOutTime}
                  onChange={(e) => handleSelectChange('clockOutTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Informasi</p>
              <p>
                Pengaturan ini saat ini <strong>belum terhubung ke backend</strong>. 
                Fitur ini akan segera diimplementasikan untuk menyimpan preferensi Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button (Disabled) */}
        <div className="flex justify-end">
          <button
            disabled
            className="px-6 py-2.5 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed"
          >
            Simpan Pengaturan (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pengaturan;