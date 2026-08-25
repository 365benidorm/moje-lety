/**
 * MOJE LETY — backend: přihlášení na heslo + e-mailový kód (2FA)
 * a automatická obousměrná záloha letů do tohoto Google Sheetu.
 *
 * NASTAVENÍ (Rozšíření > Apps Script > Nastavení projektu > Vlastnosti skriptu):
 *   AUTH_EMAIL     = info@krejcijakub.cz   (kam se posílá přihlašovací kód)
 *   AUTH_PASSWORD  = tvoje zvolené heslo (obyčejný text — je vidět jen tobě
 *                     na serveru, appka ho nikdy neuvidí ani neuloží)
 *
 * Data zůstávají celá v tomto tvém Google Sheetu. Nikdo jiný k tomu nemá přístup.
 */

const SHEET_FLIGHTS = 'Flights';
const SHEET_SESSIONS = 'Sessions';
const COLUMNS = ['id','date','airline','flightNumber','origin','destination','depTime','arrTime','seat','aircraft','pnr','notes','source','createdAt','updatedAt'];
const CODE_TTL_MINUTES = 10;
const SESSION_TTL_DAYS = 30;

function getFlightsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_FLIGHTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_FLIGHTS);
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSessionsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SESSIONS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SESSIONS);
    sheet.appendRow(['token', 'createdAt', 'expiresAt']);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function randomCode_() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6místný kód
}

function randomToken_() {
  return Utilities.getUuid() + '-' + Utilities.getUuid();
}

function isValidSession_(token) {
  if (!token) return false;
  const sheet = getSessionsSheet_();
  const data = sheet.getDataRange().getValues();
  const now = Date.now();
  for (let r = 1; r < data.length; r++) {
    if (data[r][0] === token && Number(data[r][2]) > now) return true;
  }
  return false;
}

function cleanExpiredSessions_() {
  const sheet = getSessionsSheet_();
  const data = sheet.getDataRange().getValues();
  const now = Date.now();
  for (let r = data.length - 1; r >= 1; r--) {
    if (Number(data[r][2]) <= now) sheet.deleteRow(r + 1);
  }
}

/* ---------------------------------- GET ----------------------------------- */
// ?action=check&key=TOKEN            -> je token platný?
// ?action=flights&key=TOKEN          -> vrátí všechny lety
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'flights';
  const token = (e.parameter && e.parameter.key) || '';

  if (action === 'check') {
    return jsonOut_({ ok: isValidSession_(token) });
  }

  if (action === 'flights') {
    if (!isValidSession_(token)) return jsonOut_({ error: 'unauthorized' });
    const sheet = getFlightsSheet_();
    const data = sheet.getDataRange().getValues();
    const headers = data.shift() || [];
    const flights = data
      .filter(row => row.some(v => v !== '' && v !== null))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });
    return jsonOut_({ flights: flights });
  }

  return jsonOut_({ error: 'unknown_action' });
}

/* ---------------------------------- POST ---------------------------------- */
// {action:'login_request', email, password}  -> pošle 6místný kód na AUTH_EMAIL
// {action:'login_verify', code}               -> vrátí session token (platný 30 dní)
// {action:'logout', token}                     -> zruší jedno zařízení
// {action:'sync', key, flights}                -> uloží/aktualizuje lety (výchozí akce)
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ error: 'invalid_json' });
  }
  const action = body.action || 'sync';
  const props = PropertiesService.getScriptProperties();

  if (action === 'login_request') {
    const authEmail = props.getProperty('AUTH_EMAIL');
    const authPassword = props.getProperty('AUTH_PASSWORD');
    if (!authEmail || !authPassword || body.email !== authEmail || body.password !== authPassword) {
      Utilities.sleep(800); // zpomalí hádání hesla hrubou silou
      return jsonOut_({ error: 'invalid_credentials' });
    }
    const code = randomCode_();
    props.setProperty('PENDING_CODE', code);
    props.setProperty('PENDING_CODE_EXPIRES', String(Date.now() + CODE_TTL_MINUTES * 60000));
    MailApp.sendEmail(
      authEmail,
      'Přihlašovací kód – Moje Lety',
      'Tvůj kód pro přihlášení do appky Moje Lety: ' + code +
      '\n\nPlatí ' + CODE_TTL_MINUTES + ' minut. Pokud jsi o něj nežádal(a), appku prostě zavři – nikdo se bez hesla dovnitř nedostane.'
    );
    return jsonOut_({ ok: true });
  }

  if (action === 'login_verify') {
    const pending = props.getProperty('PENDING_CODE');
    const expires = Number(props.getProperty('PENDING_CODE_EXPIRES') || 0);
    if (!pending || Date.now() > expires || body.code !== pending) {
      return jsonOut_({ error: 'invalid_code' });
    }
    props.deleteProperty('PENDING_CODE');
    props.deleteProperty('PENDING_CODE_EXPIRES');
    cleanExpiredSessions_();
    const token = randomToken_();
    getSessionsSheet_().appendRow([token, Date.now(), Date.now() + SESSION_TTL_DAYS * 86400000]);
    return jsonOut_({ ok: true, token: token });
  }

  if (action === 'logout') {
    const sheet = getSessionsSheet_();
    const data = sheet.getDataRange().getValues();
    for (let r = data.length - 1; r >= 1; r--) {
      if (data[r][0] === body.token) sheet.deleteRow(r + 1);
    }
    return jsonOut_({ ok: true });
  }

  // action === 'sync' (výchozí) — uložení / aktualizace letů, vyžaduje platný token
  if (!isValidSession_(body.key)) return jsonOut_({ error: 'unauthorized' });
  const sheet = getFlightsSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');
  const idToRow = {};
  for (let r = 1; r < values.length; r++) idToRow[values[r][idCol]] = r + 1;

  const flights = body.flights || [];
  flights.forEach(f => {
    const row = headers.map(h => (f[h] !== undefined && f[h] !== null) ? f[h] : '');
    if (idToRow[f.id]) {
      sheet.getRange(idToRow[f.id], 1, 1, headers.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  });

  return jsonOut_({ ok: true, count: flights.length });
}
