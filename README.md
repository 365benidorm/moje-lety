# Moje Lety — osobní letecký deník (PWA)

Vlastní, nezávislá appka pro evidenci letů. Žádný účet u třetí strany,
žádná závislost na Claude ani na jiné appce. Appka je zamčená heslem a
e-mailovým kódem na info@krejcijakub.cz — data žijí v tvém prohlížeči
(IndexedDB) a automaticky se zálohují do tvého vlastního Google Sheetu.

Díky tomuhle zámku už nevadí, že je hosting (GitHub Pages) technicky
veřejný — bez hesla a bez přístupu k tomu e-mailu appku nikdo neotevře, natož
aby v ní něco uviděl. Řešit soukromý/placený GitHub repozitář tedy není
potřeba.

## Co je v balíčku

```
index.html          — celá appka (HTML+CSS+JS v jednom souboru)
manifest.json        — PWA manifest (instalovatelnost, ikony, barvy)
sw.js                 — service worker (offline provoz)
airports.json         — databáze ~7 884 letišť světa s IATA kódy
icons/                — ikony appky
google-apps-script/Code.gs — volitelný backend pro zálohu do Google Sheets
```

## 1) Rychlý test hned teď

Otevři `index.html` dvojklikem v prohlížeči. Funguje ruční zadávání, CSV
import, statistiky. Kamera a service worker (offline režim) potřebují běžet
z webového serveru (HTTPS) — o to se postará hosting v kroku 2.

## 2) Nasazení, ať appka běží na vlastní adrese

Nejjednodušší je **GitHub Pages** (zdarma, HTTPS automaticky):

1. Založ si nový repozitář na GitHub (klidně privátní).
2. Nahraj do něj všechny soubory z tohoto balíčku (kromě `google-apps-script/`,
   ten nikam nenahrávej, to je jen podklad pro Apps Script).
3. Repozitář -> Settings -> Pages -> Source: `main` branch, `/ (root)`.
4. Po chvíli běží appka na `https://tvuj-github-ucet.github.io/nazev-repa/`.

Alternativa blíž Google prostředí: **Firebase Hosting** (`firebase init hosting`,
`firebase deploy`) — taky zdarma, plnohodnotné HTTPS a service worker.
Google Sites bohužel vlastní service worker/manifest spolehlivě nepodporuje,
proto pro samotné hostování appky nedávám do smyčky.

## 3) Instalace na telefon (PWA)

- **Android/Chrome:** otevři adresu appky -> nabídne se "Přidat na plochu"
  (nebo přes menu ⋮ -> Instalovat aplikaci).
- **iPhone/Safari:** otevři adresu appky -> tlačítko Sdílet -> "Přidat na
  plochu".

Po instalaci appka běží jako samostatná ikona, offline, bez adresního řádku.

## 4) Přihlášení (heslo + e-mailový kód) a automatická záloha

Appka je teď zamčená hned od startu — otevře se, jen když zadáš heslo a pak
šestimístný kód, který ti pošleme na **info@krejcijakub.cz**. Bez obojího se
dovnitř nikdo nedostane (ani ty na jiném zařízení, dokud se nepřihlásíš).
Po přihlášení appka sama, potichu:

- při každém otevření stáhne nejnovější lety z tvého Google Sheetu,
- po každém přidání/úpravě/smazání letu je do něj zase zálohuje,

takže appka v telefonu (PWA) a appka v prohlížeči vidí stejná data, aniž bys
cokoliv ručně mačkal.

**Nastavení (jednou):**

1. Vytvoř nový Google Sheet.
2. Rozšíření -> Apps Script, smaž předvyplněný kód a vlož celý obsah
   `google-apps-script/Code.gs`.
3. Nastavení projektu -> Vlastnosti skriptu -> přidej dvě vlastnosti:
   - `AUTH_EMAIL` = `info@krejcijakub.cz`
   - `AUTH_PASSWORD` = heslo, které si sám zvolíš (běžný text — vidí ho jen
     server, appka si ho nikam neukládá)
4. Nasadit -> Nové nasazení -> Web aplikace -> Spustit jako: Já, Přístup:
   Kdokoli (NE "Kdokoli s Google účtem"). Zkopíruj URL nasazení.
5. V appce na uzamykací obrazovce klikni na "nastavit adresu serveru", vlož
   tam tu URL a ulož.
6. Zadej svoje heslo -> appka pošle kód na info@krejcijakub.cz -> kód opiš
   do appky. Hotovo, appka si tě bude pamatovat 30 dní na tomhle zařízení.

Pokud si appku nainstaluješ na víc zařízení (telefon i prohlížeč na počítači),
na každém z nich se přihlásíš zvlášť stejným postupem — obě pak automaticky
vidí tatáž data.

**Odhlášení:** Nastavení -> "Odhlásit toto zařízení" zruší přihlášení jen na
tom jednom zařízení (užitečné, když appku smažeš z ztraceného/prodaného
telefonu).

## 5) Jak dostat dovnitř staré (historické) lety

Tohle byl tvůj hlavní problém u myFlights, tak řešeno prioritně:

- **CSV hromadný import** (záložka Přidat -> CSV import) je nejspolehlivější
  cesta pro desítky starých letů najednou. V appce je tlačítko na stažení
  ukázkové šablony. Klidně to napřed sesbírej do Google Sheetu / Excelu a
  ulož jako CSV — sloupce si po nahrání sám spáruješ (název ani pořadí
  sloupců nevadí) a před uložením uvidíš náhled.
- **PDF import** (starý e-mail s itinerářem / boarding pass v PDF) — appka
  vytáhne datum, letiště a číslo letu jako návrh, ty ho před uložením
  zkontroluješ a doplníš.
- **Sken QR/čárového kódu** z fotky palubního lístku (formát IATA BCBP) —
  pozor, tento formát neobsahuje rok letu (jen den v roce), appka se proto
  na rok při skenu doptá.
- **Ruční zadání** — vždy po ruce jako spolehlivý základ.

## Poctivé limity (ať nejsi překvapený)

- Automatické čtení PDF je heuristika — formáty aerolinek se hodně liší,
  proto vždy vidíš návrh k ruční kontrole, nic se neuloží naslepo.
- Živé skenování kamerou vyžaduje HTTPS hosting (funguje po kroku 2) a
  povolení přístupu ke kameře. Nahrání fotky kódu funguje i bez toho.
- PDF čtečka a čtečka kódů se stahují z veřejného CDN (pdf.js, ZXing) — to
  je jediná "externí" závislost, a to jen na knihovny, ne na službu/účet.
  Appka a tvá data na nich nezávisí.
- **Zámek (heslo + kód) chrání appku před náhodným/cizím otevřením** — přesně
  to, cos chtěl. Poctivě ale řekněme i co nechrání: appka si po přihlášení
  lety ukládá do lokálního úložiště prohlížeče (IndexedDB) nešifrovaně. Kdyby
  měl někdo fyzicky odemčený telefon a pustil se do vývojářských nástrojů
  prohlížeče, teoreticky by se k datům dostal i bez hesla. Před náhodným
  otevřením appky i před cizím člověkem bez hesla je to spolehlivé; před
  cíleným technickým útokem na odemčené zařízení ne. Kdybys chtěl i tohle
  dotáhnout (šifrování dat heslem přímo v appce), řekni si — jde to přidat,
  jen si appka pak nebude moct pamatovat přihlášení na 30 dní a heslo bys
  zadával při každém otevření.

## Vlastnictví dat

Appka nikam sama od sebe nic neposílá. Vše je v tvém zařízení, případně
v tvém vlastním Google Sheetu, pokud si zálohu zapneš. Export do JSON/CSV
je v Nastavení kdykoliv k dispozici.
