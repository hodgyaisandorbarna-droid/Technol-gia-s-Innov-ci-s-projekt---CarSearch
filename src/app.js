import { CATALOG } from './catalog.js';
import { CREDITS } from './credits.js';
import { recommend, maxCarPrice, totalPrice, COSTS, KARAKTER_LABEL } from './recommend.js';

const intro = document.getElementById('intro');
const form = document.getElementById('wizard');
const resultsEl = document.getElementById('results');
const dialog = document.getElementById('request');
const requestForm = document.getElementById('requestForm');
const heroBudget = document.getElementById('heroBudget');
const steps = [...form.querySelectorAll('.step')];
const backBtn = document.getElementById('back');
const skipBtn = document.getElementById('skip');
const nextBtn = document.getElementById('next');
const MIN_BUDGET = 1000;
let current = 0;
let lastAnswers = null;
let selected = null;

const num = n => n.toLocaleString('hu-HU', { useGrouping: 'always' });
const eur = n => num(n) + ' €';
const KAT_LABEL = { praktikus: 'Praktikus', premium: 'Prémium', luxus: 'Luxus' };
const FENNTARTAS = { 1: 'alacsony', 2: 'közepes', 3: 'magas' };

// ── Keret: a nyitóképernyő és a kérdőív első lépése ugyanazt az értéket mutatja ──
function renderBudget(budget) {
  const pMax = maxCarPrice(budget);
  const count = CATALOG.filter(m => m.arTip <= pMax).length;
  const cheapest = Math.min(...CATALOG.map(m => totalPrice(m.arTip)));
  document.getElementById('fit').innerHTML = count
    ? `<b>${count} modell</b> fér bele ebbe a keretbe.`
    : `Ebbe a keretbe még nem fér bele modell – a legolcsóbb kb. <b>${eur(cheapest)}</b>.`;

  const car = Math.round(pMax);
  const fee = Math.max(0, budget - car - COSTS.szallitas - COSTS.ugyintezes);
  document.getElementById('costLine').innerHTML =
    `Egy <b>${eur(budget)}</b> keretből az autóra legfeljebb <b>${eur(car)}</b> jut. A többi a behozatal költsége – rejtett tétel nélkül.`;
  document.getElementById('costs').innerHTML = [
    ['Az autó ára legfeljebb', car],
    ['Szállítás külföldről', COSTS.szallitas],
    ['Ügyintézés, honosítás', COSTS.ugyintezes],
    [`A mi díjunk (${COSTS.dijSzazalek * 100}%)`, fee],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${eur(v)}</dd></div>`).join('') +
    `<div class="sum"><dt>Végösszeg</dt><dd>${eur(budget)}</dd></div>`;
}

function setBudget(value, from) {
  const budget = Math.max(0, Math.round(Number(value) || 0));
  if (from !== heroBudget) heroBudget.value = num(budget);
  if (from !== form.budget) form.budget.value = budget;
  renderBudget(budget);
}

heroBudget.addEventListener('input', () => setBudget(heroBudget.value.replace(/\D/g, ''), heroBudget));
heroBudget.addEventListener('blur', () => setBudget(form.budget.value));
heroBudget.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('start').click(); });
form.budget.addEventListener('input', () => setBudget(form.budget.value, form.budget));
document.querySelectorAll('[data-step]').forEach(btn => {
  if (btn.tagName !== 'BUTTON') return;
  btn.addEventListener('click', () => setBudget(Math.max(MIN_BUDGET, Number(form.budget.value) + Number(btn.dataset.step))));
});

// ── Kínálat-táblázat ──
const carRows = document.getElementById('carRows');
const byPrice = [...CATALOG].sort((a, b) => a.arTip - b.arTip);
function renderCars(kat) {
  carRows.innerHTML = byPrice.filter(m => !kat || m.kategoria === kat).map(m => `
    <tr>
      <td>${m.marka} ${m.modell} <small>${m.generacio}<span class="sub">${m.evjarat} · ${m.uzemanyag} · ${KAT_LABEL[m.kategoria]}</span></small></td>
      <td class="opt">${m.evjarat}</td>
      <td class="opt">${m.uzemanyag}</td>
      <td class="opt">${KAT_LABEL[m.kategoria]}</td>
      <td class="num">${eur(totalPrice(m.arTip))}</td>
    </tr>`).join('');
}
document.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
  renderCars(chip.dataset.kat);
}));

// ── Márka-opciók a katalógusból ──
const markaOptions = document.getElementById('markaOptions');
[...new Set(CATALOG.map(m => m.marka))].sort((a, b) => a.localeCompare(b, 'hu')).forEach(marka => {
  const label = document.createElement('label');
  label.innerHTML = `<input type="radio" name="marka" value="${marka}"><span>${marka}</span>`;
  markaOptions.append(label);
});

function show(screen) {
  for (const el of [intro, form, resultsEl]) el.hidden = el !== screen;
  window.scrollTo({ top: 0 });
}

// A fejléc és a lábléc hivatkozásai a kérdőívből és a találatokból is a nyitóoldalra visznek
document.querySelectorAll('[data-nav]').forEach(a => a.addEventListener('click', e => {
  if (!intro.hidden && a.dataset.nav !== 'home') return;
  e.preventDefault();
  if (intro.hidden) show(intro);
  const target = a.dataset.nav === 'home' ? null : document.querySelector(a.getAttribute('href'));
  if (target) target.scrollIntoView(); else window.scrollTo({ top: 0 });
}));

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
  document.getElementById('counter').textContent = `${pos + 1}. kérdés a ${list.length}-${[1, 2, 4, 5, 7, 9].includes(list.length) ? 'ből' : 'ból'}`;
  document.getElementById('bar').style.transform = `scaleX(${(pos + 1) / list.length})`;
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
  const ok = Number(form.budget.value) >= MIN_BUDGET;
  document.getElementById('budgetError').hidden = ok;
  return ok;
}

// A keret már megvan a nyitóképernyőről, ezért a kérdőív a második kérdéssel indul
document.getElementById('start').addEventListener('click', () => {
  current = validBudget() ? 1 : 0;
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
  const step = steps[current];
  setTimeout(() => { if (steps[current] === step && !form.hidden) go(1); }, 250);
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

const restart = `<div class="nav"><button type="button" class="quiet" data-action="edit">Válaszok módosítása</button>
  <button type="button" class="quiet" data-action="restart">Újrakezdés</button></div>`;

function render({ results, pMax, notice }) {
  if (results.length === 0) {
    resultsEl.innerHTML = `<div class="empty"><h2>Ebből a keretből még nincs találat</h2><p>Próbálj nagyobb keretet, vagy hagyd ki a márkát.</p>${restart}</div>`;
    return;
  }
  const kezdo = lastAnswers.kezdo
    ? `<p class="hint">Kezdő sofőrként a konkrét autónál gyengébb motort keresünk – így olcsóbb lesz a biztosítás.</p>` : '';
  resultsEl.innerHTML = `
    <h2>Neked ajánljuk</h2>
    <p class="hint">Az autó ára legfeljebb kb. ${eur(pMax)} lehet, hogy a végösszeg beleférjen a ${eur(lastAnswers.budget)} keretbe.</p>
    ${notice ? `<p class="notice">${notice}</p>` : ''}
    ${kezdo}
    <div class="list">
      ${results.map((r, i) => `
        <article class="car${r.model.kep ? ' has-pic' : ''}" style="--i:${i}">
          ${r.model.kep ? `<div class="pic"><img src="public/img/${r.model.kep}" alt="${r.model.marka} ${r.model.modell} ${r.model.generacio}" loading="lazy" decoding="async" width="800" height="500"></div>` : ''}
          <div>
            <h3>${r.model.marka} ${r.model.modell} <small>${r.model.generacio} · ${r.model.evjarat}</small></h3>
            <div class="facts">
              <p>${KAT_LABEL[r.model.kategoria]} · ${r.model.uzemanyag} · ${r.model.ulesek} ülés · fenntartás: ${FENNTARTAS[r.model.fenntartas]}${
                r.model.karakter.length ? ' · ' + r.model.karakter.map(k => KARAKTER_LABEL[k]).join(', ') : ''}</p>
              ${r.matches.length ? `<p><b>Illik hozzád:</b> ${r.matches.join(', ')}</p>` : ''}
            </div>
          </div>
          <div class="buy">
            <p class="price">Becsült végösszeg <b>${eur(r.vegar)}</b></p>
            <button type="button" data-i="${i}">Ezt kérem</button>
          </div>
        </article>`).join('')}
    </div>
    ${restart}`;
  resultsEl.querySelectorAll('button[data-i]').forEach(btn => {
    btn.addEventListener('click', () => {
      selected = results[Number(btn.dataset.i)];
      document.getElementById('requestTitle').textContent =
        `${selected.model.marka} ${selected.model.modell} ${selected.model.generacio}`;
      dialog.returnValue = '';
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
    setBudget(form.budget.value);
    show(intro);
  }
});

dialog.addEventListener('close', () => {
  if (dialog.returnValue !== 'ok' || !selected) return;
  const contact = Object.fromEntries(new FormData(requestForm));
  // Prototípus: nincs még backend, a kérést csak a konzolra írjuk.
  console.log('Ajánlatkérés', { modell: selected.model.id, valaszok: lastAnswers, kapcsolat: contact });
  requestForm.reset();
  resultsEl.querySelector('.notice.ok')?.remove();
  resultsEl.insertAdjacentHTML('afterbegin',
    `<p class="notice ok" role="status">Köszönjük! Megkeressük a(z) ${selected.model.marka} ${selected.model.modell} modellt, és hamarosan jelentkezünk.</p>`);
  window.scrollTo({ top: 0 });
});

// ── Képek forrása ──
document.getElementById('creditsList').innerHTML = CATALOG.filter(m => CREDITS[m.id]).map(m => {
  const c = CREDITS[m.id];
  return `<li><a href="${c.forras}" target="_blank" rel="noopener">${m.marka} ${m.modell}</a> – ${c.szerzo}, ` +
    (c.licencUrl ? `<a href="${c.licencUrl}" target="_blank" rel="noopener">${c.licenc}</a>` : c.licenc) + '</li>';
}).join('');
document.getElementById('creditsLink').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('credits').showModal();
});

setBudget(form.budget.value);
renderCars('');
