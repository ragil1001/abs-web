import ExcelJS from "exceljs";

export default async function exportPresensiHarian({
  data,
  projectInfo,
  statistik,
  tanggal,
}) {
  if (!data || data.length === 0) {
    throw new Error("Tidak ada data untuk diekspor");
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Aplikasi Presensi Karyawan";
  wb.created = new Date();

  const tanggalObj = new Date(tanggal);
  const hariNama = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];
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

  const hari = hariNama[tanggalObj.getDay()];
  const tanggalStr = tanggalObj.getDate();
  const bulan = bulanNama[tanggalObj.getMonth()];
  const tahun = tanggalObj.getFullYear();
  const tanggalFormatted = `${hari}, ${tanggalStr} ${bulan} ${tahun}`;

  createPresensiMasukSheet(
    wb,
    data,
    projectInfo,
    statistik.masuk,
    tanggalFormatted
  );

  createPresensiPulangSheet(
    wb,
    data,
    projectInfo,
    statistik.pulang,
    tanggalFormatted
  );

  const projectName = projectInfo.nama.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Presensi_Harian_${projectName}_${tanggal}.xlsx`;

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

function createPresensiMasukSheet(
  wb,
  data,
  projectInfo,
  statistikMasuk,
  tanggalFormatted
) {
  const ws = wb.addWorksheet("Presensi Masuk");

  ws.columns = [
    { width: 15 },
    { width: 25 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 12 },
    { width: 15 },
    { width: 35 },
    { width: 50 },
    { width: 40 },
  ];

  let currentRow = 1;

  ws.mergeCells(`A${currentRow}:J${currentRow}`);
  const titleCell = ws.getCell(`A${currentRow}`);
  titleCell.value = "REKAP PRESENSI MASUK";
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEA580C" },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(currentRow).height = 25;
  currentRow += 2;

  ws.mergeCells(`A${currentRow}:J${currentRow}`);
  const projectNameCell = ws.getCell(`A${currentRow}`);
  projectNameCell.value = projectInfo.nama;
  projectNameCell.font = { bold: true, size: 12 };
  projectNameCell.alignment = { horizontal: "center" };
  currentRow++;

  ws.mergeCells(`A${currentRow}:J${currentRow}`);
  const dateCell = ws.getCell(`A${currentRow}`);
  dateCell.value = `${tanggalFormatted} - PT. QIPRAH MULTI SERVICE`;
  dateCell.font = { bold: true, size: 11 };
  dateCell.alignment = { horizontal: "center" };
  currentRow += 2;

  ws.getCell(`A${currentRow}`).value = "Nama Project";
  ws.getCell(`A${currentRow}`).font = { bold: true };
  ws.getCell(`B${currentRow}`).value = projectInfo.nama;
  currentRow++;

  ws.getCell(`A${currentRow}`).value = "Lokasi";
  ws.getCell(`A${currentRow}`).font = { bold: true };
  ws.getCell(`B${currentRow}`).value = projectInfo.lokasi?.nama || "-";
  currentRow++;

  ws.getCell(`A${currentRow}`).value = "Total Karyawan";
  ws.getCell(`A${currentRow}`).font = { bold: true };
  ws.getCell(`B${currentRow}`).value = projectInfo.total_karyawan;
  currentRow += 2;

  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  const statHeaderCell = ws.getCell(`A${currentRow}`);
  statHeaderCell.value = "STATISTIK PRESENSI MASUK";
  statHeaderCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  statHeaderCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEA580C" },
  };
  statHeaderCell.alignment = { horizontal: "center" };
  currentRow++;

  ws.getCell(`A${currentRow}`).value = "Status";
  ws.getCell(`B${currentRow}`).value = "Jumlah";
  ws.getRow(currentRow).font = { bold: true };
  ws.getRow(currentRow).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
  applyBorder(ws, `A${currentRow}:B${currentRow}`);
  currentRow++;

  const stats = [
    ["Hadir", statistikMasuk.hadir],
    ["Terlambat", statistikMasuk.terlambat],
    ["Izin", statistikMasuk.izin],
    ["Alpa", statistikMasuk.alpa],
    ["Libur", statistikMasuk.libur],
  ];

  stats.forEach(([status, jumlah]) => {
    ws.getCell(`A${currentRow}`).value = status;
    ws.getCell(`B${currentRow}`).value = jumlah;
    applyBorder(ws, `A${currentRow}:B${currentRow}`);
    currentRow++;
  });
  currentRow++;

  const tableHeaderRow = currentRow;
  const headers = [
    "NIK",
    "Nama",
    "Divisi",
    "Jabatan",
    "Shift",
    "Waktu Masuk",
    "Status",
    "Keterangan",
    "Foto",
    "Lokasi",
  ];
  headers.forEach((header, idx) => {
    const cell = ws.getCell(tableHeaderRow, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEA580C" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  applyBorder(ws, `A${tableHeaderRow}:J${tableHeaderRow}`);
  currentRow++;

  data.forEach((item) => {
    const presensi = item.presensi_masuk;

    const status = presensi
      ? getStatusText(presensi.status)
      : item.shift_code === "L"
      ? "Libur"
      : "Alpa";

    ws.getCell(`A${currentRow}`).value = item.nik;
    ws.getCell(`B${currentRow}`).value = item.nama;
    ws.getCell(`C${currentRow}`).value = item.divisi;
    ws.getCell(`D${currentRow}`).value = item.jabatan;
    ws.getCell(`E${currentRow}`).value = item.shift;

    // FIX: Hanya tampilkan waktu jika presensi ada dan waktu tidak null
    ws.getCell(`F${currentRow}`).value =
      presensi && presensi.waktu ? presensi.waktu : "-";

    ws.getCell(`G${currentRow}`).value = status;
    ws.getCell(`H${currentRow}`).value = presensi?.keterangan || "-";

    if (presensi?.foto) {
      const fotoCell = ws.getCell(`I${currentRow}`);
      fotoCell.value = {
        text: "Lihat Foto",
        hyperlink: presensi.foto,
        tooltip: "Klik untuk membuka foto presensi",
      };
      fotoCell.font = { color: { argb: "FF0563C1" }, underline: true };
    } else {
      ws.getCell(`I${currentRow}`).value = "-";
    }

    if (presensi?.latitude && presensi?.longitude) {
      const mapsUrl = `https://www.google.com/maps?q=${presensi.latitude},${presensi.longitude}`;
      const lokasiCell = ws.getCell(`J${currentRow}`);
      lokasiCell.value = {
        text: `${presensi.latitude}, ${presensi.longitude}`,
        hyperlink: mapsUrl,
        tooltip: "Klik untuk membuka Google Maps",
      };
      lokasiCell.font = { color: { argb: "FF0563C1" }, underline: true };
    } else {
      ws.getCell(`J${currentRow}`).value = "-";
    }

    ws.getCell(`A${currentRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    ws.getCell(`F${currentRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    ws.getCell(`G${currentRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    ws.getCell(`I${currentRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    ws.getCell(`J${currentRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    applyBorder(ws, `A${currentRow}:J${currentRow}`);
    currentRow++;
  });
}

function createPresensiPulangSheet(
  wb,
  data,
  projectInfo,
  statistikPulang,
  tanggalFormatted
) {
  const ws = wb.addWorksheet("Presensi Pulang");

  ws.columns = [
    { width: 15 },
    { width: 25 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 12 },
    { width: 20 },
    { width: 35 },
    { width: 50 },
    { width: 40 },
  ];

  let currentRow = 1;

  ws.mergeCells(`A${currentRow}:J${currentRow}`);
  const titleCell = ws.getCell(`A${currentRow}`);
  titleCell.value = "REKAP PRESENSI PULANG";
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEA580C" },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(currentRow).height = 25;
  currentRow += 2;

  ws.mergeCells(`A${currentRow}:J${currentRow}`);
  const projectNameCell = ws.getCell(`A${currentRow}`);
  projectNameCell.value = projectInfo.nama;
  projectNameCell.font = { bold: true, size: 12 };
  projectNameCell.alignment = { horizontal: "center" };
  currentRow++;

  ws.mergeCells(`A${currentRow}:J${currentRow}`);
  const dateCell = ws.getCell(`A${currentRow}`);
  dateCell.value = `${tanggalFormatted} - PT. QIPRAH MULTI SERVICE`;
  dateCell.font = { bold: true, size: 11 };
  dateCell.alignment = { horizontal: "center" };
  currentRow += 2;

  ws.getCell(`A${currentRow}`).value = "Nama Project";
  ws.getCell(`A${currentRow}`).font = { bold: true };
  ws.getCell(`B${currentRow}`).value = projectInfo.nama;
  currentRow++;

  ws.getCell(`A${currentRow}`).value = "Lokasi";
  ws.getCell(`A${currentRow}`).font = { bold: true };
  ws.getCell(`B${currentRow}`).value = projectInfo.lokasi?.nama || "-";
  currentRow++;

  ws.getCell(`A${currentRow}`).value = "Total Karyawan";
  ws.getCell(`A${currentRow}`).font = { bold: true };
  ws.getCell(`B${currentRow}`).value = projectInfo.total_karyawan;
  currentRow += 2;

  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  const statHeaderCell = ws.getCell(`A${currentRow}`);
  statHeaderCell.value = "STATISTIK PRESENSI PULANG";
  statHeaderCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  statHeaderCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEA580C" },
  };
  statHeaderCell.alignment = { horizontal: "center" };
  currentRow++;

  ws.getCell(`A${currentRow}`).value = "Status";
  ws.getCell(`B${currentRow}`).value = "Jumlah";
  ws.getRow(currentRow).font = { bold: true };
  ws.getRow(currentRow).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
  applyBorder(ws, `A${currentRow}:B${currentRow}`);
  currentRow++;

  const stats = [
    ["Hadir", statistikPulang.hadir],
    ["Lembur", statistikPulang.lembur],
    ["Lembur (Pending)", statistikPulang.lembur_pending],
    ["Pulang Cepat", statistikPulang.pulang_cepat],
    ["Tidak Presensi Pulang", statistikPulang.tidak_presensi_pulang],
    ["Izin", statistikPulang.izin],
    ["Alpa", statistikPulang.alpa],
    ["Libur", statistikPulang.libur],
  ];

  stats.forEach(([status, jumlah]) => {
    ws.getCell(`A${currentRow}`).value = status;
    ws.getCell(`B${currentRow}`).value = jumlah;
    applyBorder(ws, `A${currentRow}:B${currentRow}`);
    currentRow++;
  });
  currentRow++;

  const tableHeaderRow = currentRow;
  const headers = [
    "NIK",
    "Nama",
    "Divisi",
    "Jabatan",
    "Shift",
    "Waktu Pulang",
    "Status",
    "Keterangan",
    "Foto",
    "Lokasi",
  ];
  headers.forEach((header, idx) => {
    const cell = ws.getCell(tableHeaderRow, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEA580C" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  applyBorder(ws, `A${tableHeaderRow}:J${tableHeaderRow}`);
  currentRow++;

  data.forEach((item) => {
    const presensi = item.presensi_pulang;

    // LOGIC BARU: Cek apakah ada pengajuan lembur yang disetujui
    let waktuPulang = "-";

    if (presensi) {
      // Jika status adalah lembur (bukan lembur_pending) dan ada data pengajuan lembur
      if (
        presensi.status === "lembur" &&
        item.pengajuan_lembur &&
        item.pengajuan_lembur.jam_selesai
      ) {
        // Gunakan jam selesai dari pengajuan lembur
        waktuPulang = item.pengajuan_lembur.jam_selesai;
      } else if (presensi.waktu) {
        // Gunakan waktu presensi aktual
        waktuPulang = presensi.waktu;
      }
    }

    const status = presensi
      ? getStatusTextPulang(presensi.status)
      : item.shift_code === "L"
      ? "Libur"
      : "Alpa";

    ws.getCell(`A${currentRow}`).value = item.nik;
    ws.getCell(`B${currentRow}`).value = item.nama;
    ws.getCell(`C${currentRow}`).value = item.divisi;
    ws.getCell(`D${currentRow}`).value = item.jabatan;
    ws.getCell(`E${currentRow}`).value = item.shift;

    // FIX: Hanya tampilkan waktu jika presensi ada dan waktu tidak null
    ws.getCell(`F${currentRow}`).value =
      presensi && presensi.waktu ? presensi.waktu : "-";

    ws.getCell(`G${currentRow}`).value = status;
    ws.getCell(`H${currentRow}`).value = presensi?.keterangan || "-";

    if (presensi?.foto) {
      const fotoCell = ws.getCell(`I${currentRow}`);
      fotoCell.value = {
        text: "Lihat Foto",
        hyperlink: presensi.foto,
        tooltip: "Klik untuk membuka foto presensi",
      };
      fotoCell.font = { color: { argb: "FF0563C1" }, underline: true };
    } else {
      ws.getCell(`I${currentRow}`).value = "-";
    }

    if (presensi?.latitude && presensi?.longitude) {
      const mapsUrl = `https://www.google.com/maps?q=${presensi.latitude},${presensi.longitude}`;
      const lokasiCell = ws.getCell(`J${currentRow}`);
      lokasiCell.value = {
        text: `${presensi.latitude}, ${presensi.longitude}`,
        hyperlink: mapsUrl,
        tooltip: "Klik untuk membuka Google Maps",
      };
      lokasiCell.font = { color: { argb: "FF0563C1" }, underline: true };
    } else {
      ws.getCell(`J${currentRow}`).value = "-";
    }

    ws.getCell(`A${currentRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    ws.getCell(`F${currentRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    ws.getCell(`G${currentRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    ws.getCell(`I${currentRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    ws.getCell(`J${currentRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    applyBorder(ws, `A${currentRow}:J${currentRow}`);
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

function getStatusText(status) {
  const statusMap = {
    hadir: "Hadir",
    terlambat: "Terlambat",
    izin: "Izin",
    alpa: "Alpa",
    libur: "Libur",
  };
  return statusMap[status] || status;
}

function getStatusTextPulang(status) {
  const statusMap = {
    hadir: "Hadir",
    lembur: "Lembur",
    lembur_pending: "Lembur (Pending)",
    pulang_cepat: "Pulang Cepat",
    tidak_presensi_pulang: "Tidak Presensi Pulang",
    izin: "Izin",
    alpa: "Alpa",
    libur: "Libur",
  };
  return statusMap[status] || status;
}
