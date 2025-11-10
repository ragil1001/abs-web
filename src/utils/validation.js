import { VALIDATION } from "./constants";

class Validator {
  constructor() {
    this.errors = {};
    this.rules = {};
  }

  addRule(field, rules) {
    this.rules[field] = Array.isArray(rules) ? rules : [rules];
    return this;
  }

  validate(data) {
    this.errors = {};

    Object.keys(this.rules).forEach((field) => {
      const value = data[field];
      const fieldRules = this.rules[field];

      fieldRules.forEach((rule) => {
        if (typeof rule === "function") {
          const result = rule(value, data);
          if (result !== true) {
            this.addError(field, result);
          }
        } else if (typeof rule === "object") {
          const { validator, message } = rule;
          const result = validator(value, data);
          if (result !== true) {
            this.addError(field, message || result);
          }
        }
      });
    });

    return {
      isValid: Object.keys(this.errors).length === 0,
      errors: this.errors,
    };
  }

  addError(field, message) {
    if (!this.errors[field]) {
      this.errors[field] = [];
    }
    this.errors[field].push(message);
  }

  clearErrors() {
    this.errors = {};
    return this;
  }
}

export const validationRules = {
  required:
    (message = "Field ini wajib diisi") =>
    (value) => {
      if (value === null || value === undefined || value === "") {
        return message;
      }
      if (typeof value === "string" && value.trim() === "") {
        return message;
      }
      if (Array.isArray(value) && value.length === 0) {
        return message;
      }
      return true;
    },

  minLength:
    (min, message = null) =>
    (value) => {
      if (!value) return true;
      if (value.length < min) {
        return message || `Minimal ${min} karakter`;
      }
      return true;
    },

  maxLength:
    (max, message = null) =>
    (value) => {
      if (!value) return true;
      if (value.length > max) {
        return message || `Maksimal ${max} karakter`;
      }
      return true;
    },

  email:
    (message = "Format email tidak valid") =>
    (value) => {
      if (!value) return true;
      if (!VALIDATION.EMAIL_REGEX.test(value)) {
        return message;
      }
      return true;
    },

  phone:
    (message = "Format nomor telepon tidak valid") =>
    (value) => {
      if (!value) return true;
      if (!VALIDATION.PHONE_REGEX.test(value)) {
        return message;
      }
      return true;
    },

  number:
    (message = "Harus berupa angka") =>
    (value) => {
      if (!value) return true;
      if (isNaN(value)) {
        return message;
      }
      return true;
    },

  min:
    (minValue, message = null) =>
    (value) => {
      if (!value) return true;
      const num = parseFloat(value);
      if (isNaN(num) || num < minValue) {
        return message || `Minimal ${minValue}`;
      }
      return true;
    },

  max:
    (maxValue, message = null) =>
    (value) => {
      if (!value) return true;
      const num = parseFloat(value);
      if (isNaN(num) || num > maxValue) {
        return message || `Maksimal ${maxValue}`;
      }
      return true;
    },

  pattern:
    (regex, message = "Format tidak valid") =>
    (value) => {
      if (!value) return true;
      if (!regex.test(value)) {
        return message;
      }
      return true;
    },

  confirmPassword:
    (passwordField, message = "Password tidak sama") =>
    (value, data) => {
      if (!value) return true;
      if (value !== data[passwordField]) {
        return message;
      }
      return true;
    },

  date:
    (message = "Format tanggal tidak valid") =>
    (value) => {
      if (!value) return true;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return message;
      }
      return true;
    },

  pastDate:
    (message = "Tanggal harus di masa lalu") =>
    (value) => {
      if (!value) return true;
      const date = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (date >= today) {
        return message;
      }
      return true;
    },

  futureDate:
    (message = "Tanggal harus di masa depan") =>
    (value) => {
      if (!value) return true;
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (date <= today) {
        return message;
      }
      return true;
    },

  beforeOrEqualToday:
    (message = "Tanggal tidak boleh di masa depan") =>
    (value) => {
      if (!value) return true;
      const date = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (date > today) {
        return message;
      }
      return true;
    },

  afterField:
    (fieldName, message = null) =>
    (value, data) => {
      if (!value || !data[fieldName]) return true;
      const date = new Date(value);
      const compareDate = new Date(data[fieldName]);

      if (date <= compareDate) {
        return message || `Tanggal harus setelah ${fieldName}`;
      }
      return true;
    },

  nik:
    (message = "NIK harus 16 digit angka") =>
    (value) => {
      if (!value) return true;
      if (!/^\d{16}$/.test(value)) {
        return message;
      }
      return true;
    },

  custom:
    (validator, message = "Validasi gagal") =>
    (value, data) => {
      const result = validator(value, data);
      return result === true
        ? true
        : typeof result === "string"
        ? result
        : message;
    },
};

export const loginValidator = new Validator()
  .addRule("username", [
    validationRules.required("Username wajib diisi"),
    validationRules.maxLength(VALIDATION.MAX_USERNAME_LENGTH),
  ])
  .addRule("password", [
    validationRules.required("Password wajib diisi"),
    validationRules.minLength(
      VALIDATION.MIN_PASSWORD_LENGTH,
      `Password minimal ${VALIDATION.MIN_PASSWORD_LENGTH} karakter`
    ),
  ]);

export const karyawanValidator = new Validator()
  .addRule("nik", [
    validationRules.required("NIK wajib diisi"),
    validationRules.nik(),
  ])
  .addRule("nama", [
    validationRules.required("Nama wajib diisi"),
    validationRules.maxLength(
      VALIDATION.MAX_NAME_LENGTH,
      `Nama maksimal ${VALIDATION.MAX_NAME_LENGTH} karakter`
    ),
  ])
  .addRule("divisi_id", [validationRules.required("Divisi wajib dipilih")])
  .addRule("jabatan_id", [validationRules.required("Jabatan wajib dipilih")])
  .addRule("jenis_kelamin", [
    validationRules.required("Jenis kelamin wajib dipilih"),
  ])
  .addRule("tempat_lahir", [
    validationRules.required("Tempat lahir wajib diisi"),
    validationRules.maxLength(
      VALIDATION.MAX_NAME_LENGTH,
      `Tempat lahir maksimal ${VALIDATION.MAX_NAME_LENGTH} karakter`
    ),
  ])
  .addRule("tanggal_lahir", [
    validationRules.required("Tanggal lahir wajib diisi"),
    validationRules.date(),
    validationRules.pastDate("Tanggal lahir harus di masa lalu"),
  ])
  .addRule("tanggal_bergabung", [
    validationRules.required("Tanggal bergabung wajib diisi"),
    validationRules.date(),
    validationRules.beforeOrEqualToday(
      "Tanggal bergabung tidak boleh di masa depan"
    ),
  ])
  .addRule("tanggal_keluar", [
    validationRules.date(),
    validationRules.custom((value, data) => {
      if (value && data.tanggal_bergabung) {
        const keluarDate = new Date(value);
        const bergabungDate = new Date(data.tanggal_bergabung);
        if (keluarDate <= bergabungDate) {
          return "Tanggal keluar harus setelah tanggal bergabung";
        }
      }
      return true;
    }),
  ]);

export const divisiValidator = new Validator().addRule("nama", [
  validationRules.required("Nama divisi wajib diisi"),
  validationRules.maxLength(VALIDATION.MAX_NAME_LENGTH),
]);

export const jabatanValidator = new Validator().addRule("nama", [
  validationRules.required("Nama jabatan wajib diisi"),
  validationRules.maxLength(VALIDATION.MAX_NAME_LENGTH),
]);

export const projectValidator = new Validator()
  .addRule("nama_project", [
    validationRules.required("Nama project wajib diisi"),
    validationRules.maxLength(VALIDATION.MAX_NAME_LENGTH),
  ])
  .addRule("deskripsi", [
    validationRules.maxLength(VALIDATION.MAX_DESCRIPTION_LENGTH),
  ])
  .addRule("tanggal_mulai", [
    validationRules.required("Tanggal mulai wajib diisi"),
    validationRules.date(),
  ])
  .addRule("tanggal_selesai", [
    validationRules.date(),
    validationRules.custom((value, data) => {
      if (value && data.tanggal_mulai) {
        const start = new Date(data.tanggal_mulai);
        const end = new Date(value);
        if (end <= start) {
          return "Tanggal selesai harus setelah tanggal mulai";
        }
      }
      return true;
    }),
  ]);

export const validateForm = (data, validator) => {
  return validator.validate(data);
};

export const getFirstError = (errors) => {
  const firstField = Object.keys(errors)[0];
  return firstField ? errors[firstField][0] : null;
};

export const hasError = (errors, field) => {
  return errors[field] && errors[field].length > 0;
};

export const getFieldError = (errors, field) => {
  return hasError(errors, field) ? errors[field][0] : null;
};

export { Validator };
export default validationRules;
