/* =====================================================================
   tt-core.js — منطق الخادم لاختبار التفكير الإبداعي (يُدمج مع core.js)
   يعمل في Google Apps Script وفي الوضع التجريبي داخل المتصفح
   ===================================================================== */
var TTCore = (function () {
  'use strict';
  var I = (typeof TTItems !== 'undefined') ? TTItems : null, E = (typeof TTEngine !== 'undefined') ? TTEngine : null;
  var MAX_TRIES = 3;
  var STRENGTH_KEYS = ['emotion', 'story', 'movement', 'titles', 'synthComplete', 'synthRepeat', 'unusual', 'internal', 'boundaries', 'humor', 'richness', 'colorful', 'fantasy'];

  function install(K) {
    I = I || TTItems; E = E || TTEngine;
    var DB = function () { return K.DB(); };
    var str = K.str, err = K.err, find = K.find, bool = K.bool, now = K.now;
    function J(s, d) { if (s && typeof s === 'object') return s; try { return s ? JSON.parse(s) : (d === undefined ? {} : d); } catch (e) { return d === undefined ? {} : d; } }
    function rowsOf(t) { return DB().rows(t); }
    function uuid() { return DB().uuid(); }
    function settings() { return K.settings(); }
    function plain(name, r) { var o = {}; K.HEAD[name].forEach(function (h) { o[h] = r[h] == null ? '' : r[h]; }); return o; }
    function secret(k) { return DB().secretGet ? DB().secretGet(k) : ''; }
    function setSecret(k, v) { if (DB().secretSet) DB().secretSet(k, v); }

    /* ---------------- دخول الطالب ---------------- */
    function chooseForm(ses, used) {
      var counter = Number(ses.counter || 0), form;
      if (ses.formMode === 'rotate') {
        var cand = [1, 2, 3, 4].filter(function (f) { return used.indexOf(f) < 0; }); if (!cand.length) cand = [1, 2, 3, 4];
        form = cand[counter % cand.length];
      } else {
        form = Number(ses.formMode);
        if (used.indexOf(form) >= 0) { var alt = [1, 2, 3, 4].filter(function (f) { return used.indexOf(f) < 0; }); if (alt.length) form = alt[0]; }
      }
      DB().update('Sessions', 'code', ses.code, { counter: String(counter + 1) });
      return form;
    }
    function attemptView(a) { return { attemptId: a.attemptId, battery: a.battery, form: Number(a.form), stage: a.stage, startedAt: Number(a.startedAt), actIdx: Number(a.actIdx || 0), actStart: a.actStart ? Number(a.actStart) : 0, data: J(a.data), mode: a.mode || '' }; }
    function studentLogin(ses, st, sid, code) {
      var mine = rowsOf('TAttempts').filter(function (a) { return a.code === code && str(a.studentId) === sid; })[0];
      var stoken = uuid();
      if (mine) {
        if (mine.status === 'submitted') err('سبق أن سلّمت هذا الاختبار. شكراً لك');
        DB().update('TAttempts', 'attemptId', mine.attemptId, { stoken: stoken, lastSeen: now() });
        mine.stoken = stoken;
      } else {
        var prev = rowsOf('TResults').filter(function (r) { return str(r.studentId) === sid && r.battery === ses.battery && r.status !== 'void'; });
        if (prev.length && !bool(ses.allowRetake)) err('سبق لك أداء هذا الاختبار. راجع منسق الموهبة إن كانت هناك حاجة لإعادته');
        var form = chooseForm(ses, prev.map(function (r) { return Number(r.form); }));
        mine = { attemptId: uuid(), code: code, studentId: sid, stage: K.stageOfGrade(st.grade), battery: ses.battery, form: String(form), status: 'in_progress', startedAt: now(), lastSeen: now(), actIdx: '0', actStart: '', data: '{}', stoken: stoken, submittedAt: '', mode: ses.drawMode || '' };
        DB().insert('TAttempts', mine);
      }
      DB().cachePut('S:' + stoken, { attemptId: mine.attemptId, studentId: sid, tt: 1 }, K.STUDENT_TTL);
      return {
        test: 'torrance', stoken: stoken, serverNow: now(), attempt: attemptView(mine),
        student: { studentId: st.studentId, name: st.name, grade: Number(st.grade), className: st.className },
        session: { code: code, title: ses.title, timed: Number(ses.timeLimit) > 0, battery: ses.battery, drawMode: ses.drawMode || 'both', timeLimit: Number(ses.timeLimit) },
        school: settings().schoolName
      };
    }
    function stAuth(stoken) {
      var t = DB().cacheGet('S:' + stoken); if (!t || !t.tt) err('انتهت صلاحية الدخول. ادخل من جديد برقمك ورمز الجلسة', 'auth');
      var a = find('TAttempts', 'attemptId', t.attemptId); if (!a) err('المحاولة غير موجودة', 'auth');
      if (a.stoken !== stoken) err('تم فتح اختبارك من جهاز آخر. أكمل من الجهاز الجديد', 'superseded');
      return a;
    }

    /* ---------------- حفظ إجابات نشاط ---------------- */
    function cleanPayload(battery, form, actId, p) {
      var F = I.getForm(battery, form), act = F.acts.filter(function (a) { return a.id === actId; })[0]; if (!act) err('نشاط غير معروف');
      p = p || {}; var o = {};
      if (battery === 'verbal') o.list = (p.list || []).slice(0, act.max).map(function (x) { return str(x).slice(0, 300); });
      else {
        if (actId === 'construct') o.title = str(p.title).slice(0, 120);
        else o.titles = (p.titles || []).slice(0, act.n).map(function (x) { return str(x).slice(0, 120); });
        if (p.meta && typeof p.meta === 'object') o.meta = { ink: Number(p.meta.ink) || 0, strokes: Number(p.meta.strokes) || 0, colorCount: Number(p.meta.colorCount) || 0, span: Number(p.meta.span) || 0, cells: (p.meta.cells || []).slice(0, 24).map(Number), cellStrokes: (p.meta.cellStrokes || []).slice(0, 24).map(Number), gap: p.meta.gap ? p.meta.gap.slice(0, 10).map(Number) : undefined };
        if (p.paper != null) o.paper = !!p.paper;
      }
      if (p.sec != null) o.sec = Math.max(0, Math.min(36000, Number(p.sec) || 0));
      return o;
    }
    function storeImage(attemptId, actId, dataUrl) {
      var m = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m) err('صيغة الصورة غير مدعومة');
      if (m[2].length > 6 * 1024 * 1024) err('حجم الصورة كبير جداً');
      var ref = DB().saveImage(m[1], m[2], 'tt_' + attemptId.slice(0, 8) + '_' + actId + '_' + now() + (m[1] === 'image/png' ? '.png' : '.jpg')) || {};
      var row = { imageId: uuid(), attemptId: attemptId, act: actId, fileId: ref.fileId || '', mime: m[1], data: ref.data || '', createdAt: now() };
      DB().insert('TImages', row);
      return row.imageId;
    }
    function mergeAct(a, actId, payload, imageDataUrl) {
      var data = J(a.data); data.acts = data.acts || {};
      var cur = data.acts[actId] || {}, clean = cleanPayload(a.battery, a.form, actId, payload);
      for (var k in clean) if (clean[k] !== undefined) cur[k] = clean[k];
      if (imageDataUrl) cur.image = storeImage(a.attemptId, actId, imageDataUrl);
      data.acts[actId] = cur; return data;
    }
    function ttSave(p) {
      var a = stAuth(p.stoken);
      if (a.status !== 'in_progress') return { status: a.status };
      var patch = { lastSeen: now() }, n = I.actCount(a.battery), cur = Number(a.actIdx || 0);
      var idx = Math.max(0, Math.min(n, Number(p.actIdx)));
      if (isFinite(idx) && idx >= cur) {
        if (idx > cur || (p.start && !a.actStart)) { patch.actIdx = String(idx); patch.actStart = p.start ? now() : ''; }
        else if (p.start && !a.actStart) patch.actStart = now();
      }
      var img = null;
      if (p.act) { var d = mergeAct(a, p.act, p.payload, p.image); patch.data = JSON.stringify(d); img = d.acts[p.act].image || null; }
      DB().update('TAttempts', 'attemptId', a.attemptId, patch);
      var b = find('TAttempts', 'attemptId', a.attemptId), ses = find('Sessions', 'code', a.code);
      return { status: 'in_progress', serverNow: now(), actIdx: Number(b.actIdx || 0), actStart: b.actStart ? Number(b.actStart) : 0, image: img, sessionStatus: ses ? ses.status : 'closed' };
    }
    function ttSubmit(p) {
      return DB().lock(function () {
        var a = stAuth(p.stoken);
        if (a.status === 'submitted') return { submitted: true, already: true };
        if (p.act) { var d = mergeAct(a, p.act, p.payload, p.image); a.data = JSON.stringify(d); DB().update('TAttempts', 'attemptId', a.attemptId, { data: a.data }); }
        finalize(a, '');
        DB().cacheDel('S:' + p.stoken);
        return { submitted: true };
      });
    }

    /* ---------------- إنهاء المحاولة وإنشاء النتيجة ---------------- */
    function aiReady() { return settings().aiEnabled !== '0' && !!secret('GEMINI_KEY'); }
    function ruleStrengths(data) {
      var s = {}, acts = data.acts || {};
      var cm = (acts.construct || {}).meta || {}, pm = (acts.complete || {}).meta || {}, rm = (acts.repeat || {}).meta || {};
      if (Math.max(cm.colorCount || 0, pm.colorCount || 0, rm.colorCount || 0) >= 3) s.colorful = 1;
      if ((pm.span || 0) > 0) s.synthComplete = 1;
      if ((rm.span || 0) > 0) s.synthRepeat = 1;
      return s;
    }
    function finalize(a, by, extra) {
      extra = extra || {};
      var st = find('Students', 'studentId', a.studentId) || {}, t = now();
      var data = J(a.data), form = Number(a.form);
      var rows = a.battery === 'verbal' ? E.ruleVerbal(form, data) : E.ruleFigural(form, data);
      var resultId = uuid();
      var paper = a.battery === 'figural' && ['construct', 'complete', 'repeat'].some(function (k) { return data.acts && data.acts[k] && data.acts[k].paper; });
      var jobs = [];
      if (aiReady()) {
        if (a.battery === 'verbal') { if (rows.length) jobs.push('verbal'); }
        else ['construct', 'complete', 'repeat'].forEach(function (k) { if (data.acts && data.acts[k] && data.acts[k].image) jobs.push(k); });
      }
      var needHuman = !jobs.length && a.battery === 'figural' && paper;
      var secs = 0; Object.keys(data.acts || {}).forEach(function (k) { secs += Number(data.acts[k].sec || 0); });
      var res = {
        resultId: resultId, attemptId: a.attemptId, code: a.code, studentId: a.studentId, name: st.name || '', gender: st.gender || '', grade: st.grade || '', className: st.className || '', track: st.track || '', dob: st.dob || '',
        ageMonths: K.ageMonths(st.dob, t), stage: a.stage, battery: a.battery, form: String(form), status: jobs.length ? 'scoring' : needHuman ? 'review' : 'valid', scoredBy: 'rule',
        fluency: '', flexibility: '', originality: '', elaboration: '', abstractness: '', closure: '', bonus: '', strengths: JSON.stringify({ rule: a.battery === 'figural' ? ruleStrengths(data) : {} }), acts: '', provisional: '1',
        timeSec: String(secs || Math.round((t - Number(a.startedAt)) / 1000)), mode: paper ? 'paper' : 'screen', submittedAt: t, scoredAt: '', aiModel: '', note: needHuman ? 'رسوم ورقية بانتظار التصحيح (فعّل الذكاء الاصطناعي أو صحّحها يدوياً)' : (extra.note || '')
      };
      var full = rows.map(function (r) { return Object.assign({ rid: uuid(), resultId: resultId, studentId: a.studentId, grade: st.grade || '', stage: a.stage, form: String(form), battery: a.battery, orig: '', origProv: '1', freq: '', flags: r.flags || '', human: '', origLock: '' }, r); });
      // تقدير مبدئي فوري للدرجات (تُحدَّث الأصالة لاحقاً من بيانات كل الطلاب)
      full.forEach(function (r) { r.orig = String(r.valid) === '1' && !r.dupOf ? (r.rarityAI !== '' ? r.rarityAI : '1') : '0'; });
      var ag = E.aggregate(a.battery, full, mergeStrengths(J(res.strengths)));
      setDims(res, ag);
      DB().insert('TResults', res);
      if (full.length) DB().insertMany('TResponses', full);
      if (jobs.length) DB().insertMany('TJobs', jobs.map(function (k) { return { jobId: uuid(), resultId: resultId, kind: k, status: 'queued', tries: '0', error: '', createdAt: t, doneAt: '', model: '', nextAt: '' }; }));
      DB().update('TAttempts', 'attemptId', a.attemptId, { status: 'submitted', submittedAt: t, data: a.data });
      setSecret('ttDirty', '1');
      if (by) K.log(by, 'ttForceSubmit', a.attemptId);
      return res;
    }
    function setDims(res, ag) {
      ['fluency', 'flexibility', 'originality', 'elaboration', 'abstractness', 'closure'].forEach(function (k) { res[k] = ag.dims[k] == null ? '' : String(ag.dims[k]); });
      res.bonus = String(ag.bonus); res.acts = JSON.stringify(ag.acts); res.provisional = ag.provisional ? '1' : '';
    }
    function mergeStrengths(S) {
      if (S.human) return S.human;
      var keys = Object.keys(S).filter(function (k) { return k !== 'rule'; }), out = {};
      if (!keys.length) return S.rule || {};
      keys.forEach(function (k) { var o = S[k] || {}; Object.keys(o).forEach(function (x) { if (o[x]) out[x] = (out[x] || 0) + 1; }); });
      var r = S.rule || {}; if (r.synthComplete && !out.synthComplete) out.synthComplete = 1; if (r.synthRepeat && !out.synthRepeat) out.synthRepeat = 1;
      return out;
    }

    /* ---------------- إعادة الحساب: الأصالة من كل بيانات المدرسة ثم الدرجات ---------------- */
    function recalcAll() {
      return DB().lock(function () {
        var minN = Number(settings().ttMinOrig || 40);
        var all = rowsOf('TResponses').filter(function (r) { return r.src !== 'x'; });
        var results = rowsOf('TResults');
        var live = {}; results.forEach(function (r) { if (r.status !== 'void') live[r.resultId] = r; });
        var use = all.filter(function (r) { return live[r.resultId]; });
        var before = {}; use.forEach(function (r) { before[r.rid] = r.orig + '|' + r.origProv + '|' + r.freq; });
        E.computeOriginality(use, { minN: minN });
        var changed = use.filter(function (r) { return before[r.rid] !== r.orig + '|' + r.origProv + '|' + r.freq; });
        if (changed.length) DB().saveRows('TResponses', all, 'rid', ['orig', 'origProv', 'freq']);
        var by = {}; use.forEach(function (r) { (by[r.resultId] = by[r.resultId] || []).push(r); });
        var cnt = 0;
        results.forEach(function (res) {
          if (!live[res.resultId]) return;
          var ag = E.aggregate(res.battery, by[res.resultId] || [], mergeStrengths(J(res.strengths)));
          var o = {}; setDims(o, ag);
          var diff = Object.keys(o).some(function (k) { return String(res[k]) !== String(o[k]); });
          if (diff) { Object.keys(o).forEach(function (k) { res[k] = o[k]; }); cnt++; }
        });
        if (cnt) DB().saveRows('TResults', results, 'resultId', ['fluency', 'flexibility', 'originality', 'elaboration', 'abstractness', 'closure', 'bonus', 'strengths', 'acts', 'provisional']);
        setSecret('ttDirty', '');
        return { responses: changed.length, results: cnt };
      });
    }

    /* ---------------- الذكاء الاصطناعي: تجهيز المهمة وتطبيق النتيجة ---------------- */
    function loadImageById(imageId) {
      var row = find('TImages', 'imageId', imageId); if (!row) return null;
      return DB().loadImage(row);
    }
    function prepareJob(job) {
      var res = find('TResults', 'resultId', job.resultId); if (!res) return null;
      var at = find('TAttempts', 'attemptId', res.attemptId) || {}, data = J(at.data), form = Number(res.form);
      if (job.kind === 'verbal') {
        var rows = rowsOf('TResponses').filter(function (r) { return r.resultId === res.resultId && r.src !== 'x' && r.src !== 'human'; });
        if (!rows.length) return { skip: true };
        return { prompt: E.verbalPrompt(form, res.stage, res.grade, rows), images: [] };
      }
      var A = (data.acts || {})[job.kind] || {};
      if (!A.image) return { skip: true };
      var im = loadImageById(A.image); if (!im) return { skip: true };
      return { prompt: E.figuralPrompt(job.kind, form, res.stage, res.grade, { paper: !!A.paper, title: A.title, titles: A.titles }), images: [im] };
    }
    function applyJob(job, text, model) {
      var res = find('TResults', 'resultId', job.resultId); if (!res) return;
      var at = find('TAttempts', 'attemptId', res.attemptId) || {}, data = J(at.data);
      if (job.kind === 'verbal') {
        var rows = rowsOf('TResponses').filter(function (r) { return r.resultId === res.resultId && r.src !== 'x' && r.src !== 'human'; });
        var info = E.applyVerbal(rows, text, Number(res.form));
        if (!info.matched) throw new Error('لم يُرجع النموذج تقييماً للإجابات');
        DB().saveRows('TResponses', rows, 'rid');
      } else {
        var A = (data.acts || {})[job.kind] || {};
        var out = E.applyFigural(job.kind, text, { title: A.title, titles: A.titles, gap: A.paper ? null : (A.meta || {}).gap });
        var old = rowsOf('TResponses').filter(function (r) { return r.resultId === res.resultId && r.act === job.kind && r.src !== 'x' && r.src !== 'human'; });
        old.forEach(function (r) { r.src = 'x'; });
        if (old.length) DB().saveRows('TResponses', old, 'rid', ['src']);
        var full = out.rows.map(function (r) { return Object.assign({ rid: uuid(), resultId: res.resultId, studentId: res.studentId, grade: res.grade, stage: res.stage, form: res.form, battery: res.battery, orig: r.rarityAI, origProv: '1', freq: '', flags: r.flags || '', human: '', origLock: '' }, r); });
        if (full.length) DB().insertMany('TResponses', full);
        var S = J(res.strengths); S[job.kind] = out.strengths; DB().update('TResults', 'resultId', res.resultId, { strengths: JSON.stringify(S) });
      }
      DB().update('TJobs', 'jobId', job.jobId, { status: 'done', doneAt: now(), model: model || '', error: '' });
      settleResult(res.resultId, model);
    }
    function failJob(job, msg, retryLater) {
      var tries = Number(job.tries || 0) + (retryLater ? 0 : 1);
      var st = tries >= MAX_TRIES ? 'error' : 'queued';
      DB().update('TJobs', 'jobId', job.jobId, { status: st, tries: String(tries), error: String(msg || '').slice(0, 300), nextAt: retryLater ? now() + retryLater : now() + 60000 });
      if (st === 'error') settleResult(job.resultId);
    }
    function settleResult(resultId, model) {
      var jobs = rowsOf('TJobs').filter(function (j) { return j.resultId === resultId; });
      var res = find('TResults', 'resultId', resultId); if (!res || res.status === 'void') return;
      var pending = jobs.some(function (j) { return j.status === 'queued'; }), bad = jobs.some(function (j) { return j.status === 'error'; });
      var patch = {};
      if (!pending) { patch.status = bad ? 'review' : 'valid'; patch.scoredAt = now(); patch.note = bad ? 'تعذّر تصحيح جزء بالذكاء الاصطناعي؛ يحتاج مراجعة' : ''; }
      var done = jobs.filter(function (j) { return j.status === 'done'; }).length;
      if (done) patch.scoredBy = res.scoredBy === 'human' ? 'human' : (done === jobs.length ? 'ai' : 'mixed');
      if (model) patch.aiModel = model;
      DB().update('TResults', 'resultId', resultId, patch);
      setSecret('ttDirty', '1');
    }
    function nextJobs(limit) {
      var t = now();
      return rowsOf('TJobs').filter(function (j) { return j.status === 'queued' && (!j.nextAt || Number(j.nextAt) <= t); }).sort(function (a, b) { return Number(a.createdAt) - Number(b.createdAt); }).slice(0, limit || 1);
    }
    function dayKey() { var d = new Date(now()); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function countCall() { var c = J(secret('aiCount'), {}); if (c.day !== dayKey()) c = { day: dayKey(), n: 0 }; c.n++; setSecret('aiCount', JSON.stringify(c)); return c.n; }
    function todayCalls() { var c = J(secret('aiCount'), {}); return c.day === dayKey() ? c.n : 0; }

    /* ---------------- الاتصال بـ Gemini (في الخادم فقط) ---------------- */
    var API = 'https://generativelanguage.googleapis.com/v1beta/';
    function listModels(key) {
      var r = DB().http(API + 'models?pageSize=200', { method: 'get', headers: { 'x-goog-api-key': key } });
      if (r.code !== 200) throw new Error(httpMsg(r));
      var list = E.pickModels((J(r.text).models) || []);
      setSecret('aiModels', JSON.stringify({ ts: now(), list: list }));
      return list;
    }
    function httpMsg(r) { var j = J(r.text, null); var m = j && j.error && j.error.message; return 'HTTP ' + r.code + (m ? ': ' + String(m).slice(0, 200) : ''); }
    // ترتيب النماذج حسب نوع المهمة: الرسوم لنماذج Flash الأقوى أولاً (حصتها اليومية صغيرة)، والنصوص لنماذج Flash-Lite (حصتها كبيرة)
    function modelOrder(key, kind) {
      var s = settings().aiModel; if (s) return [s];
      var c = J(secret('aiModels'), {}); var list = c.list || [];
      if (!list.length || now() - Number(c.ts || 0) > 24 * 3600 * 1000) { try { list = listModels(key); } catch (e) { if (!list.length) throw e; } }
      var bad = J(secret('aiBad'), {}); var ok = list.filter(function (m) { return !bad[m]; }); if (!ok.length) ok = list;
      var lite = ok.filter(function (m) { return /lite/i.test(m); }), full = ok.filter(function (m) { return !/lite/i.test(m); });
      var ordered = kind === 'verbal' ? lite.slice(0, 3).concat(full.slice(0, 3)) : full.slice(0, 3).concat(lite.slice(0, 3));
      var cool = J(secret('aiCool'), {}), t = now();
      var ready = ordered.filter(function (m) { return !cool[m] || Number(cool[m].until || 0) <= t; });
      return ready;
    }
    // تذكّر النموذج الذي بلغ حده: دقيقتان أول مرة، ثم 6 ساعات إذا تكرر (غالباً امتلأ حده اليومي)
    function coolModel(m) {
      var cool = J(secret('aiCool'), {}), t = now(), c = cool[m] || { hits: 0 };
      if (t - Number(c.last || 0) > 6 * 3600 * 1000) c.hits = 0;
      c.hits++; c.last = t; c.until = t + (c.hits >= 3 ? 6 * 3600 * 1000 : c.hits === 2 ? 15 * 60000 : 2 * 60000);
      cool[m] = c; setSecret('aiCool', JSON.stringify(cool));
    }
    function warmModel(m) { var cool = J(secret('aiCool'), {}); if (cool[m]) { delete cool[m]; setSecret('aiCool', JSON.stringify(cool)); } }
    function callModel(key, prep, kind) {
      var models = modelOrder(key, kind), lastErr = null, quota = 0, busyN = 0;
      if (!models.length) { var q0 = new Error('كل النماذج المجانية بلغت حدها مؤقتاً؛ سيُكمل التصحيح تلقائياً لاحقاً (429)'); q0.quota = true; throw q0; }
      for (var i = 0; i < models.length; i++) {
        var m = models[i];
        var r = DB().http(API + 'models/' + encodeURIComponent(m) + ':generateContent', { method: 'post', headers: { 'x-goog-api-key': key }, payload: JSON.stringify(E.geminiBody(prep.prompt, prep.images)) });
        if (r.code === 200) { countCall(); warmModel(m); try { return { text: E.geminiText(J(r.text)), model: m }; } catch (e) { lastErr = e; continue; } }
        if (r.code === 401 || r.code === 403) { var e2 = new Error('مفتاح Gemini غير صالح أو غير مفعّل (' + r.code + ')'); e2.fatal = true; throw e2; }
        if (r.code === 404 || (r.code === 400 && /not (found|supported)|unsupported/i.test(r.text))) { var bad = J(secret('aiBad'), {}); bad[m] = 1; setSecret('aiBad', JSON.stringify(bad)); lastErr = new Error(httpMsg(r)); continue; }
        // حد الطلبات لنموذج بعينه (429) أو ازدحام مؤقت (5xx): ننتقل إلى النموذج التالي
        if (r.code === 429) { quota++; coolModel(m); lastErr = new Error('تم بلوغ حد الطلبات المجاني مؤقتاً (429)'); continue; }
        if (r.code >= 500) { busyN++; lastErr = new Error('النماذج مزدحمة مؤقتاً لدى Google، ستُعاد المحاولة تلقائياً (' + r.code + ')'); continue; }
        countCall(); lastErr = new Error(httpMsg(r)); break;
      }
      if (quota && quota + busyN >= models.length) { var q = new Error('كل النماذج المجانية بلغت حدها مؤقتاً؛ سيُكمل التصحيح تلقائياً لاحقاً (429)'); q.quota = true; throw q; }
      if (busyN) { var b = lastErr || new Error('ازدحام مؤقت'); b.later = true; b.message = 'النماذج مزدحمة مؤقتاً لدى Google، ستُعاد المحاولة تلقائياً'; throw b; }
      throw lastErr || new Error('لا يوجد نموذج متاح');
    }
    // يعالج مهام التصحيح المتاحة ضمن ميزانية زمنية — يستدعيه المشغّل الزمني أو زر «صحّح الآن»
    function processQueue(budgetMs, maxJobs) {
      var key = secret('GEMINI_KEY'), S = settings(), started = now(), done = 0, errors = 0, stopped = '';
      if (!key || S.aiEnabled === '0') return { done: 0, stopped: 'الذكاء الاصطناعي غير مفعّل أو لا يوجد مفتاح' };
      if (!DB().http) return { done: 0, stopped: 'unsupported' };
      var pace = Math.max(0, Number(S.aiPace || 5)) * 1000, cap = Number(S.aiDailyMax || 1000);
      while (now() - started < budgetMs && done + errors < (maxJobs || 1000)) {
        if (todayCalls() >= cap) { stopped = 'تم بلوغ الحد اليومي المحدد (' + cap + ' طلباً)'; break; }
        var job = nextJobs(1)[0]; if (!job) break;
        var prep = null;
        try { prep = prepareJob(job); } catch (e) { DB().lock(function () { failJob(job, e.message); }); errors++; continue; }
        if (!prep || prep.skip) { DB().lock(function () { DB().update('TJobs', 'jobId', job.jobId, { status: 'done', doneAt: now(), error: 'لا توجد بيانات للتصحيح' }); settleResult(job.resultId); }); continue; }
        var out = null, callErr = null;
        try { out = callModel(key, prep, job.kind); } catch (e) { callErr = e; }
        if (out) {
          try { DB().lock(function () { applyJob(job, out.text, out.model); }); done++; }
          catch (e) { DB().lock(function () { failJob(job, e.message); }); errors++; }
        } else {
          var e = callErr;
          if (e.quota) { DB().lock(function () { failJob(job, e.message, 15 * 60000); }); stopped = e.message; break; }
          if (e.fatal) { stopped = e.message; setSecret('aiLastError', e.message); break; }
          DB().lock(function () { failJob(job, e.message, e.later ? 5 * 60000 : 0); }); errors++;
        }
        setSecret('aiLastRun', String(now()));
        if (pace && DB().sleep) DB().sleep(pace);
      }
      if (done || errors) { try { recalcAll(); } catch (e) { } }
      if (stopped) setSecret('aiLastError', stopped);
      return { done: done, errors: errors, stopped: stopped, remaining: rowsOf('TJobs').filter(function (j) { return j.status === 'queued'; }).length };
    }

    /* ---------------- واجهات المنسوبين ---------------- */
    function canSeeResult(s, r) {
      if (K.isAll(s)) return true;
      if (s.classes.indexOf(str(r.className)) >= 0) return true;
      var ses = find('Sessions', 'code', r.code); return !!ses && ses.createdBy === s.username;
    }
    function monitor(s, ses) {
      var studs = {}; rowsOf('Students').forEach(function (x) { studs[str(x.studentId)] = x; });
      var n = I.actCount(ses.battery);
      var att = rowsOf('TAttempts').filter(function (a) { return a.code === ses.code; }).map(function (a) {
        var st = studs[str(a.studentId)] || {};
        return { attemptId: a.attemptId, studentId: a.studentId, name: st.name || '', className: st.className || '', form: Number(a.form), status: a.status, startedAt: Number(a.startedAt), lastSeen: Number(a.lastSeen), progress: a.status === 'submitted' ? n : Number(a.actIdx || 0), submittedAt: a.submittedAt ? Number(a.submittedAt) : '' };
      });
      var cls = K.splitList(ses.classes), expected = [];
      rowsOf('Students').forEach(function (x) {
        if (str(x.active) === '0') return;
        if (cls.length ? cls.indexOf(str(x.className)) >= 0 : K.stageOfGrade(x.grade) === ses.stage) expected.push({ studentId: x.studentId, name: x.name, className: x.className });
      });
      return { session: K.sessionView(ses), attempts: att, expected: expected, items: n, serverNow: now() };
    }
    function attemptAction(s, p) {
      var a = find('TAttempts', 'attemptId', str(p.attemptId)); if (!a) err('المحاولة غير موجودة');
      var ses = find('Sessions', 'code', a.code); if (!ses || !K.canSeeSession(s, ses)) err('ليست لديك صلاحية');
      return DB().lock(function () {
        if (p.op === 'forceSubmit') { if (a.status === 'submitted') err('سُلّمت مسبقاً'); finalize(a, s.username); }
        else if (p.op === 'reset') {
          K.need(s, ['admin', 'coordinator']);
          DB().remove('TAttempts', 'attemptId', a.attemptId);
          var r = find('TResults', 'attemptId', a.attemptId); if (r) DB().update('TResults', 'resultId', r.resultId, { status: 'void' });
          setSecret('ttDirty', '1'); K.log(s.username, 'resetAttempt', a.attemptId);
        } else err('إجراء غير معروف');
        return monitor(s, find('Sessions', 'code', a.code));
      });
    }
    function ttList(p) {
      var s = K.staffAuth(p.token);
      var recalced = null;
      if (K.isAll(s) && secret('ttDirty') === '1' && !p.noRecalc) { try { recalced = recalcAll(); } catch (e) { } }
      var rows = rowsOf('TResults').filter(function (r) { return canSeeResult(s, r) && (p.includeVoid || r.status !== 'void'); }).map(function (r) { return plain('TResults', r); });
      var jobs = rowsOf('TJobs'); var q = jobs.filter(function (j) { return j.status === 'queued'; }).length;
      return { results: rows, settings: settings(), queue: q, recalced: recalced, dirty: secret('ttDirty') === '1' };
    }
    function ttResult(p) {
      var s = K.staffAuth(p.token);
      var r = find('TResults', 'resultId', str(p.resultId)); if (!r || !canSeeResult(s, r)) err('النتيجة غير موجودة');
      var at = find('TAttempts', 'attemptId', r.attemptId) || {}, data = J(at.data);
      var resp = rowsOf('TResponses').filter(function (x) { return x.resultId === r.resultId && x.src !== 'x'; }).map(function (x) { return plain('TResponses', x); });
      var images = {}; Object.keys(data.acts || {}).forEach(function (k) { if (data.acts[k].image) images[k] = data.acts[k].image; });
      var jobs = rowsOf('TJobs').filter(function (j) { return j.resultId === r.resultId; }).map(function (j) { return plain('TJobs', j); });
      return { result: plain('TResults', r), responses: resp, images: images, acts: data.acts || {}, jobs: jobs };
    }
    function ttImage(p) {
      var s = K.staffAuth(p.token);
      var row = find('TImages', 'imageId', str(p.imageId)); if (!row) err('الصورة غير موجودة');
      var r = find('TResults', 'attemptId', row.attemptId); if (r && !canSeeResult(s, r)) err('ليست لديك صلاحية');
      var im = DB().loadImage(row); if (!im) err('تعذّر تحميل الصورة');
      return { dataUrl: 'data:' + im.mime + ';base64,' + im.data };
    }
    function ttReview(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin', 'coordinator']);
      var r = find('TResults', 'resultId', str(p.resultId)); if (!r) err('النتيجة غير موجودة');
      return DB().lock(function () {
        var all = rowsOf('TResponses').filter(function (x) { return x.resultId === r.resultId && x.src !== 'x'; }), map = {};
        all.forEach(function (x) { map[x.rid] = x; });
        var fields = ['valid', 'dupOf', 'cat', 'orig', 'elab', 'abstr', 'closure'], changed = [], agree = { n: 0, same: 0 };
        (p.rows || []).forEach(function (u) {
          var x = map[u.rid]; if (!x) return; var diff = false, snap = {};
          fields.forEach(function (f) { if (u[f] === undefined) return; var v = str(u[f]); if (str(x[f]) !== v) { snap[f] = x[f]; diff = true; } });
          if (!diff) { if (!x.human) { x.human = JSON.stringify({ src: x.src, ok: 1 }); changed.push(x); } return; }
          if (!x.human) x.human = JSON.stringify(Object.assign({ src: x.src }, snap));
          fields.forEach(function (f) { if (u[f] !== undefined) x[f] = str(u[f]); });
          if (u.orig !== undefined) x.origLock = '1';
          x.src = 'human'; changed.push(x); agree.n++;
        });
        if (changed.length) DB().saveRows('TResponses', changed, 'rid');
        var S = J(r.strengths); if (p.strengths) { var h = {}; STRENGTH_KEYS.forEach(function (k) { if (p.strengths[k]) h[k] = Math.min(2, Number(p.strengths[k]) || 1); }); S.human = h; }
        var ag = E.aggregate(r.battery, rowsOf('TResponses').filter(function (x) { return x.resultId === r.resultId && x.src !== 'x'; }), mergeStrengths(S));
        var patch = { strengths: JSON.stringify(S), status: 'valid', scoredBy: 'human', scoredAt: now(), note: str(p.note).slice(0, 300) };
        setDims(patch, ag); DB().update('TResults', 'resultId', r.resultId, patch);
        DB().rows('TJobs').filter(function (j) { return j.resultId === r.resultId && j.status !== 'done'; }).forEach(function (j) { DB().update('TJobs', 'jobId', j.jobId, { status: 'done', doneAt: now(), error: 'أُغلقت بالمراجعة اليدوية' }); });
        setSecret('ttDirty', '1'); K.log(s.username, 'ttReview', r.resultId + ' (' + changed.length + ')');
        return { changed: agree.n };
      });
    }
    // اتفاق المصحح البشري مع التصحيح الآلي (لكل إجابة راجعها إنسان)
    function ttAgreement(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin', 'coordinator']);
      var fields = ['valid', 'cat', 'orig', 'elab', 'abstr', 'closure'], out = { n: 0, same: 0, by: {}, bySrc: {} };
      fields.forEach(function (f) { out.by[f] = 0; });
      rowsOf('TResponses').forEach(function (x) {
        if (!x.human || x.src === 'x') return; var h = J(x.human, null); if (!h) return;
        if (p.battery && x.battery !== p.battery) return;
        out.n++; var src = h.src || 'rule'; out.bySrc[src] = out.bySrc[src] || { n: 0, same: 0 }; out.bySrc[src].n++;
        var diff = fields.filter(function (f) { return h[f] !== undefined; });
        diff.forEach(function (f) { out.by[f]++; });
        if (!diff.length) { out.same++; out.bySrc[src].same++; }
      });
      return out;
    }
    // أكثر الأفكار تكراراً في نشاط معين (يساعد المنسق على فهم الأصالة)
    function ttIdeas(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin', 'coordinator']);
      var live = {}; rowsOf('TResults').forEach(function (r) { if (r.status !== 'void') live[r.resultId] = 1; });
      var rows = rowsOf('TResponses').filter(function (x) { return live[x.resultId] && x.src !== 'x' && String(x.valid) === '1' && !x.dupOf && x.battery === p.battery && String(x.form) === String(p.form) && x.act === p.act; });
      var students = {}; rows.forEach(function (r) { students[r.studentId] = 1; });
      var cl = [];
      rows.forEach(function (r) {
        var key = r.key || E.ideaKey(r.text || r.title), tk = E.tokens(key), c = null;
        for (var i = 0; i < cl.length; i++) if (cl[i].key === key || (tk.length && E.jaccard(tk, cl[i].tk) >= 0.6)) { c = cl[i]; break; }
        if (!c) { c = { key: key, tk: tk, st: {}, ex: r.text || r.title || r.key, orig: r.orig }; cl.push(c); }
        c.st[r.studentId] = 1;
      });
      var N = Object.keys(students).length;
      var list = cl.map(function (c) { var n = Object.keys(c.st).length; return { key: c.key, example: String(c.ex).slice(0, 120), n: n, pct: N ? Math.round(n / N * 1000) / 10 : 0, orig: c.orig }; }).sort(function (a, b) { return b.n - a.n; });
      return { N: N, clusters: list.length, top: list.slice(0, 25), rare: list.filter(function (x) { return x.n === 1; }).length };
    }
    function ttSetStatus(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin', 'coordinator']);
      var r = find('TResults', 'resultId', str(p.resultId)); if (!r) err('النتيجة غير موجودة');
      var st = p.status === 'void' ? 'void' : 'valid';
      if (st === 'valid') { var jobs = rowsOf('TJobs').filter(function (j) { return j.resultId === r.resultId; }); if (jobs.some(function (j) { return j.status === 'queued'; })) st = 'scoring'; }
      DB().update('TResults', 'resultId', r.resultId, { status: st }); setSecret('ttDirty', '1'); K.log(s.username, 'ttResult_' + st, r.resultId);
      return {};
    }
    function ttRescore(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin', 'coordinator']);
      if (!aiReady()) err('أضف مفتاح Gemini وفعّل الذكاء الاصطناعي أولاً');
      var r = find('TResults', 'resultId', str(p.resultId)); if (!r) err('النتيجة غير موجودة');
      var at = find('TAttempts', 'attemptId', r.attemptId) || {}, data = J(at.data), kinds = r.battery === 'verbal' ? ['verbal'] : ['construct', 'complete', 'repeat'].filter(function (k) { return data.acts && data.acts[k] && data.acts[k].image; });
      if (!kinds.length) err('لا توجد إجابات أو صور قابلة للتصحيح');
      DB().lock(function () {
        rowsOf('TJobs').filter(function (j) { return j.resultId === r.resultId && j.status === 'queued'; }).forEach(function (j) { DB().update('TJobs', 'jobId', j.jobId, { status: 'done', error: 'استُبدلت' }); });
        DB().insertMany('TJobs', kinds.map(function (k) { return { jobId: uuid(), resultId: r.resultId, kind: k, status: 'queued', tries: '0', error: '', createdAt: now(), doneAt: '', model: '', nextAt: '' }; }));
        DB().update('TResults', 'resultId', r.resultId, { status: 'scoring' });
      });
      K.log(s.username, 'ttRescore', r.resultId);
      return { queued: kinds.length };
    }
    // إدخال إجابات ورقية من المعلم (للطلاب الذين أدّوا الاختبار على الورق)
    function ttPaperEntry(p) {
      var s = K.staffAuth(p.token);
      var ses = find('Sessions', 'code', str(p.code).toUpperCase()); if (!ses || ses.test !== 'torrance' || !K.canSeeSession(s, ses)) err('اختر جلسة اختبار تفكير إبداعي صحيحة');
      var sid = str(p.studentId), st = find('Students', 'studentId', sid); if (!st) err('رقم الطالب غير مسجّل');
      var cls = K.splitList(ses.classes);
      if (cls.length ? cls.indexOf(str(st.className)) < 0 : K.stageOfGrade(st.grade) !== ses.stage) err('الطالب ليس ضمن فصول هذه الجلسة');
      return DB().lock(function () {
        var a = rowsOf('TAttempts').filter(function (x) { return x.code === ses.code && str(x.studentId) === sid; })[0];
        if (a && a.status === 'submitted') err('سبق تسليم اختبار هذا الطالب في هذه الجلسة');
        if (!a) {
          var prev = rowsOf('TResults').filter(function (r) { return str(r.studentId) === sid && r.battery === ses.battery && r.status !== 'void'; });
          if (prev.length && !bool(ses.allowRetake)) err('للطالب نتيجة سابقة في هذا الاختبار');
          var form = Number(p.form) >= 1 && Number(p.form) <= 4 ? Number(p.form) : chooseForm(ses, prev.map(function (r) { return Number(r.form); }));
          a = { attemptId: uuid(), code: ses.code, studentId: sid, stage: K.stageOfGrade(st.grade), battery: ses.battery, form: String(form), status: 'in_progress', startedAt: now(), lastSeen: now(), actIdx: String(I.actCount(ses.battery)), actStart: '', data: '{}', stoken: '', submittedAt: '', mode: 'paper' };
          DB().insert('TAttempts', a);
        }
        var acts = p.acts || {}, images = p.images || {};
        I.getForm(ses.battery, a.form).acts.forEach(function (act) {
          if (!acts[act.id] && !images[act.id]) return;
          var payload = Object.assign({}, acts[act.id] || {}); if (ses.battery === 'figural') payload.paper = true;
          var d = mergeAct(a, act.id, payload, images[act.id]); a.data = JSON.stringify(d);
        });
        DB().update('TAttempts', 'attemptId', a.attemptId, { data: a.data });
        var res = finalize(a, '', { note: 'أُدخلت ورقياً بواسطة ' + s.name });
        K.log(s.username, 'ttPaperEntry', sid + ' ' + ses.code);
        return { resultId: res.resultId, form: Number(a.form), status: res.status };
      });
    }

    /* ---------------- إعدادات الذكاء الاصطناعي ---------------- */
    function aiStatus(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin', 'coordinator']);
      var jobs = rowsOf('TJobs'), key = secret('GEMINI_KEY'), c = J(secret('aiModels'), {});
      var cnt = function (st) { return jobs.filter(function (j) { return j.status === st; }).length; };
      var errs = jobs.filter(function (j) { return j.status === 'error'; }).slice(-5).map(function (j) { return j.error; });
      return {
        hasKey: !!key, keyMask: key ? key.slice(0, 4) + '••••' + key.slice(-4) : '', enabled: settings().aiEnabled !== '0', model: settings().aiModel || '', autoModels: c.list || [],
        queued: cnt('queued'), done: cnt('done'), error: cnt('error'), lastRun: Number(secret('aiLastRun') || 0), lastError: secret('aiLastError') || '', recentErrors: errs,
        todayCalls: todayCalls(), dailyMax: Number(settings().aiDailyMax || 1000), cooling: (function () { var c = J(secret('aiCool'), {}), t = now(); return Object.keys(c).filter(function (m) { return Number(c[m].until) > t; }); })(), trigger: DB().trigger ? DB().trigger('status') : 'غير متاح', serverAI: !!DB().http, dirty: secret('ttDirty') === '1'
      };
    }
    function aiSaveKey(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin']);
      var k = str(p.key);
      if (k && !/^[A-Za-z0-9_.\-]{20,300}$/.test(k)) err('صيغة المفتاح غير صحيحة: انسخ المفتاح كاملاً دون مسافات');
      setSecret('GEMINI_KEY', k); setSecret('aiModels', ''); setSecret('aiBad', ''); setSecret('aiLastError', '');
      K.log(s.username, 'aiKey', k ? 'تحديث المفتاح' : 'حذف المفتاح');
      return aiStatus(p);
    }
    function aiTest(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin']);
      var key = secret('GEMINI_KEY'); if (!key) err('أدخل المفتاح أولاً');
      if (!DB().http) return { demo: true };
      var list = listModels(key);
      if (!list.length) err('المفتاح يعمل لكن لم أجد نموذج Flash متاحاً');
      var out = callModel(key, { prompt: 'Reply with JSON only: {"ok":true,"msg":"مرحبا"}', images: [] }, 'verbal');
      return { ok: true, models: list, model: out.model, reply: String(out.text).slice(0, 120) };
    }
    function aiRun(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin', 'coordinator']);
      if (!DB().http) err('unsupported');
      var r = processQueue(Math.min(Number(p.budget) || 25000, 50000), 6);
      return Object.assign({ status: aiStatus(p) }, r);
    }
    function aiRequeue(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin', 'coordinator']);
      var n = 0;
      rowsOf('TJobs').forEach(function (j) { if (j.status === 'error') { DB().update('TJobs', 'jobId', j.jobId, { status: 'queued', tries: '0', nextAt: '', error: '' }); n++; var r = find('TResults', 'resultId', j.resultId); if (r && r.status === 'review') DB().update('TResults', 'resultId', r.resultId, { status: 'scoring' }); } });
      return { requeued: n };
    }
    // في الوضع التجريبي: المتصفح يتصل بـ Gemini مباشرة عبر هذين الإجراءين
    function aiNext(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin', 'coordinator']);
      if (DB().http) err('يتم التصحيح على الخادم مباشرة');
      var job = nextJobs(1)[0]; if (!job) return { job: null };
      var prep = prepareJob(job);
      if (!prep || prep.skip) { DB().update('TJobs', 'jobId', job.jobId, { status: 'done', doneAt: now(), error: 'لا توجد بيانات' }); settleResult(job.resultId); return aiNext(p); }
      return { job: { jobId: job.jobId, kind: job.kind }, prompt: prep.prompt, images: prep.images, key: secret('GEMINI_KEY'), model: settings().aiModel || '', models: J(secret('aiModels'), {}).list || [] };
    }
    function aiApply(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin', 'coordinator']);
      if (DB().http) err('يتم التصحيح على الخادم مباشرة');
      var job = find('TJobs', 'jobId', str(p.jobId)); if (!job) err('المهمة غير موجودة');
      if (p.models) setSecret('aiModels', JSON.stringify({ ts: now(), list: p.models }));
      countCall();
      if (p.error) { failJob(job, p.error, p.quota ? 15 * 60000 : 0); return { ok: false }; }
      try { applyJob(job, p.text, p.model); } catch (e) { failJob(job, e.message); return { ok: false, error: e.message }; }
      setSecret('aiLastRun', String(now()));
      return { ok: true };
    }
    function ttRecalc(p) { var s = K.staffAuth(p.token); K.need(s, ['admin', 'coordinator']); var r = recalcAll(); K.log(s.username, 'ttRecalc', JSON.stringify(r)); return r; }
    function aiTrigger(p) { var s = K.staffAuth(p.token); K.need(s, ['admin']); if (!DB().trigger) err('غير متاح في الوضع التجريبي'); var r = DB().trigger(p.on === false ? 'remove' : 'install'); K.log(s.username, 'aiTrigger', r); return aiStatus(p); }

    return {
      studentLogin: studentLogin, monitor: monitor, attemptAction: attemptAction, processQueue: processQueue, recalcAll: recalcAll,
      meta: function () { return { version: I.VERSION, ai: aiReady() }; },
      actions: {
        ttSave: ttSave, ttSubmit: ttSubmit, ttList: ttList, ttResult: ttResult, ttImage: ttImage, ttReview: ttReview, ttSetStatus: ttSetStatus, ttRescore: ttRescore, ttPaperEntry: ttPaperEntry, ttRecalc: ttRecalc, ttAgreement: ttAgreement, ttIdeas: ttIdeas,
        aiStatus: aiStatus, aiSaveKey: aiSaveKey, aiTest: aiTest, aiRun: aiRun, aiRequeue: aiRequeue, aiNext: aiNext, aiApply: aiApply, aiTrigger: aiTrigger
      }
    };
  }
  return { install: install };
})();
if (typeof module !== 'undefined') module.exports = TTCore;
