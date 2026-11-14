/* =====================================================================
   link.js — الربط مع منصة الموهبة
   يجمع نتيجتي المقياسين لكل طالب، ويحدد تصنيفه، ويقترح البرامج المناسبة له
   من برامج النموذج التام لتطوير الموهبة، والمسابقات المناسبة.
   يعمل على الخادم (Apps Script) وفي المتصفح (الوضع التجريبي).
   ===================================================================== */
(function (G) {
  'use strict';
  var STAGE_NAME = { primary: 'الابتدائية', intermediate: 'المتوسطة', secondary: 'الثانوية' };
  var CAT = {
    both: 'قدرة عقلية + تفكير إبداعي',
    ability: 'قدرة عقلية عالية',
    creative: 'تفكير إبداعي عالٍ',
    borderline: 'حالة حدّية'
  };
  /* معرّفات البرامج كما في منصة الموهبة (js/sijil/programs.js) */
  var PROG_NAME = {
    'general-enrichment': 'برنامج الإثراء العام', skills: 'برنامج تنمية المهارات', clusters: 'برنامج الأنشطة الموجهة',
    specialty: 'برنامج الإثراء المتخصص', projects: 'برنامج المشاريع الهادفة', acceleration: 'برنامج التسريع الأكاديمي',
    mentorship: 'برنامج الرعاية الخاصة', support: 'البرامج المساندة'
  };
  var COMP_NAME = { kangaroo: 'الكانجارو (رياضيات)', bebras: 'بيبراس (معلوماتية)', nsmo: 'الأولمبياد الوطني للعلوم والرياضيات', ibdaa: 'إبداع (البحث العلمي والابتكار)', isef: 'آيسف (معرض البحث العلمي الدولي)' };

  function num(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function J(s) { if (s && typeof s === 'object') return s; try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; } }

  function rvSummary(r) {
    if (!r) return null;
    return {
      date: num(r.submittedAt), form: r.form, score: num(r.score), max: num(r.maxScore), pct: r._pct, ss: r._ss,
      level: r._level ? r._level.code + ' – ' + r._level.label : '', nominated: !!r._nominated, borderline: !!r._borderline,
      review: !!r._reviewHigh, ref: r._refName || '', provisional: !!r._refSmall, flags: r._flags || []
    };
  }
  function ttSummary(r, strNames) {
    if (!r) return null;
    var dims = {}; Object.keys(r._pctD || {}).forEach(function (d) { dims[d] = r._pctD[d]; });
    return {
      date: num(r.submittedAt), form: r.form, index: r._index, pct: r._pct, level: r._level ? r._level.code + ' – ' + r._level.label : '',
      nominated: !!r._nominated, borderline: !!r._borderline, review: !!r._reviewHigh, ref: r._refName || '', provisional: !!r._refSmall || r.provisional === '1',
      dims: dims, strengths: (r._str || []).map(function (k) { return strNames[k] || k; }), flags: r._flags || []
    };
  }

  /* اقتراح البرامج والمسابقات حسب التصنيف. pre = محدد مسبقاً للاعتماد، وغير المحدد يحتاج محكاً إضافياً */
  function recommend(p) {
    var progs = [], comps = [], notes = [];
    var P = function (id, why, pre) { progs.push({ prog: id, name: PROG_NAME[id], why: why, pre: pre !== false }); };
    var C = function (id, why) { comps.push({ id: id, name: COMP_NAME[id], why: why }); };
    var rvPct = p.rv ? num(p.rv.pct) : 0, g = num(p.grade);
    var fig = p.figural && p.figural.nominated, verb = p.verbal && p.verbal.nominated;
    if (p.cat === 'both') {
      P('projects', 'يجمع القدرة العقلية والتفكير الإبداعي: مرشح لمسار البحث والابتكار (فكرة ← مشروع ← مسابقة)');
      P('mentorship', 'رعاية خاصة مع راعٍ في مجال موهبته لتنمية قدراته المرتفعة في المقياسين');
      P('clusters', 'أنشطة موجهة حسب اهتماماته لاستثمار قدرته وإبداعه معاً');
    } else if (p.cat === 'ability') {
      P('skills', 'قدرة عقلية عالية: تنمية مهارات التفكير العليا والاستدلال وحل المشكلات');
      P('clusters', 'أنشطة موجهة في مجال اهتمامه لتوظيف قدرته العقلية');
    } else if (p.cat === 'creative') {
      P('projects', 'تفكير إبداعي عالٍ: مشروع هادف يحوّل أفكاره الأصيلة إلى منتج');
      P('clusters', 'أنشطة موجهة تناسب ميوله الإبداعية' + (fig && !verb ? ' (الفنون والتصميم والنمذجة)' : verb && !fig ? ' (الكتابة والإلقاء والتأليف)' : ''));
    } else {
      P('general-enrichment', 'حالة حدّية: إثراء عام لاكتشاف اهتماماته ومتابعته');
      P('skills', 'حالة حدّية: تنمية مهارات التفكير، ثم إعادة قياسه العام القادم');
      notes.push('يُعاد قياسه العام الدراسي القادم، ويُراقَب أداؤه في البرامج قبل ترشيحه لبرامج الموهوبين.');
    }
    if (p.cat === 'both' || p.cat === 'ability') {
      P('specialty', 'يُضاف إذا حقق 80% فأكثر في الاختبار الإثرائي للمادة (معيار الكتاب)', false);
      if (rvPct >= 98) P('acceleration', 'المئيني في المصفوفات ' + rvPct + ': يُدرس التسريع بعد التحقق من التحصيل والنضج الاجتماعي', false);
    }
    if (p.cat === 'both' || p.cat === 'ability') {
      if (g >= 3) C('kangaroo', 'قدرة استدلالية عالية تناسب مسائل الرياضيات غير الروتينية');
      if (g >= 3) C('bebras', 'الاستدلال على الأنماط يناسب التفكير الحاسوبي');
      if (g >= 7) C('nsmo', 'قدرة عقلية عالية في المرحلة ' + (g >= 10 ? 'الثانوية' : 'المتوسطة'));
    }
    if (p.cat === 'both' || p.cat === 'creative') {
      C('ibdaa', 'تفكير إبداعي عالٍ يناسب مسار البحث والابتكار');
      if (p.cat === 'both' && g >= 9) C('isef', 'يجمع القدرة والإبداع: مرشح لمسار آيسف عبر إبداع');
    }
    if (p.cat !== 'borderline') notes.push('يوصى بتسجيله في مقياس موهبة للقدرات العقلية المتعددة عند فتح التسجيل لصفه، للتأكد من النتيجة بمقياس وطني مقنن.');
    if ((p.rv && p.rv.provisional) || (p.verbal && p.verbal.provisional) || (p.figural && p.figural.provisional)) notes.push('بعض النتائج مبدئية لأن عدد الطلاب في مجموعة المقارنة لم يكتمل بعد؛ قد تتغير قليلاً بعد اكتمال الاختبار في المدرسة.');
    return { programs: progs, competitions: comps, notes: notes };
  }

  /* rv: نتائج المصفوفات (صفوف Results)، tt: نتائج التفكير الإبداعي (صفوف TResults، وفيها _str = مفاتيح نقاط القوة) */
  function build(rv, tt, settings, opts) {
    opts = opts || {};
    var A = G.RVAnalysis, TA = G.TTAnalysis, I = G.TTItems;
    var strNames = {}; ((I && I.STRENGTHS) || []).forEach(function (s) { strNames[s[0]] = s[1]; });
    rv = rv.filter(function (r) { return r.status === 'valid'; });
    tt = tt.filter(function (r) { return r.status === 'valid'; });
    A.enrich(rv, settings, 'grade'); TA.enrich(tt, settings, 'grade');
    var P = {};
    function add(r, k) {
      var id = r.studentId + '|' + r.stage;
      var p = P[id] = P[id] || { studentId: String(r.studentId), name: r.name, gender: r.gender, grade: r.grade, className: r.className, track: r.track, stage: r.stage, stageName: STAGE_NAME[r.stage] || r.stage };
      if (!p['_' + k] || num(r.submittedAt) > num(p['_' + k].submittedAt)) p['_' + k] = r;
    }
    rv.forEach(function (r) { if (r._pct != null) add(r, 'rv'); });
    tt.forEach(function (r) { if (r._pct != null) add(r, r.battery); });
    var out = [];
    Object.keys(P).forEach(function (id) {
      var p = P[id];
      var o = { studentId: p.studentId, name: p.name, gender: p.gender, grade: p.grade, className: p.className, track: p.track, stage: p.stage, stageName: p.stageName,
        rv: rvSummary(p._rv), verbal: ttSummary(p._verbal, strNames), figural: ttSummary(p._figural, strNames) };
      var ab = !!(o.rv && o.rv.nominated), cr = !!((o.verbal && o.verbal.nominated) || (o.figural && o.figural.nominated));
      var bl = [o.rv, o.verbal, o.figural].some(function (x) { return x && x.borderline; });
      o.cat = ab && cr ? 'both' : ab ? 'ability' : cr ? 'creative' : bl ? 'borderline' : '';
      if (!o.cat) return;
      if (opts.nominatedOnly && o.cat === 'borderline') return;
      o.catName = CAT[o.cat];
      var dates = [o.rv, o.verbal, o.figural].filter(Boolean).map(function (x) { return x.date; });
      o.lastDate = Math.max.apply(null, dates);
      var rec = recommend(o); o.programs = rec.programs; o.competitions = rec.competitions; o.notes = rec.notes;
      out.push(o);
    });
    var order = { both: 0, ability: 1, creative: 2, borderline: 3 };
    out.sort(function (a, b) { return order[a.cat] - order[b.cat] || String(a.name).localeCompare(String(b.name), 'ar'); });
    return out;
  }

  G.TTLink = { build: build, recommend: recommend, CAT: CAT, PROG_NAME: PROG_NAME, COMP_NAME: COMP_NAME, J: J };
})(typeof window !== 'undefined' ? window : this);
