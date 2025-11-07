// src/utils/helpers.js

// Date and Time Helpers
export const dateHelpers = {
  // Format date for API
  formatForAPI: (date) => {
    if (!date) return null;
    const d = new Date(date);
    // ambil tanggal lokal (bukan UTC)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  // Format date for display in Indonesian format
  formatForDisplay: (date, includeTime = false) => {
    if (!date) return "-";

    const d = new Date(date);

    // Indonesian month names
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

    const day = d.getDate();
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();

    if (includeTime) {
      const hours = d.getHours().toString().padStart(2, "0");
      const minutes = d.getMinutes().toString().padStart(2, "0");
      return `${day} ${month} ${year} ${hours}:${minutes}`;
    }

    return `${day} ${month} ${year}`;
  },

  // Format date for display (short version)
  formatShort: (date) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  },

  // Get relative time (ago)
  getRelativeTime: (date) => {
    if (!date) return "-";
    const now = new Date();
    const target = new Date(date);
    const diffMs = now - target;

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Baru saja";
    if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 30) return `${diffDays} hari yang lalu`;

    return dateHelpers.formatForDisplay(date);
  },

  // Check if date is today
  isToday: (date) => {
    if (!date) return false;
    const today = new Date();
    const target = new Date(date);
    return today.toDateString() === target.toDateString();
  },

  // Get week range
  getWeekRange: (date = new Date()) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return { start, end };
  },

  // Get month range
  getMonthRange: (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, end };
  },

  // Parse date string to Date object
  parseDate: (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString);
    } catch {
      return null;
    }
  },

  // Calculate age from birth date
  calculateAge: (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  },

  // Calculate work duration
  calculateWorkDuration: (startDate, endDate = null) => {
    if (!startDate) return null;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;

    let duration = "";
    if (years > 0) duration += `${years} tahun `;
    if (months > 0) duration += `${months} bulan `;
    if (days > 0) duration += `${days} hari`;

    return duration.trim() || "0 hari";
  },
};

// ⭐ Time Helpers for formatting time (NEW)
export const timeHelpers = {
  /**
   * Format time from HH:mm:ss to HH:mm
   */
  formatToHHMM: (timeString) => {
    if (!timeString) return "";
    if (timeString.length === 5) return timeString;
    return timeString.substring(0, 5);
  },

  /**
   * Format shift time range for display
   */
  formatShiftRange: (startTime, endTime) => {
    if (!startTime || !endTime) return "-";
    const start = timeHelpers.formatToHHMM(startTime);
    const end = timeHelpers.formatToHHMM(endTime);
    return `${start} - ${end}`;
  },

  /**
   * Validate time format HH:mm
   */
  isValidTimeFormat: (timeString) => {
    if (!timeString) return false;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  },

  /**
   * Convert 24-hour time to 12-hour format
   */
  to12HourFormat: (timeString) => {
    if (!timeString) return "";
    const time = timeHelpers.formatToHHMM(timeString);
    const [hours, minutes] = time.split(":").map(Number);

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
  },

  /**
   * Add minutes to time
   */
  addMinutes: (timeString, minutes) => {
    if (!timeString) return "";
    const [hours, mins] = timeString.split(":").map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(
      2,
      "0"
    )}`;
  },

  /**
   * Calculate duration between two times
   */
  calculateDuration: (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    let duration =
      endHours * 60 + endMinutes - (startHours * 60 + startMinutes);

    if (duration < 0) {
      duration += 24 * 60;
    }

    return duration;
  },

  /**
   * Format duration in minutes to readable format
   */
  formatDuration: (minutes) => {
    if (!minutes || minutes === 0) return "0 menit";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    let result = "";
    if (hours > 0) result += `${hours} jam`;
    if (mins > 0) {
      if (result) result += " ";
      result += `${mins} menit`;
    }

    return result || "0 menit";
  },
};

// String Helpers
export const stringHelpers = {
  capitalize: (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  toTitleCase: (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  },

  truncate: (str, length = 50, suffix = "...") => {
    if (!str) return "";
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
  },

  getInitials: (name, maxLength = 2) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    const initials = parts
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, maxLength)
      .join("");
    return initials || "U";
  },

  slugify: (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  },
};

// Number Helpers
export const numberHelpers = {
  formatCurrency: (amount, showSymbol = true) => {
    if (amount === null || amount === undefined) return "-";
    const formatted = new Intl.NumberFormat("id-ID").format(amount);
    return showSymbol ? `Rp ${formatted}` : formatted;
  },

  formatNumber: (num) => {
    if (num === null || num === undefined) return "-";
    return new Intl.NumberFormat("id-ID").format(num);
  },

  formatPercentage: (value, total, decimals = 1) => {
    if (!value || !total) return "0%";
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(decimals)}%`;
  },

  random: (min = 0, max = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
};

// Array Helpers
export const arrayHelpers = {
  groupBy: (array, key) => {
    return array.reduce((groups, item) => {
      const group = item[key] || "other";
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  },

  sortBy: (array, key, direction = "asc") => {
    return [...array].sort((a, b) => {
      const valueA = a[key];
      const valueB = b[key];

      if (valueA < valueB) return direction === "asc" ? -1 : 1;
      if (valueA > valueB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  },

  unique: (array, key = null) => {
    if (key) {
      const seen = new Set();
      return array.filter((item) => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
    }
    return [...new Set(array)];
  },

  chunk: (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },
};

// Object Helpers
export const objectHelpers = {
  deepClone: (obj) => {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array)
      return obj.map((item) => objectHelpers.deepClone(item));

    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = objectHelpers.deepClone(obj[key]);
      }
    }
    return cloned;
  },

  isEmpty: (obj) => {
    if (!obj) return true;
    if (typeof obj !== "object") return false;
    return Object.keys(obj).length === 0;
  },

  getNestedValue: (obj, path, defaultValue = null) => {
    if (!obj || !path) return defaultValue;

    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (current[key] === undefined || current[key] === null) {
        return defaultValue;
      }
      current = current[key];
    }

    return current;
  },

  setNestedValue: (obj, path, value) => {
    const keys = path.split(".");
    const lastKey = keys.pop();
    let current = obj;

    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
    return obj;
  },
};

// Validation Helpers
export const validationHelpers = {
  isEmail: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  isPhone: (phone) => {
    const regex = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;
    return regex.test(phone);
  },

  validateRequired: (data, requiredFields) => {
    const errors = {};

    requiredFields.forEach((field) => {
      if (!data[field] || data[field].toString().trim() === "") {
        errors[field] = `${field} is required`;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  isStrongPassword: (password, minLength = 6) => {
    if (!password || password.length < minLength) return false;
    return true;
  },

  isValidNIK: (nik) => {
    if (!nik) return false;
    const nikRegex = /^\d{16}$/;
    return nikRegex.test(nik);
  },

  isValidDate: (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  },
};

// Storage Helpers
export const storageHelpers = {
  setItem: (key, value) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      }
    } catch (error) {
      console.error("Storage setItem error:", error);
    }
    return false;
  },

  getItem: (key, defaultValue = null) => {
    try {
      if (typeof window !== "undefined") {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      }
    } catch (error) {
      console.error("Storage getItem error:", error);
    }
    return defaultValue;
  },

  removeItem: (key) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(key);
        return true;
      }
    } catch (error) {
      console.error("Storage removeItem error:", error);
    }
    return false;
  },

  clear: () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.clear();
        return true;
      }
    } catch (error) {
      console.error("Storage clear error:", error);
    }
    return false;
  },
};

// Format helpers for Indonesian locale
export const formatHelpers = {
  formatGender: (gender) => {
    return gender === "L" ? "Laki-laki" : gender === "P" ? "Perempuan" : "-";
  },

  formatStatus: (status) => {
    return status === "aktif" ? "Aktif" : "Tidak Aktif";
  },

  formatEmployeeId: (id) => {
    return `EMP${id.toString().padStart(4, "0")}`;
  },

  formatFileSize: (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },
};

// Export all helpers
export default {
  dateHelpers,
  timeHelpers,
  stringHelpers,
  numberHelpers,
  arrayHelpers,
  objectHelpers,
  validationHelpers,
  storageHelpers,
  formatHelpers,
};
