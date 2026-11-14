import { COSTS, totalPrice } from './recommend.js';
import { STATUSES, STATUS_LABEL, COLORS, listRequests, getRequest, addRequest, updateRequest, removeRequest,
  sendAdminMessage, answerOffer, stats } from './store.js';
import { renderMessages, esc, eur, date } from './chat.js';

const dash = document.getElementById('dash');
const threadEl = document.getElementById('thread');
const listEl = document.getElementById('reqList');
const filterEl = document.getElementById('statusFilter');
const emptyEl = document.getElementById('emptyState');
let filter = '';
let currentId = null;
let mode = 'text';   // a válaszmező módja: 'text' | 'offer'

const LABELS = {
  utasok: { '1-2': '1–2 fő', '3-5': '3–5 fő', '6-7': '6–7 fő' },
  ut: { varos: 'főleg város', vegyes: 'vegyesen', hosszu: 'sok hosszú út' },
  kategoria: { praktikus: 'praktikus', premium: 'prémium', luxus: 'luxus', mindegy: 'mindegy' },
  karakter: { sportos: 'sportos', kenyelmes: 'kényelmes', technika: 'modern technika', biztonsag: 'biztonság' },
};

// Előre megírt üzenetek – a szöveg küldés előtt szerkeszthető
const QUICK = [
  ['Megkaptuk, keressük', r => `Kedves ${r.kapcsolat.nev}! Köszönjük az ajánlatkérést. Megkezdtük a(z) ${r.modell} keresését Nyugat-Európában; amint találunk megfelelő, ellenőrzött előéletű autót, itt jelentkezünk az ajánlattal.`],
  ['Új színben keressük', r => `Kedves ${r.kapcsolat.nev}! Rendben, a kért színben keresünk tovább, és amint van találat, új ajánlatot küldünk.`],
  ['Nem találtunk megfelelőt', r => `Kedves ${r.kapcsolat.nev}! A megadott keretből most sajnos nem találtunk olyan ${r.modell} autót, amelyet jó szívvel ajánlanánk. Ha nagyobb keret vagy egy hasonló modell is szóba jöhet, indíts új ajánlatkérést, és folytatjuk a keresést.`],
];

// ── Dashboard ──
function renderDash() {
  const all = listRequests();
  const s = stats(all);
  document.getElementById('stats').innerHTML = [
    ['Beérkezett kérés', s.beerkezett, s.uj ? `${s.uj} új, válaszra vár` : 'nincs megválaszolatlan'],
    ['Kiküldött ajánlat', s.kikuldott, s.varakozik ? `${s.varakozik} a vevő válaszára vár` : 'mindre jött válasz'],
    ['Elfogadva', s.elfogadva, s.kikuldott ? `a kiküldöttek ${Math.round(s.elfogadva / s.kikuldott * 100)}%-a` : 'még nincs kiküldött ajánlat'],
    ['Elutasítva', s.elutasitva, s.kikuldott ? `a kiküldöttek ${Math.round(s.elutasitva / s.kikuldott * 100)}%-a` : 'még nincs kiküldött ajánlat'],
  ].map(([label, n, sub]) => `<div><dt>${label}</dt><dd>${n}</dd><p>${sub}</p></div>`).join('');

  const count = st => all.filter(r => !st || r.status === st).length;
  filterEl.innerHTML = [['', 'Mind'], ...STATUSES].map(([id, label]) =>
    `<button type="button" class="chip" data-status="${id}" aria-pressed="${filter === id}">${label} <span>${count(id)}</span></button>`).join('');

  const shown = all.filter(r => !filter || r.status === filter);
  emptyEl.hidden = all.length > 0;
  filterEl.hidden = all.length === 0;
  listEl.innerHTML = shown.map(r => `
    <li class="row">
      <div class="who"><b>${esc(r.kapcsolat.nev)}</b><a href="mailto:${esc(r.kapcsolat.email)}">${esc(r.kapcsolat.email)}</a></div>
      <div class="what"><span>${esc(r.modell)}</span><small>${r.id} · ${date(r.createdAt)}</small></div>
      <span class="badge" data-s="${r.status}">${STATUS_LABEL[r.status]}</span>
      <button type="button" data-open="${r.id}"${r.status === 'uj' ? '' : ' class="quiet"'}>Visszajelzés</button>
    </li>`).join('') || (all.length ? '<li class="hint">Ebben az állapotban nincs kérés.</li>' : '');
}

// ── Visszajelzés: üzenetváltás ──
function renderThread() {
  const r = getRequest(currentId);
  if (!r) { currentId = null; return render(); }
  const v = r.valaszok || {};
  const facts = [
    ['Keret', v.budget ? eur(v.budget) : '–'],
    ['Becsült végösszeg', r.vegar ? eur(r.vegar) : '–'],
    ['Utasok', LABELS.utasok[v.utasok] || 'nem adta meg'],
    ['Használat', LABELS.ut[v.ut] || 'nem adta meg'],
    ['Kategória', LABELS.kategoria[v.kategoria] || 'nem adta meg'],
    ...(v.karakter ? [['Karakter', LABELS.karakter[v.karakter]]] : []),
    ['Kedvenc márka', v.marka || 'nincs'],
    ['Kezdő sofőr', v.kezdo ? 'igen – gyengébb motor kell' : 'nem'],
  ];
  const draft = threadEl.querySelector('#composer');
  const keep = draft ? Object.fromEntries(new FormData(draft)) : {};
  const closed = r.status === 'elutasitva' || r.status === 'atadva';
  threadEl.innerHTML = `
    <div><button type="button" class="quiet" data-act="back">Vissza a listához</button></div>
    <div class="d-head">
      <h1>${esc(r.kapcsolat.nev)}</h1>
      <p>${esc(r.modell)} · ${r.id} · <span class="badge" data-s="${r.status}">${STATUS_LABEL[r.status]}</span></p>
    </div>

    <div class="thread-grid">
      <section class="chat" aria-label="Üzenetek">
        <ol class="msgs" id="msgs">${renderMessages(r, 'admin')}</ol>
        <form class="composer" id="composer" novalidate>
          <div class="filters" role="group" aria-label="Mit küldesz?">
            <button type="button" class="chip" data-mode="text" aria-pressed="${mode === 'text'}">Üzenet</button>
            <button type="button" class="chip" data-mode="offer" aria-pressed="${mode === 'offer'}">Ajánlat a talált autóról</button>
          </div>
          ${mode === 'text' ? `
            <div class="quick" role="group" aria-label="Előre megírt üzenetek">
              ${QUICK.map(([name], i) => `<button type="button" class="chip" data-quick="${i}">${name}</button>`).join('')}
            </div>
            <label>Üzenet <textarea name="text" rows="4" required>${esc(keep.text)}</textarea></label>
            <p class="error" id="formError" role="alert" hidden>Írj üzenetet, vagy válassz egy előre megírtat.</p>
            <div class="actions"><button type="submit">Üzenet küldése</button></div>` : `
            <div class="fields">
              <label>A talált autó ára (€) <input name="ar" type="number" min="0" step="100" inputmode="numeric" required value="${esc(keep.ar)}"></label>
              <label>Színe <select name="szin"><option value="">nincs megadva</option>${COLORS.map(([id, nev]) => `<option value="${id}"${keep.szin === id ? ' selected' : ''}>${nev}</option>`).join('')}</select></label>
            </div>
            <p class="hint" id="priceSum"></p>
            <label>Mit találtunk <span class="hint">évjárat, futott km, motor, felszereltség, az előélet-ellenőrzés eredménye</span>
              <textarea name="leiras" rows="4" required>${esc(keep.leiras)}</textarea></label>
            <p class="error" id="formError" role="alert" hidden>Add meg az autó árát és a leírását.</p>
            <div class="actions"><button type="submit">Ajánlat küldése</button></div>`}
        </form>
      </section>

      <aside class="side">
        <div class="panel">
          <h2>Állapot</h2>
          <div class="filters" role="group" aria-label="Állapot módosítása">
            ${STATUSES.map(([id, label]) => `<button type="button" class="chip" data-set="${id}" aria-pressed="${r.status === id}">${label}</button>`).join('')}
          </div>
        </div>
        <div class="panel">
          <h2>Kapcsolat</h2>
          <dl class="kv">
            <div><dt>E-mail</dt><dd><a href="mailto:${esc(r.kapcsolat.email)}">${esc(r.kapcsolat.email)}</a></dd></div>
            <div><dt>Telefon</dt><dd>${r.kapcsolat.telefon ? `<a href="tel:${esc(r.kapcsolat.telefon)}">${esc(r.kapcsolat.telefon)}</a>` : 'nem adta meg'}</dd></div>
          </dl>
          <div><button type="button" class="quiet" data-act="notify">Értesítés e-mailben</button></div>
          <p class="hint">A vevő az Ajánlatom oldalon látja az üzeneteket. Az értesítő levelet a saját leveleződ küldi.</p>
        </div>
        <div class="panel">
          <h2>Mit keres</h2>
          <dl class="kv">${facts.map(([k, val]) => `<div><dt>${k}</dt><dd>${esc(val)}</dd></div>`).join('')}</dl>
        </div>
        <div class="panel">
          <h2><label for="note">Belső jegyzet</label></h2>
          <textarea id="note" rows="4" aria-describedby="noteHint">${esc(r.note)}</textarea>
          <p class="hint" id="noteHint">Csak te látod, automatikusan mentődik.</p>
        </div>
        <div class="panel">
          <h2>Előzmények</h2>
          <ol class="history">${[...r.history].reverse().map(h => `<li><b>${esc(h.text)}</b><small>${date(h.at)}</small></li>`).join('')}</ol>
        </div>
        <div><button type="button" class="quiet danger" data-act="delete">Kérés törlése</button></div>
      </aside>
    </div>`;
  if (closed) threadEl.querySelector('.composer').insertAdjacentHTML('afterbegin', `<p class="hint">Ez a kérés le van zárva (${STATUS_LABEL[r.status].toLowerCase()}), de üzenetet még küldhetsz.</p>`);
  updateSum();
  document.getElementById('msgs').lastElementChild?.scrollIntoView({ block: 'nearest' });
}

function updateSum() {
  const form = document.getElementById('composer');
  const sum = document.getElementById('priceSum');
  if (!form || !sum) return;
  const r = getRequest(currentId);
  const ar = Number(form.ar.value);
  const budget = r.valaszok?.budget;
  const over = budget && ar && totalPrice(ar) > budget;
  sum.textContent = ar
    ? `Végösszeg: ${eur(totalPrice(ar))}` + (over ? ` – ez több, mint a vevő ${eur(budget)} kerete.` : budget ? ` – belefér a ${eur(budget)} keretbe.` : '')
    : `A végösszeget kiszámoljuk: ár + ${eur(COSTS.szallitas)} szállítás + ${eur(COSTS.ugyintezes)} ügyintézés + ${COSTS.dijSzazalek * 100}% díj.`;
  sum.classList.toggle('error', !!over);
}

function render() {
  dash.hidden = !!currentId;
  threadEl.hidden = !currentId;
  if (currentId) renderThread(); else { threadEl.innerHTML = ''; renderDash(); }
}

// ── Események ──
filterEl.addEventListener('click', e => {
  const b = e.target.closest('[data-status]');
  if (!b) return;
  filter = b.dataset.status;
  renderDash();
});

listEl.addEventListener('click', e => {
  const b = e.target.closest('[data-open]');
  if (!b) return;
  currentId = b.dataset.open;
  mode = 'text';
  render();
  window.scrollTo({ top: 0 });
});

threadEl.addEventListener('click', e => {
  const r = getRequest(currentId);
  if (!r) return;
  const d = e.target.closest('button')?.dataset || {};
  if (d.mode) { mode = d.mode; renderThread(); }
  else if (d.quick) { const t = threadEl.querySelector('[name=text]'); t.value = QUICK[d.quick][1](r); t.focus(); }
  else if (d.set && d.set !== r.status) { updateRequest(r.id, { status: d.set }, `Állapot: ${STATUS_LABEL[d.set]}`); renderThread(); }
  else if (d.act === 'back') { currentId = null; render(); }
  else if (d.act === 'notify') {
    const link = new URL(`ajanlat.html?id=${r.id}`, location.href).href;
    const body = `Kedves ${r.kapcsolat.nev}!\n\nÚj üzeneted érkezett a(z) ${r.modell} ajánlatkérésedhez.\n\nMegnyitás: ${link}\nAzonosító: ${r.id}\n\nÜdvözlettel:\nCarSearch`;
    updateRequest(r.id, {}, 'E-mail-értesítő megnyitva a levelezőben');
    renderThread();
    window.location.href = `mailto:${encodeURIComponent(r.kapcsolat.email)}?subject=${encodeURIComponent(`CarSearch – új üzenet (${r.id})`)}&body=${encodeURIComponent(body)}`;
  } else if (d.act === 'delete') {
    if (!confirm(`Biztosan törlöd ${r.kapcsolat.nev} kérését (${r.id})? Ez nem vonható vissza.`)) return;
    removeRequest(r.id);
    currentId = null;
    render();
  }
});

threadEl.addEventListener('input', e => {
  if (e.target.id === 'note') updateRequest(currentId, { note: e.target.value });
  else if (e.target.name === 'ar') updateSum();
});

threadEl.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  const err = document.getElementById('formError');
  if (mode === 'text') {
    const text = f.text.value.trim();
    err.hidden = !!text;
    if (!text) return f.text.focus();
    sendAdminMessage(currentId, { type: 'text', text });
  } else {
    const ar = Number(f.ar.value), leiras = f.leiras.value.trim();
    err.hidden = ar > 0 && !!leiras;
    if (!(ar > 0)) return f.ar.focus();
    if (!leiras) return f.leiras.focus();
    sendAdminMessage(currentId, { type: 'offer', ar, vegar: totalPrice(ar), szin: f.szin.value, leiras });
    mode = 'text';
  }
  f.reset();
  renderThread();
});

// Mintaadatok: öt kérés különböző állapotban, hogy a felület kipróbálható legyen
document.getElementById('seed').addEventListener('click', () => {
  const mk = (nev, modelId, modell, ar, valaszok, extra = {}) => addRequest({
    modelId, modell, vegar: totalPrice(ar), valaszok: { marka: null, karakter: null, kezdo: false, ...valaszok },
    kapcsolat: { nev, email: nev.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(' ', '.') + '@example.com', telefon: '', megjegyzes: '', szinek: [], ...extra },
  });
  const offer = (id, ar, szin, leiras) => sendAdminMessage(id, { type: 'offer', ar, vegar: totalPrice(ar), szin, leiras });
  const a = mk('Minta Anna', 'dacia-sandero-2', 'Dacia Sandero II', 5500, { budget: 7500, utasok: '1-2', ut: 'varos', kategoria: 'praktikus', kezdo: true }, { megjegyzes: 'Kézi váltó, 100 000 km alatt.', szinek: ['feher', 'ezust'] });
  const b = mk('Példa Bence', 'skoda-octavia-3-combi', 'Škoda Octavia Combi III', 11000, { budget: 13500, utasok: '3-5', ut: 'hosszu', kategoria: 'praktikus' });
  sendAdminMessage(b.id, { type: 'text', text: QUICK[0][1](b) });
  const c = mk('Teszt Csilla', 'vw-golf-7', 'Volkswagen Golf VII', 12000, { budget: 14000, utasok: '1-2', ut: 'vegyes', kategoria: 'praktikus' }, { szinek: ['kek'] });
  offer(c.id, 11400, 'szurke', '2017, 1.4 TSI, 86 000 km, kézi váltó, tolatókamera. Előélet ellenőrizve: egy tulajdonos, sérülésmentes.');
  const d = mk('Próba Dániel', 'bmw-3-f30', 'BMW 3-as F30', 15000, { budget: 18000, utasok: '3-5', ut: 'hosszu', kategoria: 'premium', karakter: 'sportos' });
  offer(d.id, 14800, 'fekete', '2016, 320d, 132 000 km, automata, bőr belső. Előélet ellenőrizve: vezetett szervizkönyv.');
  answerOffer(d.id, 'accept');
  const f = mk('Minta Edit', 'fiat-panda-3', 'Fiat Panda III', 5000, { budget: 6500, utasok: '1-2', ut: 'varos', kategoria: 'praktikus' });
  offer(f.id, 5300, 'piros', '2015, 1.2 benzin, 74 000 km, klíma. Előélet ellenőrizve.');
  answerOffer(f.id, 'reject');
  void a;
  render();
});

// Ha másik lapon új kérés vagy válasz érkezik, a nézet frissül
window.addEventListener('storage', render);

render();
