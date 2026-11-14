/* =====================================================================
   localdb.js — قاعدة بيانات الوضع التجريبي (داخل المتصفح فقط)
   تُستخدم تلقائياً عندما يكون API_URL فارغاً في config.js
   ===================================================================== */
var LocalDB = (function () {
  var P = 'rvdemo:';
  function load(n) { try { return JSON.parse(localStorage.getItem(P + n) || '[]'); } catch (e) { return []; } }
  function save(n, v) { localStorage.setItem(P + n, JSON.stringify(v)); }
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var msg = unescape(encodeURIComponent(ascii)), words = [], hash = [], k = [], isC = {}, i, j;
    for (var c = 2; hash.length < 64; c++) { if (!isC[c]) { for (i = 0; i < 313; i += c) isC[i] = c; hash.push((Math.pow(c, .5) * 4294967296) | 0); k.push((Math.pow(c, 1 / 3) * 4294967296) | 0); } }
    hash = hash.slice(0, 8);
    msg += '\x80'; while (msg.length % 64 - 56) msg += '\x00';
    for (i = 0; i < msg.length; i++) { j = msg.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
    var bitLen = (unescape(encodeURIComponent(ascii)).length) * 8;
    words[words.length] = ((bitLen / 4294967296) | 0); words[words.length] = bitLen;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = hash.slice(0); hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    var out = ''; for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; out += (b < 16 ? '0' : '') + b.toString(16); }
    return out;
  }
  function cacheAll() { try { return JSON.parse(localStorage.getItem(P + '_cache') || '{}'); } catch (e) { return {}; } }
  return {
    rows: function (n) { return load(n); },
    insert: function (n, o) { var r = load(n); var c = {}; Core.HEAD[n].forEach(function (h) { c[h] = o[h] == null ? '' : String(o[h]); }); r.push(c); save(n, r); },
    update: function (n, key, val, patch) { var r = load(n), ok = false; r.forEach(function (x) { if (String(x[key]) === String(val)) { for (var k in patch) x[k] = patch[k] == null ? '' : String(patch[k]); ok = true; } }); save(n, r); return ok; },
    remove: function (n, key, val) { save(n, load(n).filter(function (x) { return String(x[key]) !== String(val); })); },
    replaceAll: function (n, list) { save(n, list.map(function (o) { var c = {}; Core.HEAD[n].forEach(function (h) { c[h] = o[h] == null ? '' : String(o[h]); }); return c; })); },
    lock: function (fn) { return fn(); },
    cacheGet: function (k) { var c = cacheAll(); var e = c[k]; if (!e || e.exp < Date.now()) return null; return e.v; },
    cachePut: function (k, v, ttl) { var c = cacheAll(); c[k] = { v: v, exp: Date.now() + (ttl || 21600) * 1000 }; localStorage.setItem(P + '_cache', JSON.stringify(c)); },
    cacheDel: function (k) { var c = cacheAll(); delete c[k]; localStorage.setItem(P + '_cache', JSON.stringify(c)); },
    sha256: sha256,
    uuid: function () { return (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (ch) { var r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16); })); },
    now: function () { return Date.now(); },
    resetAll: function () { Object.keys(localStorage).filter(function (k) { return k.indexOf(P) === 0 || k.indexOf('rvatt:') === 0; }).forEach(function (k) { localStorage.removeItem(k); }); },
    isSeeded: function () { return !!localStorage.getItem(P + '_seeded'); },
    markSeeded: function () { localStorage.setItem(P + '_seeded', '1'); }
  };
})();
