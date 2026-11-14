/* =====================================================================
   tt-analysis.js — تحليل نتائج اختبار التفكير الإبداعي
   معادلة النماذج الأربعة، المعايير المحلية، المؤشر الإبداعي، الترشيح، الثبات
   ===================================================================== */
(function (G) {
  'use strict';
  var A = G.RVAnalysis, T = G.TTItems;
  var mean = A.mean, sd = A.sd, round = A.round;
  var INDEX_DIMS = { verbal: ['fluency', 'flexibility', 'originality'], figural: ['fluency', 'originality', 'elaboration', 'abstractness', 'closure'] };
  var ALL_DIMS = { verbal: ['fluency', 'flexibility', 'originality'], figural: ['fluency', 'originality', 'elaboration', 'abstractness', 'closure', 'flexibility'] };
  var MIN_FORM_N = 15;

  function J(s) { try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; } }
  function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }

  // معادلة خطية للنماذج داخل كل (صورة × مرحلة): تجعل متوسط وانحراف كل نموذج مساويين للمجموع
  function equate(rows, battery) {
    var byStage = {};
    rows.forEach(function (r) { (byStage[r.stage] = byStage[r.stage] || []).push(r); });
    Object.keys(byStage).forEach(function (st) {
      var list = byStage[st], forms = {};
      list.forEach(function (r) { (forms[r.form] = forms[r.form] || []).push(r); });
      var okForms = Object.keys(forms).filter(function (f) { return forms[f].length >= MIN_FORM_N; });
      ALL_DIMS[battery].forEach(function (d) {
        var all = list.map(function (r) { return n(r[d]); }), mA = mean(all), sA = sd(all);
        list.forEach(function (r) { r._eq = r._eq || {}; r._eq[d] = n(r[d]); });
        if (okForms.length < 2 || list.length < 40) return;
        okForms.forEach(function (f) {
          var v = forms[f].map(function (r) { return n(r[d]); }), mF = mean(v), sF = sd(v);
          forms[f].forEach(function (r) { r._eq[d] = sF > 0 ? mA + sA * (n(r[d]) - mF) / sF : n(r[d]) - mF + mA; r._equated = true; });
        });
      });
    });
  }

  function enrich(results, settings, refType) {
    settings = settings || {};
    var minN = Number(settings.minNorm || 30), gp = Number(settings.ttGiftedPct || 90);
    var ref = A.REF[refType] || A.REF.grade;
    ['verbal', 'figural'].forEach(function (bat) {
      var valid = results.filter(function (r) { return r.battery === bat && r.status === 'valid' && r.fluency !== ''; });
      if (!valid.length) return;
      equate(valid, bat);
      var groups = {}, stageG = {};
      valid.forEach(function (r) { var k = ref.key(r); (groups[k] = groups[k] || []).push(r); (stageG[r.stage] = stageG[r.stage] || []).push(r); });
      valid.forEach(function (r) {
        var g = groups[ref.key(r)], name = ref.name(r), fb = false;
        if (g.length < minN && ref !== A.REF.stage) { g = stageG[r.stage]; name = 'المرحلة كاملة'; fb = true; }
        r._refN = g.length; r._refName = name; r._refFallback = fb; r._refSmall = g.length < minN;
        r._ss = {}; r._pctD = {};
        ALL_DIMS[bat].forEach(function (d) {
          var arr = g.map(function (x) { return x._eq[d]; }), m = mean(arr), s = sd(arr), v = r._eq[d];
          r._ss[d] = Math.round(100 + 15 * (s ? (v - m) / s : 0)); r._pctD[d] = A.pctRank(v, arr);
        });
        var st = INDEX_DIMS[bat].map(function (d) { return r._ss[d]; });
        r._bonus = bat === 'figural' ? n(r.bonus) : 0;
        r._index = Math.round(mean(st) + r._bonus);
      });
      valid.forEach(function (r) {
        var g = (r._refFallback ? stageG[r.stage] : groups[ref.key(r)]).map(function (x) { return x._index; });
        r._pct = A.pctRank(r._index, g); r._level = A.level(r._pct);
        var flags = [];
        if (bat === 'verbal' && n(r.fluency) < 5) flags.push('عدد الاستجابات قليل جداً');
        if (bat === 'figural' && n(r.fluency) < 3) flags.push('عدد الرسوم قليل جداً');
        if (r.provisional === '1') flags.push('الأصالة مبدئية (العينة لم تكتمل بعد)');
        if (r.scoredBy === 'rule') flags.push('تصحيح آلي بالقواعد دون ذكاء اصطناعي');
        r._flags = flags;
        var solid = !(bat === 'verbal' ? n(r.fluency) < 5 : n(r.fluency) < 3);
        r._nominated = r._pct >= gp && solid;
        r._borderline = !r._nominated && r._pct >= gp - 5 && solid;
        r._reviewHigh = r._pct >= gp && !solid;
      });
    });
    return results;
  }
  function alpha(matrix) {
    var k = matrix[0] ? matrix[0].length : 0; if (k < 2 || matrix.length < 10) return null;
    var vars = 0; for (var j = 0; j < k; j++) { var c = matrix.map(function (r) { return r[j]; }); vars += Math.pow(sd(c), 2); }
    var tot = matrix.map(function (r) { return r.reduce(function (a, b) { return a + b; }, 0); }), vt = Math.pow(sd(tot), 2);
    return vt > 0 ? round(k / (k - 1) * (1 - vars / vt), 2) : null;
  }
  function reliability(rows, battery) {
    if (battery === 'verbal') {
      var acts = T.getForm('verbal', 1).acts.map(function (a) { return a.id; });
      var m = rows.map(function (r) { var a = J(r.acts); return acts.map(function (id) { return n((a[id] || {}).fluency); }); });
      var mo = rows.map(function (r) { var a = J(r.acts); return acts.map(function (id) { return n((a[id] || {}).originality); }); });
      return { fluency: alpha(m), originality: alpha(mo), label: 'ألفا كرونباخ عبر الأنشطة السبعة' };
    }
    var z = rows.map(function (r) { return INDEX_DIMS.figural.map(function (d) { return r._ss ? r._ss[d] : 0; }); });
    return { index: alpha(z), label: 'ألفا كرونباخ لأبعاد المؤشر الإبداعي' };
  }
  function correlation(a, b) { if (a.length < 5) return null; var ma = mean(a), mb = mean(b), sa = sd(a), sb = sd(b); if (!sa || !sb) return null; var s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb); return round(s / (a.length - 1) / sa / sb, 2); }

  G.TTAnalysis = { enrich: enrich, INDEX_DIMS: INDEX_DIMS, ALL_DIMS: ALL_DIMS, reliability: reliability, correlation: correlation, equate: equate };
})(window);
