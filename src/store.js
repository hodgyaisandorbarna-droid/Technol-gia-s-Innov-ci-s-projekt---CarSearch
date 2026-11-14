// Ajánlatkérések és üzenetváltás tárolása. PROTOTÍPUS: a böngésző helyi tárolójába ír, ezért
// a kérések csak ugyanabban a böngészőben látszanak. Éles működéshez az exportált függvényeket
// kell egy valódi háttérrendszer (pl. Supabase vagy saját API) hívásaira cserélni.

const KEY = 'carsearch.requests';
let memory = [];

function read() {
  let list;
  try { list = JSON.parse(localStorage.getItem(KEY)) || []; } catch { list = memory; }
  for (const r of list) {
    r.messages ||= [];
    if (r.status === 'lezarva') r.status = 'elutasitva';
  }
  return list;
}
function write(list) {
  memory = list;
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* privát ablak: marad a memóriában */ }
}

export const STATUSES = [
  ['uj', 'Új'],
  ['kereses', 'Keresés'],
  ['ajanlat', 'Ajánlat kiküldve'],
  ['elfogadva', 'Elfogadva'],
  ['szallitas', 'Szállítás'],
  ['atadva', 'Átadva'],
  ['elutasitva', 'Elutasítva'],
];
export const STATUS_LABEL = Object.fromEntries(STATUSES);

// Választható színek az ajánlatkérésnél és a színváltás-kérésnél
export const COLORS = [
  ['feher', 'Fehér', '#f4f4f1'], ['ezust', 'Ezüst', '#c2c6ca'], ['szurke', 'Szürke', '#73797e'], ['fekete', 'Fekete', '#17191b'],
  ['kek', 'Kék', '#1f4f9c'], ['piros', 'Piros', '#b3261e'], ['zold', 'Zöld', '#2f6b3f'], ['barna', 'Barna', '#6b4a34'],
];
export const COLOR_NAME = Object.fromEntries(COLORS.map(([id, nev]) => [id, nev.toLowerCase()]));

const now = () => new Date().toISOString();

export function listRequests() {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getRequest(id) {
  return read().find(r => r.id === id) || null;
}

// A vevő „belépése”: azonosító + e-mail egyezése
export function findRequest(id, email) {
  const norm = s => String(s || '').trim().toLowerCase();
  return read().find(r => norm(r.id) === norm(id) && norm(r.kapcsolat.email) === norm(email)) || null;
}

export function addRequest(data) {
  const list = read();
  const req = {
    id: 'K-' + String(list.reduce((max, r) => Math.max(max, Number(r.id.slice(2)) || 0), 1000) + 1),
    createdAt: now(), status: 'uj', note: '', messages: [],
    history: [{ at: now(), text: 'Ajánlatkérés beérkezett' }],
    ...data,
  };
  write([...list, req]);
  return req;
}

// patch: módosítandó mezők; event: opcionális bejegyzés az előzményekbe
export function updateRequest(id, patch, event) {
  const list = read();
  const req = list.find(r => r.id === id);
  if (!req) return null;
  Object.assign(req, patch);
  if (event) req.history.push({ at: now(), text: event });
  write(list);
  return req;
}

// Az admin üzenete: { type: 'text', text } vagy { type: 'offer', ar, vegar, szin, leiras }
export function sendAdminMessage(id, msg) {
  const list = read();
  const req = list.find(r => r.id === id);
  if (!req) return null;
  req.messages.push({ from: 'admin', at: now(), ...msg });
  if (msg.type === 'offer') {
    req.status = 'ajanlat';
    req.history.push({ at: now(), text: `Ajánlat kiküldve (${msg.vegar.toLocaleString('hu-HU', { useGrouping: 'always' })} €)` });
  } else if (req.status === 'uj') {
    req.status = 'kereses';
    req.history.push({ at: now(), text: 'Állapot: Keresés' });
  }
  write(list);
  return req;
}

// A vevő csak a legutóbbi, még megválaszolatlan ajánlatra felelhet, előre megírt válasszal:
// kind: 'accept' | 'reject' | 'color' (ekkor colors: színazonosítók)
export function answerOffer(id, kind, colors = []) {
  const list = read();
  const req = list.find(r => r.id === id);
  const offer = req && [...req.messages].reverse().find(m => m.type === 'offer');
  if (!offer || offer.valasz) return null;
  offer.valasz = kind;
  req.messages.push({ from: 'ugyfel', at: now(), type: kind, ...(kind === 'color' ? { colors } : {}) });
  const [status, text] = {
    accept: ['elfogadva', 'A vevő elfogadta az ajánlatot'],
    reject: ['elutasitva', 'A vevő elutasította az ajánlatot'],
    color: ['kereses', `A vevő más színt kért: ${colors.map(c => COLOR_NAME[c]).join(', ')}`],
  }[kind];
  req.status = status;
  req.history.push({ at: now(), text });
  write(list);
  return req;
}

export function removeRequest(id) {
  write(read().filter(r => r.id !== id));
}

// Számlálók a dashboardhoz
export function stats(list = read()) {
  const offered = list.filter(r => r.messages.some(m => m.type === 'offer'));
  const answered = kind => list.filter(r => r.messages.some(m => m.from === 'ugyfel' && m.type === kind)).length;
  return {
    beerkezett: list.length,
    uj: list.filter(r => r.status === 'uj').length,
    kikuldott: offered.length,
    varakozik: list.filter(r => r.status === 'ajanlat').length,
    elfogadva: answered('accept'),
    elutasitva: answered('reject'),
  };
}
