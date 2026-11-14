/* =====================================================================
   core.js — منطق الخادم المشترك (يعمل في Google Apps Script وفي الوضع التجريبي)
   لا تعدّل هذا الملف في Apps Script مباشرة؛ ملف Code.gs يحتوي نسخة منه
   ===================================================================== */
var Core = (function () {
  'use strict';
  var DB = null;
  var VERSION = '1.1';

  var HEAD = {
    Users: ['username', 'name', 'role', 'salt', 'hash', 'classes', 'active', 'mustChange', 'created', 'lastLogin'],
    Students: ['studentId', 'name', 'gender', 'grade', 'className', 'track', 'dob', 'active'],
    Sessions: ['code', 'title', 'stage', 'formMode', 'classes', 'timeLimit', 'showResult', 'allowRetake', 'status', 'createdBy', 'createdAt', 'closedAt', 'counter', 'test', 'battery', 'drawMode'],
    Attempts: ['attemptId', 'code', 'studentId', 'stage', 'form', 'status', 'startedAt', 'lastSeen', 'progress', 'answers', 'times', 'stoken', 'submittedAt'],
    Results: ['resultId', 'attemptId', 'code', 'studentId', 'name', 'gender', 'grade', 'className', 'track', 'dob', 'ageMonths', 'stage', 'form', 'score', 'maxScore', 'sets', 'setI', 'timeSec', 'rapid', 'answers', 'correct', 'status', 'submittedAt', 'overtime', 'keyVersion'],
    Keys: ['stage', 'form', 'version', 'key', 'checksum', 'uploadedAt'],
    Settings: ['key', 'value'],
    Log: ['ts', 'user', 'action', 'detail'],
    // اختبار التفكير الإبداعي (على نمط تورانس)
    TAttempts: ['attemptId', 'code', 'studentId', 'stage', 'battery', 'form', 'status', 'startedAt', 'lastSeen', 'actIdx', 'actStart', 'data', 'stoken', 'submittedAt', 'mode'],
    TResults: ['resultId', 'attemptId', 'code', 'studentId', 'name', 'gender', 'grade', 'className', 'track', 'dob', 'ageMonths', 'stage', 'battery', 'form', 'status', 'scoredBy', 'fluency', 'flexibility', 'originality', 'elaboration', 'abstractness', 'closure', 'bonus', 'strengths', 'acts', 'provisional', 'timeSec', 'mode', 'submittedAt', 'scoredAt', 'aiModel', 'note'],
    TResponses: ['rid', 'resultId', 'studentId', 'grade', 'stage', 'form', 'battery', 'act', 'item', 'text', 'title', 'valid', 'dupOf', 'cat', 'key', 'rarityAI', 'orig', 'origProv', 'freq', 'elab', 'abstr', 'closure', 'cells', 'src', 'conf', 'flags', 'human', 'origLock'],
    TJobs: ['jobId', 'resultId', 'kind', 'status', 'tries', 'error', 'createdAt', 'doneAt', 'model', 'nextAt'],
    TImages: ['imageId', 'attemptId', 'act', 'fileId', 'mime', 'data', 'createdAt']
  };

  var STAGE = {
    primary: { sets: [['A', 12], ['AB', 12], ['B', 12]], scored: ['A', 'AB', 'B'], max: 36, n: 36, time: 35, grades: [1, 6] },
    intermediate: { sets: [['A', 12], ['B', 12], ['C', 12], ['D', 12], ['E', 12]], scored: ['A', 'B', 'C', 'D', 'E'], max: 60, n: 60, time: 45, grades: [7, 9] },
    secondary: { sets: [['I', 12], ['II', 36]], scored: ['II'], max: 36, n: 48, time: 50, grades: [10, 12] }
  };
  var DEFAULT_SETTINGS = { schoolName: 'مدارس دار الذكر', giftedPct: '90', minNorm: '30', retakeDefault: '0', showResultDefault: '0', ttGiftedPct: '90', ttMinOrig: '40', aiEnabled: '1', aiModel: '', aiPace: '5', aiDailyMax: '250' };
  var ROLES = { admin: 'مدير النظام', coordinator: 'منسق الموهبة', teacher: 'معلم / مراقب' };
  var STAFF_TTL = 6 * 3600, STUDENT_TTL = 6 * 3600;

  function stageOfGrade(g) { g = Number(g); if (g <= 6) return 'primary'; if (g <= 9) return 'intermediate'; return 'secondary'; }
  function now() { return DB.now(); }
  function err(msg, code) { var e = new Error(msg); e.code = code || 'error'; throw e; }
  function str(v) { return v == null ? '' : String(v).trim(); }
  function bool(v) { return v === true || v === 'true' || v === '1' || v === 1; }
  function splitList(s) { return str(s).split(/[,،]/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function find(table, field, val) { var r = DB.rows(table); for (var i = 0; i < r.length; i++) if (str(r[i][field]) === str(val)) return r[i]; return null; }
  function settings() { var o = {}; for (var k in DEFAULT_SETTINGS) o[k] = DEFAULT_SETTINGS[k]; DB.rows('Settings').forEach(function (r) { o[r.key] = str(r.value); }); return o; }
  function log(user, action, detail) { try { DB.insert('Log', { ts: now(), user: user || '', action: action, detail: typeof detail === 'string' ? detail : JSON.stringify(detail || '') }); } catch (e) { } }
  function randCode(n, alpha) { alpha = alpha || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; var s = ''; var u = DB.uuid().replace(/-/g, ''); for (var i = 0; i < n; i++) { s += alpha[parseInt(u.substr(i * 2, 2), 16) % alpha.length]; } return s; }
  function hashPw(salt, pw) { return DB.sha256(salt + ':' + pw); }
  function publicUser(u) { return { username: u.username, name: u.name, role: u.role, roleName: ROLES[u.role] || u.role, classes: splitList(u.classes), active: bool(u.active), mustChange: bool(u.mustChange), lastLogin: u.lastLogin }; }

  /* ---------------- التهيئة ---------------- */
  function ensureSetup() {
    if (DB.rows('Users').length) return false;
    var salt = randCode(12);
    DB.insert('Users', { username: 'admin', name: 'مدير النظام', role: 'admin', salt: salt, hash: hashPw(salt, 'Admin@2026'), classes: '', active: '1', mustChange: '1', created: now(), lastLogin: '' });
    log('system', 'setup', 'إنشاء حساب المدير الافتراضي');
    return true;
  }

  /* ---------------- الجلسات والصلاحيات ---------------- */
  function staffAuth(token) {
    if (!token) err('انتهت الجلسة، سجّل الدخول من جديد', 'auth');
    var s = DB.cacheGet('T:' + token);
    if (!s) err('انتهت الجلسة، سجّل الدخول من جديد', 'auth');
    DB.cachePut('T:' + token, s, STAFF_TTL);
    return s;
  }
  function need(s, roles) { if (roles.indexOf(s.role) < 0) err('ليست لديك صلاحية لهذا الإجراء', 'forbidden'); }
  function isAll(s) { return s.role === 'admin' || s.role === 'coordinator'; }
  function canSeeSession(s, ses) {
    if (isAll(s)) return true;
    if (ses.createdBy === s.username) return true;
    var cls = splitList(ses.classes); if (!cls.length) return false;
    return cls.every(function (c) { return s.classes.indexOf(c) >= 0; });
  }

  /* ---------------- تسجيل الدخول للمنسوبين ---------------- */
  function login(p) {
    var un = str(p.username).toLowerCase(), pw = str(p.password);
    if (!un || !pw) err('أدخل اسم المستخدم وكلمة المرور');
    var fk = 'F:' + un, fails = Number(DB.cacheGet('F:' + un) || 0);
    if (fails >= 8) err('تم إيقاف الدخول مؤقتاً بعد محاولات خاطئة متكررة. حاول بعد 10 دقائق');
    var u = find('Users', 'username', un);
    if (!u || !bool(u.active) || hashPw(u.salt, pw) !== u.hash) { DB.cachePut(fk, String(fails + 1), 600); err('اسم المستخدم أو كلمة المرور غير صحيحة'); }
    DB.cacheDel(fk);
    var token = DB.uuid() + DB.uuid().slice(0, 8);
    var s = { username: u.username, name: u.name, role: u.role, classes: splitList(u.classes) };
    DB.cachePut('T:' + token, s, STAFF_TTL);
    DB.update('Users', 'username', u.username, { lastLogin: now() });
    log(u.username, 'login', '');
    return { token: token, user: publicUser(u) };
  }
  function changePassword(p) {
    var s = staffAuth(p.token); var u = find('Users', 'username', s.username);
    if (hashPw(u.salt, str(p.oldPassword)) !== u.hash) err('كلمة المرور الحالية غير صحيحة');
    var np = str(p.newPassword); if (np.length < 8) err('كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف');
    var salt = randCode(12);
    DB.update('Users', 'username', u.username, { salt: salt, hash: hashPw(salt, np), mustChange: '0' });
    log(s.username, 'changePassword', '');
    return { user: publicUser(find('Users', 'username', s.username)) };
  }

  /* ---------------- البيانات العامة ---------------- */
  function getMeta(p) {
    var s = staffAuth(p.token);
    var u = find('Users', 'username', s.username);
    var classes = {};
    DB.rows('Students').forEach(function (st) {
      if (!bool(st.active === '' ? '1' : st.active)) return;
      var c = str(st.className); if (!c) return;
      if (!isAll(s) && s.classes.indexOf(c) < 0) return;
      if (!classes[c]) classes[c] = { name: c, count: 0, grade: Number(st.grade), stage: stageOfGrade(st.grade), gender: st.gender, track: st.track };
      classes[c].count++;
    });
    var keys = DB.rows('Keys');
    return { user: publicUser(u), settings: settings(), classes: Object.keys(classes).map(function (k) { return classes[k]; }).sort(function (a, b) { return a.grade - b.grade || (a.name < b.name ? -1 : 1); }), keys: { count: keys.length, version: keys.length ? keys[0].version : '', uploadedAt: keys.length ? keys[0].uploadedAt : '' }, roles: ROLES, version: VERSION, features: ['torrance'], tt: HOOK.meta ? HOOK.meta(s) : null };
  }

  /* ---------------- المستخدمون (المدير فقط) ---------------- */
  function listUsers(p) { var s = staffAuth(p.token); need(s, ['admin']); return { users: DB.rows('Users').map(publicUser) }; }
  function saveUser(p) {
    var s = staffAuth(p.token); need(s, ['admin']);
    var d = p.user || {}; var un = str(d.username).toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(un)) err('اسم المستخدم: 3–30 حرفاً إنجليزياً أو أرقاماً أو . _ -');
    if (!ROLES[d.role]) err('الدور غير صحيح');
    if (!str(d.name)) err('أدخل الاسم');
    var ex = find('Users', 'username', un);
    var patch = { name: str(d.name), role: d.role, classes: (d.classes || []).join(','), active: d.active === false ? '0' : '1' };
    if (ex) {
      if (un === s.username && (d.role !== 'admin' || d.active === false)) err('لا يمكنك إزالة صلاحية المدير أو تعطيل حسابك');
      if (str(d.password)) { if (str(d.password).length < 8) err('كلمة المرور 8 أحرف على الأقل'); patch.salt = randCode(12); patch.hash = hashPw(patch.salt, str(d.password)); patch.mustChange = '1'; }
      DB.update('Users', 'username', un, patch);
    } else {
      if (str(d.password).length < 8) err('كلمة المرور 8 أحرف على الأقل');
      patch.username = un; patch.salt = randCode(12); patch.hash = hashPw(patch.salt, str(d.password)); patch.mustChange = '1'; patch.created = now(); patch.lastLogin = '';
      DB.insert('Users', patch);
    }
    log(s.username, ex ? 'updateUser' : 'createUser', un);
    return { users: DB.rows('Users').map(publicUser) };
  }
  function deleteUser(p) {
    var s = staffAuth(p.token); need(s, ['admin']);
    var un = str(p.username).toLowerCase(); if (un === s.username) err('لا يمكنك حذف حسابك');
    DB.remove('Users', 'username', un); log(s.username, 'deleteUser', un);
    return { users: DB.rows('Users').map(publicUser) };
  }

  /* ---------------- الطلاب ---------------- */
  function listStudents(p) {
    var s = staffAuth(p.token);
    var rows = DB.rows('Students');
    if (!isAll(s)) rows = rows.filter(function (r) { return s.classes.indexOf(str(r.className)) >= 0; });
    return { students: rows };
  }
  function importStudents(p) {
    var s = staffAuth(p.token); need(s, ['admin', 'coordinator']);
    var list = p.students || []; if (!list.length) err('لا توجد بيانات');
    var added = 0, updated = 0, bad = [];
    var res = DB.lock(function () {
      var rows = DB.rows('Students').map(function (r) { var o = {}; HEAD.Students.forEach(function (h) { o[h] = r[h]; }); return o; });
      var idx = {}; rows.forEach(function (r, i) { idx[str(r.studentId)] = i; });
      list.forEach(function (d, n) {
        var id = str(d.studentId), g = Number(d.grade);
        if (!id || !str(d.name) || !(g >= 1 && g <= 12) || !str(d.className)) { bad.push(n + 1); return; }
        var o = { studentId: id, name: str(d.name), gender: str(d.gender), grade: String(g), className: str(d.className), track: str(d.track) || 'عام', dob: str(d.dob), active: d.active === false || d.active === '0' ? '0' : '1' };
        if (idx[id] != null) { rows[idx[id]] = o; updated++; } else { idx[id] = rows.length; rows.push(o); added++; }
      });
      if (p.replace) { var keep = {}; list.forEach(function (d) { keep[str(d.studentId)] = 1; }); rows = rows.filter(function (r) { return keep[str(r.studentId)]; }); }
      DB.replaceAll('Students', rows);
      return { added: added, updated: updated, bad: bad, total: rows.length };
    });
    log(s.username, 'importStudents', { added: added, updated: updated });
    return res;
  }
  function deleteStudent(p) { var s = staffAuth(p.token); need(s, ['admin']); DB.remove('Students', 'studentId', str(p.studentId)); log(s.username, 'deleteStudent', p.studentId); return {}; }

  /* ---------------- جلسات الاختبار ---------------- */
  function isTT(ses) { return ses && ses.test === 'torrance'; }
  function sessionView(ses) {
    var att = DB.rows(isTT(ses) ? 'TAttempts' : 'Attempts').filter(function (a) { return a.code === ses.code; });
    return { code: ses.code, title: ses.title, stage: ses.stage, formMode: ses.formMode, classes: splitList(ses.classes), timeLimit: Number(ses.timeLimit), showResult: bool(ses.showResult), allowRetake: bool(ses.allowRetake), status: ses.status, createdBy: ses.createdBy, createdAt: Number(ses.createdAt), closedAt: ses.closedAt ? Number(ses.closedAt) : '', started: att.length, submitted: att.filter(function (a) { return a.status === 'submitted'; }).length, test: isTT(ses) ? 'torrance' : 'raven', battery: ses.battery || '', drawMode: ses.drawMode || '' };
  }
  function listSessions(p) {
    var s = staffAuth(p.token);
    var list = DB.rows('Sessions').filter(function (x) { return canSeeSession(s, x); }).map(sessionView);
    list.sort(function (a, b) { return b.createdAt - a.createdAt; });
    return { sessions: list };
  }
  function createSession(p) {
    var s = staffAuth(p.token); var d = p.session || {};
    if (!STAGE[d.stage]) err('اختر المرحلة');
    var classes = (d.classes || []).map(str).filter(Boolean);
    if (s.role === 'teacher') {
      if (!classes.length) err('اختر فصلاً واحداً على الأقل من فصولك');
      classes.forEach(function (c) { if (s.classes.indexOf(c) < 0) err('الفصل ' + c + ' ليس من فصولك'); });
    }
    var fm = str(d.formMode) || 'rotate'; if (['rotate', '1', '2', '3', '4'].indexOf(fm) < 0) err('النموذج غير صحيح');
    var tt = d.test === 'torrance', bat = str(d.battery), dm = str(d.drawMode) || 'both';
    if (tt) { if (['verbal', 'figural'].indexOf(bat) < 0) err('اختر صورة الاختبار (لفظية أو شكلية)'); if (['screen', 'paper', 'both'].indexOf(dm) < 0) dm = 'both'; }
    var tl = Number(d.timeLimit); if (tt) tl = tl > 0 ? (bat === 'verbal' ? 45 : 30) : 0; else if (!(tl >= 0 && tl <= 180)) tl = STAGE[d.stage].time;
    var code; do { code = randCode(6); } while (find('Sessions', 'code', code));
    var row = { code: code, title: str(d.title) || 'جلسة اختبار', stage: d.stage, formMode: fm, classes: classes.join(','), timeLimit: String(tl), showResult: !tt && d.showResult ? '1' : '0', allowRetake: (d.allowRetake && s.role !== 'teacher') ? '1' : '0', status: 'open', createdBy: s.username, createdAt: now(), closedAt: '', counter: '0', test: tt ? 'torrance' : '', battery: tt ? bat : '', drawMode: tt && bat === 'figural' ? dm : '' };
    DB.insert('Sessions', row); log(s.username, 'createSession', code);
    return { session: sessionView(row) };
  }
  function setSessionStatus(p) {
    var s = staffAuth(p.token); var ses = find('Sessions', 'code', str(p.code).toUpperCase());
    if (!ses || !canSeeSession(s, ses)) err('الجلسة غير موجودة');
    var st = p.status === 'open' ? 'open' : 'closed';
    DB.update('Sessions', 'code', ses.code, { status: st, closedAt: st === 'closed' ? now() : '' });
    log(s.username, 'session_' + st, ses.code);
    return { session: sessionView(find('Sessions', 'code', ses.code)) };
  }
  function monitor(p) {
    var s = staffAuth(p.token); var ses = find('Sessions', 'code', str(p.code).toUpperCase());
    if (!ses || !canSeeSession(s, ses)) err('الجلسة غير موجودة');
    if (isTT(ses)) return HOOK.monitor(s, ses);
    var studs = {}; DB.rows('Students').forEach(function (x) { studs[str(x.studentId)] = x; });
    var att = DB.rows('Attempts').filter(function (a) { return a.code === ses.code; }).map(function (a) {
      var st = studs[str(a.studentId)] || {};
      return { attemptId: a.attemptId, studentId: a.studentId, name: st.name || '', className: st.className || '', form: Number(a.form), status: a.status, startedAt: Number(a.startedAt), lastSeen: Number(a.lastSeen), progress: Number(a.progress || 0), submittedAt: a.submittedAt ? Number(a.submittedAt) : '' };
    });
    var cls = splitList(ses.classes); var expected = [];
    DB.rows('Students').forEach(function (x) {
      if (!bool(x.active === '' ? '1' : x.active)) return;
      if (cls.length ? cls.indexOf(str(x.className)) >= 0 : stageOfGrade(x.grade) === ses.stage) expected.push({ studentId: x.studentId, name: x.name, className: x.className });
    });
    return { session: sessionView(ses), attempts: att, expected: expected, items: STAGE[ses.stage].n, serverNow: now() };
  }

  /* ---------------- الطالب ---------------- */
  function studentLogin(p) {
    var sid = str(p.studentId), code = str(p.code).toUpperCase();
    if (!sid || !code) err('أدخل رقم الطالب ورمز الجلسة');
    return DB.lock(function () {
      var ses = find('Sessions', 'code', code);
      if (!ses) err('رمز الجلسة غير صحيح');
      if (ses.status !== 'open') err('هذه الجلسة مغلقة، راجع المعلم');
      var st = find('Students', 'studentId', sid);
      if (!st || str(st.active) === '0') err('رقم الطالب غير مسجّل، راجع المعلم');
      var cls = splitList(ses.classes);
      if (cls.length ? cls.indexOf(str(st.className)) < 0 : stageOfGrade(st.grade) !== ses.stage) err('هذه الجلسة ليست مخصصة لفصلك');
      if (isTT(ses)) return HOOK.studentLogin(ses, st, sid, code);
      var atts = DB.rows('Attempts');
      var mine = atts.filter(function (a) { return a.code === code && str(a.studentId) === sid; })[0];
      var stoken = DB.uuid();
      if (mine) {
        if (mine.status === 'submitted') err('سبق أن سلّمت هذا الاختبار. شكراً لك');
        DB.update('Attempts', 'attemptId', mine.attemptId, { stoken: stoken, lastSeen: now() });
      } else {
        var prev = DB.rows('Results').filter(function (r) { return str(r.studentId) === sid && r.stage === ses.stage && r.status !== 'void'; });
        if (prev.length && !bool(ses.allowRetake)) err('سبق لك أداء اختبار هذه المرحلة. راجع منسق الموهبة إن كانت هناك حاجة لإعادته');
        var used = prev.map(function (r) { return Number(r.form); });
        var form;
        var counter = Number(ses.counter || 0);
        if (ses.formMode === 'rotate') { var cand = [1, 2, 3, 4].filter(function (f) { return used.indexOf(f) < 0; }); if (!cand.length) cand = [1, 2, 3, 4]; form = cand[counter % cand.length]; }
        else { form = Number(ses.formMode); if (used.indexOf(form) >= 0) { var alt = [1, 2, 3, 4].filter(function (f) { return used.indexOf(f) < 0; }); if (alt.length) form = alt[0]; } }
        DB.update('Sessions', 'code', code, { counter: String(counter + 1) });
        mine = { attemptId: DB.uuid(), code: code, studentId: sid, stage: ses.stage, form: String(form), status: 'in_progress', startedAt: now(), lastSeen: now(), progress: '0', answers: '', times: '', stoken: stoken, submittedAt: '' };
        DB.insert('Attempts', mine);
      }
      DB.cachePut('S:' + stoken, { attemptId: mine.attemptId, studentId: sid }, STUDENT_TTL);
      return {
        stoken: stoken, serverNow: now(),
        attempt: { attemptId: mine.attemptId, stage: mine.stage, form: Number(mine.form), startedAt: Number(mine.startedAt), answers: str(mine.answers), times: str(mine.times), progress: Number(mine.progress || 0) },
        student: { studentId: st.studentId, name: st.name, grade: Number(st.grade), className: st.className },
        session: { code: code, title: ses.title, timeLimit: Number(ses.timeLimit), showResult: bool(ses.showResult) },
        school: settings().schoolName
      };
    });
  }
  function studentAuth(stoken) {
    var t = DB.cacheGet('S:' + stoken); if (!t) err('انتهت صلاحية الدخول. ادخل من جديد برقمك ورمز الجلسة', 'auth');
    var a = find('Attempts', 'attemptId', t.attemptId); if (!a) err('المحاولة غير موجودة', 'auth');
    if (a.stoken !== stoken) err('تم فتح اختبارك من جهاز آخر. أكمل من الجهاز الجديد', 'superseded');
    return a;
  }
  function cleanAnswers(s, n) { s = str(s).replace(/[^0-8]/g, ''); while (s.length < n) s += '0'; return s.slice(0, n); }
  function studentSave(p) {
    var a = studentAuth(p.stoken);
    if (a.status !== 'in_progress') return { status: a.status };
    var n = STAGE[a.stage].n; var ans = cleanAnswers(p.answers, n);
    DB.update('Attempts', 'attemptId', a.attemptId, { answers: ans, times: str(p.times).slice(0, 2000), lastSeen: now(), progress: String(ans.replace(/0/g, '').length) });
    var ses = find('Sessions', 'code', a.code);
    return { status: 'in_progress', serverNow: now(), sessionStatus: ses ? ses.status : 'closed' };
  }
  function scoreAttempt(stage, form, answers) {
    var cfg = STAGE[stage]; var k = DB.rows('Keys').filter(function (x) { return x.stage === stage && Number(x.form) === Number(form); })[0];
    if (!k || str(k.key).length !== cfg.n) return null;
    var key = str(k.key), correct = '', sets = {}, i = 0;
    cfg.sets.forEach(function (st) { var c = 0; for (var j = 0; j < st[1]; j++, i++) { var ok = answers[i] !== '0' && answers[i] === key[i]; correct += ok ? '1' : '0'; if (ok) c++; } sets[st[0]] = c; });
    var score = 0; cfg.scored.forEach(function (sid) { score += sets[sid]; });
    return { score: score, sets: sets, correct: correct, version: k.version };
  }
  function ageMonths(dob, at) {
    var m = str(dob).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (!m) return '';
    var d = new Date(at); var months = (d.getFullYear() - Number(m[1])) * 12 + (d.getMonth() + 1 - Number(m[2])); if (d.getDate() < Number(m[3])) months--;
    return months > 0 && months < 300 ? String(months) : '';
  }
  function finalize(a, answers, times, by) {
    var st = find('Students', 'studentId', a.studentId) || {}; var ses = find('Sessions', 'code', a.code) || {};
    var cfg = STAGE[a.stage]; var n = cfg.n; answers = cleanAnswers(answers, n);
    var t = now(); var elapsed = Math.round((t - Number(a.startedAt)) / 1000);
    var tl = Number(ses.timeLimit || 0);
    var tarr = str(times).split(',').map(Number); var rapid = 0;
    for (var i = 0; i < n; i++) if (answers[i] !== '0' && tarr[i] > 0 && tarr[i] < 3) rapid++;
    var sc = scoreAttempt(a.stage, a.form, answers);
    var row = {
      resultId: DB.uuid(), attemptId: a.attemptId, code: a.code, studentId: a.studentId, name: st.name || '', gender: st.gender || '', grade: st.grade || '', className: st.className || '', track: st.track || '', dob: st.dob || '',
      ageMonths: ageMonths(st.dob, t), stage: a.stage, form: String(a.form), score: sc ? String(sc.score) : '', maxScore: String(cfg.max), sets: sc ? JSON.stringify(sc.sets) : '', setI: sc && a.stage === 'secondary' ? String(sc.sets.I) : '',
      timeSec: String(elapsed), rapid: String(rapid), answers: answers, correct: sc ? sc.correct : '', status: sc ? 'valid' : 'pending', submittedAt: t, overtime: tl > 0 && elapsed > tl * 60 + 120 ? '1' : '0', keyVersion: sc ? sc.version : ''
    };
    DB.insert('Results', row);
    DB.update('Attempts', 'attemptId', a.attemptId, { status: 'submitted', submittedAt: t, answers: answers, times: str(times).slice(0, 2000), progress: String(answers.replace(/0/g, '').length) });
    if (by) log(by, 'forceSubmit', a.attemptId);
    return { row: row, showResult: bool(ses.showResult) };
  }
  function studentSubmit(p) {
    return DB.lock(function () {
      var a = studentAuth(p.stoken);
      if (a.status === 'submitted') { var r0 = find('Results', 'attemptId', a.attemptId); return { submitted: true, result: null, already: true }; }
      var f = finalize(a, p.answers, p.times);
      DB.cacheDel('S:' + p.stoken);
      return { submitted: true, result: f.showResult && f.row.score !== '' ? { score: Number(f.row.score), max: Number(f.row.maxScore), sets: JSON.parse(f.row.sets) } : null };
    });
  }

  /* ---------------- إجراءات المعلم/المدير على المحاولات ---------------- */
  function attemptAction(p) {
    var s = staffAuth(p.token);
    var a = find('Attempts', 'attemptId', str(p.attemptId));
    if (!a && HOOK.attemptAction) return HOOK.attemptAction(s, p);
    if (!a) err('المحاولة غير موجودة');
    var ses = find('Sessions', 'code', a.code); if (!ses || !canSeeSession(s, ses)) err('ليست لديك صلاحية');
    return DB.lock(function () {
      if (p.op === 'forceSubmit') { if (a.status === 'submitted') err('سُلّمت مسبقاً'); finalize(a, a.answers, a.times, s.username); }
      else if (p.op === 'reset') {
        need(s, ['admin', 'coordinator']);
        DB.remove('Attempts', 'attemptId', a.attemptId);
        var r = find('Results', 'attemptId', a.attemptId); if (r) DB.update('Results', 'resultId', r.resultId, { status: 'void' });
        log(s.username, 'resetAttempt', a.attemptId);
      } else err('إجراء غير معروف');
      return monitor({ token: p.token, code: a.code });
    });
  }

  /* ---------------- النتائج ---------------- */
  function listResults(p) {
    var s = staffAuth(p.token);
    var rows = DB.rows('Results');
    if (!isAll(s)) rows = rows.filter(function (r) { return s.classes.indexOf(str(r.className)) >= 0 || (find('Sessions', 'code', r.code) || {}).createdBy === s.username; });
    if (!p.includeVoid) rows = rows.filter(function (r) { return r.status !== 'void'; });
    return { results: rows, settings: settings() };
  }
  function setResultStatus(p) {
    var s = staffAuth(p.token); need(s, ['admin', 'coordinator']);
    var r = find('Results', 'resultId', str(p.resultId)); if (!r) err('النتيجة غير موجودة');
    var st = p.status === 'void' ? 'void' : (r.score === '' ? 'pending' : 'valid');
    DB.update('Results', 'resultId', r.resultId, { status: st }); log(s.username, 'result_' + st, r.resultId);
    return {};
  }

  /* ---------------- مفاتيح الإجابة ---------------- */
  function uploadKeys(p) {
    var s = staffAuth(p.token); need(s, ['admin']);
    var keys = p.keys || [];
    keys.forEach(function (k) { if (!STAGE[k.stage] || str(k.key).length !== STAGE[k.stage].n || !/^[1-8]+$/.test(str(k.key))) err('مفتاح غير صالح: ' + k.stage + ' ' + k.form); });
    var t = now();
    DB.lock(function () { DB.replaceAll('Keys', keys.map(function (k) { return { stage: k.stage, form: String(k.form), version: k.version, key: k.key, checksum: k.checksum, uploadedAt: t }; })); });
    var rs = rescoreAll(s.username);
    log(s.username, 'uploadKeys', keys.length + ' مفتاح');
    return { count: keys.length, rescored: rs };
  }
  function rescoreAll(by) {
    return DB.lock(function () {
      var rows = DB.rows('Results'); var changed = 0;
      var out = rows.map(function (r) {
        var o = {}; HEAD.Results.forEach(function (h) { o[h] = r[h]; });
        var sc = scoreAttempt(o.stage, o.form, cleanAnswers(o.answers, STAGE[o.stage].n));
        if (sc && (o.correct !== sc.correct || o.keyVersion !== sc.version)) { o.score = String(sc.score); o.sets = JSON.stringify(sc.sets); o.setI = o.stage === 'secondary' ? String(sc.sets.I) : ''; o.correct = sc.correct; o.keyVersion = sc.version; if (o.status === 'pending') o.status = 'valid'; changed++; }
        return o;
      });
      if (changed) DB.replaceAll('Results', out);
      return changed;
    });
  }

  /* ---------------- الإعدادات والسجل ---------------- */
  function saveSettings(p) {
    var s = staffAuth(p.token); need(s, ['admin']);
    var cur = settings(), d = p.settings || {};
    for (var k in DEFAULT_SETTINGS) if (d[k] != null) cur[k] = str(d[k]);
    DB.lock(function () { DB.replaceAll('Settings', Object.keys(cur).map(function (k) { return { key: k, value: cur[k] }; })); });
    log(s.username, 'saveSettings', '');
    return { settings: cur };
  }
  function listLog(p) { var s = staffAuth(p.token); need(s, ['admin']); var r = DB.rows('Log'); return { log: r.slice(Math.max(0, r.length - 500)).reverse() }; }

  var ACTIONS = {
    ping: function () { return { pong: true, version: VERSION }; },
    login: login, changePassword: changePassword,
    logout: function (p) { if (p.token) DB.cacheDel('T:' + p.token); return {}; },
    getMeta: getMeta, listUsers: listUsers, saveUser: saveUser, deleteUser: deleteUser,
    listStudents: listStudents, importStudents: importStudents, deleteStudent: deleteStudent,
    listSessions: listSessions, createSession: createSession, setSessionStatus: setSessionStatus, monitor: monitor, attemptAction: attemptAction,
    studentLogin: studentLogin, studentSave: studentSave, studentSubmit: studentSubmit,
    listResults: listResults, setResultStatus: setResultStatus, uploadKeys: uploadKeys,
    rescore: function (p) { var s = staffAuth(p.token); need(s, ['admin']); return { rescored: rescoreAll(s.username) }; },
    saveSettings: saveSettings, listLog: listLog
  };

  /* ---------------- امتداد اختبار التفكير الإبداعي ---------------- */
  var HOOK = {};
  function installExt() {
    if (typeof TTCore === 'undefined' || HOOK.installed) return;
    HOOK = TTCore.install({
      DB: function () { return DB; }, HEAD: HEAD, STAGE: STAGE, ROLES: ROLES, VERSION: VERSION, STUDENT_TTL: STUDENT_TTL,
      find: find, err: err, str: str, bool: bool, splitList: splitList, settings: settings, log: log, now: now, randCode: randCode,
      staffAuth: staffAuth, need: need, isAll: isAll, canSeeSession: canSeeSession, stageOfGrade: stageOfGrade, ageMonths: ageMonths, sessionView: sessionView
    }) || {};
    HOOK.installed = true;
    for (var k in (HOOK.actions || {})) ACTIONS[k] = HOOK.actions[k];
  }

  function handle(action, p) {
    try {
      installExt();
      if (!ACTIONS[action]) err('إجراء غير معروف');
      ensureSetup();
      var out = ACTIONS[action](p || {}) || {};
      out.ok = true; return out;
    } catch (e) {
      return { ok: false, error: e.message || String(e), code: e.code || 'error' };
    }
  }
  return { init: function (db) { DB = db; installExt(); }, handle: handle, HEAD: HEAD, STAGE: STAGE, VERSION: VERSION, hook: function () { installExt(); return HOOK; } };
})();
if (typeof module !== 'undefined') module.exports = Core;
