# Pagine dei Case — come si generano

La cartella `_build/` non viene pubblicata: GitHub Pages ignora le cartelle che iniziano con `_`. Qui ci sono lo script, i modelli e i testi; le pagine pronte finiscono in `cases/`, `it/cases/`, `de/cases/`, `es/cases/` e `fr/cases/`.

```powershell
$env:KMP_DUPLICATE_LIB_OK="TRUE"; & "$env:USERPROFILE\anaconda3\python.exe" _build\build_cases.py --check   # solo controllo
$env:KMP_DUPLICATE_LIB_OK="TRUE"; & "$env:USERPROFILE\anaconda3\python.exe" _build\build_cases.py           # genera tutto
```

## Da dove viene ogni cosa
- **Fatti, etichette di certezza e URL delle fonti** vengono dal file del caso del motore, `Motore Vox/cases/caseNNN.json`, blocco `sources`. Lo script lo legge soltanto e non lo modifica mai (i casi approvati restano congelati).
- **Testi della pagina nelle 5 lingue** sono in `_build/cases/NNN.json`:
  - i numeri esistono solo nel blocco `numbers` e nei testi si scrivono come `{nome}`; con `{nome|count}` il numero si anima;
  - le etichette di certezza si scrivono come `[OBSERVED]`, `[ESTIMATE]` e così via, e restano in inglese in ogni lingua.
- **Scritte fisse dell'interfaccia** (menu, titoli delle sezioni, date): `_build/ui.json`.
- **Grafica:** `_build/static/case.css` e `case.js`, copiati in `assets/case/`. **Modelli HTML:** `_build/templates/`.

## Il controllo che blocca la pubblicazione
Prima di scrivere qualsiasi file, lo script confronta ogni lingua con l'inglese, frase per frase. Si ferma e non scrive niente se una lingua:
- usa numeri diversi;
- ha etichette diverse o mancanti;
- contiene cifre scritte a mano;
- ha un numero diverso di paragrafi o di prove;
- usa una fonte che non esiste nel file del caso, oppure lascia fuori una fonte.

I numeri vengono poi formattati per ciascuna lingua: 1.23% in EN, 1,23 % in DE e FR, 4.670 km in DE e IT, 4 670 km in FR.

## Cosa genera
- `/cases/NNN/` (EN) e `/{it,de,es,fr}/cases/NNN/`, con hreflang, canonical, Open Graph e i dati strutturati Article.
- L'archivio `/cases/` in 5 lingue.
- `sitemap.xml`: tiene le pagine già presenti e rigenera le voci `/cases/`.
- Le immagini, copiate in `img/cases/NNN/`.

## Regole
- Nella sezione "Guarda" vanno solo URL reali dei post, nel campo `posts`. Finché è vuoto, la pagina rimanda ai canali ufficiali.
- I "casi collegati" compaiono solo quando la loro pagina esiste.
- Chi ha già scelto una lingua viene portato a quella lingua solo se apre l'indirizzo inglese. Un link `/it/` o `/de/` condiviso non viene mai dirottato.
- Collaudo a ogni generazione: a 375 e 390 px nessuno scorrimento laterale e niente titoli sotto la copertina; pulsanti alti almeno 48 px; nessuna immagine rotta.
