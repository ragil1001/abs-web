import ExcelJS from "exceljs";

async function generateExcelFile({
  currentProject,
  days,
  employees = [],
  type = "export",
}) {
  const COL_NO = 1;
  const COL_NIK = 2;
  const COL_NAMA = 3;
  const COL_SHIFT = 4;
  const COL_DATES_START = 5;

  const NUM_DAYS = days.length;
  const TOTAL_COLS = COL_DATES_START + NUM_DAYS - 1;

  const R_TITLE = 3;
  const R_COMPANY = 4;
  const R_HEADER = 6;
  const R_TANGGAL = 7;
  const R_HARI = 8;
  const R_DATA_START = 9;

  const numEmployees = employees.length;
  const lastEmployeeRow = Math.max(
    R_DATA_START,
    R_DATA_START + numEmployees - 1
  );
  const legendStartRow = lastEmployeeRow + 4;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Aplikasi Jadwal Karyawan";
  wb.created = new Date();

  const ws = wb.addWorksheet("Jadwal", {
    views: [{ state: "normal", showGridLines: true }],
  });

  const cols = [];
  for (let i = 1; i <= TOTAL_COLS; i++) {
    if (i === COL_NO) cols.push({ width: 6 });
    else if (i === COL_NIK) cols.push({ width: 18 });
    else if (i === COL_NAMA) cols.push({ width: 24 });
    else if (i === COL_SHIFT) cols.push({ width: 12 });
    else cols.push({ width: 6 });
  }
  ws.columns = cols;

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

  const titleCell = ws.getRow(R_TITLE).getCell(COL_NO);
  titleCell.value = `JADWAL KARYAWAN ${currentProject.nama.toUpperCase()}`;
  ws.mergeCells(R_TITLE, 1, R_TITLE, TOTAL_COLS);
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.font = { bold: true, size: 14 };
  ws.getRow(R_TITLE).height = 22;

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

  ws.getRow(R_HEADER).getCell(COL_NO).value = "NO";
  ws.mergeCells(R_HEADER, COL_NO, R_HARI, COL_NO);

  ws.getRow(R_HEADER).getCell(COL_NIK).value = "NIK";
  ws.mergeCells(R_HEADER, COL_NIK, R_HARI, COL_NIK);

  ws.getRow(R_HEADER).getCell(COL_NAMA).value = "NAMA";
  ws.mergeCells(R_HEADER, COL_NAMA, R_HARI, COL_NAMA);

  const tableMonthHeader = isSameMonth
    ? `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`
    : `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()} - ${
        monthNames[endDate.getMonth()]
      } ${endDate.getFullYear()}`;

  ws.getRow(R_HEADER).getCell(COL_SHIFT).value = tableMonthHeader;
  ws.mergeCells(R_HEADER, COL_SHIFT, R_HEADER, TOTAL_COLS);

  ws.getRow(R_TANGGAL).getCell(COL_SHIFT).value = "TANGGAL";
  for (let i = 0; i < NUM_DAYS; i++) {
    ws.getRow(R_TANGGAL).getCell(COL_DATES_START + i).value = days[i].date;
  }

  ws.getRow(R_HARI).getCell(COL_SHIFT).value = "HARI";
  for (let i = 0; i < NUM_DAYS; i++) {
    ws.getRow(R_HARI).getCell(COL_DATES_START + i).value = days[i].dayName;
  }

  ws.getRow(R_DATA_START).getCell(COL_SHIFT).value = "SHIFT";
  ws.mergeCells(R_DATA_START, COL_SHIFT, lastEmployeeRow, COL_SHIFT);

  for (let i = 0; i < numEmployees; i++) {
    const r = R_DATA_START + i;
    const emp = employees[i];

    ws.getRow(r).getCell(COL_NO).value = emp.no || i + 1;
    ws.getRow(r).getCell(COL_NIK).value = emp.nik || "";
    ws.getRow(r).getCell(COL_NAMA).value = emp.nama || "";

    const shifts = emp.shifts || [];
    for (let j = 0; j < NUM_DAYS; j++) {
      const cell = ws.getRow(r).getCell(COL_DATES_START + j);
      if (type === "template") {
        cell.value = "";
      } else {
        const shiftValue = shifts[j];
        cell.value = shiftValue && shiftValue !== "-" ? shiftValue : "";
      }
    }
  }

  ws.getRow(legendStartRow).getCell(COL_NO).value = "KETERANGAN KODE SHIFT";
  ws.mergeCells(legendStartRow, COL_NO, legendStartRow, COL_NIK);

  ws.getRow(legendStartRow + 2).getCell(COL_NO).value = "KODE";
  ws.getRow(legendStartRow + 2).getCell(COL_NIK).value = "JAM KERJA";

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

  const liburRow = legendStartRow + 3 + shiftCodes.length;
  ws.getRow(liburRow).getCell(COL_NO).value = "L";
  ws.getRow(liburRow).getCell(COL_NIK).value = "Libur";

  const thinBorder = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  for (let r = R_HEADER; r <= R_HARI; r++) {
    [COL_NO, COL_NIK, COL_NAMA].forEach((c) => {
      const cell = ws.getRow(r).getCell(c);
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = thinBorder;
    });
  }

  for (let c = COL_SHIFT; c <= TOTAL_COLS; c++) {
    const headerCell = ws.getRow(R_HEADER).getCell(c);
    headerCell.font = { bold: true, size: 12 };
    headerCell.alignment = { vertical: "middle", horizontal: "center" };
    headerCell.border = thinBorder;

    const tanggalCell = ws.getRow(R_TANGGAL).getCell(c);
    tanggalCell.font = { bold: true };
    tanggalCell.alignment = { vertical: "middle", horizontal: "center" };
    tanggalCell.border = thinBorder;

    const hariCell = ws.getRow(R_HARI).getCell(c);
    hariCell.font = { bold: true };
    hariCell.alignment = { vertical: "middle", horizontal: "center" };
    hariCell.border = thinBorder;
  }

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

  for (let r = R_DATA_START; r <= lastEmployeeRow; r++) {
    ws.getRow(r).height = 20;

    const noCell = ws.getRow(r).getCell(COL_NO);
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.border = thinBorder;

    const nikCell = ws.getRow(r).getCell(COL_NIK);
    nikCell.alignment = { vertical: "middle", horizontal: "left" };
    nikCell.border = thinBorder;

    const namaCell = ws.getRow(r).getCell(COL_NAMA);
    namaCell.alignment = { vertical: "middle", horizontal: "left" };
    namaCell.border = thinBorder;

    const shiftDataCell = ws.getRow(r).getCell(COL_SHIFT);
    shiftDataCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
    shiftDataCell.border = thinBorder;

    for (let c = COL_DATES_START; c <= TOTAL_COLS; c++) {
      const cell = ws.getRow(r).getCell(c);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = thinBorder;
    }
  }

  const weekendFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFE5E5" },
  };

  for (let i = 0; i < NUM_DAYS; i++) {
    if (days[i].isWeekend) {
      const c = COL_DATES_START + i;

      for (let r = R_TANGGAL; r <= lastEmployeeRow; r++) {
        const cell = ws.getRow(r).getCell(c);
        cell.fill = weekendFill;
      }
    }
  }

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

  const totalLegendRows = shiftCodes.length + 1;
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

  const employees = (dummyEmployees || []).map((emp) => ({
    no: emp.no,
    nik: emp.nik,
    nama: emp.nama,
    shifts: [],
  }));

  const wb = await generateExcelFile({
    currentProject,
    days,
    employees,
    type: "template",
  });

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
