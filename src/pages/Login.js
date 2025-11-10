"use client";
import React, { useState } from "react";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  loginValidator,
  validateForm,
  getFieldError,
} from "@/utils/validation";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (apiError) {
      setApiError("");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setApiError("");

    const validation = validateForm(form, loginValidator);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      await login(form);
    } catch (error) {
      console.error("Login error:", error);

      if (error.type === "validation_error" && error.errors) {
        setErrors(error.errors);
      } else {
        setApiError(error.message || "Login gagal. Silakan coba lagi.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100 relative">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-4 overflow-hidden border border-gray-100">
              <img
                src="/logo.png"
                alt="PT Qiprah Multi Service"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              PT Qiprah Multi Service
            </h1>
            <p className="text-gray-500 text-sm">Sistem Presensi Karyawan</p>
          </div>

          {apiError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 font-medium">Login Gagal</p>
                <p className="text-sm text-red-600">{apiError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                required
                value={form.username}
                onChange={handleInputChange}
                placeholder="Masukkan username"
                disabled={loading}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  getFieldError(errors, "username")
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-200"
                }`}
              />
              {getFieldError(errors, "username") && (
                <p className="mt-1 text-sm text-red-600">
                  {getFieldError(errors, "username")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={form.password}
                  onChange={handleInputChange}
                  placeholder="Masukkan password"
                  disabled={loading}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-10 disabled:opacity-50 disabled:cursor-not-allowed ${
                    getFieldError(errors, "password")
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-200"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {getFieldError(errors, "password") && (
                <p className="mt-1 text-sm text-red-600">
                  {getFieldError(errors, "password")}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md disabled:hover:from-orange-500 disabled:hover:to-orange-600"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Mohon tunggu...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Login
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          © {new Date().getFullYear()} PT Qiprah Multi Service. All rights
          reserved.
        </p>
      </div>
    </div>
  );
}
