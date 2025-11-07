// src/utils/exportRekapBulanan.js
import ExcelJS from "exceljs";

export default async function exportRekapBulanan({
  data,
  projectInfo,
  daysInMonth,
  bulan
}) {
  if (!data || data.length === 0) {
    throw new Error("Tidak ada data untuk diekspor");
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Aplikasi Presensi Karyawan";
  wb.created = new Date();

  const ws = wb.addWorksheet("Rekap Bulanan");

  // Remove default gridlines
  ws.views = [{ showGridLines: false }];

  // Format bulan Indonesia
  const bulanObj = new Date(bulan + '-01');
  const bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                     'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const bulanFormatted = `${bulanNama[bulanObj.getMonth()]} ${bulanObj.getFullYear()}`;

  // Calculate total columns: NIK, Nama, Jabatan, Penempatan, 6 Rekap cols, Days
  const fixedCols = 10; // NIK, Nama, Jabatan, Penempatan + 6 rekap (Hadir, Izin, Sakit, Cuti, Alpa, Libur)
  const totalCols = fixedCols + daysInMonth.length;

  // Column widths
  const colWidths = [
    { width: 15 },  // NIK
    { width: 25 },  // Nama
    { width: 20 },  // Jabatan
    { width: 20 },  // Penempatan (dulu Divisi)
    { width: 8 },   // Hadir
    { width: 8 },   // Izin
    { width: 8 },   // Sakit
    { width: 8 },   // Cuti
    { width: 8 },   // Alpa
    { width: 8 },   // Libur
    ...daysInMonth.map(() => ({ width: 10 })) // Days
  ];
  ws.columns = colWidths;

  let currentRow = 1;

  // Row 2-3: Project Name (A2-J3 merged)
  ws.mergeCells(2, 1, 3, fixedCols);
  const projectCell = ws.getCell(2, 1);
  projectCell.value = projectInfo.nama;
  projectCell.font = { name: 'Arial', bold: true, size: 14 };
  projectCell.alignment = { vertical: 'middle', horizontal: 'center' };
  projectCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 20;

  // Row 4: Month & Company (A4-J4 merged)
  ws.mergeCells(4, 1, 4, fixedCols);
  const monthCell = ws.getCell(4, 1);
  monthCell.value = `${bulanFormatted} - PT. QIPRAH MULTI SERVICE`;
  monthCell.font = { name: 'Arial', bold: true, size: 11 };
  monthCell.alignment = { vertical: 'middle', horizontal: 'center' };
  monthCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  ws.getRow(4).height = 20;

  currentRow = 5;

  // Project Info
  ws.getCell(currentRow, 1).value = "Nama Project";
  ws.getCell(currentRow, 1).font = { name: 'Arial', bold: true, size: 11 };
  ws.getCell(currentRow, 2).value = projectInfo.nama;
  ws.getCell(currentRow, 2).font = { name: 'Arial', size: 11 };
  currentRow++;

  ws.getCell(currentRow, 1).value = "Lokasi";
  ws.getCell(currentRow, 1).font = { name: 'Arial', bold: true, size: 11 };
  ws.getCell(currentRow, 2).value = projectInfo.lokasi?.nama || '-';
  ws.getCell(currentRow, 2).font = { name: 'Arial', size: 11 };
  currentRow++;

  ws.getCell(currentRow, 1).value = "Total Karyawan";
  ws.getCell(currentRow, 1).font = { name: 'Arial', bold: true, size: 11 };
  ws.getCell(currentRow, 2).value = projectInfo.total_karyawan;
  ws.getCell(currentRow, 2).font = { name: 'Arial', size: 11 };
  currentRow += 2;

  // Table Headers - Row 1 (Main headers with merges)
  const headerRow1 = currentRow;
  
  // Fixed headers (NIK, Nama, Jabatan, Penempatan) - will be merged with row 2
  ws.getCell(headerRow1, 1).value = "NIK";
  ws.getCell(headerRow1, 2).value = "Nama";
  ws.getCell(headerRow1, 3).value = "Jabatan";
  ws.getCell(headerRow1, 4).value = "Penempatan"; // Changed from "Divisi"
  
  // Rekap header (merged horizontally) - now spans 6 columns
  ws.mergeCells(headerRow1, 5, headerRow1, 10);
  ws.getCell(headerRow1, 5).value = "Rekap";
  
  // Month header for calendar (merged horizontally) - starts from column 11
  ws.mergeCells(headerRow1, 11, headerRow1, totalCols);
  ws.getCell(headerRow1, 11).value = bulanFormatted;
  
  // Style header row 1
  for (let col = 1; col <= totalCols; col++) {
    const cell = ws.getCell(headerRow1, col);
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }
  ws.getRow(headerRow1).height = 22;
  
  currentRow++;

  // Table Headers - Row 2 (Detail headers)
  const headerRow2 = currentRow;
  
  // NIK, Nama, Jabatan, Penempatan are merged vertically from row 1
  ws.mergeCells(headerRow1, 1, headerRow2, 1); // NIK
  ws.mergeCells(headerRow1, 2, headerRow2, 2); // Nama
  ws.mergeCells(headerRow1, 3, headerRow2, 3); // Jabatan
  ws.mergeCells(headerRow1, 4, headerRow2, 4); // Penempatan
  
  // Rekap details - 6 columns: Hadir, Izin, Sakit, Cuti, Alpa, Libur
  ws.getCell(headerRow2, 5).value = "Hadir";
  ws.getCell(headerRow2, 6).value = "Izin";
  ws.getCell(headerRow2, 7).value = "Sakit";
  ws.getCell(headerRow2, 8).value = "Cuti";
  ws.getCell(headerRow2, 9).value = "Alpa";
  ws.getCell(headerRow2, 10).value = "Libur";
  
  // Day numbers (start from column 11)
  daysInMonth.forEach((day, idx) => {
    const col = 11 + idx;
    ws.getCell(headerRow2, col).value = day.day;
  });
  
  // Style header row 2
  for (let col = 5; col <= totalCols; col++) {
    const cell = ws.getCell(headerRow2, col);
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // Highlight weekends (now starting from column 11)
    if (col >= 11) {
      const dayIdx = col - 11;
      if (daysInMonth[dayIdx]?.is_weekend) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
      }
    }
  }
  ws.getRow(headerRow2).height = 22;
  
  currentRow++;

  // Data Rows
  const dataStartRow = currentRow;
  data.forEach((item, idx) => {
    const row = currentRow;
    
    // Fixed columns
    ws.getCell(row, 1).value = item.nik;
    ws.getCell(row, 1).font = { name: 'Arial', size: 11 };
    
    ws.getCell(row, 2).value = item.nama;
    ws.getCell(row, 2).font = { name: 'Arial', size: 11 };
    
    ws.getCell(row, 3).value = item.jabatan; // Jabatan
    ws.getCell(row, 3).font = { name: 'Arial', size: 11 };
    
    ws.getCell(row, 4).value = item.divisi; // Penempatan (formerly divisi)
    ws.getCell(row, 4).font = { name: 'Arial', size: 11 };
    
    // Rekap - 6 columns
    ws.getCell(row, 5).value = item.rekap.hadir || 0;
    ws.getCell(row, 5).font = { name: 'Arial', size: 11 };
    
    ws.getCell(row, 6).value = item.rekap.izin || 0;
    ws.getCell(row, 6).font = { name: 'Arial', size: 11 };
    
    ws.getCell(row, 7).value = item.rekap.sakit || 0;
    ws.getCell(row, 7).font = { name: 'Arial', size: 11 };
    
    ws.getCell(row, 8).value = item.rekap.cuti || 0;
    ws.getCell(row, 8).font = { name: 'Arial', size: 11 };
    
    ws.getCell(row, 9).value = item.rekap.alpa || 0;
    ws.getCell(row, 9).font = { name: 'Arial', size: 11 };
    
    ws.getCell(row, 10).value = item.rekap.libur || 0;
    ws.getCell(row, 10).font = { name: 'Arial', size: 11 };
    
    // Daily data (start from column 11)
    daysInMonth.forEach((day, dayIdx) => {
      const col = 11 + dayIdx;
      const statusList = item.daily_data[day.day] || ['-'];
      const cell = ws.getCell(row, col);
      cell.value = statusList.join(', ');
      cell.font = { name: 'Arial', size: 11 };
    });
    
    // Style data row
    const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
    
    for (let col = 1; col <= totalCols; col++) {
      const cell = ws.getCell(row, col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: col <= 4 ? 'left' : 'center' };
      
      // Highlight weekends (column 11+)
      if (col >= 11) {
        const dayIdx = col - 11;
        if (daysInMonth[dayIdx]?.is_weekend) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        }
      }
    }
    
    currentRow++;
  });

  // Freeze panes (10 fixed columns + header rows)
  ws.views = [
    {
      state: 'frozen',
      xSplit: 10, // Freeze columns A-J (NIK to Libur)
      ySplit: headerRow2, // Freeze header rows
      topLeftCell: 'K' + (headerRow2 + 1),
      activeCell: 'A1',
      showGridLines: false
    }
  ];

  // Add legend sheet
  createLegendSheet(wb, projectInfo, bulanFormatted);

  // Generate filename
  const projectName = projectInfo.nama.replace(/[^a-zA-Z0-9]/g, '_');
  const bulanFile = bulan.replace('-', '_');
  const filename = `Rekap_Bulanan_${projectName}_${bulanFile}.xlsx`;

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
  
  // Remove gridlines
  ws.views = [{ showGridLines: false }];
  
  ws.columns = [
    { width: 30 },
    { width: 40 }
  ];

  let row = 1;

  // Title
  ws.getCell(row, 1).value = "KETERANGAN STATUS PRESENSI";
  ws.getCell(row, 1).font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  ws.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
  ws.getCell(row, 1).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell(row, 1).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  ws.mergeCells(row, 1, row, 2);
  row += 2;

  // Project info
  ws.getCell(row, 1).value = "Nama Project:";
  ws.getCell(row, 1).font = { name: 'Arial', bold: true, size: 11 };
  ws.getCell(row, 2).value = projectInfo.nama;
  ws.getCell(row, 2).font = { name: 'Arial', size: 11 };
  row++;

  ws.getCell(row, 1).value = "Periode:";
  ws.getCell(row, 1).font = { name: 'Arial', bold: true, size: 11 };
  ws.getCell(row, 2).value = bulanFormatted;
  ws.getCell(row, 2).font = { name: 'Arial', size: 11 };
  row += 2;

  // Status legend header
  ws.getCell(row, 1).value = "Kode";
  ws.getCell(row, 2).value = "Keterangan";
  ws.getCell(row, 1).font = { name: 'Arial', bold: true, size: 11 };
  ws.getCell(row, 2).font = { name: 'Arial', bold: true, size: 11 };
  ws.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  ws.getCell(row, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  ws.getCell(row, 1).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  ws.getCell(row, 2).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  row++;

  const legends = [
    ['H', 'Hadir'],
    ['T', 'Terlambat'],
    ['I', 'Izin'],
    ['S', 'Sakit'],
    ['CT', 'Cuti Tahunan'],
    ['IK', 'Izin Khusus (Cuti Khusus)'],
    ['A', 'Alpa'],
    ['L', 'Libur'],
    ['LB', 'Lembur'],
    ['TPP', 'Tidak Presensi Pulang'],
    ['PC', 'Pulang Cepat']
  ];

  legends.forEach(([code, desc]) => {
    ws.getCell(row, 1).value = code;
    ws.getCell(row, 2).value = desc;
    ws.getCell(row, 1).font = { name: 'Arial', size: 11 };
    ws.getCell(row, 2).font = { name: 'Arial', size: 11 };
    ws.getCell(row, 1).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    ws.getCell(row, 2).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    row++;
  });

  row += 2;

  // Notes
  ws.getCell(row, 1).value = "Catatan:";
  ws.getCell(row, 1).font = { name: 'Arial', bold: true, size: 11 };
  ws.mergeCells(row, 1, row, 2);
  row++;

  const notes = [
    "- Rekap 'Hadir' mencakup semua kehadiran (H, T, LB, TPP, PC)",
    "- Rekap 'Sakit' untuk izin sakit (S)",
    "- Rekap 'Cuti' untuk cuti tahunan (CT) dan izin khusus (IK)",
    "- Status dalam satu hari dipisahkan dengan koma (,)",
    "- Weekend ditandai dengan background merah muda",
    "- Kolom NIK hingga Libur bersifat fixed (frozen)"
  ];

  notes.forEach(note => {
    ws.getCell(row, 1).value = note;
    ws.getCell(row, 1).font = { name: 'Arial', size: 11 };
    ws.mergeCells(row, 1, row, 2);
    row++;
  });
}