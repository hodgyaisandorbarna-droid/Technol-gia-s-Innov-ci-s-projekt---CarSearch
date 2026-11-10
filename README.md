# CarSearch

Technológia és innováció projekt: használtautó-ajánló és külföldi beszerzés.
A vevő megadja a keretét, válaszol 3 egyszerű kérdésre, mi ajánlunk 3–5 modellt; a kiválasztottat megkeressük külföldön és behozzuk.

A részletes terv: [docs/terv.md](docs/terv.md)

## Futtatás
Csak egy statikus webszerver kell (az ES modulok miatt a fájlt közvetlenül megnyitva nem működik):

```bash
npm start            # vagy: python3 -m http.server 8000
```

Majd böngészőben: http://localhost:3000 (illetve :8000).

## Tesztek
```bash
npm test
```

## Felépítés
| Fájl | Szerep |
|------|--------|
| `index.html` | kérdőív, találatok, ajánlatkérő ablak |
| `src/catalog.js` | példakatalógus (modellgenerációk, becsült árak) |
| `src/recommend.js` | végár-képlet, szűrés, pontozás, lazítás 0 találatnál |
| `src/app.js` | felület logikája |
| `src/styles.css` | stílus (világos/sötét mód) |
| `test/` | az ajánlómotor tesztjei |
| `public/img/` | modellképek helye (WebP, Wikimedia Commons) |

## Állapot
Élő oldal: https://hodgyaisandorbarna-droid.github.io/Technol-gia-s-Innov-ci-s-projekt---CarSearch/

Prototípus: az ajánlatkérés még nem mentődik sehova (csak a böngésző konzolra íródik ki), a katalógus árai becsültek.
