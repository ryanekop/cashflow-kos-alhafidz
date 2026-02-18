const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const xlsxPath = path.join(__dirname, '..', 'Excel', 'REKAP KAS KOS.xlsx');

const wb = XLSX.readFile(xlsxPath);

const monthNums = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

// Members who left in 2026
const EXCLUDED = ['Azis', 'Nikolas', 'Esa'];

// === 1. EXTRACT MEMBERS from 2025 + 2026 (union of all unique names, excluding departed) ===
const memberNames = new Set();

function extractMembers(sheetName) {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    for (let i = 2; i < 20; i++) {
        const row = data[i];
        if (!row) continue;
        const name = ('' + (row[1] || '')).trim();
        if (name && name.length > 0 && !name.includes('TIMELINE') && !name.includes('KETERANGAN')) {
            if (!EXCLUDED.includes(name)) {
                memberNames.add(name);
            }
        }
    }
}

extractMembers('2025');
extractMembers('2026');

function guessStatus(name) {
    for (const sheetName of ['2026', '2025']) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        for (let i = 2; i < 20; i++) {
            const row = data[i];
            if (!row) continue;
            const n = ('' + (row[1] || '')).trim();
            if (n !== name) continue;
            for (let m = 13; m >= 2; m--) {
                const val = row[m];
                if (val !== '' && typeof val === 'number') {
                    if (val === 10) return 'none';
                    if (val === 12.5 || val === 15) return 'half';
                    return 'full';
                }
            }
        }
    }
    return 'full';
}

const members = [];
let memberId = 1;
memberNames.forEach(name => {
    members.push({ id: memberId++, name, status: guessStatus(name) });
});

console.log('=== MEMBERS ===');
members.forEach(m => console.log(`  ${m.id}. ${m.name} (${m.status})`));

// === 2. EXTRACT KAS TRANSACTIONS from grid (2025 + 2026) ===
const transactions = [];
let txId = 1000;

function getMemberId(name) {
    const m = members.find(m => m.name.toLowerCase() === name.toLowerCase());
    return m ? m.id : null;
}

function extractKasGrid(sheetName, year) {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    for (let i = 2; i < 20; i++) {
        const row = data[i];
        if (!row) continue;
        const name = ('' + (row[1] || '')).trim();
        if (EXCLUDED.includes(name)) continue;
        const mId = getMemberId(name);
        if (!mId) continue;

        for (let m = 0; m < 12; m++) {
            const val = row[m + 2];
            if (val !== '' && typeof val === 'number') {
                const amount = val * 1000;
                let status = 'full';
                if (val === 10) status = 'none';
                else if (val === 12.5 || val === 15) status = 'half';

                const month = `${year}-${monthNums[m]}`;
                transactions.push({
                    id: txId++,
                    memberId: mId,
                    memberName: name,
                    type: 'kas',
                    month,
                    amount,
                    status,
                    date: `${year}-${monthNums[m]}-15T00:00:00.000Z`,
                    notes: `Import dari Excel (${status})`
                });
            }
        }
    }
}

extractKasGrid('2025', 2025);
extractKasGrid('2026', 2026);

// === 3. EXTRACT EXPENSES from 2025 timeline (free-form text parsing) ===
// Key expenses found in the 2025 timeline:
const expenses2025 = [
    { date: '2025-02-04', desc: 'Beli Sapu Lidi Gagang Panjang (Baru)', amount: 27800 },
    { date: '2025-02-26', desc: 'Beli Keran Baru Kmr Mandi Bawah + Pasang', amount: 50000 },
    { date: '2025-02-27', desc: 'Beli Engsel Baru Kmr Mandi Atas + Pasang', amount: 50000 },
    { date: '2025-03-12', desc: 'Beli Terminal Stop Kontak + Kabel LAN + WIFI Router Nokia x2', amount: 286264 },
    { date: '2025-03-15', desc: 'Beli Listrik Maret', amount: 50000 },
    { date: '2025-04-05', desc: 'Beli Listrik April', amount: 50000 },
    { date: '2025-04-12', desc: 'Beli Palu Kambing / Claw Hammer', amount: 29266 },
    { date: '2025-05-14', desc: 'Beli Listrik 14 Mei', amount: 50000 },
    { date: '2025-05-18', desc: 'Beli Listrik 18 Mei', amount: 50000 },
    { date: '2025-05-22', desc: 'Beli Listrik 22 Mei', amount: 50000 },
    { date: '2025-05-25', desc: 'Beli Listrik 25 Mei', amount: 50000 },
    { date: '2025-05-29', desc: 'Beli Listrik 29 Mei', amount: 50000 },
    { date: '2025-06-02', desc: 'Beli Lampu 3 pcs + Listrik', amount: 174500 },
    { date: '2025-06-06', desc: 'Beli Listrik 06 Juni', amount: 50000 },
    { date: '2025-06-22', desc: 'Beli Listrik 22 Juni', amount: 50000 },
    { date: '2025-06-27', desc: 'Beli Listrik 27 Juni', amount: 50000 },
    { date: '2025-07-03', desc: 'Beli Listrik 03 Juli', amount: 50000 },
    { date: '2025-07-09', desc: 'Beli Listrik 09 Juli', amount: 50000 },
    { date: '2025-07-15', desc: 'Beli Listrik 15 Juli', amount: 50000 },
    // August
    { date: '2025-08-14', desc: 'Beli Lampu', amount: 35000 },
    // September
    { date: '2025-09-18', desc: 'Beli Token Listrik Sept (1)', amount: 50000 },
    { date: '2025-09-26', desc: 'Beli Token Listrik Sept (2)', amount: 50000 },
    // October
    { date: '2025-10-15', desc: 'Beli Trashbag 30 biji', amount: 34300 },
    { date: '2025-10-21', desc: 'Beli Token Listrik Okt (1)', amount: 100000 },
    { date: '2025-10-29', desc: 'Beli Token Listrik Okt (2)', amount: 100000 },
    { date: '2025-10-29', desc: 'Beli Trashbag 60 biji', amount: 66700 },
    { date: '2025-10-31', desc: 'Beli Vixal', amount: 19500 },
    { date: '2025-10-31', desc: 'Beli Trashbag', amount: 35000 },
    // November
    { date: '2025-11-06', desc: 'Beli Token Listrik Nov (1)', amount: 100000 },
    { date: '2025-11-09', desc: 'Beli Token Listrik Nov (2)', amount: 100000 },
    // December
    { date: '2025-12-07', desc: 'Beli Token Listrik Des (1)', amount: 49250 },
    { date: '2025-12-30', desc: 'Beli Token Listrik Des (2)', amount: 47250 },
];

expenses2025.forEach(e => {
    transactions.push({
        id: txId++,
        memberId: 0,
        memberName: 'Pengeluaran',
        type: 'pengeluaran',
        month: e.date.slice(0, 7),
        amount: -e.amount,
        status: 'expense',
        date: e.date + 'T00:00:00.000Z',
        notes: e.desc
    });
});

// === 4. EXTRACT EXPENSES from 2026 timeline (structured table) ===
const ws2026 = wb.Sheets['2026'];
const data2026 = XLSX.utils.sheet_to_json(ws2026, { header: 1, defval: '' });

for (let i = 29; i < 60; i++) {
    const row = data2026[i];
    if (!row) continue;

    const kredit = row[10];
    if (kredit && typeof kredit === 'number' && kredit > 0) {
        const dateVal = row[1];
        let dateStr = '';
        if (typeof dateVal === 'number') {
            const d = XLSX.SSF.parse_date_code(dateVal);
            dateStr = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}T00:00:00.000Z`;
        }

        const desc = ('' + (row[4] || '')).trim();
        const name = ('' + (row[2] || '')).trim();
        const monthStr = dateStr ? dateStr.slice(0, 7) : '2026-01';

        transactions.push({
            id: txId++,
            memberId: 0,
            memberName: name || 'Pengeluaran',
            type: 'pengeluaran',
            month: monthStr,
            amount: -kredit,
            status: 'expense',
            date: dateStr || '2026-01-15T00:00:00.000Z',
            notes: desc || 'Pengeluaran'
        });
    }
}

// Sort transactions by date
transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

console.log(`\n=== TRANSACTIONS (${transactions.length} total) ===`);
const kasCount = transactions.filter(t => t.type === 'kas').length;
const expCount = transactions.filter(t => t.type === 'pengeluaran').length;
console.log(`  Kas payments: ${kasCount}`);
console.log(`  Pengeluaran: ${expCount}`);
console.log('\nPengeluaran detail:');
transactions.filter(t => t.type === 'pengeluaran').forEach(t => {
    console.log(`  ${t.date.slice(0, 10)} | ${t.notes} | ${t.amount}`);
});

// === 5. WRITE TO JSON FILES ===
fs.writeFileSync(path.join(dataDir, 'members.json'), JSON.stringify(members, null, 2));
fs.writeFileSync(path.join(dataDir, 'transactions.json'), JSON.stringify(transactions, null, 2));

console.log(`\n✅ Imported:`);
console.log(`   ${members.length} members → data/members.json`);
console.log(`   ${transactions.length} transactions → data/transactions.json`);
