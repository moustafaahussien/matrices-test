/* =====================================================================
   analysis.js — التحليل الآلي: المعايير المحلية، الاتساق، الترشيح، تحليل البنود
   ===================================================================== */
(function (G) {
  'use strict';
  const STAGE_PARTS = {
    primary: [['A', 'أ', 0, 12], ['AB', 'أب', 12, 24], ['B', 'ب', 24, 36]],
    intermediate: [['A', 'أ', 0, 12], ['B', 'ب', 12, 24], ['C', 'ج', 24, 36], ['D', 'د', 36, 48], ['E', 'هـ', 48, 60]],
    secondary: [['Q1', 'ربع 1', 12, 21], ['Q2', 'ربع 2', 21, 30], ['Q3', 'ربع 3', 30, 39], ['Q4', 'ربع 4', 39, 48]]
  };
  const SCORED_RANGE = { primary: [0, 36], intermediate: [0, 60], secondary: [12, 48] };
  const LEVELS = [
    [95, 'I', 'متفوق (ممتاز جداً)', 'lv1'], [90, 'II+', 'فوق المتوسط بدرجة عالية', 'lv2'], [75, 'II', 'فوق المتوسط', 'lv2'],
    [50, 'III+', 'متوسط (مرتفع)', 'lv3'], [25, 'III−', 'متوسط (منخفض)', 'lv3'], [10, 'IV', 'دون المتوسط', 'lv4'], [5, 'IV−', 'دون المتوسط بوضوح', 'lv4'], [-1, 'V', 'منخفض – يُحال لتقييم أدق', 'lv5']
  ];
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };
  const round = (x, d = 0) => { const k = Math.pow(10, d); return Math.round(x * k) / k; };

  function parts(r) {
    const c = r.correct || '';
    return STAGE_PARTS[r.stage].map(([id, label, a, b]) => { let s = 0; for (let i = a; i < b; i++) if (c[i] === '1') s++; return { id, label, score: s, max: b - a }; });
  }
  function pctRank(x, arr) { if (!arr.length) return null; let below = 0, eq = 0; arr.forEach(v => { if (v < x) below++; else if (v === x) eq++; }); return Math.max(1, Math.min(99, Math.round((below + 0.5 * eq) / arr.length * 100))); }
  function level(p) { for (const L of LEVELS) if (p >= L[0]) return { code: L[1], label: L[2], cls: L[3] }; }
  function ageYears(r) { const m = Number(r.ageMonths); return m ? Math.floor(m / 12) : null; }

  const REF = {
    grade: { label: 'الصف', key: r => r.stage + '|' + r.grade, name: r => 'الصف ' + r.grade },
    gradeGender: { label: 'الصف والجنس', key: r => r.stage + '|' + r.grade + '|' + r.gender, name: r => 'الصف ' + r.grade + ' ' + (r.gender || '') },
    age: { label: 'العمر بالسنوات', key: r => r.stage + '|age' + ageYears(r), name: r => ageYears(r) != null ? 'عمر ' + ageYears(r) + ' سنة' : 'العمر غير معروف' },
    stage: { label: 'المرحلة', key: r => r.stage, name: () => 'المرحلة كاملة' }
  };

  /* ------- إثراء النتائج: المئيني، الدرجة المعيارية، المستوى، الاتساق، الترشيح ------- */
  function enrich(results, settings, refType) {
    settings = settings || {};
    const minN = Number(settings.minNorm || 30), giftedPct = Number(settings.giftedPct || 90);
    const valid = results.filter(r => r.status === 'valid' && r.score !== '');
    valid.forEach(r => { r._score = Number(r.score); r._parts = parts(r); });
    const ref0 = REF[refType] || REF.grade;
    // النموذج 5 (رافن الأصلي) صعوبته مختلفة عن النماذج 1–4، فتُحسب معاييره منفصلة
    const F5 = r => String(r.form) === '5';
    const ref = { key: r => ref0.key(r) + (F5(r) ? '|F5' : ''), name: r => ref0.name(r) + (F5(r) ? ' — النموذج 5' : '') };
    const sKey = r => r.stage + (F5(r) ? '|F5' : '');
    const groups = {}, stageGroups = {};
    valid.forEach(r => { const k = ref.key(r); (groups[k] = groups[k] || []).push(r._score); (stageGroups[sKey(r)] = stageGroups[sKey(r)] || []).push(r); });
    valid.forEach(r => {
      let arr = groups[ref.key(r)], refName = ref.name(r), small = false, fallback = false;
      if ((arr.length < minN || (refType === 'age' && ageYears(r) == null)) && ref0 !== REF.stage) { arr = stageGroups[sKey(r)].map(x => x._score); refName = 'المرحلة كاملة' + (F5(r) ? ' — النموذج 5' : ''); fallback = true; }
      if (arr.length < minN) small = true;
      r._pct = pctRank(r._score, arr); r._refN = arr.length; r._refName = refName; r._refSmall = small; r._refFallback = fallback;
      const m = mean(arr), s = sd(arr); r._z = s ? (r._score - m) / s : 0; r._ss = Math.round(100 + 15 * r._z);
      r._level = level(r._pct);
    });
    // الاتساق: مقارنة أداء الأجزاء بالمتوقع لمن لهم الدرجة الكلية نفسها تقريباً
    Object.keys(stageGroups).forEach(gk => {
      const list = stageGroups[gk], stage = gk.split('|')[0];
      // صعوبة البنود (نموذج راش مبسط) لتقدير الأداء المتوقع في كل مجموعة عند درجة كلية معينة
      const sr = SCORED_RANGE[stage], n = list.length, lg = [];
      for (let i = sr[0]; i < sr[1]; i++) {
        const prior = -2.6 + 5.2 * (i - sr[0]) / (sr[1] - sr[0] - 1);
        const c = list.reduce((a, r) => a + ((r.correct || '')[i] === '1' ? 1 : 0), 0);
        const p = (c + 0.5) / (n + 1), emp = -Math.log(p / (1 - p));
        const w = Math.min(1, n / 40); lg.push(w * emp + (1 - w) * prior);
      }
      const mkExp = k => { const b = lg.map(x => x * k); return T => {
        let lo = -15, hi = 15;
        for (let q = 0; q < 50; q++) { const m = (lo + hi) / 2; const s = b.reduce((a, bi) => a + 1 / (1 + Math.exp(-(m - bi))), 0); if (s < T) lo = m; else hi = m; }
        const th = (lo + hi) / 2;
        return STAGE_PARTS[stage].map(([, , a, z]) => { let s = 0; for (let i = a; i < z; i++) s += 1 / (1 + Math.exp(-(th - b[i - sr[0]]))); return s; });
      }; };
      // معامل انحدار المنحنيات يُقدَّر من البيانات (التباين بين الصعوبات المرصودة والحقيقية)
      let expAt = mkExp(1);
      if (n >= 15) { let best = 1e18; [1, 1.3, 1.6, 2, 2.5, 3].forEach(k => { const f = mkExp(k); let e = 0; list.forEach(r => { const ex = f(r._score); r._parts.forEach((pp, i) => { e += (pp.score - ex[i]) ** 2; }); }); if (e < best) { best = e; expAt = f; } }); }
      list.forEach(r => {
        const nb = list.filter(x => x !== r && Math.abs(x._score - r._score) <= 1);
        let exp, method;
        if (nb.length >= 10) { exp = STAGE_PARTS[stage].map((p, i) => mean(nb.map(x => x._parts[i].score))); method = 'من طلاب المدرسة بالدرجة نفسها'; }
        else { exp = expAt(r._score); method = 'تقدير إحصائي من صعوبة البنود'; }
        const disc = r._parts.map((p, i) => round(p.score - exp[i], 1));
        const maxAbs = Math.max.apply(null, disc.map(Math.abs));
        const over2 = disc.filter(d => Math.abs(d) > 2).length;
        const discBad = maxAbs > 3 || over2 >= 2;
        // نمط Guttman داخل كل جزء: إجابة صحيحة لبند صعب مع خطأ في بند أسهل منه
        let gErr = 0, gMax = 0; const c = r.correct || '';
        STAGE_PARTS[stage].forEach(([, , a, b]) => { for (let i = a; i < b; i++) for (let j = i + 1; j < b; j++) { gMax++; if (c[i] === '0' && c[j] === '1') gErr++; } });
        const answered = (r.answers || '').replace(/0/g, '').length;
        const rapidRatio = answered ? Number(r.rapid || 0) / answered : 0;
        const flags = [];
        if (discBad) flags.push(maxAbs > 3 ? 'فرق أكبر من ±3 في إحدى المجموعات' : 'فرق أكبر من ±2 في مجموعتين أو أكثر');
        if (rapidRatio > 0.2) flags.push('إجابات سريعة جداً (' + r.rapid + ')');
        if (r.overtime === '1') flags.push('تجاوز الوقت المحدد');
        const chance = stage === 'primary' ? 6 : stage === 'intermediate' ? 8.5 : 4.5;
        if (r._score <= chance + 2) flags.push('الدرجة قريبة من مستوى التخمين');
        r._exp = exp.map(x => round(x, 1)); r._disc = disc; r._discMethod = method; r._guttman = gMax ? round(gErr / gMax, 2) : 0;
        r._consistent = !discBad && rapidRatio <= 0.2; r._flags = flags;
        r._nominated = r._pct >= giftedPct && r._consistent;
        r._borderline = !r._nominated && r._pct >= giftedPct - 5 && r._consistent;
        r._reviewHigh = r._pct >= giftedPct && !r._consistent;
      });
    });
    return results;
  }

  /* ------- إحصاءات المجموعات ------- */
  function groupStats(rows, keyFn) {
    const g = {}; rows.forEach(r => { const k = keyFn(r); (g[k] = g[k] || []).push(r._score); });
    return Object.keys(g).sort((a, b) => String(a).localeCompare(String(b), 'ar', { numeric: true })).map(k => { const a = g[k]; return { key: k, n: a.length, mean: round(mean(a), 1), sd: round(sd(a), 1), min: Math.min.apply(null, a), max: Math.max.apply(null, a), median: median(a) }; });
  }
  function median(a) { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; }
  function histogram(scores, max, bins) {
    bins = bins || Math.min(max + 1, 20); const w = (max + 1) / bins; const h = Array(bins).fill(0);
    scores.forEach(s => { h[Math.min(bins - 1, Math.floor(s / w))]++; });
    return h.map((c, i) => ({ from: Math.round(i * w), to: Math.round((i + 1) * w) - 1, count: c }));
  }

  /* ------- تحليل البنود ------- */
  function itemAnalysis(rows, stage, keyFn) {
    const [a, b] = [0, rows.length ? (rows[0].correct || '').length : 0];
    const n = rows.length; if (!n) return { items: [], kr20: null, n: 0 };
    const sr = SCORED_RANGE[stage];
    const totals = rows.map(r => { let s = 0; for (let i = sr[0]; i < sr[1]; i++) if (r.correct[i] === '1') s++; return s; });
    const order = rows.map((r, i) => i).sort((x, y) => totals[x] - totals[y]);
    const k27 = Math.max(1, Math.round(n * 0.27)); const low = order.slice(0, k27), high = order.slice(n - k27);
    const items = []; let sumPQ = 0;
    for (let i = a; i < b; i++) {
      const x = rows.map(r => r.correct[i] === '1' ? 1 : 0); const p = mean(x);
      const D = mean(high.map(j => x[j])) - mean(low.map(j => x[j]));
      // ارتباط ثنائي نقطي مصحَّح (بدون البند نفسه)
      const rest = totals.map((t, j) => t - (i >= sr[0] && i < sr[1] ? x[j] : 0));
      const mr = mean(rest), sdr = sd(rest); let rpb = null;
      if (sdr > 0 && p > 0 && p < 1) { const m1 = mean(rest.filter((v, j) => x[j] === 1)), m0 = mean(rest.filter((v, j) => x[j] === 0)); rpb = (m1 - m0) / sdr * Math.sqrt(p * (1 - p)); }
      if (i >= sr[0] && i < sr[1]) sumPQ += p * (1 - p);
      const dist = {}; rows.forEach(r => { const c = (r.answers || '')[i] || '0'; dist[c] = (dist[c] || 0) + 1; });
      const flags = [];
      if (p > 0.95) flags.push('سهل جداً'); if (p < 0.1) flags.push('صعب جداً');
      if (D < 0.2 && n >= 20) flags.push('تمييز ضعيف'); if (rpb != null && rpb < 0 && n >= 20) flags.push('ارتباط سالب');
      items.push({ i, label: keyFn(i), p: round(p, 2), D: round(D, 2), rpb: rpb == null ? null : round(rpb, 2), dist, flags });
    }
    const k = sr[1] - sr[0], v = sd(totals) ** 2;
    const kr20 = n >= 10 && v > 0 ? round(k / (k - 1) * (1 - sumPQ / v), 2) : null;
    const sem = kr20 != null ? round(sd(totals) * Math.sqrt(Math.max(0, 1 - kr20)), 2) : null;
    return { items, kr20, sem, n };
  }

  G.RVAnalysis = { enrich, groupStats, histogram, itemAnalysis, parts, STAGE_PARTS, LEVELS, REF, mean, sd, round, level, pctRank };
})(typeof window !== 'undefined' ? window : this);
