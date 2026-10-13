# Nørrebro KitKat Cup 2026 – live resultater

Live stilling og kampprogram til U10-turneringen søndag 18/10.

- **Data** ligger i et Google Sheet med to faner: `Hold` og `Kampe`.
- **Siden** er én statisk fil (`index.html`) på GitHub Pages. Den henter data fra arket hvert 30. sekund.
- Ingen server, ingen database, intet byggetrin.

## Filer

| Fil | Indhold |
|---|---|
| `index.html` | Selve siden (stilling, kampprogram, filter, QR-kode). Øverst i scriptet ligger `CONFIG` med `SHEET_ID` og `SITE_URL`. |
| `ranking.js` | Beregning af stillingen (ren funktion, testet). |
| `sheet.js` | Læser CSV fra Google Sheets og tolererer rod (mellemrum, tomme rækker, tal som tekst). |
| `data/Hold.csv`, `data/Kampe.csv` | Filerne der importeres i Google Sheets. Bruges også som demo-data, indtil `SHEET_ID` er sat. |
| `tests/` | Automatiske tests. |

## Farver og logo

- Farverne rettes øverst i `index.html` i blokken "KLUBFARVER" (fire linjer).
- Logo: læg en fil med navnet `logo.png` i roden af repositoryet, så vises den i toppen og på QR-plakaten. Uden filen vises intet logo.

## Sådan bruges arket på dagen

- Skriv mål i `HjemmeMål` og `UdeMål` (kun tal). En kamp tæller først, når **begge** felter er udfyldt.
- Holdnavne rettes kun i fanen `Hold` – så slår det igennem overalt.
- Ret ikke i `HoldID`, og omdøb ikke fanerne eller kolonneoverskrifterne.

## Rangering

Sejr 3, uafgjort 1, nederlag 0. Ved pointlighed:

1. Indbyrdes kampe (minitabel med kun de spillede kampe mellem de pointlige hold). Adskiller minitabellen kun nogle af holdene, vurderes de resterende lige hold igen fra trin 1 indbyrdes mellem sig.
2. Størst målforskel i alle kampe.
3. Flest scorede mål i alle kampe.
4. Delt placering (samme nummer), sorteret alfabetisk.

Bemærk: Hvis målforskel eller scorede mål kun adskiller nogle af holdene, går de resterende videre til næste trin (ikke tilbage til indbyrdes kampe).

## Nyttige adresser

- `?print=qr` – printvenlig QR-plakat til at hænge op ved banerne.
- `?nu=11:10` – lader som om klokken er 11:10 på turneringsdagen (til at teste markeringen "I gang nu").

## Tests

Kræver Node.js 18 eller nyere:

```
node --test
```
