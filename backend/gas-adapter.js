/* =====================================================================
   محوّل Google Sheets و Drive — يُدمج مع core.js في ملف Code.gs
   ===================================================================== */
var GasDB = (function () {
  var ss = null, memo = {}, lockDepth = 0, checked = {};
  function book() { if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet(); return ss; }
  function sheet(name) {
    var sh = book().getSheetByName(name), h = Core.HEAD[name];
    if (!sh) {
      sh = book().insertSheet(name);
      sh.getRange(1, 1, sh.getMaxRows(), h.length).setNumberFormat('@');
      sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#e8eef6');
      sh.setFrozenRows(1);
      checked[name] = 1;
    } else if (!checked[name]) {
      // ترقية الأوراق القديمة: إضافة الأعمدة الجديدة إلى صف العناوين دون المساس بالبيانات
      checked[name] = 1;
      var lc = Math.max(1, sh.getLastColumn()), cur = sh.getRange(1, 1, 1, Math.max(lc, h.length)).getDisplayValues()[0];
      var need = h.some(function (x, i) { return cur[i] !== x; });
      if (need) {
        if (sh.getMaxColumns() < h.length) sh.insertColumnsAfter(sh.getMaxColumns(), h.length - sh.getMaxColumns());
        sh.getRange(1, 1, sh.getMaxRows(), h.length).setNumberFormat('@');
        sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#e8eef6');
      }
    }
    return sh;
  }
  function toRow(name, o) { return Core.HEAD[name].map(function (h) { var v = o[h]; return v == null ? '' : String(v); }); }
  function rows(name) {
    if (memo[name]) return memo[name];
    var sh = sheet(name), h = Core.HEAD[name], lr = sh.getLastRow(), out = [];
    if (lr > 1) {
      var v = sh.getRange(2, 1, lr - 1, h.length).getDisplayValues();
      for (var i = 0; i < v.length; i++) { var o = { _r: i + 2 }; for (var j = 0; j < h.length; j++) o[h[j]] = v[i][j]; out.push(o); }
    }
    memo[name] = out; return out;
  }
  function insertMany(name, list) {
    if (!list || !list.length) return;
    lock(function () {
      var sh = sheet(name), n = Core.HEAD[name].length, r = sh.getLastRow() + 1;
      sh.getRange(r, 1, list.length, n).setNumberFormat('@').setValues(list.map(function (o) { return toRow(name, o); }));
      memo[name] = null;
    });
  }
  function insert(name, o) { insertMany(name, [o]); }
  function update(name, key, val, patch) {
    var list = rows(name), row = null;
    for (var i = 0; i < list.length; i++) if (String(list[i][key]) === String(val)) { row = list[i]; break; }
    if (!row) return false;
    for (var k in patch) row[k] = patch[k] == null ? '' : String(patch[k]);
    sheet(name).getRange(row._r, 1, 1, Core.HEAD[name].length).setNumberFormat('@').setValues([toRow(name, row)]);
    return true;
  }
  // حفظ مجموعة صفوف معدّلة (من rows) — تُجمع الصفوف المتتالية في عملية كتابة واحدة، ويمكن تحديد أعمدة بعينها
  function saveRows(name, list, key, fields) {
    if (!list || !list.length) return;
    var h = Core.HEAD[name], all = rows(name), idx = {};
    all.forEach(function (r) { idx[String(r[key])] = r; });
    var cols = fields && fields.length ? fields.map(function (f) { return h.indexOf(f); }).filter(function (i) { return i >= 0; }) : h.map(function (x, i) { return i; });
    var c0 = Math.min.apply(null, cols), c1 = Math.max.apply(null, cols), span = h.slice(c0, c1 + 1);
    var items = list.map(function (o) { var r = o._r ? o : idx[String(o[key])]; if (!r) return null; if (r !== o) span.forEach(function (f) { r[f] = o[f] == null ? '' : String(o[f]); }); return r; }).filter(Boolean).sort(function (a, b) { return a._r - b._r; });
    var sh = sheet(name), i = 0;
    while (i < items.length) {
      var j = i; while (j + 1 < items.length && items[j + 1]._r === items[j]._r + 1) j++;
      var block = items.slice(i, j + 1).map(function (r) { return span.map(function (f) { var v = r[f]; return v == null ? '' : String(v); }); });
      sh.getRange(items[i]._r, c0 + 1, block.length, span.length).setNumberFormat('@').setValues(block);
      i = j + 1;
    }
  }
  function remove(name, key, val) {
    var list = rows(name);
    for (var i = list.length - 1; i >= 0; i--) if (String(list[i][key]) === String(val)) sheet(name).deleteRow(list[i]._r);
    memo[name] = null;
  }
  function replaceAll(name, list) {
    var sh = sheet(name), n = Core.HEAD[name].length, lr = sh.getLastRow();
    if (lr > 1) sh.getRange(2, 1, lr - 1, n).clearContent();
    if (list.length) sh.getRange(2, 1, list.length, n).setNumberFormat('@').setValues(list.map(function (o) { return toRow(name, o); }));
    memo[name] = null;
  }
  function lock(fn) {
    if (lockDepth > 0) return fn();
    var l = LockService.getScriptLock(); l.waitLock(30000); lockDepth++; memo = {};
    try { return fn(); } finally { lockDepth--; SpreadsheetApp.flush(); l.releaseLock(); }
  }
  /* ---------------- صور الرسوم في Google Drive ---------------- */
  var props = PropertiesService.getScriptProperties();
  function folder() {
    var id = props.getProperty('TT_FOLDER'), f = null;
    if (id) { try { f = DriveApp.getFolderById(id); if (f.isTrashed()) f = null; } catch (e) { f = null; } }
    if (!f) {
      var parent = null; try { var ps = DriveApp.getFileById(book().getId()).getParents(); if (ps.hasNext()) parent = ps.next(); } catch (e) { }
      f = (parent || DriveApp.getRootFolder()).createFolder('صور اختبار التفكير الإبداعي');
      props.setProperty('TT_FOLDER', f.getId());
    }
    return f;
  }
  function saveImage(mime, b64, name) {
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, name);
    var file = folder().createFile(blob);
    return { fileId: file.getId() };
  }
  function loadImage(row) {
    if (row.data) { var m = String(row.data).match(/^data:([^;]+);base64,(.*)$/); return m ? { mime: m[1], data: m[2] } : null; }
    if (!row.fileId) return null;
    var b = DriveApp.getFileById(row.fileId).getBlob();
    return { mime: b.getContentType() || row.mime || 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) };
  }
  /* ---------------- المشغّل الزمني للتصحيح التلقائي ---------------- */
  function trigger(op) {
    var list = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'processAiQueue'; });
    if (op === 'install') { if (!list.length) ScriptApp.newTrigger('processAiQueue').timeBased().everyMinutes(5).create(); return 'مفعّل'; }
    if (op === 'remove') { list.forEach(function (t) { ScriptApp.deleteTrigger(t); }); return 'متوقف'; }
    return list.length ? 'مفعّل' : 'متوقف';
  }
  var cache = CacheService.getScriptCache();
  return {
    rows: rows, insert: insert, insertMany: insertMany, update: update, saveRows: saveRows, remove: remove, replaceAll: replaceAll, lock: lock,
    cacheGet: function (k) { var v = cache.get(k); return v ? JSON.parse(v) : null; },
    cachePut: function (k, v, ttl) { cache.put(k, JSON.stringify(v), Math.min(21600, ttl || 21600)); },
    cacheDel: function (k) { cache.remove(k); },
    secretGet: function (k) { return props.getProperty(k) || ''; },
    secretSet: function (k, v) { if (v === '' || v == null) props.deleteProperty(k); else props.setProperty(k, String(v)); },
    saveImage: saveImage, loadImage: loadImage, trigger: trigger,
    http: function (url, o) {
      o = o || {};
      var r = UrlFetchApp.fetch(url, { method: o.method || 'get', contentType: 'application/json', headers: o.headers || {}, payload: o.payload, muteHttpExceptions: true });
      return { code: r.getResponseCode(), text: r.getContentText() };
    },
    sleep: function (ms) { Utilities.sleep(ms); },
    sha256: function (s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8).map(function (b) { b = b < 0 ? b + 256 : b; return (b < 16 ? '0' : '') + b.toString(16); }).join(''); },
    uuid: function () { return Utilities.getUuid(); },
    now: function () { return Date.now(); }
  };
})();
Core.init(GasDB);

function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents); } catch (x) { }
  var res = Core.handle(p.action, p);
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'نظام الكشف عن الموهوبين (المصفوفات + التفكير الإبداعي)', version: Core.VERSION })).setMimeType(ContentService.MimeType.JSON);
}
/* شغّل هذه الدالة مرة واحدة من محرر Apps Script لإنشاء الأوراق وحساب المدير ومنح الصلاحيات */
function setup() {
  Object.keys(Core.HEAD).forEach(function (n) { GasDB.rows(n); });
  var r = Core.handle('ping', {});
  // لمس الخدمات حتى يطلب Google صلاحياتها مرة واحدة: Drive للصور، والاتصال الخارجي لـ Gemini، والمشغلات الزمنية
  try { DriveApp.getRootFolder(); } catch (e) { }
  try { UrlFetchApp.getRequest('https://generativelanguage.googleapis.com/'); } catch (e) { }
  try { ScriptApp.getProjectTriggers(); } catch (e) { }
  Logger.log('تم التجهيز. حساب المدير: admin  /  كلمة المرور المؤقتة: Admin@2026');
  return r;
}
/* يستدعيها المشغّل الزمني كل 5 دقائق: تصحيح الإجابات بالذكاء الاصطناعي ثم تحديث الأصالة */
function processAiQueue() {
  var H = Core.hook();
  var r = H.processQueue ? H.processQueue(4.5 * 60 * 1000) : null;
  try { if (GasDB.secretGet('ttDirty') === '1' && H.recalcAll) H.recalcAll(); } catch (e) { }
  Logger.log(JSON.stringify(r));
  return r;
}
/* تشغيل يدوي لاختبار الاتصال بـ Gemini من المحرر */
function testGemini() {
  var key = GasDB.secretGet('GEMINI_KEY');
  if (!key) { Logger.log('لا يوجد مفتاح. أضفه من صفحة الإعدادات في الموقع.'); return; }
  var r = GasDB.http('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
  Logger.log(r.code + ' ' + r.text.slice(0, 500));
}
