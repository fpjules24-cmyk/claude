'use strict';
// Donjons & Tractions — moteur pixel art : sprites, personnage à squelette, poses, décors
(function (DT) {
  const OUT = '#1a1c2c';

  // ---------- Couleurs ----------
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  const shadeCache = {};
  function shade(hex, f) {
    const k = hex + f;
    if (shadeCache[k]) return shadeCache[k];
    const [r, g, b] = hexToRgb(hex);
    let out;
    if (f < 1) out = rgbToHex(r * f, g * f, b * f + (1 - f) * 20);
    else out = rgbToHex(r + (255 - r) * (f - 1), g + (255 - g) * (f - 1), b + (255 - b) * (f - 1));
    return (shadeCache[k] = out);
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }

  // ---------- Sprites (16×16) ----------
  // o contour · a principal · b ombre · c reflet · d accent · e blanc d'œil · k pupille · f pieds/accent 2
  const SPR = {
    bird: [
      '................', '................', '......oooo......', '.....oaaaao.....', '....oacaaaao....', '...okeaaaaaao...',
      '.oddoaaaaaaao...', 'odddoaaaaaabbo..', '.oooaaaaaabbbbo.', '...oaaccaabbbbbo', '...oacccaabbbbbo', '...oaaccaaabbbo.',
      '....oaaaaaaboo..', '.....oooooooo...', '......f...f.....', '.....ff..ff.....'],
    rodent: [
      '................', '..o.o.......oo..', '.oaoao.....obbo.', '.oaaaao...obbbo.', 'oaaaaaao..obbo..', 'okeaaaaao.obbo..',
      'oaaaaaaaaoobbo..', 'ddaaaaaaaaaobo..', 'oooaaaaaaaaabo..', '..oaaccaaaaao...', '..oacccaaaaao...', '..oaacccaaaao...',
      '..oaaaccaaaao...', '...oaaaaaaao....', '...ofo...ofo....', '...ff.....ff....'],
    blob: [
      '................', '................', '................', '......oooo......', '....ooaaaaoo....', '...oaaccaaaao...',
      '..oaacccaaaaao..', '..oaaccaaaaaao..', '.oaaaaaaaaaaaao.', '.oaakeaaakeaaao.', '.oaakeaaakeaaao.', '.oaaaaaddaaaabo.',
      '.oaaaaaaaaaabbo.', '..obaabbaabbbo..', '...oooooooooo...', '................'],
    dumbbell: [
      '................', '................', '................', '.ooo........ooo.', 'oaaao......oaaao', 'oacao......oacao',
      'oacaoooooooooaao', 'oaaaobbbbbbboaao', 'oaaaokebbbkeoaao', 'oaaaobbbdbbboaao', 'oaaaoooooooooaao', 'oaaao......oaaao',
      'oaaao......oaaao', '.ooo........ooo.', '................', '................'],
    kettle: [
      '................', '.....oooooo.....', '....oo....oo....', '....o......o....', '....oo....oo....', '...ooaooooaoo...',
      '..oaaaaaaaaaao..', '.oaccaaaaaaaabo.', '.oacakeaakeaabo.', '.oaaakeaakeaabo.', '.oaaaaaaaaaaabo.', '.oaaaaoddoaaabo.',
      '..oaaaaaaaaabo..', '...obbbbbbbbo...', '....oooooooo....', '................'],
    ghost: [
      '................', '.....oooooo.....', '....oaaaaaao....', '...oaccaaaaao...', '..oaccaaaaaaao..', '..oaaaaaaaaaao..',
      '..oakkaaaakkao..', '..oakkaaaakkao..', '..oaaaaaaaaaao..', '..oaaaaddaaaao..', '..oaaaoddoaaao..', '..oaaaaaaaaaao..',
      '..oaaaaaaaaabo..', '..oabaabaabbbo..', '..oobooboobboo..', '...o..o..o..o...'],
    golem: [
      '....oooooooo....', '...oaaaaaaaao...', '...oacaaaaaao...', '...oakeaakeao...', '...oaaaaaaaao...', '...oaaddddaao...',
      '.ooooaaaaaaoooo.', 'oaaaooooooooaaao', 'oacaoaaaaaaoaaao', 'oaaaoaacaaaobaao', 'oaaaoaaaaaaobaao', 'oaaooaaaaaaoobao',
      'oooooaaaaaaooooo', '....oaaooaao....', '...ooaao.oaaoo..', '...oooooooooooo.'],
    robot: [
      '..oooooooooooo..', '......oddo......', '.......oo.......', '...oooooooooo...', '..oaaaaaaaaaao..', '.oaccaaaaaaaabo.',
      '.oaoooooooooabo.', '.oaoddoooddoabo.', '.oaoddoooddoabo.', '.oaoooooooooabo.', '.oaaaaaaaaaaabo.', '.oaaccaaccaaabo.',
      '..oaaaaaaaaabo..', '...oobbbbbboo...', '....o..oo..o....', '...o...oo...o...'],
    couch: [
      '................', '................', '..oooooooooooo..', '.oaaaaaaaaaaaao.', '.oacaaaaaaaaaao.', '.oakeaaaaaakeao.',
      '.oaaaaaaaaaaaao.', '.oaaaoddddoaaao.', 'ooaaaaaaaaaaaaoo', 'obboooooooooobbo', 'obbobbbbbbbbobbo', 'obbobbccbbccobbo',
      'obboooooooooobbo', 'oooooooooooooooo', '.fo..........of.', '.ff..........ff.'],
  };
  const DEF_PAL = { o: OUT, e: '#f4f4f4', k: OUT, a: '#94b0c2', b: '#566c86', c: '#c2d3de', d: '#ef7d57', f: '#5b3a29' };

  // Icônes d'interface (8×8) et objets (12×12) — palette fixe
  const IPAL = { o: OUT, y: '#ffcd75', Y: '#ef7d57', w: '#f4f4f4', c: '#73eff7', C: '#41a6f6', g: '#a7f070', G: '#38b764', r: '#e0667a', R: '#b13e53', p: '#b65cd6', P: '#5d275d', s: '#94b0c2', S: '#566c86', b: '#8a5a3c', B: '#5b3a29', n: '#29366f' };
  const ICONS = {
    coin: ['..oooo..', '.oyyyyo.', 'oyywyyYo', 'oywyyyYo', 'oyyyyyYo', 'oyyyyYYo', '.oYYYYo.', '..oooo..'],
    gem: ['........', '.oooooo.', 'owcwccCo', 'oCcccCCo', '.oCccCo.', '..oCCo..', '...oo...', '........'],
    bolt: ['....ooo.', '...ogGo.', '..ogGo..', '.oggggo.', '..oGgo..', '..oGo...', '.oGo....', '.oo.....'],
    heart: ['........', '.oo.oo..', 'oRRoRRo.', 'oRwRRRo.', 'oRRRRRo.', '.oRRRo..', '..oRo...', '...o....'],
    sword: ['......oo', '.....owo', '....owo.', 'o..owo..', 'oooso...', '.oSo....', 'oSoo....', 'oo......'],
    shield: ['.oooooo.', 'osssssSo', 'oswsssSo', 'osssssSo', 'osssssSo', '.osssSo.', '..osSo..', '...oo...'],
    boot: ['..ooo...', '..oco...', '..oco...', '..occoo.', '.occccco', 'occcccCo', 'oCCCCCCo', '.oooooo.'],
    star: ['...oo...', '...oyo..', 'ooooyooo', 'oyyyyyYo', '.oyyyYo.', '.oyYoYo.', 'oyYo.oYo', 'ooo...oo'],
    chest: ['.oooooo.', 'obbbbbbo', 'oBByyBBo', 'oooyyooo', 'obbyybbo', 'obbbbbbo', 'oBBBBBBo', '.oooooo.'],
    flame: ['...o....', '..oRo...', '.oRYRo..', '.oRYYRo.', 'oRYyyYRo', 'oRYyyYRo', '.oRYYRo.', '..oooo..'],
    trophy: ['oooooooo', 'oyyyyyYo', '.oyyyYo.', '..oyYo..', '...oo...', '...yo...', '..oyyo..', '.oooooo.'],
    lock: ['..oooo..', '.o....o.', '.o....o.', 'oooooooo', 'oyyyyyYo', 'oyyoyyYo', 'oyyyyyYo', 'oooooooo'],
    gear: ['...oo...', '.oosSoo.', '.osssSo.', 'ossoosSo', 'osSoosSo', '.osSSSo.', '.oossoo.', '...oo...'],
    aura: ['...o....', '...p....', 'o.oPo.o.', '.oPwPo..', 'pPwwwPp.', '.oPwPo..', 'o.oPo.o.', '...p....'],
    scroll: ['.oooooo.', 'owwwwwSo', 'owSSSwSo', 'owwwwwSo', 'owSSwwSo', 'owwwwwSo', 'oSSSSSSo', '.oooooo.'],
    crown: ['........', 'o..o..o.', 'oo.oo.oo', 'oyoyyoyo', 'oyyyyyyo', 'oyRyyRyo', 'oyyyyyYo', 'oooooooo'],
    check: ['........', '......oo', '.....ogo', 'o...ogo.', 'oo.ogo..', 'ogogo...', '.ogo....', '..o.....'],
    up: ['...oo...', '..ogGo..', '.oggGGo.', 'ooogGooo', '..ogGo..', '..ogGo..', '..ogGo..', '..oooo..'],
    skull: ['.oooooo.', 'owwwwwwo', 'owoowoow', 'owoowoow', 'owwwwwwo', '.owwwwo.', '.owowwo.', '..oooo..'],
    paw: ['.o..o...', 'oso.oso.', '.o..o...', '..oo..o.', '.osso.os', 'ossssoo.', 'osssso..', '.oooo...'],
    timer: ['..oooo..', '.owwwwo.', 'owwoowwo', 'owwowwwo', 'owwwwwwo', 'owwwwwwo', '.owwwwo.', '..oooo..'],
    val: ['...oo...', '..oyyo..', '.oyppyo.', 'oypwwpyo', 'oyppppyo', '.oyppyo.', '..oyyo..', '...oo...'],
    potion: ['...oo...', '...ss...', '..oRRo..', '.oRrRRo.', 'oRrRRRRo', 'oRRRRRRo', '.oRRRRo.', '..oooo..'],
    fist: ['........', '.oooo...', 'orrrro..', 'orRrroo.', 'orrrrrro', 'orrrrRro', '.orrrro.', '..oooo..'],
  };
  const NAV = {
    park: ['....oooo....', '..ooggggoo..', '.oggwggggGo.', '.ogwggggGGo.', 'oggggggggGGo', 'ogggggggGGGo', '.oggggGGGGo.', '..oooobboo..', '.....obbo...', '.....obbo...', '...oobbbboo.', '..oooooooooo'],
    sport: ['............', '............', '.oo......oo.', 'osso....osso', 'oswooooooswo', 'osssssssssso', 'oswooooooswo', 'osso....osso', '.oo......oo.', '............', '............', '............'],
    skills: ['.....oo.....', '.....oyo....', '....oyyo....', 'oooooyyooooo', 'oyyyyyyyyyYo', '.oyyyyyyyYo.', '..oyyyyyYo..', '..oyyyyyYo..', '.oyyyooyyYo.', '.oyYo..oyYo.', 'oyYo....oYYo', 'ooo......ooo'],
    dungeon: ['...oooooo...', '..owwwwwwo..', '.owwwwwwwwo.', '.owwwwwwwwo.', '.owoowwoowo.', '.owoowwoowo.', '.owwwwwwwwo.', '..owwoowwo..', '..owwwwwwo..', '...owwwwo...', '...oooooo...', '............'],
    hero: ['o..........o', 'owo......owo', '.owo....owo.', '..owo..owo..', '...owoowo...', '....owwo....', '....owwo....', '...oyooyo...', '..oyo..oyo..', '.oBo....oBo.', 'oBo......oBo', 'oo........oo'],
    market: ['....oooo....', '.....oo.....', '....oyyo....', '...oyyyyo...', '..oyyYyyyo..', '.oyyYYYyyyo.', '.oyyyYyyyYo.', '.oyyYYYyyYo.', '.oyyyYyyyYo.', '..oyyyyyYo..', '...oooooo...', '............'],
    stuff: ['............', '.oooooooooo.', 'obbbbbbbbbbo', 'obBBBBBBBBbo', 'obBBBBBBBBbo', 'oooooyyooooo', 'obbbbyybbbbo', 'obbbbbbbbbbo', 'obbbbbbbbbbo', 'oBBBBBBBBBBo', '.oooooooooo.', '............'],
  };
  // Objets (12×12) — a couleur de rareté, b ombre, c reflet, d métal, e métal sombre
  const ITEM_SPR = {
    head: ['............', '............', '...oooooo...', '..oaaaaaao..', '.oaaccaaaao.', '.oaaaaaaaao.', 'oddddddddddo', 'oeeeeeeeeeeo', '.oooooooooo.', '............', '............', '............'],
    top: ['............', '..ooo..ooo..', '.oaaaooaaao.', 'oaaaaaaaaaao', 'oaaoaccaoaao', 'oooaaaaaaooo', '..oaaaaaao..', '..oaacaaao..', '..oaaaaaao..', '..obbbbbbo..', '..oooooooo..', '............'],
    hands: ['............', '...o.o.o....', '..oaoaoaoo..', '..oaoaoaoao.', '..oaaaaaaao.', '.ooaaaaaaao.', 'oaoaaaaaaao.', 'oaaaaaaaao..', '.oaaaaaaao..', '..oddddddo..', '..oooooooo..', '............'],
    legs: ['............', '............', '..oooooooo..', '..oddddddo..', '..oaaaaaao..', '.oaaaaaaaao.', '.oaacooaaao.', '.oaaao.oaaao', '.oaaao.oaaao', '.obbbo.obbbo', '.ooooo.ooooo', '............'],
    feet: ['............', '............', '............', '....oooo....', '...oaaaao...', '...oaaaao...', '...oaaaaaoo.', '..oaaaaaaaao', '.oaacaaaaaao', 'oddddddddddo', '.oooooooooo.', '............'],
    acc: ['d..........d', '.d........d.', '..d......d..', '...d....d...', '....d..d....', '.....dd.....', '....oaao....', '...oacaao...', '...oacaao...', '...oaaaao...', '....oaao....', '.....oo.....'],
    ring: ['............', '.....oo.....', '....oaco....', '....oaao....', '...oddddo...', '..odo..odo..', '.odo....odo.', '.od......do.', '.odo....odo.', '..odo..odo..', '...oddddo...', '............'],
    orb: ['............', '....oooo....', '...oaaaao...', '..oaccaaao..', '..oacaaaao..', '..oaaaaabo..', '..oaaaabbo..', '...oabbbo...', '....oooo....', '...oddddo...', '..oeeeeeeo..', '...oooooo...'],
    belt: ['............', '............', '............', 'oooooooooooo', 'bbbboddddobb', 'aaaaodaadoaa', 'aaaaodcadoaa', 'bbbboddddobb', 'oooooooooooo', '............', '............', '............'],
    armor: ['............', '.oo......oo.', 'oddo....oddo', 'oddaooooaddo', '.oaaaccaaao.', '.oaaaaaaaao.', '..oaaccaao..', '..oaaaaaao..', '..oaaaaaao..', '..obbbbbbo..', '...oooooo...', '............'],
    robe: ['...oo..oo...', '..oaaooaao..', '.oaaaccaaao.', 'oaaoaaaaoaao', 'oao.oaao.oao', '.o..oaao..o.', '...oaaaao...', '...oaacao...', '..oaaaaaao..', '..oaaaaaao..', '.oabbbbbbao.', '.oooooooooo.'],
    dumbbell: ['............', '............', '.ooo....ooo.', 'oaaao..oaaao', 'oacaooooacao', 'oaaaodddoaao', 'oaaaooooaaao', 'oaaao..oaaao', '.ooo....ooo.', '............', '............', '............'],
    kettlebell: ['....oooo....', '...oo..oo...', '...o....o...', '..ooooooo...', '.oaaaaaaao..', 'oaccaaaaaao.', 'oacaaaaaaao.', 'oaaaaaaaabo.', 'oaaaaaaaabo.', '.oaaaaaabo..', '..oooooo....', '............'],
    whip: ['.......ooo..', '......oaaao.', '.....oa...ao', '....oa....ao', '...oa....oa.', '..oa....oa..', '.oo....oa...', 'odo...oa....', 'odo..oa.....', 'oeo.oa......', '.o..oo......', '............'],
    bar: ['............', '............', '............', 'oo........oo', 'eo........oe', 'eoooooooooee', 'edddcdddddde', 'eoooooooooee', 'eo........oe', 'oo........oo', '............', '............'],
    staff: ['..........oo', '.........oao', '........oao.', '.......oco..', '......oao...', '.....oao....', '....oao.....', '...oao......', '..oao.......', '.oao........', 'oao.........', 'oo..........'],
    plate: ['............', '...oooooo...', '..oaaaaaao..', '.oaccaaaabo.', '.oaco..oabo.', '.oaao..oabo.', '.oaaaaaabbo.', '..obbbbbbo..', '...oooooo...', '............', '............', '............'],
    sword: ['.........ooo', '........odco', '.......odco.', '......odco..', '.....odco...', '.oo.odco....', '.oaodco.....', '..oaao......', '..oeaao.....', '.oeo.oao....', 'oeo...oo....', 'oo..........'],
  };

  const sprCache = {};
  function spriteCanvas(map, pal, opts = {}) {
    const key = (opts.key || map.join('')) + '|' + JSON.stringify(pal) + (opts.white ? 'W' : '') + (opts.flip ? 'F' : '');
    if (sprCache[key]) return sprCache[key];
    const h = map.length, w = map[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = map[y];
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ' || ch === undefined) continue;
        const col = opts.white ? (ch === 'o' ? '#ffffff' : '#ffffff') : (pal[ch] || DEF_PAL[ch] || IPAL[ch] || '#ff00ff');
        ctx.fillStyle = col;
        ctx.fillRect(opts.flip ? w - 1 - x : x, y, 1, 1);
      }
    }
    sprCache[key] = c;
    return c;
  }
  const urlCache = {};
  function spriteURL(map, pal, scale = 1, key) {
    const k = (key || map.join('')) + JSON.stringify(pal) + scale;
    if (urlCache[k]) return urlCache[k];
    const src = spriteCanvas(map, pal, { key });
    const c = document.createElement('canvas');
    c.width = src.width * scale; c.height = src.height * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return (urlCache[k] = c.toDataURL());
  }
  const SIL = { o: '#2b3049', a: '#475069', b: '#475069', c: '#475069', d: '#475069', e: '#475069', k: '#475069', f: '#475069' };
  const silURL = (map) => spriteURL(map, SIL, 3, 'sil_' + map.join(''));
  const iconURL = (name) => spriteURL(ICONS[name] || ICONS.star, IPAL, 1, 'i_' + name);
  const navURL = (name) => spriteURL(NAV[name], IPAL, 1, 'n_' + name);
  function itemURL(icon, rarColor) {
    const pal = { a: rarColor, b: shade(rarColor, 0.65), c: shade(rarColor, 1.45), d: '#94b0c2', e: '#566c86' };
    return spriteURL(ITEM_SPR[icon] || ITEM_SPR.acc, pal, 1, 'it_' + icon);
  }

  // ---------- Personnage à squelette ----------
  const LEN = { T: 8, UA: 5, FA: 5, TH: 6, SH: 6, HEAD: 4.5 };
  const D2R = Math.PI / 180;
  const dir = (a) => [Math.cos(a * D2R), Math.sin(a * D2R)];

  function ik(root, end, l1, l2, b) {
    let dx = end[0] - root[0], dy = end[1] - root[1];
    let d = Math.hypot(dx, dy);
    if (d < 1e-6) { dx = 0; dy = 1; d = 1e-6; }
    const ux = dx / d, uy = dy / d;
    const dd = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.001), l1 + l2 - 0.001);
    const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
    const hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const px = root[0] + ux * a, py = root[1] + uy * a;
    return [[px + b * hh * -uy, py + b * hh * ux], [root[0] + ux * dd, root[1] + uy * dd]];
  }

  // Résout une frame en positions absolues (avant rotation)
  function resolve(fr) {
    const hip = fr.hip, td = dir(fr.t);
    const sh = [hip[0] + td[0] * LEN.T, hip[1] + td[1] * LEN.T];
    const limbs = [];
    const specs = [[fr.a[0], sh, LEN.UA, LEN.FA], [fr.a[1], sh, LEN.UA, LEN.FA], [fr.l[0], hip, LEN.TH, LEN.SH], [fr.l[1], hip, LEN.TH, LEN.SH]];
    for (const [sp, root, l1, l2] of specs) {
      if (Array.isArray(sp)) {
        const m = [root[0] + dir(sp[0])[0] * l1, root[1] + dir(sp[0])[1] * l1];
        const e = [m[0] + dir(sp[1])[0] * l2, m[1] + dir(sp[1])[1] * l2];
        const cr = (e[0] - root[0]) * (m[1] - root[1]) - (e[1] - root[1]) * (m[0] - root[0]);
        limbs.push({ abs: false, rel: [e[0] - root[0], e[1] - root[1]], end: e, b: cr === 0 ? 1 : Math.sign(cr) });
      } else {
        limbs.push({ abs: true, end: [sp.x, sp.y], b: sp.b || 1 });
      }
    }
    return { hip, t: fr.t, sh, limbs, rot: fr.rot || 0 };
  }
  function angLerp(a, b, u) {
    let d = ((b - a) % 360 + 540) % 360 - 180;
    return a + d * u;
  }
  // Interpole deux frames résolues puis calcule les articulations finales
  function joints(A, B, u) {
    const hip = [A.hip[0] + (B.hip[0] - A.hip[0]) * u, A.hip[1] + (B.hip[1] - A.hip[1]) * u];
    const t = angLerp(A.t, B.t, u);
    const td = dir(t);
    const sh = [hip[0] + td[0] * LEN.T, hip[1] + td[1] * LEN.T];
    const head = [sh[0] + td[0] * LEN.HEAD, sh[1] + td[1] * LEN.HEAD];
    const out = { hip, sh, head, t };
    const names = ['an', 'af', 'ln', 'lf'];
    for (let i = 0; i < 4; i++) {
      const la = A.limbs[i], lb = B.limbs[i];
      const root = i < 2 ? sh : hip;
      const l1 = i < 2 ? LEN.UA : LEN.TH, l2 = i < 2 ? LEN.FA : LEN.SH;
      let end;
      if (!la.abs && !lb.abs) end = [root[0] + la.rel[0] + (lb.rel[0] - la.rel[0]) * u, root[1] + la.rel[1] + (lb.rel[1] - la.rel[1]) * u];
      else end = [la.end[0] + (lb.end[0] - la.end[0]) * u, la.end[1] + (lb.end[1] - la.end[1]) * u];
      const b = u < 0.5 ? la.b : lb.b;
      const [m, e] = ik(root, end, l1, l2, b);
      out[names[i]] = [root, m, e];
    }
    const rot = angLerp(A.rot, B.rot, u);
    if (rot) {
      const c = Math.cos(rot * D2R), s = Math.sin(rot * D2R), [px, py] = hip;
      const R = (p) => [px + (p[0] - px) * c - (p[1] - py) * s, py + (p[0] - px) * s + (p[1] - py) * c];
      out.sh = R(out.sh); out.head = R(out.head);
      for (const n of names) out[n] = out[n].map(R);
      out.t = t + rot;
    }
    return out;
  }

  // ---------- Bibliothèque de poses (regard vers la droite, sol en y = 0) ----------
  const K = (x, y, b = 1) => ({ x, y, b });
  const F = (hip, t, a, l, x) => Object.assign({ hip, t, a, l, d: 0.5 }, x || {});
  const STAND = F([0, -12], -90, [[100, 88], [80, 92]], [K(1, 0, -1), K(-1, 0, -1)]);
  const STAND2 = F([0, -12], -88, [[104, 92], [76, 88]], [K(1, 0, -1), K(-1, 0, -1)]);
  const PU_UP = F([-1.6, -6], -30, [K(6, 0, 1), K(4.5, 0, 1)], [K(-12, 0, 1), K(-12.5, 0, 1)]);
  const PU_DN = F([-0.24, -2.4], -11.5, [K(6, 0, 1), K(4.5, 0, 1)], [K(-12, 0, 1), K(-12.5, 0, 1)]);
  const SQUAT_DN = F([-3, -6], -70, [[0, 0], [5, 5]], [K(1, 0, -1), K(0, 0, -1)]);
  const HS = F([0, -18], 90, [K(1, 0, 1), K(-1, 0, 1)], [[-92, -90], [-88, -90]]);
  const HS2 = F([0.6, -18], 90, [K(1, 0, 1), K(-1, 0, 1)], [[-95, -91], [-86, -88]]);
  const FIGHT = F([0, -11], -82, [[50, -50], [70, -60]], [K(3, 0, -1), K(-3, 0, -1)]);
  const BAR = (y) => ({ k: 'bar', y, x0: -12, x1: 12 });
  const fr = (base, x) => Object.assign({}, base, x);

  const POSES = {
    idle: { f: [fr(STAND, { d: 1 }), fr(STAND2, { d: 1 })] },
    walk: { f: [
      F([0, -12], -87, [[110, 100], [70, 85]], [[70, 95], [110, 95]], { d: 0.16 }),
      F([0, -12.5], -88, [[95, 95], [85, 90]], [[90, 100], [95, 80]], { d: 0.16 }),
      F([0, -12], -87, [[70, 85], [110, 100]], [[110, 95], [70, 95]], { d: 0.16 }),
      F([0, -12.5], -88, [[85, 90], [95, 95]], [[95, 80], [90, 100]], { d: 0.16 }),
    ] },
    wave: { f: [fr(STAND, { a: [[-60, -100], [80, 92]], d: 0.3 }), fr(STAND, { a: [[-60, -60], [80, 92]], d: 0.3 })] },
    fight: { f: [fr(FIGHT, { d: 0.45 }), fr(FIGHT, { hip: [0, -10.5], d: 0.45 })] },
    punch: { f: [F([1.5, -11], -78, [[0, 0], [60, -70]], [K(4, 0, -1), K(-3, 0, -1)], { d: 0.2 })] },
    kick: { f: [F([-1, -12.5], -105, [[120, 80], [60, -60]], [[-5, 0], K(-1, 0, -1)], { d: 0.2 })] },
    hit: { f: [F([-1.5, -11.5], -110, [[140, 170], [130, 160]], [K(2, 0, -1), K(-4, 0, -1)], { d: 0.2 })] },
    ko: { f: [F([0, -2], 180, [[150, 180], [200, 180]], [[0, 0], [5, 0]], { d: 1 })] },
    victory: { f: [F([0, -12.5], -90, [[-120, -100], [-60, -80]], [[95, 90], [85, 90]], { d: 0.35 }), F([0, -14.5], -90, [[-125, -95], [-55, -85]], [[95, 90], [85, 90]], { d: 0.35 })] },
    cast: { f: [F([0, -12], -95, [[-30, -30], [-40, -40]], [K(3, 0, -1), K(-3, 0, -1)], { d: 0.2 }), F([0, -12.5], -95, [[-20, -20], [-35, -35]], [K(3, 0, -1), K(-3, 0, -1)], { d: 0.2 })] },
    stretch: { f: [F([0, -12], 50, [K(5, -1, 1), K(4, -1, 1)], [K(0, 0, 1), K(-1, 0, 1)], { d: 1.2 }), F([0, -12], 56, [K(5.5, -0.5, 1), K(4.5, -0.5, 1)], [K(0, 0, 1), K(-1, 0, 1)], { d: 1.2 })] },

    pushup: { f: [fr(PU_UP, { d: 0.55 }), fr(PU_DN, { d: 0.55 })] },
    oapushup: { f: [fr(PU_UP, { a: [K(6, 0, 1), [170, 40]], l: [K(-11, 0, 1), K(-13, 0, 1)], d: 0.6 }), fr(PU_DN, { a: [K(6, 0, 1), [170, 40]], l: [K(-11, 0, 1), K(-13, 0, 1)], d: 0.6 })] },
    lean: { f: [F([-0.5, -5], -22, [K(2.5, 0, 1), K(1.5, 0, 1)], [K(-11.5, 0, 1), K(-12, 0, 1)], { d: 0.8 }), F([0, -5.2], -21, [K(2.5, 0, 1), K(1.5, 0, 1)], [K(-11.5, 0, 1), K(-12, 0, 1)], { d: 0.8 })], shake: 0.25 },
    dips: { props: [{ k: 'dip', y: -20 }], f: [F([-1.4, -22.1], -80, [K(0, -20, 1), K(-1, -20, 1)], [[100, 150], [95, 155]], { d: 0.55 }), F([-2.4, -16.75], -65, [K(0, -20, 1), K(-1, -20, 1)], [[100, 150], [95, 155]], { d: 0.55 })] },
    pullup: { props: [BAR(-34)], f: [F([0, -15], -90, [K(2, -33, 1), K(-2, -33, -1)], [[95, 100], [90, 110]], { d: 0.6 }), F([0, -23], -90, [K(2, -33, 1), K(-2, -33, -1)], [[100, 95], [95, 105]], { d: 0.6 })] },
    ctbpullup: { props: [BAR(-34)], f: [F([0, -15], -90, [K(3, -33, 1), K(-3, -33, -1)], [[95, 100], [90, 110]], { d: 0.6 }), F([0, -25.5], -88, [K(3, -33, 1), K(-3, -33, -1)], [[105, 95], [100, 105]], { d: 0.6 })] },
    oapullup: { props: [BAR(-34)], f: [F([0, -15], -90, [K(0, -33, 1), [100, 85]], [[95, 100], [90, 110]], { d: 0.7 }), F([0, -23], -90, [K(0, -33, 1), [95, 80]], [[100, 95], [95, 105]], { d: 0.7 })] },
    hang: { props: [BAR(-34)], f: [F([0, -15], -90, [K(2, -33, 1), K(-2, -33, -1)], [[95, 100], [90, 110]], { d: 1 }), F([0.4, -15], -91, [K(2, -33, 1), K(-2, -33, -1)], [[97, 100], [92, 110]], { d: 1 })] },
    austrow: { props: [{ k: 'bar', y: -14, x0: -2, x1: 12 }], f: [F([-2.4, -3.1], -15, [K(6, -14, 1), K(5, -14, 1)], [K(-14, 0, 1), K(-14.5, 0, 1)], { d: 0.55 }), F([-4.29, -7.05], -36, [K(6, -14, 1), K(5, -14, 1)], [K(-14, 0, 1), K(-14.5, 0, 1)], { d: 0.55 })] },
    crow: { f: [F([-2, -13], 33.7, [K(5, 0, 1), K(4, 0, 1)], [[60, 180], [55, 175]], { d: 0.9 }), F([-1.6, -13.2], 35, [K(5, 0, 1), K(4, 0, 1)], [[60, 182], [55, 177]], { d: 0.9 })], shake: 0.2 },
    handstand: { f: [fr(HS, { d: 0.9 }), fr(HS2, { d: 0.9 })] },
    wallhs: { props: [{ k: 'wall', x: -6 }], f: [F([-1.5, -18], 85, [K(1, 0, 1), K(-0.5, 0, 1)], [[-100, -100], [-102, -100]], { d: 1 }), F([-1.5, -18.2], 85, [K(1, 0, 1), K(-0.5, 0, 1)], [[-101, -100], [-103, -100]], { d: 1 })] },
    oahs: { f: [F([0, -18], 90, [K(0, 0, 1), [190, 185]], [[-120, -120], [-60, -60]], { d: 0.9 }), F([0.5, -18], 90, [K(0, 0, 1), [192, 182]], [[-122, -118], [-58, -62]], { d: 0.9 })], shake: 0.3 },
    hspu: { f: [fr(HS, { d: 0.6 }), F([0, -15], 90, [K(2.5, 0, -1), K(-2.5, 0, 1)], [[-90, -90], [-90, -90]], { d: 0.6 })] },
    pike: { f: [F([-3, -10.5], 40, [K(5.5, 0, 1), K(4.5, 0, 1)], [K(-8, 0, 1), K(-8.5, 0, 1)], { d: 0.6 }), F([-3, -10.5], 55, [K(5.5, 0, 1), K(4.5, 0, 1)], [K(-8, 0, 1), K(-8.5, 0, 1)], { d: 0.6 })] },
    press: { f: [F([0, -12], 60, [K(5, 0, 1), K(4, 0, 1)], [K(0, 0, 1), K(-1, 0, 1)], { d: 0.7 }), F([3, -17], 95, [K(3, 0, 1), K(2, 0, 1)], [[-150, -150], [-30, -30]], { d: 0.7 }), F([2, -18], 90, [K(3, 0, 1), K(2, 0, 1)], [[-92, -90], [-88, -90]], { d: 0.9 })] },
    ninety: { f: [F([-3, -5], 0, [K(0, 0, 1), K(-1, 0, 1)], [[180, 180], [178, 178]], { d: 0.9 }), F([-3, -5.3], 0, [K(0, 0, 1), K(-1, 0, 1)], [[181, 181], [179, 179]], { d: 0.9 })], shake: 0.3 },
    plank: { f: [F([-3, -4.5], -4, [[90, 0], [95, 0]], [K(-14.5, 0, 1), K(-15, 0, 1)], { d: 1 }), F([-3, -4.8], -4, [[90, 0], [95, 0]], [K(-14.5, 0, 1), K(-15, 0, 1)], { d: 1 })], shake: 0.15 },
    hollow: { f: [F([0, -3], -15, [[-10, -10], [-12, -12]], [[190, 190], [188, 188]], { d: 1 }), F([0, -3], -12, [[-8, -8], [-10, -10]], [[192, 192], [190, 190]], { d: 1 })] },
    legraise: { props: [BAR(-34)], f: [F([0, -15], -90, [K(2, -33, 1), K(-2, -33, -1)], [[90, 90], [92, 92]], { d: 0.6 }), F([0, -15.5], -90, [K(2, -33, 1), K(-2, -33, -1)], [[0, 0], [2, 2]], { d: 0.6 })] },
    lsit: { props: [{ k: 'par', y: -3 }], f: [F([0, -5], -90, [K(0, -3, 1), K(-1, -3, 1)], [[0, 0], [2, 2]], { d: 1 }), F([0.3, -5.3], -90, [K(0, -3, 1), K(-1, -3, 1)], [[-1, -1], [1, 1]], { d: 1 })], shake: 0.2 },
    vsit: { f: [F([1, -3], -119.7, [K(-3, 0, 1), K(-4, 0, 1)], [[-55, -55], [-52, -52]], { d: 1 }), F([1, -3.2], -119.7, [K(-3, 0, 1), K(-4, 0, 1)], [[-60, -60], [-57, -57]], { d: 1 })], shake: 0.25 },
    dragonflag: { props: [{ k: 'bench', x0: -8, x1: 14, y: -5 }], f: [F([2.34, -14.66], 45, [K(13, -6, -1), K(12.5, -6.5, -1)], [[225, 225], [227, 227]], { d: 0.8 }), F([0.48, -11.74], 20, [K(13, -6, -1), K(12.5, -6.5, -1)], [[200, 200], [202, 202]], { d: 0.8 })] },
    flag: { props: [{ k: 'pole', x: -9 }], f: [F([6, -22], 180, [K(-9, -29, 1), K(-9, -15, 1)], [[0, 0], [2, 2]], { d: 1 }), F([6, -22.3], 180, [K(-9, -29, 1), K(-9, -15, 1)], [[-3, -3], [-1, -1]], { d: 1 })], shake: 0.3 },
    manna: { f: [F([1, -6], 200, [K(-3, 0, 1), K(-4, 0, 1)], [[-70, -70], [-68, -68]], { d: 1 }), F([1, -6.3], 200, [K(-3, 0, 1), K(-4, 0, 1)], [[-74, -74], [-72, -72]], { d: 1 })], shake: 0.3 },
    planche: { f: [F([-4, -9.5], 0, [K(1, 0, 1), K(0, 0, 1)], [[180, 180], [178, 178]], { d: 0.9 }), F([-4, -9.8], 0, [K(1, 0, 1), K(0, 0, 1)], [[181, 181], [179, 179]], { d: 0.9 })], shake: 0.3 },
    tuckplanche: { f: [F([-3.88, -10.89], 10, [K(1, 0, 1), K(0, 0, 1)], [[30, 170], [35, 175]], { d: 0.9 }), F([-3.88, -11.1], 10, [K(1, 0, 1), K(0, 0, 1)], [[32, 170], [37, 175]], { d: 0.9 })], shake: 0.25 },
    maltese: { f: [F([-4, -6], 0, [K(-1, 0, 1), K(-2, 0, 1)], [[180, 180], [178, 178]], { d: 0.9 }), F([-4, -6.3], 0, [K(-1, 0, 1), K(-2, 0, 1)], [[181, 181], [179, 179]], { d: 0.9 })], shake: 0.35 },
    frontlever: { props: [BAR(-34)], f: [F([5, -23.5], 180, [K(0, -33, 1), K(-1, -33, 1)], [[0, 0], [-2, -2]], { d: 0.9 }), F([5, -23.8], 180, [K(0, -33, 1), K(-1, -33, 1)], [[1, 1], [-1, -1]], { d: 0.9 })], shake: 0.3 },
    tuckfl: { props: [BAR(-34)], f: [F([5, -23.5], 180, [K(0, -33, 1), K(-1, -33, 1)], [[220, 0], [215, 2]], { d: 0.9 }), F([5, -23.8], 180, [K(0, -33, 1), K(-1, -33, 1)], [[222, 0], [217, 2]], { d: 0.9 })], shake: 0.2 },
    backlever: { props: [BAR(-34)], f: [F([-5, -23.5], 0, [K(0, -33, 1), K(1, -33, 1)], [[180, 180], [182, 182]], { d: 0.9 }), F([-5, -23.8], 0, [K(0, -33, 1), K(1, -33, 1)], [[179, 179], [181, 181]], { d: 0.9 })], shake: 0.3 },
    muscleup: { props: [BAR(-30)], f: [
      F([0, -11], -90, [K(1, -29, 1), K(-1, -29, -1)], [[95, 100], [90, 105]], { d: 0.5 }),
      F([0, -19], -80, [K(1, -29, 1), K(-1, -29, -1)], [[100, 120], [95, 125]], { d: 0.3 }),
      F([0, -31], -90, [K(1, -29, 1), K(-1, -29, -1)], [[95, 95], [92, 98]], { d: 0.7 })] },
    squat: { f: [fr(STAND, { d: 0.6 }), fr(SQUAT_DN, { d: 0.6 })] },
    lunge: { f: [fr(STAND, { a: [[95, 80], [85, 95]], d: 0.6 }), F([-1, -6.5], -88, [[95, 80], [85, 95]], [K(5, 0, -1), K(-8, 0, -1)], { d: 0.6 })] },
    pistol: { f: [F([0, -12], -90, [[100, 88], [80, 92]], [K(0, 0, -1), [80, 90]], { d: 0.7 }), F([-3, -5], -60, [[-5, -5], [0, 0]], [K(0, 0, -1), [-2, -2]], { d: 0.7 })] },
    shrimp: { f: [F([0, -12], -90, [[0, 0], [110, 200]], [K(0, 0, -1), [120, 200]], { d: 0.7 }), F([-1, -5.5], -70, [[0, 0], [110, 200]], [K(0, 0, -1), [140, 200]], { d: 0.7 })] },
    nordic: { f: [F([0, -6], -90, [[60, 170], [70, 160]], [[90, 180], [92, 182]], { d: 1.1 }), F([4.6, -3.86], -40, [[20, 30], [25, 35]], [[140, 180], [142, 182]], { d: 0.6 })] },
    burpee: { f: [
      fr(STAND, { d: 0.25 }),
      F([-3, -6], -40, [K(5, 0, 1), K(4, 0, 1)], [K(1, 0, -1), K(0, 0, -1)], { d: 0.2 }),
      fr(PU_UP, { d: 0.2 }), fr(PU_DN, { d: 0.25 }), fr(PU_UP, { d: 0.2 }),
      F([-3, -6], -40, [K(5, 0, 1), K(4, 0, 1)], [K(1, 0, -1), K(0, 0, -1)], { d: 0.2 }),
      F([0, -15], -90, [[-100, -95], [-80, -85]], [[95, 90], [85, 90]], { d: 0.3 })] },
    mclimb: { f: [fr(PU_UP, { l: [K(-3, 0, -1), K(-12.5, 0, 1)], d: 0.22 }), fr(PU_UP, { l: [K(-12, 0, 1), K(-3.5, 0, -1)], d: 0.22 })] },
    jjack: { f: [fr(STAND, { d: 0.3 }), F([0, -13], -90, [[-95, -90], [-85, -90]], [K(2.5, -1, -1), K(-2.5, -1, -1)], { d: 0.3 })] },
    jump: { props: [{ k: 'rope' }], f: [F([0, -12], -90, [[95, 20], [85, 160]], [[93, 90], [87, 90]], { d: 0.25 }), F([0, -14.5], -90, [[95, 20], [85, 160]], [[95, 100], [85, 95]], { d: 0.25 })] },
    clap: { f: [fr(PU_UP, { d: 0.35 }), fr(PU_DN, { d: 0.3 }), F([-1, -8], -32, [[100, 40], [80, 60]], [K(-12, 0, 1), K(-12.5, 0, 1)], { d: 0.25 })] },
    kipup: { f: [
      F([0, -2], 0, [[175, 180], [178, 180]], [[180, 180], [178, 178]], { d: 0.6 }),
      F([2, -4], 10, [[-20, 60], [-15, 60]], [[-30, -40], [-35, -45]], { d: 0.3 }),
      F([0, -12], -100, [[-130, -110], [-120, -100]], [[110, 95], [100, 90]], { d: 0.25 }),
      F([-2, -7], -70, [[0, 0], [10, 10]], [K(1, 0, -1), K(0, 0, -1)], { d: 0.3 }),
      fr(STAND, { d: 0.6 })] },
    superman: { f: [fr(PU_UP, { d: 0.35 }), fr(PU_DN, { d: 0.3 }), F([-1, -9], -5, [[-5, -5], [-8, -8]], [[180, 180], [178, 178]], { d: 0.35 })] },
    backflip: { f: [
      fr(STAND, { d: 0.45 }),
      F([-1, -7], -75, [[150, 160], [160, 170]], [K(1, 0, -1), K(0, 0, -1)], { d: 0.25 }),
      F([0, -18], -95, [[-100, -95], [-85, -80]], [[95, 90], [90, 90]], { rot: -30, d: 0.15 }),
      F([0, -28], -90, [[60, 0], [70, 10]], [[-10, 120], [-5, 125]], { rot: -150, d: 0.15 }),
      F([0, -24], -90, [[60, 0], [70, 10]], [[-10, 120], [-5, 125]], { rot: -270, d: 0.15 }),
      F([0, -16], -90, [[-30, -30], [-40, -40]], [[95, 90], [90, 90]], { rot: -340, d: 0.12 }),
      F([-1, -8], -70, [[0, 0], [10, 10]], [K(1, 0, -1), K(0, 0, -1)], { rot: -360, d: 0.3 })] },
  };
  // Pré-résolution des frames
  for (const id in POSES) {
    const p = POSES[id];
    p.R = p.f.map(resolve);
    p.total = p.f.reduce((s, f) => s + f.d, 0);
  }

  // Calcule les articulations d'une pose à l'instant t (secondes)
  function poseAt(id, time, once) {
    const p = POSES[id] || POSES.idle;
    if (p.R.length === 1) return joints(p.R[0], p.R[0], 0);
    let tt = once ? Math.min(time, p.total - 1e-4) : time % p.total;
    for (let i = 0; i < p.f.length; i++) {
      const d = p.f[i].d;
      if (tt < d || i === p.f.length - 1) {
        const u = Math.min(1, tt / d);
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; // easeInOut
        const next = once && i === p.f.length - 1 ? i : (i + 1) % p.f.length;
        return joints(p.R[i], p.R[next], e);
      }
      tt -= d;
    }
    return joints(p.R[0], p.R[0], 0);
  }

  // ---------- Apparence ----------
  function lookFor(base, skinId) {
    const sk = DT.D.SKIN[skinId] || DT.D.SKIN.base;
    return Object.assign({ skin: '#e8b48a', hair: '#5b3a29', hs: 'short', top: '#b13e53', sleeves: 'short', bottom: '#333c57', pants: 'short', shoes: '#f4f4f4', hat: null, acc: '#ffcd75', cape: null }, base || {}, sk.look);
  }

  // ---------- Rendu pixel d'une figure ----------
  // On dessine dans une table de pixels (clé "x,y"), puis on vide sur le contexte.
  function Pix() { this.m = new Map(); }
  Pix.prototype.set = function (x, y, c) { this.m.set((x | 0) + ',' + (y | 0), c); };
  Pix.prototype.sq = function (x, y, w, c) {
    const x0 = Math.round(x - (w - 1) / 2), y0 = Math.round(y - (w - 1) / 2);
    for (let i = 0; i < w; i++) for (let j = 0; j < w; j++) this.set(x0 + i, y0 + j, c);
  };
  Pix.prototype.seg = function (a, b, w, c) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len * 2));
    for (let i = 0; i <= n; i++) this.sq(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, w, c);
  };

  function drawLimb(P, pts, w1, w2, c1, c2, endC, endW) {
    P.seg(pts[0], pts[1], w1 + 2, OUT);
    P.seg(pts[1], pts[2], w2 + 2, OUT);
    if (endC) P.sq(pts[2][0], pts[2][1], endW + 2, OUT);
    P.seg(pts[0], pts[1], w1, c1);
    P.seg(pts[1], pts[2], w2, c2);
    if (endC) P.sq(pts[2][0], pts[2][1], endW, endC);
  }

  function figurePixels(J, look, opts) {
    const P = new Pix();
    const L = look;
    const far = 0.72;
    const skin = L.skin, top = L.top, bot = L.bottom;
    const bones = !!L.bones;
    const wA = bones ? 1 : 2, wTh = bones ? 1 : 3, wSh = bones ? 1 : 2;
    const sleeveU = (c) => (L.sleeves === 'none' ? c : top);
    const sleeveL = (c) => (L.sleeves === 'long' ? top : c);
    const shinC = L.pants === 'long' ? bot : skin;
    const up = dir(J.t); // de la nuque vers le haut de la tête
    const fwd = [-up[1], up[0]];

    // Cape (derrière tout)
    if (L.cape) {
      const back = [-fwd[0], -fwd[1]];
      const wave = Math.sin((opts && opts.time || 0) * 6) * 0.8;
      const tip = [J.hip[0] + back[0] * 4 + wave, J.hip[1] + 3];
      P.seg(J.sh, tip, 5, OUT);
      P.seg(J.sh, tip, 3, L.cape);
    }
    // Membres arrière
    drawLimb(P, J.af, wA, wA, shade(sleeveU(skin), far), shade(sleeveL(skin), far), shade(skin, far), 2);
    drawLimb(P, J.lf, wTh, wSh, shade(bot, far), shade(shinC, far), shade(L.shoes, far), 2);
    // Torse
    {
      const len = Math.hypot(J.sh[0] - J.hip[0], J.sh[1] - J.hip[1]);
      const n = Math.ceil(len * 2);
      const wFill = bones ? 2 : 4;
      for (let i = 0; i <= n; i++) {
        const x = J.hip[0] + (J.sh[0] - J.hip[0]) * i / n, y = J.hip[1] + (J.sh[1] - J.hip[1]) * i / n;
        P.sq(x, y, wFill + 2, OUT);
      }
      for (let i = 0; i <= n; i++) {
        const x = J.hip[0] + (J.sh[0] - J.hip[0]) * i / n, y = J.hip[1] + (J.sh[1] - J.hip[1]) * i / n;
        let c = top;
        if (bones) c = (i % 4 < 2) ? '#f4f4f4' : '#c2d3de';
        else if (i < 2) c = bot; // ceinture / short
        else if (i > n - 3 && L.sleeves === 'none' && top === skin) c = skin;
        P.sq(x, y, wFill, c);
      }
    }
    // Jambe avant
    drawLimb(P, J.ln, wTh, wSh, bot, shinC, L.shoes, 2);
    // Tête (dessinée après le bras quand le corps est à l'envers, sinon elle serait cachée)
    const drawHead = () => {
    const hc = [Math.round(J.head[0]), Math.round(J.head[1])];
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
      const d2 = dx * dx + dy * dy;
      if (d2 <= 10) P.set(hc[0] + dx, hc[1] + dy, OUT);
    }
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > 5) continue;
      const du = dx * up[0] + dy * up[1], df = dx * fwd[0] + dy * fwd[1];
      let c = skin;
      if (L.hs !== 'bald' && L.hair !== 'bald') {
        const hair = L.hs === 'fire' || L.hair === 'fire' ? (du > 1.5 ? '#ffcd75' : '#ef7d57') : L.hair;
        if (du >= 0.8) c = hair;
        if (L.hs === 'long' && df <= -0.8 && du >= -1.6) c = hair;
        if (L.hs === 'bun' && df <= -1.2 && du >= -0.5) c = hair;
      }
      if (L.beard && du <= -0.8 && df >= -0.6) c = L.beard;
      P.set(hc[0] + dx, hc[1] + dy, c);
    }
    const hp = (f, u, c) => P.set(Math.round(hc[0] + fwd[0] * f + up[0] * u), Math.round(hc[1] + fwd[1] * f + up[1] * u), c);
    // Œil
    hp(1.3, 0.2, L.eye || OUT);
    if (L.patch) { hp(1.3, 0.2, OUT); hp(0, 1.2, OUT); hp(-1, 1.6, OUT); }
    // Coiffures en relief
    if (L.hs === 'mohawk' && L.hair !== 'bald') { hp(0, 3, OUT); hp(0, 4, OUT); hp(-1, 3, L.hair); hp(0, 3, L.hair); hp(1, 3, L.hair); hp(0, 4, OUT); }
    if (L.hs === 'bun' && L.hair !== 'bald') { hp(-3, 1, OUT); hp(-3, 2, L.hair); hp(-4, 2, OUT); hp(-3, 3, OUT); }
    if (L.hs === 'fire' || L.hair === 'fire') { const t = (opts && opts.time) || 0; const k = Math.floor(t * 8) % 2; hp(0, 3, '#ffcd75'); hp(-1, 3 + k, '#ef7d57'); hp(1, 3 + (1 - k), '#ef7d57'); hp(0, 4 + k, '#b13e53'); }
    // Chapeaux
    const acc = L.acc || '#b13e53';
    switch (L.hat) {
      case 'headband': for (let f = -2; f <= 2; f++) hp(f, 1, acc); hp(-3, 1, acc); hp(-4, 0, acc); hp(-4, 1, acc); break;
      case 'cap': for (let f = -2; f <= 2; f++) { hp(f, 2, acc); hp(f, 1, acc); } hp(3, 1, acc); hp(4, 1, OUT); hp(-1, 3, OUT); hp(0, 3, OUT); hp(1, 3, OUT); break;
      case 'ninja': for (let f = -2; f <= 2; f++) { hp(f, 1, acc); hp(f, -1, L.top); hp(f, -2, L.top); } hp(-3, 1, acc); hp(-4, 0, acc); hp(-5, 0, acc); break;
      case 'viking': for (let f = -2; f <= 2; f++) { hp(f, 1, '#94b0c2'); hp(f, 2, '#c2d3de'); } hp(-3, 2, '#f4f4f4'); hp(-3, 3, '#f4f4f4'); hp(-4, 4, OUT); hp(3, 2, '#f4f4f4'); hp(3, 3, '#f4f4f4'); hp(4, 4, OUT); break;
      case 'visor': for (let f = -1; f <= 3; f++) hp(f, 0.4, acc); hp(-2, 1, OUT); break;
      case 'laurel': hp(-2, 2, '#38b764'); hp(-3, 1, '#a7f070'); hp(2, 2, '#38b764'); hp(3, 1, '#a7f070'); hp(-1, 3, '#38b764'); hp(1, 3, '#38b764'); break;
      case 'crown': for (let f = -2; f <= 2; f++) hp(f, 2, '#ffcd75'); hp(-2, 3, '#ffcd75'); hp(0, 3, '#ffcd75'); hp(2, 3, '#ffcd75'); hp(-2, 4, OUT); hp(0, 4, OUT); hp(2, 4, OUT); hp(0, 2, '#b13e53'); break;
      case 'spartan': for (let f = -2; f <= 2; f++) { hp(f, 0, '#c08a40'); hp(f, 1, '#c08a40'); hp(f, 2, '#e0aa60'); } hp(1, 0, OUT); hp(2, -1, '#c08a40'); hp(-2, -1, '#c08a40'); for (let f = -3; f <= 2; f++) hp(f, 3, '#b13e53'); for (let f = -2; f <= 1; f++) hp(f, 4, '#b13e53'); break;
      case 'pirate': for (let f = -2; f <= 2; f++) { hp(f, 1, acc); hp(f, 2, acc); } hp(-3, 1, acc); hp(-4, 0, acc); hp(-4, -1, acc); break;
      case 'pharaoh': for (let f = -2; f <= 2; f++) { hp(f, 1, '#ffcd75'); hp(f, 2, '#3b5dc9'); } for (let u = -2; u <= 1; u++) { hp(-3, u, u % 2 ? '#3b5dc9' : '#ffcd75'); hp(-2, u - 1, '#3b5dc9'); } hp(0, 3, '#ffcd75'); break;
      case 'lion': for (let f = -3; f <= 2; f++) { hp(f, 2, '#c08a40'); hp(f, 3, '#8a5a3c'); } hp(-3, 1, '#c08a40'); hp(-4, 0, '#8a5a3c'); hp(-4, -1, '#8a5a3c'); hp(2, 4, OUT); hp(-2, 4, OUT); break;
      default: break;
    }
    };
    const hand = J.an[2];
    const inverted = up[1] > 0.3 || ((hand[0] - J.sh[0]) * up[0] + (hand[1] - J.sh[1]) * up[1]) > 1;
    if (!inverted) drawHead();
    // Bras avant (par-dessus la tête quand il passe devant)
    drawLimb(P, J.an, wA, wA, sleeveU(skin), sleeveL(skin), skin, 2);
    // Arme tenue
    if (opts && opts.weapon) drawWeapon(P, J.an[2], opts.weapon, J);
    if (inverted) drawHead();
    return P;
  }

  function drawWeapon(P, hand, w, J) {
    const c = w.c || '#94b0c2', dk = shade(c, 0.6), lt = shade(c, 1.4);
    const [x, y] = [Math.round(hand[0]), Math.round(hand[1])];
    const S = (dx, dy, col) => P.set(x + dx, y + dy, col);
    switch (w.icon) {
      case 'dumbbell': for (let i = -2; i <= 2; i++) S(i, 0, '#94b0c2'); for (const sx of [-3, 3]) for (let j = -2; j <= 2; j++) S(sx, j, j === -2 ? lt : c); for (const sx of [-4, 4]) for (let j = -1; j <= 1; j++) S(sx, j, dk); break;
      case 'kettlebell': S(0, -1, '#566c86'); S(-1, -1, '#566c86'); S(1, -1, '#566c86'); for (let i = -2; i <= 2; i++) for (let j = 1; j <= 4; j++) S(i, j, j === 1 ? lt : c); S(-2, 4, dk); S(2, 4, dk); break;
      case 'whip': { const t = Date.now() / 120; for (let i = 0; i < 8; i++) S(i + 1, Math.round(Math.sin(t + i * 0.7) * 1.5) - 1, i < 2 ? dk : c); break; }
      case 'staff': for (let i = -6; i <= 6; i++) S(Math.round(i * 0.4), i, i === -6 || i === 6 ? lt : c); break;
      case 'sword': for (let i = 1; i <= 8; i++) S(i, -i, i > 6 ? '#ffffff' : lt); S(-1, 1, dk); S(0, 0, c); S(1, 1, c); S(-1, -1, c); break;
      case 'bar': for (let i = -6; i <= 6; i++) S(i, 0, i % 3 === 0 ? lt : c); break;
      case 'plate': for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (i * i + j * j <= 5) S(i, j, i * i + j * j <= 1 ? OUT : c); break;
      default: for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) S(i, j, c); break;
    }
  }

  function flushPix(ctx, P, ox, oy, s, flip, tint) {
    for (const [k, c] of P.m) {
      const i = k.indexOf(',');
      const x = +k.slice(0, i), y = +k.slice(i + 1);
      ctx.fillStyle = tint || c;
      ctx.fillRect(ox + (flip ? -x - 1 : x) * s, oy + y * s, s, s);
    }
  }

  // Accessoires de décor associés aux poses
  function propPixels(props, time, J) {
    const P = new Pix();
    if (!props) return P;
    const M = '#94b0c2', MD = '#566c86', W = '#8a5a3c';
    for (const pr of props) {
      if (pr.k === 'bar') {
        for (let x = pr.x0; x <= pr.x1; x++) { P.set(x, pr.y - 1, OUT); P.set(x, pr.y, M); P.set(x, pr.y + 1, OUT); }
        for (const px of [pr.x0, pr.x1]) for (let y = pr.y - 1; y <= 0; y++) { P.set(px - 1, y, OUT); P.set(px, y, MD); P.set(px + 1, y, OUT); }
      } else if (pr.k === 'dip') {
        for (let x = -9; x <= 9; x++) { P.set(x, pr.y - 1, OUT); P.set(x, pr.y, M); P.set(x, pr.y + 1, OUT); }
        for (const px of [-8, 8]) for (let y = pr.y + 1; y <= 0; y++) { P.set(px, y, MD); P.set(px + 1, y, OUT); }
      } else if (pr.k === 'par') {
        for (let x = -4; x <= 4; x++) { P.set(x, pr.y - 1, OUT); P.set(x, pr.y, M); }
        for (const px of [-4, 4]) for (let y = pr.y + 1; y <= 0; y++) P.set(px, y, MD);
      } else if (pr.k === 'wall') {
        for (let x = pr.x - 7; x <= pr.x; x++) for (let y = -44; y <= 0; y++) {
          const brick = ((y + 44) % 4 === 0) || ((x + ((Math.floor((y + 44) / 4) % 2) * 3)) % 6 === 0);
          P.set(x, y, x === pr.x ? OUT : brick ? '#7a3a3a' : '#a0524a');
        }
      } else if (pr.k === 'pole') {
        for (let y = -44; y <= 0; y++) { P.set(pr.x - 1, y, OUT); P.set(pr.x, y, M); P.set(pr.x + 1, y, MD); P.set(pr.x + 2, y, OUT); }
      } else if (pr.k === 'bench') {
        for (let x = pr.x0; x <= pr.x1; x++) { P.set(x, pr.y - 1, OUT); P.set(x, pr.y, W); P.set(x, pr.y + 1, '#5b3a29'); P.set(x, pr.y + 2, OUT); }
        for (const px of [pr.x0 + 2, pr.x1 - 2]) for (let y = pr.y + 3; y <= 0; y++) P.set(px, y, MD);
      } else if (pr.k === 'rope' && J) {
        const a = J.an[2], b = J.af[2];
        const ph = (time * 2) % 1; // tour de corde
        const ext = Math.cos(ph * Math.PI * 2);
        const midY = ext > 0 ? 2 : -30;
        const n = 16;
        for (let i = 0; i <= n; i++) {
          const u = i / n;
          const x = a[0] + (b[0] - a[0]) * u;
          const y0 = a[1] + (b[1] - a[1]) * u;
          const bulge = Math.sin(u * Math.PI);
          P.set(x + bulge * (ext > 0 ? 0 : 0), y0 + (midY - y0) * bulge * Math.abs(ext), '#e0667a');
        }
      }
    }
    return P;
  }

  // Dessine le héros (ou un humanoïde) : pose, apparence, position au sol (x, y), échelle et miroir
  function drawFigure(ctx, poseId, look, x, y, o = {}) {
    const s = o.s || 1;
    const time = o.time || 0;
    const p = POSES[poseId] || POSES.idle;
    const J = o.J || poseAt(poseId, time, o.once);
    let sx = 0, sy = 0;
    if (p.shake && !o.noShake) { sx = Math.round(Math.sin(time * 37) * p.shake); sy = 0; }
    const flip = !!o.flip;
    const props = o.noProps ? null : p.props;
    if (props) flushPix(ctx, propPixels(props, time, J), Math.round(x), Math.round(y), s, flip);
    const fx = look.fx && DT.P.heroPixels;
    const P = fx ? DT.P.heroPixels(J, look, { time, weapon: o.weapon, pose: p, poseId, back: o.weaponBack }) : figurePixels(J, look, { time, weapon: o.weapon });
    const ox = Math.round(x) + sx * s, oy = Math.round(y) + sy * s;
    if (P.glow && !o.tint) flushPix(ctx, P.glow, ox, oy, s, flip);
    if (P.alpha && !o.tint) ctx.globalAlpha = P.alpha;
    flushPix(ctx, P, ox, oy, s, flip, o.tint);
    ctx.globalAlpha = 1;
    if (P.sparks && !o.tint) for (const sp of P.sparks) { ctx.fillStyle = sp.c; ctx.fillRect(ox + (flip ? -sp.x - 1 : sp.x) * s, oy + sp.y * s, s, s); }
  }
  function figureBounds(poseId) {
    const p = POSES[poseId] || POSES.idle;
    let x0 = 99, x1 = -99, y0 = 99, y1 = -99;
    const acc = (pt) => { x0 = Math.min(x0, pt[0]); x1 = Math.max(x1, pt[0]); y0 = Math.min(y0, pt[1]); y1 = Math.max(y1, pt[1]); };
    for (let i = 0; i < p.R.length; i++) {
      const J = joints(p.R[i], p.R[i], 0);
      [J.hip, J.sh, J.head, ...J.an, ...J.af, ...J.ln, ...J.lf].forEach(acc);
      acc([J.head[0] - 3, J.head[1] - 3]); acc([J.head[0] + 3, J.head[1] + 3]);
    }
    if (p.props) for (const pr of p.props) {
      if (pr.k === 'bar') { acc([pr.x0, pr.y]); acc([pr.x1, pr.y]); }
      if (pr.k === 'pole') acc([pr.x, -44]);
      if (pr.k === 'wall') { acc([pr.x - 7, -44]); }
      if (pr.k === 'bench') { acc([pr.x0, 0]); acc([pr.x1, 0]); }
    }
    acc([0, 0]);
    return { x0, x1, y0, y1 };
  }
  // Vignette statique d'une pose (pour les listes)
  const thumbCache = {};
  function poseThumb(poseId, look, size = 48, frame = 0, sil) {
    const key = poseId + JSON.stringify(look) + size + frame + (sil || '');
    if (thumbCache[key]) return thumbCache[key];
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const b = figureBounds(poseId);
    const ox = Math.round(size / 2 - (b.x0 + b.x1) / 2);
    const oy = Math.round(size / 2 - (b.y0 + b.y1) / 2);
    // sol
    ctx.fillStyle = '#333c57';
    ctx.fillRect(0, oy + 1, size, size - oy - 1);
    ctx.fillStyle = '#566c86';
    ctx.fillRect(0, oy + 1, size, 1);
    const p = POSES[poseId] || POSES.idle;
    const J = joints(p.R[frame % p.R.length], p.R[frame % p.R.length], 0);
    drawFigure(ctx, poseId, look, ox, oy, { J, noShake: true, tint: sil || null, noProps: !!sil });
    return (thumbCache[key] = c.toDataURL());
  }

  // ---------- Scène : canvas basse résolution agrandi sans lissage ----------
  function Stage(canvas, w, h) {
    this.cv = canvas; this.w = w; this.h = h;
    this.low = document.createElement('canvas');
    this.low.width = w; this.low.height = h;
    this.lc = this.low.getContext('2d');
    this.ctx = canvas.getContext('2d');
    this.s = 1; this.dpr = 1;
    this.resize();
  }
  Stage.prototype.resize = function () {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const cssW = this.cv.parentElement ? this.cv.parentElement.clientWidth : 320;
    if (!cssW) return;
    const phys = Math.floor(cssW * dpr);
    const s = Math.max(1, Math.floor(phys / this.w));
    this.s = s; this.dpr = dpr;
    this.cv.width = this.w * s; this.cv.height = this.h * s;
    this.cv.style.width = (this.w * s / dpr) + 'px';
    this.cv.style.height = (this.h * s / dpr) + 'px';
    this.ctx.imageSmoothingEnabled = false;
  };
  Stage.prototype.present = function () {
    if (this.cv.width !== this.w * this.s) this.resize();
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.low, 0, 0, this.w * this.s, this.h * this.s);
  };
  // Texte net au-dessus de la scène (coordonnées en pixels de jeu)
  Stage.prototype.text = function (str, x, y, o = {}) {
    const ctx = this.ctx, s = this.s;
    const px = Math.max(8, Math.round((o.size || 4) * s / 8) * 8);
    ctx.font = px + 'px "Press Start 2P", monospace';
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'alphabetic';
    const X = Math.round(x * s), Y = Math.round(y * s);
    if (o.bg) {
      const w = ctx.measureText(str).width;
      const pad = Math.round(px / 4);
      const bx = o.align === 'left' ? X - pad : o.align === 'right' ? X - w - pad : X - w / 2 - pad;
      ctx.fillStyle = o.bg;
      ctx.fillRect(Math.round(bx), Y - px - pad, Math.round(w + pad * 2), px + pad * 2);
    }
    if (o.shadow !== false) { ctx.fillStyle = OUT; ctx.fillText(str, X + Math.max(1, s / 2), Y + Math.max(1, s / 2)); }
    ctx.fillStyle = o.color || '#f4f4f4';
    ctx.fillText(str, X, Y);
  };

  // ---------- Décors ----------
  function band(ctx, y0, y1, c1, c2, w) {
    // dégradé tramé entre deux couleurs
    const n = y1 - y0;
    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / n;
      for (let x = 0; x < w; x++) {
        const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]][y % 4][x % 4] / 16;
        ctx.fillStyle = t > bayer ? c2 : c1;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  function sky(ctx, w, h, cols) {
    const n = cols.length - 1, step = h / n;
    for (let i = 0; i < n; i++) band(ctx, Math.round(i * step), Math.round((i + 1) * step), cols[i], cols[i + 1], w);
  }
  function tree(ctx, x, y, r, c1, c2) {
    ctx.fillStyle = '#5b3a29'; ctx.fillRect(x - 1, y - 2, 3, r + 4);
    for (let dx = -r - 1; dx <= r + 1; dx++) for (let dy = -r - 1; dy <= r + 1; dy++) {
      const d = dx * dx + dy * dy * 1.3;
      if (d <= (r + 1) * (r + 1)) { ctx.fillStyle = OUT; ctx.fillRect(x + dx, y + dy - r, 1, 1); }
    }
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      const d = dx * dx + dy * dy * 1.3;
      if (d <= r * r) { ctx.fillStyle = (dx - dy > r * 0.4) ? c2 : c1; ctx.fillRect(x + dx, y + dy - r, 1, 1); }
    }
  }
  function skyline(ctx, w, base, col, win, seed, maxH) {
    const r = DT.U.rng(seed);
    let x = 0;
    while (x < w) {
      const bw = 6 + Math.floor(r() * 10), bh = 6 + Math.floor(r() * maxH);
      ctx.fillStyle = col; ctx.fillRect(x, base - bh, bw, bh);
      if (win) for (let wy = base - bh + 2; wy < base - 2; wy += 3) for (let wx = x + 1; wx < x + bw - 1; wx += 2) if (r() < 0.3) { ctx.fillStyle = win; ctx.fillRect(wx, wy, 1, 1); }
      x += bw + Math.floor(r() * 3);
    }
  }
  function stars(ctx, w, h, seed, n) {
    const r = DT.U.rng(seed);
    for (let i = 0; i < n; i++) { ctx.fillStyle = r() < 0.3 ? '#ffcd75' : '#f4f4f4'; ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1); }
  }
  function period(hour) {
    if (hour >= 6 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 18) return 'day';
    if (hour >= 18 && hour < 21) return 'dusk';
    return 'night';
  }
  const SKIES = {
    dawn: ['#5d275d', '#b13e53', '#ef7d57', '#ffcd75'],
    day: ['#3b5dc9', '#41a6f6', '#73eff7', '#c2f5f8'],
    dusk: ['#29366f', '#5d275d', '#b13e53', '#ef7d57'],
    night: ['#1a1c2c', '#1a1c2c', '#29366f', '#3b5dc9'],
  };
  const bgCache = {};
  function bgCanvas(key, w, h, painter) {
    if (bgCache[key]) return bgCache[key];
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    painter(ctx, w, h);
    return (bgCache[key] = c);
  }
  // Parc : le ciel suit l'heure réelle du joueur
  function parkBg(w, h) {
    const per = period(new Date().getHours());
    return bgCanvas('park' + per + w + 'x' + h, w, h, (ctx) => {
      const night = per === 'night';
      sky(ctx, w, 64, SKIES[per]);
      if (night) { stars(ctx, w, 50, 7, 40); }
      // soleil / lune
      const sun = per === 'night' ? ['#f4f4f4', '#c2d3de'] : per === 'day' ? ['#ffcd75', '#fff3c0'] : ['#ffcd75', '#ef7d57'];
      const sx = per === 'dawn' ? 20 : per === 'dusk' ? 135 : 120, sy = per === 'day' ? 12 : 22;
      for (let dx = -5; dx <= 5; dx++) for (let dy = -5; dy <= 5; dy++) if (dx * dx + dy * dy <= 22) { ctx.fillStyle = (dx + dy < -2) ? sun[1] : sun[0]; ctx.fillRect(sx + dx, sy + dy, 1, 1); }
      if (night) { ctx.fillStyle = SKIES.night[1]; for (let dx = -4; dx <= 4; dx++) for (let dy = -5; dy <= 5; dy++) if ((dx - 3) * (dx - 3) + dy * dy <= 18 && dx * dx + dy * dy <= 22) ctx.fillRect(sx + dx, sy + dy, 1, 1); }
      skyline(ctx, w, 60, night ? '#29366f' : per === 'day' ? '#94b0c2' : '#5d275d', night ? '#ffcd75' : null, 3, 22);
      skyline(ctx, w, 64, night ? '#1a1c2c' : per === 'day' ? '#566c86' : '#333c57', night ? '#ef7d57' : null, 11, 12);
      // arbres du fond
      for (let i = 0; i < 9; i++) tree(ctx, 8 + i * 19 + (i % 2) * 5, 66, 5 + (i % 3), night ? '#257179' : '#38b764', night ? '#1a4a50' : '#257179');
      // pelouse
      ctx.fillStyle = night ? '#257179' : '#38b764'; ctx.fillRect(0, 66, w, h - 66);
      ctx.fillStyle = night ? '#38b764' : '#a7f070'; ctx.fillRect(0, 66, w, 1);
      const r = DT.U.rng(5);
      for (let i = 0; i < 120; i++) { ctx.fillStyle = r() < 0.5 ? (night ? '#1a4a50' : '#257179') : (night ? '#38b764' : '#a7f070'); ctx.fillRect(Math.floor(r() * w), 68 + Math.floor(r() * (h - 68)), 1, 1); }
      // allée
      ctx.fillStyle = night ? '#566c86' : '#c8b48a'; ctx.fillRect(0, 84, w, 4);
      ctx.fillStyle = night ? '#333c57' : '#a8946a'; ctx.fillRect(0, 88, w, 2);
      // station de street workout
      const M = '#94b0c2', MD = '#566c86';
      const post = (x, y0) => { ctx.fillStyle = OUT; ctx.fillRect(x - 1, y0, 4, 78 - y0); ctx.fillStyle = MD; ctx.fillRect(x, y0, 2, 78 - y0); };
      post(122, 36); post(150, 36); post(136, 36);
      ctx.fillStyle = OUT; ctx.fillRect(121, 35, 32, 3); ctx.fillStyle = M; ctx.fillRect(122, 36, 30, 1);
      ctx.fillStyle = OUT; ctx.fillRect(135, 47, 16, 3); ctx.fillStyle = M; ctx.fillRect(136, 48, 14, 1);
      // barres parallèles
      post(100, 58); post(113, 58);
      ctx.fillStyle = OUT; ctx.fillRect(99, 57, 17, 3); ctx.fillStyle = M; ctx.fillRect(100, 58, 15, 1);
      // banc
      ctx.fillStyle = OUT; ctx.fillRect(14, 72, 22, 4); ctx.fillStyle = '#8a5a3c'; ctx.fillRect(15, 73, 20, 2);
      ctx.fillStyle = MD; ctx.fillRect(16, 76, 2, 3); ctx.fillRect(32, 76, 2, 3);
      // lampadaire
      ctx.fillStyle = OUT; ctx.fillRect(90, 40, 3, 38); ctx.fillStyle = '#333c57'; ctx.fillRect(91, 40, 1, 38);
      ctx.fillStyle = OUT; ctx.fillRect(88, 38, 7, 3); ctx.fillStyle = night ? '#ffcd75' : '#94b0c2'; ctx.fillRect(89, 39, 5, 1);
      if (night) { ctx.fillStyle = 'rgba(255,205,117,0.12)'; ctx.fillRect(80, 41, 23, 40); }
    });
  }

  const THEMES = {
    park: (ctx, w, h) => {
      sky(ctx, w, 60, SKIES.day);
      skyline(ctx, w, 58, '#94b0c2', null, 2, 18);
      for (let i = 0; i < 8; i++) tree(ctx, 6 + i * 22, 62, 6 + (i % 3), '#38b764', '#257179');
      ctx.fillStyle = '#38b764'; ctx.fillRect(0, 62, w, h - 62);
      ctx.fillStyle = '#a7f070'; ctx.fillRect(0, 62, w, 1);
      ctx.fillStyle = '#c8b48a'; ctx.fillRect(0, 74, w, 16);
      ctx.fillStyle = '#a8946a'; for (let x = 0; x < w; x += 7) ctx.fillRect(x, 78 + (x % 3), 2, 1);
    },
    gym: (ctx, w, h) => {
      ctx.fillStyle = '#333c57'; ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < 62; y += 5) for (let x = (y / 5) % 2 * 6; x < w; x += 12) { ctx.fillStyle = '#29366f'; ctx.fillRect(x, y, 11, 4); }
      for (let i = 0; i < 3; i++) { const x = 18 + i * 52; ctx.fillStyle = OUT; ctx.fillRect(x - 1, 9, 24, 18); ctx.fillStyle = '#5d6a9a'; ctx.fillRect(x, 10, 22, 16); ctx.fillStyle = '#94b0c2'; ctx.fillRect(x + 2, 12, 3, 3); ctx.fillStyle = OUT; ctx.fillRect(x + 10, 12, 1, 12); ctx.fillRect(x + 6, 17, 10, 1); }
      // rack d'haltères
      ctx.fillStyle = '#566c86'; ctx.fillRect(10, 52, 50, 3);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = OUT; ctx.fillRect(12 + i * 8, 47, 6, 5); ctx.fillStyle = '#94b0c2'; ctx.fillRect(13 + i * 8, 48, 4, 3); }
      ctx.fillStyle = '#8a5a3c'; ctx.fillRect(0, 62, w, h - 62);
      for (let y = 62; y < h; y += 4) { ctx.fillStyle = '#5b3a29'; ctx.fillRect(0, y, w, 1); for (let x = (y % 8) * 3; x < w; x += 24) ctx.fillRect(x, y, 1, 4); }
      ctx.fillStyle = 'rgba(26,28,44,0.35)'; ctx.fillRect(0, 0, w, h);
    },
    roof: (ctx, w, h) => {
      sky(ctx, w, 62, SKIES.night); stars(ctx, w, 40, 21, 30);
      for (let dx = -5; dx <= 5; dx++) for (let dy = -5; dy <= 5; dy++) if (dx * dx + dy * dy <= 22) { ctx.fillStyle = '#f4f4f4'; ctx.fillRect(130 + dx, 14 + dy, 1, 1); }
      skyline(ctx, w, 62, '#29366f', '#ffcd75', 9, 30);
      ctx.fillStyle = '#566c86'; ctx.fillRect(0, 62, w, h - 62);
      ctx.fillStyle = '#94b0c2'; ctx.fillRect(0, 62, w, 2);
      ctx.fillStyle = '#333c57'; for (let x = 0; x < w; x += 16) ctx.fillRect(x, 66, 1, h);
      ctx.fillStyle = OUT; ctx.fillRect(20, 30, 2, 32); ctx.fillRect(14, 30, 14, 1); ctx.fillStyle = '#b13e53'; ctx.fillRect(20, 28, 2, 2);
      ctx.fillStyle = OUT; ctx.fillRect(140, 44, 14, 18); ctx.fillStyle = '#8a5a3c'; ctx.fillRect(141, 45, 12, 16);
    },
    temple: (ctx, w, h) => {
      sky(ctx, w, 62, SKIES.dawn);
      ctx.fillStyle = '#5d275d';
      for (let x = 0; x < w; x++) { const y = 40 + Math.round(Math.abs(((x * 0.9) % 60) - 30) * 0.6); ctx.fillRect(x, y, 1, 62 - y); }
      ctx.fillStyle = '#29366f';
      for (let x = 0; x < w; x++) { const y = 48 + Math.round(Math.abs(((x * 1.3 + 20) % 50) - 25) * 0.5); ctx.fillRect(x, y, 1, 62 - y); }
      // pagode
      const px = 120;
      for (let i = 0; i < 3; i++) { ctx.fillStyle = OUT; ctx.fillRect(px - 14 + i * 3, 30 + i * 9, 28 - i * 6 + 6, 3); ctx.fillStyle = '#b13e53'; ctx.fillRect(px - 12 + i * 3, 33 + i * 9, 24 - i * 6 + 2, 6); }
      ctx.fillStyle = '#b0a890'; ctx.fillRect(0, 62, w, h - 62);
      for (let y = 62; y < h; y += 6) for (let x = (y / 6) % 2 * 8; x < w; x += 16) { ctx.fillStyle = '#7a7260'; ctx.fillRect(x, y, 15, 1); ctx.fillRect(x, y, 1, 6); }
    },
    crypt: (ctx, w, h) => {
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < 62; y += 6) for (let x = (y / 6) % 2 * 7; x < w; x += 14) { ctx.fillStyle = '#29366f'; ctx.fillRect(x, y, 13, 5); }
      for (let i = 0; i < 4; i++) { const x = 12 + i * 40; ctx.fillStyle = OUT; ctx.fillRect(x - 1, 42, 14, 20); ctx.fillStyle = '#566c86'; ctx.fillRect(x, 43, 12, 19); ctx.fillStyle = '#333c57'; ctx.fillRect(x + 5, 46, 2, 9); ctx.fillRect(x + 3, 48, 6, 2); }
      for (let i = 0; i < 5; i++) { const x = 30 + i * 30; ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, 30, 2, 5); ctx.fillStyle = '#ffcd75'; ctx.fillRect(x, 27, 2, 3); ctx.fillStyle = 'rgba(255,205,117,0.1)'; ctx.fillRect(x - 6, 22, 14, 16); }
      ctx.fillStyle = '#333c57'; ctx.fillRect(0, 62, w, h - 62);
      for (let x = 0; x < w; x += 9) { ctx.fillStyle = '#29366f'; ctx.fillRect(x, 62, 1, h); }
    },
    volcano: (ctx, w, h) => {
      sky(ctx, w, 62, ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57']);
      ctx.fillStyle = '#1a1c2c';
      for (let x = 0; x < w; x++) { const d = Math.abs(x - 80); const y = d < 12 ? 20 : 20 + (d - 12) * 0.9; ctx.fillRect(x, Math.round(y), 1, 62 - Math.round(y)); }
      ctx.fillStyle = '#ef7d57'; ctx.fillRect(70, 18, 20, 3); ctx.fillStyle = '#ffcd75'; ctx.fillRect(74, 16, 12, 2);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = '#ef7d57'; ctx.fillRect(78 + (i % 3) * 2, 21 + i * 6, 2, 4); }
      ctx.fillStyle = '#333c57'; ctx.fillRect(0, 62, w, h - 62);
      ctx.fillStyle = '#ef7d57'; ctx.fillRect(0, 82, w, 3); ctx.fillStyle = '#ffcd75'; for (let x = 0; x < w; x += 6) ctx.fillRect(x, 83, 3, 1);
      ctx.fillStyle = '#566c86'; for (let x = 3; x < w; x += 11) ctx.fillRect(x, 64 + (x % 5), 4, 2);
    },
    neon: (ctx, w, h) => {
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(0, 0, w, h);
      sky(ctx, w, 60, ['#1a1c2c', '#29366f', '#5d275d']);
      for (let x = 0; x < w; x += 10) { ctx.fillStyle = '#29366f'; ctx.fillRect(x, 20, 1, 40); }
      ctx.fillStyle = '#e05fa8'; ctx.fillRect(40, 14, 80, 2); ctx.fillRect(40, 30, 80, 2); ctx.fillRect(40, 14, 2, 18); ctx.fillRect(118, 14, 2, 18);
      ctx.fillStyle = '#73eff7'; for (let i = 0; i < 6; i++) ctx.fillRect(48 + i * 12, 20, 6, 6);
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(0, 60, w, h - 60);
      ctx.fillStyle = '#e05fa8'; ctx.fillRect(0, 60, w, 1);
      for (let y = 64, k = 1; y < h; y += k, k++) { ctx.fillStyle = '#5d275d'; ctx.fillRect(0, y, w, 1); }
      for (let i = -10; i <= 10; i++) { ctx.fillStyle = '#5d275d'; for (let y = 61; y < h; y++) ctx.fillRect(Math.round(80 + i * 8 * (1 + (y - 60) / 12)), y, 1, 1); }
    },
    olympus: (ctx, w, h) => {
      sky(ctx, w, 62, ['#41a6f6', '#73eff7', '#c2f5f8', '#f4f4f4']);
      const cloud = (x, y, n) => { for (let i = 0; i < n; i++) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + i * 4, y - (i % 2) * 2, 8, 4); } };
      cloud(10, 14, 6); cloud(100, 22, 8); cloud(60, 8, 4);
      for (let i = 0; i < 5; i++) { const x = 10 + i * 34; ctx.fillStyle = OUT; ctx.fillRect(x - 1, 22, 10, 40); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, 23, 8, 39); ctx.fillStyle = '#c2d3de'; ctx.fillRect(x + 2, 26, 1, 34); ctx.fillRect(x + 5, 26, 1, 34); ctx.fillStyle = '#ffcd75'; ctx.fillRect(x - 1, 20, 10, 2); }
      ctx.fillStyle = '#f4f4f4'; ctx.fillRect(0, 62, w, h - 62);
      for (let y = 62; y < h; y += 7) for (let x = (y % 14) ? 0 : 10; x < w; x += 20) { ctx.fillStyle = '#c2d3de'; ctx.fillRect(x, y, 19, 1); }
      ctx.fillStyle = '#ffcd75'; ctx.fillRect(0, 62, w, 1);
    },
  };
  function themeBg(theme, w, h) {
    return bgCanvas('th_' + theme + w + 'x' + h, w, h, THEMES[theme] || THEMES.park);
  }

  DT.P = { OUT, SPR, DEF_PAL, IPAL, ICONS, NAV, ITEM_SPR, spriteCanvas, spriteURL, silURL, iconURL, navURL, itemURL, shade, mix, POSES, poseAt, drawFigure, figureBounds, poseThumb, lookFor, Stage, joints, resolve, Pix, flushPix, LEN, dir, ik, parkBg, themeBg, period };
})(window.DT);
