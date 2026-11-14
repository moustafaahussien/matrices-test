/* =====================================================================
   Code.gs — الخادم (Google Apps Script) لنظام الكشف عن الموهوبين
   (اختبار المصفوفات + اختبار التفكير الإبداعي)
   الصق هذا الملف كاملاً في محرر Apps Script المرتبط بجدول Google
   ثم شغّل الدالة setup مرة واحدة، ثم انشره كتطبيق ويب
   ملاحظة: هذا الملف مُولَّد تلقائياً من ملفات assets — لا تعدّله يدوياً
   ===================================================================== */
/* =====================================================================
   tt-items.js — محتوى اختبار التفكير الإبداعي (على نمط اختبارات تورانس)
   أربعة نماذج متوازية، لكل نموذج صورتان:
   - الصورة اللفظية: 7 أنشطة (45 دقيقة)
   - الصورة الشكلية: 3 أنشطة (30 دقيقة)
   المثيرات والتعليمات أصلية من تصميم النظام، وليست بنود الاختبار المنشور.
   يعمل هذا الملف في المتصفح وفي Google Apps Script.
   ===================================================================== */
(function (G) {
  'use strict';
  var VERSION = 'tt1';
  var FORMS = [1, 2, 3, 4];

  /* ---------------- فئات المرونة لكل نوع نشاط ---------------- */
  var CATS = {
    ask: [
      ['who', 'هوية الأشخاص أو الأشياء (من؟ ما؟)'], ['why', 'الأسباب والدوافع (لماذا؟)'], ['feel', 'المشاعر والأفكار'], ['past', 'ما حدث قبل المشهد'],
      ['future', 'ما سيحدث بعد المشهد'], ['place', 'المكان'], ['time', 'الزمان'], ['how', 'الطريقة والكيفية'], ['prop', 'خصائص الأشياء (لون، حجم، مادة)'],
      ['rel', 'العلاقات بين الشخصيات والأشياء'], ['fant', 'الخيال وما وراء المألوف'], ['qty', 'العدد والكمية والقياس'], ['sense', 'الأصوات والروائح والإحساس']
    ],
    causes: [
      ['act', 'تصرف شخص في المشهد'], ['other', 'تصرف شخص آخر غير ظاهر'], ['acc', 'حادث أو صدفة'], ['nature', 'سبب طبيعي أو الطقس'], ['sci', 'سبب علمي أو تقني'],
      ['magic', 'سحر أو خيال'], ['emo', 'مشاعر أو رغبة'], ['animal', 'حيوان'], ['play', 'لعب أو مزاح أو تحدٍّ'], ['job', 'عمل أو مهمة أو مهنة'],
      ['family', 'الأسرة أو المجتمع'], ['need', 'حاجة أو مشكلة يريد حلها'], ['learn', 'تجربة أو تعلم أو فضول']
    ],
    consequences: [
      ['body', 'نتائج على جسم الشخص وسلامته'], ['emo', 'مشاعر الشخص'], ['others', 'نتائج على الآخرين والأسرة'], ['things', 'أضرار أو تغيّر في الأشياء'],
      ['env', 'البيئة والحيوانات والطقس'], ['disc', 'اكتشاف أو اختراع أو علم'], ['fame', 'شهرة أو إعلام أو مكافأة'], ['fant', 'نتائج خيالية'], ['money', 'نتائج مادية أو اقتصادية'],
      ['lesson', 'دروس وتعلم وتغيّر في السلوك'], ['social', 'نتائج اجتماعية أو قانونية'], ['chain', 'سلسلة أحداث جديدة']
    ],
    improve: [
      ['move', 'الحركة'], ['sound', 'الصوت والكلام والموسيقى'], ['light', 'الضوء'], ['shape', 'الشكل والحجم'], ['color', 'اللون'], ['mat', 'الملمس والمادة'],
      ['acc', 'الإضافات والملحقات والملابس'], ['tech', 'التقنية والإلكترونيات'], ['smart', 'التفاعل والذكاء والاستجابة'], ['edu', 'التعليم والمعرفة'],
      ['safe', 'الأمان والصحة والنظافة'], ['func', 'وظائف واستخدامات إضافية'], ['smell', 'الرائحة والطعم والحرارة'], ['group', 'اللعب الجماعي والمسابقات'], ['change', 'التحول والتركيب والتفكيك']
    ],
    uses: [
      ['store', 'حاويات وتخزين'], ['art', 'زينة وفنون وأشغال يدوية'], ['play', 'ألعاب ورياضة'], ['home', 'أدوات منزلية'], ['build', 'بناء وإنشاءات وأثاث'],
      ['plant', 'زراعة وبيئة'], ['wear', 'ملابس وإكسسوارات'], ['music', 'موسيقى وأصوات'], ['sci', 'علوم وتجارب'], ['move', 'نقل ومركبات وطفو'],
      ['animal', 'الحيوانات والطيور'], ['energy', 'طاقة ووقود وحرارة'], ['edu', 'تعليم ووسائل إيضاح'], ['recycle', 'إعادة تدوير وتصنيع'], ['food', 'الطعام والمطبخ'],
      ['health', 'صحة وإسعاف'], ['signal', 'إشارات وتواصل'], ['protect', 'حماية ووقاية']
    ],
    questions: [
      ['origin', 'مصدر الشيء وصناعته'], ['why', 'أسباب وجوده وخصائصه'], ['use', 'استخداماته'], ['future', 'مستقبله ومصيره'], ['prop', 'خصائصه (لون، حجم، مادة)'],
      ['people', 'علاقته بالناس'], ['env', 'أثره على البيئة'], ['fant', 'أسئلة خيالية'], ['qty', 'العدد والكمية'], ['history', 'تاريخه وتطوره'], ['econ', 'سعره وبيعه'], ['sci', 'أسئلة علمية']
    ],
    suppose: [
      ['body', 'الجسم والصحة'], ['daily', 'الحياة اليومية والعادات'], ['others', 'الأسرة والآخرون'], ['work', 'العمل والمهن والدراسة'], ['env', 'البيئة والحيوانات'],
      ['tech', 'التقنية والاختراعات'], ['emo', 'المشاعر'], ['social', 'المجتمع والقوانين'], ['money', 'الاقتصاد والتجارة'], ['fant', 'نتائج خيالية'], ['travel', 'السفر والمواصلات'],
      ['food', 'الطعام'], ['sport', 'الرياضة والترفيه'], ['problem', 'مشكلات جديدة وحلولها']
    ],
    figure: [
      ['human', 'إنسان أو جزء منه'], ['face', 'وجه أو تعبير'], ['animal', 'حيوان'], ['bird', 'طائر أو حشرة أو كائن بحري'], ['plant', 'نبات أو زهرة أو شجرة'],
      ['food', 'طعام أو شراب'], ['building', 'مبنى أو مكان'], ['vehicle', 'مركبة أو وسيلة نقل'], ['tool', 'أداة أو جهاز أو آلة'], ['nature', 'منظر أو ظاهرة طبيعية'],
      ['space', 'فضاء وأجرام سماوية'], ['fantasy', 'شخصية أو مخلوق خيالي'], ['symbol', 'رمز أو حرف أو رقم أو علامة'], ['sport', 'رياضة أو لعبة'], ['wear', 'ملابس أو إكسسوار'],
      ['music', 'آلة موسيقية'], ['abstract', 'تصميم مجرد أو زخرفة'], ['object', 'أداة منزلية أو شيء يومي']
    ]
  };

  /* ---------------- أدوات الرسم ---------------- */
  var K = '#26323c', SK = 'stroke="' + K + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  function svgWrap(vb, body, cls) { return '<svg viewBox="' + vb + '" class="' + (cls || 'tt-pic') + '" xmlns="http://www.w3.org/2000/svg" role="img">' + body + '</svg>'; }
  function person(x, y, s, o) {
    o = o || {}; var skin = o.skin || '#f1c9a5', shirt = o.shirt || '#3d7fd6', pants = o.pants || '#36454f', hair = o.hair || '#3b2a20';
    var arms = o.arms || 'down', h = '';
    h += '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">';
    // الساقان
    h += '<path d="M-9 40 L-12 78 M9 40 L12 78" stroke="' + pants + '" stroke-width="9" stroke-linecap="round"/>';
    h += '<path d="M-17 80 h9 M8 80 h9" stroke="' + K + '" stroke-width="5" stroke-linecap="round"/>';
    // الجسم
    h += '<rect x="-15" y="0" width="30" height="44" rx="10" fill="' + shirt + '" ' + SK + '/>';
    // الذراعان
    if (arms === 'up') h += '<path d="M-14 8 L-30 -20 M14 8 L30 -20" stroke="' + skin + '" stroke-width="7" stroke-linecap="round"/>';
    else if (arms === 'reach') h += '<path d="M-14 8 L-28 30 M14 8 L36 -14" stroke="' + skin + '" stroke-width="7" stroke-linecap="round"/>';
    else if (arms === 'hold') h += '<path d="M-14 8 L-24 -14 M14 8 L24 -14" stroke="' + skin + '" stroke-width="7" stroke-linecap="round"/>';
    else h += '<path d="M-14 8 L-24 36 M14 8 L24 36" stroke="' + skin + '" stroke-width="7" stroke-linecap="round"/>';
    // الرأس
    h += '<circle cx="0" cy="-16" r="15" fill="' + skin + '" ' + SK + '/>';
    if (o.girl) h += '<path d="M-15 -18 Q-16 -36 0 -34 Q16 -36 15 -18 Q20 -2 14 4 L12 -14 Q0 -26 -12 -14 L-14 4 Q-20 -2 -15 -18z" fill="' + hair + '"/>';
    else h += '<path d="M-15 -18 Q-14 -34 0 -33 Q14 -34 15 -18 Q8 -26 -15 -18z" fill="' + hair + '"/>';
    h += '<circle cx="-5" cy="-16" r="1.8" fill="' + K + '"/><circle cx="5" cy="-16" r="1.8" fill="' + K + '"/>';
    h += o.mouth === 'o' ? '<circle cx="0" cy="-8" r="2.6" fill="none" stroke="' + K + '" stroke-width="1.6"/>' : '<path d="M-4 -9 Q0 -6 4 -9" fill="none" stroke="' + K + '" stroke-width="1.6"/>';
    h += '</g>';
    return h;
  }
  function cat(x, y, s, startled) {
    var c = '#e08a3c';
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      '<path d="M-22 0 Q-24 -24 0 -26 Q24 -24 22 0 Z" fill="' + c + '" ' + SK + '/>' +
      (startled ? '<path d="M-20 -14 l-5 -6 M-12 -22 l-3 -8 M0 -26 v-8 M12 -22 l3 -8 M20 -14 l5 -6" ' + SK + '/>' : '') +
      '<path d="M22 -6 Q40 -10 36 -34" fill="none" stroke="' + c + '" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="-18" cy="-30" r="12" fill="' + c + '" ' + SK + '/>' +
      '<path d="M-28 -36 l2 -12 l7 8 M-10 -38 l1 -11 l-8 6" fill="' + c + '" ' + SK + '/>' +
      '<circle cx="-22" cy="-31" r="' + (startled ? 2.6 : 1.6) + '" fill="' + K + '"/><circle cx="-14" cy="-31" r="' + (startled ? 2.6 : 1.6) + '" fill="' + K + '"/>' +
      '</g>';
  }
  function bird(x, y, s, col) { return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')"><ellipse cx="0" cy="0" rx="14" ry="10" fill="' + (col || '#f2c12e') + '" ' + SK + '/><circle cx="10" cy="-8" r="7" fill="' + (col || '#f2c12e') + '" ' + SK + '/><path d="M16 -8 l7 2 l-7 3z" fill="#f08a24" stroke="' + K + '" stroke-width="1.5"/><circle cx="11" cy="-9" r="1.4" fill="' + K + '"/><path d="M-4 -2 q-8 -12 -16 -4" fill="none" ' + SK + '/></g>'; }
  function cloud(x, y, s, fill) { return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')"><path d="M-40 10 Q-48 -8 -28 -12 Q-24 -32 -2 -26 Q12 -40 28 -22 Q48 -22 42 2 Q46 16 30 16 L-30 16 Q-44 18 -40 10z" fill="' + (fill || '#fff') + '" ' + SK + '/></g>'; }
  function tree(x, y, s) { return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')"><path d="M-10 0 L-8 -90 L8 -90 L10 0z" fill="#9b6a3c" ' + SK + '/><path d="M-8 -60 L-30 -80 M6 -70 L26 -92" ' + SK + '/><circle cx="0" cy="-120" r="44" fill="#57a85a" ' + SK + '/><circle cx="-34" cy="-96" r="26" fill="#57a85a" ' + SK + '/><circle cx="34" cy="-100" r="28" fill="#57a85a" ' + SK + '/></g>'; }

  /* ---------------- مشاهد «اسأل وخمّن» (الأنشطة 1–3) ---------------- */
  var SCENES = {
    1: {
      desc: 'طفل يجلس على أرض غرفة علوية قديمة أمام صندوق خشبي قديم مفتوح، ويخرج من الصندوق ضوء ملوّن ونجوم صغيرة، وبجانبه قطة شعرها منتصب كأنها خائفة، وفي الأعلى نافذة صغيرة مستديرة.',
      caption: 'صندوق قديم مفتوح',
      svg: function () {
        var b = '<rect width="400" height="260" fill="#efe4d2"/><path d="M0 70 L200 6 L400 70" fill="none" stroke="#b89b74" stroke-width="5"/><circle cx="200" cy="52" r="20" fill="#cfe6f5" ' + SK + '/><path d="M200 32 v40 M180 52 h40" stroke="' + K + '" stroke-width="2"/>';
        b += '<rect x="0" y="200" width="400" height="60" fill="#c9a77c"/><path d="M0 200 H400" ' + SK + '/>';
        b += '<path d="M150 120 L268 120 L280 214 L140 214z" fill="url(#ttLight)" opacity=".9"/>';
        b += '<defs><linearGradient id="ttLight" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff6a8"/><stop offset="1" stop-color="#fff6a8" stop-opacity="0"/></linearGradient></defs>';
        b += '<rect x="160" y="178" width="100" height="44" rx="4" fill="#8a5a33" ' + SK + '/><path d="M160 178 L176 140 L276 140 L260 178" fill="#a86f40" ' + SK + '/><path d="M160 196 H260 M210 178 v44" stroke="#5b3a1f" stroke-width="2.5"/>';
        ['#e0483e', '#3d7fd6', '#3fa457', '#8e5cc4', '#f08a24'].forEach(function (c, i) { var x = 178 + i * 16, y = 112 - (i % 2) * 22; b += '<path d="M' + x + ' ' + y + ' l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" fill="' + c + '"/>'; });
        b += person(100, 150, 1.05, { arms: 'reach', shirt: '#3fa457', mouth: 'o' });
        b += cat(320, 214, 1, true);
        return svgWrap('0 0 400 260', b);
      }
    },
    2: {
      desc: 'رجل يقف على أعلى درجة من سلّم خشبي طويل جداً يصل إلى غيمة كبيرة، ويحمل دلواً فارغاً بيده ويمدّ يده الأخرى نحو الغيمة، وعلى الأرض ثلاثة أشخاص وكلب ينظرون إلى الأعلى.',
      caption: 'سلّم يصل إلى الغيمة',
      svg: function () {
        var b = '<rect width="400" height="260" fill="#d8eefa"/><rect y="226" width="400" height="34" fill="#8fc46a"/><path d="M0 226 H400" ' + SK + '/>';
        b += cloud(258, 46, 1.5, '#ffffff');
        b += '<path d="M196 230 L238 64 M222 232 L262 66" stroke="#9b6a3c" stroke-width="5" stroke-linecap="round"/>';
        for (var i = 0; i < 9; i++) { var t = i / 9; b += '<path d="M' + (196 + 42 * t + 2) + ' ' + (230 - 166 * t) + ' L' + (222 + 40 * t - 2) + ' ' + (232 - 166 * t) + '" stroke="#9b6a3c" stroke-width="4"/>'; }
        b += person(248, 20, 0.62, { arms: 'reach', shirt: '#e0483e' });
        b += '<path d="M232 40 l-10 2 l2 16 l14 0 l2 -16z" fill="#b8c4cc" stroke="' + K + '" stroke-width="2"/>';
        b += person(70, 168, 0.68, { arms: 'up', shirt: '#8e5cc4', mouth: 'o' }) + person(116, 172, 0.6, { girl: true, shirt: '#f08a24', mouth: 'o' }) + person(330, 166, 0.7, { arms: 'up', shirt: '#3d7fd6', mouth: 'o' });
        b += '<g transform="translate(150,222)"><ellipse cx="0" cy="-10" rx="18" ry="10" fill="#c58a4a" ' + SK + '/><circle cx="16" cy="-22" r="8" fill="#c58a4a" ' + SK + '/><path d="M-10 -2 v8 M10 -2 v8" ' + SK + '/><path d="M-18 -12 q-8 -10 -4 -16" fill="none" ' + SK + '/></g>';
        return svgWrap('0 0 400 260', b);
      }
    },
    3: {
      desc: 'فتاة تقف تحت المطر وتمسك مظلة مقلوبة رأساً على عقب مملوءة بالماء، وسمكة صغيرة برتقالية تقفز من داخل المظلة، وبجانبها بركة ماء وضفدع ينظر إليها.',
      caption: 'مظلة مقلوبة تحت المطر',
      svg: function () {
        var b = '<rect width="400" height="260" fill="#c9d6e0"/><rect y="214" width="400" height="46" fill="#9aa8b2"/><path d="M0 214 H400" ' + SK + '/>';
        b += cloud(90, 30, 1.2, '#9fb0bd') + cloud(300, 26, 1.3, '#9fb0bd');
        for (var i = 0; i < 26; i++) { var x = (i * 47) % 400, y = 60 + (i * 29) % 140; b += '<path d="M' + x + ' ' + y + ' l-4 10" stroke="#5f86b3" stroke-width="2.4" stroke-linecap="round"/>'; }
        b += person(170, 126, 1, { girl: true, arms: 'hold', shirt: '#f2c12e', mouth: 'o' });
        b += '<path d="M194 112 L194 82" ' + SK + '/><path d="M134 82 Q194 150 254 82 Z" fill="#e0483e" ' + SK + '/><path d="M140 86 Q194 112 248 86" fill="#6fa8dc" stroke="none"/>';
        b += '<path d="M206 62 q12 -10 20 2 q-10 10 -20 -2z M226 62 l8 -6 v14z" fill="#f08a24" stroke="' + K + '" stroke-width="2"/><circle cx="212" cy="61" r="1.5" fill="' + K + '"/>';
        b += '<path d="M200 72 q4 -4 8 0" fill="none" stroke="#5f86b3" stroke-width="2"/>';
        b += '<ellipse cx="310" cy="232" rx="56" ry="12" fill="#6fa8dc" ' + SK + '/>';
        b += '<g transform="translate(300,222)"><ellipse cx="0" cy="0" rx="14" ry="9" fill="#57a85a" ' + SK + '/><circle cx="-6" cy="-9" r="5" fill="#57a85a" ' + SK + '/><circle cx="6" cy="-9" r="5" fill="#57a85a" ' + SK + '/><circle cx="-6" cy="-9" r="1.6" fill="' + K + '"/><circle cx="6" cy="-9" r="1.6" fill="' + K + '"/></g>';
        return svgWrap('0 0 400 260', b);
      }
    },
    4: {
      desc: 'ولد يقف على أطراف أصابعه عند نافذة مفتوحة في الطابق الثاني، وينظر إلى طائرة ورقية ملونة عالقة في أعلى شجرة طويلة، وعلى الشجرة عصفور يمسك خيط الطائرة بمنقاره.',
      caption: 'طائرة ورقية فوق الشجرة',
      svg: function () {
        var b = '<rect width="400" height="260" fill="#dff1fb"/><rect y="232" width="400" height="28" fill="#8fc46a"/>';
        b += '<rect x="20" y="60" width="150" height="200" fill="#e9d2b0" ' + SK + '/><rect x="50" y="96" width="90" height="80" fill="#fff7e0" ' + SK + '/><path d="M50 176 H140" stroke="' + K + '" stroke-width="5"/>';
        b += '<path d="M50 96 L28 108 L28 186 L50 176z" fill="#b5d7ea" ' + SK + '/>';
        b += person(96, 128, 0.72, { arms: 'reach', shirt: '#3d7fd6', mouth: 'o' });
        b += tree(300, 236, 1);
        b += '<path d="M300 70 l26 -26 l26 26 l-26 34z" fill="#e0483e" ' + SK + '/><path d="M326 44 v60 M300 70 h52" stroke="' + K + '" stroke-width="2"/><path d="M326 104 q-6 14 4 24 q-8 10 0 20" fill="none" stroke="' + K + '" stroke-width="1.6"/>';
        b += '<path d="M330 148 Q300 150 282 128" fill="none" stroke="' + K + '" stroke-width="1.4"/>' + bird(270, 124, 0.9, '#8e5cc4');
        return svgWrap('0 0 400 260', b);
      }
    }
  };

  /* ---------------- الألعاب المحشوة (تحسين المنتج) ---------------- */
  function plush(body) { return svgWrap('0 0 300 240', '<rect width="300" height="240" rx="16" fill="#f7f1e8"/>' + body); }
  var TOYS = {
    1: { name: 'لعبة جمل محشوة', desc: 'لعبة جمل محشوة من القماش بلون بني فاتح، لها سنام واحد وأربع أرجل قصيرة وعينان من الأزرار وسرج صغير ملون.', svg: function () {
      var c = '#d9a967';
      return plush('<path d="M80 150 Q70 110 110 96 Q130 60 160 92 Q200 96 206 140 L206 150z" fill="' + c + '" ' + SK + '/><rect x="124" y="94" width="38" height="16" rx="5" fill="#e0483e" ' + SK + '/>' +
        '<path d="M96 148 v42 M124 150 v42 M178 150 v42 M200 148 v42" stroke="' + c + '" stroke-width="16" stroke-linecap="round"/><path d="M96 148 v42 M124 150 v42 M178 150 v42 M200 148 v42" stroke="' + K + '" stroke-width="2" stroke-dasharray="2 6"/>' +
        '<path d="M206 126 Q236 110 230 70 Q228 52 246 50 Q266 50 262 70 L254 80 Q246 82 244 76 Q246 110 214 142z" fill="' + c + '" ' + SK + '/><circle cx="252" cy="62" r="3.4" fill="' + K + '"/><path d="M80 130 q-14 6 -12 22" fill="none" ' + SK + '/>'); } },
    2: { name: 'لعبة بطريق محشوة', desc: 'لعبة بطريق محشوة من القماش، جسمها أسود وبطنها أبيض، ولها منقار برتقالي وقدمان صغيرتان وعينان من الأزرار ووشاح أحمر حول الرقبة.', svg: function () {
      return plush('<ellipse cx="150" cy="130" rx="62" ry="86" fill="#2f3b45" ' + SK + '/><ellipse cx="150" cy="146" rx="42" ry="64" fill="#fff" ' + SK + '/>' +
        '<path d="M92 120 q-26 26 -14 54 q18 -10 22 -34z M208 120 q26 26 14 54 q-18 -10 -22 -34z" fill="#2f3b45" ' + SK + '/><path d="M138 82 l12 14 l12 -14z" fill="#f08a24" ' + SK + '/>' +
        '<circle cx="134" cy="70" r="4" fill="#fff"/><circle cx="166" cy="70" r="4" fill="#fff"/><circle cx="134" cy="70" r="2" fill="' + K + '"/><circle cx="166" cy="70" r="2" fill="' + K + '"/>' +
        '<path d="M110 102 Q150 116 190 102 L192 114 Q150 128 108 114z M178 110 l8 30 l10 -4 l-8 -26" fill="#e0483e" ' + SK + '/><path d="M120 214 q12 -8 24 0 M156 214 q12 -8 24 0" fill="#f08a24" ' + SK + '/>'); } },
    3: { name: 'لعبة سلحفاة محشوة', desc: 'لعبة سلحفاة محشوة من القماش، صدفتها خضراء مقسمة إلى رقع ملونة، ولها رأس صغير وأربع أرجل قصيرة وذيل قصير وعينان من الأزرار.', svg: function () {
      var s = '<path d="M70 160 Q78 70 150 66 Q222 70 230 160z" fill="#57a85a" ' + SK + '/>';
      ['#3fa457', '#8fc46a', '#f2c12e', '#3d7fd6'].forEach(function (c, i) { s += '<path d="M' + (96 + i * 30) + ' 150 q15 -40 30 0z" fill="' + c + '" stroke="' + K + '" stroke-width="2"/>'; });
      return plush(s + '<path d="M64 160 H236" ' + SK + '/><path d="M96 164 v26 M124 164 v26 M176 164 v26 M204 164 v26" stroke="#8fc46a" stroke-width="16" stroke-linecap="round"/>' +
        '<path d="M228 140 Q270 120 268 148 Q266 170 236 160" fill="#8fc46a" ' + SK + '/><circle cx="254" cy="140" r="3.4" fill="' + K + '"/><path d="M72 150 l-18 8 l18 6" fill="#8fc46a" ' + SK + '/>'); } },
    4: { name: 'لعبة أرنب محشوة', desc: 'لعبة أرنب محشوة من القماش بلون رمادي فاتح، لها أذنان طويلتان واقفتان وذيل قطني أبيض وأنف وردي وعينان من الأزرار وفيونكة زرقاء.', svg: function () {
      var c = '#cfd3d8';
      return plush('<path d="M126 70 Q110 4 130 6 Q146 10 142 66z M162 66 Q160 4 178 8 Q194 14 176 72z" fill="' + c + '" ' + SK + '/><path d="M130 60 Q122 20 132 18 M168 60 Q172 22 178 22" stroke="#f3b7c6" stroke-width="6" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="150" cy="160" rx="60" ry="58" fill="' + c + '" ' + SK + '/><circle cx="150" cy="92" r="38" fill="' + c + '" ' + SK + '/><circle cx="136" cy="88" r="3.6" fill="' + K + '"/><circle cx="164" cy="88" r="3.6" fill="' + K + '"/>' +
        '<path d="M145 100 l5 6 l5 -6z" fill="#f08aa6"/><path d="M120 128 l30 10 l30 -10 l-6 18 l-24 -6 l-24 6z" fill="#3d7fd6" ' + SK + '/><circle cx="212" cy="176" r="14" fill="#fff" ' + SK + '/>' +
        '<ellipse cx="120" cy="214" rx="20" ry="10" fill="' + c + '" ' + SK + '/><ellipse cx="180" cy="214" rx="20" ry="10" fill="' + c + '" ' + SK + '/>'); } }
  };

  /* ---------------- أشياء الاستعمالات غير المألوفة ---------------- */
  var OBJECTS = {
    1: { name: 'القوارير البلاستيكية الفارغة', one: 'قارورة بلاستيكية فارغة', svg: function () { return svgWrap('0 0 200 160', '<rect width="200" height="160" rx="14" fill="#eef5f8"/><path d="M86 26 h28 v14 q20 10 20 34 v66 q0 10 -10 10 h-48 q-10 0 -10 -10 v-66 q0 -24 20 -34z" fill="#bfe3f2" ' + SK + '/><rect x="84" y="16" width="32" height="12" rx="3" fill="#3d7fd6" ' + SK + '/><path d="M66 92 h68" stroke="#3d7fd6" stroke-width="10"/><path d="M76 72 q-4 30 2 60" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>', 'tt-obj'); } },
    2: { name: 'إطارات السيارات القديمة', one: 'إطار سيارة قديم', svg: function () { var s = '<rect width="200" height="160" rx="14" fill="#f1efe9"/><circle cx="100" cy="80" r="60" fill="#3a3f44" ' + SK + '/><circle cx="100" cy="80" r="30" fill="#f1efe9" ' + SK + '/>'; for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8; s += '<path d="M' + (100 + 50 * Math.cos(a)).toFixed(1) + ' ' + (80 + 50 * Math.sin(a)).toFixed(1) + ' L' + (100 + 58 * Math.cos(a + 0.12)).toFixed(1) + ' ' + (80 + 58 * Math.sin(a + 0.12)).toFixed(1) + '" stroke="#6b737a" stroke-width="4"/>'; } return svgWrap('0 0 200 160', s, 'tt-obj'); } },
    3: { name: 'الأكواب الورقية', one: 'كوب ورقي', svg: function () { return svgWrap('0 0 200 160', '<rect width="200" height="160" rx="14" fill="#f8f1ea"/><path d="M58 30 h84 l-12 112 h-60z" fill="#fff" ' + SK + '/><ellipse cx="100" cy="30" rx="42" ry="8" fill="#f2e6d8" ' + SK + '/><path d="M64 64 h72 l-3 26 h-66z" fill="#f08a24" stroke="none"/><path d="M76 77 q8 -8 16 0 t16 0 t16 0" stroke="#fff" stroke-width="3" fill="none"/>', 'tt-obj'); } },
    4: { name: 'الصحف القديمة', one: 'صحيفة قديمة', svg: function () { var s = '<rect width="200" height="160" rx="14" fill="#efefea"/><path d="M40 28 l110 -8 l12 112 l-110 8z" fill="#fbfaf3" ' + SK + '/><rect x="56" y="34" width="86" height="12" transform="rotate(-4 99 40)" fill="#26323c"/>'; for (var i = 0; i < 6; i++) s += '<path d="M' + (58 + i * 0.8) + ' ' + (62 + i * 12) + ' l84 -6" stroke="#9aa3aa" stroke-width="4"/>'; return svgWrap('0 0 200 160', s + '<rect x="60" y="66" width="34" height="30" transform="rotate(-4 77 81)" fill="#bfd8e8" stroke="#26323c" stroke-width="1.5"/>', 'tt-obj'); } }
  };

  /* ---------------- مواقف «افترض أن» ---------------- */
  var SUPPOSE = {
    1: { text: 'افترض أن الناس أصبحوا يستطيعون التنفس تحت الماء مثل الأسماك.', svg: function () { return svgWrap('0 0 300 150', '<rect width="300" height="150" rx="14" fill="#5f9fd0"/><path d="M0 26 q25 -10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0" fill="none" stroke="#fff" stroke-width="3"/>' + person(120, 70, 0.7, { arms: 'up', shirt: '#f2c12e' }) + '<circle cx="146" cy="38" r="5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="154" cy="24" r="3" fill="none" stroke="#fff" stroke-width="2"/><path d="M200 100 q14 -12 28 0 q-14 12 -28 0z M228 100 l10 -8 v16z" fill="#f08a24" stroke="#26323c" stroke-width="2"/>', 'tt-sup'); } },
    2: { text: 'افترض أن ظلّ كل إنسان أصبح يتحرك وحده، ويذهب إلى أماكن لا يذهب إليها صاحبه.', svg: function () { return svgWrap('0 0 300 150', '<rect width="300" height="150" rx="14" fill="#fbe7b5"/><circle cx="40" cy="34" r="16" fill="#f2c12e" ' + SK + '/><rect y="124" width="300" height="26" fill="#d9c08a"/>' + person(90, 58, 0.72, { shirt: '#3d7fd6', mouth: 'o' }) + '<g opacity=".55" transform="translate(150,124) skewX(-30) scale(1,-0.6) translate(-90,-58)"><g>' + person(90 + 70, 58, 0.72, { arms: 'up', shirt: '#26323c', skin: '#26323c', hair: '#26323c', pants: '#26323c' }) + '</g></g>', 'tt-sup'); } },
    3: { text: 'افترض أن الأشجار والنباتات أصبحت تمشي على جذورها وتنتقل من مكان إلى آخر.', svg: function () { return svgWrap('0 0 300 150', '<rect width="300" height="150" rx="14" fill="#e3f3dc"/><rect y="124" width="300" height="26" fill="#a8d08d"/>' + '<g transform="translate(150,126) scale(.7)"><path d="M-10 0 L-8 -60 L8 -60 L10 0z" fill="#9b6a3c" ' + SK + '/><circle cx="0" cy="-90" r="40" fill="#57a85a" ' + SK + '/><circle cx="-12" cy="-96" r="5" fill="#fff"/><circle cx="12" cy="-96" r="5" fill="#fff"/><circle cx="-12" cy="-96" r="2.4" fill="#26323c"/><circle cx="12" cy="-96" r="2.4" fill="#26323c"/><path d="M-10 0 q-20 6 -26 -6 M10 0 q22 8 30 -4 M0 0 q-4 18 10 22" fill="none" stroke="#9b6a3c" stroke-width="6" stroke-linecap="round"/></g><path d="M196 108 h22 M200 98 h26 M196 118 h18" stroke="#57a85a" stroke-width="3" stroke-linecap="round"/>', 'tt-sup'); } },
    4: { text: 'افترض أن جميع الألوان اختفت من العالم فجأة، وأصبح كل شيء باللونين الأبيض والأسود.', svg: function () { return svgWrap('0 0 300 150', '<rect width="300" height="150" rx="14" fill="#f2f2f2"/><rect y="118" width="300" height="32" fill="#bdbdbd"/><g filter="url(#ttGray)">' + person(80, 62, 0.68, { shirt: '#3d7fd6' }) + '</g><defs><filter id="ttGray"><feColorMatrix type="saturate" values="0"/></filter></defs><circle cx="230" cy="40" r="18" fill="#9e9e9e" ' + SK + '/><path d="M190 118 l20 -40 l20 40z" fill="#7a7a7a" ' + SK + '/><path d="M150 70 l8 -6 l8 6 l-8 6z" fill="#e0483e" ' + SK + '/><path d="M140 86 q18 -16 36 0" stroke="#26323c" stroke-width="2" fill="none" stroke-dasharray="3 4"/>', 'tt-sup'); } }
  };

  /* ---------------- الصورة الشكلية ---------------- */
  // النشاط 1: الشكل الأساسي (لون الملصق) — أشكال منحنية مغلقة متقاربة المساحة والتعقيد
  var BASE = {
    1: { name: 'شكل قطرة برتقالي', color: '#f08a24', path: 'M0 -70 C26 -36 46 -6 46 22 C46 50 24 68 0 68 C-24 68 -46 50 -46 22 C-46 -6 -26 -36 0 -70Z' },
    2: { name: 'شكل حبة فاصولياء خضراء', color: '#3fa457', path: 'M-62 -6 C-62 -42 -26 -56 0 -40 C20 -28 30 -44 52 -38 C76 -30 74 22 52 40 C26 62 -10 56 -32 44 C-52 32 -62 18 -62 -6Z' },
    3: { name: 'شكل ورقة شجر زرقاء', color: '#3d7fd6', path: 'M-60 34 C-56 -18 -14 -58 54 -62 C58 -6 30 50 -24 60 C-40 62 -52 54 -60 34Z' },
    4: { name: 'شكل غيمة صغيرة حمراء', color: '#e0483e', path: 'M-56 26 C-74 20 -70 -8 -50 -10 C-50 -38 -20 -48 -4 -30 C8 -54 44 -48 46 -20 C70 -22 76 12 56 22 C52 46 20 50 6 36 C-10 54 -46 50 -56 26Z' }
  };
  // النشاط 2: إكمال الأشكال — 10 أسر هندسية، والبند رقم س متماثل البنية في النماذج الأربعة
  // كل شكل يُرسم في خلية 180×160 ومركزها (90،80). gap: منطقة الفجوة (لحساب «مقاومة الإغلاق المبكر»)
  function rot(pts, deg, mirror) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return pts.map(function (p) { var x = mirror ? -p[0] : p[0], y = p[1]; return [x * c - y * s, x * s + y * c]; }); }
  function arcPts(r, a0, a1, n) { var o = []; for (var i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([r * Math.cos(a), r * Math.sin(a)]); } return o; }
  var FAMILIES = [
    function () { return { lines: [arcPts(34, 40, 320, 24)], gap: [[34 * Math.cos(0), 0]], desc: 'خط منحنٍ شبه دائري مفتوح من جهة واحدة' }; },
    function () { return { lines: [[[-26, -30], [-26, 30]], [[26, -30], [26, 30]]], gap: [[0, -30], [0, 30]], desc: 'خطان قصيران متوازيان' }; },
    function () { var p = []; for (var i = 0; i <= 24; i++) { var x = -50 + 100 * i / 24; p.push([x, 12 * Math.sin(i / 24 * Math.PI * 3)]); } return { lines: [p], gap: [[-50, 0], [50, 0]], desc: 'خط متموج أفقي' }; },
    function () { return { lines: [[[-36, -34], [0, 30], [36, -34]]], gap: [[0, -34]], desc: 'زاوية حادة مفتوحة إلى الأعلى (شكل V)' }; },
    function () { var p = []; for (var i = 0; i <= 40; i++) { var t = i / 40 * Math.PI * 3.2, r = 6 + 10 * t / Math.PI; p.push([r * Math.cos(t), r * Math.sin(t)]); } return { lines: [p], gap: [p[p.length - 1]], desc: 'خط حلزوني صغير' }; },
    function () { return { lines: [[[-30, -30], [-30, 30], [30, 30], [30, -30]]], gap: [[0, -30]], desc: 'مربع ناقص الضلع العلوي' }; },
    function () { return { lines: [[[-44, 24], [44, 24]], arcPts(12, 0, 360, 20).map(function (q) { return [q[0], q[1] - 18]; })], gap: [[-44, 24], [44, 24]], desc: 'خط أفقي فوقه دائرة صغيرة منفصلة' }; },
    function () { return { lines: [[[-48, 10], [-30, -14], [-12, 10], [6, -14]], [[24, 10], [48, -14]]], gap: [[15, -2]], desc: 'خط متعرج تقطعه فجوة' }; },
    function () { return { lines: [arcPts(30, 110, 250, 12).map(function (q) { return [q[0] - 4, q[1]]; }), arcPts(30, -70, 70, 12).map(function (q) { return [q[0] + 4, q[1]]; })], gap: [[0, -28], [0, 28]], desc: 'قوسان متقابلان مثل الأقواس ( )' }; },
    function () { return { lines: [[[-34, 26], [0, -34], [34, 26]]], dots: [[0, 10]], gap: [[-34, 26], [34, 26]], desc: 'مثلث ناقص القاعدة وداخله نقطة' }; }
  ];
  // تنويع النموذج: دوران وانعكاس يحافظان على بنية الشكل وصعوبته
  var FORM_TF = { 1: [0, false], 2: [90, true], 3: [180, false], 4: [270, true] };
  var FIG_TWEAK = [[0, 0], [15, 0], [0, 1], [30, 0], [0, 0], [45, 0], [0, 1], [0, 0], [90, 0], [0, 1]];
  function completionFigures(form) {
    var tf = FORM_TF[form];
    return FAMILIES.map(function (fam, k) {
      var f = fam(); var deg = tf[0] + FIG_TWEAK[k][0] * (form % 2 ? 1 : -1), mir = tf[1] !== !!FIG_TWEAK[k][1];
      return { lines: f.lines.map(function (l) { return rot(l, deg, mir); }), dots: (f.dots || []).map(function (d) { return rot([d], deg, mir)[0]; }), gap: rot(f.gap, deg, mir), desc: f.desc };
    });
  }
  // النشاط 3: المثيرات المتكررة
  var REPEAT = { 1: { kind: 'circles', name: 'الدوائر', n: 24 }, 2: { kind: 'lines', name: 'أزواج الخطوط المتوازية', n: 24 }, 3: { kind: 'circles', name: 'الدوائر', n: 24 }, 4: { kind: 'lines', name: 'أزواج الخطوط المتوازية', n: 24 } };

  /* ---------------- صفحات الرسم (إحداثيات منطقية) ---------------- */
  var FS = 1.45; // تكبير أشكال الإكمال داخل الخلية
  var PAGE = {
    construct: { w: 800, h: 560 },
    complete: { w: 800, h: 1000, cols: 2, rows: 5, cw: 400, ch: 200 },
    repeat: { w: 800, h: 1200, cols: 4, rows: 6, cw: 200, ch: 200 }
  };
  // الترقيم من اليمين إلى اليسار (الخلية 1 أعلى اليمين)
  function cellOrigin(layout, i) { var c = i % layout.cols, r = Math.floor(i / layout.cols); return [(layout.cols - 1 - c) * layout.cw, r * layout.ch]; }
  // يرسم خلفية صفحة النشاط (للشاشة والطباعة وصورة التصحيح) — يعيد أوامر رسم مجردة
  function pageBackground(act, form) {
    var ops = [];
    if (act === 'construct') {
      var b = BASE[form]; ops.push({ t: 'path', d: b.path, x: 400, y: 280, s: 1.7, fill: b.color, stroke: '#26323c', w: 1.6 });
    } else if (act === 'complete') {
      var L = PAGE.complete, figs = completionFigures(form);
      figs.forEach(function (f, i) {
        var o = cellOrigin(L, i), cx = o[0] + 200, cy = o[1] + 100;
        ops.push({ t: 'rect', x: o[0] + 6, y: o[1] + 6, w: L.cw - 12, h: L.ch - 12, stroke: '#c7d0d8', w2: 1.5, dash: true });
        ops.push({ t: 'num', x: o[0] + L.cw - 26, y: o[1] + 32, n: i + 1 });
        f.lines.forEach(function (l) { ops.push({ t: 'poly', pts: l.map(function (p) { return [cx + FS * p[0], cy + FS * p[1]]; }), stroke: '#26323c', w: 4 }); });
        f.dots.forEach(function (d) { ops.push({ t: 'dot', x: cx + FS * d[0], y: cy + FS * d[1], r: 5 }); });
      });
    } else if (act === 'repeat') {
      var R = PAGE.repeat, kind = REPEAT[form].kind;
      for (var i = 0; i < R.cols * R.rows; i++) {
        var o2 = cellOrigin(R, i), x = o2[0] + 100, y = o2[1] + 100;
        ops.push({ t: 'num', x: o2[0] + R.cw - 16, y: o2[1] + 24, n: i + 1, small: true });
        if (kind === 'circles') ops.push({ t: 'circle', x: x, y: y, r: 58, stroke: '#26323c', w: 3 });
        else { ops.push({ t: 'poly', pts: [[x - 22, y - 62], [x - 22, y + 62]], stroke: '#26323c', w: 3 }); ops.push({ t: 'poly', pts: [[x + 22, y - 62], [x + 22, y + 62]], stroke: '#26323c', w: 3 }); }
      }
    }
    return ops;
  }
  function opsToSvg(ops, w, h) {
    var s = '';
    ops.forEach(function (o) {
      if (o.t === 'path') s += '<path d="' + o.d + '" transform="translate(' + o.x + ',' + o.y + ') scale(' + (o.s || 1) + ')" fill="' + o.fill + '" stroke="' + o.stroke + '" stroke-width="' + o.w + '"/>';
      else if (o.t === 'rect') s += '<rect x="' + o.x + '" y="' + o.y + '" width="' + o.w + '" height="' + o.h + '" rx="10" fill="none" stroke="' + o.stroke + '" stroke-width="' + o.w2 + '"' + (o.dash ? ' stroke-dasharray="6 6"' : '') + '/>';
      else if (o.t === 'num') s += '<text x="' + o.x + '" y="' + o.y + '" font-size="' + (o.small ? 15 : 20) + '" font-family="Tahoma,Arial" font-weight="700" fill="#7a8a96" text-anchor="middle">' + o.n + '</text>';
      else if (o.t === 'poly') s += '<polyline points="' + o.pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + o.stroke + '" stroke-width="' + o.w + '" stroke-linecap="round" stroke-linejoin="round"/>';
      else if (o.t === 'dot') s += '<circle cx="' + o.x + '" cy="' + o.y + '" r="' + o.r + '" fill="#26323c"/>';
      else if (o.t === 'circle') s += '<circle cx="' + o.x + '" cy="' + o.y + '" r="' + o.r + '" fill="none" stroke="' + o.stroke + '" stroke-width="' + o.w + '"/>';
    });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" class="tt-page"><rect width="' + w + '" height="' + h + '" fill="#fff"/>' + s + '</svg>';
  }
  // مناطق الفجوة بإحداثيات الصفحة (للتحقق الهندسي من إغلاق الشكل في الرسم على الشاشة)
  function gapZones(form) {
    var L = PAGE.complete;
    return completionFigures(form).map(function (f, i) { var o = cellOrigin(L, i), cx = o[0] + 200, cy = o[1] + 100; return f.gap.map(function (g) { return [cx + FS * g[0], cy + FS * g[1]]; }); });
  }

  /* ---------------- تعليمات حسب المرحلة ---------------- */
  function pick(stage, prim, other) { return stage === 'primary' ? prim : other; }
  var VERBAL_ACTS = [
    { id: 'ask', type: 'ask', time: 5, title: 'اسأل', max: 40,
      instr: function (s) { return pick(s, 'انظر إلى الصورة جيداً. اكتب كل الأسئلة التي تخطر ببالك عما يحدث فيها. اكتب أسئلة لا تستطيع أن تعرف جوابها بمجرد النظر إلى الصورة.', 'تأمل الصورة، ثم اكتب كل الأسئلة التي تحتاج إلى طرحها لتفهم ما يحدث فيها فهماً كاملاً. لا تكتب أسئلة يمكن الإجابة عنها بالنظر إلى الصورة فقط. كلما كانت أسئلتك أكثر وأكثر تنوعاً كان ذلك أفضل.'); } },
    { id: 'causes', type: 'causes', time: 5, title: 'خمّن الأسباب', max: 40,
      instr: function (s) { return pick(s, 'انظر إلى الصورة نفسها. ما الأشياء التي حدثت قبل هذا المشهد وجعلته يحدث؟ اكتب كل الأسباب التي تستطيع أن تفكر فيها.', 'اكتب كل الأسباب الممكنة التي أدت إلى ما تراه في الصورة: أحداث قريبة حدثت قبل المشهد مباشرة، أو أحداث بعيدة حدثت منذ زمن. خمّن بحرية، فلا توجد إجابة واحدة صحيحة.'); } },
    { id: 'consequences', type: 'consequences', time: 5, title: 'خمّن النتائج', max: 40,
      instr: function (s) { return pick(s, 'ماذا سيحدث بعد هذا المشهد؟ اكتب كل الأشياء التي يمكن أن تحدث نتيجة لما في الصورة.', 'اكتب كل النتائج المحتملة لما يحدث في الصورة: ما سيحدث بعد لحظات، وما قد يحدث بعد أيام أو سنوات. فكّر في نتائج على الأشخاص وعلى الآخرين وعلى الأشياء.'); } },
    { id: 'improve', type: 'improve', time: 10, title: 'تحسين اللعبة', max: 50,
      instr: function (s) { return pick(s, 'هذه لعبة للأطفال. فكّر في كل الطرق التي تجعل هذه اللعبة أجمل وأكثر متعة عند اللعب بها. اكتب كل فكرة في مربع.', 'هذه لعبة للأطفال. اكتب أكبر عدد من الأفكار التي تغيّر هذه اللعبة لتجعلها أكثر متعة وتشويقاً للعب. لا تهتم بتكلفة التغيير. فكّر في أفكار لا يفكر فيها غيرك.'); } },
    { id: 'uses', type: 'uses', time: 10, title: 'استعمالات غير مألوفة', max: 50,
      instr: function (s, f) { var o = OBJECTS[f].name; return pick(s, 'الناس عادة يرمون ' + o + '. فكّر في استعمالات جديدة ومفيدة أو ممتعة لها. اكتب كل استعمال تفكر فيه.', 'معظم الناس يتخلصون من ' + o + '، مع أن لها استعمالات كثيرة ومثيرة. اكتب أكبر عدد ممكن من الاستعمالات غير المعتادة لها. يمكنك استعمال واحدة أو عدد كبير منها. لا تكتفِ بالاستعمالات التي رأيتها من قبل.'); } },
    { id: 'questions', type: 'questions', time: 5, title: 'أسئلة غير مألوفة', max: 40,
      instr: function (s, f) { var o = OBJECTS[f].name; return pick(s, 'اكتب أسئلة غريبة ومختلفة عن ' + o + '. أسئلة لا يسألها الناس عادة.', 'اكتب أكبر عدد من الأسئلة غير المعتادة عن ' + o + '. أسئلة تدفع الآخرين إلى التفكير في أشياء لم يفكروا فيها من قبل.'); } },
    { id: 'suppose', type: 'suppose', time: 5, title: 'افترض أن…', max: 40,
      instr: function (s) { return pick(s, 'اقرأ الموقف الغريب بالأسفل، وتخيّل أنه حدث فعلاً. ماذا سيحدث للناس وللعالم؟ اكتب كل ما تتخيله.', 'تخيّل أن الموقف غير المحتمل المكتوب بالأسفل قد حدث فعلاً. ماذا سيحدث نتيجة لذلك؟ اكتب كل الأفكار والتخمينات التي تخطر ببالك.'); } }
  ];
  var FIGURAL_ACTS = [
    { id: 'construct', type: 'construct', time: 10, title: 'بناء صورة',
      instr: function (s, f) { return pick(s, 'في وسط الصفحة شكل ملوّن. ارسم صورة يكون هذا الشكل جزءاً منها. حاول أن ترسم شيئاً لا يرسمه غيرك، وأضف تفاصيل كثيرة تحكي قصة. ثم اكتب عنواناً جميلاً لرسمتك.', 'في وسط الصفحة ' + BASE[f].name + '. فكّر في صورة أو قصة لا يفكر فيها غيرك، واجعل هذا الشكل جزءاً أساسياً منها. أضف أفكاراً وتفاصيل تجعل الصورة كاملة ومثيرة، ثم اكتب لها عنواناً ذكياً وغير مألوف.'); } },
    { id: 'complete', type: 'complete', time: 10, title: 'إكمال الأشكال', n: 10,
      instr: function (s) { return pick(s, 'في هذه الصفحة 10 خطوط ناقصة. أضف خطوطاً لكل منها لترسم أشياء أو صوراً جميلة لا يرسمها غيرك. اكتب اسماً لكل رسمة في المربع الخاص بها.', 'بإضافة خطوط إلى الأشكال العشرة الناقصة ارسم أشياء أو صوراً مثيرة. حاول أن تكون رسومك غير مألوفة، وأن تضيف تفاصيل تحكي قصة كاملة، ولا تتعجل في إغلاق الأشكال. اكتب عنواناً لكل رسمة.'); } },
    { id: 'repeat', type: 'repeat', time: 10, title: 'الأشكال المتكررة', n: 24,
      instr: function (s, f) { var n = REPEAT[f].name; return pick(s, 'في هذه الصفحة مجموعة من ' + n + '. حوّل كل واحدة منها إلى شيء مختلف بإضافة خطوط داخلها أو خارجها. ارسم أكبر عدد تستطيعه من الأشياء المختلفة.', 'خلال 10 دقائق، حوّل أكبر عدد ممكن من ' + n + ' إلى أشياء أو صور مختلفة؛ يجب أن تكون ' + n + ' الجزء الأساسي من كل رسمة. أضف خطوطاً داخلها أو خارجها أو بينها. يمكنك الجمع بين أكثر من شكل في رسمة واحدة. اكتب اسماً لكل رسمة إن استطعت.'); } }
  ];

  var BATTERIES = {
    verbal: { id: 'verbal', name: 'الصورة اللفظية', short: 'لفظي', time: 45, dims: ['fluency', 'flexibility', 'originality'] },
    figural: { id: 'figural', name: 'الصورة الشكلية', short: 'شكلي', time: 30, dims: ['fluency', 'originality', 'elaboration', 'abstractness', 'closure'] }
  };
  var DIM_NAME = { fluency: 'الطلاقة', flexibility: 'المرونة', originality: 'الأصالة', elaboration: 'التفاصيل (الإسهاب)', abstractness: 'تجريد العناوين', closure: 'مقاومة الإغلاق المبكر' };
  var STRENGTHS = [
    ['emotion', 'التعبير عن المشاعر'], ['story', 'سرد القصة بوضوح'], ['movement', 'الحركة والفعل'], ['titles', 'عناوين معبّرة'], ['synthComplete', 'الدمج بين الأشكال الناقصة'],
    ['synthRepeat', 'الدمج بين الأشكال المتكررة'], ['unusual', 'رؤية غير مألوفة (زاوية نظر غريبة)'], ['internal', 'رؤية ما بداخل الأشياء'], ['boundaries', 'تجاوز الحدود والإطار'],
    ['humor', 'الفكاهة'], ['richness', 'ثراء الصور الذهنية'], ['colorful', 'حيوية الصور وألوانها'], ['fantasy', 'الخيال']
  ];

  function stimulusOf(act, form) {
    if (act.id === 'ask' || act.id === 'causes' || act.id === 'consequences') return { svg: SCENES[form].svg(), desc: SCENES[form].desc, caption: SCENES[form].caption };
    if (act.id === 'improve') return { svg: TOYS[form].svg(), desc: TOYS[form].desc, caption: TOYS[form].name };
    if (act.id === 'uses' || act.id === 'questions') return { svg: OBJECTS[form].svg(), desc: OBJECTS[form].name, caption: OBJECTS[form].name };
    if (act.id === 'suppose') return { svg: SUPPOSE[form].svg(), desc: SUPPOSE[form].text, caption: SUPPOSE[form].text };
    if (act.id === 'construct') return { desc: BASE[form].name + ' في وسط الصفحة (يجب أن يكون جزءاً من الرسمة)', caption: BASE[form].name };
    if (act.id === 'complete') return { desc: completionFigures(form).map(function (f, i) { return (i + 1) + ': ' + f.desc; }).join('؛ '), figs: completionFigures(form).map(function (f) { return f.desc; }) };
    if (act.id === 'repeat') return { desc: REPEAT[form].n + ' من ' + REPEAT[form].name + ' مرتبة في شبكة 4×6 ومرقمة', kind: REPEAT[form].kind, caption: REPEAT[form].name };
    return {};
  }
  var cache = {};
  function getForm(battery, form) {
    form = Number(form);
    if (!BATTERIES[battery] || FORMS.indexOf(form) < 0) throw new Error('نموذج غير معروف');
    var k = battery + '|' + form; if (cache[k]) return cache[k];
    var src = battery === 'verbal' ? VERBAL_ACTS : FIGURAL_ACTS;
    var acts = src.map(function (a, i) { return { idx: i, id: a.id, type: a.type, title: a.title, time: a.time, max: a.max || a.n || 1, n: a.n || 0, instr: function (stage) { return a.instr(stage, form); }, stim: stimulusOf(a, form), cats: CATS[battery === 'verbal' ? a.type : 'figure'] }; });
    cache[k] = { battery: battery, form: form, version: VERSION, acts: acts };
    return cache[k];
  }
  function actCount(battery) { return battery === 'verbal' ? VERBAL_ACTS.length : FIGURAL_ACTS.length; }
  function stageOfGrade(g) { g = Number(g); if (g <= 6) return 'primary'; if (g <= 9) return 'intermediate'; return 'secondary'; }

  G.TTItems = {
    VERSION: VERSION, FORMS: FORMS, BATTERIES: BATTERIES, DIM_NAME: DIM_NAME, STRENGTHS: STRENGTHS, CATS: CATS, PAGE: PAGE, REPEAT: REPEAT, BASE: BASE,
    getForm: getForm, actCount: actCount, pageBackground: pageBackground, opsToSvg: opsToSvg, gapZones: gapZones, cellOrigin: cellOrigin, completionFigures: completionFigures, stageOfGrade: stageOfGrade,
    pageSvg: function (act, form) { var P = PAGE[act]; return opsToSvg(pageBackground(act, form), P.w, P.h); }
  };
})(typeof window !== 'undefined' ? window : this);

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
    function modelOrder(key) {
      var s = settings().aiModel; if (s) return [s];
      var c = J(secret('aiModels'), {}); var list = c.list || [];
      if (!list.length || now() - Number(c.ts || 0) > 24 * 3600 * 1000) { try { list = listModels(key); } catch (e) { if (!list.length) throw e; } }
      var bad = J(secret('aiBad'), {}); var ok = list.filter(function (m) { return !bad[m]; });
      return (ok.length ? ok : list).slice(0, 4);
    }
    function callModel(key, prep) {
      var models = modelOrder(key), lastErr = null;
      for (var i = 0; i < models.length; i++) {
        var m = models[i];
        var r = DB().http(API + 'models/' + encodeURIComponent(m) + ':generateContent', { method: 'post', headers: { 'x-goog-api-key': key }, payload: JSON.stringify(E.geminiBody(prep.prompt, prep.images)) });
        countCall();
        if (r.code === 200) return { text: E.geminiText(J(r.text)), model: m };
        if (r.code === 429) { var e = new Error('تم بلوغ حد الطلبات المجاني مؤقتاً (429)'); e.quota = true; throw e; }
        if (r.code === 404 || (r.code === 400 && /not (found|supported)|unsupported/i.test(r.text))) { var bad = J(secret('aiBad'), {}); bad[m] = 1; setSecret('aiBad', JSON.stringify(bad)); lastErr = new Error(httpMsg(r)); continue; }
        if (r.code === 401 || r.code === 403) { var e2 = new Error('مفتاح Gemini غير صالح أو غير مفعّل (' + r.code + ')'); e2.fatal = true; throw e2; }
        lastErr = new Error(httpMsg(r)); if (r.code >= 500) lastErr.later = true; break;
      }
      throw lastErr || new Error('لا يوجد نموذج متاح');
    }
    // يعالج مهام التصحيح المتاحة ضمن ميزانية زمنية — يستدعيه المشغّل الزمني أو زر «صحّح الآن»
    function processQueue(budgetMs, maxJobs) {
      var key = secret('GEMINI_KEY'), S = settings(), started = now(), done = 0, errors = 0, stopped = '';
      if (!key || S.aiEnabled === '0') return { done: 0, stopped: 'الذكاء الاصطناعي غير مفعّل أو لا يوجد مفتاح' };
      if (!DB().http) return { done: 0, stopped: 'unsupported' };
      var pace = Math.max(0, Number(S.aiPace || 5)) * 1000, cap = Number(S.aiDailyMax || 250);
      while (now() - started < budgetMs && done + errors < (maxJobs || 1000)) {
        if (todayCalls() >= cap) { stopped = 'تم بلوغ الحد اليومي المحدد (' + cap + ' طلباً)'; break; }
        var job = nextJobs(1)[0]; if (!job) break;
        var prep = null;
        try { prep = prepareJob(job); } catch (e) { DB().lock(function () { failJob(job, e.message); }); errors++; continue; }
        if (!prep || prep.skip) { DB().lock(function () { DB().update('TJobs', 'jobId', job.jobId, { status: 'done', doneAt: now(), error: 'لا توجد بيانات للتصحيح' }); settleResult(job.resultId); }); continue; }
        var out = null, callErr = null;
        try { out = callModel(key, prep); } catch (e) { callErr = e; }
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
        todayCalls: todayCalls(), dailyMax: Number(settings().aiDailyMax || 250), trigger: DB().trigger ? DB().trigger('status') : 'غير متاح', serverAI: !!DB().http, dirty: secret('ttDirty') === '1'
      };
    }
    function aiSaveKey(p) {
      var s = K.staffAuth(p.token); K.need(s, ['admin']);
      var k = str(p.key);
      if (k && !/^[A-Za-z0-9_\-]{20,80}$/.test(k)) err('صيغة المفتاح غير صحيحة');
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
      var out = callModel(key, { prompt: 'Reply with JSON only: {"ok":true,"msg":"مرحبا"}', images: [] });
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
