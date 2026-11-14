/* =====================================================================
   app.js — واجهة نظام اختبار المصفوفات للكشف عن الموهوبين
   ===================================================================== */
(function () {
  'use strict';
  const CFG = window.RV_CONFIG || {};
  // الوضع التجريبي يعمل فقط عندما يكون رابط الخادم فارغاً وخارج موقع النشر (أو عند إضافة ?demo=1)
  const ON_PROD = /github\.io$/i.test(location.hostname) && !/[?&]demo=1/.test(location.search);
  const DEMO = !CFG.API_URL && !ON_PROD;
  const NO_SERVER = !CFG.API_URL && ON_PROD;
  if (DEMO) Core.init(LocalDB);
  const I = window.RVItems, AN = window.RVAnalysis;
  const STAGE_NAME = { primary: 'الابتدائية', intermediate: 'المتوسطة', secondary: 'الثانوية' };
  const STAGE_TEST = { primary: 'المصفوفات الملونة', intermediate: 'المصفوفات القياسية', secondary: 'المصفوفات المتقدمة' };
  const ROLE_NAME = { admin: 'مدير النظام', coordinator: 'منسق الموهبة', teacher: 'معلم / مراقب' };
  const view = document.getElementById('view');

  /* ---------------- أدوات عامة ---------------- */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pad = n => String(n).padStart(2, '0');
  function fmtDate(ms, withTime) { if (!ms) return '—'; const d = new Date(Number(ms)); const s = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`; return withTime ? s + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : s; }
  function fmtDur(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + pad(sec % 60); }
  function ago(ms, now) { const s = Math.round(((now || Date.now()) - ms) / 1000); if (s < 60) return 'منذ ' + s + ' ث'; if (s < 3600) return 'منذ ' + Math.round(s / 60) + ' د'; return fmtDate(ms, true); }
  function toast(msg, type) { const t = document.createElement('div'); t.className = 'toast ' + (type || ''); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.classList.add('show'), 10); setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, type === 'err' ? 5000 : 3000); }
  function modal(html, opts) {
    opts = opts || {};
    const m = document.createElement('div'); m.className = 'modal-back';
    m.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''} ${opts.cls || ''}">${opts.noClose ? '' : '<button class="modal-x" data-close>×</button>'}${html}</div>`;
    document.body.appendChild(m);
    const close = () => { m.remove(); if (opts.onClose) opts.onClose(); };
    m.addEventListener('click', e => { if (e.target.closest('[data-close]') || (e.target === m && !opts.noClose)) close(); });
    return { el: m, close };
  }
  function confirmBox(msg, okText, danger) {
    return new Promise(res => {
      const m = modal(`<h3>تأكيد</h3><p>${msg}</p><div class="row end"><button class="btn ghost" data-close>إلغاء</button><button class="btn ${danger ? 'danger' : ''}" id="cfOk">${okText || 'تأكيد'}</button></div>`, { onClose: () => res(false) });
      $('#cfOk', m.el).onclick = () => { m.el.remove(); res(true); };
    });
  }
  function busy(btn, on) { if (!btn) return; if (on) { btn.dataset.t = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>'; } else { btn.disabled = false; if (btn.dataset.t) btn.innerHTML = btn.dataset.t; } }
  function downloadFile(name, content, type) { const b = new Blob([content], { type: type || 'text/csv;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function toCSV(rows) { return '﻿' + rows.map(r => r.map(v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n'); }

  /* ---------------- الاتصال بالخادم ---------------- */
  const S = { token: null, user: null, meta: null, page: 'home', param: null, results: null, timers: [] };
  try { const s = JSON.parse(sessionStorage.getItem('rvstaff') || 'null'); if (s) { S.token = s.token; S.user = s.user; } } catch (e) { }
  function saveStaff() { sessionStorage.setItem('rvstaff', JSON.stringify({ token: S.token, user: S.user })); }
  function logoutLocal() { S.token = null; S.user = null; S.meta = null; S.results = null; sessionStorage.removeItem('rvstaff'); }

  async function api(action, payload, opts) {
    opts = opts || {};
    const body = Object.assign({ action }, payload || {});
    if (!opts.noToken && S.token && !body.token) body.token = S.token;
    let res = null;
    if (DEMO) { await sleep(40); res = Core.handle(action, JSON.parse(JSON.stringify(body))); }
    else {
      const tries = opts.retries == null ? 3 : opts.retries;
      for (let k = 0; k < tries && !res; k++) {
        try { const r = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }); res = await r.json(); }
        catch (e) { if (k < tries - 1) await sleep(700 * (k + 1)); }
      }
      if (!res) { const e = new Error('تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة'); e.code = 'net'; throw e; }
    }
    if (!res.ok) {
      const e = new Error(res.error || 'خطأ'); e.code = res.code;
      if (res.code === 'auth' && !opts.student) { logoutLocal(); stopTimers(); render(); toast(res.error, 'err'); }
      throw e;
    }
    return res;
  }
  function stopTimers() { S.timers.forEach(t => clearInterval(t)); S.timers = []; }

  /* ===================================================================
     الوضع التجريبي: بيانات نموذجية
     =================================================================== */
  async function seedDemo(progress) {
    LocalDB.resetAll();
    const H = (a, p) => { const r = Core.handle(a, p); if (!r.ok) throw new Error(a + ': ' + r.error); return r; };
    const tok = H('login', { username: 'admin', password: 'Admin@2026' }).token;
    H('saveUser', { token: tok, user: { username: 'coord', name: 'منسق الموهبة (تجريبي)', role: 'coordinator', password: 'Coord@2026' } });
    H('saveUser', { token: tok, user: { username: 'teacher1', name: 'معلم الصف الخامس (تجريبي)', role: 'teacher', classes: ['5/أ بنين', '5/ب بنين'], password: 'Teach@2026' } });
    ['admin', 'coord', 'teacher1'].forEach(u => LocalDB.update('Users', 'username', u, { mustChange: '0' }));
    H('uploadKeys', { token: tok, keys: I.allKeys() });
    const boys = ['محمد', 'عبدالله', 'أحمد', 'خالد', 'فيصل', 'سعود', 'عمر', 'يوسف', 'إبراهيم', 'علي', 'حمزة', 'سلمان', 'تركي', 'ريان', 'مازن', 'زياد', 'نواف', 'بدر', 'ماجد', 'هشام'];
    const girls = ['سارة', 'نورة', 'ريم', 'لمى', 'جود', 'هيا', 'ليان', 'رغد', 'دانة', 'مريم', 'شهد', 'أسيل', 'رهف', 'غلا', 'لين', 'تالا'];
    const fam = ['الغامدي', 'الزهراني', 'الحربي', 'القحطاني', 'العتيبي', 'الشهري', 'المالكي', 'السلمي', 'الجهني', 'الشمراني', 'البقمي', 'الأحمدي', 'الثقفي', 'الدوسري'];
    const classes = [['4/أ بنين', 4, 'بنين', 18], ['5/أ بنين', 5, 'بنين', 20], ['5/ب بنين', 5, 'بنين', 20], ['5/أ بنات', 5, 'بنات', 18], ['6/أ بنين', 6, 'بنين', 20], ['6/أ بنات', 6, 'بنات', 16],
      ['7/أ', 7, 'بنين', 22], ['8/أ', 8, 'بنين', 22], ['9/أ', 9, 'بنين', 20], ['10/أ', 10, 'بنين', 18], ['11/أ', 11, 'بنين', 18], ['12/أ', 12, 'بنين', 16]];
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    const students = []; let id = 1100000;
    classes.forEach(([cn, g, gen, n]) => { for (let k = 0; k < n; k++) { const fn = gen === 'بنات' ? girls[Math.floor(rnd() * girls.length)] : boys[Math.floor(rnd() * boys.length)]; const by = 2026 - g - 6, bm = 1 + Math.floor(rnd() * 12); students.push({ studentId: String(id++), name: fn + ' ' + boys[Math.floor(rnd() * boys.length)] + ' ' + fam[Math.floor(rnd() * fam.length)], gender: gen, grade: g, className: cn, track: 'عام', dob: `${by}-${pad(bm)}-${pad(1 + Math.floor(rnd() * 27))}` }); } });
    H('importStudents', { token: tok, students });
    const sesOf = {};
    for (const st of ['primary', 'intermediate', 'secondary']) sesOf[st] = H('createSession', { token: tok, session: { title: 'التطبيق الأول ' + STAGE_NAME[st], stage: st, formMode: 'rotate', timeLimit: I.STAGES[st].timeDefault, classes: [] } }).session.code;
    let done = 0;
    for (const s of students) {
      done++; if (done % 15 === 0 && progress) { progress(Math.round(done / students.length * 100)); await sleep(0); }
      if (rnd() < 0.12) continue;
      const stage = I.stageOfGrade(s.grade);
      const L = H('studentLogin', { studentId: s.studentId, code: sesOf[stage] });
      const items = I.getForm(stage, L.attempt.form).items, N = items.length;
      const guesser = rnd() < 0.03;
      const theta = gauss() + (s.grade - (stage === 'primary' ? 5 : stage === 'intermediate' ? 8 : 11)) * 0.35;
      let ans = '', times = [];
      const sets = I.setIndex(stage);
      items.forEach((it, i) => {
        const set = sets.find(x => i >= x.from && i <= x.to); const t = (i - set.from) / set.n;
        const d = stage === 'secondary' ? (set.id === 'I' ? -2 + 2.4 * t : -1.3 + 3.6 * t) : (-2.6 + 5 * (i / N) + 1.1 * (t - 0.5));
        const nOpt = it.options.length, c = 1 / nOpt;
        const pr = c + (1 - c) / (1 + Math.exp(-1.7 * (theta - d)));
        const skip = rnd() < 0.015;
        if (skip) { ans += '0'; times.push(0); return; }
        if (!guesser && rnd() < pr) ans += it.answer; else { let w; do { w = 1 + Math.floor(rnd() * nOpt); } while (w === it.answer); ans += guesser && rnd() < c ? it.answer : w; }
        times.push(guesser ? 1 + Math.floor(rnd() * 2) : Math.round(12 + rnd() * 40 + t * 30));
      });
      H('studentSubmit', { stoken: L.stoken, answers: ans, times: times.join(',') });
      const tsum = times.reduce((a, b) => a + b, 0);
      LocalDB.update('Results', 'attemptId', L.attempt.attemptId, { timeSec: String(tsum), submittedAt: String(Date.now() - Math.floor(rnd() * 20) * 86400000) });
    }
    for (const st in sesOf) H('setSessionStatus', { token: tok, code: sesOf[st], status: 'closed' });
    if (TT) await TT.seed(H, tok, students, rnd, progress);
    for (const st of ['primary', 'intermediate', 'secondary']) H('createSession', { token: tok, session: { title: 'جلسة للتجربة – ' + STAGE_NAME[st], stage: st, formMode: 'rotate', timeLimit: I.STAGES[st].timeDefault, classes: [], allowRetake: true } });
    H('logout', { token: tok });
    LocalDB.markSeeded();
  }

  /* ===================================================================
     شاشة الدخول
     =================================================================== */
  function viewLogin() {
    let demoBox = '';
    if (DEMO) {
      const open = LocalDB.rows('Sessions').filter(s => s.status === 'open');
      const st = LocalDB.rows('Students');
      const ex = s => { const x = st.find(q => I.stageOfGrade(q.grade) === s.stage); return x ? x.studentId : '—'; };
      demoBox = `<div class="demo-box"><b>الوضع التجريبي</b> — البيانات محفوظة في هذا المتصفح فقط، وفيها طلاب ونتائج افتراضية للتجربة.
      <table class="mini"><tr><th>الدور</th><th>المستخدم</th><th>كلمة المرور</th></tr><tr><td>مدير النظام</td><td>admin</td><td>Admin@2026</td></tr><tr><td>منسق الموهبة</td><td>coord</td><td>Coord@2026</td></tr><tr><td>معلم</td><td>teacher1</td><td>Teach@2026</td></tr></table>
      <div class="sm">جلسات مفتوحة للتجربة كطالب: ${open.map(s => `<span class="chip">${STAGE_NAME[s.stage]}: رمز <b dir="ltr">${s.code}</b> — رقم طالب مثال <b dir="ltr">${ex(s)}</b></span>`).join(' ')}</div>
      <button class="btn ghost sm-btn" data-act="demoReset">إعادة ضبط البيانات التجريبية</button></div>`;
    }
    view.innerHTML = `<div class="login-wrap"><div class="login-card">
      <div class="brand-big"><div class="logo">${logoSvg()}</div><h1>نظام الكشف عن الموهوبين</h1><p>اختبار المصفوفات للاستدلال المجرد واختبار التفكير الإبداعي</p></div>
      <div class="tabs"><button class="tab on" data-tab="stu">دخول الطالب</button><button class="tab" data-tab="staff">دخول المنسوبين</button></div>
      <form id="fStu" class="tabpane">
        <label>رقم الطالب<input name="sid" inputmode="numeric" autocomplete="off" dir="ltr" required></label>
        <label>رمز الجلسة<input name="code" autocomplete="off" dir="ltr" class="code-in" maxlength="6" required></label>
        <button class="btn big">ابدأ</button>
        <p class="hint">رمز الجلسة يعطيك إياه المعلم داخل القاعة.</p>
      </form>
      <form id="fStaff" class="tabpane hidden">
        <label>اسم المستخدم<input name="u" autocomplete="username" dir="ltr" required></label>
        <label>كلمة المرور<input name="p" type="password" autocomplete="current-password" dir="ltr" required></label>
        <button class="btn big">دخول</button>
      </form>
      ${demoBox}</div></div>`;
    $$('.tab').forEach(t => t.onclick = () => { $$('.tab').forEach(x => x.classList.toggle('on', x === t)); $('#fStu').classList.toggle('hidden', t.dataset.tab !== 'stu'); $('#fStaff').classList.toggle('hidden', t.dataset.tab !== 'staff'); });
    $('#fStaff').onsubmit = async e => {
      e.preventDefault(); const b = $('button', e.target); busy(b, true);
      try {
        const r = await api('login', { username: e.target.u.value, password: e.target.p.value }, { noToken: true });
        S.token = r.token; S.user = r.user; saveStaff(); S.page = 'home'; await loadMeta(); render();
      } catch (er) { toast(er.message, 'err'); } finally { busy(b, false); }
    };
    $('#fStu').onsubmit = async e => {
      e.preventDefault(); const b = $('button', e.target); busy(b, true);
      try { const r = await api('studentLogin', { studentId: e.target.sid.value.trim(), code: e.target.code.value.trim().toUpperCase() }, { noToken: true, student: true }); if (r.test === 'torrance' && TT) TT.start(r); else startStudent(r); }
      catch (er) { toast(er.message, 'err'); } finally { busy(b, false); }
    };
  }
  function logoSvg() { return '<svg viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" rx="12" fill="#0f5c6e"/><g fill="none" stroke="#fff" stroke-width="2.4"><rect x="10" y="10" width="12" height="12"/><circle cx="36" cy="16" r="6"/><path d="M10 44l6-10 6 10z"/><rect x="30" y="30" width="12" height="12" stroke-dasharray="3 2" stroke="#f2c12e"/></g><text x="36" y="40" font-size="9" fill="#f2c12e" text-anchor="middle" font-family="Arial" font-weight="700">?</text></svg>'; }

  /* ===================================================================
     واجهة الطالب
     =================================================================== */
  let STU = null;
  function stuKey() { return 'rvatt:' + STU.attempt.attemptId; }
  function stuPersist() { if (!STU) return; localStorage.setItem(stuKey(), JSON.stringify({ answers: STU.answers, times: STU.times, cur: STU.cur, phase: STU.phase })); localStorage.setItem('rvstu', JSON.stringify({ stoken: STU.stoken, attempt: STU.attempt, student: STU.student, session: STU.session, school: STU.school, offset: STU.offset })); }
  function stuClear() { if (STU) localStorage.removeItem(stuKey()); localStorage.removeItem('rvstu'); }
  function startStudent(r) {
    const n = I.itemCount(r.attempt.stage);
    STU = { stoken: r.stoken, attempt: r.attempt, student: r.student, session: r.session, school: r.school, offset: r.serverNow - Date.now(), answers: Array(n).fill(0), times: Array(n).fill(0), cur: 0, phase: 'welcome', lastSave: Date.now(), unsaved: 0 };
    const srvA = (r.attempt.answers || '').split('').map(Number), srvT = (r.attempt.times || '').split(',').map(Number);
    let local = null; try { local = JSON.parse(localStorage.getItem(stuKey()) || 'null'); } catch (e) { }
    const cnt = a => a.filter(x => x > 0).length;
    if (local && cnt(local.answers) >= cnt(srvA)) { STU.answers = local.answers; STU.times = local.times; STU.cur = local.cur || 0; if (local.phase === 'test') STU.phase = 'test'; }
    else if (cnt(srvA)) { srvA.forEach((v, i) => { if (i < n) STU.answers[i] = v || 0; }); srvT.forEach((v, i) => { if (i < n) STU.times[i] = v || 0; }); STU.phase = 'test'; }
    if (r.attempt.progress > 0 || STU.phase === 'test') STU.phase = 'test';
    STU.items = I.getForm(r.attempt.stage, r.attempt.form).items;
    stuPersist(); renderStudent();
  }
  function stuRemaining() { const tl = STU.session.timeLimit; if (!tl) return null; return (STU.attempt.startedAt + tl * 60000) - (Date.now() + STU.offset); }
  function renderStudent() {
    stopTimers();
    document.body.classList.add('student-mode');
    const st = STU.attempt.stage;
    if (STU.phase === 'welcome') {
      const N = STU.items.length, tl = STU.session.timeLimit;
      view.innerHTML = `<div class="stu-card"><div class="logo sm">${logoSvg()}</div>
        <h2>مرحباً ${esc(STU.student.name)}</h2>
        <p class="muted">${esc(STU.school || '')} — ${esc(STU.student.className)}</p>
        <div class="welcome-box">
          <p>في هذا الاختبار سترى في كل سؤال <b>شكلاً ينقصه جزء</b>.</p>
          <p>انظر جيداً إلى الشكل، ثم اختر من الأجزاء التي في الأسفل <b>الجزء الذي يكمله</b> بشكل صحيح.</p>
          <p>عدد الأسئلة: <b>${N}</b>${tl ? ` — الوقت المتاح: <b>${tl} دقيقة</b>` : ' — لا يوجد وقت محدد، خذ وقتك'}.</p>
          <p>الأسئلة تبدأ سهلة ثم تصعب تدريجياً. حاول في كل سؤال، ويمكنك الرجوع لتعديل إجابتك.</p>
        </div>
        <button class="btn big" data-act="stuPractice">ابدأ بمثالين للتدريب</button></div>`;
      bindStudent(); return;
    }
    if (STU.phase === 'practice') { renderPractice(); return; }
    if (STU.phase === 'done') { renderDone(); return; }
    const tick = () => {
      const el = $('#timer'); const rem = stuRemaining();
      if (el) { if (rem == null) { el.textContent = fmtDur((Date.now() + STU.offset - STU.attempt.startedAt) / 1000); } else { el.textContent = fmtDur(rem / 1000); el.classList.toggle('warn', rem < 5 * 60000); } }
      if (rem != null && rem <= 0 && !STU.submitting) { toast('انتهى الوقت، يتم تسليم إجاباتك الآن'); submitTest(true); }
      if ((Date.now() - STU.lastSave) / 1000 > (CFG.SAVE_EVERY_SECONDS || 60) && STU.unsaved > 0) serverSave();
    };
    STU.tick = tick; renderItem();
    S.timers.push(setInterval(tick, 1000));
  }
  let practiceState = null;
  function renderPractice() {
    const P = I.getPractice(STU.attempt.stage);
    if (!practiceState) practiceState = { i: 0, wrong: 0, sel: 0 };
    const it = P[practiceState.i];
    view.innerHTML = `<div class="test"><div class="t-top"><div class="t-who">مثال للتدريب ${practiceState.i + 1} من 2</div></div>
      <div class="t-body">${itemHtml(it, practiceState.sel)}</div>
      <div class="p-msg" id="pmsg">${practiceState.msg || 'اختر الجزء الذي يكمل الشكل'}</div>
      <div class="t-nav">${practiceState.done ? `<button class="btn big" data-act="pNext">${practiceState.i === 1 ? 'ابدأ الاختبار' : 'المثال التالي'}</button>` : ''}</div></div>`;
    $$('.opt').forEach(b => b.onclick = () => {
      if (practiceState.done) return;
      const v = +b.dataset.v; practiceState.sel = v;
      if (v === it.answer) { practiceState.msg = '<span class="ok">أحسنت! هذا هو الجزء الصحيح ✓</span>'; practiceState.done = true; }
      else { practiceState.wrong++; if (practiceState.wrong >= 2) { practiceState.msg = `<span class="bad">الإجابة الصحيحة هي رقم ${it.answer}. لاحظ كيف يكمل الشكل.</span>`; practiceState.sel = it.answer; practiceState.done = true; } else practiceState.msg = '<span class="bad">ليست هذه. انظر جيداً وحاول مرة أخرى</span>'; }
      renderPractice();
    });
    bindStudent();
  }
  function itemHtml(it, sel) {
    const n = it.options.length;
    return `<div class="stem-wrap lay-${it.layout}">${it.stem}</div><div class="opts n${n}">${it.options.map((o, k) => `<button class="opt ${sel === k + 1 ? 'sel' : ''}" data-v="${k + 1}"><span class="on">${k + 1}</span>${o}</button>`).join('')}</div>`;
  }
  function renderItem() {
    const it = STU.items[STU.cur], N = STU.items.length;
    const answered = STU.answers.filter(x => x > 0).length;
    const setName = it.set === 'I' || it.set === 'II' ? it.setLabel : 'المجموعة ' + it.setLabel;
    view.innerHTML = `<div class="test">
      <div class="t-top"><div class="t-who">${esc(STU.student.name)}</div><div class="t-pos">${setName} — السؤال <b>${STU.cur + 1}</b> من ${N}</div>
        <div class="t-tools"><span class="savest" id="savest">${STU.unsaved ? '' : '✓ محفوظ'}</span><span id="timer" class="timer"></span><button class="btn ghost" data-act="stuMap">الأسئلة (${answered}/${N})</button></div></div>
      <div class="progress"><span style="width:${(answered / N * 100).toFixed(1)}%"></span></div>
      <div class="t-body">${itemHtml(it, STU.answers[STU.cur])}</div>
      <div class="t-nav"><button class="btn ghost" data-act="stuPrev" ${STU.cur === 0 ? 'disabled' : ''}>→ السابق</button>
        ${STU.cur === N - 1 ? '<button class="btn warn" data-act="stuFinish">إنهاء وتسليم</button>' : '<button class="btn" data-act="stuNext">التالي ←</button>'}</div></div>`;
    STU.shownAt = Date.now();
    if (STU.tick) STU.tick();
    $$('.opt').forEach(b => b.onclick = () => {
      const v = +b.dataset.v; const was = STU.answers[STU.cur];
      STU.answers[STU.cur] = v; if (was !== v) STU.unsaved++;
      $$('.opt').forEach(x => x.classList.toggle('sel', x === b));
      const s = $('#savest'); if (s) s.textContent = '';
      stuPersist();
      if (STU.unsaved >= (CFG.SAVE_EVERY_ANSWERS || 5)) serverSave();
      if (STU.autoTimer) clearTimeout(STU.autoTimer);
      if (STU.cur < N - 1) STU.autoTimer = setTimeout(() => goItem(STU.cur + 1), 450);
    });
    bindStudent();
  }
  function accTime() { if (STU.shownAt) { STU.times[STU.cur] = Math.min(3600, (STU.times[STU.cur] || 0) + Math.round((Date.now() - STU.shownAt) / 1000)); STU.shownAt = null; } }
  function goItem(i) { if (STU.autoTimer) { clearTimeout(STU.autoTimer); STU.autoTimer = null; } accTime(); STU.cur = Math.max(0, Math.min(STU.items.length - 1, i)); stuPersist(); renderItem(); }
  async function serverSave() {
    if (STU.saving) return; STU.saving = true;
    const snap = STU.unsaved;
    try {
      const r = await api('studentSave', { stoken: STU.stoken, answers: STU.answers.join(''), times: STU.times.join(','), progress: STU.cur }, { noToken: true, student: true, retries: 1 });
      STU.unsaved = Math.max(0, STU.unsaved - snap); STU.lastSave = Date.now(); const s = $('#savest'); if (s && !STU.unsaved) s.textContent = '✓ محفوظ';
      if (r.status === 'submitted') { STU.phase = 'done'; stuClear(); renderStudent(); }
    } catch (e) {
      if (e.code === 'superseded' || e.code === 'auth') { stopTimers(); stuClear(); view.innerHTML = `<div class="stu-card"><h2>تنبيه</h2><p>${esc(e.message)}</p><button class="btn" data-act="stuExit">العودة</button></div>`; bindStudent(); STU = null; }
      else { const s = $('#savest'); if (s) s.textContent = '⚠ غير متصل – محفوظ على الجهاز'; STU.lastSave = Date.now(); }
    } finally { if (STU) STU.saving = false; }
  }
  function openMap() {
    const N = STU.items.length; let html = '<h3>خريطة الأسئلة</h3><p class="muted">الأخضر: تمت الإجابة — الأبيض: لم تتم الإجابة. اضغط على أي رقم للانتقال إليه.</p><div class="qmap">';
    let lastSet = '';
    STU.items.forEach((it, i) => { if (it.set !== lastSet) { html += `<div class="qset">${it.set === 'I' || it.set === 'II' ? it.setLabel : 'المجموعة ' + it.setLabel}</div>`; lastSet = it.set; } html += `<button class="q ${STU.answers[i] ? 'done' : ''} ${i === STU.cur ? 'cur' : ''}" data-q="${i}">${i + 1}</button>`; });
    html += `</div><div class="row end"><button class="btn warn" id="mapFinish">إنهاء وتسليم</button></div>`;
    const m = modal(html, { wide: true });
    $$('[data-q]', m.el).forEach(b => b.onclick = () => { m.close(); goItem(+b.dataset.q); });
    $('#mapFinish', m.el).onclick = () => { m.close(); finishAsk(); };
  }
  async function finishAsk() {
    accTime(); STU.shownAt = Date.now();
    const left = STU.answers.filter(x => !x).length;
    const ok = await confirmBox(left ? `بقي <b>${left}</b> سؤالاً بدون إجابة. هل تريد التسليم الآن؟<br><span class="muted">بعد التسليم لا يمكنك تعديل الإجابات.</span>` : 'أجبت عن جميع الأسئلة. هل تريد تسليم الاختبار؟', 'نعم، سلّم الاختبار');
    if (ok) submitTest(false);
  }
  async function submitTest(auto) {
    if (STU.submitting) return; STU.submitting = true; accTime(); stopTimers(); stuPersist();
    view.innerHTML = `<div class="stu-card"><h2>جارٍ تسليم الاختبار…</h2><div class="spin big"></div></div>`;
    try {
      const r = await api('studentSubmit', { stoken: STU.stoken, answers: STU.answers.join(''), times: STU.times.join(',') }, { noToken: true, student: true, retries: 4 });
      STU.result = r.result; STU.phase = 'done'; stuClear(); renderStudent();
    } catch (e) {
      STU.submitting = false;
      view.innerHTML = `<div class="stu-card"><h2>لم يكتمل التسليم</h2><p>${esc(e.message)}</p><p class="muted">إجاباتك محفوظة على هذا الجهاز ولن تضيع.</p><button class="btn big" data-act="stuRetry">إعادة محاولة التسليم</button></div>`; bindStudent();
    }
  }
  function renderDone() {
    stopTimers();
    let res = '';
    if (STU.result) { const r = STU.result; res = `<div class="score-big">${r.score} <small>من ${r.max}</small></div>`; }
    view.innerHTML = `<div class="stu-card done"><div class="check">✓</div><h2>تم تسليم الاختبار بنجاح</h2><p>شكراً لك يا ${esc(STU.student.name)}، أحسنت المحاولة.</p>${res}<button class="btn" data-act="stuExit">إنهاء</button></div>`;
    bindStudent();
  }
  function bindStudent() {
    view.onclick = e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      const act = a.dataset.act;
      if (act === 'stuPractice') { STU.phase = 'practice'; practiceState = null; renderStudent(); }
      else if (act === 'pNext') { if (practiceState.i === 0) { practiceState = { i: 1, wrong: 0, sel: 0 }; renderPractice(); } else { practiceState = null; STU.phase = 'test'; stuPersist(); renderStudent(); } }
      else if (act === 'stuNext') goItem(STU.cur + 1);
      else if (act === 'stuPrev') goItem(STU.cur - 1);
      else if (act === 'stuMap') openMap();
      else if (act === 'stuFinish') finishAsk();
      else if (act === 'stuRetry') { STU.submitting = false; submitTest(false); }
      else if (act === 'stuExit') { STU = null; stuClear(); document.body.classList.remove('student-mode'); render(); }
    };
  }
  document.addEventListener('keydown', e => {
    if (!STU || STU.phase !== 'test' || document.querySelector('.modal-back')) return;
    if (/^[1-8]$/.test(e.key)) { const b = $(`.opt[data-v="${e.key}"]`); if (b) b.click(); }
    else if (e.key === 'ArrowLeft') goItem(STU.cur + 1);
    else if (e.key === 'ArrowRight') goItem(STU.cur - 1);
  });
  window.addEventListener('beforeunload', e => { if (STU && STU.phase === 'test') { accTime(); stuPersist(); } });

  /* ===================================================================
     واجهة المنسوبين
     =================================================================== */
  const NAV = [
    { id: 'home', t: 'الرئيسية', ic: '⌂', roles: ['admin', 'coordinator', 'teacher'] },
    { id: 'sessions', t: 'جلسات الاختبار', ic: '◷', roles: ['admin', 'coordinator', 'teacher'] },
    { id: 'results', t: 'نتائج المصفوفات', ic: '▤', roles: ['admin', 'coordinator', 'teacher'], g: 'المصفوفات' },
    { id: 'nominations', t: 'ترشيح المصفوفات', ic: '★', roles: ['admin', 'coordinator'] },
    { id: 'analysis', t: 'تحليل المصفوفات', ic: '◔', roles: ['admin', 'coordinator'] },
    { id: 'preview', t: 'نماذج المصفوفات', ic: '▦', roles: ['admin', 'coordinator'] },
    { id: 'ttResults', t: 'نتائج التفكير الإبداعي', ic: '✎', roles: ['admin', 'coordinator', 'teacher'], g: 'التفكير الإبداعي' },
    { id: 'ttNomTT', t: 'ترشيح التفكير الإبداعي', ic: '★', roles: ['admin', 'coordinator'] },
    { id: 'ttAnalysis', t: 'تحليل التفكير الإبداعي', ic: '◕', roles: ['admin', 'coordinator'] },
    { id: 'ttPreview', t: 'نماذج التفكير الإبداعي', ic: '❖', roles: ['admin', 'coordinator'] },
    { id: 'ttFinal', t: 'الترشيح العام', ic: '✪', roles: ['admin', 'coordinator'], g: 'الترشيح العام' },
    { id: 'ttProfile', t: 'الملف الموحّد للطلاب', ic: '☷', roles: ['admin', 'coordinator'] },
    { id: 'ttReports', t: 'التقرير الكامل للطالب', ic: '❏', roles: ['admin', 'coordinator'] },
    { id: 'students', t: 'الطلاب', ic: '☰', roles: ['admin', 'coordinator', 'teacher'], g: 'الإدارة' },
    { id: 'users', t: 'المستخدمون', ic: '⚿', roles: ['admin'] },
    { id: 'settings', t: 'الإعدادات', ic: '⚙', roles: ['admin'] },
    { id: 'log', t: 'سجل العمليات', ic: '≣', roles: ['admin'] }
  ];
  const role = () => S.user && S.user.role;
  const isAll = () => role() === 'admin' || role() === 'coordinator';
  async function loadMeta() {
    const m = await api('getMeta'); S.meta = m; S.user = m.user; saveStaff();
    if (m.user.role === 'admin' && (m.keys.count !== 12 || m.keys.version !== I.VERSION)) {
      try { const r = await api('uploadKeys', { keys: I.allKeys() }); toast('تم رفع مفاتيح الإجابة للنماذج الاثني عشر' + (r.rescored ? ` وإعادة تصحيح ${r.rescored} نتيجة` : '')); S.meta = await api('getMeta'); } catch (e) { toast('تعذّر رفع مفاتيح الإجابة: ' + e.message, 'err'); }
    }
  }
  async function getResults(force) { if (!S.results || force) { const r = await api('listResults'); S.results = r.results; S.meta.settings = r.settings; } return S.results; }

  function shell(content) {
    const nav = NAV.filter(n => n.roles.includes(role())).map(n => `${n.g ? `<div class="nav-g">${n.g}</div>` : ''}<button class="nav-i ${S.page === n.id || (S.page === 'monitor' && n.id === 'sessions') || (S.page === 'ttReviewQ' && n.id === 'ttResults') ? 'on' : ''}" data-nav="${n.id}"><span class="ic">${n.ic}</span>${n.t}</button>`).join('');
    view.innerHTML = `<div class="shell"><aside class="side"><div class="side-brand"><div class="logo sm">${logoSvg()}</div><div><b>الكشف عن الموهوبين</b><small>${esc((S.meta && S.meta.settings.schoolName) || '')}</small></div></div><nav>${nav}</nav>
      <div class="side-user"><div><b>${esc(S.user.name)}</b><small>${ROLE_NAME[role()]}</small></div><button class="btn ghost sm-btn" data-act="changePw">كلمة المرور</button><button class="btn ghost sm-btn" data-act="logout">خروج</button></div></aside>
      <section class="content">${DEMO ? '<div class="demo-strip">الوضع التجريبي — البيانات في هذا المتصفح فقط. لتشغيل النظام الحقيقي ضع رابط Apps Script في config.js</div>' : ''}<div id="page">${content}</div></section>
      <button class="menu-tgl" data-act="menu">☰</button></div>`;
  }
  async function render() {
    stopTimers();
    document.body.classList.remove('student-mode');
    if (TT && TT.active()) { TT.render(); return; }
    if (STU) { renderStudent(); return; }
    if (!S.token) { viewLogin(); return; }
    if (!S.meta) { view.innerHTML = '<div class="center"><div class="spin big"></div></div>'; try { await loadMeta(); } catch (e) { return; } }
    if (S.user.mustChange) { shell('<div class="card"><h2>مرحباً</h2><p>يجب تغيير كلمة المرور المؤقتة قبل المتابعة.</p></div>'); changePw(true); bindStaff(); return; }
    const page = PAGES[S.page] && NAV.concat([{ id: 'monitor', roles: ['admin', 'coordinator', 'teacher'] }, { id: 'ttReviewQ', roles: ['admin', 'coordinator'] }]).find(n => n.id === S.page && n.roles.includes(role())) ? S.page : 'home';
    S.page = page;
    shell('<div class="center"><div class="spin big"></div></div>'); bindStaff();
    try { await PAGES[page](); } catch (e) { if (e.code !== 'auth') $('#page').innerHTML = `<div class="card err">${esc(e.message)}</div>`; }
  }
  function setPage(html) { const p = $('#page'); if (p) p.innerHTML = html; }
  function bindStaff() {
    view.onclick = async e => {
      const n = e.target.closest('[data-nav]');
      if (n) { S.page = n.dataset.nav; S.param = n.dataset.param || null; $('.shell') && $('.shell').classList.remove('menu-open'); render(); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      const f = ACT[a.dataset.act]; if (f) { e.preventDefault(); f(a, e); }
    };
  }
  function changePw(forced) {
    const m = modal(`<h3>تغيير كلمة المرور</h3><form id="fPw"><label>كلمة المرور الحالية<input type="password" name="o" required dir="ltr"></label><label>كلمة المرور الجديدة (8 أحرف على الأقل)<input type="password" name="n" required minlength="8" dir="ltr"></label><label>تأكيد كلمة المرور الجديدة<input type="password" name="n2" required dir="ltr"></label><div class="row end"><button class="btn">حفظ</button></div></form>`, { noClose: forced });
    $('#fPw', m.el).onsubmit = async e => {
      e.preventDefault(); const f = e.target; if (f.n.value !== f.n2.value) { toast('كلمتا المرور غير متطابقتين', 'err'); return; }
      const b = $('button', f); busy(b, true);
      try { const r = await api('changePassword', { oldPassword: f.o.value, newPassword: f.n.value }); S.user = r.user; saveStaff(); m.close(); toast('تم تغيير كلمة المرور'); if (forced) render(); } catch (er) { toast(er.message, 'err'); } finally { busy(b, false); }
    };
  }

  const ACT = {
    logout: async () => { try { await api('logout'); } catch (e) { } logoutLocal(); render(); },
    changePw: () => changePw(false),
    menu: () => $('.shell').classList.toggle('menu-open'),
    demoReset: async (b) => { if (!(await confirmBox('سيتم حذف كل البيانات التجريبية وإنشاء بيانات جديدة. متابعة؟', 'إعادة الضبط', true))) return; await runSeed(); logoutLocal(); render(); }
  };

  /* ---------------- الرئيسية ---------------- */
  const PAGES = {};
  PAGES.home = async () => {
    const [ses, res] = await Promise.all([api('listSessions'), getResults(true)]);
    const rows = AN.enrich(res.map(r => Object.assign({}, r)), S.meta.settings, 'grade');
    const open = ses.sessions.filter(s => s.status === 'open');
    const byStage = st => rows.filter(r => r.stage === st);
    const nom = rows.filter(r => r._nominated).length;
    const pending = rows.filter(r => r.status === 'pending').length;
    let warn = '';
    if (role() === 'admin' && (S.meta.keys.count !== 12 || S.meta.keys.version !== I.VERSION)) warn = `<div class="card err">مفاتيح الإجابة غير مرفوعة أو قديمة. <button class="btn sm-btn" data-act="uploadKeys">رفع المفاتيح الآن</button></div>`;
    if (pending) warn += `<div class="card warnc">يوجد ${pending} نتيجة بانتظار التصحيح (لم تُرفع مفاتيح الإجابة). ${role() === 'admin' ? '<button class="btn sm-btn" data-act="uploadKeys">رفع المفاتيح وإعادة التصحيح</button>' : 'راجع مدير النظام.'}</div>`;
    setPage(`<h1 class="ph">الرئيسية</h1>${warn}
      <div class="cards">
        <div class="stat"><b>${open.length}</b><span>جلسات مفتوحة الآن</span></div>
        <div class="stat"><b>${rows.filter(r => r.status === 'valid').length}</b><span>اختبار مصحَّح</span></div>
        ${isAll() ? `<div class="stat gold"><b>${nom}</b><span>مرشح للموهبة</span></div>` : ''}
        <div class="stat"><b>${S.meta.classes.reduce((a, c) => a + c.count, 0)}</b><span>طالب ${isAll() ? 'مسجّل' : 'في فصولك'}</span></div>
      </div>
      <div class="grid3">${['primary', 'intermediate', 'secondary'].map(st => { const v = byStage(st).filter(r => r.status === 'valid'); const sc = v.map(r => r._score); return `<div class="card"><h3>المرحلة ${STAGE_NAME[st]}</h3><p class="muted">${STAGE_TEST[st]} — ${I.STAGES[st].maxScore} درجة</p><div class="kv"><span>عدد المختبَرين</span><b>${v.length}</b></div><div class="kv"><span>المتوسط</span><b>${sc.length ? AN.round(AN.mean(sc), 1) : '—'}</b></div>${isAll() ? `<div class="kv"><span>المرشحون</span><b>${v.filter(r => r._nominated).length}</b></div>` : ''}</div>`; }).join('')}</div>
      <div class="card"><div class="row between"><h3>الجلسات المفتوحة</h3><button class="btn" data-act="newSession">+ جلسة جديدة</button></div>
      ${open.length ? sessionsTable(open) : '<p class="muted">لا توجد جلسات مفتوحة. أنشئ جلسة جديدة ليدخل الطلاب برمزها.</p>'}</div>
      ${TT ? await TT.homeHtml() : ''}
      <div class="card guide"><h3>خطوات تطبيق الاختبار</h3><ol><li>تأكد أن طلاب الفصل مسجلون في صفحة «الطلاب».</li><li>أنشئ «جلسة جديدة» واختر المرحلة والفصول، فيظهر رمز من 6 خانات.</li><li>اعرض الرمز للطلاب؛ يدخل كل طالب برقمه والرمز ويؤدي مثالين للتدريب ثم الاختبار.</li><li>تابع التقدم مباشرة من «متابعة»، وأغلق الجلسة بعد انتهاء الجميع.</li><li>راجع «النتائج» و«الترشيح للموهبة» وتقارير الطلاب.</li></ol></div>`);
  };
  ACT.uploadKeys = async (b) => { busy(b, true); try { const r = await api('uploadKeys', { keys: I.allKeys() }); toast(`تم رفع ${r.count} مفتاحاً` + (r.rescored ? ` وإعادة تصحيح ${r.rescored} نتيجة` : '')); S.meta = await api('getMeta'); S.results = null; render(); } catch (e) { toast(e.message, 'err'); busy(b, false); } };

  /* ---------------- الجلسات ---------------- */
  function sessionsTable(list) {
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>الرمز</th><th>الاختبار</th><th>العنوان</th><th>المرحلة</th><th>الفصول</th><th>النموذج</th><th>الوقت</th><th>الحالة</th><th>بدأ/سلّم</th><th>أنشأها</th><th></th></tr></thead><tbody>
    ${list.map(s => `<tr><td><b class="code" dir="ltr">${s.code}</b></td><td>${s.test === 'torrance' ? `<span class="badge tt">إبداعي – ${s.battery === 'verbal' ? 'لفظي' : 'شكلي'}</span>` : '<span class="badge">مصفوفات</span>'}</td><td>${esc(s.title)}</td><td>${STAGE_NAME[s.stage]}</td><td class="sm">${s.classes.length ? esc(s.classes.join('، ')) : 'كل فصول المرحلة'}</td><td>${s.formMode === 'rotate' ? 'بالتناوب' : 'نموذج ' + s.formMode}</td><td>${s.test === 'torrance' ? (s.timeLimit ? 'مؤقت لكل نشاط' : 'مفتوح') : s.timeLimit ? s.timeLimit + ' د' : 'مفتوح'}</td>
      <td><span class="badge ${s.status === 'open' ? 'green' : 'gray'}">${s.status === 'open' ? 'مفتوحة' : 'مغلقة'}</span></td><td>${s.started} / ${s.submitted}</td><td class="sm">${esc(s.createdBy)}<br>${fmtDate(s.createdAt)}</td>
      <td class="nowrap"><button class="btn sm-btn" data-nav="monitor" data-param="${s.code}">متابعة</button> <button class="btn ghost sm-btn" data-act="showCode" data-code="${s.code}">عرض الرمز</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  PAGES.sessions = async () => {
    const r = await api('listSessions');
    setPage(`<div class="row between"><h1 class="ph">جلسات الاختبار</h1><button class="btn" data-act="newSession">+ جلسة جديدة</button></div>
      <div class="card">${r.sessions.length ? sessionsTable(r.sessions) : '<p class="muted">لا توجد جلسات بعد.</p>'}</div>
      <div class="card guide"><h3>ملاحظات</h3><ul><li><b>بالتناوب</b>: يأخذ كل طالب يدخل نموذجاً مختلفاً عن الذي قبله (1←2←3←4) فيصعب النقل بين المتجاورين.</li><li>إغلاق الجلسة يمنع دخول طلاب جدد فقط، ولا يقطع اختبار من بدأ.</li><li>إذا انقطع جهاز الطالب يدخل من جهاز آخر بالرقم والرمز نفسيهما ويكمل من حيث توقف.</li></ul></div>`);
  };
  ACT.showCode = (b) => { const m = modal(`<div class="code-show"><p>رمز الجلسة</p><div class="code-xl" dir="ltr">${b.dataset.code}</div><p>ادخل إلى الموقع ← «دخول الطالب» ← اكتب رقمك ثم هذا الرمز</p><p class="muted" dir="ltr">${esc(location.href.split('#')[0])}</p></div>`, { wide: true, cls: 'codem' }); };
  ACT.newSession = async () => {
    const classes = S.meta.classes;
    const m = modal(`<h3>جلسة اختبار جديدة</h3><form id="fSes">
      <label>الاختبار<select name="test"><option value="raven">اختبار المصفوفات (الاستدلال المجرد)</option><option value="torrance">اختبار التفكير الإبداعي (على نمط تورانس)</option></select></label>
      <div id="ttOpts" class="row2 hidden"><label>صورة الاختبار<select name="battery"><option value="figural">الصورة الشكلية (رسم) – 30 دقيقة</option><option value="verbal">الصورة اللفظية (كتابة) – 45 دقيقة</option></select></label>
      <label id="dmWrap">طريقة الرسم<select name="drawMode"><option value="both">الطالب يختار: الشاشة أو الورق</option><option value="screen">الرسم على الشاشة فقط</option><option value="paper">على الورق ثم تصوير الصفحة</option></select></label></div>
      <p id="ttHint" class="sm muted hidden"></p>
      <label>عنوان الجلسة<input name="title" placeholder="مثال: الكشف عن الموهوبين – الصف الخامس" required></label>
      <div class="row2"><label>المرحلة<select name="stage">${['primary', 'intermediate', 'secondary'].map(s => `<option value="${s}">${STAGE_NAME[s]} (${STAGE_TEST[s]})</option>`).join('')}</select></label>
      <label id="timeWrap">الوقت (دقيقة، 0 = مفتوح)<input name="time" type="number" min="0" max="180"></label>
      <label id="timedWrap" class="hidden">التوقيت<select name="timed"><option value="1">مؤقت لكل نشاط (كما في الاختبار الأصلي)</option><option value="0">بدون توقيت</option></select></label></div>
      <label>الفصول المشمولة ${isAll() ? '<small class="muted">(اتركها فارغة لتشمل كل فصول المرحلة)</small>' : ''}</label><div class="checks" id="clsBox"></div>
      <div class="row2"><label>توزيع النماذج<select name="form"><option value="rotate">تلقائي بالتناوب (مستحسن)</option><option value="1">النموذج 1 للجميع</option><option value="2">النموذج 2 للجميع</option><option value="3">النموذج 3 للجميع</option><option value="4">النموذج 4 للجميع</option></select></label>
      <div><label class="chk" id="showWrap"><input type="checkbox" name="show"> إظهار الدرجة للطالب بعد التسليم</label>${isAll() ? '<label class="chk"><input type="checkbox" name="retake"> السماح لمن سبق اختباره في المرحلة بإعادته (بنموذج مختلف)</label>' : ''}</div></div>
      <div class="row end"><button class="btn ghost" type="button" data-close>إلغاء</button><button class="btn">إنشاء الجلسة</button></div></form>`, { wide: true });
    const f = $('#fSes', m.el);
    const fill = () => { const st = f.stage.value; f.time.value = I.STAGES[st].timeDefault; const list = classes.filter(c => c.stage === st); $('#clsBox', m.el).innerHTML = list.length ? list.map(c => `<label class="chk"><input type="checkbox" value="${esc(c.name)}"> ${esc(c.name)} <small>(${c.count})</small></label>`).join('') : '<p class="muted">لا توجد فصول مسجلة لهذه المرحلة' + (isAll() ? '' : ' ضمن فصولك') + '.</p>'; };
    const tgl = () => {
      const tt = f.test.value === 'torrance';
      $('#ttOpts', m.el).classList.toggle('hidden', !tt); $('#timeWrap', m.el).classList.toggle('hidden', tt); $('#timedWrap', m.el).classList.toggle('hidden', !tt); $('#showWrap', m.el).classList.toggle('hidden', tt);
      $('#dmWrap', m.el).classList.toggle('hidden', f.battery.value !== 'figural');
      const h = $('#ttHint', m.el); h.classList.toggle('hidden', !tt);
      if (tt) h.innerHTML = f.battery.value === 'verbal' ? 'سبعة أنشطة كتابية (45 دقيقة). لطلاب الصفوف 1–3 يُفضّل الصورة الشكلية، أو أن يُملي الطالب إجاباته على المعلم ثم تُدخل من «إدخال ورقي».' : 'ثلاثة أنشطة رسم (30 دقيقة). يُفضّل جهاز لوحي أو حاسب بفأرة، ويمكن الرسم على الورق المطبوع من «نماذج التفكير الإبداعي» ثم تصويره.';
    };
    f.test.onchange = tgl; f.battery.onchange = tgl; tgl();
    f.stage.onchange = fill; fill();
    f.onsubmit = async e => {
      e.preventDefault(); const b = $('button:last-child', f); busy(b, true);
      try {
        const cls = $$('#clsBox input:checked', m.el).map(x => x.value);
        const tt = f.test.value === 'torrance';
        const r = await api('createSession', { session: { title: f.title.value, stage: f.stage.value, timeLimit: tt ? Number(f.timed.value) : Number(f.time.value), classes: cls, formMode: f.form.value, showResult: !tt && f.show.checked, allowRetake: f.retake ? f.retake.checked : false, test: tt ? 'torrance' : 'raven', battery: f.battery.value, drawMode: f.drawMode.value } });
        m.close(); toast('تم إنشاء الجلسة'); ACT.showCode({ dataset: { code: r.session.code } }); if (S.page === 'sessions' || S.page === 'home') render();
      } catch (er) { toast(er.message, 'err'); busy(b, false); }
    };
  };

  /* ---------------- المتابعة المباشرة ---------------- */
  PAGES.monitor = async () => {
    const code = S.param; if (!code) { S.page = 'sessions'; return render(); }
    const draw = async () => {
      const r = await api('monitor', { code });
      const s = r.session, N = r.items, now = r.serverNow;
      const byId = {}; r.attempts.forEach(a => byId[a.studentId] = a);
      const all = r.expected.map(x => Object.assign({ name: x.name, className: x.className, studentId: x.studentId }, byId[x.studentId] || {}));
      r.attempts.forEach(a => { if (!r.expected.find(x => x.studentId === a.studentId)) all.push(a); });
      const cnt = { none: all.filter(a => !a.status).length, prog: all.filter(a => a.status === 'in_progress').length, done: all.filter(a => a.status === 'submitted').length };
      const ord = { in_progress: 0, undefined: 1, submitted: 2 };
      all.sort((a, b) => (ord[a.status] - ord[b.status]) || String(a.className).localeCompare(b.className, 'ar') || String(a.name).localeCompare(b.name, 'ar'));
      setPage(`<div class="row between"><h1 class="ph">متابعة الجلسة <span class="code" dir="ltr">${s.code}</span></h1><div><button class="btn ghost" data-act="showCode" data-code="${s.code}">عرض الرمز</button> <button class="btn ${s.status === 'open' ? 'danger' : ''}" data-act="toggleSes" data-code="${s.code}" data-st="${s.status === 'open' ? 'closed' : 'open'}">${s.status === 'open' ? 'إغلاق الجلسة' : 'إعادة فتح الجلسة'}</button></div></div>
        ${s.test === 'torrance' && TT ? TT.monitorBar(s, all) : ''}
        <p class="muted">${esc(s.title)} — ${s.test === 'torrance' ? 'التفكير الإبداعي (' + (s.battery === 'verbal' ? 'لفظي' : 'شكلي') + ') — ' : ''}المرحلة ${STAGE_NAME[s.stage]} — ${s.test === 'torrance' ? (s.timeLimit ? 'مؤقت لكل نشاط' : 'وقت مفتوح') : s.timeLimit ? s.timeLimit + ' دقيقة' : 'وقت مفتوح'} — <span class="badge ${s.status === 'open' ? 'green' : 'gray'}">${s.status === 'open' ? 'مفتوحة' : 'مغلقة'}</span> <small>تحديث تلقائي كل 15 ثانية</small></p>
        <div class="cards"><div class="stat"><b>${all.length}</b><span>المستهدفون</span></div><div class="stat"><b>${cnt.none}</b><span>لم يبدأ</span></div><div class="stat blue"><b>${cnt.prog}</b><span>يؤدي الآن</span></div><div class="stat green"><b>${cnt.done}</b><span>سلّم</span></div></div>
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الطالب</th><th>الرقم</th><th>الفصل</th><th>الحالة</th><th>النموذج</th><th>التقدم</th><th>آخر نشاط</th><th>الزمن</th><th></th></tr></thead><tbody>
        ${all.map(a => { const st = a.status === 'submitted' ? '<span class="badge green">سلّم</span>' : a.status === 'in_progress' ? '<span class="badge blue">يؤدي</span>' : '<span class="badge gray">لم يبدأ</span>';
          const stale = a.status === 'in_progress' && now - a.lastSeen > 3 * 60000;
          return `<tr class="${stale ? 'stale' : ''}"><td>${esc(a.name)}</td><td dir="ltr">${esc(a.studentId)}</td><td>${esc(a.className)}</td><td>${st}${stale ? ' <span class="badge warnb" title="لم يُحفظ تقدم منذ أكثر من 3 دقائق">منقطع؟</span>' : ''}</td><td>${a.form || '—'}</td>
          <td>${a.status ? `<div class="pbar"><span style="width:${Math.round((a.progress || 0) / N * 100)}%"></span></div><small>${a.progress || 0}/${N}${s.test === 'torrance' ? ' نشاط' : ''}</small>` : (s.test === 'torrance' && TT ? `<button class="btn ghost sm-btn" data-act="ttPaper" data-code="${s.code}" data-sid="${esc(a.studentId)}">إدخال ورقي</button>` : '')}</td><td class="sm">${a.lastSeen ? ago(a.lastSeen, now) : ''}</td><td class="sm">${a.startedAt ? fmtDur(((a.submittedAt || now) - a.startedAt) / 1000) : ''}</td>
          <td class="nowrap">${a.status === 'in_progress' ? `<button class="btn ghost sm-btn" data-act="attOp" data-op="forceSubmit" data-id="${a.attemptId}">تسليم إجباري</button>` : ''} ${a.status && isAll() ? `<button class="btn ghost sm-btn" data-act="attOp" data-op="reset" data-id="${a.attemptId}">إلغاء المحاولة</button>` : ''}</td></tr>`; }).join('')}
        </tbody></table></div></div>
        <div class="card guide"><ul><li><b>تسليم إجباري</b>: يسلّم آخر إجابات محفوظة على الخادم (عند انتهاء الحصة مثلاً).</li><li><b>إلغاء المحاولة</b>: يحذف المحاولة ويُلغي نتيجتها ليتمكن الطالب من البدء من جديد.</li><li>«منقطع؟» تعني أن جهاز الطالب لم يرسل تقدماً منذ 3 دقائق؛ يكفي أن يدخل من جديد بالرقم والرمز.</li></ul></div>`);
    };
    await draw();
    S.timers.push(setInterval(() => { if (S.page === 'monitor' && !document.querySelector('.modal-back')) draw().catch(() => { }); }, 15000));
  };
  ACT.toggleSes = async (b) => { busy(b, true); try { await api('setSessionStatus', { code: b.dataset.code, status: b.dataset.st }); toast(b.dataset.st === 'open' ? 'تم فتح الجلسة' : 'تم إغلاق الجلسة'); render(); } catch (e) { toast(e.message, 'err'); busy(b, false); } };
  ACT.attOp = async (b) => {
    const op = b.dataset.op;
    const msg = op === 'forceSubmit' ? 'سيتم تسليم اختبار الطالب بالإجابات المحفوظة حتى الآن. متابعة؟' : 'سيتم حذف محاولة الطالب وإلغاء نتيجتها إن وُجدت، ويستطيع البدء من جديد. متابعة؟';
    if (!(await confirmBox(msg, 'تنفيذ', op === 'reset'))) return;
    try { await api('attemptAction', { attemptId: b.dataset.id, op }); S.results = null; toast('تم'); render(); } catch (e) { toast(e.message, 'err'); }
  };

  /* ---------------- النتائج ---------------- */
  const F = { stage: '', cls: '', gender: '', form: '', code: '', q: '', ref: 'grade', showVoid: false };
  function filterBar(opts) {
    opts = opts || {};
    const res = S.results || [];
    const stages = ['primary', 'intermediate', 'secondary'];
    if (!F.stage) F.stage = stages.find(s => res.some(r => r.stage === s)) || 'primary';
    const inStage = res.filter(r => r.stage === F.stage);
    const uniq = (k) => Array.from(new Set(inStage.map(r => r[k]).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'ar', { numeric: true }));
    return `<div class="filters">
      <label>المرحلة<select data-f="stage">${stages.map(s => `<option value="${s}" ${F.stage === s ? 'selected' : ''}>${STAGE_NAME[s]}</option>`).join('')}</select></label>
      ${opts.noCls ? '' : `<label>الفصل<select data-f="cls"><option value="">الكل</option>${uniq('className').map(c => `<option ${F.cls === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`}
      <label>الجنس<select data-f="gender"><option value="">الكل</option>${uniq('gender').map(c => `<option ${F.gender === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      ${opts.form ? `<label>النموذج<select data-f="form"><option value="">الكل</option>${[1, 2, 3, 4].map(f => `<option value="${f}" ${F.form == f ? 'selected' : ''}>نموذج ${f}</option>`).join('')}</select></label>` : ''}
      ${opts.code ? `<label>الجلسة<select data-f="code"><option value="">الكل</option>${uniq('code').map(c => `<option ${F.code === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>` : ''}
      <label>مجموعة المقارنة<select data-f="ref">${Object.keys(AN.REF).map(k => `<option value="${k}" ${F.ref === k ? 'selected' : ''}>${AN.REF[k].label}</option>`).join('')}</select></label>
      ${opts.search ? `<label class="grow">بحث<input data-f="q" value="${esc(F.q)}" placeholder="اسم أو رقم الطالب"></label>` : ''}
    </div>`;
  }
  function bindFilters(redraw) {
    $$('[data-f]').forEach(el => { const ev = el.tagName === 'INPUT' ? 'input' : 'change'; el.addEventListener(ev, () => { F[el.dataset.f] = el.value; if (el.dataset.f === 'stage') { F.cls = ''; F.code = ''; F.form = ''; } redraw(el.dataset.f === 'q'); }); });
  }
  function ensureStage() { if (!F.stage) F.stage = ['primary', 'intermediate', 'secondary'].find(st => (S.results || []).some(r => r.stage === st)) || 'primary'; }
  function enrichedStage() {
    ensureStage();
    // المعايير تُحسب من كل نتائج المرحلة (وليس من الفصل المفلتر فقط)
    const all = (S.results || []).map(r => Object.assign({}, r));
    AN.enrich(all, S.meta.settings, F.ref);
    return all.filter(r => r.stage === F.stage);
  }
  function applyFilters(rows) {
    const q = F.q.trim();
    return rows.filter(r => (!F.cls || r.className === F.cls) && (!F.gender || r.gender === F.gender) && (!F.form || String(r.form) === String(F.form)) && (!F.code || r.code === F.code) && (!q || String(r.name).includes(q) || String(r.studentId).includes(q)));
  }
  function levelBadge(r) { return r._level ? `<span class="badge ${r._level.cls}" title="${esc(r._level.label)}">${r._level.code}</span> <small>${esc(r._level.label)}</small>` : ''; }
  function recBadge(r) { if (r.status !== 'valid') return ''; if (r._nominated) return '<span class="badge gold">★ مرشح</span>'; if (r._reviewHigh) return '<span class="badge warnb">مرتفع – يحتاج مراجعة</span>'; if (r._borderline) return '<span class="badge lv2">حدّي</span>'; return ''; }
  PAGES.results = async () => {
    await getResults(true);
    const draw = (keepFocus) => {
      const rows = applyFilters(enrichedStage()).sort((a, b) => (b._score || -1) - (a._score || -1));
      const max = I.STAGES[F.stage].maxScore;
      const html = `<div class="row between"><h1 class="ph">النتائج</h1><div><button class="btn ghost" data-act="exportCSV">تصدير Excel (CSV)</button> <button class="btn ghost" data-act="printPage">طباعة</button></div></div>
        ${filterBar({ search: true, form: true, code: true })}
        <div class="card"><p class="muted">${rows.length} نتيجة — الدرجة من ${max}${F.stage === 'secondary' ? ' (المجموعة الثانية؛ الأولى تمهيدية)' : ''}. اضغط على أي طالب لعرض تقريره.</p>
        <div class="tbl-wrap"><table class="tbl click"><thead><tr><th>#</th><th>الطالب</th><th>الرقم</th><th>الفصل</th><th>النموذج</th><th>الدرجة</th><th>المئيني</th><th>المعيارية</th><th>المستوى</th><th>الاتساق</th>${isAll() ? '<th>التوصية</th>' : ''}<th>التاريخ</th></tr></thead><tbody>
        ${rows.map((r, i) => `<tr data-act="report" data-id="${r.resultId}" class="${r.status === 'void' ? 'void' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td dir="ltr">${esc(r.studentId)}</td><td>${esc(r.className)}</td><td>${r.form}</td>
          <td>${r.status === 'pending' ? '<span class="badge warnb">بانتظار التصحيح</span>' : `<b>${r.score}</b>`}</td><td>${r._pct != null ? r._pct + (r._refSmall ? '<sup title="عينة المقارنة أقل من الحد الأدنى">*</sup>' : '') : '—'}</td><td>${r._ss || '—'}</td><td>${levelBadge(r)}</td>
          <td>${r.status === 'valid' ? (r._consistent ? '<span class="ok">متسق</span>' : `<span class="bad" title="${esc((r._flags || []).join(' – '))}">يحتاج مراجعة</span>`) : ''}</td>${isAll() ? `<td>${recBadge(r)}</td>` : ''}<td class="sm">${fmtDate(r.submittedAt)}</td></tr>`).join('')}
        </tbody></table></div><p class="sm muted">* المئيني محسوب من عينة صغيرة (أقل من ${S.meta.settings.minNorm})، فتفسيره مبدئي.</p></div>`;
      setPage(html); bindFilters(draw);
      if (keepFocus) { const q = $('[data-f="q"]'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
      S._rows = rows;
    };
    draw();
  };
  ACT.printPage = () => window.print();
  ACT.exportCSV = () => {
    const rows = S._rows || []; const parts = AN.STAGE_PARTS[F.stage];
    const head = ['رقم الطالب', 'الاسم', 'الجنس', 'الصف', 'الفصل', 'المرحلة', 'النموذج', 'الجلسة', 'الدرجة', 'من', ...parts.map(p => 'جزء ' + p[1]), 'المئيني', 'مجموعة المقارنة', 'الدرجة المعيارية', 'المستوى', 'الاتساق', 'ملاحظات', 'إجابات سريعة', 'الزمن (دقيقة)', 'العمر (شهر)', 'التوصية', 'تاريخ التسليم', 'الحالة'];
    const out = [head];
    rows.forEach(r => out.push([r.studentId, r.name, r.gender, r.grade, r.className, STAGE_NAME[r.stage], r.form, r.code, r.score, r.maxScore, ...(r._parts ? r._parts.map(p => p.score) : parts.map(() => '')), r._pct, r._refName, r._ss, r._level ? r._level.code + ' ' + r._level.label : '', r.status === 'valid' ? (r._consistent ? 'متسق' : 'يحتاج مراجعة') : '', (r._flags || []).join(' – '), r.rapid, AN.round(Number(r.timeSec) / 60, 1), r.ageMonths, r._nominated ? 'مرشح' : r._borderline ? 'حدّي' : r._reviewHigh ? 'مراجعة' : '', fmtDate(r.submittedAt, true), r.status === 'valid' ? 'مصحح' : r.status === 'pending' ? 'بانتظار التصحيح' : 'ملغاة']));
    downloadFile(`نتائج_${STAGE_NAME[F.stage]}_${fmtDate(Date.now()).replace(/\//g, '-')}.csv`, toCSV(out));
  };

  /* ---------------- تقرير الطالب ---------------- */
  ACT.report = (tr) => {
    const r = (S._rows || []).find(x => x.resultId === tr.dataset.id); if (!r) return;
    const st = I.STAGES[r.stage]; const sch = S.meta.settings.schoolName;
    let body = '';
    if (r.status !== 'valid') body = `<p class="card warnc">${r.status === 'pending' ? 'هذه النتيجة بانتظار التصحيح.' : 'هذه النتيجة ملغاة.'}</p>`;
    else {
      const maxPart = Math.max.apply(null, r._parts.map(p => p.max));
      const bars = r._parts.map((p, i) => `<div class="pb-row"><span class="pb-l">${p.label}</span><div class="pb"><span class="obs" style="width:${p.score / p.max * 100}%"></span><span class="exp" style="right:${Math.min(100, r._exp[i] / p.max * 100)}%" title="المتوقع ${r._exp[i]}"></span></div><span class="pb-v">${p.score}/${p.max}</span><span class="pb-d ${Math.abs(r._disc[i]) > 2 ? 'bad' : ''}">${r._disc[i] > 0 ? '+' : ''}${r._disc[i]}</span></div>`).join('');
      const recTxt = r._nominated ? `<div class="rec gold">★ يُرشَّح للمرحلة التالية من الكشف عن الموهبة (المئيني ${r._pct}، وحد الترشيح ${S.meta.settings.giftedPct} فأكثر، ونمط الإجابة متسق).</div>`
        : r._reviewHigh ? `<div class="rec warnc">الدرجة مرتفعة لكن نمط الإجابة غير متسق؛ يُنصح بإعادة الاختبار بنموذج آخر قبل الترشيح.</div>`
          : r._borderline ? `<div class="rec">حالة حدّية قريبة من حد الترشيح؛ تُدعم بمحكات أخرى (ترشيح المعلمين، التحصيل، مقياس موهبة).</div>` : '';
      body = `<div class="rep-grid">
        <div class="rep-score"><div class="big">${r.score}<small>/${st.maxScore}</small></div><span>الدرجة الخام</span></div>
        <div class="rep-score"><div class="big">${r._pct}</div><span>الرتبة المئينية</span></div>
        <div class="rep-score"><div class="big">${r._ss}</div><span>الدرجة المعيارية المحلية</span></div>
        <div class="rep-score"><div class="big lvl ${r._level.cls}">${r._level.code}</div><span>${esc(r._level.label)}</span></div></div>
        <p class="sm muted">مجموعة المقارنة: ${esc(r._refName)} (ن = ${r._refN})${r._refFallback ? ' — استُخدمت المرحلة لأن عينة المجموعة المختارة صغيرة' : ''}${r._refSmall ? ' — <b>العينة أقل من ' + S.meta.settings.minNorm + ' فالتفسير مبدئي</b>' : ''}.</p>
        <h4>أداء المجموعات مقارنة بالمتوقع</h4><div class="pbars">${bars}</div><p class="sm muted">العمود الأزرق: درجة الطالب — الخط الأحمر: الدرجة المتوقعة لمن له الدرجة الكلية نفسها (${r._discMethod}). يُعد النمط غير متسق إذا تجاوز الفرق ±3 في مجموعة، أو ±2 في مجموعتين أو أكثر.</p>
        <h4>صدق الأداء</h4><ul class="flags"><li>الاتساق: ${r._consistent ? '<span class="ok">متسق</span>' : '<span class="bad">يحتاج مراجعة</span>'}</li>${(r._flags || []).map(f => `<li>${esc(f)}</li>`).join('')}<li>زمن الأداء: ${fmtDur(Number(r.timeSec))} دقيقة${r.overtime === '1' ? ' (تجاوز الوقت)' : ''}</li><li>إجابات سريعة جداً (أقل من 3 ثوان): ${r.rapid}</li>${r.stage === 'secondary' ? `<li>المجموعة الأولى (تمهيدية): ${r.setI}/12</li>` : ''}</ul>
        ${isAll() ? recTxt : ''}`;
    }
    const html = `<div class="report" id="report"><div class="rep-head"><div class="logo sm">${logoSvg()}</div><div><h2>تقرير اختبار المصفوفات للاستدلال المجرد</h2><p>${esc(sch)} — برنامج الكشف عن الموهوبين</p></div></div>
      <table class="info"><tr><th>الطالب</th><td>${esc(r.name)}</td><th>رقم الطالب</th><td dir="ltr">${esc(r.studentId)}</td></tr><tr><th>الصف / الفصل</th><td>${esc(r.grade)} — ${esc(r.className)}</td><th>العمر</th><td>${r.ageMonths ? Math.floor(r.ageMonths / 12) + ' سنة و' + (r.ageMonths % 12) + ' شهر' : '—'}</td></tr><tr><th>الاختبار</th><td>${STAGE_TEST[r.stage]} — النموذج ${r.form}</td><th>تاريخ التطبيق</th><td>${fmtDate(r.submittedAt, true)}</td></tr></table>
      ${body}
      <p class="disc">الاختبار مكافئ مبني على نمط مصفوفات رافن المتتابعة، وبنوده أصلية. المعايير محلية مستخرجة من طلاب المدرسة وليست معايير رسمية، ولا تُعد الدرجة نسبة ذكاء. نتيجة هذا الاختبار محك واحد ضمن محكات الكشف عن الموهبة ولا يُتخذ القرار بناءً عليه وحده.</p>
      <div class="sign"><div>منسق الموهبة: ..................</div><div>التوقيع: ..................</div><div>التاريخ: ..................</div></div></div>
      <div class="row end noprint">${isAll() && TT ? '<button class="btn ghost" data-unified="1">التقرير الكامل للطالب</button>' : ''}${isAll() ? (r.status === 'void' ? `<button class="btn ghost" data-act="voidRes" data-id="${r.resultId}" data-st="valid">استعادة النتيجة</button>` : `<button class="btn ghost danger-t" data-act="voidRes" data-id="${r.resultId}" data-st="void">إلغاء النتيجة</button>`) : ''}<button class="btn" onclick="window.print()">طباعة التقرير</button></div>`;
    const m = modal(html, { wide: true, cls: 'rep-modal' });
    m.el.addEventListener('click', e => { if (e.target.closest('[data-unified]') && TT) { m.close(); TT.unifiedFor(r.studentId, r.stage); } });
    m.el.addEventListener('click', async e => { const b = e.target.closest('[data-act="voidRes"]'); if (!b) return; if (!(await confirmBox(b.dataset.st === 'void' ? 'إلغاء النتيجة يستبعدها من التحليل والترشيح، ويسمح للطالب بإعادة الاختبار. متابعة؟' : 'استعادة النتيجة؟', 'تنفيذ', b.dataset.st === 'void'))) return; try { await api('setResultStatus', { resultId: b.dataset.id, status: b.dataset.st }); m.close(); toast('تم'); render(); } catch (er) { toast(er.message, 'err'); } });
  };

  /* ---------------- الترشيح ---------------- */
  PAGES.nominations = async () => {
    await getResults(true);
    const draw = () => {
      const rows = applyFilters(enrichedStage()).filter(r => r.status === 'valid');
      S._rows = rows;
      const gp = S.meta.settings.giftedPct;
      const sec = (title, list, note, cls) => `<div class="card"><h3>${title} <span class="badge ${cls}">${list.length}</span></h3><p class="sm muted">${note}</p>${list.length ? `<div class="tbl-wrap"><table class="tbl click"><thead><tr><th>الطالب</th><th>الرقم</th><th>الفصل</th><th>الدرجة</th><th>المئيني</th><th>المعيارية</th><th>المستوى</th><th>ملاحظات</th></tr></thead><tbody>${list.sort((a, b) => b._pct - a._pct || b._score - a._score).map(r => `<tr data-act="report" data-id="${r.resultId}"><td>${esc(r.name)}</td><td dir="ltr">${esc(r.studentId)}</td><td>${esc(r.className)}</td><td><b>${r.score}</b></td><td>${r._pct}</td><td>${r._ss}</td><td>${levelBadge(r)}</td><td class="sm">${esc(r._flags.join(' – '))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">لا يوجد.</p>'}</div>`;
      setPage(`<div class="row between"><h1 class="ph">ترشيح المصفوفات (القدرة العقلية)</h1><div><button class="btn ghost" data-act="exportCSV">تصدير</button> <button class="btn ghost" data-act="printPage">طباعة</button></div></div>${filterBar({})}
        <div class="card guide"><p>معيار الترشيح الحالي: <b>الرتبة المئينية ${gp} فأكثر</b> داخل مجموعة المقارنة، مع <b>اتساق نمط الإجابة</b> (الفرق بين أداء الطالب والمتوقع لا يتجاوز ±2 إلا في مجموعة واحدة بحد أقصى ±3، والإجابات السريعة جداً أقل من 20%). يمكن للمدير تعديل الحد من «الإعدادات».</p></div>
        ${sec('المرشحون', rows.filter(r => r._nominated), 'يُحالون للمرحلة التالية (مقياس موهبة للقدرات العقلية المتعددة، ترشيح المعلمين، قوائم السمات).', 'gold')}
        ${sec('حالات حدّية', rows.filter(r => r._borderline), `المئيني بين ${gp - 5} و ${gp - 1}؛ تُدرس مع المحكات الأخرى.`, 'lv2')}
        ${sec('درجات مرتفعة تحتاج مراجعة', rows.filter(r => r._reviewHigh), 'المئيني مرتفع لكن نمط الإجابة غير متسق؛ يُعاد اختبارهم بنموذج مختلف (جلسة مع خيار السماح بالإعادة).', 'warnb')}`);
      bindFilters(draw);
    };
    draw();
  };

  /* ---------------- التحليل الإحصائي ---------------- */
  function histSvg(h, max) {
    const W = 640, Hh = 200, bw = W / h.length, mc = Math.max(1, Math.max.apply(null, h.map(x => x.count)));
    return `<svg viewBox="0 0 ${W} ${Hh + 30}" class="chart">${h.map((b, i) => { const hh = b.count / mc * Hh; return `<rect x="${i * bw + 2}" y="${Hh - hh}" width="${bw - 4}" height="${hh}" rx="3" fill="#2b7a8c"><title>${b.from}–${b.to}: ${b.count}</title></rect>${b.count ? `<text x="${i * bw + bw / 2}" y="${Hh - hh - 4}" text-anchor="middle" font-size="11" fill="#333">${b.count}</text>` : ''}<text x="${i * bw + bw / 2}" y="${Hh + 16}" text-anchor="middle" font-size="10" fill="#666">${b.from}${b.to > b.from ? '–' + b.to : ''}</text>`; }).join('')}<line x1="0" y1="${Hh}" x2="${W}" y2="${Hh}" stroke="#999"/></svg>`;
  }
  function statTable(title, list, keyLabel, overallSD) {
    return `<div class="card"><h3>${title}</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${keyLabel}</th><th>العدد</th><th>المتوسط</th><th>الانحراف المعياري</th><th>الوسيط</th><th>أدنى</th><th>أعلى</th></tr></thead><tbody>${list.map(g => `<tr><td>${esc(g.key)}</td><td>${g.n}</td><td><b>${g.mean}</b></td><td>${g.sd}</td><td>${g.median}</td><td>${g.min}</td><td>${g.max}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  PAGES.analysis = async () => {
    await getResults(true);
    const draw = () => {
      const rows = applyFilters(enrichedStage()).filter(r => r.status === 'valid');
      const st = I.STAGES[F.stage], max = st.maxScore;
      if (!rows.length) { setPage(`<h1 class="ph">التحليل الإحصائي</h1>${filterBar({ form: true })}<div class="card"><p class="muted">لا توجد نتائج مصححة لهذا الاختيار.</p></div>`); bindFilters(draw); return; }
      const sc = rows.map(r => r._score);
      const ia = AN.itemAnalysis(rows, F.stage, i => { const it = I.getForm(F.stage, 1).items[i]; return it.setLabel === 'المجموعة الأولى' ? 'I-' + it.num : it.setLabel === 'المجموعة الثانية' ? 'II-' + it.num : it.setLabel + it.num; });
      const byForm = AN.groupStats(rows, r => 'نموذج ' + r.form), allSD = AN.sd(sc);
      const formWarn = byForm.length > 1 && (Math.max.apply(null, byForm.map(g => g.mean)) - Math.min.apply(null, byForm.map(g => g.mean))) > 0.5 * allSD && rows.length >= 40;
      const partsMean = AN.STAGE_PARTS[F.stage].map((p, i) => ({ label: p[1], max: p[3] - p[2], mean: AN.round(AN.mean(rows.map(r => r._parts[i].score)), 1) }));
      const key = F.form ? I.keyString(F.stage, F.form) : null;
      const lv = {}; rows.forEach(r => { lv[r._level.code] = (lv[r._level.code] || 0) + 1; });
      setPage(`<h1 class="ph">التحليل الإحصائي — المرحلة ${STAGE_NAME[F.stage]}</h1>${filterBar({ form: true })}
        <div class="cards"><div class="stat"><b>${rows.length}</b><span>عدد الطلاب</span></div><div class="stat"><b>${AN.round(AN.mean(sc), 1)}</b><span>المتوسط من ${max}</span></div><div class="stat"><b>${AN.round(allSD, 1)}</b><span>الانحراف المعياري</span></div>
          <div class="stat ${ia.kr20 != null && ia.kr20 < 0.7 ? 'warnc' : 'green'}"><b>${ia.kr20 == null ? '—' : ia.kr20}</b><span>الثبات KR-20</span></div><div class="stat"><b>${ia.sem == null ? '—' : ia.sem}</b><span>الخطأ المعياري للقياس</span></div></div>
        <div class="card"><h3>توزيع الدرجات</h3>${histSvg(AN.histogram(sc, max, Math.min(18, max + 1)), max)}</div>
        <div class="grid2"><div class="card"><h3>متوسط المجموعات</h3><div class="pbars">${partsMean.map(p => `<div class="pb-row"><span class="pb-l">${p.label}</span><div class="pb"><span class="obs" style="width:${p.mean / p.max * 100}%"></span></div><span class="pb-v">${p.mean}/${p.max}</span></div>`).join('')}</div><p class="sm muted">يُتوقع أن يتناقص المتوسط من المجموعة الأولى إلى الأخيرة لأن الصعوبة متدرجة.</p></div>
        <div class="card"><h3>توزيع المستويات</h3><div class="pbars">${AN.LEVELS.map(L => `<div class="pb-row"><span class="pb-l">${L[1]}</span><div class="pb"><span class="obs ${L[3]}" style="width:${(lv[L[1]] || 0) / rows.length * 100}%"></span></div><span class="pb-v">${lv[L[1]] || 0}</span></div>`).join('')}</div></div></div>
        ${statTable('حسب الصف', AN.groupStats(rows, r => 'الصف ' + r.grade), 'الصف')}
        ${statTable('حسب الفصل', AN.groupStats(rows, r => r.className), 'الفصل')}
        ${statTable('حسب الجنس', AN.groupStats(rows, r => r.gender || 'غير محدد'), 'الجنس')}
        ${statTable('تكافؤ النماذج', byForm, 'النموذج')}${formWarn ? '<div class="card warnc">الفرق بين متوسطات النماذج أكبر من نصف انحراف معياري؛ راجع توزيع الطلاب على النماذج (قد يكون أحد النماذج طُبق على فصول أقوى).</div>' : ''}
        <div class="card"><h3>تحليل البنود ${F.form ? '— النموذج ' + F.form : '(كل النماذج مجمّعة حسب موقع البند)'}</h3>
        <p class="sm muted">p = نسبة الإجابة الصحيحة (السهولة) — D = معامل التمييز (أعلى 27% ناقص أدنى 27%) — r = الارتباط الثنائي النقطي المصحح. ${F.form ? 'الأرقام في توزيع البدائل: عدد من اختار كل بديل، والبديل الصحيح مظلل.' : 'اختر نموذجاً محدداً لعرض توزيع البدائل.'}</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>البند</th><th>p</th><th>D</th><th>r</th>${F.form ? '<th>توزيع البدائل</th>' : ''}<th>ملاحظات</th></tr></thead><tbody>
        ${ia.items.map(it => `<tr><td>${it.label}</td><td>${it.p}</td><td>${it.D}</td><td>${it.rpb == null ? '—' : it.rpb}</td>${F.form ? `<td class="dist">${Array.from({ length: I.getForm(F.stage, F.form).items[it.i].options.length + 1 }, (_, k) => k).map(k => `<span class="${String(k) === key[it.i] ? 'key' : ''}">${k === 0 ? 'بلا' : k}:${it.dist[k] || 0}</span>`).join('')}</td>` : ''}<td class="sm">${it.flags.map(f => `<span class="badge warnb">${f}</span>`).join(' ')}</td></tr>`).join('')}
        </tbody></table></div></div>`);
      bindFilters(draw);
    };
    draw();
  };

  /* ---------------- الطلاب ---------------- */
  PAGES.students = async () => {
    const r = await api('listStudents'); const list = r.students;
    let q = '', cls = '';
    const draw = () => {
      const classes = Array.from(new Set(list.map(s => s.className))).sort((a, b) => a.localeCompare(b, 'ar', { numeric: true }));
      const rows = list.filter(s => (!cls || s.className === cls) && (!q || s.name.includes(q) || String(s.studentId).includes(q)));
      setPage(`<div class="row between"><h1 class="ph">الطلاب</h1>${isAll() ? '<div><button class="btn ghost" data-act="tplStudents">تحميل نموذج Excel</button> <button class="btn" data-act="importStudents">استيراد الطلاب</button></div>' : ''}</div>
        <div class="filters"><label>الفصل<select id="sCls"><option value="">الكل (${list.length})</option>${classes.map(c => `<option ${c === cls ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><label class="grow">بحث<input id="sQ" value="${esc(q)}" placeholder="اسم أو رقم"></label></div>
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الرقم</th><th>الاسم</th><th>الجنس</th><th>الصف</th><th>الفصل</th><th>المسار</th><th>تاريخ الميلاد</th><th>المرحلة</th>${role() === 'admin' ? '<th></th>' : ''}</tr></thead><tbody>
        ${rows.slice(0, 800).map(s => `<tr class="${s.active === '0' ? 'void' : ''}"><td dir="ltr">${esc(s.studentId)}</td><td>${esc(s.name)}</td><td>${esc(s.gender)}</td><td>${esc(s.grade)}</td><td>${esc(s.className)}</td><td>${esc(s.track)}</td><td dir="ltr">${esc(s.dob)}</td><td>${STAGE_NAME[I.stageOfGrade(s.grade)]}</td>${role() === 'admin' ? `<td><button class="btn ghost sm-btn" data-act="delStudent" data-id="${esc(s.studentId)}">حذف</button></td>` : ''}</tr>`).join('')}
        </tbody></table></div>${rows.length > 800 ? '<p class="muted">يظهر أول 800 طالب؛ استخدم البحث أو الفصل.</p>' : ''}</div>`);
      $('#sCls').onchange = e => { cls = e.target.value; draw(); };
      $('#sQ').oninput = e => { q = e.target.value.trim(); draw(); const el = $('#sQ'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); };
    };
    draw();
  };
  ACT.delStudent = async (b) => { if (!(await confirmBox('حذف الطالب من القائمة؟ (نتائجه السابقة تبقى)', 'حذف', true))) return; try { await api('deleteStudent', { studentId: b.dataset.id }); S.meta = await api('getMeta'); render(); } catch (e) { toast(e.message, 'err'); } };
  const STU_COLS = [['studentId', ['رقم الطالب', 'الرقم', 'رقم الهوية', 'السجل المدني', 'رقم الطالب/ة', 'id', 'studentid']], ['name', ['اسم الطالب', 'الاسم', 'اسم الطالب/ة', 'name']], ['gender', ['الجنس', 'gender']], ['grade', ['الصف', 'grade']], ['className', ['الفصل', 'الشعبة', 'class', 'classname']], ['track', ['المسار', 'track']], ['dob', ['تاريخ الميلاد', 'الميلاد', 'dob']]];
  ACT.tplStudents = () => downloadFile('نموذج_الطلاب.csv', toCSV([STU_COLS.map(c => c[1][0]), ['1100001', 'محمد أحمد الغامدي', 'بنين', '5', '5/أ بنين', 'عام', '2015-09-14'], ['1100002', 'سارة خالد الزهراني', 'بنات', '4', '4/أ بنات', 'عام', '2016-02-03'], ['1100003', 'Adam Ali', 'بنين', '7', 'G7-A', 'أمريكي', '2013-11-20']]));
  function normDate(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number' || /^\d{5}(\.\d+)?$/.test(String(v))) { const d = new Date(Math.round((Number(v) - 25569) * 86400000)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
    v = String(v).trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); if (m) return Number(m[1]) > 1600 ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : '';
    m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/); if (m) return Number(m[3]) > 1600 ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : '';
    return '';
  }
  function parseTable(text) {
    const sep = text.indexOf('\t') >= 0 ? '\t' : (text.split('\n')[0].split(';').length > text.split('\n')[0].split(',').length ? ';' : ',');
    const rows = []; let row = [], cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) { const c = text[i]; if (inQ) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; } else if (c === '"') inQ = true; else if (c === sep) { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c; }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim()));
  }
  function mapRows(rows) {
    if (!rows.length) return { list: [], err: 'لا توجد بيانات' };
    const head = rows[0].map(h => String(h).trim().replace(/^﻿/, '').toLowerCase());
    const idx = {}; STU_COLS.forEach(([k, names]) => { idx[k] = head.findIndex(h => names.some(n => h === n.toLowerCase())); });
    if (idx.studentId < 0 || idx.name < 0 || idx.grade < 0 || idx.className < 0) return { list: [], err: 'لم أجد الأعمدة الأساسية في الصف الأول: رقم الطالب، اسم الطالب، الصف، الفصل' };
    const list = rows.slice(1).map(r => { const g = String(r[idx.grade] || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).match(/\d+/); return { studentId: String(r[idx.studentId] || '').trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), name: String(r[idx.name] || '').trim(), gender: idx.gender >= 0 ? String(r[idx.gender] || '').trim() : '', grade: g ? Number(g[0]) : '', className: String(r[idx.className] || '').trim(), track: idx.track >= 0 ? String(r[idx.track] || '').trim() : '', dob: idx.dob >= 0 ? normDate(r[idx.dob]) : '' }; }).filter(s => s.studentId || s.name);
    return { list };
  }
  ACT.importStudents = () => {
    const m = modal(`<h3>استيراد الطلاب</h3>
      <p class="muted">الأعمدة المطلوبة في الصف الأول: <b>رقم الطالب، اسم الطالب، الصف (1–12)، الفصل</b>، واختيارياً: الجنس، المسار، تاريخ الميلاد (ميلادي). حمّل «نموذج Excel» لترى الشكل الصحيح.</p>
      <div class="imp-opts"><label class="btn ghost file-btn">اختيار ملف (Excel أو CSV)<input type="file" id="impFile" accept=".csv,.txt,.xlsx,.xls" hidden></label><span class="muted">أو انسخ الخلايا من Excel والصقها هنا:</span></div>
      <textarea id="impTxt" rows="7" placeholder="الصق هنا (مع صف العناوين)"></textarea>
      <label class="chk"><input type="checkbox" id="impReplace"> استبدال القائمة الحالية بالكامل (يحذف من ليس في الملف)</label>
      <div id="impPrev"></div><div class="row end"><button class="btn ghost" data-close>إلغاء</button><button class="btn" id="impGo" disabled>استيراد</button></div>`, { wide: true });
    let parsed = [];
    const preview = (rows) => {
      const r = mapRows(rows); parsed = r.list;
      const bad = parsed.filter(s => !s.studentId || !s.name || !(s.grade >= 1 && s.grade <= 12) || !s.className).length;
      $('#impPrev', m.el).innerHTML = r.err ? `<p class="bad">${r.err}</p>` : `<p>تم التعرف على <b>${parsed.length}</b> طالباً${bad ? ` — <span class="bad">${bad} صفاً ناقصاً سيتم تجاهله</span>` : ''}. ${parsed.filter(s => !s.dob).length ? `<span class="muted">(${parsed.filter(s => !s.dob).length} بدون تاريخ ميلاد ميلادي؛ لن يُحسب عمرهم)</span>` : ''}</p><div class="tbl-wrap sm-tbl"><table class="tbl"><tr><th>الرقم</th><th>الاسم</th><th>الجنس</th><th>الصف</th><th>الفصل</th><th>المسار</th><th>الميلاد</th></tr>${parsed.slice(0, 6).map(s => `<tr><td>${esc(s.studentId)}</td><td>${esc(s.name)}</td><td>${esc(s.gender)}</td><td>${esc(s.grade)}</td><td>${esc(s.className)}</td><td>${esc(s.track)}</td><td>${esc(s.dob)}</td></tr>`).join('')}</table></div>`;
      $('#impGo', m.el).disabled = !parsed.length || !!r.err;
    };
    $('#impTxt', m.el).oninput = e => preview(parseTable(e.target.value));
    $('#impFile', m.el).onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      if (/\.xlsx?$/i.test(f.name)) {
        try {
          if (!window.XLSX) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
          const wb = XLSX.read(await f.arrayBuffer()); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
          preview(rows);
        } catch (er) { toast('تعذّر قراءة ملف Excel هنا. احفظه بصيغة CSV أو انسخ الخلايا والصقها', 'err'); }
      } else { const t = await f.text(); preview(parseTable(t)); }
    };
    $('#impGo', m.el).onclick = async e => {
      const b = e.target; busy(b, true);
      try {
        let total = { added: 0, updated: 0, bad: [] };
        const rep = $('#impReplace', m.el).checked;
        if (rep) { const r = await api('importStudents', { students: parsed, replace: true }); total = r; }
        else for (let i = 0; i < parsed.length; i += 400) { const r = await api('importStudents', { students: parsed.slice(i, i + 400) }); total.added += r.added; total.updated += r.updated; total.bad = total.bad.concat(r.bad); }
        m.close(); toast(`تمت الإضافة: ${total.added} — التحديث: ${total.updated}${total.bad.length ? ' — تم تجاهل ' + total.bad.length : ''}`); S.meta = await api('getMeta'); render();
      } catch (er) { toast(er.message, 'err'); busy(b, false); }
    };
  };

  /* ---------------- المستخدمون ---------------- */
  PAGES.users = async () => {
    const r = await api('listUsers'); S._users = r.users;
    setPage(`<div class="row between"><h1 class="ph">المستخدمون والصلاحيات</h1><button class="btn" data-act="editUser">+ مستخدم جديد</button></div>
      <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>المستخدم</th><th>الاسم</th><th>الدور</th><th>الفصول</th><th>الحالة</th><th>آخر دخول</th><th></th></tr></thead><tbody>
      ${r.users.map(u => `<tr class="${u.active ? '' : 'void'}"><td dir="ltr">${esc(u.username)}</td><td>${esc(u.name)}</td><td>${u.roleName}</td><td class="sm">${u.role === 'teacher' ? esc(u.classes.join('، ')) || '<span class="bad">لا توجد فصول</span>' : 'الكل'}</td><td>${u.active ? '<span class="badge green">مفعّل</span>' : '<span class="badge gray">معطّل</span>'}${u.mustChange ? ' <span class="badge warnb">كلمة مرور مؤقتة</span>' : ''}</td><td class="sm">${fmtDate(u.lastLogin, true)}</td>
      <td class="nowrap"><button class="btn ghost sm-btn" data-act="editUser" data-u="${esc(u.username)}">تعديل</button>${u.username !== S.user.username ? ` <button class="btn ghost sm-btn" data-act="delUser" data-u="${esc(u.username)}">حذف</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card guide"><h3>مستويات الصلاحية</h3><table class="tbl"><tr><th>الصلاحية</th><th>مدير النظام</th><th>منسق الموهبة</th><th>معلم / مراقب</th></tr>
      <tr><td>إنشاء الجلسات ومتابعتها</td><td>كل الفصول</td><td>كل الفصول</td><td>فصوله فقط</td></tr><tr><td>عرض النتائج وتقارير الطلاب</td><td>الكل</td><td>الكل</td><td>فصوله فقط</td></tr>
      <tr><td>الترشيح والتحليل الإحصائي ومعاينة النماذج</td><td>✓</td><td>✓</td><td>—</td></tr><tr><td>استيراد الطلاب</td><td>✓</td><td>✓</td><td>—</td></tr><tr><td>إلغاء محاولة/نتيجة والسماح بالإعادة</td><td>✓</td><td>✓</td><td>تسليم إجباري فقط</td></tr>
      <tr><td>المستخدمون والإعدادات ومفاتيح الإجابة والسجل</td><td>✓</td><td>—</td><td>—</td></tr></table></div>`);
  };
  ACT.editUser = (b) => {
    const u = (S._users || []).find(x => x.username === b.dataset.u) || null;
    const m = modal(`<h3>${u ? 'تعديل مستخدم' : 'مستخدم جديد'}</h3><form id="fU">
      <div class="row2"><label>اسم المستخدم (إنجليزي)<input name="un" dir="ltr" value="${u ? esc(u.username) : ''}" ${u ? 'readonly' : ''} required></label><label>الاسم<input name="nm" value="${u ? esc(u.name) : ''}" required></label></div>
      <div class="row2"><label>الدور<select name="rl">${Object.keys(ROLE_NAME).map(r => `<option value="${r}" ${u && u.role === r ? 'selected' : ''}>${ROLE_NAME[r]}</option>`).join('')}</select></label><label>${u ? 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)' : 'كلمة مرور مؤقتة (8 أحرف على الأقل)'}<input name="pw" dir="ltr" ${u ? '' : 'required minlength="8"'}></label></div>
      <div id="uCls"><label>فصول المعلم</label><div class="checks">${S.meta.classes.map(c => `<label class="chk"><input type="checkbox" value="${esc(c.name)}" ${u && u.classes.includes(c.name) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('') || '<p class="muted">استورد الطلاب أولاً لتظهر الفصول.</p>'}</div></div>
      <label class="chk"><input type="checkbox" name="ac" ${!u || u.active ? 'checked' : ''}> الحساب مفعّل</label>
      <p class="sm muted">سيُطلب من المستخدم تغيير كلمة المرور المؤقتة عند أول دخول.</p>
      <div class="row end"><button class="btn ghost" type="button" data-close>إلغاء</button><button class="btn">حفظ</button></div></form>`, { wide: true });
    const f = $('#fU', m.el); const tg = () => $('#uCls', m.el).style.display = f.rl.value === 'teacher' ? '' : 'none'; f.rl.onchange = tg; tg();
    f.onsubmit = async e => { e.preventDefault(); const bb = $('button:last-child', f); busy(bb, true); try { await api('saveUser', { user: { username: f.un.value, name: f.nm.value, role: f.rl.value, password: f.pw.value, active: f.ac.checked, classes: f.rl.value === 'teacher' ? $$('#uCls input:checked', m.el).map(x => x.value) : [] } }); m.close(); toast('تم الحفظ'); render(); } catch (er) { toast(er.message, 'err'); busy(bb, false); } };
  };
  ACT.delUser = async (b) => { if (!(await confirmBox('حذف المستخدم ' + b.dataset.u + '؟', 'حذف', true))) return; try { await api('deleteUser', { username: b.dataset.u }); render(); } catch (e) { toast(e.message, 'err'); } };

  /* ---------------- الإعدادات ---------------- */
  PAGES.settings = async () => {
    S.meta = await api('getMeta'); const s = S.meta.settings, k = S.meta.keys;
    const keysOk = k.count === 12 && k.version === I.VERSION;
    setPage(`<h1 class="ph">الإعدادات</h1>
      <div class="card"><h3>الإعدادات العامة</h3><form id="fSet">
        <label>اسم المدرسة (يظهر في التقارير)<input name="schoolName" value="${esc(s.schoolName)}"></label>
        <div class="row2"><label>حد الترشيح للموهبة (الرتبة المئينية)<input name="giftedPct" type="number" min="50" max="99" value="${esc(s.giftedPct)}"></label>
        <label>الحد الأدنى لحجم مجموعة المقارنة<input name="minNorm" type="number" min="10" max="500" value="${esc(s.minNorm)}"></label></div>
        <p class="sm muted">إذا كان عدد طلاب مجموعة المقارنة (الصف مثلاً) أقل من الحد الأدنى، يُحسب المئيني من المرحلة كاملة ويُعلَّم بأنه مبدئي.</p>
        <div class="row end"><button class="btn">حفظ الإعدادات</button></div></form></div>
      <div class="card"><h3>مفاتيح الإجابة</h3><p>الحالة: ${keysOk ? '<span class="badge green">مرفوعة ومطابقة</span>' : '<span class="badge warnb">غير مرفوعة أو قديمة</span>'} — ${k.count} مفتاحاً، الإصدار ${esc(k.version || '—')}، آخر رفع ${fmtDate(k.uploadedAt, true)}</p>
        <p class="sm muted">المفاتيح تُحفظ على الخادم فقط ويُصحَّح الاختبار هناك، فلا تصل الإجابات الصحيحة إلى جهاز الطالب مع النتيجة. تُرفع تلقائياً عند دخول المدير إذا كانت ناقصة.</p>
        <button class="btn" data-act="uploadKeys">رفع المفاتيح وإعادة تصحيح النتائج</button></div>
      ${TT ? TT.settingsHtml() : ''}
      ${DEMO ? '<div class="card"><h3>الوضع التجريبي</h3><p>البيانات محفوظة في هذا المتصفح فقط.</p><button class="btn danger" data-act="demoReset">إعادة ضبط البيانات التجريبية</button></div>' : ''}`);
    if (TT) TT.bindSettings();
    $('#fSet').onsubmit = async e => { e.preventDefault(); const f = e.target; const b = $('button', f); busy(b, true); try { const r = await api('saveSettings', { settings: { schoolName: f.schoolName.value, giftedPct: f.giftedPct.value, minNorm: f.minNorm.value } }); S.meta.settings = r.settings; toast('تم الحفظ'); } catch (er) { toast(er.message, 'err'); } finally { busy(b, false); } };
  };

  /* ---------------- معاينة النماذج ---------------- */
  PAGES.preview = async () => {
    let stage = 'primary', form = 1, show = false, setF = '';
    const draw = () => {
      const fm = I.getForm(stage, form);
      const sets = I.STAGES[stage].sets;
      const lbl = it => (it.set === 'I' || it.set === 'II' ? it.set + '-' : it.setLabel) + it.num;
      const items = fm.items.filter(it => !setF || it.set === setF);
      setPage(`<h1 class="ph">معاينة النماذج</h1><div class="filters"><label>المرحلة<select id="pvS">${['primary', 'intermediate', 'secondary'].map(s => `<option value="${s}" ${s === stage ? 'selected' : ''}>${STAGE_NAME[s]} — ${STAGE_TEST[s]}</option>`).join('')}</select></label>
        <label>النموذج<select id="pvF">${[1, 2, 3, 4].map(f => `<option ${f === form ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label>المجموعة<select id="pvG"><option value="">كل المجموعات (${fm.items.length} بنداً)</option>${sets.map(st => `<option value="${st.id}" ${st.id === setF ? 'selected' : ''}>${st.id === 'I' || st.id === 'II' ? st.label : 'المجموعة ' + st.label} (${st.n})</option>`).join('')}</select></label>
        <label class="chk"><input type="checkbox" id="pvA" ${show ? 'checked' : ''}> إظهار الإجابات الصحيحة</label><button class="btn ghost" data-act="printPage">طباعة</button></div>
        <p class="muted">يُعرض ${items.length} بنداً من ${fm.items.length}. النماذج الأربعة لها البنية والقواعد نفسها بنداً ببند، وتختلف الأشكال والقيم، فهي متكافئة في الصعوبة. اضغط رقم البند للانتقال إليه:</p>
        <div class="pv-jump">${items.map(it => `<a href="javascript:void(0)" data-jump="pv-${it.idx}">${lbl(it)}</a>`).join('')}</div>
        <div class="pv-list">${items.map(it => `<div class="pv-item" id="pv-${it.idx}"><div class="pv-h"><span>${lbl(it)}</span>${show ? `<span class="badge green">الإجابة ${it.answer}</span>` : ''}</div><div class="pv-stem lay-${it.layout}">${it.stem}</div><div class="pv-opts n${it.options.length}">${it.options.map((o, k) => `<div class="pv-o ${show && k + 1 === it.answer ? 'ans' : ''}"><span>${k + 1}</span>${o}</div>`).join('')}</div></div>`).join('')}</div>`);
      $('#pvS').onchange = e => { stage = e.target.value; setF = ''; draw(); }; $('#pvF').onchange = e => { form = +e.target.value; draw(); }; $('#pvG').onchange = e => { setF = e.target.value; draw(); }; $('#pvA').onchange = e => { show = e.target.checked; draw(); };
      $$('[data-jump]').forEach(a => a.onclick = () => { const el = document.getElementById(a.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    };
    draw();
  };

  /* ---------------- السجل ---------------- */
  PAGES.log = async () => {
    const r = await api('listLog');
    const names = { login: 'دخول', setup: 'تهيئة', createUser: 'إنشاء مستخدم', updateUser: 'تعديل مستخدم', deleteUser: 'حذف مستخدم', changePassword: 'تغيير كلمة المرور', importStudents: 'استيراد طلاب', deleteStudent: 'حذف طالب', createSession: 'إنشاء جلسة', session_open: 'فتح جلسة', session_closed: 'إغلاق جلسة', forceSubmit: 'تسليم إجباري', resetAttempt: 'إلغاء محاولة', result_void: 'إلغاء نتيجة', result_valid: 'استعادة نتيجة', uploadKeys: 'رفع المفاتيح', saveSettings: 'حفظ الإعدادات', ttForceSubmit: 'تسليم إجباري (إبداعي)', ttReview: 'مراجعة تصحيح', ttResult_void: 'إلغاء نتيجة (إبداعي)', ttResult_valid: 'استعادة نتيجة (إبداعي)', ttRescore: 'إعادة تصحيح بالذكاء الاصطناعي', ttPaperEntry: 'إدخال ورقي', ttRecalc: 'إعادة حساب الأصالة', aiKey: 'مفتاح Gemini', aiTrigger: 'التصحيح التلقائي' };
    setPage(`<h1 class="ph">سجل العمليات</h1><div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>التفاصيل</th></tr></thead><tbody>${r.log.map(l => `<tr><td class="sm">${fmtDate(l.ts, true)}</td><td dir="ltr">${esc(l.user)}</td><td>${names[l.action] || esc(l.action)}</td><td class="sm">${esc(l.detail)}</td></tr>`).join('')}</tbody></table></div></div>`);
  };

  /* ===================================================================
     التشغيل
     =================================================================== */
  async function runSeed() {
    view.innerHTML = `<div class="center"><div class="stu-card"><h2>تجهيز البيانات التجريبية…</h2><p class="muted">إنشاء طلاب افتراضيين ومحاكاة نتائجهم</p><div class="pbar big"><span id="seedP" style="width:0%"></span></div></div></div>`;
    await sleep(30);
    await seedDemo(p => { const el = $('#seedP'); if (el) el.style.width = p + '%'; });
  }
  /* ---------------- ربط وحدة اختبار التفكير الإبداعي ---------------- */
  const TT = window.TTUI ? window.TTUI({ api, modal, confirmBox, toast, busy, esc, $, $$, sleep, pad, fmtDate, fmtDur, ago, downloadFile, toCSV, S, PAGES, ACT, F, view, render, setPage, stopTimers, isAll, role, logoSvg, getResults, filterBar, bindFilters, levelBadge, histSvg, statTable, DEMO, CFG, STAGE_NAME, Core: window.Core, LocalDB: window.LocalDB }) : null;

  async function boot() {
    if (NO_SERVER) { view.innerHTML = '<div class="stu-card"><h2>الموقع غير مربوط بالخادم</h2><p>ضع رابط Apps Script في الملف assets/config.js ثم أعد تحميل الصفحة.</p></div>'; return; }
    if (DEMO && !LocalDB.isSeeded()) await runSeed();
    if (TT) TT.restore();
    try { const saved = JSON.parse(localStorage.getItem('rvstu') || 'null'); if (saved && saved.stoken) { const n = I.itemCount(saved.attempt.stage); let local = null; try { local = JSON.parse(localStorage.getItem('rvatt:' + saved.attempt.attemptId) || 'null'); } catch (e) { }
      STU = Object.assign({}, saved, { answers: local ? local.answers : Array(n).fill(0), times: local ? local.times : Array(n).fill(0), cur: local ? local.cur || 0 : 0, phase: local && local.phase === 'test' ? 'test' : 'welcome', lastSave: Date.now(), unsaved: 1, items: I.getForm(saved.attempt.stage, saved.attempt.form).items }); } } catch (e) { STU = null; }
    render();
  }
  boot();
})();
