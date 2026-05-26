const CONFIG = {
  SHEET_NAME: 'ReflectionLogs',
  ALLOWED_ORIGINS: ['*'],
  HEADERS: [
    'id',
    'date',
    'context',
    'original_input',
    'intent',
    'ai_response',
    'like_dislike',
    'my_preference',
    'rule_candidate',
    'my_edit',
    'my_observation',
    'tags',
    'note',
    'created_at'
  ]
};

function doGet(e) {
  var action = getAction(e);
  if (action === 'health') {
    return respond_({ ok: true, now: new Date().toISOString() }, 200, e);
  }
  if (action === 'logs_latest') {
    return getLatestLog_(e);
  }
  if (action === 'logs') {
    return getLogs_(e);
  }
  return respond_({ ok: false, error: 'Not found' }, 404, e);
}

function doPost(e) {
  if (isPreflight_(e)) {
    return respond_({ ok: true, preflight: true }, 200, e);
  }

  var action = getAction(e);
  if (action !== 'logs') {
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

function ensureSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CONFIG.HEADERS);
  } else {
    var range = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
    var current = range.getValues()[0];
    var mismatch = CONFIG.HEADERS.some(function (header, index) { return current[index] !== header; });
    if (mismatch) range.setValues([CONFIG.HEADERS]);
  }

  return sheet;
}

function normalizePayload(payload) {
  var now = new Date().toISOString();
  var record = {
    id: 'log_' + Utilities.getUuid().slice(0, 8),
    date: now.slice(0, 10),
    context: '未命名情境',
    original_input: '',
    intent: '',
    ai_response: '',
    like_dislike: '',
    my_preference: '',
    rule_candidate: '',
    my_edit: '',
    my_observation: '',
    tags: '',
    note: '',
    created_at: now
  };

  CONFIG.HEADERS.forEach(function (key) {
    if (key === 'id' || key === 'created_at') return;
    if (!(key in payload)) return;
    if (key === 'tags') {
      record.tags = normalizeTags(payload.tags);
      return;
    }
    var value = payload[key];
    record[key] = typeof value === 'string' ? value.trim() : JSON.stringify(value);
  });

  if (!record.ai_response) throw new Error('ai_response is required');
  return record;
}

function normalizeTags(value) {
  return (Array.isArray(value) ? value : String(value || '').split(','))
    .map(function (item) { return String(item || '').trim().toLowerCase(); })
    .filter(Boolean)
    .join(',');
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

function getLogs_(e) {
  var page = parseInt(e.parameter.page) || 1;
  var pageSize = parseInt(e.parameter.pageSize) || 10;
  var q = (e.parameter.q || '').toLowerCase();
  var tag = (e.parameter.tag || '').toLowerCase();

  var sheet = ensureSheet();
  var lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return respond_({ ok: true, items: [], total: 0, page: page, pageSize: pageSize }, 200, e);
  }

  // 取得所有資料 (扣除標題列)
  var dataRange = sheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.length);
  var values = dataRange.getValues();

  var allItems = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var item = {};
    CONFIG.HEADERS.forEach(function (key, idx) {
      item[key] = row[idx];
    });
    
    // 將 tags 從字串還原為陣列
    if (typeof item.tags === 'string' && item.tags) {
      try {
        item.tags = JSON.parse(item.tags);
      } catch (err) {
        item.tags = item.tags.split(',').map(function(t){ return t.trim(); }).filter(Boolean);
      }
    } else if (!item.tags) {
      item.tags = [];
    }
    allItems.push(item);
  }

  // 反轉陣列，讓最新紀錄排在最前面
  allItems.reverse();

  // 進行過濾
  var filtered = allItems.filter(function(item) {
    if (tag) {
      var itemTags = item.tags || [];
      var hasTag = itemTags.some(function(t) { return String(t).toLowerCase() === tag; });
      if (!hasTag) return false;
    }
    if (q) {
      var searchStr = [
        item.context || '',
        item.original_input || '',
        item.intent || '',
        item.ai_response || '',
        item.note || ''
      ].join(' ').toLowerCase();
      if (searchStr.indexOf(q) === -1) {
        return false;
      }
    }
    return true;
  });

  // 分頁處理
  var total = filtered.length;
  var startIndex = (page - 1) * pageSize;
  var endIndex = startIndex + pageSize;
  var pagedItems = filtered.slice(startIndex, endIndex);

  return respond_({ 
    ok: true, 
    items: pagedItems, 
    total: total, 
    page: page, 
    pageSize: pageSize 
  }, 200, e);
}

function doOptions(e) {
  return respond_({ ok: true, options: true, action: getAction(e) }, 200, e);
}

function isPreflight_(e) {
  if (!e || !e.parameter) return false;
  var method = String(e.parameter._method || e.parameter.method || '').toUpperCase();
  return method === 'OPTIONS';
}

function getAction(e) {
  return (e && e.parameter && e.parameter.action) ? String(e.parameter.action).toLowerCase() : '';
}

function jsonResponse(obj, statusCode) {
  obj.status = statusCode;
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function respond_(obj, statusCode, e) {
  if (wantsPostMessage_(e)) {
    return postMessageResponse_(obj, statusCode, e);
  }
  var callback = getJsonpCallback_(e);
  if (!callback) {
    return jsonResponse(obj, statusCode);
  }
  obj.status = statusCode;
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(obj) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getJsonpCallback_(e) {
  var callback = e && e.parameter ? String(e.parameter.callback || '') : '';
  if (!callback) return '';
  return /^[A-Za-z_$][0-9A-Za-z_$.]{0,63}$/.test(callback) ? callback : '';
}

function wantsPostMessage_(e) {
  return e && e.parameter && String(e.parameter.transport || '').toLowerCase() === 'postmessage';
}

function postMessageResponse_(obj, statusCode, e) {
  obj.status = statusCode;
  var targetOrigin = e && e.parameter ? String(e.parameter.targetOrigin || '*') : '*';
  var requestId = e && e.parameter ? String(e.parameter.requestId || '') : '';
  var payload = JSON.stringify({
    source: 'mybuddy-gas',
    requestId: requestId,
    payload: obj
  }).replace(/</g, '\\u003c');
  var html = ''
    + '<!doctype html><html><head><meta charset="utf-8"></head><body>'
    + '<script>'
    + 'var message=' + payload + ';'
    + 'if(window.opener&&window.opener!==window){window.opener.postMessage(message,' + JSON.stringify(targetOrigin) + ');}'
    + 'window.close();'
    + '</script>'
    + '</body></html>';
  return HtmlService.createHtmlOutput(html);
}

function parsePostPayload_(e) {
  var raw = e && e.postData && typeof e.postData.contents === 'string' ? e.postData.contents : '';
  var type = e && e.postData && e.postData.type ? String(e.postData.type).toLowerCase() : '';
  // Accept both application/json and text/plain (text/plain avoids CORS preflight)
  if (raw && (type.indexOf('application/json') !== -1 || type.indexOf('text/plain') !== -1)) {
    return JSON.parse(raw);
  }
  var payload = {};
  var params = (e && e.parameter) || {};
  CONFIG.HEADERS.forEach(function (key) {
    if (!(key in params)) return;
    if (key === 'tags') {
      payload.tags = String(params.tags || '')
        .split(',')
        .map(function (item) { return item.trim(); })
        .filter(Boolean);
      return;
    }
    payload[key] = params[key];
  });
  return payload;
}
