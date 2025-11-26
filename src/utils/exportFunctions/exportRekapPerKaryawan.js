import ExcelJS from "exceljs";
import JSZip from "jszip";

export default async function exportRekapPerKaryawan({
  data,
  projectInfo,
  periode,
}) {
  if (!data || data.length === 0) {
    throw new Error("Tidak ada data untuk diekspor");
  }

  // Jika hanya 1 karyawan, export langsung
  if (data.length === 1) {
    await exportSingleKaryawan(data[0], projectInfo, periode);
    return true;
  }

  // Jika lebih dari 1, export ke ZIP
  const zip = new JSZip();

  for (const karyawanData of data) {
    const buffer = await createKaryawanWorkbook(
      karyawanData,
      projectInfo,
      periode
    );
    const fileName = `Rekap_${sanitizeFileName(karyawanData.karyawan.nama)}_${
      karyawanData.karyawan.nik
    }.xlsx`;
    zip.file(fileName, buffer);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const projectName = projectInfo.nama.replace(/[^a-zA-Z0-9]/g, "_");
  const periodeStr = `${periode.tanggal_mulai}_sampai_${periode.tanggal_selesai}`;

  // Download ZIP
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rekap_Karyawan_${projectName}_${periodeStr}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return true;
}

async function exportSingleKaryawan(karyawanData, projectInfo, periode) {
  const wb = new ExcelJS.Workbook();
  createKaryawanSheet(wb, karyawanData, projectInfo, periode);

  const projectName = projectInfo.nama.replace(/[^a-zA-Z0-9]/g, "_");
  const karyawanName = sanitizeFileName(karyawanData.karyawan.nama);
  const periodeStr = `${periode.tanggal_mulai}_sampai_${periode.tanggal_selesai}`;
  const filename = `Rekap_${karyawanName}_${karyawanData.karyawan.nik}_${periodeStr}.xlsx`;

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
}

async function createKaryawanWorkbook(karyawanData, projectInfo, periode) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Aplikasi Presensi Karyawan";
  wb.created = new Date();

  createKaryawanSheet(wb, karyawanData, projectInfo, periode);

  return await wb.xlsx.writeBuffer();
}

function createKaryawanSheet(wb, karyawanData, projectInfo, periode) {
  const ws = wb.addWorksheet("Rekap Presensi");

  ws.views = [{ showGridLines: false }];
  ws.columns = [
    { width: 24 }, // A - Tanggal
    { width: 15 }, // B - Waktu Masuk
    { width: 15 }, // C - Waktu Pulang
    { width: 25 }, // D - Shift
    { width: 30 }, // E - Status
  ];

  let currentRow = 1;

  // Row 1: Title
  ws.mergeCells(`A${currentRow}:E${currentRow}`);
  const titleCell = ws.getCell(`A${currentRow}`);
  titleCell.value = "REKAP PRESENSI KARYAWAN";
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEA580C" },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(currentRow).height = 25;
  currentRow += 2;

  // Row 3: Project Name
  ws.mergeCells(`A${currentRow}:E${currentRow}`);
  const projectCell = ws.getCell(`A${currentRow}`);
  projectCell.value = projectInfo.nama;
  projectCell.font = { bold: true, size: 12 };
  projectCell.alignment = { horizontal: "center" };
  currentRow++;

  // Row 4: Periode
  ws.mergeCells(`A${currentRow}:E${currentRow}`);
  const periodeCell = ws.getCell(`A${currentRow}`);
  const tanggalMulai = new Date(periode.tanggal_mulai);
  const tanggalSelesai = new Date(periode.tanggal_selesai);
  periodeCell.value = `${formatTanggalIndonesia(
    tanggalMulai
  )} - ${formatTanggalIndonesia(tanggalSelesai)} - PT. QIPRAH MULTI SERVICE`;
  periodeCell.font = { bold: true, size: 11 };
  periodeCell.alignment = { horizontal: "center" };
  currentRow += 2;

  // Row 6-9: Identitas Karyawan
  const identitas = [
    ["NIK", karyawanData.karyawan.nik],
    ["Nama Karyawan", karyawanData.karyawan.nama],
    ["Nama Project", projectInfo.nama],
    ["Jabatan", karyawanData.karyawan.jabatan],
  ];

  identitas.forEach(([label, value]) => {
    ws.getCell(`A${currentRow}`).value = label;
    ws.getCell(`A${currentRow}`).font = { bold: true, size: 11 };
    ws.getCell(`B${currentRow}`).value = value;
    ws.getCell(`B${currentRow}`).font = { size: 11 };
    currentRow++;
  });
  currentRow++;

  // Row 10: Statistik Header
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  const statHeaderCell = ws.getCell(`A${currentRow}`);
  statHeaderCell.value = "STATISTIK PRESENSI";
  statHeaderCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  statHeaderCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEA580C" },
  };
  statHeaderCell.alignment = { horizontal: "center" };
  applyBorder(ws, `A${currentRow}:B${currentRow}`);
  currentRow++;

  // Row 11: Table Header Statistik (ubah menjadi "Status" dan "Jumlah")
  ws.getCell(`A${currentRow}`).value = "Status";
  ws.getCell(`B${currentRow}`).value = "Jumlah";
  ws.getRow(currentRow).font = { bold: true, size: 11 };
  ws.getRow(currentRow).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
  applyBorder(ws, `A${currentRow}:B${currentRow}`);
  currentRow++;

  // Row 12+: Data Statistik
  const stats = [
    ["Hadir", karyawanData.statistik.hadir],
    ["Terlambat", karyawanData.statistik.terlambat],
    ["Sakit", karyawanData.statistik.sakit],
    ["Izin", karyawanData.statistik.izin],
    ["Cuti", karyawanData.statistik.cuti],
    ["Alpa", karyawanData.statistik.alpa],
    ["Libur", karyawanData.statistik.libur],
  ];

  stats.forEach(([status, jumlah]) => {
    ws.getCell(`A${currentRow}`).value = status;
    ws.getCell(`B${currentRow}`).value = jumlah;
    ws.getCell(`A${currentRow}`).font = { size: 11 };
    ws.getCell(`B${currentRow}`).font = { size: 11 };
    applyBorder(ws, `A${currentRow}:B${currentRow}`);
    currentRow++;
  });
  currentRow++;

  // Table Header Presensi
  const headers = ["Tanggal", "Waktu Masuk", "Waktu Pulang", "Shift", "Status"];
  headers.forEach((header, idx) => {
    const cell = ws.getCell(currentRow, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEA580C" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  applyBorder(ws, `A${currentRow}:E${currentRow}`);
  ws.getRow(currentRow).height = 20;
  currentRow++;

  // Data Presensi
  // Data Presensi
  karyawanData.presensi_data.forEach((item, idx) => {
    // LOGIC BARU: Gunakan jam dari pengajuan lembur jika sudah disetujui
    let waktuMasuk = item.waktu_masuk;
    let waktuPulang = item.waktu_pulang;

    // Cek apakah status pulang adalah Lembur (bukan Lembur Pending)
    if (item.status_pulang === "Lembur" && item.pengajuan_lembur) {
      // Hanya waktu PULANG yang diganti dengan jam selesai dari pengajuan lembur
      if (item.pengajuan_lembur.jam_selesai) {
        waktuPulang = item.pengajuan_lembur.jam_selesai;
      }
    }

    ws.getCell(`A${currentRow}`).value = item.tanggal_formatted;
    ws.getCell(`B${currentRow}`).value = waktuMasuk;
    ws.getCell(`C${currentRow}`).value = waktuPulang;
    ws.getCell(`D${currentRow}`).value = item.shift;

    // Logika status: Jika pulang adalah lembur, tampilkan status pulang
    // Jika tidak, tampilkan status masuk
    let statusToShow = item.status_masuk;

    // Cek apakah status pulang adalah lembur atau lembur pending
    if (
      item.status_pulang &&
      (item.status_pulang.toLowerCase().includes("lembur") ||
        item.status_pulang === "Lembur" ||
        item.status_pulang === "Lembur (Pending)")
    ) {
      statusToShow = item.status_pulang;
    }

    ws.getCell(`E${currentRow}`).value = statusToShow;

    // Format kolom waktu sebagai TEXT
    ws.getCell(`B${currentRow}`).numFmt = "@";
    ws.getCell(`C${currentRow}`).numFmt = "@";

    // Center align untuk waktu
    ws.getCell(`B${currentRow}`).alignment = { horizontal: "center" };
    ws.getCell(`C${currentRow}`).alignment = { horizontal: "center" };

    // Set font
    for (let col = 1; col <= 5; col++) {
      ws.getCell(currentRow, col).font = { size: 11 };
    }

    // Zebra striping
    if (idx % 2 === 1) {
      for (let col = 1; col <= 5; col++) {
        ws.getCell(currentRow, col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FAFB" },
        };
      }
    }

    applyBorder(ws, `A${currentRow}:E${currentRow}`);
    currentRow++;
  });
}

function applyBorder(ws, range) {
  const border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  if (range.includes(":")) {
    const [start, end] = range.split(":");
    const startCol = start.replace(/[0-9]/g, "");
    const startRow = parseInt(start.replace(/[A-Z]/g, ""));
    const endCol = end.replace(/[0-9]/g, "");
    const endRow = parseInt(end.replace(/[A-Z]/g, ""));

    for (let row = startRow; row <= endRow; row++) {
      for (
        let col = startCol.charCodeAt(0);
        col <= endCol.charCodeAt(0);
        col++
      ) {
        const cell = ws.getCell(String.fromCharCode(col) + row);
        cell.border = border;
      }
    }
  } else {
    ws.getCell(range).border = border;
  }
}

function formatTanggalIndonesia(date) {
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const bulan = [
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

  return `${hari[date.getDay()]}, ${date.getDate()} ${
    bulan[date.getMonth()]
  } ${date.getFullYear()}`;
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9]/g, "_");
}
