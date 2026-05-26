function isPreflight_(e) {
  if (!e || !e.parameter) return false;
  var method = String(e.parameter._method || e.parameter.method || '').toUpperCase();
  return method === 'OPTIONS';
}

function getPath(e) {
  return (e && e.pathInfo ? '/' + e.pathInfo : '/').toLowerCase();
}

function jsonResponse(obj, statusCode) {
  obj.status = statusCode;
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function respond_(obj, statusCode, e) {
  var callback = getJsonpCallback_(e);
  if (!callback) {
    return jsonResponse(obj, statusCode);
  }
  obj.status = statusCode;
  return ContentService.createTextOutput(
    callback + '(' + JSON.stringify(obj) + ');'
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getJsonpCallback_(e) {
  var callback = e && e.parameter ? String(e.parameter.callback || '') : '';
  if (!callback) return '';
  return /^[A-Za-z_$][0-9A-Za-z_$.]{0,63}$/.test(callback) ? callback : '';
}
