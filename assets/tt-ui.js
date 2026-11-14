/* =====================================================================
   tt-ui.js — واجهات اختبار التفكير الإبداعي (الطالب والمنسوبين)
   يُحمَّل قبل app.js، ويستدعيه app.js مع أدواته المشتركة
   ===================================================================== */
window.TTUI = function (A) {
  'use strict';
  const { api, modal, confirmBox, toast, busy, esc, $, $$, sleep, fmtDate, fmtDur, downloadFile, toCSV, S, PAGES, ACT, view, render, setPage, stopTimers, isAll, role, logoSvg, DEMO, CFG, STAGE_NAME } = A;
  const I = window.TTItems, E = window.TTEngine, TA = window.TTAnalysis, AN = window.RVAnalysis;
  const BAT = { verbal: 'الصورة اللفظية', figural: 'الصورة الشكلية' };
  const DIMN = I.DIM_NAME;
  const STR_NAME = {}; I.STRENGTHS.forEach(s => STR_NAME[s[0]] = s[1]);
  const GAPI = 'https://generativelanguage.googleapis.com/v1beta/';

  /* =====================================================================
     أدوات الصور
     ===================================================================== */
  function drawOps(ctx, ops) {
    ops.forEach(o => {
      ctx.save();
      if (o.t === 'path') { ctx.translate(o.x, o.y); ctx.scale(o.s || 1, o.s || 1); const p = new Path2D(o.d); ctx.fillStyle = o.fill; ctx.fill(p); ctx.lineWidth = o.w / (o.s || 1); ctx.strokeStyle = o.stroke; ctx.stroke(p); }
      else if (o.t === 'rect') { ctx.setLineDash(o.dash ? [6, 6] : []); ctx.strokeStyle = o.stroke; ctx.lineWidth = o.w2; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(o.x, o.y, o.w, o.h, 10); else ctx.rect(o.x, o.y, o.w, o.h); ctx.stroke(); }
      else if (o.t === 'num') { ctx.fillStyle = '#7a8a96'; ctx.font = `700 ${o.small ? 15 : 20}px Tahoma, Arial`; ctx.textAlign = 'center'; ctx.fillText(String(o.n), o.x, o.y); }
      else if (o.t === 'poly') { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); o.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
      else if (o.t === 'dot') { ctx.fillStyle = '#26323c'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill(); }
      else if (o.t === 'circle') { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.w; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    });
  }
  function drawStrokes(ctx, strokes) {
    strokes.forEach(s => {
      if (!s.pts || !s.pts.length) return;
      ctx.save(); ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
      ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (s.pts.length === 1) { ctx.beginPath(); ctx.arc(s.pts[0][0], s.pts[0][1], s.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); s.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
      ctx.restore();
    });
  }
  function exportPage(act, form, strokes, W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    if (act) drawOps(x, I.pageBackground(act, form));
    const l = document.createElement('canvas'); l.width = W; l.height = H; drawStrokes(l.getContext('2d'), strokes); x.drawImage(l, 0, 0);
    return c.toDataURL('image/jpeg', 0.82);
  }
  function compressImage(file, rotate) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1600; let w = img.naturalWidth, h = img.naturalHeight; const k = Math.min(1, max / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
          const r = ((rotate || 0) % 360 + 360) % 360, c = document.createElement('canvas'); c.width = r % 180 ? h : w; c.height = r % 180 ? w : h;
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.translate(c.width / 2, c.height / 2); x.rotate(r * Math.PI / 180); x.drawImage(img, -w / 2, -h / 2, w, h);
          res(c.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => rej(new Error('تعذّر قراءة الصورة'));
        img.src = fr.result;
      };
      fr.onerror = () => rej(new Error('تعذّر قراءة الملف'));
      fr.readAsDataURL(file);
    });
  }
  function rotateDataUrl(url) { return fetch(url).then(r => r.blob()).then(b => compressImage(b, 90)); }

  /* ---------------- لوحة الرسم ---------------- */
  const COLORS = ['#26323c', '#e0483e', '#f08a24', '#f2c12e', '#3fa457', '#3d7fd6', '#8e5cc4', '#8a5a33', '#f08aa6'];
  function Pad(host, W, H, strokes, opts) {
    opts = opts || {};
    const tool = { c: COLORS[0], w: 4, erase: false, hand: false };
    host.innerHTML = `<div class="tt-zoomwrap"><div class="tt-pagebox"><canvas class="tt-bg"></canvas><canvas class="tt-ink"></canvas></div></div>`;
    const wrap = host.querySelector('.tt-zoomwrap'), box = host.querySelector('.tt-pagebox'), bg = host.querySelector('.tt-bg'), ink = host.querySelector('.tt-ink');
    let zoom = 1, k = 1, cur = null;
    function layout() {
      const fit = Math.min(wrap.clientWidth - 14, Math.max(320, window.innerHeight - 200) * W / H), cw = Math.max(240, fit) * zoom;
      wrap.style.maxHeight = zoom > 1 ? '80vh' : 'none';
      const ch = cw * H / W, dpr = Math.min(2, window.devicePixelRatio || 1);
      k = cw / W; box.style.width = cw + 'px'; box.style.height = ch + 'px';
      [bg, ink].forEach(c => { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); c.style.width = cw + 'px'; c.style.height = ch + 'px'; c.getContext('2d').setTransform(dpr * k, 0, 0, dpr * k, 0, 0); });
      const bx = bg.getContext('2d'); bx.fillStyle = '#fff'; bx.fillRect(0, 0, W, H); if (opts.ops) drawOps(bx, opts.ops);
      redraw();
    }
    function redraw() { const x = ink.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, ink.width, ink.height); x.restore(); drawStrokes(x, strokes); }
    function pos(e) { const r = ink.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / k * 10) / 10, Math.round((e.clientY - r.top) / k * 10) / 10]; }
    ink.addEventListener('pointerdown', e => {
      if (tool.hand || (e.pointerType === 'touch' && opts.penOnly)) return;
      e.preventDefault(); ink.setPointerCapture(e.pointerId);
      cur = { c: tool.c, w: tool.erase ? tool.w * 4 : tool.w, erase: tool.erase, pts: [pos(e)] };
      drawStrokes(ink.getContext('2d'), [cur]);
    });
    ink.addEventListener('pointermove', e => {
      if (!cur) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      evs.forEach(ev => { const p = pos(ev), q = cur.pts[cur.pts.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 1.5) return; cur.pts.push(p); const x = ink.getContext('2d'); x.save(); x.globalCompositeOperation = cur.erase ? 'destination-out' : 'source-over'; x.strokeStyle = cur.c; x.lineWidth = cur.w; x.lineCap = 'round'; x.beginPath(); x.moveTo(q[0], q[1]); x.lineTo(p[0], p[1]); x.stroke(); x.restore(); });
    });
    const end = () => { if (!cur) return; strokes.push(cur); cur = null; if (opts.onChange) opts.onChange(); };
    ink.addEventListener('pointerup', end); ink.addEventListener('pointercancel', end); ink.addEventListener('lostpointercapture', end);
    const ro = new ResizeObserver(() => layout()); ro.observe(wrap);
    layout();
    return {
      tool, redraw, layout,
      undo() { strokes.pop(); redraw(); if (opts.onChange) opts.onChange(); },
      clear() { strokes.length = 0; redraw(); if (opts.onChange) opts.onChange(); },
      setZoom(z) { zoom = z; layout(); },
      setHand(h) { tool.hand = h; ink.style.touchAction = h ? 'auto' : 'none'; ink.style.cursor = h ? 'grab' : 'crosshair'; },
      destroy() { ro.disconnect(); }
    };
  }
  function toolsHtml() {
    return `<div class="tt-tools">${COLORS.map((c, i) => `<button class="tt-col ${i ? '' : 'on'}" data-col="${c}" style="background:${c}" title="لون"></button>`).join('')}
      <span class="tt-sep"></span><button class="tt-tb on" data-w="3" title="رفيع">●</button><button class="tt-tb" data-w="6" title="متوسط" style="font-size:20px">●</button><button class="tt-tb" data-w="12" title="عريض" style="font-size:28px">●</button>
      <span class="tt-sep"></span><button class="tt-tb" data-er title="ممحاة">⌫ ممحاة</button><button class="tt-tb" data-undo title="تراجع">↶ تراجع</button><button class="tt-tb" data-clear title="مسح الكل">مسح الكل</button>
      <span class="tt-sep"></span><button class="tt-tb" data-zoom title="تكبير">🔍 تكبير</button><button class="tt-tb" data-hand title="تحريك الصفحة">✋ تحريك</button></div>`;
  }
  function bindTools(root, pad) {
    const zs = [1, 1.6, 2.3]; let zi = 0;
    $$('[data-col]', root).forEach(b => b.onclick = () => { pad.tool.c = b.dataset.col; pad.tool.erase = false; pad.setHand(false); $$('[data-col]', root).forEach(x => x.classList.toggle('on', x === b)); $('[data-er]', root).classList.remove('on'); $('[data-hand]', root).classList.remove('on'); });
    $$('[data-w]', root).forEach(b => b.onclick = () => { pad.tool.w = +b.dataset.w; $$('[data-w]', root).forEach(x => x.classList.toggle('on', x === b)); });
    $('[data-er]', root).onclick = e => { pad.tool.erase = !pad.tool.erase; e.currentTarget.classList.toggle('on', pad.tool.erase); pad.setHand(false); $('[data-hand]', root).classList.remove('on'); };
    $('[data-undo]', root).onclick = () => pad.undo();
    $('[data-clear]', root).onclick = async () => { if (await confirmBox('مسح كل ما رسمته في هذه الصفحة؟', 'مسح', true)) pad.clear(); };
    $('[data-zoom]', root).onclick = e => { zi = (zi + 1) % zs.length; pad.setZoom(zs[zi]); e.currentTarget.textContent = zi ? '🔍 ' + zs[zi] + '×' : '🔍 تكبير'; };
    $('[data-hand]', root).onclick = e => { const on = !e.currentTarget.classList.contains('on'); e.currentTarget.classList.toggle('on', on); pad.setHand(on); };
  }

  /* =====================================================================
     واجهة الطالب
     ===================================================================== */
  let ST = null, PAD = null;
  const stKey = () => 'ttatt:' + ST.attempt.attemptId;
  function persist() {
    if (!ST) return;
    try { localStorage.setItem('ttstu', JSON.stringify({ stoken: ST.stoken, attempt: ST.attempt, student: ST.student, session: ST.session, school: ST.school, offset: ST.offset })); } catch (e) { }
    try { localStorage.setItem(stKey(), JSON.stringify({ cur: ST.cur, phase: ST.phase, actStart: ST.actStart, acts: ST.acts, strokes: ST.strokes })); }
    catch (e) { try { localStorage.setItem(stKey(), JSON.stringify({ cur: ST.cur, phase: ST.phase, actStart: ST.actStart, acts: ST.acts, strokes: {} })); } catch (e2) { } }
  }
  function clearLocal() { if (ST) localStorage.removeItem(stKey()); localStorage.removeItem('ttstu'); }
  function start(r, local) {
    const F = I.getForm(r.attempt.battery, r.attempt.form);
    ST = { stoken: r.stoken, attempt: r.attempt, student: r.student, session: r.session, school: r.school, offset: r.serverNow != null ? r.serverNow - Date.now() : (r.offset || 0), F, cur: r.attempt.actIdx || 0, actStart: r.attempt.actStart || 0, acts: {}, strokes: {}, phase: 'welcome', dirty: 0, lastSave: Date.now() };
    const srv = (r.attempt.data && r.attempt.data.acts) || {};
    Object.keys(srv).forEach(k => { ST.acts[k] = Object.assign({}, srv[k]); delete ST.acts[k].image; });
    if (!local) { try { local = JSON.parse(localStorage.getItem(stKey()) || 'null'); } catch (e) { } }
    if (local) {
      Object.keys(local.acts || {}).forEach(k => { ST.acts[k] = Object.assign({}, ST.acts[k] || {}, local.acts[k]); });
      ST.strokes = local.strokes || {};
      if (local.cur > ST.cur) ST.cur = local.cur;
      if (!ST.actStart && local.actStart && local.cur === ST.cur) ST.actStart = local.actStart;
    }
    const n = F.acts.length;
    if (ST.cur >= n) ST.phase = 'final';
    else if (ST.actStart) ST.phase = 'act';
    else if (ST.cur > 0 || (local && local.phase !== 'welcome')) ST.phase = 'intro';
    persist(); renderStu();
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem('ttstu') || 'null'); if (!saved || !saved.stoken) return false;
      start({ stoken: saved.stoken, attempt: saved.attempt, student: saved.student, session: saved.session, school: saved.school, offset: saved.offset }); return true;
    } catch (e) { ST = null; return false; }
  }
  const curAct = () => ST.F.acts[ST.cur];
  function remaining() { if (!ST.session.timed || !ST.actStart) return null; return ST.actStart + curAct().time * 60000 - (Date.now() + ST.offset); }
  function topBar(extra) {
    const n = ST.F.acts.length, a = curAct();
    return `<div class="t-top"><div class="t-who">${esc(ST.student.name)}</div><div class="t-pos">النشاط <b>${ST.cur + 1}</b> من ${n}: ${esc(a.title)}</div>
      <div class="t-tools"><span class="savest" id="savest"></span><span id="timer" class="timer"></span>${extra || ''}</div></div>
      <div class="progress"><span style="width:${(ST.cur / n * 100).toFixed(1)}%"></span></div>`;
  }
  function renderStu() {
    stopTimers(); if (PAD) { PAD.destroy(); PAD = null; }
    document.body.classList.add('student-mode');
    view.onclick = null;
    const ph = ST.phase, bat = ST.attempt.battery, n = ST.F.acts.length, stage = ST.attempt.stage;
    if (ph === 'welcome') {
      const fig = bat === 'figural';
      view.innerHTML = `<div class="stu-card tt-welcome"><div class="logo sm">${logoSvg()}</div><h2>مرحباً ${esc(ST.student.name)}</h2><p class="muted">${esc(ST.school || '')} — ${esc(ST.student.className)}</p>
        <div class="welcome-box"><p>هذا <b>اختبار للتفكير والخيال</b>، وليس فيه إجابات صحيحة أو خاطئة.</p>
        ${fig ? `<p>ستؤدي <b>${n} أنشطة رسم</b>. ارسم أفكاراً لا يفكر فيها غيرك، وأضف تفاصيل كثيرة، واكتب عنواناً معبّراً لكل رسمة.</p>` : `<p>ستؤدي <b>${n} أنشطة قصيرة</b>. في كل نشاط اكتب <b>أكبر عدد ممكن من الأفكار</b>، كل فكرة في مربع مستقل. الأفكار الغريبة وغير المألوفة مطلوبة.</p>`}
        ${ST.session.timed ? `<p>لكل نشاط وقت محدد يظهر في أعلى الشاشة، وعند انتهائه تنتقل إلى النشاط التالي تلقائياً، ولا يمكن الرجوع إلى نشاط سابق.</p>` : '<p>لا يوجد وقت محدد، لكن لا يمكن الرجوع إلى نشاط بعد إنهائه.</p>'}
        <p>الإملاء لا يهم، المهم هو الفكرة.</p></div>
        ${fig ? '<button class="btn ghost big" data-tt="tryTools">جرّب أدوات الرسم أولاً</button>' : ''}<button class="btn big" data-tt="toIntro">ابدأ</button></div>`;
    } else if (ph === 'intro') {
      const a = curAct();
      const stim = bat === 'verbal' ? `<div class="tt-stim sm">${a.stim.svg || ''}${a.stim.caption ? `<div class="tt-cap">${esc(a.stim.caption)}</div>` : ''}</div>` : '';
      view.innerHTML = `<div class="stu-card tt-intro"><div class="tt-step">النشاط ${ST.cur + 1} من ${n}</div><h2>${esc(a.title)}</h2>${stim}
        <div class="welcome-box"><p>${esc(a.instr(stage))}</p>${ST.session.timed ? `<p class="muted">الوقت: <b>${a.time} دقائق</b></p>` : ''}</div>
        <button class="btn big" data-tt="startAct">ابدأ النشاط</button></div>`;
    } else if (ph === 'act') { (bat === 'verbal' ? renderVerbalAct : renderFiguralAct)(); return; }
    else if (ph === 'final') {
      view.innerHTML = `<div class="stu-card"><h2>أنهيت جميع الأنشطة</h2><p>اضغط الزر لتسليم الاختبار.</p><button class="btn big" data-tt="submitAll">تسليم الاختبار</button></div>`;
    } else if (ph === 'sending') {
      view.innerHTML = `<div class="stu-card"><h2>جارٍ حفظ إجاباتك…</h2><div class="spin big"></div><p class="muted">لا تغلق الصفحة.</p></div>`;
    } else if (ph === 'error') {
      view.innerHTML = `<div class="stu-card"><h2>لم يكتمل الحفظ</h2><p>${esc(ST.err || '')}</p><p class="muted">إجاباتك محفوظة على هذا الجهاز ولن تضيع.</p><button class="btn big" data-tt="retry">إعادة المحاولة</button></div>`;
    } else if (ph === 'done') {
      view.innerHTML = `<div class="stu-card done"><div class="check">✓</div><h2>تم تسليم الاختبار بنجاح</h2><p>شكراً لك يا ${esc(ST.student.name)}، أبدعت!</p><p class="muted">سيتم تصحيح إجاباتك وإرسال النتيجة إلى منسق الموهبة.</p><button class="btn" data-tt="exit">إنهاء</button></div>`;
    }
    bindStu();
  }
  function bindStu() {
    view.onclick = async e => {
      const b = e.target.closest('[data-tt]'); if (!b) return;
      const k = b.dataset.tt;
      if (k === 'toIntro') { ST.phase = 'intro'; persist(); renderStu(); }
      else if (k === 'tryTools') tryTools();
      else if (k === 'startAct') startAct(b);
      else if (k === 'finishAct') finishAct(false);
      else if (k === 'submitAll' || k === 'retry') { if (ST.retryFn) ST.retryFn(); else finishAct(true, true); }
      else if (k === 'exit') { clearLocal(); ST = null; document.body.classList.remove('student-mode'); render(); }
    };
  }
  async function startAct(b) {
    busy(b, true);
    try { const r = await api('ttSave', { stoken: ST.stoken, actIdx: ST.cur, start: true }, { noToken: true, student: true, retries: 2 }); ST.offset = r.serverNow - Date.now(); ST.actStart = r.actStart || (Date.now() + ST.offset); }
    catch (e) { if (handleAuth(e)) return; ST.actStart = Date.now() + ST.offset; toast('أنت غير متصل، تم البدء وسيُحفظ عملك على الجهاز'); }
    ST.phase = 'act'; persist(); renderStu();
  }
  function handleAuth(e) {
    if (e.code === 'superseded' || e.code === 'auth') {
      stopTimers(); clearLocal(); const name = ST ? ST.student.name : ''; ST = null;
      view.innerHTML = `<div class="stu-card"><h2>تنبيه</h2><p>${esc(e.message)}</p><button class="btn" id="ttOut">العودة</button></div>`;
      $('#ttOut').onclick = () => { document.body.classList.remove('student-mode'); render(); };
      return true;
    }
    return false;
  }
  function startTick() {
    const tick = () => {
      if (!ST || ST.phase !== 'act') return;
      const el = $('#timer'), rem = remaining();
      if (el) { if (rem == null) el.textContent = ST.actStart ? fmtDur((Date.now() + ST.offset - ST.actStart) / 1000) : ''; else { el.textContent = fmtDur(Math.max(0, rem) / 1000); el.classList.toggle('warn', rem < 60000); } }
      if (rem != null && rem <= 0 && !ST.sending) { toast('انتهى وقت هذا النشاط'); finishAct(true); return; }
      if (ST.dirty && Date.now() - ST.lastSave > 30000 && ST.attempt.battery === 'verbal') softSave();
    };
    S.timers.push(setInterval(tick, 1000)); tick();
  }
  async function softSave() {
    if (ST.saving) return; ST.saving = true; const a = curAct();
    try { await api('ttSave', { stoken: ST.stoken, actIdx: ST.cur, act: a.id, payload: payloadOf(a, false) }, { noToken: true, student: true, retries: 1 }); ST.dirty = 0; const s = $('#savest'); if (s) s.textContent = '✓ محفوظ'; }
    catch (e) { if (handleAuth(e)) return; const s = $('#savest'); if (s) s.textContent = '⚠ محفوظ على الجهاز'; }
    finally { if (ST) { ST.saving = false; ST.lastSave = Date.now(); } }
  }
  function actSec() { return ST.actStart ? Math.max(0, Math.round((Date.now() + ST.offset - ST.actStart) / 1000)) : 0; }
  function payloadOf(a, final) {
    const d = ST.acts[a.id] || {};
    if (ST.attempt.battery === 'verbal') return { list: (d.list || []).map(x => String(x || '').trim()).filter(Boolean), sec: actSec() };
    const p = { sec: actSec(), paper: !!d.paper };
    if (a.id === 'construct') p.title = d.title || ''; else p.titles = d.titles || [];
    if (!d.paper) p.meta = E.strokeMeta(a.id, ST.attempt.form, ST.strokes[a.id] || []);
    return p;
  }
  // إنهاء النشاط الحالي وإرساله (وإرسال الاختبار كله إذا كان الأخير)
  async function finishAct(auto, resend) {
    if (!ST || ST.sending) return;
    const a = curAct(), last = ST.cur === ST.F.acts.length - 1 || ST.phase === 'final';
    if (!auto && !resend) {
      const d = ST.acts[a.id] || {}, bat = ST.attempt.battery;
      let msg = 'هل انتهيت من هذا النشاط؟ لن تستطيع الرجوع إليه.';
      if (bat === 'verbal' && !(d.list || []).some(x => String(x || '').trim())) msg = 'لم تكتب أي فكرة في هذا النشاط. هل تريد الانتقال إلى النشاط التالي؟';
      if (bat === 'figural' && d.paper && !d.photo) msg = 'لم ترفع صورة الورقة بعد. هل تريد الانتقال دون صورة؟';
      if (bat === 'figural' && !d.paper && !(ST.strokes[a.id] || []).length) msg = 'لم ترسم شيئاً في هذه الصفحة. هل تريد الانتقال؟';
      const rem = remaining();
      if (rem != null && rem > 60000 && bat === 'verbal') msg += `<br><span class="muted">ما زال لديك ${Math.ceil(rem / 60000)} دقائق؛ استمر في التفكير إن استطعت.</span>`;
      if (!(await confirmBox(msg, last ? 'نعم، سلّم الاختبار' : 'نعم، النشاط التالي'))) return;
    }
    ST.sending = true; stopTimers();
    let image = null;
    if (ST.phase !== 'final' && ST.attempt.battery === 'figural') {
      const d = ST.acts[a.id] || {};
      if (d.paper && d.photo) image = d.photo;
      else if (!d.paper && (ST.strokes[a.id] || []).length) { const P = I.PAGE[a.id]; image = exportPage(a.id, ST.attempt.form, ST.strokes[a.id], P.w, P.h); }
    }
    const payload = ST.phase === 'final' ? null : payloadOf(a, true);
    const send = async () => {
      ST.phase = 'sending'; renderStu();
      try {
        if (last) await api('ttSubmit', Object.assign({ stoken: ST.stoken }, payload ? { act: a.id, payload, image } : {}), { noToken: true, student: true, retries: 4 });
        else { const r = await api('ttSave', { stoken: ST.stoken, actIdx: ST.cur + 1, act: a.id, payload, image }, { noToken: true, student: true, retries: 4 }); if (r.status === 'submitted') { ST.phase = 'done'; clearLocal(); ST.sending = false; renderStu(); return; } }
        ST.retryFn = null; ST.sending = false;
        if (ST.attempt.battery === 'figural' && ST.acts[a.id]) delete ST.acts[a.id].photo;
        delete ST.strokes[a.id];
        if (last) { ST.phase = 'done'; renderStu(); clearLocal(); return; }
        ST.cur++; ST.actStart = 0; ST.phase = 'intro'; persist(); renderStu();
      } catch (e) {
        ST.sending = false; if (handleAuth(e)) return;
        ST.err = e.message; ST.retryFn = () => { ST.sending = true; send(); }; ST.phase = 'error'; renderStu();
      }
    };
    await send();
  }

  /* ---------------- النشاط اللفظي ---------------- */
  function renderVerbalAct() {
    const a = curAct(), d = ST.acts[a.id] = ST.acts[a.id] || { list: [] };
    const list = d.list || (d.list = []);
    const shown = Math.min(a.max, Math.max(list.filter(x => String(x || '').trim()).length + 1, 6));
    while (list.length < shown) list.push('');
    view.innerHTML = `<div class="test tt">${topBar()}
      <div class="tt-vact"><div class="tt-stim">${a.stim.svg || ''}${a.stim.caption ? `<div class="tt-cap">${esc(a.stim.caption)}</div>` : ''}</div>
      <div class="tt-listbox"><p class="tt-instr">${esc(a.instr(ST.attempt.stage))}</p><ol class="tt-list" id="ttList">${list.map((v, i) => `<li><input data-i="${i}" value="${esc(v)}" maxlength="300" autocomplete="off" placeholder="اكتب فكرة…"></li>`).join('')}</ol>
      ${list.length < a.max ? '<button class="btn ghost sm-btn" data-add>+ فكرة أخرى</button>' : ''}</div></div>
      <div class="t-nav"><span class="tt-count">عدد أفكارك: <b id="ttCnt">${list.filter(x => String(x || '').trim()).length}</b></span><button class="btn warn" data-tt="finishAct">${ST.cur === ST.F.acts.length - 1 ? 'إنهاء وتسليم الاختبار' : 'انتهيت، النشاط التالي ←'}</button></div></div>`;
    const ol = $('#ttList');
    const cnt = () => { $('#ttCnt').textContent = list.filter(x => String(x || '').trim()).length; };
    const addRow = (focus) => { if (list.length >= a.max) return null; list.push(''); const li = document.createElement('li'); li.innerHTML = `<input data-i="${list.length - 1}" maxlength="300" autocomplete="off" placeholder="اكتب فكرة…">`; ol.appendChild(li); const inp = li.querySelector('input'); if (focus) inp.focus(); return inp; };
    ol.addEventListener('input', e => { const i = +e.target.dataset.i; list[i] = e.target.value; ST.dirty++; const s = $('#savest'); if (s) s.textContent = ''; persist(); cnt(); if (i === list.length - 1 && e.target.value.trim()) addRow(false); });
    ol.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); const i = +e.target.dataset.i; const nx = ol.querySelector(`input[data-i="${i + 1}"]`) || addRow(true); if (nx) nx.focus(); });
    const ab = $('[data-add]'); if (ab) ab.onclick = () => addRow(true);
    const first = ol.querySelector('input'); const firstEmpty = Array.from(ol.querySelectorAll('input')).find(x => !x.value); (firstEmpty || first).focus();
    bindStu(); startTick();
  }

  /* ---------------- النشاط الشكلي ---------------- */
  function renderFiguralAct() {
    const a = curAct(), form = ST.attempt.form, dm = ST.session.drawMode || 'both', d = ST.acts[a.id] = ST.acts[a.id] || {};
    if (dm === 'paper') d.paper = true; else if (dm === 'screen') d.paper = false;
    const P = I.PAGE[a.id], strokes = ST.strokes[a.id] = ST.strokes[a.id] || [];
    const modeSw = dm === 'both' ? `<div class="tt-mode"><button class="tt-mb ${d.paper ? '' : 'on'}" data-mode="screen">✎ أرسم على الشاشة</button><button class="tt-mb ${d.paper ? 'on' : ''}" data-mode="paper">📷 رسمت على الورق</button></div>` : '';
    let titles = '';
    if (a.id === 'construct') titles = `<label class="tt-title">عنوان رسمتك<input id="ttT0" value="${esc(d.title || '')}" maxlength="120" placeholder="اكتب عنواناً معبّراً"></label>`;
    else if (a.id === 'complete') { const t = d.titles || []; titles = `<div class="tt-titles"><b>عناوين الرسوم</b><div class="tt-tgrid">${Array.from({ length: 10 }, (_, i) => `<label><span>${i + 1}</span><input data-ti="${i}" value="${esc(t[i] || '')}" maxlength="120"></label>`).join('')}</div></div>`; }
    else { const t = d.titles || []; titles = `<details class="tt-titles"><summary>أسماء الرسوم (اختياري)</summary><div class="tt-tgrid four">${Array.from({ length: 24 }, (_, i) => `<label><span>${i + 1}</span><input data-ti="${i}" value="${esc(t[i] || '')}" maxlength="120"></label>`).join('')}</div></details>`; }
    const paperBox = `<div class="tt-paper"><p>ارسم على <b>الورقة المطبوعة (النموذج ${form} – ${esc(a.title)})</b> التي أعطاك إياها المعلم، ثم صوّر الورقة كاملة بوضوح من الأعلى وفي إضاءة جيدة.</p>
      <label class="btn file-btn">📷 تصوير الورقة أو اختيار صورة<input type="file" id="ttPhoto" accept="image/*" capture="environment" hidden></label>
      <div id="ttPrev">${d.photo ? `<img src="${d.photo}" alt=""><div class="row"><button class="btn ghost sm-btn" data-rot>↻ تدوير</button></div>` : '<p class="muted">لم تُرفع صورة بعد.</p>'}</div></div>`;
    view.innerHTML = `<div class="test tt">${topBar()}
      <div class="tt-fhead"><p class="tt-instr">${esc(a.instr(ST.attempt.stage))}</p>${modeSw}</div>
      ${d.paper ? paperBox : `${toolsHtml()}<div id="ttPad" class="tt-padhost"></div>`}
      ${titles}
      <div class="t-nav"><span></span><button class="btn warn" data-tt="finishAct">${ST.cur === ST.F.acts.length - 1 ? 'إنهاء وتسليم الاختبار' : 'انتهيت، النشاط التالي ←'}</button></div></div>`;
    if (!d.paper) {
      PAD = Pad($('#ttPad'), P.w, P.h, strokes, { ops: I.pageBackground(a.id, form), onChange: () => { persist(); } });
      bindTools(view, PAD);
    } else {
      $('#ttPhoto').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { d.photo = await compressImage(f); persist(); renderFiguralAct(); } catch (er) { toast(er.message, 'err'); } };
      const rb = $('[data-rot]'); if (rb) rb.onclick = async () => { d.photo = await rotateDataUrl(d.photo); persist(); renderFiguralAct(); };
    }
    $$('[data-mode]').forEach(b => b.onclick = () => { d.paper = b.dataset.mode === 'paper'; persist(); renderFiguralAct(); });
    const t0 = $('#ttT0'); if (t0) t0.oninput = () => { d.title = t0.value; persist(); };
    $$('[data-ti]').forEach(inp => inp.oninput = () => { d.titles = d.titles || []; d.titles[+inp.dataset.ti] = inp.value; persist(); });
    bindStu(); startTick();
  }
  function tryTools() {
    const m = modal(`<h3>جرّب أدوات الرسم</h3><p class="muted">ارسم أي شيء لتتعرف على الألوان والممحاة والتراجع. هذه الرسمة لا تُحفظ.</p>${toolsHtml()}<div id="ttTry" class="tt-padhost"></div><div class="row end"><button class="btn" data-close>تم</button></div>`, { wide: true, onClose: () => pad.destroy() });
    const pad = Pad($('#ttTry', m.el), 800, 380, [], {}); bindTools(m.el, pad);
  }

  /* =====================================================================
     واجهات المنسوبين
     ===================================================================== */
  const TF = { bat: 'figural', stage: '', cls: '', gender: '', form: '', code: '', status: '', q: '', ref: 'grade' };
  function J(s) { try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; } }
  async function loadTT(opts) { const r = await api('ttList', opts || {}); S.tt = r; S.meta.settings = Object.assign(S.meta.settings, r.settings); return r; }
  function enriched() {
    const list = (S.tt.results || []).map(r => Object.assign({}, r));
    TA.enrich(list, S.meta.settings, TF.ref);
    return list;
  }
  const STATUS = { valid: ['مصحّح', 'green'], scoring: ['قيد التصحيح', 'blue'], review: ['يحتاج مراجعة', 'warnb'], void: ['ملغاة', 'gray'] };
  const SRC = { ai: 'ذكاء اصطناعي', rule: 'قواعد آلية', mixed: 'آلي مختلط', human: 'مراجعة بشرية' };
  function statusBadge(r) { const s = STATUS[r.status] || [r.status, 'gray']; return `<span class="badge ${s[1]}">${s[0]}</span>`; }
  function recBadge(r) { if (r.status !== 'valid') return ''; if (r._nominated) return '<span class="badge gold">★ مرشح</span>'; if (r._reviewHigh) return '<span class="badge warnb">مرتفع – يحتاج مراجعة</span>'; if (r._borderline) return '<span class="badge lv2">حدّي</span>'; return ''; }
  function lvl(r) { return r._level ? `<span class="badge ${r._level.cls}">${r._level.code}</span> <small>${esc(r._level.label)}</small>` : ''; }
  function ttFilterBar(opts) {
    opts = opts || {};
    const res = (S.tt.results || []).filter(r => r.battery === TF.bat);
    if (!TF.stage) TF.stage = ['primary', 'intermediate', 'secondary'].find(s => res.some(r => r.stage === s)) || 'primary';
    const inSt = res.filter(r => r.stage === TF.stage);
    const uniq = k => Array.from(new Set(inSt.map(r => r[k]).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'ar', { numeric: true }));
    return `<div class="filters">
      <label>صورة الاختبار<select data-tf="bat"><option value="figural" ${TF.bat === 'figural' ? 'selected' : ''}>الشكلية (رسم)</option><option value="verbal" ${TF.bat === 'verbal' ? 'selected' : ''}>اللفظية (كتابة)</option></select></label>
      <label>المرحلة<select data-tf="stage">${['primary', 'intermediate', 'secondary'].map(s => `<option value="${s}" ${TF.stage === s ? 'selected' : ''}>${STAGE_NAME[s]}</option>`).join('')}</select></label>
      ${opts.noCls ? '' : `<label>الفصل<select data-tf="cls"><option value="">الكل</option>${uniq('className').map(c => `<option ${TF.cls === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`}
      <label>الجنس<select data-tf="gender"><option value="">الكل</option>${uniq('gender').map(c => `<option ${TF.gender === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      ${opts.form ? `<label>النموذج<select data-tf="form"><option value="">الكل</option>${[1, 2, 3, 4].map(f => `<option value="${f}" ${TF.form == f ? 'selected' : ''}>نموذج ${f}</option>`).join('')}</select></label>` : ''}
      ${opts.code ? `<label>الجلسة<select data-tf="code"><option value="">الكل</option>${uniq('code').map(c => `<option ${TF.code === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>` : ''}
      ${opts.status ? `<label>الحالة<select data-tf="status"><option value="">الكل</option>${Object.keys(STATUS).filter(k => k !== 'void').map(k => `<option value="${k}" ${TF.status === k ? 'selected' : ''}>${STATUS[k][0]}</option>`).join('')}</select></label>` : ''}
      <label>مجموعة المقارنة<select data-tf="ref">${Object.keys(AN.REF).map(k => `<option value="${k}" ${TF.ref === k ? 'selected' : ''}>${AN.REF[k].label}</option>`).join('')}</select></label>
      ${opts.search ? `<label class="grow">بحث<input data-tf="q" value="${esc(TF.q)}" placeholder="اسم أو رقم الطالب"></label>` : ''}</div>`;
  }
  function bindTF(redraw) { $$('[data-tf]').forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { TF[el.dataset.tf] = el.value; if (el.dataset.tf === 'stage' || el.dataset.tf === 'bat') { TF.cls = ''; TF.code = ''; TF.form = ''; } redraw(el.dataset.tf === 'q'); })); }
  function ensureTF() { if (!TF.stage) { const res = (S.tt.results || []).filter(r => r.battery === TF.bat); TF.stage = ['primary', 'intermediate', 'secondary'].find(s => res.some(r => r.stage === s)) || 'primary'; } }
  function applyTF(rows) { ensureTF(); const q = TF.q.trim(); return rows.filter(r => r.battery === TF.bat && r.stage === TF.stage && (!TF.cls || r.className === TF.cls) && (!TF.gender || r.gender === TF.gender) && (!TF.form || String(r.form) === String(TF.form)) && (!TF.code || r.code === TF.code) && (!TF.status || r.status === TF.status) && (!q || String(r.name).includes(q) || String(r.studentId).includes(q))); }
  const dimsOf = bat => TA.INDEX_DIMS[bat];

  function queueBanner() {
    const q = S.tt.queue || 0, rev = (S.tt.results || []).filter(r => r.status === 'review').length, sc = (S.tt.results || []).filter(r => r.status === 'scoring').length;
    let h = '';
    if (q || sc) h += `<div class="card info-c">⏳ ${sc} نتيجة قيد التصحيح بالذكاء الاصطناعي (${q} مهمة في الطابور). ${S.meta.tt && S.meta.tt.ai ? 'يعمل التصحيح تلقائياً كل 5 دقائق إذا فُعّل من الإعدادات.' : ''} ${isAll() ? '<button class="btn sm-btn" data-act="ttRunAI">صحّح الآن</button>' : ''}</div>`;
    if (rev) h += `<div class="card warnc">⚠ ${rev} نتيجة تحتاج مراجعة (رسوم ورقية دون ذكاء اصطناعي، أو تعذّر تصحيحها آلياً). ${isAll() ? `<button class="btn sm-btn" data-act="ttShowReview">عرضها</button>` : ''}</div>`;
    if (S.tt.dirty && isAll()) h += `<div class="card"><span class="muted">توجد نتائج جديدة لم تدخل في حساب الأصالة بعد.</span> <button class="btn ghost sm-btn" data-act="ttRecalc">إعادة حساب الأصالة الآن</button></div>`;
    return h;
  }
  ACT.ttShowReview = () => { TF.status = 'review'; S.page = 'ttResults'; render(); };
  ACT.ttRecalc = async (b) => { busy(b, true); try { const r = await api('ttRecalc'); toast(`تم تحديث ${r.responses} إجابة و${r.results} نتيجة`); render(); } catch (e) { toast(e.message, 'err'); busy(b, false); } };

  /* ---------------- صفحة النتائج ---------------- */
  PAGES.ttResults = async () => {
    await loadTT();
    const draw = (keep) => {
      const rows = applyTF(enriched()).sort((a, b) => (b._index || -1) - (a._index || -1) || (Number(b.fluency) || 0) - (Number(a.fluency) || 0));
      S._ttRows = rows;
      const dims = TA.ALL_DIMS[TF.bat];
      setPage(`<div class="row between"><h1 class="ph">نتائج التفكير الإبداعي</h1><div><button class="btn ghost" data-act="ttExport">تصدير Excel (CSV)</button> <button class="btn ghost" data-act="printPage">طباعة</button></div></div>
        ${queueBanner()}${ttFilterBar({ search: true, form: true, code: true, status: true })}
        <div class="card"><p class="muted">${rows.length} نتيجة — ${BAT[TF.bat]}. الأرقام في الأبعاد درجات خام؛ المؤشر الإبداعي متوسط الدرجات المعيارية (100 ± 15)${TF.bat === 'figural' ? ' مضافاً إليه نقاط القوة الإبداعية' : ''}. اضغط على أي طالب لعرض تقريره.</p>
        <div class="tbl-wrap"><table class="tbl click"><thead><tr><th>#</th><th>الطالب</th><th>الفصل</th><th>النموذج</th><th>الحالة</th>${dims.map(d => `<th>${DIMN[d].split(' ')[0]}</th>`).join('')}<th>المؤشر</th><th>المئيني</th><th>المستوى</th>${isAll() ? '<th>التوصية</th>' : ''}<th>التاريخ</th></tr></thead><tbody>
        ${rows.map((r, i) => `<tr data-act="ttReport" data-id="${r.resultId}"><td>${i + 1}</td><td>${esc(r.name)}<br><small class="muted" dir="ltr">${esc(r.studentId)}</small></td><td>${esc(r.className)}</td><td>${r.form}${r.mode === 'paper' ? ' <span title="ورقي">📄</span>' : ''}</td><td>${statusBadge(r)}</td>
          ${dims.map(d => `<td>${r[d] === '' ? '—' : r[d]}</td>`).join('')}<td><b>${r._index != null ? r._index : '—'}</b></td><td>${r._pct != null ? r._pct + (r._refSmall ? '<sup>*</sup>' : '') : '—'}</td><td>${lvl(r)}</td>${isAll() ? `<td>${recBadge(r)}</td>` : ''}<td class="sm">${fmtDate(r.submittedAt)}</td></tr>`).join('')}
        </tbody></table></div><p class="sm muted">* المئيني محسوب من عينة صغيرة (أقل من ${S.meta.settings.minNorm})، فتفسيره مبدئي. النتائج «قيد التصحيح» تظهر درجاتها المبدئية ولا تدخل في المعايير حتى يكتمل تصحيحها.</p></div>`);
      bindTF(draw);
      if (keep) { const q = $('[data-tf="q"]'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
    };
    draw();
  };
  ACT.ttExport = () => {
    const rows = S._ttRows || [], dims = TA.ALL_DIMS[TF.bat];
    const head = ['رقم الطالب', 'الاسم', 'الجنس', 'الصف', 'الفصل', 'المرحلة', 'الصورة', 'النموذج', 'الجلسة', 'الحالة', 'طريقة التصحيح', ...dims.map(d => DIMN[d] + ' (خام)'), ...dims.map(d => DIMN[d] + ' (معيارية)'), 'نقاط القوة', 'المؤشر الإبداعي', 'المئيني', 'المستوى', 'التوصية', 'ملاحظات', 'طريقة الأداء', 'تاريخ التسليم'];
    const out = [head];
    rows.forEach(r => out.push([r.studentId, r.name, r.gender, r.grade, r.className, STAGE_NAME[r.stage], BAT[r.battery], r.form, r.code, (STATUS[r.status] || [r.status])[0], SRC[r.scoredBy] || '', ...dims.map(d => r[d]), ...dims.map(d => r._ss ? r._ss[d] : ''), r.bonus, r._index, r._pct, r._level ? r._level.code + ' ' + r._level.label : '', r._nominated ? 'مرشح' : r._borderline ? 'حدّي' : r._reviewHigh ? 'مراجعة' : '', (r._flags || []).join(' – '), r.mode === 'paper' ? 'ورقي' : 'شاشة', fmtDate(r.submittedAt, true)]));
    downloadFile(`نتائج_التفكير_الإبداعي_${BAT[TF.bat]}_${fmtDate(Date.now()).replace(/\//g, '-')}.csv`, toCSV(out));
  };

  /* ---------------- تقرير الطالب ---------------- */
  function catLabel(bat, actId, c) {
    if (!c) return '—'; if (/^x:/.test(c)) return c.slice(2);
    const cats = bat === 'verbal' ? (I.CATS[actId] || []) : I.CATS.figure; const f = cats.find(x => x[0] === c); return f ? f[1] : c === 'other' ? 'أخرى' : c;
  }
  function stars(o) { o = Number(o) || 0; return o ? '<span class="tt-star" title="نقاط الأصالة">' + '★'.repeat(o) + '</span>' : ''; }
  function respHtml(r, bat, D) {
    const F = I.getForm(bat, r.form), groups = {};
    D.responses.forEach(x => (groups[x.act] = groups[x.act] || []).push(x));
    return F.acts.map(a => {
      const L = (groups[a.id] || []).sort((x, y) => Number(x.item) - Number(y.item)), ac = J(r.acts)[a.id] || {};
      const sum = Object.keys(ac).map(k => `${DIMN[k] ? DIMN[k].split(' ')[0] : k}: <b>${ac[k]}</b>`).join(' — ');
      let body;
      if (bat === 'verbal') body = L.length ? `<ol class="tt-resp">${L.map(x => `<li class="${String(x.valid) !== '1' ? 'inv' : x.dupOf ? 'dup' : ''}">${esc(x.text)} <span class="chip">${esc(catLabel(bat, a.id, x.cat))}</span>${stars(x.orig)}${x.freq !== '' ? `<small class="muted"> (${x.freq}%)</small>` : ''}${String(x.valid) !== '1' ? ' <small class="bad">غير صالحة</small>' : x.dupOf ? ' <small class="muted">مكررة</small>' : ''}${x.src === 'human' ? ' <small class="badge">بشري</small>' : ''}</li>`).join('')}</ol>` : '<p class="muted">لا توجد إجابات.</p>';
      else body = `${D.images[a.id] ? `<div class="tt-imgbox" data-img="${D.images[a.id]}"><button class="btn ghost sm-btn" data-loadimg="${D.images[a.id]}">عرض الرسم</button></div>` : '<p class="muted">لا توجد صورة لهذا النشاط.</p>'}
        ${L.length ? `<table class="tbl sm-t"><thead><tr><th>#</th><th>ما رُسم</th><th>العنوان</th><th>الفئة</th><th>الأصالة</th><th>التفاصيل</th>${a.id !== 'repeat' ? '<th>التجريد</th>' : ''}${a.id === 'complete' ? '<th>الإغلاق</th>' : ''}</tr></thead><tbody>${L.map(x => `<tr class="${String(x.valid) !== '1' ? 'void' : ''}"><td>${a.id === 'repeat' ? esc(x.cells) : x.item || ''}</td><td>${esc(x.text || '—')}</td><td>${esc(x.title || '')}</td><td>${esc(catLabel(bat, a.id, x.cat))}</td><td>${stars(x.orig) || '0'}</td><td>${x.elab}</td>${a.id !== 'repeat' ? `<td>${x.abstr}</td>` : ''}${a.id === 'complete' ? `<td>${x.closure}</td>` : ''}</tr>`).join('')}</tbody></table>` : ''}`;
      return `<details class="tt-actd" ${bat === 'figural' ? 'open' : ''}><summary><b>${esc(a.title)}</b> <span class="muted sm">${sum}</span></summary>${body}</details>`;
    }).join('');
  }
  ACT.ttReport = async (tr) => {
    const id = tr.dataset.id; const r = (S._ttRows || []).find(x => x.resultId === id) || (S._ttAll || []).find(x => x.resultId === id); if (!r) return;
    let D; try { D = await api('ttResult', { resultId: id }); } catch (e) { toast(e.message, 'err'); return; }
    const bat = r.battery, dims = TA.ALL_DIMS[bat], st = J(r.strengths), sch = S.meta.settings.schoolName;
    const merged = {}; const srcs = Object.keys(st).filter(k => k !== 'rule'); (st.human ? ['human'] : srcs.length ? srcs : ['rule']).forEach(k => Object.keys(st[k] || {}).forEach(x => { if (st[k][x]) merged[x] = (merged[x] || 0) + 1; }));
    const valid = r.status === 'valid' && r._ss;
    const bars = dims.map(d => { const ss = valid ? r._ss[d] : null; const w = ss == null ? 0 : Math.max(2, Math.min(100, (ss - 55) / 90 * 100)); return `<div class="pb-row"><span class="pb-l wide">${DIMN[d]}${d === 'flexibility' && bat === 'figural' ? ' *' : ''}</span><div class="pb"><span class="obs ${ss >= 120 ? 'lv1' : ss >= 105 ? 'lv2' : ss >= 95 ? 'lv3' : 'lv4'}" style="width:${w}%"></span></div><span class="pb-v">${r[d]}</span><span class="pb-d">${ss == null ? '' : ss}</span></div>`; }).join('');
    const rec = !isAll() || !valid ? '' : r._nominated ? `<div class="rec gold">★ يُرشَّح في محك التفكير الإبداعي (المؤشر الإبداعي في المئيني ${r._pct}، وحد الترشيح ${S.meta.settings.ttGiftedPct || 90} فأكثر).</div>` : r._reviewHigh ? '<div class="rec warnc">المؤشر مرتفع لكن عدد الاستجابات قليل جداً؛ يُنصح بالتحقق قبل الترشيح.</div>' : r._borderline ? '<div class="rec">حالة حدّية قريبة من حد الترشيح؛ تُدرس مع المحكات الأخرى.</div>' : '';
    const html = `<div class="report" id="report"><div class="rep-head"><div class="logo sm">${logoSvg()}</div><div><h2>تقرير اختبار التفكير الإبداعي – ${BAT[bat]}</h2><p>${esc(sch)} — برنامج الكشف عن الموهوبين</p></div></div>
      <table class="info"><tr><th>الطالب</th><td>${esc(r.name)}</td><th>رقم الطالب</th><td dir="ltr">${esc(r.studentId)}</td></tr><tr><th>الصف / الفصل</th><td>${esc(r.grade)} — ${esc(r.className)}</td><th>العمر</th><td>${r.ageMonths ? Math.floor(r.ageMonths / 12) + ' سنة و' + (r.ageMonths % 12) + ' شهر' : '—'}</td></tr>
      <tr><th>الاختبار</th><td>${BAT[bat]} — النموذج ${r.form} — ${r.mode === 'paper' ? 'ورقي' : 'على الشاشة'}</td><th>تاريخ التطبيق</th><td>${fmtDate(r.submittedAt, true)}</td></tr><tr><th>الحالة</th><td>${statusBadge(r)} ${r.note ? `<small>${esc(r.note)}</small>` : ''}</td><th>التصحيح</th><td>${SRC[r.scoredBy] || '—'}${r.aiModel ? ` <small class="muted" dir="ltr">${esc(r.aiModel)}</small>` : ''}</td></tr></table>
      ${valid ? `<div class="rep-grid"><div class="rep-score"><div class="big">${r._index}</div><span>المؤشر الإبداعي</span></div><div class="rep-score"><div class="big">${r._pct}</div><span>الرتبة المئينية</span></div><div class="rep-score"><div class="big lvl ${r._level.cls}">${r._level.code}</div><span>${esc(r._level.label)}</span></div><div class="rep-score"><div class="big">${bat === 'figural' ? r.bonus : r.fluency}</div><span>${bat === 'figural' ? 'نقاط القوة الإبداعية' : 'عدد الأفكار'}</span></div></div>
      <p class="sm muted">مجموعة المقارنة: ${esc(r._refName)} (ن = ${r._refN})${r._refFallback ? ' — استُخدمت المرحلة لأن عينة المجموعة المختارة صغيرة' : ''}${r._refSmall ? ' — <b>العينة صغيرة فالتفسير مبدئي</b>' : ''}${r._equated ? ' — عُودلت الدرجات بين النماذج الأربعة' : ''}.</p>` : `<div class="card warnc">${r.status === 'scoring' ? 'النتيجة قيد التصحيح؛ الأرقام أدناه مبدئية.' : r.status === 'review' ? 'النتيجة تحتاج مراجعة قبل اعتمادها.' : 'هذه النتيجة ملغاة.'}</div>`}
      <h4>الأبعاد</h4><div class="pbars">${bars}</div><p class="sm muted">الرقم الأول: الدرجة الخام — الرقم الثاني: الدرجة المعيارية المحلية (المتوسط 100).${bat === 'figural' ? ' * المرونة بُعد إضافي لا يدخل في المؤشر.' : ''}</p>
      ${bat === 'figural' ? `<h4>نقاط القوة الإبداعية</h4><p>${Object.keys(merged).length ? Object.keys(merged).map(k => `<span class="chip">${esc(STR_NAME[k] || k)}${merged[k] > 1 ? ' ++' : ' +'}</span>`).join('') : '<span class="muted">لم تُرصد.</span>'}</p>` : ''}
      ${(r._flags || []).length ? `<ul class="flags">${r._flags.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      ${rec}
      <h4>الإجابات وتصحيحها</h4><div class="tt-resps">${respHtml(r, bat, D)}</div>
      <p class="disc">اختبار مبني على نمط اختبارات تورانس للتفكير الإبداعي، ومثيراته أصلية. الأصالة محسوبة من ندرة الفكرة بين طلاب المدرسة، والمعايير محلية وليست معايير رسمية. نتيجة هذا الاختبار محك واحد ضمن محكات الكشف عن الموهبة.</p>
      <div class="sign"><div>منسق الموهبة: ..................</div><div>التوقيع: ..................</div><div>التاريخ: ..................</div></div></div>
      <div class="row end noprint">${isAll() ? `<button class="btn ghost" data-r="review">مراجعة التصحيح وتعديله</button>${S.meta.tt && S.meta.tt.ai ? '<button class="btn ghost" data-r="rescore">إعادة التصحيح بالذكاء الاصطناعي</button>' : ''}${r.status === 'void' ? '<button class="btn ghost" data-r="valid">استعادة النتيجة</button>' : '<button class="btn ghost danger-t" data-r="void">إلغاء النتيجة</button>'}` : ''}<button class="btn" onclick="window.print()">طباعة التقرير</button></div>`;
    const m = modal(html, { wide: true, cls: 'rep-modal' });
    m.el.addEventListener('click', async e => {
      const li = e.target.closest('[data-loadimg]');
      if (li) { busy(li, true); try { const im = await api('ttImage', { imageId: li.dataset.loadimg }); li.parentElement.innerHTML = `<img src="${im.dataUrl}" alt="رسم الطالب">`; } catch (er) { toast(er.message, 'err'); busy(li, false); } return; }
      const b = e.target.closest('[data-r]'); if (!b) return; const k = b.dataset.r;
      if (k === 'review') { m.close(); reviewModal(r, D); return; }
      if (k === 'rescore') { if (!(await confirmBox('ستُرسل إجابات الطالب للتصحيح من جديد بالذكاء الاصطناعي، وتُستبدل الدرجات الآلية الحالية (التعديلات البشرية تبقى). متابعة؟', 'إعادة التصحيح'))) return; try { await api('ttRescore', { resultId: r.resultId }); m.close(); toast('أُضيفت للطابور'); render(); } catch (er) { toast(er.message, 'err'); } return; }
      if (!(await confirmBox(k === 'void' ? 'إلغاء النتيجة يستبعدها من التحليل والترشيح ويسمح للطالب بإعادة الاختبار. متابعة؟' : 'استعادة النتيجة؟', 'تنفيذ', k === 'void'))) return;
      try { await api('ttSetStatus', { resultId: r.resultId, status: k }); m.close(); toast('تم'); render(); } catch (er) { toast(er.message, 'err'); }
    });
    // تحميل الصور تلقائياً
    $$('[data-loadimg]', m.el).forEach(b => b.click());
  };

  /* ---------------- مراجعة التصحيح يدوياً ---------------- */
  function reviewModal(r, D) {
    const bat = r.battery, F = I.getForm(bat, r.form), st = J(r.strengths);
    const merged = st.human || (() => { const o = {}; Object.keys(st).filter(k => k !== 'rule').forEach(k => Object.keys(st[k] || {}).forEach(x => { if (st[k][x]) o[x] = 1; })); return Object.keys(o).length ? o : (st.rule || {}); })();
    const sel = (name, val, opts) => `<select data-f="${name}">${opts.map(o => `<option value="${o[0]}" ${String(val) === String(o[0]) ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    const groups = {}; D.responses.forEach(x => (groups[x.act] = groups[x.act] || []).push(x));
    const html = `<h3>مراجعة تصحيح ${esc(r.name)} — ${BAT[bat]}</h3><p class="muted sm">عدّل ما تراه، وكل تعديل يُسجَّل ليُحسب اتفاق المصحح البشري مع التصحيح الآلي. الأصالة التي تعدّلها تُثبَّت ولا تغيّرها إعادة الحساب.</p>
      ${F.acts.map(a => { const L = (groups[a.id] || []).sort((x, y) => Number(x.item) - Number(y.item)); if (!L.length) return ''; const cats = (bat === 'verbal' ? a.cats : I.CATS.figure).map(c => [c[0], c[1]]); return `<h4>${esc(a.title)}</h4><div class="tbl-wrap"><table class="tbl sm-t tt-rev"><thead><tr><th>${bat === 'verbal' ? 'الإجابة' : 'الرسمة'}</th><th>صالحة</th><th>مكررة</th><th>الفئة</th><th>الأصالة</th>${bat === 'figural' ? '<th>التفاصيل</th>' : ''}${bat === 'figural' && a.id !== 'repeat' ? '<th>تجريد العنوان</th>' : ''}${a.id === 'complete' ? '<th>الإغلاق</th>' : ''}</tr></thead><tbody>
        ${L.map(x => { const cl = cats.slice(); if (x.cat && !cl.some(c => c[0] === x.cat)) cl.push([x.cat, catLabel(bat, a.id, x.cat)]); return `<tr data-rid="${x.rid}"><td>${esc(x.text || '')}${x.title ? `<br><small class="muted">العنوان: ${esc(x.title)}</small>` : ''}</td><td><input type="checkbox" data-f="valid" ${String(x.valid) === '1' ? 'checked' : ''}></td><td><input type="checkbox" data-f="dupOf" ${x.dupOf ? 'checked' : ''} data-old="${esc(x.dupOf)}"></td>
          <td>${sel('cat', x.cat, [['', '—']].concat(cl))}</td><td>${sel('orig', x.orig, [[0, '0'], [1, '1'], [2, '2']])}</td>${bat === 'figural' ? `<td><input type="number" min="0" max="12" data-f="elab" value="${esc(x.elab)}" class="num-in"></td>` : ''}${bat === 'figural' && a.id !== 'repeat' ? `<td>${sel('abstr', x.abstr, [[0, '0'], [1, '1'], [2, '2'], [3, '3']])}</td>` : ''}${a.id === 'complete' ? `<td>${sel('closure', x.closure, [[0, '0'], [1, '1'], [2, '2']])}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>`; }).join('')}
      ${bat === 'figural' ? `<h4>نقاط القوة الإبداعية</h4><div class="checks">${I.STRENGTHS.map(s => `<label class="chk"><input type="checkbox" data-str="${s[0]}" ${merged[s[0]] ? 'checked' : ''}> ${s[1]}</label>`).join('')}</div>` : ''}
      <label>ملاحظة المراجع<input id="rvNote" value="${esc(r.note || '')}" maxlength="300"></label>
      <div class="row end"><button class="btn ghost" data-close>إلغاء</button><button class="btn" id="rvSave">حفظ المراجعة واعتماد النتيجة</button></div>`;
    const m = modal(html, { wide: true });
    $('#rvSave', m.el).onclick = async e => {
      const b = e.target; busy(b, true);
      const rows = $$('tr[data-rid]', m.el).map(tr => { const o = { rid: tr.dataset.rid }; $$('[data-f]', tr).forEach(el => { const f = el.dataset.f; if (f === 'valid') o.valid = el.checked ? '1' : '0'; else if (f === 'dupOf') o.dupOf = el.checked ? (el.dataset.old || '?') : ''; else o[f] = el.value; }); return o; });
      const strengths = bat === 'figural' ? Object.fromEntries($$('[data-str]', m.el).filter(x => x.checked).map(x => [x.dataset.str, 1])) : null;
      try { const res = await api('ttReview', { resultId: r.resultId, rows, strengths, note: $('#rvNote', m.el).value }); m.close(); toast(`تم الحفظ (${res.changed} تعديل)`); render(); } catch (er) { toast(er.message, 'err'); busy(b, false); }
    };
  }

  /* ---------------- الترشيح والملف الموحّد ---------------- */
  PAGES.ttNominations = async () => {
    await loadTT(); await A.getResults(true);
    const stageF = { v: TF.stage || 'primary' };
    const draw = () => {
      const st = stageF.v, gp = Number(S.meta.settings.ttGiftedPct || 90);
      const tt = enriched().filter(r => r.stage === st && r.status === 'valid'); S._ttAll = tt;
      const rv = AN.enrich((S.results || []).map(x => Object.assign({}, x)), S.meta.settings, 'grade').filter(r => r.stage === st && r.status === 'valid');
      const P = {};
      const add = (r, k) => { const p = P[r.studentId] = P[r.studentId] || { studentId: r.studentId, name: r.name, className: r.className, grade: r.grade, gender: r.gender }; const prev = p[k]; if (!prev || r.submittedAt > prev.submittedAt) p[k] = r; };
      rv.forEach(r => add(r, 'rv')); tt.forEach(r => add(r, r.battery));
      const people = Object.values(P).map(p => {
        const n = ['rv', 'verbal', 'figural'].filter(k => p[k] && p[k]._nominated); p.noms = n.length; p.max = Math.max(...['rv', 'verbal', 'figural'].map(k => p[k] ? p[k]._pct || 0 : 0));
        const ab = !!(p.rv && p.rv._nominated), cr = !!((p.verbal && p.verbal._nominated) || (p.figural && p.figural._nominated));
        p.rec = ab && cr ? ['★★ مرشح: قدرة عقلية + تفكير إبداعي', 'gold'] : ab ? ['★ مرشح: قدرة عقلية', 'gold'] : cr ? ['★ مرشح: تفكير إبداعي', 'gold'] : ['rv', 'verbal', 'figural'].some(k => p[k] && p[k]._borderline) ? ['حدّي في أحد المحكات', 'lv2'] : ['', ''];
        return p;
      }).sort((a, b) => b.noms - a.noms || b.max - a.max);
      S._ttPeople = people;
      const cell = x => x ? `${x._pct != null ? x._pct : '—'} ${x._nominated ? '<span class="badge gold">★</span>' : x._borderline ? '<span class="badge lv2">حدّي</span>' : ''}` : '<span class="muted">—</span>';
      const sec = (title, list) => `<div class="card"><h3>${title} <span class="badge gold">${list.length}</span></h3>${list.length ? `<div class="tbl-wrap"><table class="tbl click"><thead><tr><th>الطالب</th><th>الفصل</th><th>المؤشر</th><th>المئيني</th><th>المستوى</th><th>ملاحظات</th></tr></thead><tbody>${list.sort((a, b) => b._pct - a._pct).map(r => `<tr data-act="ttReport" data-id="${r.resultId}"><td>${esc(r.name)}</td><td>${esc(r.className)}</td><td><b>${r._index}</b></td><td>${r._pct}</td><td>${lvl(r)}</td><td class="sm">${esc((r._flags || []).join(' – '))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">لا يوجد.</p>'}</div>`;
      setPage(`<div class="row between"><h1 class="ph">الترشيح والملف الموحّد</h1><div><button class="btn ghost" data-act="ttExportPeople">تصدير الملف الموحّد</button> <button class="btn ghost" data-act="printPage">طباعة</button></div></div>
        <div class="filters"><label>المرحلة<select id="nSt">${['primary', 'intermediate', 'secondary'].map(s => `<option value="${s}" ${s === st ? 'selected' : ''}>${STAGE_NAME[s]}</option>`).join('')}</select></label></div>
        <div class="card guide"><p>يجمع الملف الموحّد محكّين من محكات الكشف: <b>القدرة العقلية</b> (اختبار المصفوفات) و<b>التفكير الإبداعي</b> (الصورتان اللفظية والشكلية). يُرشَّح الطالب في محك الإبداع إذا كان مؤشره الإبداعي في المئيني ${gp} فأكثر. يمكن تعديل الحدّين من «الإعدادات».</p></div>
        <div class="card"><h3>الملف الموحّد للطلاب (${people.length})</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الطالب</th><th>الفصل</th><th>المصفوفات (مئيني)</th><th>الإبداع اللفظي (مئيني)</th><th>الإبداع الشكلي (مئيني)</th><th>التوصية</th></tr></thead><tbody>
        ${people.filter(p => p.rec[0]).map(p => `<tr><td>${esc(p.name)}<br><small class="muted" dir="ltr">${esc(p.studentId)}</small></td><td>${esc(p.className)}</td><td>${cell(p.rv)}</td><td>${cell(p.verbal)}</td><td>${cell(p.figural)}</td><td>${p.rec[0] ? `<span class="badge ${p.rec[1]}">${p.rec[0]}</span>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">لا يوجد مرشحون أو حالات حدّية في هذه المرحلة.</td></tr>'}
        </tbody></table></div><p class="sm muted">يظهر هنا المرشحون والحالات الحدّية فقط؛ الملف المصدَّر يشمل كل الطلاب.</p></div>
        ${sec('مرشحو التفكير الإبداعي – الصورة الشكلية', tt.filter(r => r.battery === 'figural' && r._nominated))}
        ${sec('مرشحو التفكير الإبداعي – الصورة اللفظية', tt.filter(r => r.battery === 'verbal' && r._nominated))}
        ${sec('حالات حدّية في التفكير الإبداعي', tt.filter(r => r._borderline))}`);
      $('#nSt').onchange = e => { stageF.v = e.target.value; TF.stage = e.target.value; draw(); };
    };
    draw();
  };
  ACT.ttExportPeople = () => {
    const out = [['رقم الطالب', 'الاسم', 'الصف', 'الفصل', 'الجنس', 'المصفوفات: الدرجة', 'المصفوفات: المئيني', 'المصفوفات: مرشح', 'اللفظي: المؤشر', 'اللفظي: المئيني', 'اللفظي: مرشح', 'الشكلي: المؤشر', 'الشكلي: المئيني', 'الشكلي: مرشح', 'التوصية']];
    (S._ttPeople || []).forEach(p => out.push([p.studentId, p.name, p.grade, p.className, p.gender, p.rv ? p.rv.score : '', p.rv ? p.rv._pct : '', p.rv && p.rv._nominated ? 'نعم' : '', p.verbal ? p.verbal._index : '', p.verbal ? p.verbal._pct : '', p.verbal && p.verbal._nominated ? 'نعم' : '', p.figural ? p.figural._index : '', p.figural ? p.figural._pct : '', p.figural && p.figural._nominated ? 'نعم' : '', p.rec[0]]));
    downloadFile(`الملف_الموحد_للترشيح_${fmtDate(Date.now()).replace(/\//g, '-')}.csv`, toCSV(out));
  };

  /* ---------------- التحليل الإحصائي ---------------- */
  function hist(vals) {
    if (!vals.length) return '';
    const lo = Math.floor(Math.min(...vals) / 5) * 5, hi = Math.ceil((Math.max(...vals) + 1) / 5) * 5, bins = [];
    for (let x = lo; x < hi; x += 5) bins.push({ from: x, to: x + 4, count: vals.filter(v => v >= x && v < x + 5).length });
    return A.histSvg(bins);
  }
  PAGES.ttAnalysis = async () => {
    TF.q = ''; TF.status = ''; TF.code = '';
    await loadTT();
    let agree = null; try { agree = await api('ttAgreement', { battery: TF.bat }); } catch (e) { }
    const ideaSel = { form: 1, act: '' };
    const draw = () => {
      ensureTF(); const all = enriched().filter(r => r.battery === TF.bat && r.stage === TF.stage && r.status === 'valid');
      const rows = applyTF(all), dims = TA.ALL_DIMS[TF.bat];
      if (!ideaSel.act) ideaSel.act = I.getForm(TF.bat, 1).acts[TF.bat === 'verbal' ? 4 : 1].id;
      if (!rows.length) { setPage(`<h1 class="ph">تحليل التفكير الإبداعي</h1>${ttFilterBar({ form: true })}<div class="card"><p class="muted">لا توجد نتائج مصححة لهذا الاختيار.</p></div>`); bindTF(draw); return; }
      const idx = rows.map(r => r._index), rel = TA.reliability(rows, TF.bat);
      const byForm = [1, 2, 3, 4].map(f => { const l = all.filter(r => String(r.form) === String(f)); return { f, n: l.length, raw: dims.map(d => AN.round(AN.mean(l.map(r => Number(r[d]) || 0)), 1)), eq: dims.map(d => AN.round(AN.mean(l.map(r => r._eq ? r._eq[d] : 0)), 1)), idx: AN.round(AN.mean(l.map(r => r._index)), 1) }; }).filter(x => x.n);
      const sds = dims.map(d => AN.sd(all.map(r => Number(r[d]) || 0)));
      const formWarn = byForm.length > 1 && dims.some((d, i) => { const ms = byForm.filter(x => x.n >= 15).map(x => x.raw[i]); return ms.length > 1 && (Math.max(...ms) - Math.min(...ms)) > 0.5 * sds[i]; });
      rows.forEach(r => r._score = r._index);
      const actIds = I.getForm(TF.bat, 1).acts;
      const actMeans = actIds.map(a => { const v = rows.map(r => J(r.acts)[a.id] || {}); const keys = Object.keys(v.find(x => Object.keys(x).length) || {}); return { a, vals: keys.map(k => [k, AN.round(AN.mean(v.map(x => Number(x[k]) || 0)), 1)]) }; });
      const corr = dims.length > 2 ? TA.correlation(rows.map(r => Number(r.fluency) || 0), rows.map(r => Number(r.originality) || 0)) : null;
      const ag = agree && agree.n ? `<div class="stat ${agree.same / agree.n < 0.7 ? 'warnc' : 'green'}"><b>${Math.round(agree.same / agree.n * 100)}%</b><span>اتفاق المراجع البشري مع الآلي (ن=${agree.n})</span></div>` : '';
      setPage(`<h1 class="ph">تحليل التفكير الإبداعي — ${BAT[TF.bat]} — المرحلة ${STAGE_NAME[TF.stage]}</h1>${ttFilterBar({ form: true })}
        <div class="cards"><div class="stat"><b>${rows.length}</b><span>عدد الطلاب</span></div><div class="stat"><b>${AN.round(AN.mean(idx), 1)}</b><span>متوسط المؤشر الإبداعي</span></div><div class="stat"><b>${AN.round(AN.sd(idx), 1)}</b><span>الانحراف المعياري</span></div>
        ${Object.keys(rel).filter(k => k !== 'label').map(k => `<div class="stat ${rel[k] != null && rel[k] < 0.6 ? 'warnc' : 'green'}"><b>${rel[k] == null ? '—' : rel[k]}</b><span>الثبات: ${k === 'index' ? 'المؤشر' : DIMN[k]}</span></div>`).join('')}${ag}</div>
        <p class="sm muted">${rel.label}. يُحسب الثبات عند وجود 10 طلاب على الأقل.${corr != null ? ` الارتباط بين الطلاقة والأصالة: ${corr}.` : ''}</p>
        <div class="card"><h3>توزيع المؤشر الإبداعي</h3>${hist(idx)}</div>
        <div class="card"><h3>تكافؤ النماذج الأربعة</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>النموذج</th><th>العدد</th>${dims.map(d => `<th>${DIMN[d].split(' ')[0]} (خام ← بعد المعادلة)</th>`).join('')}<th>متوسط المؤشر</th></tr></thead><tbody>${byForm.map(x => `<tr><td>نموذج ${x.f}</td><td>${x.n}</td>${x.raw.map((v, i) => `<td>${v} ← <b>${x.eq[i]}</b></td>`).join('')}<td>${x.idx}</td></tr>`).join('')}</tbody></table></div>
        <p class="sm muted">المعادلة الخطية تجعل متوسط كل نموذج وانحرافه مساويين لمتوسط المرحلة وانحرافها، فلا يتأثر ترتيب الطالب بالنموذج الذي أخذه. تُطبَّق عندما يكون في المرحلة 40 طالباً على الأقل وفي النموذج 15 طالباً على الأقل.</p>
        ${formWarn ? '<div class="card warnc">قبل المعادلة كان الفرق بين متوسطات النماذج أكبر من نصف انحراف معياري في بُعد واحد على الأقل؛ المعادلة تعالج ذلك، لكن راجع توزيع الطلاب على النماذج.</div>' : ''}</div>
        <div class="card"><h3>متوسطات الأنشطة</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>النشاط</th><th>المتوسطات</th></tr></thead><tbody>${actMeans.map(x => `<tr><td>${esc(x.a.title)}</td><td>${x.vals.map(v => `${DIMN[v[0]] || v[0]}: <b>${v[1]}</b>`).join(' — ')}</td></tr>`).join('')}</tbody></table></div></div>
        ${A.statTable('المؤشر الإبداعي حسب الصف', AN.groupStats(rows, r => 'الصف ' + r.grade), 'الصف')}
        ${A.statTable('حسب الفصل', AN.groupStats(rows, r => r.className), 'الفصل')}
        ${A.statTable('حسب الجنس', AN.groupStats(rows, r => r.gender || 'غير محدد'), 'الجنس')}
        <div class="card"><h3>أكثر الأفكار تكراراً (أساس حساب الأصالة)</h3><div class="filters"><label>النموذج<select id="idF">${[1, 2, 3, 4].map(f => `<option ${f === ideaSel.form ? 'selected' : ''}>${f}</option>`).join('')}</select></label><label>النشاط<select id="idA">${actIds.map(a => `<option value="${a.id}" ${a.id === ideaSel.act ? 'selected' : ''}>${esc(a.title)}</option>`).join('')}</select></label><button class="btn ghost" id="idGo">عرض</button></div><div id="idOut" class="muted">اختر النموذج والنشاط ثم «عرض».</div></div>
        ${agree && agree.n ? `<div class="card"><h3>اتفاق المراجعة البشرية مع التصحيح الآلي</h3><p>راجع المصححون ${agree.n} إجابة؛ لم يُغيَّر فيها شيء في ${agree.same} (${Math.round(agree.same / agree.n * 100)}%).</p><p class="sm">عدد التعديلات حسب الحقل: ${Object.keys(agree.by).map(k => `${{ valid: 'الصلاحية', cat: 'الفئة', orig: 'الأصالة', elab: 'التفاصيل', abstr: 'التجريد', closure: 'الإغلاق' }[k]}: ${agree.by[k]}`).join(' — ')}</p></div>` : '<div class="card guide"><p>لقياس دقة التصحيح الآلي: افتح تقارير عينة من الطلاب (10% مثلاً) واضغط «مراجعة التصحيح»، ثم احفظ دون تعديل ما تتفق معه. يظهر هنا معدل الاتفاق.</p></div>'}`);
      bindTF(draw);
      $('#idF').onchange = e => ideaSel.form = +e.target.value; $('#idA').onchange = e => ideaSel.act = e.target.value;
      $('#idGo').onclick = async e => { busy(e.target, true); try { const r = await api('ttIdeas', { battery: TF.bat, form: ideaSel.form, act: ideaSel.act }); $('#idOut').innerHTML = `<p>عدد الطلاب: ${r.N} — عدد الأفكار المختلفة: ${r.clusters} — أفكار انفرد بها طالب واحد: ${r.rare}</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الفكرة</th><th>مثال</th><th>عدد الطلاب</th><th>النسبة</th><th>نقاط الأصالة</th></tr></thead><tbody>${r.top.map(x => `<tr><td>${esc(x.key)}</td><td class="sm">${esc(x.example)}</td><td>${x.n}</td><td>${x.pct}%</td><td>${x.pct >= 5 ? 0 : x.pct >= 2 ? 1 : 2}</td></tr>`).join('')}</tbody></table></div>`; } catch (er) { toast(er.message, 'err'); } finally { busy(e.target, false); } };
    };
    draw();
  };

  /* ---------------- معاينة النماذج وطباعة الكراسات ---------------- */
  PAGES.ttPreview = async () => {
    let bat = 'figural', form = 1, stage = 'primary';
    const draw = () => {
      const F = I.getForm(bat, form);
      setPage(`<h1 class="ph">نماذج التفكير الإبداعي</h1><div class="filters"><label>الصورة<select id="pB"><option value="figural" ${bat === 'figural' ? 'selected' : ''}>الشكلية</option><option value="verbal" ${bat === 'verbal' ? 'selected' : ''}>اللفظية</option></select></label>
        <label>النموذج<select id="pF">${[1, 2, 3, 4].map(f => `<option ${f === form ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label>صياغة التعليمات<select id="pS">${['primary', 'intermediate', 'secondary'].map(s => `<option value="${s}" ${s === stage ? 'selected' : ''}>المرحلة ${STAGE_NAME[s]}</option>`).join('')}</select></label>
        <button class="btn" id="pPrint">طباعة كراسة ورقية لهذا النموذج</button></div>
        <div class="card guide"><p>النماذج الأربعة متوازية نشاطاً بنشاط: الأنشطة نفسها والأزمنة نفسها ومثيرات متقاربة في التعقيد. ولأن الإجابات مفتوحة، يعادل النظام الدرجات بين النماذج إحصائياً بعد التطبيق. للتطبيق الورقي: اطبع الكراسة، ثم يصوّر الطالب كل صفحة رسم ويرفعها، أو يُدخل المعلم الإجابات من صفحة «متابعة» الجلسة ← «إدخال ورقي».</p></div>
        ${F.acts.map((a, i) => `<div class="card tt-pv"><h3>${i + 1}. ${esc(a.title)} <span class="badge">${a.time} دقائق</span></h3><p>${esc(a.instr(stage))}</p>${bat === 'verbal' ? `<div class="tt-stim sm">${a.stim.svg || ''}</div><p class="sm muted">وصف المثير للمصحح الآلي: ${esc(a.stim.desc)}</p>` : `<div class="tt-pvpage">${I.pageSvg(a.id, form)}</div>`}</div>`).join('')}`);
      $('#pB').onchange = e => { bat = e.target.value; draw(); }; $('#pF').onchange = e => { form = +e.target.value; draw(); }; $('#pS').onchange = e => { stage = e.target.value; draw(); };
      $('#pPrint').onclick = () => printBooklet(bat, form, stage);
    };
    draw();
  };
  function printBooklet(bat, form, stage) {
    const F = I.getForm(bat, form), sch = S.meta.settings.schoolName;
    const head = (t) => `<div class="bk-head"><b>${esc(sch)} — اختبار التفكير الإبداعي (${BAT[bat]}) — النموذج ${form}</b><span>${esc(t)}</span><div class="bk-fields"><span>اسم الطالب: ....................................</span><span>رقم الطالب: ..................</span><span>الفصل: ............</span></div></div>`;
    const pages = F.acts.map(a => bat === 'verbal'
      ? `<div class="bk-page">${head(a.title)}<p class="bk-in">${esc(a.instr(stage))}</p><div class="tt-stim bk">${a.stim.svg || ''}</div><ol class="bk-lines">${Array.from({ length: a.id === 'improve' || a.id === 'uses' ? 22 : 16 }, () => '<li></li>').join('')}</ol></div>`
      : `<div class="bk-page">${head(a.title)}<p class="bk-in">${esc(a.instr(stage))}</p><div class="bk-fig">${I.pageSvg(a.id, form)}</div>${a.id === 'construct' ? '<p class="bk-t">عنوان الرسمة: .....................................................................</p>' : '<p class="bk-t sm">اكتب عنوان كل رسمة تحتها أو بجانب رقمها.</p>'}</div>`).join('');
    const m = modal(`<div class="booklet">${pages}</div><div class="row end noprint"><button class="btn" onclick="window.print()">طباعة</button></div>`, { wide: true, cls: 'rep-modal bk-modal' });
    setTimeout(() => window.print(), 400);
    return m;
  }

  /* ---------------- الإدخال الورقي من المعلم ---------------- */
  function monitorBar(s, all) {
    S._ttSes = s; S._ttMonAll = all;
    return `<div class="card tt-mon"><b>اختبار التفكير الإبداعي – ${BAT[s.battery]}</b>${s.battery === 'figural' ? ` — الرسم: ${{ both: 'الشاشة أو الورق', screen: 'على الشاشة', paper: 'على الورق ثم التصوير' }[s.drawMode || 'both']}` : ''}. التقدم يُقاس بعدد الأنشطة المنجزة. <button class="btn ghost sm-btn" data-act="ttPaper" data-code="${s.code}">إدخال إجابات ورقية لطالب</button></div>`;
  }
  ACT.ttPaper = (b) => {
    const s = S._ttSes; if (!s) return;
    const all = (S._ttMonAll || []).filter(a => a.status !== 'submitted');
    const F1 = I.getForm(s.battery, 1);
    const verbal = s.battery === 'verbal';
    const m = modal(`<h3>إدخال إجابات ورقية — ${BAT[s.battery]}</h3>
      <p class="muted sm">${verbal ? 'اكتب إجابات الطالب كما كتبها (أو كما أملاها)، كل إجابة في سطر مستقل.' : 'صوّر كل صفحة رسم كاملة بوضوح، واكتب العناوين إن لم تكن واضحة في الصورة.'}</p>
      <div class="row2"><label>الطالب<select id="pSid">${all.map(a => `<option value="${esc(a.studentId)}" ${a.studentId === b.dataset.sid ? 'selected' : ''}>${esc(a.name)} — ${esc(a.className)}</option>`).join('')}</select></label>
      <label>النموذج المطبوع الذي استخدمه<select id="pForm"><option value="">تلقائي</option>${[1, 2, 3, 4].map(f => `<option>${f}</option>`).join('')}</select></label></div>
      ${F1.acts.map(a => verbal ? `<label>${esc(a.title)}<textarea data-pa="${a.id}" rows="4" class="rtl" placeholder="إجابة في كل سطر"></textarea></label>`
        : `<div class="tt-pe"><b>${esc(a.title)}</b><input type="file" accept="image/*" data-pi="${a.id}"><img data-pv="${a.id}" class="hidden">${a.id === 'construct' ? '<input data-pt="construct" placeholder="عنوان الرسمة (اختياري)">' : `<textarea data-pt="${a.id}" rows="2" class="rtl" placeholder="العناوين بالترتيب، عنوان في كل سطر (اختياري)"></textarea>`}</div>`).join('')}
      <div class="row end"><button class="btn ghost" data-close>إلغاء</button><button class="btn" id="pGo">حفظ وإرسال للتصحيح</button></div>`, { wide: true });
    if (!all.length) { $('#pGo', m.el).disabled = true; }
    const imgs = {};
    $$('[data-pi]', m.el).forEach(inp => inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { imgs[inp.dataset.pi] = await compressImage(f); const pv = $(`[data-pv="${inp.dataset.pi}"]`, m.el); pv.src = imgs[inp.dataset.pi]; pv.classList.remove('hidden'); } catch (e) { toast(e.message, 'err'); } });
    $('#pGo', m.el).onclick = async e => {
      const acts = {};
      if (verbal) $$('[data-pa]', m.el).forEach(t => { const l = t.value.split('\n').map(x => x.trim()).filter(Boolean); if (l.length) acts[t.dataset.pa] = { list: l }; });
      else $$('[data-pt]', m.el).forEach(t => { const v = t.value.trim(); if (!v) return; acts[t.dataset.pt] = t.dataset.pt === 'construct' ? { title: v } : { titles: v.split('\n').map(x => x.trim()) }; });
      if (!Object.keys(acts).length && !Object.keys(imgs).length) { toast('لم تُدخل أي إجابات', 'err'); return; }
      busy(e.target, true);
      try { const r = await api('ttPaperEntry', { code: s.code, studentId: $('#pSid', m.el).value, form: $('#pForm', m.el).value, acts, images: imgs }); m.close(); toast(`تم الحفظ (النموذج ${r.form}) — ${r.status === 'scoring' ? 'أُرسلت للتصحيح' : r.status === 'review' ? 'تحتاج مراجعة' : 'صُحّحت'}`); render(); }
      catch (er) { toast(er.message, 'err'); busy(e.target, false); }
    };
  };

  /* ---------------- الذكاء الاصطناعي: التشغيل اليدوي ---------------- */
  ACT.ttRunAI = async (b) => {
    const m = modal(`<h3>تصحيح الإجابات بالذكاء الاصطناعي</h3><p id="aiProg">جارٍ التصحيح…</p><div class="spin big"></div><p class="sm muted">يمكنك إغلاق هذه النافذة؛ التصحيح التلقائي يكمل في الخلفية إذا فُعّل المشغّل الزمني.</p>`, {});
    const prog = t => { const el = $('#aiProg', m.el); if (el) el.textContent = t; };
    try {
      if (DEMO) await demoRun(prog, () => !document.body.contains(m.el));
      else {
        let total = 0;
        for (let k = 0; k < 6; k++) {
          const r = await api('aiRun', { budget: 25000 }, { retries: 1 }); total += r.done || 0;
          prog(`تم تصحيح ${total} مهمة — المتبقي ${r.remaining}${r.stopped ? ' — ' + r.stopped : ''}`);
          if (!r.remaining || r.stopped || !document.body.contains(m.el)) break;
        }
      }
      toast('انتهت دورة التصحيح'); m.close(); render();
    } catch (e) { prog('خطأ: ' + e.message); }
  };
  async function demoRun(prog, cancelled) {
    let done = 0;
    for (let k = 0; k < 40; k++) {
      if (cancelled()) break;
      const r = await api('aiNext'); if (!r.job) break;
      let models = r.model ? [r.model] : r.models;
      if (!models || !models.length) { const lr = await fetch(GAPI + 'models?pageSize=200', { headers: { 'x-goog-api-key': r.key } }); if (lr.status !== 200) { await api('aiApply', { jobId: r.job.jobId, error: 'تعذّر جلب النماذج: ' + lr.status }); throw new Error('مفتاح Gemini غير صالح أو لا يعمل (' + lr.status + ')'); } models = E.pickModels((await lr.json()).models || []).slice(0, 4); }
      let ok = false, last = '';
      for (const mdl of models) {
        const res = await fetch(GAPI + 'models/' + encodeURIComponent(mdl) + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': r.key }, body: JSON.stringify(E.geminiBody(r.prompt, r.images)) });
        if (res.status === 200) { const j = await res.json(); let text = ''; try { text = E.geminiText(j); } catch (e) { last = e.message; break; } await api('aiApply', { jobId: r.job.jobId, text, model: mdl, models }); ok = true; done++; break; }
        if (res.status === 429) { await api('aiApply', { jobId: r.job.jobId, error: 'حد الطلبات المجاني (429)', quota: true }); prog('تم بلوغ حد الطلبات المجاني مؤقتاً، أعد المحاولة لاحقاً'); return; }
        last = 'HTTP ' + res.status; if (res.status !== 404 && res.status !== 400) break;
      }
      if (!ok) await api('aiApply', { jobId: r.job.jobId, error: last || 'فشل' });
      prog(`تم تصحيح ${done} مهمة…`);
      await sleep(Math.max(500, Number(S.meta.settings.aiPace || 5) * 1000));
    }
    await api('ttRecalc');
  }

  /* ---------------- الإعدادات ---------------- */
  function settingsHtml() {
    const s = S.meta.settings;
    return `<div class="card"><h3>إعدادات اختبار التفكير الإبداعي</h3><form id="fTT"><div class="row2">
      <label>حد الترشيح في التفكير الإبداعي (المئيني)<input name="ttGiftedPct" type="number" min="50" max="99" value="${esc(s.ttGiftedPct || 90)}"></label>
      <label>الحد الأدنى للطلاب لاعتماد الأصالة من بيانات المدرسة<input name="ttMinOrig" type="number" min="10" max="1000" value="${esc(s.ttMinOrig || 40)}"></label></div>
      <p class="sm muted">الأصالة: الفكرة التي يكتبها 5% أو أكثر من الطلاب تأخذ 0، ومن 2% إلى أقل من 5% تأخذ 1، والأندر تأخذ 2. قبل اكتمال العدد الأدنى تُستخدم درجة الندرة التي يقدّرها الذكاء الاصطناعي، وتُعلَّم بأنها مبدئية.</p>
      <div class="row end"><button class="btn">حفظ</button></div></form></div>
      <div class="card" id="aiCard"><h3>التصحيح بالذكاء الاصطناعي (Google Gemini المجاني)</h3><div id="aiBox"><div class="spin big"></div></div></div>`;
  }
  async function loadAI() {
    const box = $('#aiBox'); if (!box) return;
    let st; try { st = await api('aiStatus'); } catch (e) { box.innerHTML = `<p class="bad">${esc(e.message)}</p>`; return; }
    const s = S.meta.settings, admin = role() === 'admin';
    box.innerHTML = `<div class="cards"><div class="stat ${st.hasKey ? 'green' : 'warnc'}"><b>${st.hasKey ? '✓' : '✗'}</b><span>${st.hasKey ? 'المفتاح محفوظ ' + esc(st.keyMask) : 'لا يوجد مفتاح'}</span></div>
      <div class="stat blue"><b>${st.queued}</b><span>مهام في الطابور</span></div><div class="stat green"><b>${st.done}</b><span>مهام مكتملة</span></div><div class="stat ${st.error ? 'warnc' : ''}"><b>${st.error}</b><span>مهام تعذّرت</span></div>
      <div class="stat"><b>${st.todayCalls}/${st.dailyMax}</b><span>طلبات اليوم</span></div><div class="stat ${st.trigger === 'مفعّل' ? 'green' : ''}"><b class="sm-b">${DEMO ? 'تجريبي' : esc(st.trigger)}</b><span>التصحيح التلقائي كل 5 دقائق</span></div></div>
      ${st.lastError ? `<p class="bad sm">آخر خطأ: ${esc(st.lastError)}</p>` : ''}${st.lastRun ? `<p class="sm muted">آخر تشغيل: ${fmtDate(st.lastRun, true)}</p>` : ''}
      <div class="row">${isAll() ? '<button class="btn" data-ai="run">صحّح الآن</button>' : ''}${st.error ? '<button class="btn ghost" data-ai="requeue">إعادة محاولة المهام المتعذّرة</button>' : ''}<button class="btn ghost" data-ai="recalc">إعادة حساب الأصالة</button>
      ${admin && !DEMO ? (st.trigger === 'مفعّل' ? '<button class="btn ghost" data-ai="trOff">إيقاف التصحيح التلقائي</button>' : '<button class="btn warn" data-ai="trOn">تفعيل التصحيح التلقائي</button>') : ''}</div>
      ${admin ? `<hr><h4>مفتاح Gemini</h4>
      <ol class="sm"><li>ادخل إلى <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a> بحساب Google الخاص بالمدرسة.</li><li>اضغط <b>Create API key</b> وانسخ المفتاح.</li><li>الصقه هنا واضغط «حفظ المفتاح» ثم «اختبار الاتصال».</li></ol>
      <div class="row"><input id="aiKey" dir="ltr" placeholder="AIza…" style="max-width:420px" autocomplete="off"><button class="btn" data-ai="saveKey">حفظ المفتاح</button>${st.hasKey ? '<button class="btn ghost" data-ai="test">اختبار الاتصال</button><button class="btn ghost danger-t" data-ai="delKey">حذف المفتاح</button>' : ''}</div>
      <p class="sm muted">يُحفظ المفتاح في خصائص Apps Script على الخادم فقط، ولا يظهر في الموقع ولا في جدول البيانات${DEMO ? ' (في الوضع التجريبي يُحفظ في هذا المتصفح فقط)' : ''}.</p>
      <form id="fAI"><div class="row2"><label class="chk"><input type="checkbox" name="aiEnabled" ${s.aiEnabled !== '0' ? 'checked' : ''}> تفعيل التصحيح بالذكاء الاصطناعي</label>
      <label>النموذج (اتركه فارغاً للاختيار التلقائي لأحدث نموذج Flash مجاني)<input name="aiModel" dir="ltr" value="${esc(s.aiModel || '')}" placeholder="${esc((st.autoModels || [])[0] || 'تلقائي')}"></label>
      <label>ثوانٍ بين كل طلبين (لتجنب حد الطلبات)<input name="aiPace" type="number" min="0" max="60" value="${esc(s.aiPace || 5)}"></label>
      <label>الحد الأقصى للطلبات يومياً<input name="aiDailyMax" type="number" min="10" max="10000" value="${esc(s.aiDailyMax || 250)}"></label></div>
      ${(st.autoModels || []).length ? `<p class="sm muted" dir="ltr">${esc(st.autoModels.join(' · '))}</p>` : ''}<div class="row end"><button class="btn">حفظ إعدادات الذكاء الاصطناعي</button></div></form>` : ''}
      <div class="card guide sm"><b>الخصوصية:</b> تُرسَل إلى Gemini إجابات الطالب ورسوماته وصفّه الدراسي فقط، بلا اسم ولا رقم ولا فصل. وحسب شروط Google، الطبقة المجانية قد تستخدم المحتوى لتحسين منتجاتها؛ تأكد من توافق ذلك مع سياسة المدرسة. <br><b>الحدود المجانية:</b> تتغير من Google من وقت لآخر؛ النظام يتوقف تلقائياً عند بلوغ الحد ويكمل لاحقاً. كل طالب يحتاج طلباً واحداً للصورة اللفظية و3 طلبات للشكلية.</div>`;
    box.onclick = async e => {
      const b = e.target.closest('[data-ai]'); if (!b) return; const k = b.dataset.ai; busy(b, true);
      try {
        if (k === 'run') { busy(b, false); await ACT.ttRunAI(b); return; }
        if (k === 'requeue') { const r = await api('aiRequeue'); toast(`أُعيدت ${r.requeued} مهمة للطابور`); }
        if (k === 'recalc') { const r = await api('ttRecalc'); toast(`تم تحديث ${r.responses} إجابة و${r.results} نتيجة`); }
        if (k === 'trOn' || k === 'trOff') { await api('aiTrigger', { on: k === 'trOn' }); toast(k === 'trOn' ? 'تم تفعيل التصحيح التلقائي' : 'تم الإيقاف'); }
        if (k === 'saveKey') { const v = $('#aiKey').value.trim(); if (!v) { toast('الصق المفتاح أولاً', 'err'); busy(b, false); return; } await api('aiSaveKey', { key: v }); toast('تم حفظ المفتاح'); S.meta = await api('getMeta'); }
        if (k === 'delKey') { if (!(await confirmBox('حذف مفتاح Gemini؟ سيتوقف التصحيح بالذكاء الاصطناعي.', 'حذف', true))) { busy(b, false); return; } await api('aiSaveKey', { key: '' }); S.meta = await api('getMeta'); }
        if (k === 'test') {
          if (DEMO) { const key = window.LocalDB.secretGet('GEMINI_KEY'); const r = await fetch(GAPI + 'models?pageSize=200', { headers: { 'x-goog-api-key': key } }); if (r.status !== 200) throw new Error('المفتاح لا يعمل (HTTP ' + r.status + ')'); const list = E.pickModels((await r.json()).models || []); toast('الاتصال يعمل ✓ — ' + (list[0] || '')); window.LocalDB.secretSet('aiModels', JSON.stringify({ ts: Date.now(), list })); }
          else { const r = await api('aiTest', {}, { retries: 1 }); toast('الاتصال يعمل ✓ — النموذج: ' + r.model); }
        }
        loadAI();
      } catch (er) { toast(er.message, 'err'); busy(b, false); }
    };
    const f = $('#fAI'); if (f) f.onsubmit = async e => { e.preventDefault(); const bb = $('button', f); busy(bb, true); try { const r = await api('saveSettings', { settings: { aiEnabled: f.aiEnabled.checked ? '1' : '0', aiModel: f.aiModel.value.trim(), aiPace: f.aiPace.value, aiDailyMax: f.aiDailyMax.value } }); S.meta.settings = r.settings; toast('تم الحفظ'); S.meta = await api('getMeta'); } catch (er) { toast(er.message, 'err'); } finally { busy(bb, false); } };
  }
  function bindSettings() {
    const f = $('#fTT'); if (f) f.onsubmit = async e => { e.preventDefault(); const b = $('button', f); busy(b, true); try { const r = await api('saveSettings', { settings: { ttGiftedPct: f.ttGiftedPct.value, ttMinOrig: f.ttMinOrig.value } }); S.meta.settings = r.settings; toast('تم الحفظ'); } catch (er) { toast(er.message, 'err'); } finally { busy(b, false); } };
    loadAI();
  }

  /* ---------------- الرئيسية ---------------- */
  async function homeHtml() {
    let r; try { r = await api('ttList', { noRecalc: true }); } catch (e) { return ''; }
    S.tt = r; const list = (r.results || []).map(x => Object.assign({}, x)); TA.enrich(list, S.meta.settings, 'grade');
    const c = st => list.filter(x => x.status === st).length;
    return `<div class="card"><div class="row between"><h3>اختبار التفكير الإبداعي</h3><button class="btn ghost sm-btn" data-nav="ttResults">عرض النتائج</button></div>
      <div class="cards"><div class="stat green"><b>${c('valid')}</b><span>نتيجة مصحّحة</span></div><div class="stat blue"><b>${c('scoring')}</b><span>قيد التصحيح</span></div><div class="stat ${c('review') ? 'warnc' : ''}"><b>${c('review')}</b><span>تحتاج مراجعة</span></div>${isAll() ? `<div class="stat gold"><b>${list.filter(x => x._nominated).length}</b><span>مرشح في الإبداع</span></div>` : ''}</div>
      ${isAll() && !(S.meta.tt && S.meta.tt.ai) ? '<p class="sm warnt">التصحيح بالذكاء الاصطناعي غير مفعّل؛ النتائج تُصحَّح بالقواعد الآلية فقط. ' + (role() === 'admin' ? 'فعّله من <a href="javascript:void(0)" data-nav="settings">الإعدادات</a>.' : 'راجع مدير النظام.') + '</p>' : ''}</div>`;
  }

  /* ---------------- بيانات تجريبية ---------------- */
  const POOL = {
    ask: ['من هذا الطفل؟', 'لماذا يخرج الضوء؟', 'ما الذي في الداخل؟', 'لماذا هو خائف؟', 'أين يحدث هذا؟', 'متى حدث هذا؟', 'هل هو حلم؟', 'من وضع هذا هنا؟', 'كم عمره؟', 'ماذا سيحدث بعد قليل؟', 'هل يعرف أهله بما يحدث؟', 'ما اسم الحيوان؟', 'هل هذا سحر؟', 'ما الصوت الذي يسمعه؟', 'هل جاء أحد من عالم آخر؟', 'كيف وصل إلى هنا؟', 'ماذا كان يفعل قبل هذا؟', 'هل الضوء دافئ؟', 'لماذا لا يهرب؟', 'من أرسل هذه الرسالة الغامضة؟'],
    causes: ['كان يلعب', 'فتحه بالخطأ', 'سقط من مكان عالٍ', 'بسبب الرياح', 'أراد أن يكتشف', 'تحداه صديقه', 'تجربة علمية', 'سحر قديم', 'ضاع منه شيء', 'كان يبحث عن قطته', 'أبوه طلب منه', 'رأى حلماً', 'جاءته رسالة', 'انقطعت الكهرباء', 'حيوان دفعه', 'مخلوق فضائي', 'يريد أن يصبح مشهوراً', 'كان يشعر بالملل', 'عاصفة قوية', 'آلة الزمن'],
    consequences: ['سيخاف', 'سيفرح', 'سيسقط', 'سيصبح مشهوراً', 'سيعاقبه أبوه', 'سيكتشف شيئاً جديداً', 'سيتعلم درساً', 'ستتغير حياته', 'سيأتي الناس لمشاهدته', 'سيصاب بجرح', 'سيظهر في التلفاز', 'سيخبر أصدقاءه', 'سيذهب إلى عالم آخر', 'ستغضب أمه', 'سيصبح غنياً', 'تهرب القطة', 'يتغير الطقس', 'يحصل على جائزة', 'ينسى كل شيء', 'يفتح متحفاً'],
    improve: ['تتحرك وحدها', 'تتكلم', 'تغني', 'لها أضواء', 'يتغير لونها', 'تكون أكبر', 'ريموت كنترول', 'لها ملابس', 'تضحك عند لمسها', 'تمشي', 'فيها جيب للحلوى', 'تحكي قصصاً', 'تعلم الحروف', 'تطير', 'تصبح وسادة', 'ترد على الأسئلة', 'لها رائحة جميلة', 'تتحول إلى حقيبة', 'تلعب كرة القدم', 'تسبح في الماء'],
    uses: ['أصيص للزرع', 'وعاء لحفظ الأقلام', 'لعبة', 'زينة', 'بناء بيت صغير', 'قارب', 'آلة موسيقية', 'إعادة تدوير', 'مقعد', 'بيت للعصافير', 'مجسم صاروخ', 'تجربة علمية', 'مصباح', 'حصالة', 'ملابس للتمثيل', 'أداة رياضية', 'وسيلة تعليمية', 'طوق نجاة', 'نافورة', 'مرآة شمسية'],
    questions: ['من صنعه أول مرة؟', 'لماذا شكله هكذا؟', 'كم يزن؟', 'هل يمكن أكله؟', 'ماذا لو تكلم؟', 'كم عدده في العالم؟', 'هل يحلم؟', 'كم سعره؟', 'هل يضر البيئة؟', 'إلى أين يذهب بعد رميه؟', 'هل له مشاعر؟', 'ما تاريخه؟', 'هل يذوب؟', 'لماذا يحبه الناس؟', 'من اخترع لونه؟'],
    suppose: ['سيعيش الناس في البحر', 'لن يحتاج أحد إلى بيت', 'تتغير المدارس', 'يصبح السفر أسهل', 'تنتشر أمراض جديدة', 'تتغير الملابس', 'تظهر مهن جديدة', 'يخاف الناس', 'تتغير الرياضة', 'يكتشف العلماء أشياء جديدة', 'تتغير القوانين', 'يفرح الأطفال', 'تتعطل التقنيات', 'يصبح الطعام مختلفاً', 'تتغير الحيوانات', 'يحدث فوضى', 'تُكتب كتب جديدة', 'يتغير الاقتصاد'],
    fig: ['شمس', 'وجه مبتسم', 'سمكة', 'بيت', 'شجرة', 'سيارة', 'قطة', 'كرة', 'صاروخ', 'وردة', 'ساعة', 'نظارة', 'طائرة', 'فراشة', 'تنين', 'روبوت', 'قلعة', 'بطيخة', 'مظلة', 'كوكب زحل', 'عين ترى المستقبل', 'بيت النمل السري', 'وحش البحر الحزين']
  };
  const RARE = { w1: ['مصباح', 'نهر', 'قلعة', 'مطر', 'ظل', 'مرآة', 'صدى', 'بوصلة', 'جسر', 'غيمة', 'نحلة', 'ساعة رملية', 'خريطة', 'منطاد', 'سلحفاة', 'نجمة'], w2: ['يتكلم بالألوان', 'يحفظ الذكريات', 'يقيس السعادة', 'يطير بالموسيقى', 'يترجم أحلام القطط', 'يزرع الضوء', 'يعالج الحزن', 'يسافر في الزمن', 'يجمع الأصوات الضائعة', 'يرسم الرياح'] };
  let uq = 0; const uniq = () => { uq++; return RARE.w1[uq % RARE.w1.length] + ' ' + RARE.w2[Math.floor(uq / RARE.w1.length) % RARE.w2.length] + (uq > 160 ? ' ' + uq : ''); };
  async function seed(H, tok, students, rnd, progress) {
    const pickZ = (arr, theta) => { const u = Math.pow(rnd(), Math.max(0.35, 1.6 - 0.45 * theta)); return arr[Math.min(arr.length - 1, Math.floor(u * arr.length))]; };
    const ses = {};
    for (const st of ['primary', 'intermediate', 'secondary']) for (const bat of ['verbal', 'figural']) ses[st + bat] = H('createSession', { token: tok, session: { title: 'التفكير الإبداعي – ' + BAT[bat] + ' – ' + STAGE_NAME[st], stage: st, test: 'torrance', battery: bat, drawMode: 'both', formMode: 'rotate', timeLimit: 1, classes: [] } }).session.code;
    let k = 0;
    for (const s of students) {
      k++; if (k % 20 === 0) { if (progress) progress(Math.round(k / students.length * 100)); await sleep(0); }
      const stage = I.stageOfGrade(s.grade), theta = (rnd() + rnd() + rnd() - 1.5) * 1.6;
      for (const bat of ['verbal', 'figural']) {
        if (rnd() > (bat === 'verbal' ? (s.grade >= 4 ? 0.45 : 0) : 0.5)) continue;
        const L = H('studentLogin', { studentId: s.studentId, code: ses[stage + bat] });
        const F = I.getForm(bat, L.attempt.form);
        F.acts.forEach((a, i) => {
          let payload;
          if (bat === 'verbal') { const n = Math.max(0, Math.round(3 + theta * 2 + rnd() * 3 - (a.time === 5 ? 1 : 0))); const set = new Set(); for (let j = 0; j < n * 1.3 && set.size < n; j++) set.add(rnd() < 0.08 + Math.max(0, theta) * 0.12 ? uniq(a.type) : pickZ(POOL[a.type], theta)); payload = { list: Array.from(set), sec: a.time * 60 }; }
          else {
            const n = a.id === 'construct' ? 1 : a.id === 'complete' ? Math.min(10, Math.max(2, Math.round(6 + theta * 2 + rnd() * 2))) : Math.min(24, Math.max(1, Math.round(7 + theta * 4 + rnd() * 4)));
            const cells = Array(a.id === 'repeat' ? 24 : 10).fill(0), cs = Array(cells.length).fill(0), titles = [];
            for (let j = 0; j < n; j++) { cells[j] = 1; cs[j] = Math.max(1, Math.round(3 + theta * 2 + rnd() * 6)); titles[j] = rnd() < 0.8 ? (rnd() < 0.06 + Math.max(0, theta) * 0.1 ? uniq() : pickZ(POOL.fig, theta)) : ''; }
            const meta = { ink: 1, strokes: cs.reduce((x, y) => x + y, 0) || Math.round(5 + theta * 3), colorCount: Math.round(1 + rnd() * 3 + theta), span: rnd() < 0.15 + theta * 0.1 ? 1 : 0, cells, cellStrokes: cs };
            if (a.id === 'complete') meta.gap = cells.map((c, j) => c && rnd() < 0.6 - theta * 0.15 ? 1 : 0);
            payload = a.id === 'construct' ? { title: pickZ(POOL.fig, theta) + (rnd() < 0.3 + theta * 0.2 ? ' الذي يحلم بالطيران' : ''), meta: { ink: 1, strokes: Math.max(3, Math.round(8 + theta * 5 + rnd() * 6)), colorCount: Math.round(1 + rnd() * 4) }, sec: 600 } : { titles: titles.map(x => x || ''), meta, sec: 600 };
          }
          if (i < F.acts.length - 1) H('ttSave', { stoken: L.stoken, actIdx: i + 1, act: a.id, payload });
          else H('ttSubmit', { stoken: L.stoken, act: a.id, payload });
        });
      }
    }
    for (const c in ses) H('setSessionStatus', { token: tok, code: ses[c], status: 'closed' });
    for (const st of ['primary', 'intermediate']) H('createSession', { token: tok, session: { title: 'تجربة التفكير الإبداعي (شكلي) – ' + STAGE_NAME[st], stage: st, test: 'torrance', battery: 'figural', drawMode: 'both', formMode: 'rotate', timeLimit: 0, classes: [], allowRetake: true } });
    H('createSession', { token: tok, session: { title: 'تجربة التفكير الإبداعي (لفظي) – المتوسطة', stage: 'intermediate', test: 'torrance', battery: 'verbal', formMode: 'rotate', timeLimit: 0, classes: [], allowRetake: true } });
    H('ttRecalc', { token: tok });
  }

  return { active: () => !!ST, render: renderStu, start, restore, homeHtml, settingsHtml, bindSettings, monitorBar, seed };
};
