// Ajánlómotor: szűrés a keret (és opcionálisan márka, kategória) alapján,
// majd egyszerű pontozás: S(m) = s_méret + s_út + s_karakter, sᵢ ∈ {0, 1}.

// Költség-feltételezések a végár-képlethez – ezeket az üzleti terv alapján pontosítani kell.
export const COSTS = {
  szallitas: 800,   // € – szállítás külföldről (becslés)
  ugyintezes: 400,  // € – papírmunka, műszaki vizsga, honosítás (becslés)
  dijSzazalek: 0.04 // a mi díjunk: F = p · P_autó
};

// Végár = P_autó + szállítás + ügyintézés + p · P_autó
// → a keretbe beleférő legnagyobb autóár: P_max = (keret − szállítás − ügyintézés) / (1 + p)
export function maxCarPrice(budget, costs = COSTS) {
  return Math.max(0, (budget - costs.szallitas - costs.ugyintezes) / (1 + costs.dijSzazalek));
}

export function totalPrice(carPrice, costs = COSTS) {
  return Math.round(carPrice * (1 + costs.dijSzazalek) + costs.szallitas + costs.ugyintezes);
}

const MERET_BY_UTASOK = {
  '1-2': ['kicsi', 'kozepes'],
  '3-5': ['kozepes', 'nagy'],
  '6-7': ['het'],
};

const CATEGORY_FALLBACK = { luxus: 'premium', premium: 'praktikus' };

// answers: { budget, marka?, utasok?, ut?, kategoria?, karakter?, kezdo? }
// A kihagyott kérdés, a „vegyes” és a „mindegy” minden modellnek 1 pontot ad.
export function scoreModel(m, answers) {
  const matches = [];
  let s = 0;

  const meretek = MERET_BY_UTASOK[answers.utasok];
  if (!meretek || meretek.includes(m.meret)) {
    s += 1;
    if (meretek) matches.push(`${answers.utasok} fő`);
  }

  if (answers.ut === 'varos') {
    if (m.varosi) { s += 1; matches.push('városi'); }
  } else if (answers.ut === 'hosszu') {
    if (m.hosszuUt) { s += 1; matches.push('hosszú út'); }
  } else {
    s += 1;
  }

  const premiumAg = answers.kategoria === 'premium' || answers.kategoria === 'luxus';
  if (premiumAg && answers.karakter) {
    if (m.karakter.includes(answers.karakter)) { s += 1; matches.push(KARAKTER_LABEL[answers.karakter]); }
  } else {
    s += 1;
  }

  return { score: s, matches };
}

export const KARAKTER_LABEL = {
  sportos: 'sportos',
  kenyelmes: 'kényelmes',
  technika: 'modern technika',
  biztonsag: 'biztonság',
};

function filterAndRank(catalog, answers, kategoria, pMax, useBrand) {
  return catalog
    .filter(m => m.arTip <= pMax)
    .filter(m => !kategoria || kategoria === 'mindegy' || m.kategoria === kategoria)
    .filter(m => !useBrand || !answers.marka || m.marka === answers.marka)
    .map(m => ({ model: m, ...scoreModel(m, answers), vegar: totalPrice(m.arTip) }))
    // S szerint csökkenő, egyenlőségnél a P_max-hoz közelebbi (azaz drágább) ár előbb
    .sort((a, b) => b.score - a.score || b.model.arTip - a.model.arTip);
}

// Visszaad: { results, pMax, notice } – notice akkor van, ha lazítani kellett a szűrőn.
export function recommend(catalog, answers, limit = 5) {
  const pMax = maxCarPrice(answers.budget);
  let kategoria = answers.kategoria;
  let results = filterAndRank(catalog, answers, kategoria, pMax, true);
  let notice = null;

  // 0 találat → egy-egy szinttel lazítunk: luxus → prémium → praktikus
  while (results.length === 0 && CATEGORY_FALLBACK[kategoria]) {
    kategoria = CATEGORY_FALLBACK[kategoria];
    results = filterAndRank(catalog, answers, kategoria, pMax, true);
    if (results.length) notice = `Ebből a keretből a választott kategóriában nem találtunk modellt, ezért ${kategoria === 'premium' ? 'prémium' : 'praktikus'} autókat mutatunk.`;
  }

  // Márkával még mindig nincs találat → a márkát elengedjük, és jelezzük
  if (results.length === 0 && answers.marka) {
    results = filterAndRank(catalog, answers, answers.kategoria, pMax, false);
    kategoria = answers.kategoria;
    while (results.length === 0 && CATEGORY_FALLBACK[kategoria]) {
      kategoria = CATEGORY_FALLBACK[kategoria];
      results = filterAndRank(catalog, answers, kategoria, pMax, false);
    }
    if (results.length) notice = `Ebből a keretből ${answers.marka} modellt nem találtunk. Hasonló márkák:`;
  }

  return { results: results.slice(0, limit), pMax: Math.round(pMax), notice };
}
