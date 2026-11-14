// Az üzenetváltás megjelenítése – az admin és a vevő oldala is ezt használja.
import { COSTS } from './recommend.js';
import { COLORS, COLOR_NAME } from './store.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const eur = n => Number(n).toLocaleString('hu-HU', { useGrouping: 'always' }) + ' €';
export const date = iso => new Date(iso).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const colorList = ids => (ids || []).map(c => COLOR_NAME[c]).filter(Boolean).join(', ');

const ANSWER_TEXT = {
  accept: () => 'Elfogadom az ajánlatot.',
  reject: () => 'Köszönöm, ezt az ajánlatot nem kérem.',
  color: m => `Más színben szeretném: ${colorList(m.colors)}.`,
};
const ANSWER_STATE = { accept: 'Elfogadva', reject: 'Elutasítva', color: 'Más színt kért' };

function offerCard(r, m) {
  const dij = m.vegar - m.ar - COSTS.szallitas - COSTS.ugyintezes;
  return `<div class="offer">
    <p class="offer-head"><b>Ajánlat: ${esc(r.modell)}</b>${m.valasz ? `<span class="badge" data-s="${m.valasz}">${ANSWER_STATE[m.valasz]}</span>` : '<span class="badge">Válaszra vár</span>'}</p>
    ${m.szin ? `<p>Szín: ${esc(COLOR_NAME[m.szin] || m.szin)}</p>` : ''}
    ${m.leiras ? `<p class="pre">${esc(m.leiras)}</p>` : ''}
    <dl class="kv">
      <div><dt>Az autó ára</dt><dd>${eur(m.ar)}</dd></div>
      <div><dt>Szállítás</dt><dd>${eur(COSTS.szallitas)}</dd></div>
      <div><dt>Ügyintézés, honosítás</dt><dd>${eur(COSTS.ugyintezes)}</dd></div>
      <div><dt>Díjunk (${COSTS.dijSzazalek * 100}%)</dt><dd>${eur(dij)}</dd></div>
      <div class="total"><dt>Végösszeg</dt><dd>${eur(m.vegar)}</dd></div>
    </dl>
  </div>`;
}

// viewer: 'admin' | 'ugyfel' – a saját üzenetek jobbra kerülnek
export function renderMessages(r, viewer) {
  const k = r.kapcsolat;
  const first = {
    from: 'ugyfel', at: r.createdAt,
    html: `<p><b>Ajánlatkérés: ${esc(r.modell)}</b></p>` +
      (k.szinek?.length ? `<p>Szín: ${colorList(k.szinek)}</p>` : '') +
      (k.megjegyzes ? `<p class="pre">${esc(k.megjegyzes)}</p>` : ''),
  };
  const items = [first, ...r.messages.map(m => ({
    from: m.from, at: m.at, wide: m.type === 'offer',
    html: m.type === 'offer' ? offerCard(r, m) : m.type === 'text' ? `<p class="pre">${esc(m.text)}</p>` : `<p>${ANSWER_TEXT[m.type](m)}</p>`,
  }))];
  return items.map(m => `
    <li class="msg ${m.from === viewer ? 'own' : 'other'}${m.wide ? ' wide' : ''}">
      <div class="bubble">${m.html}</div>
      <small>${m.from === viewer ? 'Te' : m.from === 'admin' ? 'CarSearch' : esc(k.nev)} · ${date(m.at)}</small>
    </li>`).join('');
}

// Színválasztó jelölőnégyzetek (name: az űrlapmező neve)
export function colorPicker(name, selected = []) {
  return `<div class="swatches">${COLORS.map(([id, nev, hex]) =>
    `<label class="swatch"><input type="checkbox" name="${name}" value="${id}"${selected.includes(id) ? ' checked' : ''}><i style="background:${hex}"></i>${nev}</label>`).join('')}</div>`;
}
