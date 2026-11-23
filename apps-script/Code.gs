/**
 * Kaunter POS: skrip Google Sheets.
 *
 * Skrip ini menjadikan Google Sheet ini pangkalan data kaunter: menu, tetapan,
 * pesanan tertangguh dan jualan. Kaunter (index.html) memanggil skrip ini
 * melalui URL "Web app".
 *
 * Persediaan (sekali sahaja):
 *   1. Tukar PIN di bawah kepada nombor rahsia anda sendiri.
 *   2. Tekan Save.
 *   3. Deploy > New deployment > Select type: Web app
 *      Execute as: Me    Who has access: Anyone
 *   4. Salin "Web app URL" dan tampal di kaunter: Tetapan > Sambungan Google Sheets.
 *
 * Selepas mengubah skrip ini: Deploy > Manage deployments > Edit (ikon pensel)
 * > Version: New version > Deploy. URL kekal sama.
 */
const PIN = 'TUKAR-PIN-INI';

const SH = { sales: 'Jualan', items: 'Item', menu: 'Menu', config: 'Tetapan', open: 'Tertangguh' };
// Jualan: A Tarikh, B Masa, C No, D Jenis, E Nama, F Item, G Jumlah kecil, H Diskaun, I Caj perkhidmatan,
// J SST, K Caj delivery, L Pembundaran, M Jumlah, N Bayaran, O Status, P ID, Q Data (JSON)
const SALES_COLS = 17, C_DATE = 1, C_TIME = 2, C_NO = 3, C_STATUS = 15, C_ID = 16, C_DATA = 17;
// Item: A Tarikh, B Masa, C No, D Item, E Pilihan, F Kuantiti, G Harga seunit, H Jumlah, I Status, J ID pesanan
const ITEM_COLS = 10, I_STATUS = 9, I_ID = 10;
const PAY = { cash: 'Tunai', card: 'Kad', qr: 'DuitNow QR', ewallet: 'e-Wallet', app: 'Apps' };
const TYPES = { shop: 'Kedai', pickup: 'Pickup', app: 'Apps', dine: 'Makan sini', take: 'Bungkus' };
const APPS = ['Grab', 'Shopee', 'Foodpanda'];
// Tetapan: label in column A, value in column B.
const CFG = [
  ['name', 'Nama kedai'], ['address', 'Alamat'], ['phone', 'Telefon'], ['sstNo', 'No. pendaftaran SST'],
  ['sst', 'SST (%)'], ['svc', 'Caj perkhidmatan (%)'], ['round5', 'Bundar tunai ke 5 sen'],
  ['paper', 'Lebar kertas resit (mm)'], ['footer', 'Nota kaki resit'], ['cats', 'Susunan kategori'], ['theme', 'Tema warna'],
];

function doGet() {
  return ContentService.createTextOutput('Kaunter POS: skrip berjalan. Tampal URL ini di kaunter: Tetapan > Sambungan Google Sheets.');
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (PIN === 'TUKAR-PIN-INI') throw err_('pin_not_set', 'PIN belum ditukar dalam skrip.');
    if (String(req.pin || '') !== String(PIN)) throw err_('bad_pin', 'PIN salah.');
    const fn = ACTIONS[req.action];
    if (!fn) throw err_('bad_action', 'Tindakan tidak dikenali: ' + req.action);
    out = fn(req);
  } catch (x) {
    out = { error: (x && x.code) || 'server', message: String((x && x.message) || x) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

const ACTIONS = {
  ping: () => ({ ok: true, name: readConfig_().name || '', sheetUrl: ss_().getUrl(), rev: rev_() }),
  sync: req => {
    const cur = rev_();
    if (req.rev !== null && req.rev !== undefined && Number(req.rev) === cur) return { same: true, rev: cur };
    const date = String(req.date || '');
    const days = date ? readOrders_(date, date) : {};
    return { rev: cur, sheetUrl: ss_().getUrl(), config: readConfig_(), menu: readMenu_(), open: readOpen_(), today: days[date] || null };
  },
  orders: req => ({ days: readOrders_(String(req.from), String(req.to)), rev: rev_() }),
  addOrder: req => write_(() => ({ order: addOrder_(String(req.date), req.order) })),
  voidOrder: req => write_(() => ({ order: voidOrder_(String(req.id)) })),
  saveItem: req => write_(() => { saveItem_(req.item); return { menu: readMenu_() }; }),
  saveItems: req => write_(() => { (req.items || []).forEach(saveItem_); return { menu: readMenu_() }; }),
  deleteItem: req => write_(() => { deleteRowById_(SH.menu, String(req.id)); return { menu: readMenu_() }; }),
  saveConfig: req => write_(() => { writeConfig_(req.config || {}); return { config: readConfig_() }; }),
  saveOpen: req => write_(() => { saveOpen_(req.ticket, req.label); return { open: readOpen_() }; }),
  deleteOpen: req => write_(() => { deleteRowById_(SH.open, String(req.id)); return { open: readOpen_() }; }),
};

/* ---------- helpers ---------- */
function err_(code, message) { const e = new Error(message); e.code = code; return e; }
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name) {
  const s = ss_().getSheetByName(name);
  if (!s) throw err_('no_sheet', 'Tab "' + name + '" tiada dalam Google Sheet.');
  return s;
}
function tz_() { return ss_().getSpreadsheetTimeZone(); }
function isDate_(v) { return Object.prototype.toString.call(v) === '[object Date]'; }
function dkey_(v) {
  if (isDate_(v)) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  const s = String(v || '');
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : s.slice(0, 10);
}
function rev_() { return Number(PropertiesService.getScriptProperties().getProperty('rev') || 0); }
function write_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const out = fn();
    const next = rev_() + 1;
    PropertiesService.getScriptProperties().setProperty('rev', String(next));
    out.rev = next;
    return out;
  } finally { lock.releaseLock(); }
}
function txt_(v) { const s = String(v === null || v === undefined ? '' : v); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function num_(v) { return Number(v) || 0; }
function sen_(v) { return Math.round((Number(v) || 0) * 100); }
function findRow_(sh, col, id) {
  if (!id || sh.getLastRow() < 2) return 0;
  const cell = sh.getRange(2, col, sh.getLastRow() - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : 0;
}
function deleteRowById_(name, id) { const sh = sheet_(name), r = findRow_(sh, 1, id); if (r) sh.deleteRow(r); }
function timeOf_(t) { return Utilities.formatDate(new Date(Number(t) || Date.now()), tz_(), 'HH:mm'); }
function typeName_(o) { return o.type === 'app' ? (o.app || 'Apps') : (TYPES[o.type] || 'Kedai'); }
function itemsLine_(o) {
  return (o.items || []).map(it => it.q + 'x ' + it.n + (it.m && it.m.length ? ' (' + it.m.join(', ') + ')' : '')).join('; ');
}

/* ---------- menu ---------- */
// Menu: A ID, B Nama, C Harga (RM), D Kategori, E Pilihan, F Ada stok, G Susunan
function parseMods_(v) {
  return String(v || '').split(/[;\n]/).map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(.*?)\s*[,=|+]\s*(?:RM\s*)?(\d+(?:\.\d{1,2})?)\s*$/i);
    return m ? { n: m[1].trim(), p: Number(m[2]) } : { n: s, p: 0 };
  });
}
function modsText_(mods) { return (mods || []).map(m => (Number(m.p) ? m.n + ', ' + Number(m.p).toFixed(2) : m.n)).join('; '); }
function readMenu_() {
  const sh = sheet_(SH.menu), n = sh.getLastRow();
  if (n < 2) return [];
  const rows = sh.getRange(2, 1, n - 1, 7).getValues(), out = [];
  rows.forEach((r, i) => {
    if (String(r[1]).trim() === '') return;
    let id = String(r[0]).trim();
    if (!id) { id = 'm' + Date.now().toString(36) + i; sh.getRange(i + 2, 1).setValue(id); }
    const it = { id: id, name: String(r[1]).trim(), price: Number(r[2]) || 0, cat: String(r[3] || '').trim(), mods: parseMods_(r[4]), avail: !(r[5] === false || String(r[5]).toUpperCase() === 'FALSE') };
    if (r[6] !== '' && !isNaN(Number(r[6]))) it.sort = Number(r[6]);
    out.push(it);
  });
  return out;
}
function saveItem_(it) {
  if (!it || !it.id || !it.name) throw err_('bad_item', 'Item tidak lengkap.');
  const sh = sheet_(SH.menu);
  const row = [txt_(it.id), txt_(it.name), num_(it.price), txt_(it.cat || ''), txt_(modsText_(it.mods)), it.avail !== false, typeof it.sort === 'number' ? it.sort : ''];
  let r = findRow_(sh, 1, String(it.id));
  if (!r) r = Math.max(sh.getLastRow(), 1) + 1;
  sh.getRange(r, 1, 1, 7).setValues([row]);
  sh.getRange(r, 6).insertCheckboxes().setValue(it.avail !== false);
}

/* ---------- settings ---------- */
function readConfig_() {
  const sh = sheet_(SH.config), n = sh.getLastRow(), cfg = {};
  if (n < 2) return cfg;
  const byLabel = {};
  sh.getRange(2, 1, n - 1, 2).getValues().forEach(r => { byLabel[String(r[0]).trim()] = r[1]; });
  CFG.forEach(([k, label]) => {
    if (!(label in byLabel)) return;
    const v = byLabel[label];
    if (k === 'sst' || k === 'svc') cfg[k] = Number(v) || 0;
    else if (k === 'round5') cfg[k] = !(v === false || String(v).toUpperCase() === 'FALSE');
    else if (k === 'cats') cfg[k] = String(v || '').split(',').map(s => s.trim()).filter(Boolean);
    else cfg[k] = String(v === null || v === undefined ? '' : v);
  });
  return cfg;
}
function writeConfig_(patch) {
  const sh = sheet_(SH.config);
  const n = sh.getLastRow();
  const labels = n >= 2 ? sh.getRange(2, 1, n - 1, 1).getValues().map(r => String(r[0]).trim()) : [];
  CFG.forEach(([k, label]) => {
    if (!(k in patch)) return;
    let v = patch[k];
    if (k === 'cats') v = (v || []).join(', ');
    else if (k === 'round5') v = !!v;
    else if (k === 'sst' || k === 'svc') v = num_(v);
    else v = txt_(v === null || v === undefined ? '' : v);
    let i = labels.indexOf(label), r;
    if (i >= 0) r = i + 2; else { r = sh.getLastRow() + 1; sh.getRange(r, 1).setValue(label); labels.push(label); }
    const cell = sh.getRange(r, 2);
    if (k === 'round5') cell.insertCheckboxes();
    else if (k !== 'sst' && k !== 'svc') cell.setNumberFormat('@');
    cell.setValue(v);
  });
}

/* ---------- held orders ---------- */
// Tertangguh: A ID, B Pesanan, C Dikemas kini, D Data (JSON)
function readOpen_() {
  const sh = sheet_(SH.open), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 4).getValues().map(r => {
    try { const t = JSON.parse(r[3]); t.id = String(r[0]); return t; } catch (e) { return null; }
  }).filter(Boolean);
}
function saveOpen_(t, label) {
  if (!t || !t.id) throw err_('bad_ticket', 'Pesanan tidak lengkap.');
  const sh = sheet_(SH.open);
  let r = findRow_(sh, 1, String(t.id));
  if (!r) r = Math.max(sh.getLastRow(), 1) + 1;
  sh.getRange(r, 1, 1, 4).setNumberFormats([['@', '@', 'dd/mm/yyyy hh:mm', '@']]);
  sh.getRange(r, 1, 1, 4).setValues([[String(t.id), String(label || ''), new Date(Number(t.upd) || Date.now()), JSON.stringify(t)]]);
}

/* ---------- sales ---------- */
function maxNo_(date) {
  const sh = sheet_(SH.sales), n = sh.getLastRow();
  if (n < 2) return 0;
  const k = Math.min(n - 1, 1500), start = n - k + 1;
  return sh.getRange(start, 1, k, 3).getValues().reduce((m, r) => (dkey_(r[0]) === date ? Math.max(m, Number(r[2]) || 0) : m), 0);
}
function addOrder_(date, o) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !o || !o.id) throw err_('bad_order', 'Pesanan tidak lengkap.');
  const sh = sheet_(SH.sales);
  const dup = findRow_(sh, C_ID, String(o.id));
  if (dup) return orderFromRow_(sh.getRange(dup, 1, 1, SALES_COLS).getValues()[0]); // already saved (a retried request)
  o.no = maxNo_(date) + 1;
  const st = o.status === 'void' ? 'Dibatalkan' : 'Dibayar';
  const r = Math.max(sh.getLastRow(), 1) + 1;
  sh.getRange(r, 1, 1, SALES_COLS).setNumberFormats([['dd/mm/yyyy', 'hh:mm', '0', '@', '@', '@',
    '#,##0.00', '#,##0.00', '#,##0.00', '#,##0.00', '#,##0.00', '#,##0.00', '#,##0.00', '@', '@', '@', '@']]);
  sh.getRange(r, 1, 1, SALES_COLS).setValues([[date, timeOf_(o.t), o.no, typeName_(o), String(o.ref || ''), itemsLine_(o),
    num_(o.sub), num_(o.disc), num_(o.svc), num_(o.sst), num_(o.del), num_(o.rnd), num_(o.total), PAY[o.pay] || String(o.pay || ''),
    st, String(o.id), JSON.stringify(o)]]);
  const items = (o.items || []).map(it => {
    const unit = (sen_(it.p) + sen_(it.mp)) / 100;
    return [date, timeOf_(o.t), o.no, String(it.n), (it.m || []).join(', '), num_(it.q), unit, Math.round(unit * num_(it.q) * 100) / 100, st, String(o.id)];
  });
  if (items.length) {
    const ish = sheet_(SH.items), ir = Math.max(ish.getLastRow(), 1) + 1;
    const fmt = ['dd/mm/yyyy', 'hh:mm', '0', '@', '@', '0', '#,##0.00', '#,##0.00', '@', '@'];
    ish.getRange(ir, 1, items.length, ITEM_COLS).setNumberFormats(items.map(() => fmt));
    ish.getRange(ir, 1, items.length, ITEM_COLS).setValues(items);
  }
  return o;
}
function voidOrder_(id) {
  const sh = sheet_(SH.sales), r = findRow_(sh, C_ID, id);
  if (!r) throw err_('not_found', 'Pesanan tidak dijumpai dalam Google Sheet.');
  const row = sh.getRange(r, 1, 1, SALES_COLS).getValues()[0];
  const o = orderFromRow_(row);
  o.status = 'void'; o.voidAt = Date.now();
  sh.getRange(r, C_STATUS).setValue('Dibatalkan');
  sh.getRange(r, C_DATA).setValue(JSON.stringify(o));
  const ish = sheet_(SH.items);
  if (ish.getLastRow() >= 2) {
    ish.getRange(2, I_ID, ish.getLastRow() - 1, 1).createTextFinder(id).matchEntireCell(true).findAll()
      .forEach(c => ish.getRange(c.getRow(), I_STATUS).setValue('Dibatalkan'));
  }
  return o;
}
function orderFromRow_(r) {
  let o = null;
  try { o = r[C_DATA - 1] ? JSON.parse(r[C_DATA - 1]) : null; } catch (e) { o = null; }
  if (!o) {
    // A row without saved data (typed in by hand or written by an older version): rebuild what the columns hold.
    const typeLabel = String(r[3] || 'Kedai');
    const typeKey = Object.keys(TYPES).find(k => TYPES[k] === typeLabel);
    const payKey = Object.keys(PAY).find(k => PAY[k] === String(r[13])) || 'cash';
    const date = dkey_(r[0]);
    const tm = isDate_(r[1]) ? Utilities.formatDate(r[1], tz_(), 'HH:mm') : String(r[1] || '00:00');
    o = {
      id: String(r[C_ID - 1]), no: Number(r[2]) || 0, t: new Date(date + 'T' + tm + ':00').getTime(),
      type: APPS.indexOf(typeLabel) >= 0 ? 'app' : (typeKey || 'shop'), ref: String(r[4] || ''),
      items: String(r[5] || '').split(';').map(s => s.trim()).filter(Boolean).map(s => {
        const m = s.match(/^(\d+)x\s+(.*?)(?:\s+\((.*)\))?$/);
        return m ? { n: m[2], q: Number(m[1]), p: 0, m: m[3] ? m[3].split(',').map(x => x.trim()) : [], mp: 0 } : { n: s, q: 1, p: 0, m: [], mp: 0 };
      }),
      sub: num_(r[6]), disc: num_(r[7]), svc: num_(r[8]), sst: num_(r[9]), del: num_(r[10]), rnd: num_(r[11]), total: num_(r[12]),
      pay: payKey, tend: num_(r[12]), chg: 0,
    };
    if (APPS.indexOf(typeLabel) >= 0) o.app = typeLabel;
  }
  o.id = String(r[C_ID - 1] || o.id);
  o.status = String(r[C_STATUS - 1]) === 'Dibatalkan' ? 'void' : 'paid';
  return o;
}
function readOrders_(from, to) {
  const sh = sheet_(SH.sales), n = sh.getLastRow(), days = {};
  if (n < 2 || !from || !to) return days;
  const dates = sh.getRange(2, 1, n - 1, 1).getValues().map(r => dkey_(r[0]));
  let lo = -1, hi = -1;
  dates.forEach((d, i) => { if (d >= from && d <= to) { if (lo < 0) lo = i; hi = i; } });
  if (lo < 0) return days;
  sh.getRange(lo + 2, 1, hi - lo + 1, SALES_COLS).getValues().forEach((r, i) => {
    const d = dates[lo + i];
    if (d < from || d > to || !String(r[C_ID - 1])) return;
    const o = orderFromRow_(r);
    (days[d] = days[d] || { date: d, orders: {} }).orders[o.id] = o;
  });
  return days;
}
