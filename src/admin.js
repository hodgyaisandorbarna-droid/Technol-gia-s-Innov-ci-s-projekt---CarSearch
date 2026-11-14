import { COSTS, totalPrice } from './recommend.js';
import { STATUSES, STATUS_LABEL, listRequests, addRequest, updateRequest, removeRequest } from './store.js';

const listEl = document.getElementById('reqList');
const detailEl = document.getElementById('detail');
const filterEl = document.getElementById('statusFilter');
const emptyEl = document.getElementById('emptyState');
const wrap = document.getElementById('adm');
let filter = '';
let currentId = null;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => Number(n).toLocaleString('hu-HU', { useGrouping: 'always' }) + ' €';
const date = iso => new Date(iso).toLocaleString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const LABELS = {
  utasok: { '1-2': '1–2 fő', '3-5': '3–5 fő', '6-7': '6–7 fő' },
  ut: { varos: 'főleg város', vegyes: 'vegyesen', hosszu: 'sok hosszú út' },
  kategoria: { praktikus: 'praktikus', premium: 'prémium', luxus: 'luxus', mindegy: 'mindegy' },
  karakter: { sportos: 'sportos', kenyelmes: 'kényelmes', technika: 'modern technika', biztonsag: 'biztonság' },
};

// ── Válaszsablonok ──
const TEMPLATES = {
  megkaptuk: {
    name: 'Megkaptuk, keressük',
    subject: r => `CarSearch – megkaptuk az ajánlatkérésed (${r.id})`,
    body: r => `Kedves ${r.kapcsolat.nev}!

Köszönjük az ajánlatkérést. Megkezdtük a(z) ${r.modell} keresését Nyugat-Európában. Amint találunk megfelelő, ellenőrzött előéletű autót, konkrét ajánlattal jelentkezünk.

Üdvözlettel:
CarSearch`,
    status: 'kereses',
  },
  ajanlat: {
    name: 'Konkrét ajánlat',
    needsPrice: true,
    subject: r => `CarSearch – ajánlat: ${r.modell} (${r.id})`,
    body: (r, ar) => `Kedves ${r.kapcsolat.nev}!

Megtaláltuk az autót: ${r.modell}.

Az autó ára: ${eur(ar)}
Szállítás külföldről: ${eur(COSTS.szallitas)}
Ügyintézés, honosítás: ${eur(COSTS.ugyintezes)}
A mi díjunk (${COSTS.dijSzazalek * 100}%): ${eur(totalPrice(ar) - ar - COSTS.szallitas - COSTS.ugyintezes)}
Végösszeg: ${eur(totalPrice(ar))}

[Ide írd az autó adatait: évjárat, futott km, motor, felszereltség, az előélet-ellenőrzés eredménye.]

Ez az ajánlat még nem kötelez semmire. Ha érdekel, válaszolj erre a levélre, és egyeztetjük a következő lépéseket.

Üdvözlettel:
CarSearch`,
    status: 'ajanlat',
  },
  nincs: {
    name: 'Nem találtunk megfelelőt',
    subject: r => `CarSearch – az ajánlatkérésedről (${r.id})`,
    body: r => `Kedves ${r.kapcsolat.nev}!

A megadott keretből sajnos most nem találtunk olyan ${r.modell} autót, amelyet jó szívvel ajánlanánk. Ha nagyobb keret vagy egy hasonló modell is szóba jöhet, válaszolj erre a levélre, és folytatjuk a keresést.

Üdvözlettel:
CarSearch`,
    status: 'lezarva',
  },
};

function renderFilter(all) {
  const count = s => all.filter(r => !s || r.status === s).length;
  filterEl.innerHTML = [['', 'Mind'], ...STATUSES].map(([id, label]) =>
    `<button type="button" class="chip" data-status="${id}" aria-pressed="${filter === id}">${label} <span>${count(id)}</span></button>`).join('');
}

function renderList() {
  const all = listRequests();
  renderFilter(all);
  const shown = all.filter(r => !filter || r.status === filter);
  emptyEl.hidden = all.length > 0;
  listEl.innerHTML = shown.map(r => `
    <li><button type="button" class="req" data-id="${r.id}" aria-current="${r.id === currentId}">
      <span class="req-top"><b>${esc(r.kapcsolat.nev)}</b><span class="badge" data-s="${r.status}">${STATUS_LABEL[r.status]}</span></span>
      <span>${esc(r.modell)}</span>
      <small>${r.id} · ${date(r.createdAt)}</small>
    </button></li>`).join('') || (all.length ? '<li class="hint">Ebben az állapotban nincs kérés.</li>' : '');
  if (!shown.some(r => r.id === currentId)) currentId = null;
  renderDetail();
}

function renderDetail() {
  const r = listRequests().find(x => x.id === currentId);
  wrap.classList.toggle('has-detail', !!r);
  if (!r) {
    detailEl.innerHTML = listRequests().length ? '<p class="hint pick">Válassz egy kérést a listából.</p>' : '';
    return;
  }
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
  detailEl.innerHTML = `
    <button type="button" class="quiet back" data-act="back">Vissza a listához</button>
    <div class="d-head">
      <h2>${esc(r.kapcsolat.nev)}</h2>
      <p>${esc(r.modell)} · ${r.id} · ${date(r.createdAt)}</p>
    </div>

    <div class="panel">
      <h3>Állapot</h3>
      <div class="filters" role="group" aria-label="Állapot módosítása">
        ${STATUSES.map(([id, label]) => `<button type="button" class="chip" data-set="${id}" aria-pressed="${r.status === id}">${label}</button>`).join('')}
      </div>
    </div>

    <div class="cols2">
      <div class="panel">
        <h3>Kapcsolat</h3>
        <dl class="kv">
          <div><dt>E-mail</dt><dd><a href="mailto:${esc(r.kapcsolat.email)}">${esc(r.kapcsolat.email)}</a></dd></div>
          <div><dt>Telefon</dt><dd>${r.kapcsolat.telefon ? `<a href="tel:${esc(r.kapcsolat.telefon)}">${esc(r.kapcsolat.telefon)}</a>` : 'nem adta meg'}</dd></div>
          <div><dt>Megjegyzés</dt><dd>${esc(r.kapcsolat.megjegyzes) || 'nincs'}</dd></div>
        </dl>
      </div>
      <div class="panel">
        <h3>Mit keres</h3>
        <dl class="kv">${facts.map(([k, val]) => `<div><dt>${k}</dt><dd>${esc(val)}</dd></div>`).join('')}</dl>
      </div>
    </div>

    <form class="panel reply" id="reply">
      <h3>Visszajelzés az ügyfélnek</h3>
      <div class="row">
        <label>Sablon
          <select name="tpl">${Object.entries(TEMPLATES).map(([id, t]) => `<option value="${id}">${t.name}</option>`).join('')}</select>
        </label>
        <label id="priceField" hidden>A konkrét autó ára (€)
          <input name="ar" type="number" min="0" step="100" inputmode="numeric" value="${r.ajanlatAr || ''}">
        </label>
      </div>
      <p class="hint" id="priceSum" hidden></p>
      <label>Üzenet <textarea name="uzenet" rows="12"></textarea></label>
      <div class="actions">
        <span class="hint" id="copied" role="status"></span>
        <button type="button" class="quiet" data-act="copy">Szöveg másolása</button>
        <button type="submit">Megnyitás levelezőben</button>
      </div>
    </form>

    <div class="cols2">
      <div class="panel">
        <h3><label for="note">Belső jegyzet</label></h3>
        <textarea id="note" rows="5" aria-describedby="noteHint">${esc(r.note)}</textarea>
        <p class="hint" id="noteHint">Csak te látod, automatikusan mentődik.</p>
      </div>
      <div class="panel">
        <h3>Előzmények</h3>
        <ol class="history">${[...r.history].reverse().map(h => `<li><b>${esc(h.text)}</b><small>${date(h.at)}</small></li>`).join('')}</ol>
      </div>
    </div>

    <div><button type="button" class="quiet danger" data-act="delete">Kérés törlése</button></div>`;
  fillReply(r, true);
}

function fillReply(r, init) {
  const form = document.getElementById('reply');
  if (init && r.status === 'kereses') form.tpl.value = 'ajanlat';
  const t = TEMPLATES[form.tpl.value];
  const ar = Number(form.ar.value);
  document.getElementById('priceField').hidden = !t.needsPrice;
  const sum = document.getElementById('priceSum');
  sum.hidden = !t.needsPrice;
  if (t.needsPrice) {
    const over = r.valaszok?.budget && ar && totalPrice(ar) > r.valaszok.budget;
    sum.textContent = ar
      ? `Végösszeg: ${eur(totalPrice(ar))}${over ? ` – ez több, mint az ügyfél ${eur(r.valaszok.budget)} kerete.` : r.valaszok?.budget ? ` – belefér a ${eur(r.valaszok.budget)} keretbe.` : ''}`
      : 'Add meg az autó árát, a végösszeget kiszámoljuk.';
    sum.classList.toggle('error', !!over);
  }
  form.uzenet.value = t.body(r, ar || 0);
}

function logReply(r, how) {
  const form = document.getElementById('reply');
  const t = TEMPLATES[form.tpl.value];
  const patch = { status: t.status };
  if (t.needsPrice) patch.ajanlatAr = Number(form.ar.value);
  updateRequest(r.id, patch, `Visszajelzés: ${t.name.toLowerCase()} (${how})` + (t.needsPrice ? `, végösszeg ${eur(totalPrice(patch.ajanlatAr))}` : ''));
}

// ── Események ──
filterEl.addEventListener('click', e => {
  const b = e.target.closest('[data-status]');
  if (!b) return;
  filter = b.dataset.status;
  renderList();
});

listEl.addEventListener('click', e => {
  const b = e.target.closest('[data-id]');
  if (!b) return;
  currentId = b.dataset.id;
  renderList();
  detailEl.querySelector('h2')?.scrollIntoView({ block: 'nearest' });
});

detailEl.addEventListener('click', async e => {
  const r = listRequests().find(x => x.id === currentId);
  if (!r) return;
  const set = e.target.closest('[data-set]')?.dataset.set;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (set && set !== r.status) {
    updateRequest(r.id, { status: set }, `Állapot: ${STATUS_LABEL[set]}`);
    renderList();
  } else if (act === 'back') {
    currentId = null;
    renderList();
  } else if (act === 'delete') {
    if (!confirm(`Biztosan törlöd ${r.kapcsolat.nev} kérését (${r.id})? Ez nem vonható vissza.`)) return;
    removeRequest(r.id);
    currentId = null;
    renderList();
  } else if (act === 'copy') {
    const form = document.getElementById('reply');
    if (!validReply(form)) return;
    try { await navigator.clipboard.writeText(form.uzenet.value); } catch { form.uzenet.select(); document.execCommand('copy'); }
    logReply(r, 'szöveg kimásolva');
    renderList();
    document.getElementById('copied').textContent = 'Kimásolva.';
  }
});

function validReply(form) {
  const t = TEMPLATES[form.tpl.value];
  if (t.needsPrice && !(Number(form.ar.value) > 0)) {
    form.ar.focus();
    document.getElementById('priceSum').textContent = 'Előbb add meg az autó árát.';
    document.getElementById('priceSum').classList.add('error');
    return false;
  }
  return true;
}

detailEl.addEventListener('input', e => {
  const r = listRequests().find(x => x.id === currentId);
  if (!r) return;
  if (e.target.id === 'note') updateRequest(r.id, { note: e.target.value });
  else if (e.target.name === 'tpl' || e.target.name === 'ar') fillReply(r);
});

detailEl.addEventListener('submit', e => {
  e.preventDefault();
  const r = listRequests().find(x => x.id === currentId);
  const form = e.target;
  if (!r || !validReply(form)) return;
  const t = TEMPLATES[form.tpl.value];
  const href = `mailto:${encodeURIComponent(r.kapcsolat.email)}?subject=${encodeURIComponent(t.subject(r))}&body=${encodeURIComponent(form.uzenet.value)}`;
  logReply(r, 'levelezőben megnyitva');
  renderList();
  window.location.href = href;
});

document.getElementById('seed').addEventListener('click', () => {
  const req = addRequest({
    modelId: 'dacia-sandero-2', modell: 'Dacia Sandero II', vegar: 6920,
    valaszok: { budget: 7500, marka: null, utasok: '1-2', ut: 'varos', kategoria: 'praktikus', karakter: null, kezdo: true },
    kapcsolat: { nev: 'Minta Anna', email: 'minta.anna@example.com', telefon: '', megjegyzes: 'Lehetőleg világos szín, kézi váltó, 100 000 km alatt.' },
  });
  currentId = req.id;
  renderList();
});

// Ha másik lapon új kérés érkezik, a lista frissül
window.addEventListener('storage', renderList);

renderList();
