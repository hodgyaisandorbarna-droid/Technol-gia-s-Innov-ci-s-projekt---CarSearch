import { CATALOG } from './catalog.js';
import { recommend, KARAKTER_LABEL } from './recommend.js';

const intro = document.getElementById('intro');
const form = document.getElementById('wizard');
const resultsEl = document.getElementById('results');
const dialog = document.getElementById('request');
const requestForm = document.getElementById('requestForm');
const steps = [...form.querySelectorAll('.step')];
const backBtn = document.getElementById('back');
const skipBtn = document.getElementById('skip');
const nextBtn = document.getElementById('next');
let current = 0;
let lastAnswers = null;
let selected = null;

const eur = n => n.toLocaleString('hu-HU') + ' €';
const KAT_LABEL = { praktikus: 'Praktikus', premium: 'Prémium', luxus: 'Luxus' };

// Márka-opciók a katalógusból
const markaOptions = document.getElementById('markaOptions');
[...new Set(CATALOG.map(m => m.marka))].sort().forEach(marka => {
  const label = document.createElement('label');
  label.innerHTML = `<input type="radio" name="marka" value="${marka}">${marka}`;
  markaOptions.append(label);
});

function show(screen) {
  for (const el of [intro, form, resultsEl]) el.hidden = el !== screen;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// A karakter-kérdés csak prémium/luxus esetén jön
function isActive(step) {
  if (step.dataset.step !== 'karakter') return true;
  const kat = form.kategoria.value;
  return kat === 'premium' || kat === 'luxus';
}

function renderStep() {
  const list = steps.filter(isActive);
  steps.forEach(s => (s.hidden = s !== steps[current]));
  const pos = list.indexOf(steps[current]);
  document.getElementById('counter').textContent = `${pos + 1}. kérdés / ${list.length}`;
  document.getElementById('bar').style.width = `${((pos + 1) / list.length) * 100}%`;
  backBtn.hidden = pos === 0;
  skipBtn.hidden = steps[current].dataset.step === 'budget';
  nextBtn.textContent = pos === list.length - 1 ? 'Mutasd az ajánlatokat' : 'Tovább';
  const focusable = steps[current].querySelector('input:checked, input');
  if (focusable) focusable.focus({ preventScroll: true });
}

function go(delta) {
  let i = current;
  do { i += delta; } while (steps[i] && !isActive(steps[i]));
  if (i < 0) return;
  if (i >= steps.length) return finish();
  current = i;
  renderStep();
}

function validBudget() {
  const ok = Number(form.budget.value) >= 1000;
  document.getElementById('budgetError').hidden = ok;
  return ok;
}

document.getElementById('start').addEventListener('click', () => {
  current = 0;
  show(form);
  renderStep();
});

nextBtn.addEventListener('click', () => {
  if (steps[current].dataset.step === 'budget' && !validBudget()) return;
  go(1);
});
backBtn.addEventListener('click', () => go(-1));
skipBtn.addEventListener('click', () => {
  steps[current].querySelectorAll('input[type=radio]').forEach(i => (i.checked = false));
  go(1);
});
form.addEventListener('submit', e => {
  e.preventDefault();
  nextBtn.click();
});

// Választás után rövid szünettel automatikusan továbblép
form.addEventListener('change', e => {
  if (e.target.type !== 'radio') return;
  if (e.target.name === 'kategoria' && !isActive(steps.find(s => s.dataset.step === 'karakter'))) {
    form.querySelectorAll('input[name=karakter]').forEach(i => (i.checked = false));
  }
  setTimeout(() => go(1), 250);
});

function finish() {
  const fd = new FormData(form);
  lastAnswers = {
    budget: Number(fd.get('budget')),
    marka: fd.get('marka') || null,
    utasok: fd.get('utasok'),
    ut: fd.get('ut'),
    kategoria: fd.get('kategoria'),
    karakter: fd.get('karakter'),
    kezdo: fd.get('kezdo') === 'igen',
  };
  render(recommend(CATALOG, lastAnswers));
  show(resultsEl);
}

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

const restart = `<div class="nav"><button type="button" class="secondary" data-action="edit">Válaszok módosítása</button>
  <button type="button" class="secondary" data-action="restart">Újrakezdés</button></div>`;

function render({ results, pMax, notice }) {
  if (results.length === 0) {
    resultsEl.innerHTML = `<div class="card empty"><h2>Nincs találat</h2><p>Ebből a keretből sajnos nem találtunk megfelelő modellt. Próbálj nagyobb keretet, vagy hagyd ki a márkát.</p>${restart}</div>`;
    return;
  }
  const kezdo = lastAnswers.kezdo
    ? `<p class="hint">Kezdő sofőrként a konkrét autónál gyengébb motort keresünk – így olcsóbb lesz a biztosítás.</p>` : '';
  resultsEl.innerHTML = `
    <h2>Neked ajánljuk</h2>
    <p class="hint">Az autó ára legfeljebb kb. ${eur(pMax)} lehet, hogy a végösszeg beleférjen a ${eur(lastAnswers.budget)} keretbe.</p>
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
          <button type="button" data-i="${i}">Ezt kérem</button>
        </article>`).join('')}
    </div>
    ${restart}`;
  resultsEl.querySelectorAll('button[data-i]').forEach(btn => {
    btn.addEventListener('click', () => {
      selected = results[Number(btn.dataset.i)];
      document.getElementById('requestTitle').textContent =
        `${selected.model.marka} ${selected.model.modell} ${selected.model.generacio}`;
      dialog.showModal();
    });
  });
}

resultsEl.addEventListener('click', e => {
  const action = e.target.dataset.action;
  if (action === 'edit') {
    current = 0;
    show(form);
    renderStep();
  } else if (action === 'restart') {
    form.reset();
    show(intro);
  }
});

dialog.addEventListener('close', () => {
  if (dialog.returnValue !== 'ok' || !selected) return;
  const contact = Object.fromEntries(new FormData(requestForm));
  // Prototípus: nincs még backend, a kérést csak a konzolra írjuk.
  console.log('Ajánlatkérés', { modell: selected.model.id, valaszok: lastAnswers, kapcsolat: contact });
  requestForm.reset();
  resultsEl.insertAdjacentHTML('afterbegin',
    `<p class="notice ok">Köszönjük! Megkeressük a(z) ${selected.model.marka} ${selected.model.modell} modellt, és hamarosan jelentkezünk.</p>`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
