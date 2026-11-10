import { CATALOG } from './catalog.js';
import { recommend, KARAKTER_LABEL } from './recommend.js';

const form = document.getElementById('wizard');
const resultsEl = document.getElementById('results');
const dialog = document.getElementById('request');
const requestForm = document.getElementById('requestForm');
let lastAnswers = null;
let selected = null;

const eur = n => n.toLocaleString('hu-HU') + ' €';
const KAT_LABEL = { praktikus: 'Praktikus', premium: 'Prémium', luxus: 'Luxus' };

// Márkalista a katalógusból
const markaSelect = document.getElementById('marka');
[...new Set(CATALOG.map(m => m.marka))].sort().forEach(marka => {
  markaSelect.append(new Option(marka, marka));
});

// A karakter-kérdés csak prémium/luxus esetén jelenik meg
form.addEventListener('change', () => {
  const kat = form.kategoria.value;
  const box = document.getElementById('karakterBox');
  box.hidden = !(kat === 'premium' || kat === 'luxus');
  if (box.hidden) box.querySelectorAll('input').forEach(i => (i.checked = false));
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  lastAnswers = {
    budget: Number(fd.get('budget')),
    marka: fd.get('marka') || null,
    utasok: fd.get('utasok'),
    ut: fd.get('ut'),
    kategoria: fd.get('kategoria'),
    karakter: fd.get('karakter'),
    kezdo: fd.get('kezdo') === 'on',
  };
  render(recommend(CATALOG, lastAnswers));
  resultsEl.scrollIntoView({ behavior: 'smooth' });
});

// Karosszéria-sziluett, amíg nincs szabad licencű fotó
const SILHOUETTE = {
  ferdehatu: 'M10 52 L22 34 L58 28 L82 30 L104 42 L110 52 Z',
  kombi: 'M8 52 L18 34 L44 26 L100 26 L108 40 L112 52 Z',
  szedan: 'M6 52 L16 40 L36 38 L50 26 L82 26 L96 38 L114 42 L114 52 Z',
  suv: 'M8 52 L10 34 L30 22 L94 22 L106 34 L112 38 L112 52 Z',
  egyteru: 'M8 52 L10 34 L34 18 L96 18 L108 36 L112 52 Z',
};
function picture(m) {
  if (m.kep) return `<img src="public/img/${m.kep}" alt="${m.marka} ${m.modell}" loading="lazy" width="800" height="450">`;
  const d = SILHOUETTE[m.karosszeria] || SILHOUETTE.ferdehatu;
  return `<svg viewBox="0 0 120 64" role="img" aria-label="${m.karosszeria}"><path d="${d}" fill="currentColor"/>` +
    `<circle cx="32" cy="52" r="8" fill="currentColor" stroke="var(--card)" stroke-width="3"/>` +
    `<circle cx="92" cy="52" r="8" fill="currentColor" stroke="var(--card)" stroke-width="3"/></svg>`;
}

function render({ results, pMax, notice }) {
  if (results.length === 0) {
    resultsEl.innerHTML = `<div class="card empty">Ebből a keretből sajnos nem találtunk megfelelő modellt. Próbálj nagyobb keretet, vagy hagyd ki a márkát.</div>`;
    return;
  }
  const kezdo = lastAnswers.kezdo
    ? `<p class="hint">Kezdő sofőrként a konkrét autónál gyengébb motort keresünk – így olcsóbb lesz a biztosítás.</p>` : '';
  resultsEl.innerHTML = `
    <h2>Neked ajánljuk</h2>
    <p class="hint">Az autó ára legfeljebb kb. ${eur(pMax)} lehet, hogy a végösszeg beleférjen a keretbe.</p>
    ${notice ? `<p class="notice">${notice}</p>` : ''}
    ${kezdo}
    <div class="grid">
      ${results.map((r, i) => `
        <article class="card car">
          <div class="pic">${picture(r.model)}</div>
          <h3>${r.model.marka} ${r.model.modell} <small>${r.model.generacio} (${r.model.evjarat})</small></h3>
          <p class="meta">${KAT_LABEL[r.model.kategoria]} · ${r.model.uzemanyag} · ${r.model.ulesek} ülés ·
            fenntartás <b title="becsült fenntartási költség">${'€'.repeat(r.model.fenntartas)}</b></p>
          ${r.model.karakter.length ? `<p class="meta">${r.model.karakter.map(k => KARAKTER_LABEL[k]).join(', ')}</p>` : ''}
          <ul class="matches">${r.matches.map(t => `<li>✓ ${t}</li>`).join('')}</ul>
          <p class="price">Becsült végösszeg: <b>${eur(r.vegar)}</b></p>
          <button data-i="${i}">Ezt kérem</button>
        </article>`).join('')}
    </div>`;
  resultsEl.querySelectorAll('button[data-i]').forEach(btn => {
    btn.addEventListener('click', () => {
      selected = results[Number(btn.dataset.i)];
      document.getElementById('requestTitle').textContent =
        `${selected.model.marka} ${selected.model.modell} ${selected.model.generacio}`;
      dialog.showModal();
    });
  });
}

dialog.addEventListener('close', () => {
  if (dialog.returnValue !== 'ok' || !selected) return;
  const contact = Object.fromEntries(new FormData(requestForm));
  // Prototípus: nincs még backend, a kérést csak a konzolra írjuk.
  console.log('Ajánlatkérés', { modell: selected.model.id, valaszok: lastAnswers, kapcsolat: contact });
  requestForm.reset();
  resultsEl.insertAdjacentHTML('afterbegin',
    `<p class="notice ok">Köszönjük! Megkeressük a(z) ${selected.model.marka} ${selected.model.modell} modellt, és hamarosan jelentkezünk.</p>`);
  resultsEl.scrollIntoView({ behavior: 'smooth' });
});
