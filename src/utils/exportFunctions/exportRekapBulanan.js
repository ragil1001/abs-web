import ExcelJS from "exceljs";

export default async function exportRekapBulanan({
  data,
  projectInfo,
  daysInMonth,
  bulan,
}) {
  if (!data || data.length === 0) {
    throw new Error("Tidak ada data untuk diekspor");
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Aplikasi Presensi Karyawan";
  wb.created = new Date();

  const ws = wb.addWorksheet("Rekap Bulanan");

  ws.views = [{ showGridLines: false }];

  const bulanObj = new Date(bulan + "-01");
  const bulanNama = [
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
  const bulanFormatted = `${
    bulanNama[bulanObj.getMonth()]
  } ${bulanObj.getFullYear()}`;

  const fixedCols = 10;
  const totalCols = fixedCols + daysInMonth.length;

  const colWidths = [
    { width: 15 },
    { width: 25 },
    { width: 20 },
    { width: 20 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    ...daysInMonth.map(() => ({ width: 10 })),
  ];
  ws.columns = colWidths;

  let currentRow = 1;

  ws.mergeCells(2, 1, 3, fixedCols);
  const projectCell = ws.getCell(2, 1);
  projectCell.value = projectInfo.nama;
  projectCell.font = { name: "Arial", bold: true, size: 14 };
  projectCell.alignment = { vertical: "middle", horizontal: "center" };
  projectCell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 20;

  ws.mergeCells(4, 1, 4, fixedCols);
  const monthCell = ws.getCell(4, 1);
  monthCell.value = `${bulanFormatted} - PT. QIPRAH MULTI SERVICE`;
  monthCell.font = { name: "Arial", bold: true, size: 11 };
  monthCell.alignment = { vertical: "middle", horizontal: "center" };
  monthCell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  ws.getRow(4).height = 20;

  currentRow = 5;

  ws.getCell(currentRow, 1).value = "Nama Project";
  ws.getCell(currentRow, 1).font = { name: "Arial", bold: true, size: 11 };
  ws.getCell(currentRow, 2).value = projectInfo.nama;
  ws.getCell(currentRow, 2).font = { name: "Arial", size: 11 };
  currentRow++;

  ws.getCell(currentRow, 1).value = "Lokasi";
  ws.getCell(currentRow, 1).font = { name: "Arial", bold: true, size: 11 };
  ws.getCell(currentRow, 2).value = projectInfo.lokasi?.nama || "-";
  ws.getCell(currentRow, 2).font = { name: "Arial", size: 11 };
  currentRow++;

  ws.getCell(currentRow, 1).value = "Total Karyawan";
  ws.getCell(currentRow, 1).font = { name: "Arial", bold: true, size: 11 };
  ws.getCell(currentRow, 2).value = projectInfo.total_karyawan;
  ws.getCell(currentRow, 2).font = { name: "Arial", size: 11 };
  currentRow += 2;

  const headerRow1 = currentRow;

  ws.getCell(headerRow1, 1).value = "NIK";
  ws.getCell(headerRow1, 2).value = "Nama";
  ws.getCell(headerRow1, 3).value = "Jabatan";
  ws.getCell(headerRow1, 4).value = "Penempatan";

  ws.mergeCells(headerRow1, 5, headerRow1, 10);
  ws.getCell(headerRow1, 5).value = "Rekap";

  ws.mergeCells(headerRow1, 11, headerRow1, totalCols);
  ws.getCell(headerRow1, 11).value = bulanFormatted;

  for (let col = 1; col <= totalCols; col++) {
    const cell = ws.getCell(headerRow1, col);
    cell.font = {
      name: "Arial",
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEA580C" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  }
  ws.getRow(headerRow1).height = 22;

  currentRow++;

  const headerRow2 = currentRow;

  ws.mergeCells(headerRow1, 1, headerRow2, 1);
  ws.mergeCells(headerRow1, 2, headerRow2, 2);
  ws.mergeCells(headerRow1, 3, headerRow2, 3);
  ws.mergeCells(headerRow1, 4, headerRow2, 4);

  ws.getCell(headerRow2, 5).value = "Hadir";
  ws.getCell(headerRow2, 6).value = "Izin";
  ws.getCell(headerRow2, 7).value = "Sakit";
  ws.getCell(headerRow2, 8).value = "Cuti";
  ws.getCell(headerRow2, 9).value = "Alpa";
  ws.getCell(headerRow2, 10).value = "Libur";

  daysInMonth.forEach((day, idx) => {
    const col = 11 + idx;
    ws.getCell(headerRow2, col).value = day.day;
  });

  for (let col = 5; col <= totalCols; col++) {
    const cell = ws.getCell(headerRow2, col);
    cell.font = {
      name: "Arial",
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEA580C" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    if (col >= 11) {
      const dayIdx = col - 11;
      if (daysInMonth[dayIdx]?.is_weekend) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDC2626" },
        };
      }
    }
  }
  ws.getRow(headerRow2).height = 22;

  currentRow++;

  const dataStartRow = currentRow;
  data.forEach((item, idx) => {
    const row = currentRow;

    ws.getCell(row, 1).value = item.nik;
    ws.getCell(row, 1).font = { name: "Arial", size: 11 };

    ws.getCell(row, 2).value = item.nama;
    ws.getCell(row, 2).font = { name: "Arial", size: 11 };

    ws.getCell(row, 3).value = item.jabatan;
    ws.getCell(row, 3).font = { name: "Arial", size: 11 };

    ws.getCell(row, 4).value = item.divisi;
    ws.getCell(row, 4).font = { name: "Arial", size: 11 };

    ws.getCell(row, 5).value = item.rekap.hadir || 0;
    ws.getCell(row, 5).font = { name: "Arial", size: 11 };

    ws.getCell(row, 6).value = item.rekap.izin || 0;
    ws.getCell(row, 6).font = { name: "Arial", size: 11 };

    ws.getCell(row, 7).value = item.rekap.sakit || 0;
    ws.getCell(row, 7).font = { name: "Arial", size: 11 };

    ws.getCell(row, 8).value = item.rekap.cuti || 0;
    ws.getCell(row, 8).font = { name: "Arial", size: 11 };

    ws.getCell(row, 9).value = item.rekap.alpa || 0;
    ws.getCell(row, 9).font = { name: "Arial", size: 11 };

    ws.getCell(row, 10).value = item.rekap.libur || 0;
    ws.getCell(row, 10).font = { name: "Arial", size: 11 };

    daysInMonth.forEach((day, dayIdx) => {
      const col = 11 + dayIdx;
      const statusList = item.daily_data[day.day] || ["-"];
      const cell = ws.getCell(row, col);
      cell.value = statusList.join(", ");
      cell.font = { name: "Arial", size: 11 };
    });

    const bgColor = idx % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";

    for (let col = 1; col <= totalCols; col++) {
      const cell = ws.getCell(row, col);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: col <= 4 ? "left" : "center",
      };

      if (col >= 11) {
        const dayIdx = col - 11;
        if (daysInMonth[dayIdx]?.is_weekend) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEE2E2" },
          };
        }
      }
    }

    currentRow++;
  });

  ws.views = [
    {
      state: "frozen",
      xSplit: 10,
      ySplit: headerRow2,
      topLeftCell: "K" + (headerRow2 + 1),
      activeCell: "A1",
      showGridLines: false,
    },
  ];

  createLegendSheet(wb, projectInfo, bulanFormatted);

  const projectName = projectInfo.nama.replace(/[^a-zA-Z0-9]/g, "_");
  const bulanFile = bulan.replace("-", "_");
  const filename = `Rekap_Bulanan_${projectName}_${bulanFile}.xlsx`;

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

function createLegendSheet(wb, projectInfo, bulanFormatted) {
  const ws = wb.addWorksheet("Keterangan");

  ws.views = [{ showGridLines: false }];

  ws.columns = [{ width: 30 }, { width: 40 }];

  let row = 1;

  ws.getCell(row, 1).value = "KETERANGAN STATUS PRESENSI";
  ws.getCell(row, 1).font = {
    name: "Arial",
    bold: true,
    size: 14,
    color: { argb: "FFFFFFFF" },
  };
  ws.getCell(row, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEA580C" },
  };
  ws.getCell(row, 1).alignment = { vertical: "middle", horizontal: "center" };
  ws.getCell(row, 1).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  ws.mergeCells(row, 1, row, 2);
  row += 2;

  ws.getCell(row, 1).value = "Nama Project:";
  ws.getCell(row, 1).font = { name: "Arial", bold: true, size: 11 };
  ws.getCell(row, 2).value = projectInfo.nama;
  ws.getCell(row, 2).font = { name: "Arial", size: 11 };
  row++;

  ws.getCell(row, 1).value = "Periode:";
  ws.getCell(row, 1).font = { name: "Arial", bold: true, size: 11 };
  ws.getCell(row, 2).value = bulanFormatted;
  ws.getCell(row, 2).font = { name: "Arial", size: 11 };
  row += 2;

  ws.getCell(row, 1).value = "Kode";
  ws.getCell(row, 2).value = "Keterangan";
  ws.getCell(row, 1).font = { name: "Arial", bold: true, size: 11 };
  ws.getCell(row, 2).font = { name: "Arial", bold: true, size: 11 };
  ws.getCell(row, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
  ws.getCell(row, 2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
  ws.getCell(row, 1).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  ws.getCell(row, 2).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  row++;

  const legends = [
    ["H", "Hadir"],
    ["T", "Terlambat"],
    ["I", "Izin"],
    ["S", "Sakit"],
    ["CT", "Cuti Tahunan"],
    ["IK", "Izin Khusus (Cuti Khusus)"],
    ["A", "Alpa"],
    ["L", "Libur"],
    ["LB", "Lembur"],
    ["TPP", "Tidak Presensi Pulang"],
    ["PC", "Pulang Cepat"],
  ];

  legends.forEach(([code, desc]) => {
    ws.getCell(row, 1).value = code;
    ws.getCell(row, 2).value = desc;
    ws.getCell(row, 1).font = { name: "Arial", size: 11 };
    ws.getCell(row, 2).font = { name: "Arial", size: 11 };
    ws.getCell(row, 1).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    ws.getCell(row, 2).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    row++;
  });

  row += 2;

  ws.getCell(row, 1).value = "Catatan:";
  ws.getCell(row, 1).font = { name: "Arial", bold: true, size: 11 };
  ws.mergeCells(row, 1, row, 2);
  row++;

  const notes = [
    "- Rekap 'Hadir' mencakup semua kehadiran (H, T, LB, TPP, PC)",
    "- Rekap 'Sakit' untuk izin sakit (S)",
    "- Rekap 'Cuti' untuk cuti tahunan (CT) dan izin khusus (IK)",
    "- Status dalam satu hari dipisahkan dengan koma (,)",
    "- Weekend ditandai dengan background merah muda",
    "- Kolom NIK hingga Libur bersifat fixed (frozen)",
  ];

  notes.forEach((note) => {
    ws.getCell(row, 1).value = note;
    ws.getCell(row, 1).font = { name: "Arial", size: 11 };
    ws.mergeCells(row, 1, row, 2);
    row++;
  });
}
