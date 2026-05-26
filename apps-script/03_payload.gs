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

function parsePostPayload_(e) {
  var raw = e && e.postData && typeof e.postData.contents === 'string' ? e.postData.contents : '';
  var type = e && e.postData && e.postData.type ? String(e.postData.type).toLowerCase() : '';
  if (raw && type.indexOf('application/json') !== -1) {
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
