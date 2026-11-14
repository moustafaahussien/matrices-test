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
