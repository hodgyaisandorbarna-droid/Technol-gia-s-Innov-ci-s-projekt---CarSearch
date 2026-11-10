import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG } from '../src/catalog.js';
import { recommend, maxCarPrice, totalPrice } from '../src/recommend.js';

const ids = r => r.results.map(x => x.model.id);

test('a végár sosem lépi túl a keretet', () => {
  for (const budget of [8000, 12000, 20000, 40000]) {
    for (const x of recommend(CATALOG, { budget }).results) {
      assert.ok(x.vegar <= budget, `${x.model.id}: ${x.vegar} > ${budget}`);
    }
  }
  assert.ok(totalPrice(maxCarPrice(15000)) <= 15000);
});

test('családi, hosszú út, 15 000 € → nagy praktikus autók elöl', () => {
  const r = recommend(CATALOG, { budget: 15000, utasok: '3-5', ut: 'hosszu', kategoria: 'praktikus' });
  assert.equal(r.results[0].score, 3);
  assert.ok(ids(r).includes('skoda-octavia-3-combi'));
});

test('6–7 fő → a 7 üléses modellek kerülnek előre', () => {
  const r = recommend(CATALOG, { budget: 20000, utasok: '6-7' });
  assert.deepEqual(ids(r).slice(0, 2).sort(), ['dacia-jogger', 'vw-touran-2']);
});

test('prémium + sportos → BMW 3-as', () => {
  const r = recommend(CATALOG, { budget: 20000, kategoria: 'premium', karakter: 'sportos' });
  assert.equal(r.results[0].model.id, 'bmw-3-f30');
});

test('luxus kis keretből → prémiumra lazít, üzenettel', () => {
  const r = recommend(CATALOG, { budget: 20000, kategoria: 'luxus' });
  assert.ok(r.results.length > 0);
  assert.ok(r.results.every(x => x.model.kategoria === 'premium'));
  assert.ok(r.notice);
});

test('márka, amiből nincs a keretben → hasonló márkák üzenettel', () => {
  const r = recommend(CATALOG, { budget: 12000, marka: 'Porsche' });
  assert.ok(r.results.length > 0);
  assert.match(r.notice, /Porsche/);
});

test('nagyon kis keret → üres lista, nem hiba', () => {
  assert.equal(recommend(CATALOG, { budget: 3000 }).results.length, 0);
});
