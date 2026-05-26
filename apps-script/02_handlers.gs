function doGet(e) {
  var path = getPath(e);
  if (path === '/health') {
    return respond_({ ok: true, now: new Date().toISOString() }, 200, e);
  }
  if (path === '/logs/latest') {
    return getLatestLog_(e);
  }
  return respond_({ ok: false, error: 'Not found' }, 404, e);
}

function doPost(e) {
  if (isPreflight_(e)) {
    return respond_({ ok: true, preflight: true }, 200, e);
  }

  var path = getPath(e);
  if (path !== '/logs') {
    return respond_({ ok: false, error: 'Not found' }, 404, e);
  }

  var payload;
  try {
    payload = parsePostPayload_(e);
  } catch (err) {
    return respond_({ ok: false, error: 'Invalid request body' }, 400, e);
  }

  var record;
  try {
    record = normalizePayload(payload);
  } catch (err) {
    return respond_({ ok: false, error: err.message || 'Bad request' }, 400, e);
  }

  var sheet = ensureSheet();
  sheet.appendRow(CONFIG.HEADERS.map(function (key) { return record[key]; }));
  return respond_({ ok: true, id: record.id, created_at: record.created_at }, 201, e);
}

function doOptions(e) {
  return respond_({ ok: true, options: true, path: getPath(e) }, 200, e);
}

function getLatestLog_(e) {
  var sheet = ensureSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return respond_({ ok: true, item: null }, 200, e);
  }

  var values = sheet.getRange(lastRow, 1, 1, CONFIG.HEADERS.length).getValues()[0];
  var item = {};
  CONFIG.HEADERS.forEach(function (key, idx) {
    item[key] = values[idx];
  });
  return respond_({ ok: true, item: item }, 200, e);
}
