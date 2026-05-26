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

function ensureSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CONFIG.HEADERS);
  } else {
    var range = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
    var current = range.getValues()[0];
    var mismatch = CONFIG.HEADERS.some(function (header, index) {
      return current[index] !== header;
    });
    if (mismatch) range.setValues([CONFIG.HEADERS]);
  }

  return sheet;
}
