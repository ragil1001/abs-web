// src/pages/template/exportScheduleToExcel.js
import ExcelJS from "exceljs";

/**
 * UNIFIED FUNCTION: Generate Excel with identical layout
 * Used for both TEMPLATE (empty shifts) and EXPORT (filled shifts)
 *
 * @param {Object} currentProject - Project data with shifts
 * @param {Array} days - Calendar days array
 * @param {Array} employees - Employee data with shifts array
 * @param {String} type - 'template' or 'export'
 */
async function generateExcelFile({
  currentProject,
  days,
  employees = [],
  type = "export",
}) {
  // Column definitions (1-based ExcelJS)
  const COL_NO = 1; // A
  const COL_NIK = 2; // B
  const COL_NAMA = 3; // C
  const COL_SHIFT = 4; // D (SHIFT label merged vertically)
  const COL_DATES_START = 5; // E onwards (date columns)

  const NUM_DAYS = days.length;
  const TOTAL_COLS = COL_DATES_START + NUM_DAYS - 1;

  // Row indices (1-based)
  const R_TITLE = 3; // Title row
  const R_COMPANY = 4; // Company/Month header row
  const R_HEADER = 6; // Month header (across all date cols)
  const R_TANGGAL = 7; // Date numbers
  const R_HARI = 8; // Day names
  const R_DATA_START = 9; // Employee data starts

  const numEmployees = employees.length;
  const lastEmployeeRow = Math.max(
    R_DATA_START,
    R_DATA_START + numEmployees - 1
  );
  const legendStartRow = lastEmployeeRow + 4;

  // Create workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = "Aplikasi Jadwal Karyawan";
  wb.created = new Date();

  const ws = wb.addWorksheet("Jadwal", {
    views: [{ state: "normal", showGridLines: true }],
  });

  // Set column widths
  const cols = [];
  for (let i = 1; i <= TOTAL_COLS; i++) {
    if (i === COL_NO) cols.push({ width: 6 });
    else if (i === COL_NIK) cols.push({ width: 18 });
    else if (i === COL_NAMA) cols.push({ width: 24 });
    else if (i === COL_SHIFT) cols.push({ width: 12 });
    else cols.push({ width: 6 }); // Date columns
  }
  ws.columns = cols;

  // ========== TITLE & COMPANY HEADER ==========
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

  const startDate = new Date(days[0].fullDate);
  const endDate = new Date(days[days.length - 1].fullDate);

  // Title
  const titleCell = ws.getRow(R_TITLE).getCell(COL_NO);
  titleCell.value = `JADWAL KARYAWAN ${currentProject.nama.toUpperCase()}`;
  ws.mergeCells(R_TITLE, 1, R_TITLE, TOTAL_COLS);
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.font = { bold: true, size: 14 };
  ws.getRow(R_TITLE).height = 22;

  // Company text with month
  const isSameMonth =
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear();

  const companyText = isSameMonth
    ? `BULAN ${monthNames[
        startDate.getMonth()
      ].toUpperCase()} ${startDate.getFullYear()} PT. QIPRAH MULTI SERVICE`
    : `BULAN ${monthNames[
        startDate.getMonth()
      ].toUpperCase()} ${startDate.getFullYear()} - ${monthNames[
        endDate.getMonth()
      ].toUpperCase()} ${endDate.getFullYear()} PT. QIPRAH MULTI SERVICE`;

  const companyCell = ws.getRow(R_COMPANY).getCell(COL_NO);
  companyCell.value = companyText;
  ws.mergeCells(R_COMPANY, 1, R_COMPANY, TOTAL_COLS);
  companyCell.alignment = { vertical: "middle", horizontal: "center" };
  companyCell.font = { bold: true, size: 13 };
  ws.getRow(R_COMPANY).height = 22;

  // ========== TABLE HEADER ==========
  // NO, NIK, NAMA columns (merged vertically from R_HEADER to R_HARI)
  ws.getRow(R_HEADER).getCell(COL_NO).value = "NO";
  ws.mergeCells(R_HEADER, COL_NO, R_HARI, COL_NO);

  ws.getRow(R_HEADER).getCell(COL_NIK).value = "NIK";
  ws.mergeCells(R_HEADER, COL_NIK, R_HARI, COL_NIK);

  ws.getRow(R_HEADER).getCell(COL_NAMA).value = "NAMA";
  ws.mergeCells(R_HEADER, COL_NAMA, R_HARI, COL_NAMA);

  // Month header (merged across SHIFT column to last date column)
  const tableMonthHeader = isSameMonth
    ? `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`
    : `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()} - ${
        monthNames[endDate.getMonth()]
      } ${endDate.getFullYear()}`;

  ws.getRow(R_HEADER).getCell(COL_SHIFT).value = tableMonthHeader;
  ws.mergeCells(R_HEADER, COL_SHIFT, R_HEADER, TOTAL_COLS);

  // TANGGAL row
  ws.getRow(R_TANGGAL).getCell(COL_SHIFT).value = "TANGGAL";
  for (let i = 0; i < NUM_DAYS; i++) {
    ws.getRow(R_TANGGAL).getCell(COL_DATES_START + i).value = days[i].date;
  }

  // HARI row
  ws.getRow(R_HARI).getCell(COL_SHIFT).value = "HARI";
  for (let i = 0; i < NUM_DAYS; i++) {
    ws.getRow(R_HARI).getCell(COL_DATES_START + i).value = days[i].dayName;
  }

  // SHIFT label (merged vertically across all employee rows)
  ws.getRow(R_DATA_START).getCell(COL_SHIFT).value = "SHIFT";
  ws.mergeCells(R_DATA_START, COL_SHIFT, lastEmployeeRow, COL_SHIFT);

  // ========== EMPLOYEE DATA ==========
  for (let i = 0; i < numEmployees; i++) {
    const r = R_DATA_START + i;
    const emp = employees[i];

    ws.getRow(r).getCell(COL_NO).value = emp.no || i + 1;
    ws.getRow(r).getCell(COL_NIK).value = emp.nik || "";
    ws.getRow(r).getCell(COL_NAMA).value = emp.nama || "";

    // Fill shift codes (empty for template, filled for export)
    const shifts = emp.shifts || [];
    for (let j = 0; j < NUM_DAYS; j++) {
      const cell = ws.getRow(r).getCell(COL_DATES_START + j);
      if (type === "template") {
        cell.value = ""; // Empty for template
      } else {
        // For export: use shift code or dash
        const shiftValue = shifts[j];
        cell.value = shiftValue && shiftValue !== "-" ? shiftValue : "";
      }
    }
  }

  // ========== LEGEND (KETERANGAN KODE SHIFT) ==========
  ws.getRow(legendStartRow).getCell(COL_NO).value = "KETERANGAN KODE SHIFT";
  ws.mergeCells(legendStartRow, COL_NO, legendStartRow, COL_NIK);

  ws.getRow(legendStartRow + 2).getCell(COL_NO).value = "KODE";
  ws.getRow(legendStartRow + 2).getCell(COL_NIK).value = "JAM KERJA";

  // Add shift codes from project
  const shiftCodes =
    currentProject.shiftCodes ||
    (currentProject.shifts || []).map((s) => ({
      code: s.kode,
      jam: `${s.waktu_mulai} - ${s.waktu_selesai}`,
    })) ||
    (currentProject.shiftProjects || []).map((s) => ({
      code: s.kode,
      jam: `${s.waktu_mulai} - ${s.waktu_selesai}`,
    }));

  shiftCodes.forEach((s, idx) => {
    const r = legendStartRow + 3 + idx;
    ws.getRow(r).getCell(COL_NO).value = s.code;
    ws.getRow(r).getCell(COL_NIK).value = s.jam;
  });

  // Add Libur
  const liburRow = legendStartRow + 3 + shiftCodes.length;
  ws.getRow(liburRow).getCell(COL_NO).value = "L";
  ws.getRow(liburRow).getCell(COL_NIK).value = "Libur";

  // ========== STYLING ==========
  const thinBorder = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // Style header columns (NO, NIK, NAMA)
  for (let r = R_HEADER; r <= R_HARI; r++) {
    [COL_NO, COL_NIK, COL_NAMA].forEach((c) => {
      const cell = ws.getRow(r).getCell(c);
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = thinBorder;
    });
  }

  // Style SHIFT column and date headers (R_TANGGAL, R_HARI)
  for (let c = COL_SHIFT; c <= TOTAL_COLS; c++) {
    // Month header
    const headerCell = ws.getRow(R_HEADER).getCell(c);
    headerCell.font = { bold: true, size: 12 };
    headerCell.alignment = { vertical: "middle", horizontal: "center" };
    headerCell.border = thinBorder;

    // TANGGAL row
    const tanggalCell = ws.getRow(R_TANGGAL).getCell(c);
    tanggalCell.font = { bold: true };
    tanggalCell.alignment = { vertical: "middle", horizontal: "center" };
    tanggalCell.border = thinBorder;

    // HARI row
    const hariCell = ws.getRow(R_HARI).getCell(c);
    hariCell.font = { bold: true };
    hariCell.alignment = { vertical: "middle", horizontal: "center" };
    hariCell.border = thinBorder;
  }

  // Style SHIFT label (rotated, gray background)
  const shiftCell = ws.getRow(R_DATA_START).getCell(COL_SHIFT);
  shiftCell.font = { bold: true };
  shiftCell.alignment = {
    vertical: "middle",
    horizontal: "center",
    textRotation: 90,
  };
  shiftCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };

  // Style employee data rows
  for (let r = R_DATA_START; r <= lastEmployeeRow; r++) {
    ws.getRow(r).height = 20;

    // NO column (center)
    const noCell = ws.getRow(r).getCell(COL_NO);
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.border = thinBorder;

    // NIK column (left)
    const nikCell = ws.getRow(r).getCell(COL_NIK);
    nikCell.alignment = { vertical: "middle", horizontal: "left" };
    nikCell.border = thinBorder;

    // NAMA column (left)
    const namaCell = ws.getRow(r).getCell(COL_NAMA);
    namaCell.alignment = { vertical: "middle", horizontal: "left" };
    namaCell.border = thinBorder;

    // SHIFT column (gray background)
    const shiftDataCell = ws.getRow(r).getCell(COL_SHIFT);
    shiftDataCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
    shiftDataCell.border = thinBorder;

    // Date columns (center)
    for (let c = COL_DATES_START; c <= TOTAL_COLS; c++) {
      const cell = ws.getRow(r).getCell(c);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = thinBorder;
    }
  }

  // Weekend highlighting (light red background)
  const weekendFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFE5E5" },
  };

  for (let i = 0; i < NUM_DAYS; i++) {
    if (days[i].isWeekend) {
      const c = COL_DATES_START + i;
      // Apply to TANGGAL, HARI, and all data rows
      for (let r = R_TANGGAL; r <= lastEmployeeRow; r++) {
        const cell = ws.getRow(r).getCell(c);
        cell.fill = weekendFill;
      }
    }
  }

  // Style legend
  const legendHeaderCell = ws.getRow(legendStartRow).getCell(COL_NO);
  legendHeaderCell.font = { bold: true };
  legendHeaderCell.alignment = { vertical: "middle", horizontal: "center" };

  const legendColHeaderRow = legendStartRow + 2;
  [COL_NO, COL_NIK].forEach((c) => {
    const cell = ws.getRow(legendColHeaderRow).getCell(c);
    cell.font = { bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
  });

  // Style legend data rows
  const totalLegendRows = shiftCodes.length + 1; // +1 for Libur
  for (let i = 0; i < totalLegendRows; i++) {
    const r = legendStartRow + 3 + i;
    [COL_NO, COL_NIK].forEach((c) => {
      const cell = ws.getRow(r).getCell(c);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = thinBorder;
    });
  }

  return wb;
}

/**
 * Generate Excel Template (empty shifts)
 */
export async function generateExcelTemplate({
  currentProject,
  templatePeriodOptions,
  dummyEmployees,
  templateDate,
}) {
  if (!currentProject || !templateDate) {
    throw new Error("currentProject dan templateDate diperlukan");
  }

  const selectedPeriod = (templatePeriodOptions || []).find(
    (p) => p.value === templateDate
  );
  if (!selectedPeriod) {
    throw new Error("Periode template tidak ditemukan");
  }

  // Build days array
  const startDate = new Date(selectedPeriod.startDate);
  const endDate = new Date(selectedPeriod.endDate);
  const dayNames = ["Mgg", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const days = [];
  let cur = new Date(startDate);
  while (cur <= endDate) {
    days.push({
      date: cur.getDate(),
      dayName: dayNames[cur.getDay()],
      isWeekend: cur.getDay() === 0 || cur.getDay() === 6,
      fullDate: new Date(cur).toISOString().split("T")[0],
    });
    cur.setDate(cur.getDate() + 1);
  }

  // Prepare employees with empty shifts
  const employees = (dummyEmployees || []).map((emp) => ({
    no: emp.no,
    nik: emp.nik,
    nama: emp.nama,
    shifts: [], // Empty for template
  }));

  const wb = await generateExcelFile({
    currentProject,
    days,
    employees,
    type: "template",
  });

  // Generate filename
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
  const filename = `Template_Jadwal_${currentProject.nama}_${
    monthNames[startDate.getMonth()]
  }_${startDate.getFullYear()}.xlsx`;

  // Download file
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return true;
}

/**
 * Export Schedule to Excel (filled shifts)
 */
export default async function exportScheduleToExcel({
  currentProject,
  exportPeriodOptions,
  exportDate,
  employees = [],
}) {
  if (!currentProject || !exportDate) {
    throw new Error("currentProject dan exportDate diperlukan");
  }

  const selectedPeriod = (exportPeriodOptions || []).find(
    (p) => p.value === exportDate
  );
  if (!selectedPeriod) {
    throw new Error("Periode export tidak ditemukan");
  }

  // Build days array
  const startDate = new Date(selectedPeriod.startDate);
  const endDate = new Date(selectedPeriod.endDate);
  const dayNames = ["Mgg", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const days = [];
  let cur = new Date(startDate);
  while (cur <= endDate) {
    days.push({
      date: cur.getDate(),
      dayName: dayNames[cur.getDay()],
      isWeekend: cur.getDay() === 0 || cur.getDay() === 6,
      fullDate: new Date(cur).toISOString().split("T")[0],
    });
    cur.setDate(cur.getDate() + 1);
  }

  // Normalize employees data
  const normalizedEmployees = (employees || []).map((emp, idx) => ({
    no: emp.no || idx + 1,
    nik: emp.nik || "",
    nama: emp.nama || "",
    shifts: emp.shifts || [],
  }));

  const wb = await generateExcelFile({
    currentProject,
    days,
    employees: normalizedEmployees,
    type: "export",
  });

  // Generate filename
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
  const filename = `Jadwal_${currentProject.nama}_${
    monthNames[startDate.getMonth()]
  }_${startDate.getFullYear()}.xlsx`;

  // Download file
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return true;
}
