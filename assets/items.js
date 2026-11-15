/* =====================================================================
   items.js — مولّد بنود اختبار المصفوفات (على نمط مصفوفات رافن)
   بنود أصلية تُولَّد رياضياً بقواعد ثابتة لكل بند، وتختلف قيمها بين النماذج
   المرحلة الابتدائية: 36 بنداً ملوناً (أ، أب، ب)
   المرحلة المتوسطة : 60 بنداً (أ، ب، ج، د، هـ)
   المرحلة الثانوية : 12 بنداً تمهيدياً + 36 بنداً متقدماً
   ===================================================================== */
(function (G) {
  'use strict';
  const VERSION = 'rv1';

  /* ---------------- مولّد أرقام عشوائية ثابت (seeded) ---------------- */
  function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  class Rng {
    constructor(seed) { this.f = mulberry32(seed); }
    r() { return this.f(); }
    i(n) { return Math.floor(this.f() * n); }
    pick(a) { return a[this.i(a.length)]; }
    shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = this.i(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    sample(a, k) { return this.shuffle(a).slice(0, k); }
    range(lo, hi) { return lo + this.i(hi - lo + 1); }
  }

  /* ---------------- الألوان والأشكال ---------------- */
  const INK = '#1a1a1a';
  const FILL = { w: '#ffffff', b: '#1a1a1a', g: '#9b9b9b', h: 'url(#rvh)', r: '#e0483e', u: '#3d7fd6', y: '#f2c12e', e: '#3fa457', p: '#8e5cc4', o: '#f08a24' };
  const BW_FILLS = ['w', 'g', 'b', 'h'];
  const COLOR_FILLS = ['r', 'u', 'y', 'e', 'p', 'o'];
  const DEFS = '<defs><pattern id="rvh" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="#1a1a1a" stroke-width="2.4"/></pattern></defs>';
  const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'cross'];
  const OUTER_SHAPES = ['circle', 'square', 'hexagon', 'pentagon', 'diamond'];
  const INNER_SHAPES = ['circle', 'square', 'triangle', 'diamond'];
  const SYM = { circle: 1, square: 90, triangle: 120, diamond: 180, pentagon: 72, hexagon: 60, star: 72, cross: 90, arrow: 360 };
  function normRot(shape, rot) { const s = SYM[shape] || 360; if (s === 1) return 0; return (((Math.round(rot) % s) + s) % s); }

  function f1(n) { return Math.round(n * 10) / 10; }
  function P(pts) { return pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' '); }
  function polyPts(n, cx, cy, r, startDeg) { const p = []; for (let k = 0; k < n; k++) { const a = (startDeg + 360 * k / n) * Math.PI / 180; p.push([cx + r * Math.sin(a), cy - r * Math.cos(a)]); } return p; }

  function shapeEl(type, cx, cy, r, rot, fill, sw) {
    sw = sw || Math.max(1.6, Math.min(3, r / 6));
    const f = FILL[fill] || fill || '#fff';
    const st = `fill="${f}" stroke="${INK}" stroke-width="${f1(sw)}" stroke-linejoin="round"`;
    let el;
    switch (type) {
      case 'circle': el = `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" ${st}/>`; break;
      case 'square': el = `<polygon points="${P(polyPts(4, cx, cy, r * 1.12, 45))}" ${st}/>`; break;
      case 'triangle': el = `<polygon points="${P(polyPts(3, cx, cy + r * 0.18, r * 1.22, 0))}" ${st}/>`; break;
      case 'diamond': el = `<polygon points="${P([[cx, cy - r * 1.15], [cx + r * 0.8, cy], [cx, cy + r * 1.15], [cx - r * 0.8, cy]])}" ${st}/>`; break;
      case 'pentagon': el = `<polygon points="${P(polyPts(5, cx, cy + r * 0.06, r * 1.1, 0))}" ${st}/>`; break;
      case 'hexagon': el = `<polygon points="${P(polyPts(6, cx, cy, r * 1.06, 30))}" ${st}/>`; break;
      case 'star': { const p = []; for (let k = 0; k < 10; k++) { const a = k * 36 * Math.PI / 180, rr = k % 2 ? r * 0.52 : r * 1.25; p.push([cx + rr * Math.sin(a), cy - rr * Math.cos(a)]); } el = `<polygon points="${P(p)}" ${st}/>`; break; }
      case 'cross': { const a = r * 1.05, w = r * 0.38; el = `<polygon points="${P([[cx - w, cy - a], [cx + w, cy - a], [cx + w, cy - w], [cx + a, cy - w], [cx + a, cy + w], [cx + w, cy + w], [cx + w, cy + a], [cx - w, cy + a], [cx - w, cy + w], [cx - a, cy + w], [cx - a, cy - w], [cx - w, cy - w]])}" ${st}/>`; break; }
      case 'arrow': el = `<polygon points="${P([[cx, cy - r * 1.15], [cx + r * 0.72, cy - r * 0.12], [cx + r * 0.27, cy - r * 0.12], [cx + r * 0.27, cy + r * 1.1], [cx - r * 0.27, cy + r * 1.1], [cx - r * 0.27, cy - r * 0.12], [cx - r * 0.72, cy - r * 0.12]])}" ${st}/>`; break;
      default: el = '';
    }
    if (rot && SYM[type] !== 1) el = `<g transform="rotate(${rot} ${f1(cx)} ${f1(cy)})">${el}</g>`;
    return el;
  }

  /* ---------------- خلية المصفوفة: أشكال + خطوط ---------------- */
  const LAYOUT = {
    1: [[50, 50]], 2: [[28, 50], [72, 50]], 3: [[50, 29], [27, 70], [73, 70]], 4: [[29, 29], [71, 29], [29, 71], [71, 71]],
    5: [[24, 24], [76, 24], [50, 50], [24, 76], [76, 76]], 6: [[20, 32], [50, 32], [80, 32], [20, 68], [50, 68], [80, 68]]
  };
  const BASE_R = { 1: 33, 2: 20, 3: 18, 4: 17, 5: 14, 6: 13 };
  const SIZE_F = [0.52, 0.76, 1.0];

  // مجموعات الخطوط: E = عناصر داخل الخلية (المجموعة هـ)، F = عناصر إطارية (المتقدم)
  const SEGS = {
    E: [['l', 20, 20, 80, 20], ['l', 20, 80, 80, 80], ['l', 20, 20, 20, 80], ['l', 80, 20, 80, 80], ['l', 20, 50, 80, 50], ['l', 50, 20, 50, 80],
      ['l', 20, 20, 80, 80], ['l', 80, 20, 20, 80], ['c', 50, 50, 11, 'n'], ['c', 50, 50, 31, 'n'], ['r', 36, 36, 28, 28], ['c', 50, 50, 4.5, 'f']],
    F: [['l', 6, 6, 94, 6], ['l', 6, 94, 94, 94], ['l', 6, 6, 6, 94], ['l', 94, 6, 94, 94], ['l', 6, 6, 22, 22], ['l', 94, 6, 78, 22],
      ['l', 6, 94, 22, 78], ['l', 94, 94, 78, 78], ['l', 50, 6, 50, 19], ['l', 50, 94, 50, 81], ['l', 6, 50, 19, 50], ['l', 94, 50, 81, 50]]
  };
  function renderSegs(mask, set) {
    if (!mask) return '';
    const L = SEGS[set || 'E']; let lines = '', others = '';
    for (let k = 0; k < L.length; k++) {
      if (!((mask >> k) & 1)) continue;
      const e = L[k];
      if (e[0] === 'l') lines += `<line x1="${e[1]}" y1="${e[2]}" x2="${e[3]}" y2="${e[4]}" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`;
      else if (e[0] === 'c') others += `<circle cx="${e[1]}" cy="${e[2]}" r="${e[3]}" fill="${e[4] === 'f' ? INK : 'none'}" stroke="${INK}" stroke-width="3"/>`;
      else if (e[0] === 'r') others += `<rect x="${e[1]}" y="${e[2]}" width="${e[3]}" height="${e[4]}" fill="none" stroke="${INK}" stroke-width="3"/>`;
    }
    return lines + others;
  }
  function renderSpec(c) {
    if (!c || !c.shape) return '';
    const n = c.count || 1, pos = LAYOUT[n] || LAYOUT[1], sc = c.scale || 1;
    const r = BASE_R[n] * SIZE_F[c.size == null ? 2 : c.size] * sc;
    let s = '';
    for (const [x, y] of pos) {
      const cx = 50 + (x - 50) * sc, cy = 50 + (y - 50) * sc;
      s += shapeEl(c.shape, cx, cy, r, c.rot || 0, c.fill || 'w');
      if (c.inner) s += shapeEl(c.inner, cx, cy, r * 0.42, 0, c.innerFill || 'b', Math.max(1.2, r / 14));
    }
    return s;
  }
  function renderCell(c) { return c ? renderSegs(c.segs, c.segSet) + renderSpec(c) : ''; }
  function cellKey(c) {
    const o = {};
    if (c.shape) { o.s = c.shape; o.n = c.count || 1; o.z = c.size == null ? 2 : c.size; o.f = c.fill || 'w'; o.r = normRot(c.shape, c.rot || 0); o.i = c.inner || ''; }
    if (c.segs != null) o.g = c.segs;
    return JSON.stringify(o);
  }
  const clone = o => JSON.parse(JSON.stringify(o));

  function tileSvg(inner, cls) { return `<svg viewBox="0 0 100 100" class="${cls || 'rv-opt'}" xmlns="http://www.w3.org/2000/svg">${DEFS}<rect x="0" y="0" width="100" height="100" fill="#fff"/>${inner}</svg>`; }
  function qMark(x, y, w, h) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#eef1f4"/><text x="${x + w / 2}" y="${y + h / 2 + 15}" text-anchor="middle" font-size="44" font-family="Arial" font-weight="700" fill="#8a96a3">?</text>`; }
  function matrixSvg(cells, n) {
    const S = n * 100;
    let s = `<svg viewBox="-2 -2 ${S + 4} ${S + 4}" class="rv-stem rv-m${n}" xmlns="http://www.w3.org/2000/svg">${DEFS}<rect x="-2" y="-2" width="${S + 4}" height="${S + 4}" fill="#fff"/>`;
    cells.forEach((c, k) => {
      const i = Math.floor(k / n), j = k % n, x = j * 100, y = i * 100;
      s += c ? `<g transform="translate(${x},${y})">${renderCell(c)}</g>` : qMark(x, y, 100, 100);
      s += `<rect x="${x}" y="${y}" width="100" height="100" fill="none" stroke="#3a3a3a" stroke-width="1.4"/>`;
    });
    return s + '</svg>';
  }

  /* =====================================================================
     النوع الأول: إكمال النمط (المجموعة أ) — فتحة في نسيج
     ===================================================================== */
  const AW = 240, AH = 180, HS = 64;
  const PAL_BG = ['#f6d55c', '#f5b06b', '#9fd3f0', '#b6e3a1', '#f7b8c8', '#d5c6f2'];
  const PAL_INK = ['#c0392b', '#1f5fa8', '#1e7a3c', '#6b3fa0', '#1a1a1a', '#b9560f'];

  function stripesEl(angle, sp, w, ph, ink) {
    let s = `<g transform="rotate(${angle} ${AW / 2} ${AH / 2})" stroke="${ink}" stroke-width="${f1(w)}">`;
    for (let y = -220 + ph; y <= AH + 220; y += sp) s += `<line x1="-220" y1="${f1(y)}" x2="${AW + 220}" y2="${f1(y)}"/>`;
    return s + '</g>';
  }
  function sceneBody(p) {
    const ink = p.ink || INK; let s = '';
    switch (p.type) {
      case 'solid': return '';
      case 'stripes': return stripesEl(p.angle || 0, p.sp, p.w, p.ph || 0, ink);
      case 'grid': return stripesEl(p.angle || 0, p.sp, p.w, 0, ink) + stripesEl((p.angle || 0) + 90, p.sp, p.w, 0, ink);
      case 'dots':
        for (let y = (p.oy || 0) - p.sp; y < AH + p.sp; y += p.sp) for (let x = (p.ox || 0) - p.sp; x < AW + p.sp; x += p.sp)
          s += p.shape === 'square' ? `<rect x="${f1(x - p.rad)}" y="${f1(y - p.rad)}" width="${f1(2 * p.rad)}" height="${f1(2 * p.rad)}" fill="${ink}"/>` : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(p.rad)}" fill="${ink}"/>`;
        return s;
      case 'checker':
        for (let i = -1; i * p.c < AH + p.c; i++) for (let j = -1; j * p.c < AW + p.c; j++) if ((((i + j) % 2) + 2) % 2 === p.ph) s += `<rect x="${j * p.c}" y="${i * p.c}" width="${p.c}" height="${p.c}" fill="${ink}"/>`;
        return s;
      case 'alt': {
        const ang = p.orient === 'h' ? 0 : 90;
        s = `<g transform="rotate(${ang} ${AW / 2} ${AH / 2})" stroke="${ink}">`;
        for (let y = -220 + (p.ph || 0); y <= AH + 220; y += p.P) {
          s += `<line x1="-220" y1="${f1(y)}" x2="${AW + 220}" y2="${f1(y)}" stroke-width="${p.thick}"/>`;
          s += `<line x1="-220" y1="${f1(y + p.P / 2)}" x2="${AW + 220}" y2="${f1(y + p.P / 2)}" stroke-width="${p.thin}"/>`;
        }
        return s + '</g>';
      }
      case 'rows': {
        let ri = 0;
        for (let y = -p.sp + p.sp / 2; y < AH + p.sp; y += p.sp, ri++) { let ci = 0; for (let x = -p.sp + p.sp / 2; x < AW + p.sp; x += p.sp, ci++) {
          const idx = p.orient === 'cols' ? ci : ri; const filled = p.all === 'f' ? true : p.all === 'h' ? false : ((idx + p.ph) % 2 === 0);
          s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${p.rad}" fill="${filled ? ink : 'none'}" stroke="${ink}" stroke-width="2"/>`; } }
        return s;
      }
      case 'waves': {
        for (let k = -2; k * p.sp < (p.vertical ? AW : AH) + 2 * p.sp; k++) {
          const base = k * p.sp + (p.off || 0); const pts = [];
          for (let t = -12; t <= (p.vertical ? AH : AW) + 12; t += 4) { const d = base + p.amp * Math.sin(2 * Math.PI * (t + (p.ph || 0)) / p.wl); pts.push(p.vertical ? [d, t] : [t, d]); }
          s += `<polyline points="${P(pts)}" fill="none" stroke="${ink}" stroke-width="${p.w || 2.6}"/>`;
        }
        return s;
      }
      case 'lines': {
        const L = 400, w = p.w || 4, cx = p.cx, cy = p.cy;
        const ln = (dx, dy) => `<line x1="${f1(cx - dx * L)}" y1="${f1(cy - dy * L)}" x2="${f1(cx + dx * L)}" y2="${f1(cy + dy * L)}" stroke="${ink}" stroke-width="${w}"/>`;
        if (p.kind === 'x' || p.kind === 'd1') s += ln(0.7071, 0.7071);
        if (p.kind === 'x' || p.kind === 'd2') s += ln(0.7071, -0.7071);
        if (p.kind === '+') s += ln(1, 0) + ln(0, 1);
        return s;
      }
      case 'split':
        return `<svg x="0" y="0" width="${p.sx}" height="${AH}" viewBox="0 0 ${p.sx} ${AH}">${sceneBody(Object.assign({ ink }, p.left))}</svg>` +
          `<svg x="${p.sx}" y="0" width="${AW - p.sx}" height="${AH}" viewBox="${p.sx} 0 ${AW - p.sx} ${AH}">${sceneBody(Object.assign({ ink }, p.right))}</svg>` +
          `<line x1="${p.sx}" y1="-10" x2="${p.sx}" y2="${AH + 10}" stroke="${ink}" stroke-width="3"/>`;
      case 'grad':
        for (let y = p.sp / 2; y < AH + p.sp; y += p.sp) for (let x = p.sp / 2; x < AW + p.sp; x += p.sp) {
          let t = p.dir === 'y' ? y / AH : p.dir === '-x' ? 1 - x / AW : p.dir === 'u' ? 0.5 : x / AW; t = Math.max(0, Math.min(1, t));
          const r = p.rmin + (p.rmax - p.rmin) * t;
          s += p.shape === 'square' ? `<rect x="${f1(x - r)}" y="${f1(y - r)}" width="${f1(2 * r)}" height="${f1(2 * r)}" fill="${ink}"/>` : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${ink}"/>`;
        }
        return s;
      case 'rings':
        for (let k = 1; k * p.step < 360; k++) {
          const R = k * p.step;
          s += p.shape === 'square' ? `<rect x="${f1(p.cx - R)}" y="${f1(p.cy - R)}" width="${2 * R}" height="${2 * R}" fill="none" stroke="${ink}" stroke-width="${p.w || 2.6}"/>` : `<circle cx="${f1(p.cx)}" cy="${f1(p.cy)}" r="${R}" fill="none" stroke="${ink}" stroke-width="${p.w || 2.6}"/>`;
        }
        if (p.cross) s += `<line x1="-20" y1="${p.cy}" x2="${AW + 20}" y2="${p.cy}" stroke="${ink}" stroke-width="3"/>`;
        return s;
    }
    return s;
  }
  function scene(p) { return `<rect x="-20" y="-20" width="${AW + 40}" height="${AH + 40}" fill="${p.bg || '#fff'}"/>` + sceneBody(p); }

  function itemPattern(name, r, colored, nOpt) {
    const bg = colored ? r.pick(PAL_BG) : '#ffffff';
    const ink = colored ? r.pick(PAL_INK) : INK;
    const altBg = colored ? r.pick(PAL_BG.filter(b => b !== bg)) : null;
    let hx = r.range(22, 154), hy = r.range(18, 98);
    const mk = o => Object.assign({ bg, ink }, o);
    const blank = mk({ type: 'solid' });
    let Pm, D = [];
    const sp = r.pick([12, 14, 16]);
    switch (name) {
      case 'solid':
        Pm = mk({ type: 'solid' });
        D = r.sample(PAL_BG.filter(b => b !== bg), 3).map(b => ({ bg: b, type: 'solid' }));
        D.push(mk({ type: 'stripes', angle: 0, sp: 14, w: 4 }), mk({ type: 'dots', sp: 16, rad: 4 }));
        break;
      case 'hstripes': case 'vstripes': {
        const a = name === 'hstripes' ? 0 : 90, w = sp * 0.36;
        Pm = mk({ type: 'stripes', angle: a, sp, w });
        D = [mk({ type: 'stripes', angle: 90 - a, sp, w }), mk({ type: 'stripes', angle: 45, sp, w }), mk({ type: 'stripes', angle: a, sp: sp * 2, w: w * 2 }), mk({ type: 'dots', sp: sp + 4, rad: 3.6 }), blank];
        break;
      }
      case 'dots': {
        const s2 = r.pick([16, 18, 20]), rad = r.pick([3.5, 4, 4.5]), ox = r.range(0, s2 - 1), oy = r.range(0, s2 - 1);
        Pm = mk({ type: 'dots', sp: s2, rad, ox, oy });
        D = [mk({ type: 'dots', sp: s2, rad: rad * 2, ox, oy }), mk({ type: 'dots', sp: s2, rad, ox, oy, shape: 'square' }), mk({ type: 'dots', sp: Math.round(s2 * 0.6), rad: rad * 0.7, ox, oy }), mk({ type: 'stripes', angle: 0, sp: s2, w: 3 }), blank];
        break;
      }
      case 'diag': {
        const a = r.pick([45, -45]), w = sp * 0.34;
        Pm = mk({ type: 'stripes', angle: a, sp, w });
        D = [mk({ type: 'stripes', angle: -a, sp, w }), mk({ type: 'stripes', angle: 0, sp, w }), mk({ type: 'stripes', angle: 90, sp, w }), mk({ type: 'stripes', angle: a, sp: sp * 2, w: w * 2.2 }), blank];
        break;
      }
      case 'checker': {
        const c = r.pick([14, 16, 18]), ph = r.i(2);
        Pm = mk({ type: 'checker', c, ph });
        D = [mk({ type: 'checker', c, ph: 1 - ph }), mk({ type: 'checker', c: c * 2, ph }), mk({ type: 'stripes', angle: 0, sp: c, w: c / 2 }), mk({ type: 'dots', sp: c, rad: c * 0.35 }), blank];
        break;
      }
      case 'grid': {
        const s2 = r.pick([18, 20, 22]), a = r.pick([0, 45]);
        Pm = mk({ type: 'grid', sp: s2, w: 2.6, angle: a });
        D = [mk({ type: 'stripes', angle: a, sp: s2, w: 2.6 }), mk({ type: 'stripes', angle: a + 90, sp: s2, w: 2.6 }), mk({ type: 'grid', sp: s2, w: 2.6, angle: a + 45 }), mk({ type: 'grid', sp: Math.round(s2 * 1.7), w: 2.6, angle: a }), blank];
        break;
      }
      case 'alt': {
        const Pp = r.pick([24, 26, 28]), o = r.pick(['v', 'h']), ph = r.range(0, Pp - 1);
        Pm = mk({ type: 'alt', P: Pp, thick: 8, thin: 2.4, orient: o, ph });
        D = [mk({ type: 'stripes', angle: o === 'h' ? 0 : 90, sp: Pp / 2, w: 2.4, ph }), mk({ type: 'stripes', angle: o === 'h' ? 0 : 90, sp: Pp / 2, w: 8, ph }),
          mk({ type: 'alt', P: Pp, thick: 8, thin: 2.4, orient: o === 'h' ? 'v' : 'h', ph }), mk({ type: 'alt', P: Pp, thick: 8, thin: 2.4, orient: o, ph: ph + Pp / 2 }), blank];
        break;
      }
      case 'rows': {
        const s2 = r.pick([20, 22, 24]), rad = r.pick([5.5, 6, 6.5]), ph = r.i(2);
        Pm = mk({ type: 'rows', sp: s2, rad, ph, orient: 'rows' });
        D = [mk({ type: 'rows', sp: s2, rad, ph, all: 'f' }), mk({ type: 'rows', sp: s2, rad, ph, all: 'h' }), mk({ type: 'rows', sp: s2, rad, ph: 1 - ph, orient: 'rows' }), mk({ type: 'rows', sp: s2, rad, ph, orient: 'cols' }), blank];
        break;
      }
      case 'waves': {
        const amp = r.pick([5, 6, 7]), wl = r.pick([40, 44, 48]), s2 = r.pick([16, 18, 20]), ph = r.range(0, wl - 1);
        Pm = mk({ type: 'waves', amp, wl, sp: s2, ph });
        D = [mk({ type: 'stripes', angle: 0, sp: s2, w: 2.6 }), mk({ type: 'waves', amp, wl, sp: s2, ph: ph + wl / 2 }), mk({ type: 'waves', amp, wl, sp: s2, ph, vertical: true }), mk({ type: 'waves', amp: amp * 2, wl: wl / 2, sp: s2 * 1.4, ph }), blank];
        break;
      }
      case 'lines': {
        const cx = hx + HS / 2 + r.range(-6, 6), cy = hy + HS / 2 + r.range(-6, 6), w = r.pick([4, 5]);
        Pm = mk({ type: 'lines', kind: 'x', cx, cy, w });
        D = [mk({ type: 'lines', kind: 'd1', cx, cy, w }), mk({ type: 'lines', kind: 'd2', cx, cy, w }), mk({ type: 'lines', kind: '+', cx, cy, w }), mk({ type: 'lines', kind: 'x', cx: cx + 20, cy, w }), blank];
        break;
      }
      case 'split': {
        const sx = hx + r.range(24, 40);
        const A = { type: 'stripes', angle: 0, sp, w: sp * 0.34 }, B = r.i(2) ? { type: 'stripes', angle: 90, sp, w: sp * 0.34 } : { type: 'dots', sp: 16, rad: 4, ox: 3, oy: 5 };
        Pm = mk({ type: 'split', sx, left: A, right: B });
        D = [mk(A), mk(B), mk({ type: 'split', sx, left: B, right: A }), mk({ type: 'split', sx: sx + (sx - hx > 32 ? -20 : 20), left: A, right: B }), mk({ type: 'split', sx, left: A, right: { type: 'stripes', angle: 45, sp, w: sp * 0.34 } })];
        break;
      }
      case 'grad': {
        const dir = r.pick(['x', 'y']);
        if (dir === 'x') hx = r.range(150, 168); else hy = r.range(100, 110);
        const sh = colored ? 'circle' : r.pick(['circle', 'square']);
        const g = { sp: 20, rmin: 1.6, rmax: 9, shape: sh };
        Pm = mk(Object.assign({ type: 'grad', dir }, g));
        D = [mk(Object.assign({ type: 'grad', dir: dir === 'x' ? '-x' : 'u' }, g, dir === 'y' ? { rmin: 1.6, rmax: 3 } : {})), mk(Object.assign({ type: 'grad', dir: 'u' }, g, { rmin: 5, rmax: 5 })),
          mk(Object.assign({ type: 'grad', dir: dir === 'x' ? 'y' : 'x' }, g)), mk(Object.assign({ type: 'grad', dir }, g, { shape: sh === 'circle' ? 'square' : 'circle' })), blank];
        break;
      }
      case 'rings': {
        const cx = hx + r.range(22, 42), cy = hy + r.range(22, 42), step = r.pick([9, 10, 11]);
        Pm = mk({ type: 'rings', cx, cy, step });
        D = [mk({ type: 'rings', cx: cx + (cx > AW / 2 ? -60 : 60), cy: cy + 10, step }), mk({ type: 'rings', cx, cy, step: step * 2 }), mk({ type: 'rings', cx, cy, step, shape: 'square' }), mk({ type: 'rings', cx, cy, step, cross: true }), blank];
        break;
      }
    }
    if (colored && name !== 'solid') D.splice(2, 0, Object.assign({}, Pm, { bg: altBg }));
    D = D.slice(0, nOpt - 1);
    const stem = `<svg viewBox="0 0 ${AW} ${AH}" class="rv-stem rv-pat" xmlns="http://www.w3.org/2000/svg">${scene(Pm)}<rect x="${hx}" y="${hy}" width="${HS}" height="${HS}" fill="#fff" stroke="${INK}" stroke-width="1.6"/><rect x="0.8" y="0.8" width="${AW - 1.6}" height="${AH - 1.6}" fill="none" stroke="${INK}" stroke-width="1.6"/></svg>`;
    const optSvg = p => `<svg viewBox="${hx} ${hy} ${HS} ${HS}" class="rv-opt" xmlns="http://www.w3.org/2000/svg">${scene(p)}</svg>`;
    return { layout: 'pattern', stem, ans: optSvg(Pm), dis: D.map(optSvg) };
  }

  /* =====================================================================
     النوع الثاني: الشكل الرباعي المتماثل (المجموعة أب — الابتدائي)
     ===================================================================== */
  const QBG = '#fdf3d0';
  function motifSvg(m) {
    let s = `<rect x="0" y="0" width="100" height="100" fill="${QBG}"/>`;
    m.forEach(p => { if (p.t === 'l') s += `<line x1="${f1(p.x1)}" y1="${f1(p.y1)}" x2="${f1(p.x2)}" y2="${f1(p.y2)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`; });
    m.forEach(p => { if (p.t === 's') s += shapeEl(p.shape, p.x, p.y, p.r, p.rot || 0, p.fill); });
    return s;
  }
  function motifKey(m) {
    return m.map(p => p.t === 'l'
      ? 'l' + [[Math.round(p.x1), Math.round(p.y1)], [Math.round(p.x2), Math.round(p.y2)]].sort((a, b) => a[0] - b[0] || a[1] - b[1]).join(';')
      : ['s', p.shape, Math.round(p.x), Math.round(p.y), Math.round(p.r), normRot(p.shape, p.rot || 0), p.fill].join(',')).sort().join('|');
  }
  const TF = {
    id: m => clone(m),
    mX: m => m.map(p => p.t === 'l' ? Object.assign({}, p, { x1: 100 - p.x1, x2: 100 - p.x2 }) : Object.assign({}, p, { x: 100 - p.x, rot: -(p.rot || 0) })),
    mY: m => m.map(p => p.t === 'l' ? Object.assign({}, p, { y1: 100 - p.y1, y2: 100 - p.y2 }) : Object.assign({}, p, { y: 100 - p.y, rot: 180 - (p.rot || 0) })),
    r90: m => m.map(p => p.t === 'l' ? Object.assign({}, p, { x1: 100 - p.y1, y1: p.x1, x2: 100 - p.y2, y2: p.x2 }) : Object.assign({}, p, { x: 100 - p.y, y: p.x, rot: (p.rot || 0) + 90 }))
  };
  TF.mXY = m => TF.mY(TF.mX(m));
  TF.r180 = m => TF.r90(TF.r90(m));
  TF.r270 = m => TF.r90(TF.r180(m));
  function recolor(m, map) { return m.map(p => p.t === 's' ? Object.assign({}, p, { fill: map[p.fill] || p.fill }) : Object.assign({}, p)); }

  function randMotif(r, nPrims) {
    const cols = r.sample(COLOR_FILLS, 3);
    let x = r.range(22, 34), y = r.range(22, 34); if (Math.abs(x - y) < 6) y = x + 8;
    let rot = r.pick([45, 90, 180, 225, 270]);
    const m = [{ t: 's', shape: 'arrow', x, y, r: 13, rot, fill: cols[0] }];
    if (nPrims >= 2) m.push({ t: 's', shape: r.pick(['circle', 'square', 'diamond']), x: r.range(64, 76), y: r.range(60, 74), r: 10, rot: 0, fill: cols[1] });
    if (nPrims >= 3) { const a = r.range(48, 70); m.unshift({ t: 'l', x1: 100, y1: a, x2: r.range(52, 64), y2: 100 }); }
    return m;
  }
  function centered(shape, fill, size) { return [{ t: 's', shape, x: 50, y: 50, r: size || 30, rot: 0, fill }]; }

  const AB_PLAN = ['same', 'rows', 'cols', 'sym1', 'pin1', 'sym2', 'color', 'pin2', 'sym3', 'mirrorRows', 'pin3', 'symColor'];
  function itemQuad(kind, r, nOpt) {
    let TL, TR, BL, BR, cands = [];
    const cs = r.sample(COLOR_FILLS, 4), shs = r.sample(['circle', 'square', 'triangle', 'star', 'hexagon', 'cross', 'diamond'], 4);
    if (kind === 'same') {
      TL = TR = BL = BR = centered(shs[0], cs[0]);
      cands = [centered(shs[0], cs[1]), centered(shs[1], cs[0]), centered(shs[1], cs[1]), centered(shs[0], cs[0], 18), centered(shs[2], cs[2])];
    } else if (kind === 'rows' || kind === 'cols') {
      const a = centered(shs[0], cs[0]), b = centered(shs[1], cs[1]);
      if (kind === 'rows') { TL = TR = a; BL = BR = b; } else { TL = BL = a; TR = BR = b; }
      cands = [a, centered(shs[1], cs[0]), centered(shs[0], cs[1]), centered(shs[2], cs[1]), centered(shs[1], cs[2])];
    } else if (kind === 'color') {
      TL = centered(shs[0], cs[0]); TR = centered(shs[0], cs[1]); BL = centered(shs[1], cs[0]); BR = centered(shs[1], cs[1]);
      cands = [BL, TR, TL, centered(shs[1], cs[2]), centered(shs[2], cs[1])];
    } else {
      const n = /\d/.test(kind) ? +kind.slice(-1) : 3;
      const m = randMotif(r, n);
      if (kind.startsWith('sym')) { TL = m; TR = TF.mX(m); BL = TF.mY(m); BR = TF.mXY(m); }
      else if (kind.startsWith('pin')) { TL = m; TR = TF.r90(m); BR = TF.r180(m); BL = TF.r270(m); }
      else if (kind === 'mirrorRows') { const m2 = randMotif(r, 2); TL = m; TR = TF.mX(m); BL = m2; BR = TF.mX(m2); }
      else if (kind === 'symColor') { const map = {}; m.forEach(p => { if (p.t === 's') map[p.fill] = r.pick(COLOR_FILLS.filter(c => c !== p.fill)); }); TL = m; TR = TF.mX(m); BL = recolor(TF.mY(m), map); BR = recolor(TF.mXY(m), map); }
      const src = kind === 'mirrorRows' ? BL : TL;
      cands = [TF.id(src), TF.mX(src), TF.mY(src), TF.mXY(src), TF.r90(src), TF.r270(src), TF.mY(BR), TF.mX(BR)];
      if (kind === 'symColor') cands.push(TF.mXY(TL), recolor(TF.mXY(TL), {}));
      cands = r.shuffle(cands);
    }
    const ak = motifKey(BR), seen = new Set([ak]), dis = [];
    for (const c of cands) { const k = motifKey(c); if (!seen.has(k)) { seen.add(k); dis.push(c); } if (dis.length >= nOpt - 1) break; }
    let guard = 0;
    while (dis.length < nOpt - 1 && guard++ < 50) { const c = centered(r.pick(shs), r.pick(cs), r.pick([18, 24, 30])); const k = motifKey(c); if (!seen.has(k)) { seen.add(k); dis.push(c); } }
    const stem = `<svg viewBox="-4 -4 208 208" class="rv-stem rv-quad" xmlns="http://www.w3.org/2000/svg"><rect x="-4" y="-4" width="208" height="208" fill="#fff"/>` +
      `<g>${motifSvg(TL)}</g><g transform="translate(100,0)">${motifSvg(TR)}</g><g transform="translate(0,100)">${motifSvg(BL)}</g>` + qMark(100, 100, 100, 100) +
      `<rect x="100" y="100" width="100" height="100" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="5 4"/><rect x="0" y="0" width="200" height="200" fill="none" stroke="${INK}" stroke-width="2"/></svg>`;
    const opt = m => `<svg viewBox="0 0 100 100" class="rv-opt" xmlns="http://www.w3.org/2000/svg">${motifSvg(m)}</svg>`;
    return { layout: 'quad', stem, ans: opt(BR), dis: dis.map(opt) };
  }

  /* =====================================================================
     النوع الثالث: التناظر 2×2 (المجموعة ب)
     ===================================================================== */
  const SPM_B = [
    { X: ['fill'], Y: ['shape'] }, { X: ['size'], Y: ['shape'] }, { X: ['count'], Y: ['fill'] }, { X: ['shape'], Y: ['count'] },
    { X: ['rot'], Y: ['fill'] }, { X: ['fill'], Y: ['size'] }, { X: ['inner'], Y: ['shape'] }, { X: ['count', 'fill'], Y: ['shape'] },
    { X: ['rot'], Y: ['count'] }, { X: ['size', 'fill'], Y: ['shape'] }, { X: ['shape', 'count'], Y: ['fill', 'size'] }, { X: ['rot', 'count'], Y: ['fill', 'size'] }
  ];
  const CPM_B = [
    { X: ['fill'], Y: ['shape'] }, { X: ['shape'], Y: ['fill'] }, { X: ['size'], Y: ['fill'] }, { X: ['count'], Y: ['shape'] },
    { X: ['fill'], Y: ['count'] }, { X: ['rot'], Y: ['fill'] }, { X: ['inner'], Y: ['fill'] }, { X: ['fill', 'size'], Y: ['shape'] },
    { X: ['shape'], Y: ['count'] }, { X: ['shape', 'fill'], Y: ['size'] }, { X: ['rot'], Y: ['fill', 'count'] }, { X: ['count', 'fill'], Y: ['shape', 'size'] }
  ];
  function domainOf(attr, ctx) {
    switch (attr) {
      case 'fill': return ctx.inner ? ctx.fills.filter(f => f !== 'b') : ctx.fills;
      case 'shape': return ctx.inner ? OUTER_SHAPES : SHAPES;
      case 'size': return [0, 1, 2];
      case 'count': return ctx.inner ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];
      case 'rot': return [0, 45, 90, 135, 180, 225, 270, 315];
      case 'inner': return [null].concat(INNER_SHAPES);
    }
    return [];
  }
  function itemAnalogy(plan, r, colored, nOpt) {
    const fills = colored ? ['w'].concat(COLOR_FILLS) : BW_FILLS;
    const all = plan.X.concat(plan.Y);
    const ctx = { fills, inner: all.includes('inner') };
    const base = { shape: all.includes('rot') ? 'arrow' : r.pick(ctx.inner ? OUTER_SHAPES : SHAPES), count: 1, size: 2, fill: colored ? r.pick(COLOR_FILLS) : 'w', rot: 0, inner: null };
    if (all.includes('count') || all.includes('size')) { /* ok */ }
    const ch = {};
    all.forEach(a => {
      let from, to;
      if (a === 'count') { from = r.pick([1, 2]); to = from + r.pick([1, 2]); if (r.i(3) === 0) { const t = from; from = to; to = t; } }
      else if (a === 'rot') { from = r.i(8) * 45; to = (from + r.pick([90, 180, 270, 135])) % 360; }
      else if (a === 'inner') { from = null; to = r.pick(INNER_SHAPES); }
      else if (a === 'size') { [from, to] = r.pick([[2, 0], [0, 2], [2, 1], [1, 2]]); }
      else if (a === 'fill' && !colored) { [from, to] = r.pick([['w', 'b'], ['w', 'h'], ['g', 'b'], ['b', 'w'], ['w', 'g']]); }
      else { const d = domainOf(a, ctx); [from, to] = r.sample(d, 2); }
      ch[a] = { from, to }; base[a] = from;
    });
    const apply = (s, attrs) => { const c = clone(s); attrs.forEach(a => c[a] = ch[a].to); return c; };
    const A = base, B = apply(base, plan.X), C = apply(base, plan.Y), Dn = apply(B, plan.Y);
    const tier2 = [];
    all.forEach(a => {
      const third = domainOf(a, ctx).filter(v => v !== ch[a].from && v !== ch[a].to);
      if (third.length) { const c = clone(Dn); c[a] = r.pick(third); tier2.push(c); }
    });
    [plan.X, plan.Y].forEach(grp => { if (grp.length > 1) grp.forEach(a => { const c = clone(Dn); c[a] = ch[a].from; tier2.push(c); }); });
    const others = ['fill', 'size', 'count', 'shape'].filter(a => !all.includes(a) && !(a === 'shape' && base.shape === 'arrow'));
    const rand = others.map(a => { const c = clone(Dn); c[a] = r.pick(domainOf(a, ctx).filter(v => v !== Dn[a])); return c; });
    const cands = [B, C].concat(r.shuffle(tier2), [A], r.shuffle(rand));
    const seen = new Set([cellKey(Dn)]), dis = [];
    for (const c of cands) { const k = cellKey(c); if (!seen.has(k)) { seen.add(k); dis.push(c); } if (dis.length >= nOpt - 1) break; }
    let g = 0; while (dis.length < nOpt - 1 && g++ < 100) { const c = clone(Dn); const a = r.pick(['fill', 'size', 'count']); c[a] = r.pick(domainOf(a, ctx)); const k = cellKey(c); if (!seen.has(k)) { seen.add(k); dis.push(c); } }
    return { layout: 'm2', stem: matrixSvg([A, B, C, null], 2), ans: tileSvg(renderCell(Dn)), dis: dis.map(c => tileSvg(renderCell(c))) };
  }

  /* =====================================================================
     النوع الرابع: مصفوفات 3×3 بقواعد (ج، د، هـ، والمتقدم)
     ===================================================================== */
  const SPM_C = [
    ['count:J', 'shape:row'], ['size:J', 'shape:row'], ['count:J', 'fill:row'], ['count:IJ'], ['size:J', 'count:I'], ['rot:IJ', 'fill:row'],
    ['fill:J', 'size:I'], ['count:J', 'size:I', 'shape:row'], ['rot:J', 'count:I', 'fill:row'], ['count:IJ', 'fill:J'], ['count:I', 'size:J', 'rot:IJ'], ['count:IJ', 'size:J', 'fill:row']
  ];
  const SPM_D = [
    ['shape:L1'], ['fill:L1'], ['count:L1'], ['shape:L1', 'fill:L1'], ['shape:L1', 'count:L2'], ['shape:L1', 'fill:L2'],
    ['count:L1', 'size:L2'], ['inner:L2', 'shape:L1'], ['shape:L1', 'count:L2', 'fill:L2'], ['shape:L1', 'fill:L2', 'count:L1'], ['shape:L1', 'inner:L2', 'fill:L2'], ['shape:L1', 'count:L2', 'inner:L1', 'size:L2']
  ];
  const SPM_E = [
    ['seg:union0'], ['seg:union0'], ['seg:union0'], ['seg:union'], ['seg:union'], ['seg:union'],
    ['seg:sub'], ['seg:sub'], ['seg:xor'], ['seg:xor'], ['seg:and'], ['seg:xorB']
  ];
  const APM_I = [
    ['count:J', 'shape:row'], ['fill:L1'], ['size:J', 'fill:row'], ['shape:L1'], ['seg:union'], ['count:IJ'],
    ['shape:L1', 'fill:L1'], ['rot:IJ'], ['seg:sub'], ['shape:L1', 'count:L2'], ['seg:xor'], ['inner:L1', 'shape:L2']
  ];
  const APM_II = [
    ['shape:row', 'count:J'], ['seg:union'], ['shape:L1', 'size:J'], ['fill:L1', 'count:I'], ['rot:IJ', 'fill:row'], ['seg:sub'],
    ['shape:L1', 'fill:L2'], ['count:IJ', 'size:J'], ['seg:xor'], ['inner:L1', 'shape:L2'], ['shape:L1', 'count:L2'], ['seg:union', 'shape:L1'],
    ['rot:J', 'count:I', 'fill:L1'], ['seg:and'], ['shape:L1', 'fill:L2', 'size:J'], ['seg:L1', 'shape:L2'], ['count:IJ', 'fill:L1', 'shape:row'], ['seg:xor', 'fill:L1'],
    ['inner:L1', 'shape:L2', 'size:J'], ['seg:sub', 'shape:L1', 'count:J'], ['shape:L1', 'count:L2', 'fill:L1'], ['seg:union', 'rot:IJ'], ['seg:xor', 'shape:L1', 'fill:L2'], ['seg:L2', 'count:L1', 'fill:L2'],
    ['rot:L1', 'count:L2', 'fill:J'], ['seg:and', 'shape:L1', 'size:L2'], ['inner:L2', 'shape:L1', 'fill:L1'], ['seg:xor', 'count:IJ'], ['seg:L1', 'shape:L2', 'fill:L1', 'size:J'], ['seg:sub', 'shape:L1', 'fill:L2', 'count:I'],
    ['seg:xor', 'inner:L1', 'shape:L2'], ['seg:and', 'rot:IJ', 'fill:L1'], ['seg:union', 'shape:L1', 'count:L2', 'fill:L2'], ['seg:xor', 'shape:L2', 'size:L1', 'fill:L1'], ['seg:L2', 'inner:L1', 'shape:L2', 'size:J'], ['seg:xor', 'shape:L1', 'fill:L2', 'count:L1', 'size:J']
  ];

  function evalRule(rule, i, j) {
    switch (rule.k) {
      case 'const': return rule.v;
      case 'J': return rule.v[j];
      case 'I': case 'row': return rule.v[i];
      case 'IJ': return rule.base + rule.step * (i + j);
      case 'L1': return rule.v[(j + i) % 3];
      case 'L2': return rule.v[(j + 2 * i) % 3];
      case 'rotJ': return ((rule.a + rule.s * j) % 360 + 360) % 360;
      case 'rotIJ': return ((rule.a + rule.s * (i + j)) % 360 + 360) % 360;
    }
  }
  function popcount(m) { let c = 0; while (m) { c += m & 1; m >>>= 1; } return c; }
  function randMask(r, k, N, avoid) { const idx = r.sample(Array.from({ length: N }, (_, i) => i).filter(i => !((avoid || 0) >> i & 1)), k); return idx.reduce((m, i) => m | (1 << i), 0); }
  const OPS = { union: (a, b) => a | b, xor: (a, b) => a ^ b, and: (a, b) => a & b, sub: (a, b) => a & ~b };

  function genSegRows(kind, r) {
    const N = 12, op = kind.replace(/0|B$/, '');
    for (let attempt = 0; attempt < 400; attempt++) {
      const rows = []; let ok = true, overlapRows = 0;
      for (let i = 0; i < 3 && ok; i++) {
        let A, B;
        if (kind === 'union0') { A = randMask(r, r.range(1, 2), N); B = randMask(r, r.range(1, 2), N, A); }
        else if (op === 'union') { A = randMask(r, r.range(2, 3), N); B = randMask(r, r.range(2, 3), N); }
        else if (op === 'sub') { A = randMask(r, r.range(3, 4), N); const bits = []; for (let k = 0; k < N; k++) if (A >> k & 1) bits.push(k); B = r.sample(bits, r.range(1, bits.length - 1)).reduce((m, k) => m | (1 << k), 0); }
        else if (op === 'xor') { const k = kind === 'xorB' ? [3, 4] : [2, 3]; A = randMask(r, r.range(k[0], k[1]), N); B = randMask(r, r.range(k[0], k[1]), N); }
        else if (op === 'and') { A = randMask(r, r.range(3, 4), N); B = randMask(r, r.range(3, 4), N); }
        const C = OPS[op](A, B);
        if (!C || C === A || C === B || A === B) ok = false;
        if (A & B) overlapRows++;
        if (op === 'and' && (!(A & B) || !(A & ~B) || !(B & ~A))) ok = false;
        rows.push([A, B, C]);
      }
      if (!ok) continue;
      if (op === 'union' && kind !== 'union0' && overlapRows < 2) continue;
      if (op === 'xor' && overlapRows < 2) continue;
      if (new Set(rows.map(x => x[0])).size < 3) continue;
      return { op, rows };
    }
    throw new Error('seg gen failed ' + kind);
  }
  function genSegLatin(r) {
    for (let a = 0; a < 200; a++) { const v = [randMask(r, r.range(1, 3), 12), randMask(r, r.range(1, 3), 12), randMask(r, r.range(1, 3), 12)]; if (new Set(v).size === 3) return v; }
  }

  function itemMatrix(tokens, r, nOpt, segSet, hard) {
    const parsed = tokens.map(t => t.split(':'));
    const has = a => parsed.some(p => p[0] === a);
    const useInner = has('inner'), useRot = has('rot'), segTok = parsed.find(p => p[0] === 'seg');
    const shapeLess = segSet === 'E';
    const ctx = { fills: BW_FILLS, inner: useInner };
    const rules = {};
    const fillsOK = useInner ? ['w', 'g', 'h'] : BW_FILLS;
    const maxC = useInner ? 3 : 6;
    const base = shapeLess ? null : { shape: useRot ? 'arrow' : r.pick(useInner ? OUTER_SHAPES : SHAPES), count: 1, size: 2, fill: r.pick(['w', 'w', 'g', 'h'].filter(f => fillsOK.includes(f))), rot: 0, inner: null, innerFill: 'b' };
    if (base && useInner) base.fill = r.pick(['w', 'w', 'g']);
    if (base && segTok) base.scale = 0.72;
    parsed.forEach(([attr, kind]) => {
      if (attr === 'seg') return;
      let rule;
      const three = (dom) => r.sample(dom, 3);
      if (attr === 'shape') rule = kind === 'const' ? { k: 'const', v: r.pick(SHAPES) } : { k: kind, v: three(useInner ? OUTER_SHAPES : SHAPES) };
      else if (attr === 'count') {
        if (kind === 'J' || kind === 'I') { const b = r.range(1, maxC - 2); let v = [b, b + 1, b + 2]; if (r.i(4) === 0) v = v.reverse(); rule = { k: kind, v }; }
        else if (kind === 'IJ') rule = { k: 'IJ', base: r.range(1, 2), step: 1 };
        else rule = { k: kind, v: three(useInner ? [1, 2, 3] : [1, 2, 3, 4, 5]) };
      } else if (attr === 'size') {
        rule = (kind === 'J' || kind === 'I') ? { k: kind, v: r.i(2) ? [0, 1, 2] : [2, 1, 0] } : { k: kind, v: r.shuffle([0, 1, 2]) };
      } else if (attr === 'fill') {
        if (kind === 'J' || kind === 'I') { const v = useInner ? ['w', 'h', 'g'] : r.pick([['w', 'g', 'b'], ['w', 'h', 'b']]); rule = { k: kind, v: r.i(3) === 0 ? v.reverse() : v }; }
        else rule = { k: kind, v: three(fillsOK) };
      } else if (attr === 'rot') {
        if (kind === 'J') rule = { k: 'rotJ', a: r.i(8) * 45, s: r.pick([45, 90, -45, -90]) };
        else if (kind === 'IJ') rule = { k: 'rotIJ', a: r.i(8) * 45, s: r.pick([45, -45, 90]) };
        else rule = { k: kind, v: three([0, 90, 180, 270]) };
      } else if (attr === 'inner') rule = { k: kind, v: three(INNER_SHAPES) };
      rules[attr] = rule;
    });
    // التحقق من أن عدد الأشكال لا يتجاوز الحد مع قاعدة IJ
    let seg = null, segLat = null;
    if (segTok) { if (segTok[1].startsWith('L')) segLat = { k: segTok[1], v: genSegLatin(r) }; else seg = genSegRows(segTok[1], r); }
    const cells = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const c = base ? clone(base) : {};
      for (const a in rules) c[a] = evalRule(rules[a], i, j);
      if (seg) { c.segs = seg.rows[i][j]; c.segSet = segSet; }
      if (segLat) { c.segs = evalRule(segLat, i, j); c.segSet = segSet; }
      cells.push(c);
    }
    const ans = cells[8];
    // ---------- البدائل ----------
    const tier1 = [], tierSeg = [], tierDouble = [], tierCopy = [], tierRand = [];
    const varying = Object.keys(rules).filter(a => rules[a].k !== 'const');
    varying.forEach(a => {
      let vals = new Set(cells.map(c => c[a]));
      if (a === 'count') { vals.add(ans.count + 1); vals.add(ans.count - 1); }
      if (a === 'rot') { vals.add((ans.rot + 45) % 360); vals.add((ans.rot + 315) % 360); vals.add((ans.rot + 180) % 360); }
      vals.forEach(v => { if (v === ans[a] || v == null && a !== 'inner') return; if (a === 'count' && (v < 1 || v > (useInner ? 3 : 6))) return; const c = clone(ans); c[a] = v; tier1.push(c); });
    });
    if (seg) {
      const [A, B] = seg.rows[2];
      const alts = [OPS.union(A, B), OPS.xor(A, B), OPS.and(A, B), OPS.sub(A, B), OPS.sub(B, A), A, B];
      alts.forEach(m => { if (m && m !== ans.segs) { const c = clone(ans); c.segs = m; tierSeg.push(c); } });
      const bitsAB = []; for (let k = 0; k < 12; k++) if ((A | B) >> k & 1) bitsAB.push(k);
      r.shuffle(bitsAB).slice(0, 4).forEach(k => { const m = ans.segs ^ (1 << k); if (m) { const c = clone(ans); c.segs = m; tierSeg.push(c); } });
      for (let q = 0; q < 3; q++) { const k = r.i(12); const m = ans.segs ^ (1 << k); if (m) { const c = clone(ans); c.segs = m; tierRand.push(c); } }
    }
    if (segLat) { segLat.v.forEach(m => { if (m !== ans.segs) { const c = clone(ans); c.segs = m; tierSeg.push(c); } }); for (let q = 0; q < 4; q++) { const m = ans.segs ^ (1 << r.i(12)); if (m) { const c = clone(ans); c.segs = m; tierSeg.push(c); } } }
    for (let q = 0; q < 10 && tier1.length + tierSeg.length > 1; q++) {
      const pool = tier1.concat(tierSeg); const x = r.pick(pool), y = r.pick(pool); const c = clone(ans);
      for (const a of ['shape', 'count', 'size', 'fill', 'rot', 'inner', 'segs']) { if (JSON.stringify(x[a]) !== JSON.stringify(ans[a])) c[a] = x[a]; if (JSON.stringify(y[a]) !== JSON.stringify(ans[a])) c[a] = y[a]; }
      tierDouble.push(c);
    }
    [cells[7], cells[5], cells[6], cells[2]].forEach(c => tierCopy.push(clone(c)));
    if (base) ['fill', 'size', 'count', 'shape'].filter(a => !(a === 'shape' && useRot)).forEach(a => {
      const dom = domainOf(a, ctx).filter(v => v !== ans[a]); if (!dom.length) return; const c = clone(ans); c[a] = r.pick(dom); if (a === 'fill' && useInner && c.fill === 'b') c.fill = 'h'; tierRand.push(c);
    });
    const seen = new Set([cellKey(ans)]), dis = [];
    const order = hard
      ? [r.shuffle(tier1), r.shuffle(tierSeg), r.shuffle(tierDouble), r.shuffle(tierCopy).slice(0, 1), r.shuffle(tierRand), tierCopy]
      : [r.shuffle(tierCopy).slice(0, 2), r.shuffle(tier1), r.shuffle(tierSeg), r.shuffle(tierRand), r.shuffle(tierDouble), tierCopy];
    // مزج المستويات لتنويع البدائل
    const queue = [];
    order.forEach(t => t.forEach(c => queue.push(c)));
    for (const c of queue) { const k = cellKey(c); if (!seen.has(k)) { seen.add(k); dis.push(c); } if (dis.length >= nOpt - 1) break; }
    let g = 0;
    while (dis.length < nOpt - 1 && g++ < 200) {
      const c = clone(ans);
      if (c.segs != null && (shapeLess || r.i(2))) { const m = c.segs ^ (1 << r.i(12)) ^ (r.i(2) ? (1 << r.i(12)) : 0); if (!m) continue; c.segs = m; }
      else if (base) { const a = r.pick(['fill', 'size', 'count']); c[a] = r.pick(domainOf(a, ctx)); }
      const k = cellKey(c); if (!seen.has(k)) { seen.add(k); dis.push(c); }
    }
    return { layout: 'm3', stem: matrixSvg(cells.slice(0, 8).concat([null]), 3), ans: tileSvg(renderCell(ans)), dis: dis.map(c => tileSvg(renderCell(c))), _keys: [cellKey(ans)].concat(dis.map(cellKey)) };
  }

  /* =====================================================================
     تعريف المراحل والنماذج
     ===================================================================== */
  const CPM_A = ['solid', 'hstripes', 'dots', 'vstripes', 'checker', 'diag', 'grid', 'rows', 'waves', 'lines', 'split', 'grad'];
  const SPM_A = ['hstripes', 'dots', 'diag', 'checker', 'grid', 'alt', 'rows', 'waves', 'lines', 'split', 'grad', 'rings'];

  const STAGES = {
    primary: {
      code: 'primary', name: 'المرحلة الابتدائية', test: 'المصفوفات الملونة', short: 'ملوّن', grades: [1, 2, 3, 4, 5, 6], timeDefault: 35, maxScore: 36,
      sets: [
        { id: 'A', label: 'أ', n: 12, nOpt: 6, make: (t, r) => itemPattern(CPM_A[t], r, true, 6) },
        { id: 'AB', label: 'أب', n: 12, nOpt: 6, make: (t, r) => itemQuad(AB_PLAN[t], r, 6) },
        { id: 'B', label: 'ب', n: 12, nOpt: 6, make: (t, r) => itemAnalogy(CPM_B[t], r, true, 6) }
      ], scored: ['A', 'AB', 'B']
    },
    intermediate: {
      code: 'intermediate', name: 'المرحلة المتوسطة', test: 'المصفوفات القياسية', short: 'قياسي', grades: [7, 8, 9], timeDefault: 45, maxScore: 60,
      sets: [
        { id: 'A', label: 'أ', n: 12, nOpt: 6, make: (t, r) => itemPattern(SPM_A[t], r, false, 6) },
        { id: 'B', label: 'ب', n: 12, nOpt: 6, make: (t, r) => itemAnalogy(SPM_B[t], r, false, 6) },
        { id: 'C', label: 'ج', n: 12, nOpt: 8, make: (t, r) => itemMatrix(SPM_C[t], r, 8, 'F', t > 5) },
        { id: 'D', label: 'د', n: 12, nOpt: 8, make: (t, r) => itemMatrix(SPM_D[t], r, 8, 'F', t > 5) },
        { id: 'E', label: 'هـ', n: 12, nOpt: 8, make: (t, r) => itemMatrix(SPM_E[t], r, 8, 'E', t > 5) }
      ], scored: ['A', 'B', 'C', 'D', 'E']
    },
    secondary: {
      code: 'secondary', name: 'المرحلة الثانوية', test: 'المصفوفات المتقدمة', short: 'متقدم', grades: [10, 11, 12], timeDefault: 50, maxScore: 36,
      sets: [
        { id: 'I', label: 'المجموعة الأولى', n: 12, nOpt: 8, make: (t, r) => itemMatrix(APM_I[t], r, 8, 'F', t > 5) },
        { id: 'II', label: 'المجموعة الثانية', n: 36, nOpt: 8, make: (t, r) => itemMatrix(APM_II[t], r, 8, 'F', true) }
      ], scored: ['II']
    }
  };
  const FORMS = [1, 2, 3, 4];

  function stageOfGrade(g) { g = +g; if (g <= 6) return 'primary'; if (g <= 9) return 'intermediate'; return 'secondary'; }

  const cache = {};
  function buildItems(stage, seedTag) {
    const st = STAGES[stage]; const items = [];
    st.sets.forEach(set => {
      for (let t = 0; t < set.n; t++) {
        const r = new Rng(hashStr(`${VERSION}|${stage}|${seedTag}|${set.id}|${t}`));
        const raw = set.make(t, r);
        const opts = [{ svg: raw.ans, ok: true }].concat(raw.dis.map(s => ({ svg: s, ok: false })));
        const order = r.shuffle(opts);
        items.push({
          idx: items.length, set: set.id, setLabel: set.label, num: t + 1, layout: raw.layout, stem: raw.stem,
          options: order.map(o => o.svg), answer: order.findIndex(o => o.ok) + 1, _nOpt: opts.length
        });
      }
    });
    return items;
  }
  /* النموذج 5: اختبار رافن الأصلي (المصفوفات القياسية) — صور تُجلب من الخادم أثناء الاختبار، ومفتاحه على الخادم فقط */
  const EXTRA_FORMS = { intermediate: [5] };
  function formsOf(stage) { return FORMS.concat(EXTRA_FORMS[stage] || []); }
  function isImageForm(stage, form) { return (EXTRA_FORMS[stage] || []).includes(+form); }
  function imageItems(stage) {
    const items = [];
    STAGES[stage].sets.forEach(set => { for (let t = 0; t < set.n; t++) items.push({ idx: items.length, set: set.id, setLabel: set.label, num: t + 1, layout: 'img', stem: '', options: Array(set.nOpt).fill(''), answer: 0, img: true }); });
    return items;
  }
  function getForm(stage, form) {
    const k = stage + '|' + form;
    if (!cache[k]) {
      if (STAGES[stage] && isImageForm(stage, form)) cache[k] = { stage, form: +form, items: imageItems(stage), image: true };
      else { if (!STAGES[stage] || !FORMS.includes(+form)) throw new Error('نموذج غير معروف'); cache[k] = { stage, form: +form, items: buildItems(stage, 'F' + form) }; }
    }
    return cache[k];
  }
  function getPractice(stage) {
    const k = stage + '|P';
    if (!cache[k]) {
      const st = STAGES[stage]; const items = [];
      const s0 = st.sets[0];
      for (let t = 0; t < 2; t++) {
        const r = new Rng(hashStr(`${VERSION}|${stage}|practice|${t}`));
        const raw = s0.make(t, r);
        const opts = r.shuffle([{ svg: raw.ans, ok: true }].concat(raw.dis.map(s => ({ svg: s, ok: false }))));
        items.push({ idx: t, set: 'P', setLabel: 'تدريب', num: t + 1, layout: raw.layout, stem: raw.stem, options: opts.map(o => o.svg), answer: opts.findIndex(o => o.ok) + 1 });
      }
      cache[k] = items;
    }
    return cache[k];
  }
  function keyString(stage, form) { return getForm(stage, form).items.map(it => it.answer).join(''); }
  function allKeys() { const out = []; Object.keys(STAGES).forEach(s => FORMS.forEach(f => { const key = keyString(s, f); out.push({ stage: s, form: f, version: VERSION, key, checksum: hashStr(key).toString(36) }); })); return out; }
  function setIndex(stage) { const out = []; let i = 0; STAGES[stage].sets.forEach(s => { out.push({ id: s.id, label: s.label, from: i, to: i + s.n - 1, n: s.n }); i += s.n; }); return out; }
  function itemCount(stage) { return STAGES[stage].sets.reduce((a, s) => a + s.n, 0); }

  G.RVItems = { VERSION, STAGES, FORMS, EXTRA_FORMS, formsOf, isImageForm, getForm, getPractice, keyString, allKeys, setIndex, itemCount, stageOfGrade, hashStr, _itemMatrix: itemMatrix };
})(typeof window !== 'undefined' ? window : globalThis);
