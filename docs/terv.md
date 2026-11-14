# CarSearch – projektterv

## A szolgáltatás egy mondatban
A vevő megadja a keretét és válaszol néhány egyszerű kérdésre. Mi 3–5 autómodellt ajánlunk neki, ő kiválaszt egyet, mi pedig megkeressük külföldön (főleg Németország, Belgium, Franciaország) a konkrét autót, ellenőrizzük, behozzuk, és tőlünk vásárolja meg.

## Felhasználói folyamat
1. **Keret** (kötelező): a teljes végösszeg, pl. 15 000 €.
2. **Márka** (opcionális).
3. **Élethelyzet-kérdések** (mindegyik egy kattintás, bármelyik kihagyható):

| # | Kérdés | Válaszok | Mit néz a katalógusban |
|---|--------|----------|------------------------|
| 1 | Hányan utaztok általában? | 1–2 · 3–5 · 6–7 fő | méret |
| 2 | Hol jársz többet? | Főleg város · Vegyesen · Sok hosszú út | városi / hosszú út |
| 3 | Milyen kategória érdekel? | Praktikus · Prémium · Luxus · Mindegy | kategória |
| 3b | Mi tetszik jobban? *(csak prémium/luxus)* | Sportos · Kényelmes · Modern technika · Biztonság | karakter |
| + | ☐ 25 év alatti / kezdő sofőr vagyok | – | gyengébb motor a konkrét keresésnél |

4. **Ajánlás**: 3–5 modellgeneráció képpel, illeszkedéssel (✓ 3–5 fő · ✓ hosszú út), fenntartás-jelzővel (€ / €€ / €€€) és becsült végösszeggel.
5. **„Ezt kérem”**: kapcsolatfelvételi adatok → mi megkeressük a konkrét autót és ajánlatot küldünk.
6. **Ellenőrzés és szállítás**: alvázszám-lekérdezés (pl. carVertical), szállítás, honosítás, átadás.

## Ajánló logika
A katalógus egysége a **modellgeneráció** (pl. Škoda Octavia III Combi, 2015–2019), mert egy modell ára évjárattól függően többszörösére változhat.

```
Végár:     V = P_autó · (1 + p) + K_szállítás + K_ügyintézés
Szűrő:     P_tip(m) ≤ P_max = (keret − K_szállítás − K_ügyintézés) / (1 + p)
           márka(m) = választott (ha megadta)
           kategória(m) = választott (ha nem „Mindegy”)
Pontszám:  S(m) = s_méret + s_út + s_karakter,   sᵢ ∈ {0, 1}
           „Vegyesen”, „Mindegy” és a kihagyott kérdés mindenkinek 1 pont
Sorrend:   S szerint csökkenő; egyenlőségnél a P_max-hoz közelebbi ár előbb
0 találat: kategória lazítása luxus → prémium → praktikus; utána a márka elengedése, üzenettel
```

A jelenlegi feltételezések (`src/recommend.js`, `COSTS`): szállítás 800 €, ügyintézés 400 €, díj p = 4 %. **Ezeket valós árajánlatok alapján pontosítani kell.**

## Katalógus
- 50–80 kézzel összeállított sor elég; az árakat negyedévente kézzel frissítjük.
- Oszlopok: márka, modell, generáció, karosszéria, évjárat-sáv, tipikus ár, üzemanyag, ülések, méret, városi, hosszú út, kategória, karakter, fenntartás, kép.
- A jelenlegi 29 soros példakatalógus árai **becsültek**, valódi hirdetésekből kell ellenőrizni.

## Képek
- Modellgenerációnként 1 kép, WebP, kb. 800 px széles, 50–80 KB, statikus fájlként (`public/img/`), az adatbázisban csak a fájlnév.
- Forrás: Wikimedia Commons (szabad licenc, forrásmegjelöléssel). Hirdetésekből és Google-képtalálatokból nem veszünk át képet.
- Csak a top találatok képe töltődik be (`loading="lazy"`); ha nincs fotó, karosszéria-sziluett (SVG) jelenik meg.

## Üzleti modell
Díj: F = p · P_autó (pl. 4 %: 10 000 €-s autón 400 €, 40 000 €-sen 1 600 €). A prémium/luxus szegmens ezért különösen érdekes.

## Jogi és adatvédelmi teendők
- EU-n belül nincs vám, de van regisztrációs adó/honosítás, műszaki vizsga, és ÁFA-kérdés (kereskedőtől ÁFA-köteles lehet).
- GDPR: kevés személyes adatot kérünk (pontos életkor helyett jelölőnégyzet), adatkezelési tájékoztató kell az ajánlatkérő űrlaphoz.
- Ki az eladó jogilag (mi vásárolunk és továbbértékesítünk, vagy megbízásból járunk el)? Ezt a vállalkozási forma előtt el kell dönteni.

## Ütemterv
| Fázis | Tartalom | Állapot |
|-------|----------|---------|
| 0 | Ötlet, folyamat, kérdések, ajánló logika | kész |
| 1 | Prototípus: kérdőív, ajánlómotor, 29 soros példakatalógus, tesztek | **kész** |
| 2 | Katalógus bővítése 50–80 sorra valós árakkal, képek a Wikimedia Commonsból | következő |
| 3 | Backend: az ajánlatkérések mentése (adatbázis), e-mail értesítés, admin lista | |
| 4 | Admin felület: katalógus szerkesztése, ajánlatkérések állapota (új → keresés → ajánlat → szállítás → átadva) | |
| 5 | Jogi szövegek (ÁSZF, adatkezelés), domain, éles indítás | |

## Nyitott kérdések
- Célpiac és nyelv: Magyarország, Románia vagy mindkettő? (Pénznem, honosítási költségek, nyelv.)
- Technológia a backendhez: javaslat Node.js + PostgreSQL (vagy egyszerűbb indulásnak Supabase/Firebase).
- Valós szállítási és ügyintézési költségek → a `COSTS` értékei.
