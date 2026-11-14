// Ajánlatkérések tárolása. PROTOTÍPUS: a böngésző helyi tárolójába ír, ezért a kérések csak
// ugyanabban a böngészőben látszanak. Éles működéshez ezt a négy függvényt kell egy valódi
// háttérrendszer (pl. Supabase vagy saját API) hívásaira cserélni – a felület többi része marad.

const KEY = 'carsearch.requests';
let memory = [];

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return memory; }
}
function write(list) {
  memory = list;
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* privát ablak: marad a memóriában */ }
}

// A terv szerinti állapotok: új → keresés → ajánlat → szállítás → átadva (+ lezárva)
export const STATUSES = [
  ['uj', 'Új'],
  ['kereses', 'Keresés'],
  ['ajanlat', 'Ajánlat elküldve'],
  ['szallitas', 'Szállítás'],
  ['atadva', 'Átadva'],
  ['lezarva', 'Lezárva'],
];
export const STATUS_LABEL = Object.fromEntries(STATUSES);

const now = () => new Date().toISOString();

export function listRequests() {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addRequest(data) {
  const list = read();
  const req = {
    id: 'K-' + String(list.reduce((max, r) => Math.max(max, Number(r.id.slice(2)) || 0), 1000) + 1),
    createdAt: now(), status: 'uj', note: '',
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

export function removeRequest(id) {
  write(read().filter(r => r.id !== id));
}
