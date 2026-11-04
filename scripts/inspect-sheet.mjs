import XLSX from 'xlsx';

const wb = XLSX.readFile('src/sample-sheet.xlsx');
const settings = XLSX.utils.sheet_to_json(wb.Sheets.Settings, { header: 1, defval: '' });
console.log('SETTINGS', JSON.stringify(settings, null, 2));

const fields = ['Source', 'Source(Remarks)', 'Country', 'State', 'Language', 'City', 'Specialization', 'Region'];
const unique = Object.fromEntries(fields.map((f) => [f, new Set()]));
const allStatus = new Set();

for (const name of ['ANWAR', 'SUNISH']) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '', raw: false });
  rows.forEach((row) => {
    const obj = {};
    Object.keys(row).forEach((k) => {
      obj[k.trim ? k.trim() : k] = row[k];
    });
    const status = String(obj.Status || '').trim();
    if (status) allStatus.add(status);
    fields.forEach((f) => {
      const key = Object.keys(obj).find((k) => k.toLowerCase() === f.toLowerCase()) || f;
      const v = String(obj[key] || '').trim();
      if (v) unique[f].add(v);
    });
  });
}

console.log('ALL_STATUSES', [...allStatus].sort());
for (const f of fields) {
  console.log(f, [...unique[f]].sort());
}
