const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const XLSX = require('xlsx');

const historicalWorkbook = path.join(__dirname, '../Excel/REKAP KAS KOS.xlsx');
test('historical workbook retains every sheet and cell value after XLSX serialization', {
  skip: fs.existsSync(historicalWorkbook) ? false : 'optional private historical workbook is not present',
}, () => {
  const original = XLSX.readFile(historicalWorkbook);
  assert.deepEqual(original.SheetNames, ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']);
  const restored = XLSX.read(XLSX.write(original, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
  assert.deepEqual(restored.SheetNames, original.SheetNames);
  for (const name of original.SheetNames) {
    assert.deepEqual(
      XLSX.utils.sheet_to_json(restored.Sheets[name], { header: 1, defval: '', raw: true }),
      XLSX.utils.sheet_to_json(original.Sheets[name], { header: 1, defval: '', raw: true }),
      `historical values changed in ${name}`,
    );
  }
});

test('export APIs preserve sheet names, numeric amounts, dates and blank cells', () => {
  const sheets = {
    Ringkasan: [['Keterangan', 'Jumlah'], ['Total Pemasukan', 150000], ['Total Pengeluaran', 25000], ['Saldo Kas', 125000]],
    'Rekap Kas': [['No', 'Nama', 'Januari', 'Februari', 'Total'], [1, 'Penghuni Uji', 150000, '', 150000]],
    Pengeluaran: [['No', 'Tanggal', 'Keterangan', 'Jumlah'], [1, '25/10/2026', 'Perawatan', 25000]],
    'Semua Transaksi': [['No', 'Tipe', 'Nama', 'Bulan', 'Nominal', 'Status', 'Tanggal', 'Catatan'], [1, 'kas', 'Penghuni Uji', '2026-10', 150000, 'lunas', '25/10/2026', '-']],
  };
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  const restored = XLSX.read(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
  assert.deepEqual(restored.SheetNames, Object.keys(sheets));
  for (const [name, rows] of Object.entries(sheets)) {
    assert.deepEqual(XLSX.utils.sheet_to_json(restored.Sheets[name], { header: 1, defval: '', raw: true }), rows);
  }
  assert.equal(restored.Sheets.Ringkasan.B2.t, 'n');
  assert.deepEqual(XLSX.SSF.parse_date_code(46320), { D: 46320, T: 0, u: 0, y: 2026, m: 10, d: 25, H: 0, M: 0, S: 0, q: 0 });
});
