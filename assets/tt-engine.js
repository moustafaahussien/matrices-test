/* =====================================================================
   tt-engine.js — محرك تصحيح اختبار التفكير الإبداعي
   دوال خالصة تعمل في Google Apps Script وفي المتصفح:
   - تطبيع النص العربي واكتشاف التكرار والتصنيف بالكلمات المفتاحية (التصحيح بالقواعد)
   - بناء طلبات Gemini وتحليل ردوده (التصحيح بالذكاء الاصطناعي)
   - حساب الأصالة من تكرار الأفكار بين طلاب المدرسة
   - تجميع درجات الأبعاد ونقاط القوة الإبداعية
   ===================================================================== */
(function (G) {
  'use strict';
  var T = G.TTItems;

  /* ---------------- التطبيع العربي ---------------- */
  var STOP = ' من الى إلى في على عن مع ان أن إن او أو ثم و ف ب ل ك هل ما ماذا لماذا كيف متى اين أين هو هي هم هن انا أنا نحن انت أنت هذا هذه ذلك تلك التي الذي الذين كان كانت يكون تكون لا لم لن قد كل بعض اي أي عند حتى لكي كي لو اذا إذا يمكن ممكن مثل جدا جداً شيء اشياء أشياء يعني ايضا أيضا او the a an of to in on and or is are be for with it this that can could would will '.split(' ').reduce(function (o, w) { if (w) o[w] = 1; return o; }, {});
  function normalize(s) {
    s = String(s == null ? '' : s).toLowerCase();
    s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه');
    s = s.replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); });
    s = s.replace(/[^\u0621-\u064Aa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return s;
  }
  function stem(w) {
    if (/^[a-z]+$/.test(w)) return w.replace(/(ing|ed|es|s)$/, '');
    if (w.length > 4 && /^(وال|بال|كال|فال|لل)/.test(w)) w = w.slice(3);
    else if (w.length > 3 && /^ال/.test(w)) w = w.slice(2);
    else if (w.length > 4 && /^[وفبلك]ال/.test(w)) w = w.slice(3);
    else if (w.length > 3 && /^[وف]/.test(w)) w = w.slice(1);
    if (w.length > 4) w = w.replace(/(ات|ون|ين|ها|هم|هن|كم|نا|يه|يا|ان)$/, '');
    if (w.length > 3) w = w.replace(/[هي]$/, '');
    return w;
  }
  function tokens(s) {
    var out = [], seen = {};
    normalize(s).split(' ').forEach(function (w) { if (!w || STOP[w] || w.length < 2) return; var t = stem(w); if (t.length < 2 || seen[t]) return; seen[t] = 1; out.push(t); });
    return out;
  }
  function jaccard(a, b) { if (!a.length || !b.length) return 0; var A = {}, inter = 0; a.forEach(function (x) { A[x] = 1; }); b.forEach(function (x) { if (A[x]) inter++; }); return inter / (a.length + b.length - inter); }
  function sameIdea(a, b) { var ta = tokens(a), tb = tokens(b); if (!ta.length || !tb.length) return normalize(a) === normalize(b); var j = jaccard(ta, tb); return j >= 0.6 || (Math.min(ta.length, tb.length) <= 2 && j >= 0.5); }

  /* ---------------- كلمات مفتاحية للتصنيف بالقواعد (عند غياب الذكاء الاصطناعي) ---------------- */
  var KW = {
    ask: { who: 'من مين ماهو ماهي اسم', why: 'لماذا ليش سبب لم', feel: 'يشعر شعور خايف خائف سعيد حزين يفكر متفاجي فرح غاضب', past: 'قبل كان حدث سابق امس', future: 'سيحدث بعد سوف سـ مستقبل لاحقا سيفعل', place: 'اين مكان وين غرفه بيت مدينه', time: 'متى وقت ساعه ليل نهار يوم سنه', how: 'كيف طريقه', prop: 'لون حجم مصنوع ماده وزن شكل طول', rel: 'صديق اخ ابو ام علاقه يعرف صاحب', fant: 'سحر سحري خيال جني فضائي يطير', qty: 'كم عدد', sense: 'صوت رائحه يسمع يشم ملمس' },
    causes: { act: 'فتح ضغط لمس رمى صعد حمل وضع ركض', other: 'شخص احد ابوه امه صديقه جاره', acc: 'صدفه حادث بالخطا سقط وقع انكسر', nature: 'مطر ريح عاصفه شمس برق طقس زلزال', sci: 'كهرباء تجربه علمي اله جهاز بطاريه', magic: 'سحر ساحر جني تعويذه سحري', emo: 'يريد يحب خاف فضول رغب ملل', animal: 'قطه كلب طائر عصفور حيوان سمكه ضفدع', play: 'لعب يلعب مزاح تحدي مسابقه', job: 'عمل وظيفه مهمه يعمل مهندس عامل', family: 'عائله اسره اهل جده', need: 'يحتاج مشكله يبحث فقد ضاع', learn: 'يتعلم تجربه يكتشف يجرب درس' },
    consequences: { body: 'يسقط يتاذى جرح مستشفى يمرض يموت كسر', emo: 'يفرح يحزن يخاف يغضب سعيد يندم', others: 'اهله امه ابوه اصدقاء الناس جيران', things: 'ينكسر يحترق يتلف خراب يضيع', env: 'حيوانات بيئه طقس اشجار تلوث', disc: 'يكتشف اختراع علماء علم', fame: 'مشهور تلفاز اخبار جائزه مكافاه', fant: 'سحر يطير يختفي عالم اخر', money: 'مال فلوس يبيع يشتري غني ثمن', lesson: 'يتعلم درس لا يكرر', social: 'شرطه قانون عقاب سجن', chain: 'ثم بعدها ومن ثم' },
    improve: { move: 'يتحرك يمشي يطير يقفز يدور عجلات حركه يركض', sound: 'صوت يتكلم يغني موسيقى يضحك', light: 'ضوء يضيء انوار لمبه', shape: 'اكبر اصغر حجم شكل طول', color: 'لون الوان ملون يغير لونه', mat: 'ناعم قماش فرو صوف ماده', acc: 'ملابس قبعه نظاره حقيبه سرج اكسسوار', tech: 'الكتروني بطاريه شاشه ريموت روبوت تطبيق بلوتوث', smart: 'يتفاعل يرد ذكي يفهم يستجيب', edu: 'يعلم حروف ارقام تعليم يحكي قصص', safe: 'امان صحي نظيف يغسل', func: 'وساده حقيبه شنطه مصباح منبه', smell: 'رائحه عطر دافي بارد', group: 'مسابقه جماعي اصدقاء فريق', change: 'يتحول يفك يركب قطع' },
    uses: { store: 'وعاء حفظ تخزين علبه صندوق حاويه', art: 'زينه فن رسم تزيين لوحه مجسم', play: 'لعبه العاب كره رياضه', home: 'منزل ادوات مطبخ', build: 'بناء بيت كرسي طاوله سور جدار رف', plant: 'زراعه نبات اصيص شتله تربه', wear: 'ملابس قبعه حذاء اسوره', music: 'موسيقى طبل صوت اله', sci: 'تجربه علوم مختبر', move: 'قارب طوافه يطفو سياره مركب', animal: 'طيور قطط عش حيوان', energy: 'وقود حراره طاقه نار', edu: 'تعليم وسيله شرح', recycle: 'تدوير يصنع', food: 'طعام اكل شرب', health: 'اسعاف صحه علاج', signal: 'اشاره رساله تواصل', protect: 'حمايه وقايه درع' },
    questions: { origin: 'من صنع مصنوع كيف صنع', why: 'لماذا', use: 'استخدام يستخدم فائده', future: 'مستقبل سيصبح بعد', prop: 'لون حجم وزن ماده', people: 'الناس الانسان', env: 'بيئه تلوث', fant: 'لو يتكلم يشعر يحلم', qty: 'كم عدد', history: 'متى اول تاريخ', econ: 'سعر ثمن بيع', sci: 'علمي يذوب يتحلل' },
    suppose: { body: 'جسم رئه صحه مرض خياشيم', daily: 'حياه يوميه نوم بيت', others: 'اهل اسره اصدقاء', work: 'عمل مهنه مدرسه دراسه', env: 'بيئه حيوانات بحر اشجار', tech: 'اختراع تقنيه جهاز', emo: 'خوف فرح حزن', social: 'قانون مجتمع دول', money: 'مال تجاره اقتصاد', fant: 'سحر خيال', travel: 'سفر رحله مواصلات', food: 'طعام اكل', sport: 'رياضه لعب سباحه', problem: 'مشكله حل' },
    figure: { human: 'رجل ولد بنت انسان شخص طفل', face: 'وجه عين ابتسامه', animal: 'قطه كلب اسد فيل حصان جمل ارنب', bird: 'طائر عصفور سمكه فراشه نحله', plant: 'شجره زهره ورده نبات', food: 'طعام تفاحه كعكه ايسكريم', building: 'بيت منزل مسجد برج قلعه', vehicle: 'سياره طائره قارب قطار دراجه', tool: 'اداه مفتاح مقص ساعه', nature: 'جبل بحر شمس مطر', space: 'قمر نجم كوكب صاروخ', fantasy: 'وحش تنين جني', symbol: 'حرف رقم علامه', sport: 'كره ملعب', wear: 'قبعه نظاره حذاء', music: 'جيتار طبل', abstract: 'زخرفه نمط', object: 'كوب كرسي مصباح' }
  };
  function ruleCategory(type, text) {
    var map = KW[type]; if (!map) return '';
    var t = ' ' + normalize(text) + ' ', toks = tokens(text), best = '', bestN = 0;
    Object.keys(map).forEach(function (c) { var n = 0; map[c].split(' ').forEach(function (w) { if (!w) return; if (t.indexOf(' ' + w) >= 0 || toks.indexOf(stem(w)) >= 0) n++; }); if (n > bestN) { bestN = n; best = c; } });
    return best;
  }
  function ideaKey(text) { return tokens(text).slice(0, 5).sort().join(' '); }

  /* ---------------- التصحيح بالقواعد ---------------- */
  // data: { acts: { actId: { list: [نصوص] , titles: [...], ... } } }
  function ruleVerbal(form, data) {
    var F = T.getForm('verbal', form), out = [];
    F.acts.forEach(function (a) {
      var list = ((data.acts || {})[a.id] || {}).list || [], kept = [];
      list.forEach(function (txt, i) {
        txt = String(txt || '').trim(); if (!txt) return;
        var nt = normalize(txt), valid = nt.replace(/\s/g, '').length >= 3 && /[\u0621-\u064Aa-z]/.test(nt) ? 1 : 0;
        if (valid && normalize(txt) === normalize(a.instr('x'))) valid = 0;
        var dup = '';
        if (valid) for (var j = 0; j < kept.length; j++) if (sameIdea(kept[j].text, txt)) { dup = kept[j].item; break; }
        var row = { act: a.id, item: i + 1, text: txt.slice(0, 400), valid: valid, dupOf: dup, cat: valid ? ruleCategory(a.type, txt) || 'other' : '', key: ideaKey(txt), rarityAI: '', elab: '', abstr: '', closure: '', cells: '', title: '', src: 'rule', conf: '0.5' };
        out.push(row); if (valid && dup === '') kept.push(row);
      });
    });
    return out;
  }
  // figural بالقواعد: يعتمد على تحليل الخطوط من جهاز الطالب (meta) عند الرسم على الشاشة
  function ruleFigural(form, data) {
    var out = [], acts = data.acts || {};
    var c = acts.construct || {}, cm = c.meta || {};
    if (c.image || cm.ink) out.push({ act: 'construct', item: 0, text: '', title: String(c.title || ''), valid: cm.ink === 0 ? 0 : 1, dupOf: '', cat: '', key: ideaKey(c.title || ''), rarityAI: '', elab: String(elabFromStrokes(cm.strokes)), abstr: String(ruleAbstract(c.title)), closure: '', cells: '', src: 'rule', conf: '0.3' });
    var p = acts.complete || {}, pm = p.meta || {}, titles = p.titles || [];
    for (var i = 0; i < 10; i++) {
      var ink = pm.cells ? pm.cells[i] || 0 : (titles[i] ? 1 : 0); var drawn = ink > 0 ? 1 : 0;
      if (!drawn && !titles[i] && !p.image) continue;
      out.push({ act: 'complete', item: i + 1, text: '', title: String(titles[i] || ''), valid: drawn, dupOf: '', cat: ruleCategory('figure', titles[i] || ''), key: ideaKey(titles[i] || ''), rarityAI: '', elab: String(drawn ? elabFromStrokes(pm.cellStrokes ? pm.cellStrokes[i] : 0) : 0), abstr: String(ruleAbstract(titles[i])), closure: drawn && pm.gap ? String(pm.gap[i] ? 0 : 2) : '', cells: String(i + 1), src: 'rule', conf: '0.3' });
    }
    var r = acts.repeat || {}, rm = r.meta || {}, rt = r.titles || [];
    var n = (T.REPEAT[form] || {}).n || 24;
    for (var k = 0; k < n; k++) {
      var ink2 = rm.cells ? rm.cells[k] || 0 : (rt[k] ? 1 : 0);
      if (!ink2) continue;
      out.push({ act: 'repeat', item: k + 1, text: '', title: String(rt[k] || ''), valid: 1, dupOf: '', cat: ruleCategory('figure', rt[k] || ''), key: ideaKey(rt[k] || ''), rarityAI: '', elab: String(elabFromStrokes(rm.cellStrokes ? rm.cellStrokes[k] : 0)), abstr: '', closure: '', cells: String(k + 1), src: 'rule', conf: '0.3' });
    }
    return out;
  }
  function elabFromStrokes(n) { n = Number(n) || 0; return Math.max(0, Math.min(10, Math.round((n - 2) / 2))); }
  function ruleAbstract(t) { var w = tokens(t || ''); if (!w.length) return 0; if (w.length === 1) return 0; if (w.length <= 3) return 1; return 2; }

  /* ---------------- طلبات الذكاء الاصطناعي ---------------- */
  var CAT_LINE = function (cats) { return cats.map(function (c) { return c[0] + ' = ' + c[1]; }).join('\n'); };
  var COMMON = 'Reply with ONE JSON object only, no markdown. All Arabic text values must be short. The student wrote in Arabic (sometimes English); keep keys in the language of the response.';
  function verbalPrompt(form, stage, grade, rows) {
    var F = T.getForm('verbal', form), byAct = {};
    rows.forEach(function (r) { (byAct[r.act] = byAct[r.act] || []).push(r); });
    var s = 'You are an expert scorer of divergent-thinking (creativity) tests modelled on the Torrance Tests of Creative Thinking – Verbal. ' +
      'The responses below were written by ONE school student in grade ' + grade + ' (' + stage + ' stage) under time limits. Judge every response independently and fairly; spelling mistakes do not matter.\n\n' +
      'For EACH response return an object with:\n' +
      '- "id": the id given.\n- "v": 1 if it is a meaningful, relevant answer to that activity (unusual or fantastic answers ARE relevant); 0 if empty, nonsense, off-task, a copy of the instructions, or not understandable.\n' +
      '- "d": the id of an EARLIER response in the same activity that expresses essentially the same idea, otherwise null.\n' +
      '- "c": the id of the best-fitting category from that activity\'s list; if none fits, "x:" followed by a short Arabic label.\n' +
      '- "k": a canonical idea key of 2–5 simple Arabic words (base forms, no articles if possible) naming the core idea, so that the same idea written by different students gets the SAME key. Use the most ordinary wording.\n' +
      '- "r": rarity of the idea among students of this age: 0 = common/obvious, 1 = somewhat unusual, 2 = rare and clever.\n\n' + COMMON + '\nFormat: {"items":[{"id":"…","v":1,"d":null,"c":"…","k":"…","r":0}]}\n';
    F.acts.forEach(function (a) {
      var list = byAct[a.id]; if (!list || !list.length) return;
      s += '\n=== ACTIVITY "' + a.id + '" – ' + a.title + ' ===\nTask given to the student: ' + a.instr(stage) + '\nStimulus: ' + a.stim.desc + '\nCategories:\n' + CAT_LINE(a.cats) + '\nResponses:\n';
      list.forEach(function (r) { s += r.act + '-' + r.item + ': ' + String(r.text).replace(/\s+/g, ' ').slice(0, 300) + '\n'; });
    });
    return s;
  }
  var FIG_RUBRIC = 'Scoring definitions:\n' +
    '- elaboration "e": count of meaningful details added beyond what is needed to show the basic idea (decorations, patterns, shading, colour areas, background objects, extra parts, expressions). 0 = bare outline. Cap at 12.\n' +
    '- title abstractness "tA" (use the typed title if given, otherwise any handwritten title you can read): 0 = no title or an obvious one-word label ("قطة"); 1 = simple descriptive title ("قطة سوداء"); 2 = imaginative or story-like title that goes beyond the obvious ("القطة التي تحرس الكنز"); 3 = abstract, emotional or philosophical title capturing an essence ("وحدة الحارس الأخير").\n' +
    '- rarity "r" of the idea for students of this age: 0 common, 1 somewhat unusual, 2 rare and clever.\n' +
    '- category "c": id from this list, or "x:" + short Arabic label:\n' + CAT_LINE(T.CATS.figure) + '\n' +
    '- "k": canonical idea key, 2–5 simple Arabic words naming what is drawn, so identical ideas from different students get identical keys.\n' +
    '- "s": creative-strength indicators visible in the drawing(s), each true/false: emotion (feelings expressed), story (tells a story/context), movement (action or motion), titles (expressive titles), unusual (unusual viewpoint), internal (shows inside of things), boundaries (breaks out of the frame/boundary), humor, richness (rich vivid imagery), colorful (lively colours), fantasy.\n';
  function figuralPrompt(act, form, stage, grade, opts) {
    opts = opts || {};
    var src = opts.paper ? 'a PHOTO of a paper test page drawn with pencil or colours' : 'an image of a page drawn on a tablet/computer screen';
    var head = 'You are an expert scorer of the figural form of creativity tests modelled on the Torrance Tests of Creative Thinking. The image is ' + src + ' by ONE student in grade ' + grade + ' (' + stage + ' stage). Pre-printed stimulus lines are dark grey; everything else was added by the student.\n\n' + FIG_RUBRIC + '\n' + COMMON + '\n';
    if (act === 'construct') {
      return head + '\nACTIVITY: Picture construction. The page had ' + T.BASE[form].name + ' printed in the centre; the student had to make a picture in which this shape is an integral part, then give it a title.\nTyped title: ' + (opts.title ? '"' + opts.title + '"' : '(none)') + '\n' +
        'Return: {"used":1 or 0 (is the shape part of the picture),"d":"short Arabic description of the picture","k":"…","c":"…","r":0,"e":0,"tA":0,"t":"title you used","s":{"emotion":false,"story":false,"movement":false,"titles":false,"unusual":false,"internal":false,"boundaries":false,"humor":false,"richness":false,"colorful":false,"fantasy":false}}';
    }
    if (act === 'complete') {
      var figs = T.completionFigures(form);
      return head + '\nACTIVITY: Incomplete figures. The page has 10 numbered cells (2 columns × 5 rows; numbering runs right-to-left: 1 is top-right, 2 top-left, 3 below 1, … — always follow the printed numbers). Each cell contained an incomplete line figure:\n' +
        figs.map(function (f, i) { return (i + 1) + ') ' + f.desc; }).join('\n') + '\nTyped titles: ' + (opts.titles || []).map(function (t, i) { return (i + 1) + '="' + (t || '') + '"'; }).join(', ') + '\n' +
        'Resistance to premature closure "cl" for each figure: 0 = the open part was closed quickly with a direct straight or curved line; 1 = closed but only indirectly or after other elaboration; 2 = left open, or the gap was used creatively without simply closing it.\n' +
        'Also set "s.synth" true if the student combined two or more figures into one picture.\n' +
        'Return: {"figs":[{"n":1,"drawn":1 or 0 (student added meaningful lines),"d":"…","k":"…","c":"…","r":0,"e":0,"tA":0,"cl":0,"t":"title"} … for n=1..10],"s":{"emotion":false,"story":false,"movement":false,"titles":false,"unusual":false,"internal":false,"boundaries":false,"humor":false,"richness":false,"colorful":false,"fantasy":false,"synth":false}}';
    }
    var R = T.REPEAT[form];
    return head + '\nACTIVITY: Repeated figures. The page has 24 numbered ' + (R.kind === 'circles' ? 'circles' : 'pairs of vertical parallel lines') + ' in a 4×6 grid numbered right-to-left (1 = top-right; follow the printed numbers). The student turned as many as possible into different pictures; one picture may combine several shapes. Ignore shapes that were left untouched.\n' +
      'Typed titles by number: ' + (opts.titles || []).map(function (t, i) { return t ? (i + 1) + '="' + t + '"' : ''; }).filter(Boolean).join(', ') + '\n' +
      'Return one entry per distinct picture: {"pics":[{"cells":[numbers used],"d":"…","k":"…","c":"…","r":0,"e":0}],"s":{"emotion":false,"story":false,"movement":false,"titles":false,"unusual":false,"internal":false,"boundaries":false,"humor":false,"richness":false,"colorful":false,"fantasy":false,"synth":false}}  ("s.synth" = several shapes combined into one picture).';
  }
  function parseJson(text) {
    if (text && typeof text === 'object') return text;
    text = String(text || '').trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(text); } catch (e) { }
    var a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch (e2) { } }
    throw new Error('رد الذكاء الاصطناعي ليس JSON صالحاً');
  }
  function clampInt(v, lo, hi, def) { v = Math.round(Number(v)); if (!isFinite(v)) return def; return Math.max(lo, Math.min(hi, v)); }
  function catOf(c, cats) { c = String(c == null ? '' : c).trim(); if (!c) return 'other'; if (cats.some(function (x) { return x[0] === c; })) return c; if (/^x:/i.test(c)) return 'x:' + normalize(c.slice(2)).slice(0, 30); return 'x:' + normalize(c).slice(0, 30); }
  // يطبّق رد الذكاء الاصطناعي على صفوف الإجابات اللفظية
  function applyVerbal(rows, json, form) {
    var F = T.getForm('verbal', form), cats = {}; F.acts.forEach(function (a) { cats[a.id] = a.cats; });
    var obj = parseJson(json), items = obj.items || obj.responses || [], by = {};
    items.forEach(function (x) { if (x && x.id != null) by[String(x.id).trim()] = x; });
    var hit = 0;
    rows.forEach(function (r) {
      var x = by[r.act + '-' + r.item]; if (!x) return; hit++;
      r.valid = Number(x.v) === 0 ? 0 : 1;
      var d = x.d == null ? '' : String(x.d).replace(/^.*-/, '');
      r.dupOf = r.valid && d && Number(d) < Number(r.item) ? d : '';
      r.cat = r.valid ? catOf(x.c, cats[r.act]) : '';
      r.key = normalize(x.k || '') || r.key;
      r.rarityAI = String(clampInt(x.r, 0, 2, 1));
      r.src = 'ai'; r.conf = '0.85';
    });
    return { matched: hit, total: rows.length };
  }
  function strengthsFrom(s) { var o = {}; if (!s || typeof s !== 'object') return o; ['emotion', 'story', 'movement', 'titles', 'unusual', 'internal', 'boundaries', 'humor', 'richness', 'colorful', 'fantasy'].forEach(function (k) { if (s[k] === true || s[k] === 1 || s[k] === 'true') o[k] = 1; }); return o; }
  // يحوّل رد الذكاء الاصطناعي لنشاط شكلي إلى صفوف إجابات
  function applyFigural(act, json, opts) {
    opts = opts || {}; var obj = parseJson(json), rows = [], st = strengthsFrom(obj.s);
    var cats = T.CATS.figure;
    if (act === 'construct') {
      rows.push({ act: act, item: 0, text: String(obj.d || '').slice(0, 200), title: String(opts.title || obj.t || '').slice(0, 120), valid: Number(obj.used) === 0 && !obj.d ? 0 : 1, dupOf: '', cat: catOf(obj.c, cats), key: normalize(obj.k || obj.d || ''), rarityAI: String(clampInt(obj.r, 0, 2, 1)), elab: String(clampInt(obj.e, 0, 12, 0)), abstr: String(clampInt(obj.tA, 0, 3, 0)), closure: '', cells: '', src: 'ai', conf: '0.8', flags: Number(obj.used) === 0 ? 'الشكل الأساسي غير مستخدم' : '' });
    } else if (act === 'complete') {
      var figs = obj.figs || obj.figures || [];
      for (var n = 1; n <= 10; n++) {
        var f = figs.filter(function (x) { return Number(x.n) === n; })[0] || figs[n - 1] || {};
        var drawn = Number(f.drawn) === 1 || (f.drawn == null && !!f.d) ? 1 : 0;
        var title = String((opts.titles || [])[n - 1] || f.t || '').slice(0, 120);
        if (!drawn && !title) continue;
        var cl = opts.gap && opts.gap[n - 1] != null ? (opts.gap[n - 1] ? clampInt(f.cl, 0, 1, 0) : 2) : clampInt(f.cl, 0, 2, 0);
        rows.push({ act: act, item: n, text: String(f.d || '').slice(0, 200), title: title, valid: drawn, dupOf: '', cat: drawn ? catOf(f.c, cats) : '', key: normalize(f.k || f.d || ''), rarityAI: String(clampInt(f.r, 0, 2, 1)), elab: String(drawn ? clampInt(f.e, 0, 12, 0) : 0), abstr: String(clampInt(f.tA, 0, 3, 0)), closure: drawn ? String(cl) : '', cells: String(n), src: 'ai', conf: '0.8' });
      }
      if (obj.s && (obj.s.synth === true || obj.s.synth === 'true')) st.synthComplete = 1;
    } else {
      var pics = obj.pics || obj.pictures || [];
      pics.forEach(function (p, i) {
        var cells = (p.cells || []).map(Number).filter(function (x) { return x >= 1 && x <= 24; });
        var t = cells.map(function (c) { return (opts.titles || [])[c - 1] || ''; }).filter(Boolean).join(' / ');
        rows.push({ act: act, item: i + 1, text: String(p.d || '').slice(0, 200), title: t.slice(0, 120), valid: 1, dupOf: '', cat: catOf(p.c, cats), key: normalize(p.k || p.d || ''), rarityAI: String(clampInt(p.r, 0, 2, 1)), elab: String(clampInt(p.e, 0, 12, 0)), abstr: '', closure: '', cells: cells.join(','), src: 'ai', conf: '0.8' });
        if (cells.length > 1) st.synthRepeat = 1;
      });
      if (obj.s && (obj.s.synth === true || obj.s.synth === 'true')) st.synthRepeat = 1;
    }
    return { rows: rows, strengths: st };
  }

  /* ---------------- الأصالة من بيانات المدرسة ---------------- */
  // rows: كل صفوف الإجابات الصالحة في المدرسة (لنموذج معين)؛ تُعدّ الفكرة مرة واحدة لكل طالب
  function groupKey(r) { return r.form + '|' + r.battery + '|' + r.act + (r.act === 'complete' ? '|' + r.item : ''); }
  function computeOriginality(rows, opts) {
    opts = opts || {}; var minN = Number(opts.minN || 40);
    var groups = {};
    rows.forEach(function (r) { if (String(r.valid) !== '1' || r.dupOf) return; var g = groupKey(r); (groups[g] = groups[g] || []).push(r); });
    var info = {};
    Object.keys(groups).forEach(function (g) {
      var list = groups[g], students = {}, clusters = [];
      list.forEach(function (r) { students[r.studentId] = 1; });
      var N = Object.keys(students).length;
      // تجميع الأفكار: المفتاح نفسه أو تشابه كلمات كبير
      list.forEach(function (r) {
        var key = String(r.key || '') || ideaKey(r.text || r.title || ''), tk = tokens(key), c = null;
        for (var i = 0; i < clusters.length; i++) { if (clusters[i].key === key || (tk.length && jaccard(tk, clusters[i].tk) >= 0.6)) { c = clusters[i]; break; } }
        if (!c) { c = { key: key, tk: tk, st: {}, rows: [] }; clusters.push(c); }
        c.st[r.studentId] = 1; c.rows.push(r);
      });
      clusters.forEach(function (c) {
        var f = Object.keys(c.st).length / Math.max(1, N);
        var o = f >= 0.05 ? 0 : f >= 0.02 ? 1 : 2;
        c.rows.forEach(function (r) {
          var empty = !String(r.key || '').trim() && !String(r.text || r.title || '').trim();
          if (r.origLock === '1') return;
          if (N < minN) { r.orig = r.rarityAI !== '' && r.rarityAI != null ? String(r.rarityAI) : String(empty || N < 10 ? 1 : o); r.origProv = '1'; }
          else { r.orig = String(empty ? 1 : o); r.origProv = ''; }
          r.freq = String(Math.round(f * 1000) / 10);
        });
      });
      info[g] = { N: N, clusters: clusters.length };
    });
    rows.forEach(function (r) { if (String(r.valid) !== '1' || r.dupOf) { if (r.origLock !== '1') r.orig = '0'; } });
    return info;
  }

  /* ---------------- تجميع الدرجات ---------------- */
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function aggregate(battery, rows, strengths) {
    var dims = {}, acts = {}, ok = rows.filter(function (r) { return String(r.valid) === '1' && !r.dupOf; });
    var by = {}; ok.forEach(function (r) { (by[r.act] = by[r.act] || []).push(r); });
    var prov = rows.some(function (r) { return r.origProv === '1'; });
    if (battery === 'verbal') {
      var F = T.getForm('verbal', 1);
      dims.fluency = 0; dims.flexibility = 0; dims.originality = 0;
      F.acts.forEach(function (a) {
        var l = by[a.id] || [], cats = {}; l.forEach(function (r) { if (r.cat) cats[r.cat] = 1; });
        var fl = l.length, fx = Object.keys(cats).length, or = l.reduce(function (s, r) { return s + num(r.orig); }, 0);
        acts[a.id] = { fluency: fl, flexibility: fx, originality: or };
        dims.fluency += fl; dims.flexibility += fx; dims.originality += or;
      });
    } else {
      var c = by.construct || [], p = by.complete || [], q = by.repeat || [];
      var allRows = rows.filter(function (r) { return r.act === 'complete'; });
      var catsCP = {}, catsR = {}; p.forEach(function (r) { if (r.cat) catsCP[r.cat] = 1; }); q.forEach(function (r) { if (r.cat) catsR[r.cat] = 1; });
      acts.construct = { originality: c.reduce(function (s, r) { return s + num(r.orig); }, 0), elaboration: c.reduce(function (s, r) { return s + num(r.elab); }, 0), abstractness: c.reduce(function (s, r) { return s + num(r.abstr); }, 0) };
      acts.complete = { fluency: p.length, flexibility: Object.keys(catsCP).length, originality: p.reduce(function (s, r) { return s + num(r.orig); }, 0), elaboration: p.reduce(function (s, r) { return s + num(r.elab); }, 0), abstractness: p.reduce(function (s, r) { return s + num(r.abstr); }, 0), closure: allRows.reduce(function (s, r) { return s + (String(r.valid) === '1' ? num(r.closure) : 0); }, 0) };
      acts.repeat = { fluency: q.length, flexibility: Object.keys(catsR).length, originality: q.reduce(function (s, r) { return s + num(r.orig); }, 0), elaboration: q.reduce(function (s, r) { return s + num(r.elab); }, 0) };
      dims.fluency = acts.complete.fluency + acts.repeat.fluency;
      dims.originality = acts.construct.originality + acts.complete.originality + acts.repeat.originality;
      // التفاصيل: متوسط موزون حتى لا يطغى عدد الرسوم على الإسهاب
      var eN = c.length + p.length + q.length;
      dims.elaboration = eN ? Math.round((acts.construct.elaboration * 2 + acts.complete.elaboration + acts.repeat.elaboration) / (eN + c.length) * 10) / 10 : 0;
      dims.abstractness = acts.construct.abstractness + acts.complete.abstractness;
      dims.closure = acts.complete.closure;
      dims.flexibility = Object.keys(Object.assign({}, catsCP, catsR)).length; // بُعد إضافي لا يدخل في المؤشر
    }
    var st = strengths || {}; var bonus = 0; Object.keys(st).forEach(function (k) { bonus += Math.min(2, num(st[k])); });
    return { dims: dims, acts: acts, strengths: st, bonus: bonus, provisional: prov };
  }

  /* ---------------- الإغلاق الهندسي من خطوط الرسم ---------------- */
  // strokes: [{pts:[[x,y]...]}] بإحداثيات الصفحة؛ zones: من TTItems.gapZones
  function inkNear(strokes, pts, rad) {
    for (var s = 0; s < strokes.length; s++) { var P = strokes[s].pts || []; for (var i = 0; i < P.length; i++) for (var j = 0; j < pts.length; j++) { var dx = P[i][0] - pts[j][0], dy = P[i][1] - pts[j][1]; if (dx * dx + dy * dy <= rad * rad) return true; } }
    return false;
  }
  function strokeMeta(act, form, strokes) {
    strokes = (strokes || []).filter(function (s) { return !s.erase && s.pts && s.pts.length; });
    var m = { ink: strokes.length, strokes: strokes.length, colors: {} };
    strokes.forEach(function (s) { m.colors[s.c || '#000'] = 1; });
    m.colorCount = Object.keys(m.colors).length; delete m.colors;
    if (act === 'complete' || act === 'repeat') {
      var L = T.PAGE[act], n = L.cols * L.rows, cells = [], cs = [], span = 0;
      for (var i = 0; i < n; i++) { cells.push(0); cs.push(0); }
      strokes.forEach(function (s) {
        var hit = {};
        s.pts.forEach(function (p) { var c = Math.floor(p[0] / L.cw), r = Math.floor(p[1] / L.ch); if (c < 0 || r < 0 || c >= L.cols || r >= L.rows) return; hit[r * L.cols + (L.cols - 1 - c)] = 1; });
        var ks = Object.keys(hit); ks.forEach(function (k) { cells[k] += s.pts.length; cs[k]++; }); if (ks.length > 1) span++;
      });
      m.cells = cells.map(function (x) { return x >= 6 ? 1 : 0; }); m.cellStrokes = cs; m.span = span;
      if (act === 'complete') { var z = T.gapZones(form); m.gap = z.map(function (pts) { return inkNear(strokes, pts, 16) ? 1 : 0; }); m.cells = m.cells.slice(0, 10); m.cellStrokes = cs.slice(0, 10); }
    }
    return m;
  }

  /* ---------------- اختيار نموذج Gemini المجاني ---------------- */
  function pickModels(list) {
    var names = (list || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; }).map(function (m) { return String(m.name || '').replace(/^models\//, ''); });
    var good = names.filter(function (n) { return /flash/i.test(n) && !/(live|tts|transcribe|image|audio|embed|vision|thinking-exp|translate|native)/i.test(n); });
    var ver = function (n) { var m = n.match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : 0; };
    good.sort(function (a, b) { var la = /lite/i.test(a) ? 1 : 0, lb = /lite/i.test(b) ? 1 : 0; return (ver(b) - ver(a)) || (la - lb) || (/preview|exp/i.test(a) ? 1 : 0) - (/preview|exp/i.test(b) ? 1 : 0); });
    return good;
  }
  function geminiBody(prompt, images) {
    var parts = [{ text: prompt }];
    (images || []).forEach(function (im) { parts.push({ inline_data: { mime_type: im.mime || 'image/jpeg', data: im.data } }); });
    return { contents: [{ role: 'user', parts: parts }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 8192 } };
  }
  function geminiText(resp) {
    var c = resp && resp.candidates && resp.candidates[0];
    if (!c) { var why = resp && resp.promptFeedback && resp.promptFeedback.blockReason; throw new Error('لا يوجد رد من النموذج' + (why ? ' (' + why + ')' : '')); }
    return ((c.content && c.content.parts) || []).map(function (p) { return p.text || ''; }).join('');
  }

  G.TTEngine = {
    normalize: normalize, tokens: tokens, jaccard: jaccard, sameIdea: sameIdea, ideaKey: ideaKey, ruleCategory: ruleCategory,
    ruleVerbal: ruleVerbal, ruleFigural: ruleFigural, verbalPrompt: verbalPrompt, figuralPrompt: figuralPrompt, applyVerbal: applyVerbal, applyFigural: applyFigural,
    computeOriginality: computeOriginality, aggregate: aggregate, strokeMeta: strokeMeta, pickModels: pickModels, geminiBody: geminiBody, geminiText: geminiText, parseJson: parseJson, groupKey: groupKey
  };
})(typeof window !== 'undefined' ? window : this);
