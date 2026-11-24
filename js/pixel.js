/* ============================================================
 * 像素素材层：程序化绘制 MC 风格图标 / 方块 / 怪物
 * 全部在内存里画，不依赖任何外部图片文件。
 * 想换真实贴图：只改 P.item() / P.tile() / P.mob() 三个入口即可。
 * ============================================================ */
(function () {
  'use strict';
  const MCX = window.MCX = window.MCX || {};
  const P = MCX.PX = {};

  const mkCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return c;
  };

  class Px {
    constructor(w = 16, h = 16) {
      this.w = w; this.h = h;
      this.c = mkCanvas(w, h);
      this.x = this.c.getContext('2d');
      this.x.imageSmoothingEnabled = false;
    }
    rect(x, y, w, h, col) { this.x.fillStyle = col; this.x.fillRect(x, y, w, h); return this; }
    px(x, y, col) { return this.rect(x, y, 1, 1, col); }
    hl(x, y, w, col) { return this.rect(x, y, w, 1, col); }
    vl(x, y, h, col) { return this.rect(x, y, 1, h, col); }
    poly(pts, col) {
      const c = this.x; c.fillStyle = col;
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.closePath(); c.fill();
      return this;
    }
    // 2px 粗的像素斜线（MC 武器常用的画法）
    diag(x, y, len, sx, sy, col, thick = 1) {
      for (let i = 0; i < len; i++) this.rect(x + i * sx, y + i * sy, thick, thick, col);
      return this;
    }
    frameRect(x, y, w, h, col) {
      this.hl(x, y, w, col); this.hl(x, y + h - 1, w, col);
      this.vl(x, y, h, col); this.vl(x + w - 1, y, h, col);
      return this;
    }
    out() { return this.c; }
  }
  P.Px = Px;

  /* ---------------- 调色板 ---------------- */
  const MAT = {
    diamond:   { base: '#3ad7d0', light: '#a6fbf5', dark: '#168f9c', edge: '#0b4d5a' },
    emerald:   { base: '#2ad464', light: '#9bffb9', dark: '#127f3a', edge: '#06391c' },
    gold:      { base: '#f2c534', light: '#fff2a1', dark: '#a87a12', edge: '#66460a' },
    iron:      { base: '#d6d6d6', light: '#ffffff', dark: '#8f8f8f', edge: '#565656' },
    netherite: { base: '#6b5a57', light: '#a08781', dark: '#3a2d2b', edge: '#1d1615' },
    coal:      { base: '#3b3b3b', light: '#666666', dark: '#1a1a1a', edge: '#0b0b0b' },
    redstone:  { base: '#e03a2e', light: '#ff8574', dark: '#8c1409', edge: '#450703' },
    lapis:     { base: '#2f5ad8', light: '#84a6ff', dark: '#15338c', edge: '#091a4a' },
    quartz:    { base: '#efe9dc', light: '#fffdf5', dark: '#b3a894', edge: '#827866' },
    flint:     { base: '#4a4a4a', light: '#6d6d6d', dark: '#2a2a2a', edge: '#151515' },
    copper:    { base: '#d97b4a', light: '#f0a888', dark: '#8a4423', edge: '#4d2412' },
  };
  P.MAT = MAT;

  /* ---------------- 物品图标 ---------------- */
  const ICON = {};

  ICON.ingot = (p, c) => {
    p.poly([[2, 9], [11, 4], [14, 7], [5, 12]], c.base);
    p.poly([[2, 9], [11, 4], [12, 5], [3, 10]], c.light);
    p.poly([[4, 11], [13, 6], [14, 7], [5, 12]], c.dark);
    p.px(11, 4, c.light);
    p.px(13, 6, c.edge);
    return p;
  };

  ICON.gem = (p, c) => {
    p.poly([[8, 1], [14, 6], [8, 15], [2, 6]], c.base);
    p.poly([[8, 1], [14, 6], [8, 7], [2, 6]], c.light);
    p.poly([[8, 7], [14, 6], [8, 15]], c.dark);
    p.poly([[8, 1], [10, 3], [8, 4], [6, 3]], c.light);
    p.px(7, 9, c.edge); p.px(9, 11, c.edge);
    return p;
  };

  ICON.nugget = (p, c) => {
    p.rect(3, 5, 3, 3, c.base); p.rect(8, 4, 4, 3, c.base);
    p.rect(5, 9, 4, 3, c.base); p.rect(10, 8, 3, 3, c.base);
    p.rect(2, 8, 2, 2, c.base);
    p.rect(4, 5, 2, 1, c.light); p.rect(9, 4, 2, 1, c.light); p.rect(6, 9, 2, 1, c.light);
    p.rect(3, 7, 1, 1, c.dark); p.rect(11, 6, 1, 1, c.dark); p.rect(8, 11, 1, 1, c.dark);
    p.rect(12, 10, 1, 1, c.dark);
    return p;
  };

  ICON.dust = (p, c) => {
    p.rect(4, 7, 2, 2, c.base); p.rect(7, 5, 2, 2, c.base);
    p.rect(9, 8, 2, 2, c.base); p.rect(6, 10, 2, 2, c.base);
    p.rect(11, 5, 1, 1, c.base); p.rect(3, 10, 1, 1, c.base);
    p.rect(7, 6, 1, 1, c.light); p.rect(10, 8, 1, 1, c.light); p.rect(4, 8, 1, 1, c.light);
    p.rect(6, 11, 1, 1, c.dark); p.rect(9, 9, 1, 1, c.dark);
    return p;
  };

  function swordIcon(p, c) {
    // 剑身：从剑柄 (5,10) 指向右上 (12,3)
    for (let i = 0; i < 8; i++) {
      p.px(5 + i, 10 - i, c.light);
      p.px(6 + i, 10 - i, c.base);
      p.px(6 + i, 11 - i, c.dark);
    }
    p.px(13, 2, c.light); p.px(12, 2, c.dark);
    // 护手
    for (let i = -2; i <= 2; i++) p.px(4 + i, 10 + i, '#b9b9b9');
    p.px(2, 8, '#8a8a8a'); p.px(6, 12, '#8a8a8a');
    // 握把
    p.px(3, 11, '#6b4a26'); p.px(2, 12, '#6b4a26'); p.px(3, 12, '#4d3418');
    p.px(2, 13, '#8a6a3a'); p.px(1, 12, '#8a6a3a');
    return p;
  }
  ICON.sword = (p, c) => swordIcon(p, c);

  ICON.axe_item = (p, c) => {
    p.diag(4, 12, 8, 1, -1, '#6b4a26', 1);
    p.rect(8, 2, 5, 5, c.base);
    p.rect(7, 3, 6, 4, c.base);
    p.rect(8, 2, 5, 1, c.light);
    p.rect(7, 3, 1, 4, c.light);
    p.rect(8, 6, 5, 1, c.dark);
    p.rect(9, 3, 3, 1, c.dark);
    return p;
  };

  ICON.pickaxe = (p, c) => {
    p.diag(4, 13, 8, 1, -1, '#6b4a26', 1);
    p.px(4, 13, '#4d3418');
    // 镐头：横向弧
    p.rect(2, 3, 3, 2, c.base); p.rect(11, 3, 3, 2, c.base);
    p.rect(3, 2, 10, 2, c.base);
    p.rect(4, 4, 3, 2, c.base); p.rect(9, 4, 3, 2, c.base);
    p.rect(1, 4, 2, 3, c.base); p.rect(13, 4, 2, 3, c.base);
    p.hl(3, 2, 10, c.light);
    p.rect(1, 6, 2, 1, c.dark); p.rect(13, 6, 2, 1, c.dark);
    p.rect(4, 5, 3, 1, c.dark); p.rect(9, 5, 3, 1, c.dark);
    return p;
  };

  ICON.bow = (p) => {
    p.px(6, 2, '#6b4a26'); p.px(5, 3, '#6b4a26'); p.px(4, 4, '#6b4a26');
    p.px(3, 5, '#6b4a26'); p.px(3, 6, '#8a6a3a'); p.px(3, 7, '#8a6a3a');
    p.px(3, 8, '#6b4a26'); p.px(3, 9, '#6b4a26'); p.px(4, 10, '#6b4a26');
    p.px(5, 11, '#6b4a26'); p.px(6, 12, '#6b4a26');
    p.px(7, 3, '#e8e8e8'); p.px(7, 5, '#e8e8e8'); p.px(7, 7, '#e8e8e8');
    p.px(7, 9, '#e8e8e8'); p.px(7, 11, '#e8e8e8');
    p.px(2, 7, '#4d3418');
    return p;
  };

  ICON.crossbow = (p) => {
    p.rect(2, 7, 12, 2, '#6b4a26');
    p.rect(2, 7, 12, 1, '#8a6a3a');
    p.rect(6, 3, 2, 10, '#4d3418');
    p.px(3, 4, '#dcdcdc'); p.px(4, 5, '#dcdcdc'); p.px(12, 4, '#dcdcdc'); p.px(11, 5, '#dcdcdc');
    p.px(3, 9, '#dcdcdc'); p.px(4, 8, '#dcdcdc'); p.px(12, 9, '#dcdcdc'); p.px(11, 8, '#dcdcdc');
    p.rect(12, 7, 3, 2, '#3a3a3a');
    return p;
  };

  ICON.arrow = (p) => {
    p.diag(3, 12, 9, 1, -1, '#a07840', 1);
    p.poly([[13, 2], [14, 5], [10, 3]], '#dcdcdc');
    p.px(12, 6, '#efefef');
    p.px(2, 12, '#e8e8e8'); p.px(3, 13, '#e8e8e8'); p.px(2, 13, '#cfcfcf'); p.px(4, 13, '#cfcfcf');
    return p;
  };

  function appleIcon(p, c) {
    p.rect(4, 4, 8, 8, c.base);
    p.rect(3, 5, 10, 6, c.base);
    p.rect(5, 3, 6, 1, c.base);
    p.rect(4, 12, 8, 1, c.dark);
    p.rect(3, 11, 2, 1, c.dark); p.rect(11, 11, 2, 1, c.dark);
    p.rect(4, 5, 2, 3, c.light); p.px(5, 4, c.light);
    p.rect(8, 2, 1, 3, '#6b4a26');
    p.rect(9, 1, 3, 2, '#3f8a2e');
    p.px(6, 13, c.edge); p.px(9, 13, c.edge);
    return p;
  }
  ICON.apple = (p) => appleIcon(p, { base: '#d93025', light: '#ff6b5e', dark: '#9b1c14', edge: '#6b0d08' });

  ICON.golden_apple = (p) => {
    appleIcon(p, { base: '#f2c534', light: '#fff6a8', dark: '#b5811a', edge: '#7a5209' });
    p.px(1, 1, '#fffbe0'); p.px(14, 3, '#fffbe0'); p.px(2, 14, '#fffbe0'); p.px(14, 13, '#fffbe0');
    return p;
  };

  ICON.bread = (p) => {
    p.rect(2, 5, 12, 6, '#c68a4a');
    p.rect(3, 4, 10, 1, '#dda768');
    p.rect(2, 10, 12, 1, '#96612e');
    p.rect(4, 6, 2, 1, '#e8c48a'); p.rect(8, 7, 2, 1, '#e8c48a'); p.rect(11, 6, 1, 1, '#e8c48a');
    p.rect(6, 8, 2, 1, '#a06a30');
    return p;
  };

  function potionIcon(p, liquid) {
    p.rect(6, 1, 4, 1, '#8a6a3a');
    p.rect(6, 2, 4, 2, '#cfe8f5');
    p.rect(4, 4, 8, 2, '#cfe8f5');
    p.rect(3, 6, 10, 8, '#cfe8f5');
    p.rect(4, 7, 8, 6, liquid);
    p.rect(4, 13, 8, 1, '#8fb8c8');
    p.rect(4, 7, 1, 5, '#ffffff');
    p.px(5, 6, '#ffffff');
    p.frameRect(3, 6, 10, 8, '#7ea8ba');
    p.rect(3, 6, 10, 1, '#7ea8ba');
    return p;
  }
  ICON.potion_heal = (p) => potionIcon(p, '#e8443a');
  ICON.potion_speed = (p) => potionIcon(p, '#4ad8e8');
  ICON.potion_str = (p) => potionIcon(p, '#c04ae8');

  ICON.chest = (p) => {
    p.rect(2, 4, 12, 9, '#8a5a2b');
    p.rect(2, 3, 12, 2, '#a06a34');
    p.rect(2, 6, 12, 1, '#5a3418');
    p.rect(3, 7, 10, 5, '#7a4d24');
    p.rect(7, 6, 2, 3, '#e0c060');
    p.px(7, 7, '#4a2c10');
    p.frameRect(2, 3, 12, 10, '#3d2210');
    return p;
  };

  ICON.tnt = (p) => {
    p.rect(2, 4, 12, 10, '#c8352b');
    p.rect(2, 8, 12, 3, '#e8e8e8');
    p.rect(4, 6, 1, 1, '#f5a08a'); p.rect(9, 10, 1, 1, '#f5a08a');
    p.rect(5, 3, 2, 1, '#4a4a4a'); p.rect(6, 1, 1, 3, '#6b4a26');
    p.frameRect(2, 4, 12, 10, '#5c1610');
    return p;
  };

  ICON.pearl = (p) => {
    p.rect(5, 3, 6, 1, '#2f8a7a'); p.rect(4, 4, 8, 8, '#3fb8a0');
    p.rect(5, 12, 6, 1, '#2f8a7a'); p.rect(6, 2, 4, 1, '#2f8a7a');
    p.rect(6, 13, 4, 1, '#2f8a7a');
    p.rect(5, 5, 2, 3, '#b6f7ea'); p.px(6, 4, '#d8fff8');
    p.rect(9, 9, 2, 2, '#2a6a5e');
    return p;
  };

  ICON.bone = (p) => {
    p.rect(4, 7, 8, 3, '#eceadd');
    p.rect(2, 5, 3, 3, '#eceadd'); p.rect(2, 9, 3, 3, '#eceadd');
    p.rect(11, 5, 3, 3, '#eceadd'); p.rect(11, 9, 3, 3, '#eceadd');
    p.rect(5, 7, 5, 1, '#ffffff');
    p.rect(4, 10, 8, 1, '#c8c6b8');
    return p;
  };

  ICON.string = (p) => {
    const pts = [[3, 12], [4, 11], [5, 10], [6, 10], [7, 9], [8, 8], [9, 8], [10, 7], [11, 6], [12, 5], [12, 4]];
    pts.forEach(([x, y], i) => p.rect(x, y, 2, 1, i % 2 ? '#e8e8e8' : '#cfcfcf'));
    return p;
  };

  ICON.flesh = (p) => {
    p.rect(4, 5, 8, 7, '#8a3a3a');
    p.rect(3, 6, 10, 5, '#8a3a3a');
    p.rect(5, 4, 5, 1, '#a84a4a');
    p.rect(6, 6, 2, 2, '#c86a6a'); p.rect(10, 8, 2, 2, '#c86a6a');
    p.rect(4, 10, 2, 2, '#6a2a2a'); p.rect(9, 11, 3, 1, '#6a2a2a');
    p.px(11, 5, '#d88a8a');
    return p;
  };

  ICON.gunpowder = (p) => ICON.dust(p, { base: '#6a6a6a', light: '#9a9a9a', dark: '#3a3a3a' });
  ICON.spider_eye = (p) => {
    p.rect(5, 4, 6, 8, '#8a1a1a'); p.rect(4, 5, 8, 6, '#a82222');
    p.rect(6, 6, 3, 3, '#e04a4a'); p.rect(7, 7, 2, 2, '#3a0a0a');
    p.px(5, 5, '#ff8a8a');
    return p;
  };

  ICON.armor = (p, c) => {
    p.rect(2, 4, 3, 2, c.light); p.rect(11, 4, 3, 2, c.light);
    p.rect(4, 5, 8, 8, c.base);
    p.rect(3, 6, 2, 5, c.base); p.rect(11, 6, 2, 5, c.base);
    p.rect(5, 5, 6, 1, c.dark);
    p.rect(5, 6, 2, 3, c.light);
    p.rect(4, 12, 8, 1, c.dark);
    p.rect(7, 8, 2, 4, c.dark);
    p.px(3, 11, c.edge); p.px(12, 11, c.edge);
    return p;
  };

  ICON.chestplate_leather = (p) => ICON.armor(p, { base: '#8a5a2b', light: '#b07a44', dark: '#5c3a18', edge: '#3a2410' });
  ICON.chestplate_iron = (p) => ICON.armor(p, { base: '#d6d6d6', light: '#ffffff', dark: '#8f8f8f', edge: '#565656' });
  ICON.chestplate_diamond = (p) => ICON.armor(p, { base: '#3ad7d0', light: '#a6fbf5', dark: '#168f9c', edge: '#0b4d5a' });

  ICON.bag = (p, c) => {
    p.rect(4, 4, 9, 10, c.base);
    p.rect(3, 5, 11, 8, c.base);
    p.rect(4, 3, 9, 2, c.dark);
    p.rect(4, 5, 9, 1, c.light);
    p.rect(5, 7, 7, 1, c.dark);
    p.rect(7, 9, 3, 3, '#e0c060');
    p.rect(3, 5, 1, 8, c.dark);
    p.frameRect(3, 3, 11, 11, c.edge);
    return p;
  };
  ICON.bag_leather = (p) => ICON.bag(p, { base: '#8a5a2b', light: '#b98a54', dark: '#5c3a18', edge: '#33200e' });
  ICON.bag_big = (p) => ICON.bag(p, { base: '#6a7a8a', light: '#95a6b8', dark: '#3f4d5c', edge: '#26313c' });
  ICON.bag_shulker = (p) => {
    p.rect(3, 4, 10, 10, '#8a4ad8');
    p.rect(3, 4, 10, 3, '#a86ae8');
    p.rect(6, 3, 4, 2, '#6a2ab0');
    p.rect(4, 8, 8, 1, '#6a2ab0');
    p.px(5, 6, '#e0c0ff'); p.px(10, 6, '#d0a8ff');
    p.frameRect(3, 3, 10, 11, '#4a1a80');
    return p;
  };

  ICON.shield = (p, c) => {
    p.rect(3, 3, 10, 8, c.base);
    p.rect(4, 11, 8, 2, c.base);
    p.rect(6, 13, 4, 1, c.base);
    p.rect(7, 5, 2, 8, '#8a5a2b');
    p.rect(3, 6, 10, 2, '#8a5a2b');
    p.hl(3, 3, 10, c.light);
    p.frameRect(3, 3, 10, 11, c.dark);
    return p;
  };
  ICON.shield_item = (p) => ICON.shield(p, { base: '#a06a34', light: '#c98f52', dark: '#5c3a18' });

  ICON.scrap = (p) => {
    p.rect(2, 3, 12, 10, '#4a3a36');
    p.rect(3, 4, 10, 8, '#5a4642');
    p.rect(4, 5, 3, 3, '#8a5a3a'); p.rect(8, 7, 4, 3, '#8a5a3a');
    p.rect(6, 9, 2, 2, '#a8724a');
    p.rect(10, 4, 2, 2, '#c08a5a');
    p.frameRect(2, 3, 12, 10, '#241a18');
    return p;
  };

  ICON.torch = (p) => {
    p.rect(7, 6, 2, 9, '#8a6a3a');
    p.rect(7, 6, 1, 9, '#6b4a26');
    p.rect(6, 3, 4, 4, '#f2a13a');
    p.rect(7, 2, 2, 3, '#ffe07a');
    p.px(6, 2, '#ffb347'); p.px(9, 4, '#ffb347');
    return p;
  };

  ICON.coin = (p) => {
    p.rect(4, 3, 8, 10, '#2ad464');
    p.rect(3, 4, 10, 8, '#2ad464');
    p.rect(5, 4, 6, 8, '#65f78e');
    p.poly([[8, 4], [12, 8], [8, 12], [4, 8]], '#1fae52');
    p.px(6, 5, '#d6ffe4');
    return p;
  };

  ICON.heart = (p) => {
    p.rect(3, 4, 4, 3, '#e02b2b'); p.rect(9, 4, 4, 3, '#e02b2b');
    p.rect(2, 5, 12, 4, '#e02b2b');
    p.rect(3, 9, 10, 2, '#e02b2b');
    p.rect(5, 11, 6, 2, '#e02b2b');
    p.rect(7, 13, 2, 1, '#e02b2b');
    p.rect(3, 5, 3, 2, '#ff7a7a');
    p.rect(2, 8, 1, 2, '#8a0f0f'); p.rect(13, 8, 1, 2, '#8a0f0f');
    return p;
  };

  /* ---------------- 生物：字符网格 ---------------- */
  const HUMAN = [
    '................',
    '................',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hssssssssssh..',
    '..hsseesseessh..',
    '..hssepsssepssh..',
    '..hssssmmssssh..',
    '....ssssssss....',
    '..tttttttttttt..',
    '..tTttttttttTt..',
    '..tTttttttttTt..',
    '..ssttttttttss..',
    '....bbbbbbbb....',
    '....bbb..bbb....',
    '....ooo..ooo....',
  ];
  // 上面几行宽度修正（手写容易错位，这里统一裁剪/补齐到 16）
  const ROWS = (arr) => arr.map((r) => (r + '................').slice(0, 16));

  const MOB_ART = {
    player: { rows: ROWS(HUMAN), pal: { h: '#3a2a18', s: '#c69a6b', e: '#ffffff', p: '#2a4a8a', m: '#7a4a2a', t: '#2fa8a0', T: '#1d7a74', b: '#3a4a9a', o: '#3a3a3a' } },
    zombie: { rows: ROWS(HUMAN), pal: { h: '#2d5a22', s: '#5a9e42', e: '#14200f', p: '#0a1206', m: '#14200f', t: '#2f7a6a', T: '#1f564a', b: '#3a3a5a', o: '#2a2a2a' } },
    skeleton: {
      rows: ROWS([
        '................',
        '................',
        '..hhhhhhhhhhhh..',
        '..hssssssssssh..',
        '..hsseessseessh..',
        '..hsssdsssdsssh..',
        '..hssssmmssssh..',
        '....ssssssss....',
        '....s.s..s.s....',
        '..ssssssssssss..',
        '..s.sssssss.s...',
        '....sss.sss.....',
        '....s.s.s.s.....',
        '....s.s.s.s.....',
        '....s...s.......',
        '....oo..oo......',
      ]),
      pal: { h: '#e8e8dc', s: '#e8e8dc', e: '#2a2a24', p: '#1a1a14', m: '#3a3a30', t: '#e0e0d4', T: '#c0c0b4', b: '#e8e8dc', o: '#c0c0b4' },
    },
    creeper: {
      rows: ROWS([
        '................',
        '...hhhhhhhhhh...',
        '..hhhhhhhhhhhh..',
        '..hhhhhhhhhhhh..',
        '..hhdhhhhhhdhh..',
        '..hhdhhhhhhdhh..',
        '..hhhhhhhhhhhh..',
        '..hhhdhhhhdhhh..',
        '..hhhhdhhhdhhh..',
        '..hhhhddddhhhh..',
        '..hhhhhhhhhhhh..',
        '..hhhhhhhhhhhh..',
        '..hhh..hh..hhh..',
        '..hhh..hh..hhh..',
        '..hhh......hhh..',
        '..hhh......hhh..',
      ]),
      pal: { h: '#4a9a3a', d: '#0d1a08' },
    },
    spider: {
      rows: ROWS([
        '................',
        '................',
        '.....dddddd.....',
        '....dddddddd....',
        '....ddeeddee....',
        '....dddddddd....',
        '...d.dddddd.d...',
        '..d..dddddd..d..',
        '..d.dddddddd.d..',
        '...d.dddddd.d...',
        '....d.dddd.d....',
        '.....dddddd.....',
        '................',
        '................',
        '................',
        '................',
      ]),
      pal: { d: '#2a2a2e', e: '#e02b2b' },
    },
    slime: {
      rows: ROWS([
        '................',
        '................',
        '....gggggggg....',
        '...gggggggggg...',
        '..gggggggggggg..',
        '..ggddggggddgg..',
        '..ggddggggddgg..',
        '..gggggggggggg..',
        '..gggddddddggg..',
        '..gggggggggggg..',
        '..ggggggggggg...',
        '...gggggggggg...',
        '....gggggggg....',
        '................',
        '................',
        '................',
      ]),
      pal: { g: '#6ad06a', d: '#122a12' },
    },
    enderman: {
      rows: ROWS([
        '....dddddddd....',
        '...dddddddddd...',
        '...dppddddppd...',
        '...dppddddppd...',
        '...dddddddddd...',
        '....dddddddd....',
        '.....dddddd.....',
        '....dddddddd....',
        '...ddddddddddd..',
        '..d.dddddddd.d..',
        '..d.dddddddd.d..',
        '..d.ddddddd..d..',
        '....dddddd......',
        '....dddddd......',
        '....dd..dd......',
        '....dd..dd......',
      ]),
      pal: { d: '#16161e', p: '#b06ae8' },
    },
    blaze: {
      rows: ROWS([
        '....y......y....',
        '.....yyyyyy.....',
        '....yyyyyyyy....',
        '...yyyydyyyyd...',
        '...yyyydyyyyd...',
        '....yyyyyyyy....',
        '.....yyyyyy.....',
        '......dddd......',
        '....yyyyyyyy....',
        '...y.yyyyyy.y...',
        '..y..yyyyyy..y..',
        '..y..yyyyyy..y..',
        '.....yyyyyy.....',
        '....yy....yy....',
        '................',
        '................',
      ]),
      pal: { y: '#e8c84a', d: '#4a3a10' },
    },
    wither: {
      rows: ROWS([
        '................',
        '..ddd......ddd..',
        '.ddedd....ddedd.',
        '.dddddd..dddddd.',
        '..dddd....dddd..',
        '.....dddddd.....',
        '....ddeddedd....',
        '....dddddddd....',
        '.....dddddd.....',
        '...d.dddddd.d...',
        '...d.dddddd.d...',
        '....dddddddd....',
        '.....d.dd.d.....',
        '.....d.dd.d.....',
        '................',
        '................',
      ]),
      pal: { d: '#2a2a2e', e: '#e02b2b' },
    },
  };

  function artToCanvas(art, scale) {
    const rows = art.rows;
    const w = 16, h = rows.length;
    const p = new Px(w, h);
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < 16; x++) {
        const ch = row[x];
        if (!ch || ch === '.' || ch === ' ') continue;
        const col = art.pal[ch];
        if (col) p.px(x, y, col);
      }
    }
    if (!scale || scale === 1) return p.out();
    const out = mkCanvas(w * scale, h * scale);
    const ox = out.getContext('2d');
    ox.imageSmoothingEnabled = false;
    ox.drawImage(p.c, 0, 0, w, h, 0, 0, w * scale, h * scale);
    return out;
  }

  /* ---------------- 方块纹理 ---------------- */
  function rngFor(seedStr) {
    let s = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { s ^= seedStr.charCodeAt(i); s = Math.imul(s, 16777619); }
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  function noiseTex(seed, base, dark, light, density) {
    const p = new Px(16, 16);
    const r = rngFor(seed);
    p.rect(0, 0, 16, 16, base);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = r();
      if (v < density * 0.55) p.px(x, y, dark);
      else if (v < density) p.px(x, y, light);
    }
    return p;
  }

  const TEX = {
    grass: (s) => noiseTex('grass' + (s || ''), '#5a9e42', '#4a8434', '#6db44e', 0.5),
    dirt: (s) => noiseTex('dirt' + (s || ''), '#7a5a3a', '#654a2f', '#8e6b47', 0.55),
    stone: (s) => noiseTex('stone' + (s || ''), '#8a8a8a', '#7a7a7a', '#9a9a9a', 0.6),
    cobble: () => {
      const p = noiseTex('cobble', '#7d7d7d', '#686868', '#919191', 0.4);
      p.hl(1, 3, 5, '#5c5c5c'); p.hl(8, 2, 6, '#5c5c5c');
      p.hl(2, 8, 4, '#5c5c5c'); p.hl(9, 9, 5, '#5c5c5c');
      p.rect(3, 4, 2, 3, '#a0a0a0'); p.rect(10, 3, 2, 2, '#a0a0a0');
      p.rect(5, 10, 3, 2, '#a0a0a0');
      return p;
    },
    planks: () => {
      const p = noiseTex('planks', '#9c7442', '#8a6538', '#b08850', 0.35);
      [0, 4, 8, 12].forEach((y) => p.hl(0, y, 16, '#6b4a26'));
      p.px(5, 1, '#6b4a26'); p.px(11, 5, '#6b4a26'); p.px(3, 9, '#6b4a26'); p.px(9, 13, '#6b4a26');
      p.hl(0, 2, 16, '#c09a62');
      return p;
    },
    deepslate: (s) => noiseTex('deepslate' + (s || ''), '#4a4a50', '#3c3c42', '#5a5a62', 0.55),
    netherrack: (s) => {
      const p = noiseTex('nether' + (s || ''), '#5c2a2a', '#4a2020', '#743636', 0.6);
      p.rect(3, 4, 4, 1, '#8c4444'); p.rect(9, 10, 4, 1, '#3a1414');
      p.rect(7, 7, 1, 4, '#3a1414');
      return p;
    },
    gravel: () => noiseTex('gravel', '#6a6a6a', '#4f4f4f', '#8a8a8a', 0.85),
    water: () => {
      const p = noiseTex('water', '#2f5c9e', '#2a5390', '#3f72b8', 0.35);
      p.hl(2, 4, 6, '#5a92d8'); p.hl(8, 9, 6, '#5a92d8'); p.hl(4, 12, 5, '#5a92d8');
      return p;
    },
    mossy: () => {
      const p = noiseTex('mossy', '#6a7a52', '#586a44', '#7e9162', 0.6);
      p.rect(2, 3, 3, 2, '#4c5c3a'); p.rect(10, 8, 4, 3, '#4c5c3a');
      p.rect(5, 11, 3, 2, '#8aa06a');
      return p;
    },
    bedrock: () => noiseTex('bedrock', '#3a3a3a', '#232323', '#555555', 0.9),
    furnace: () => {
      const p = noiseTex('furnace', '#7d7d7d', '#6a6a6a', '#909090', 0.5);
      p.rect(3, 7, 10, 7, '#3a3a3a');
      p.rect(4, 8, 8, 5, '#232323');
      p.rect(5, 10, 6, 3, '#e8902a');
      p.rect(6, 11, 4, 2, '#ffd05a');
      p.frameRect(2, 2, 12, 13, '#4a4a4a');
      p.hl(2, 2, 12, '#a0a0a0');
      return p;
    },
    crafting: () => {
      const p = noiseTex('crafting', '#9c7442', '#8a6538', '#b08850', 0.35);
      p.rect(2, 3, 12, 11, '#6b4a26');
      p.rect(3, 4, 10, 9, '#c09a62');
      [4, 8, 12].forEach((y) => p.hl(3, y, 10, '#6b4a26'));
      [3, 8, 13].forEach((x) => p.vl(x, 4, 9, '#6b4a26'));
      p.rect(5, 5, 2, 2, '#dcdcdc'); p.rect(9, 9, 2, 2, '#8a6a3a');
      p.frameRect(2, 3, 12, 11, '#3d2a12');
      return p;
    },
    barrel: () => {
      const p = new Px(16, 16);
      p.rect(2, 2, 12, 13, '#8a5a2b');
      p.rect(2, 2, 12, 2, '#a06a34');
      p.rect(2, 7, 12, 2, '#5a3418');
      p.rect(2, 12, 12, 2, '#5a3418');
      p.rect(4, 4, 2, 11, '#9c6a34');
      p.frameRect(2, 2, 12, 13, '#3d2210');
      return p;
    },
    portal: () => {
      const p = new Px(16, 16);
      p.rect(0, 0, 16, 16, '#2a0a3a');
      const r = rngFor('portal');
      for (let i = 0; i < 40; i++) {
        const x = (r() * 16) | 0, y = (r() * 16) | 0;
        p.px(x, y, r() > 0.5 ? '#a24ae8' : '#6a1ab0');
      }
      for (let i = 0; i < 6; i++) p.rect((r() * 14) | 0, (r() * 14) | 0, 2, 2, '#d89aff');
      return p;
    },
  };

  function wallify(base) {
    // 砖块质感：整体压暗 + 四边倒角，让墙看起来是立起来的方块
    const c = mkCanvas(16, 16);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(base, 0, 0);
    x.fillStyle = 'rgba(0,0,0,0.40)'; x.fillRect(0, 0, 16, 16);
    // 上/左受光
    x.fillStyle = 'rgba(255,255,255,0.13)'; x.fillRect(0, 0, 16, 1);
    x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(0, 0, 1, 16);
    // 下/右背光
    x.fillStyle = 'rgba(0,0,0,0.42)'; x.fillRect(0, 15, 16, 1);
    x.fillStyle = 'rgba(0,0,0,0.30)'; x.fillRect(15, 1, 1, 14);
    // 砖缝
    x.fillStyle = 'rgba(0,0,0,0.22)';
    x.fillRect(0, 7, 16, 1);
    x.fillRect(7, 0, 1, 7);
    x.fillRect(11, 8, 1, 8);
    return c;
  }

  const oreCache = {};
  function oreBlock(matName) {
    if (oreCache[matName]) return oreCache[matName];
    const m = MAT[matName] || MAT.iron;
    const p = new Px(16, 16);
    p.x.drawImage(TEX.stone().c, 0, 0);
    p.x.fillStyle = 'rgba(0,0,0,0.25)'; p.x.fillRect(0, 0, 16, 16);
    const blobs = [[2, 2], [9, 3], [4, 8], [11, 9], [7, 12], [12, 13]];
    blobs.forEach(([bx, by], i) => {
      p.rect(bx, by, 3, 3, m.base);
      p.rect(bx, by, 2, 2, m.light);
      p.rect(bx + 1, by + 1, 2, 2, m.base);
      p.px(bx + 2, by + 2, m.dark);
      if (i % 2) p.px(bx, by + 2, m.edge);
    });
    oreCache[matName] = p.out();
    return p.c;
  }

  /* ---------------- 缓存与对外 API ---------------- */
  const itemCache = new Map();
  const urlCache = new Map();
  const tileCache = new Map();
  const mobCache = new Map();

  function buildItem(spec) {
    const kind = Array.isArray(spec) ? spec[0] : spec;
    const matName = Array.isArray(spec) ? spec[1] : null;
    const fn = ICON[kind];
    if (!fn) {
      const p = new Px(16, 16);
      p.rect(3, 3, 10, 10, '#ff00ff');
      return p.out();
    }
    const p = new Px(16, 16);
    return fn(p, MAT[matName] || MAT.iron).out();
  }

  P.itemSpec = (spec) => {
    const k = Array.isArray(spec) ? spec.join(':') : String(spec);
    if (!itemCache.has(k)) itemCache.set(k, buildItem(spec));
    return itemCache.get(k);
  };

  P.item = (id) => {
    const data = MCX.DATA && MCX.DATA.items && MCX.DATA.items[id];
    const spec = (data && data.icon) || ['scrap'];
    return P.itemSpec(spec);
  };

  P.url = (spec, scale) => {
    const key = (Array.isArray(spec) ? spec.join(':') : spec) + '@' + (scale || 1);
    if (urlCache.has(key)) return urlCache.get(key);
    const src = P.itemSpec(spec);
    let out = src;
    if (scale && scale !== 1) {
      out = mkCanvas(16 * scale, 16 * scale);
      const x = out.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.drawImage(src, 0, 0, 16, 16, 0, 0, 16 * scale, 16 * scale);
    }
    const u = out.toDataURL();
    urlCache.set(key, u);
    return u;
  };

  P.itemURL = (id, scale) => {
    const data = MCX.DATA && MCX.DATA.items && MCX.DATA.items[id];
    return P.url((data && data.icon) || ['scrap'], scale);
  };

  P.tile = (name) => {
    if (tileCache.has(name)) return tileCache.get(name);
    let src;
    if (name.startsWith('ore_')) src = oreBlock(name.slice(4));
    else if (name.startsWith('wall_')) {
      const b = TEX[name.slice(5)];
      src = wallify((b ? b('') : TEX.stone('')).c);
    } else {
      const f = TEX[name];
      src = (f ? f('') : TEX.stone('')).c;
    }
    const out = mkCanvas(32, 32);
    const x = out.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, 16, 16, 0, 0, 32, 32);
    tileCache.set(name, out);
    return out;
  };

  // 墙体纹理变体：用不同噪声种子打破重复感
  P.wallVar = (wallName, v) => {
    const key = 'wv:' + wallName + ':' + v;
    if (tileCache.has(key)) return tileCache.get(key);
    const mat = wallName.startsWith('wall_') ? wallName.slice(5) : 'stone';
    const fn = TEX[mat] || TEX.stone;
    const src = wallify(fn(String(v || '')).c);
    const out = mkCanvas(32, 32);
    const x = out.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, 16, 16, 0, 0, 32, 32);
    tileCache.set(key, out);
    return out;
  };

  P.mob = (name) => {
    if (mobCache.has(name)) return mobCache.get(name);
    const art = MOB_ART[name] || MOB_ART.player;
    const c = artToCanvas(art, 2);
    mobCache.set(name, c);
    return c;
  };

  P.mobArt = MOB_ART;
  P.mkCanvas = mkCanvas;
  P.Px = Px;

  // 墙体投影：贴墙的地面压一层渐变，制造“墙立起来了”的高度感
  let shadowCache = null;
  P.shadowTop = () => {
    if (shadowCache) return shadowCache;
    const c = mkCanvas(32, 14);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 14);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 14);
    shadowCache = c;
    return c;
  };

  // 墙脚向下的投影（正面下方）
  let shadowBottomCache = null;
  P.shadowBottom = () => {
    if (shadowBottomCache) return shadowBottomCache;
    const c = mkCanvas(32, 10);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 10);
    g.addColorStop(0, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 10);
    shadowBottomCache = c;
    return c;
  };

  /* ---------------- 视口装饰：草花、碎石 ---------------- */
  P.decor = (seed, kind) => {
    const p = new Px(16, 16);
    const r = rngFor('decor' + seed + kind);
    if (kind === 'flower') {
      const col = ['#e8d44a', '#e04a4a', '#ffffff'][(r() * 3) | 0];
      p.rect(7, 8, 1, 6, '#3f7a2e');
      p.rect(6, 5, 3, 3, col);
      p.px(7, 6, '#f5f0c0');
    } else if (kind === 'pebble') {
      p.rect(5, 9, 3, 2, '#8a8a8a'); p.rect(9, 11, 2, 2, '#7a7a7a');
      p.rect(7, 8, 1, 1, '#a0a0a0');
    } else if (kind === 'crack') {
      p.rect(7, 4, 1, 9, '#4a4a4a'); p.rect(8, 8, 2, 1, '#4a4a4a'); p.rect(5, 11, 3, 1, '#4a4a4a');
    } else if (kind === 'mushroom') {
      p.rect(7, 9, 2, 5, '#e8e0d0');
      p.rect(5, 6, 6, 4, '#c0392b');
      p.rect(6, 7, 1, 1, '#ffffff'); p.rect(9, 8, 1, 1, '#ffffff');
    }
    return p.out();
  };

  /* ============================================================
   * 2D 像素小人：官方 16×16 头像 + 平板 Q 版身体
   * （3D 渲染图只在 ?style=3d 时使用）
   * ============================================================ */
  const FACE_KEY = {
    player: null, zombie: 'face_zombie', skeleton: 'face_skeleton', creeper: 'face_creeper',
    spider: 'face_spider', slime: 'face_slime', enderman: 'face_enderman', blaze: 'face_blaze', wither: 'face_wither',
  };

  // 身体配色：[主色, 暗色, 辅色]
  const CHIBI_PAL = {
    player:   { t: '#2fa8a0', T: '#1d7a74', s: '#c69a6b', b: '#3a4a9a', o: '#2a2a2a' },
    zombie:   { t: '#2f7a6a', T: '#1f564a', s: '#5a9e42', b: '#3a3a5a', o: '#2a2a2a' },
    skeleton: { t: '#e8e8dc', T: '#c6c6ba', s: '#e8e8dc', b: '#e8e8dc', o: '#b8b8ac' },
    creeper:  { g: '#4a9a3a', d: '#3a8a2a' },
    spider:   { d: '#2a2a2e', e: '#ff4a4a' },
    slime:    { g: '#6ad06a', d: '#4ab04a' },
    enderman: { d: '#16161e', e: '#b06ae8' },
    blaze:    { y: '#e8c84a', d: '#8a6a12' },
    wither:   { d: '#2a2a2e', e: '#ff4a4a' },
  };

  // 16 宽 × 22 高；0~11 行留给头，12~21 行是身体
  const CHIBI_BODY = {
    player: [
      '...tttttttttt...',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '..ssttttttttss..',
      '....tttttttt....',
      '....bbbbbbbb....',
      '....bbb..bbb....',
      '....bbb..bbb....',
      '....ooo..ooo....',
      '................',
    ],
    zombie: [
      '...tttttttttt...',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '..ssttttttttss..',
      '....tttttttt....',
      '....bbbbbbbb....',
      '....bbb..bbb....',
      '....bbb..bbb....',
      '....ooo..ooo....',
      '................',
    ],
    skeleton: [
      '...ssssssssss...',
      '..ssssssssssss..',
      '..s.sssssss.s...',
      '..s..ssss..s....',
      '....ssssssss....',
      '....ssssssss....',
      '....ss....ss....',
      '....ss....ss....',
      '....ooooo.......',
      '................',
    ],
    creeper: [
      '...gggggggggg...',
      '..gggggggggggg..',
      '..gggggggggggg..',
      '..gggggggggggg..',
      '..gggggggggggg..',
      '..gggggggggggg..',
      '..ggg..gg..ggg..',
      '..ggg..gg..ggg..',
      '..ggg......ggg..',
      '................',
    ],
    spider: [
      '....dddddddd....',
      '..dddddddddddd..',
      '.dd.dddddddd.dd.',
      '.d..dddddddd..d.',
      'd.d.dddddddd.d.d',
      '.d..dddddddd..d.',
      '..d.dddddddd.d..',
      '....dddddddd....',
      '................',
      '................',
    ],
    slime: [
      '....gggggggg....',
      '...gggggggggg...',
      '..gggggggggggg..',
      '..gggggggggggg..',
      '..gggggggggggg..',
      '...gggggggggg...',
      '....gggggggg....',
      '................',
      '................',
      '................',
    ],
    enderman: [
      '....dddddddd....',
      '...dddddddddd...',
      '...dddddddddd...',
      '..dd.dddddd.dd..',
      '..dd.dddddd.dd..',
      '..d..dddddd..d..',
      '....dddddddd....',
      '....dddddddd....',
      '....dd....dd....',
      '....dd....dd....',
    ],
    blaze: [
      '....yyyyyyyy....',
      '...yyyyyyyyyy...',
      '..y.yyyyyyyy.y..',
      '..y.yyyyyyyy.y..',
      '..y..yyyyyy..y..',
      '.....yyyyyy.....',
      '....yy....yy....',
      '....dd....dd....',
      '................',
      '................',
    ],
    wither: [
      '..dddddddddddd..',
      '..dddddddddddd..',
      '...dd.dddd.dd...',
      '...dd.dddd.dd...',
      '....dddddddd....',
      '.....d.dd.d.....',
      '.....dddddd.....',
      '................',
      '................',
      '................',
    ],
  };

  const chibiCache = new Map();
  const faceCache = new Map();

  // 玩家头像（10×10，程序化画的 Steve）
  function steveFace() {
    if (faceCache.has('player')) return faceCache.get('player');
    const rows = [
      'hhhhhhhhhh',
      'hssssssssh',
      'hssssssssh',
      'hseesseesh',
      'hseddddesh',
      'hssssssssh',
      'hssmmmsssh',
      'hssssssssh',
      'hssssssssh',
      '.ssssssss.',
    ];
    const pal = { h: '#3a2a18', s: '#c69a6b', S: '#a87a4e', e: '#ffffff', d: '#2a4a8a', m: '#8a5a3a' };
    const c = mkCanvas(10, 10);
    const x = c.getContext('2d');
    for (let y = 0; y < rows.length; y++) {
      for (let i = 0; i < rows[y].length; i++) {
        const col = pal[rows[y][i]];
        if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
      }
    }
    faceCache.set('player', c);
    return c;
  }

  P.chibi = function (name) {
    if (chibiCache.has(name)) return chibiCache.get(name);
    const pal = CHIBI_PAL[name] || CHIBI_PAL.zombie;
    const body = CHIBI_BODY[name] || CHIBI_BODY.zombie;
    const c = mkCanvas(16, 22);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;

    // 身体
    for (let r = 0; r < body.length; r++) {
      const row = body[r];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (!ch || ch === '.') continue;
        const col = pal[ch];
        if (col) { x.fillStyle = col; x.fillRect(i, 12 + r, 1, 1); }
      }
    }
    // 头
    const faceKey = FACE_KEY[name];
    const face = faceKey ? P.assets.faces[faceKey] : steveFace();
    if (face) {
      x.imageSmoothingEnabled = false;
      x.drawImage(face, 0, 0, face.width, face.height, 2, 0, 12, 12);
    } else if (name === 'player') {
      x.drawImage(steveFace(), 2, 1, 10, 10);
    }
    // 描边（底部阴影，增强立体感）
    x.fillStyle = 'rgba(0,0,0,0.22)';
    x.fillRect(2, 21, 12, 1);
    // 放大 2 倍后返回，保持像素锐利
    const out = toCanvas(c, 32, 44);
    chibiCache.set(name, out);
    return out;
  };

  /* ============================================================
   * 官方素材覆盖层（Minecraft Wiki · zh.minecraft.wiki）
   * 成功加载 assets/tex/*.png 就覆盖程序化像素图；任意一张失败自动回退
   * ============================================================ */
  P.assets = { items: {}, tiles: {}, mobs: {}, faces: {} };
  P.mobStyle = '3d';
  P.assetCount = 0;
  const assetURLs = new Map();
  const _itemSpec = P.itemSpec, _item = P.item, _itemURL = P.itemURL;
  const _tile = P.tile, _wallVar = P.wallVar, _mob = P.mob, _decor = P.decor;

  // 渲染图按“显示高度”归一化，避免不同实体比例被拉伸
  const MOB_H = { player: 46, zombie: 42, skeleton: 44, creeper: 46, spider: 30, slime: 32, enderman: 52, blaze: 46, wither: 92 };

  function toCanvas(img, w, h, smooth) {
    const c = mkCanvas(w, h);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = !!smooth;
    if (smooth) x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, w, h);
    return c;
  }

  P.loadAssets = function (man, done) {
    const tasks = [];
    const finish = () => { P.assetReady = true; chibiCache.clear(); if (done) done(); };
    if (!man) { setTimeout(finish, 0); return; }
    const load = (map, bucket) => {
      if (!map) return;
      Object.keys(map).forEach((key) => {
        tasks.push(new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              if (bucket === 'mobs') {
                const th = MOB_H[key] || 44;
                const tw = Math.max(10, Math.round((img.width * th) / img.height));
                P.assets.mobs[key] = toCanvas(img, tw, th, true);
              } else {
                P.assets[bucket][key] = toCanvas(img, 16, 16);
              }
              P.assetCount++;
            } catch (e) { /* 忽略单张失败 */ }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = map[key];
        }));
      });
    };
    load(man.items, 'items');
    load(man.tiles, 'tiles');
    load(man.faces, 'faces');
    load(man.mobs, 'mobs');
    Promise.all(tasks).then(finish, finish);
  };

  P.itemSpec = (spec) => {
    const k = Array.isArray(spec) ? spec[0] : String(spec);
    if (P.assets.items[k]) return P.assets.items[k];
    return _itemSpec(spec);
  };

  P.item = (id) => (P.assets.items[id] ? P.assets.items[id] : _item(id));

  P.tile = (name) => {
    if (P.assets.tiles[name]) {
      const k = name + '!32';
      if (!tileCache.has(k)) tileCache.set(k, toCanvas(P.assets.tiles[name], 32, 32));
      return tileCache.get(k);
    }
    return _tile(name);
  };

  P.wallVar = (wallName, v) => (P.assets.tiles[wallName] ? P.tile(wallName) : _wallVar(wallName, v));

  // 墙体正面（侧面）贴图：原生比例裁一段，压暗 + 上沿高光 + 墙脚暗边
  const wallFaceCache = new Map();
  P.wallFace = (wallName, h) => {
    const H = h || 28;
    const key = wallName + ':' + H;
    if (wallFaceCache.has(key)) return wallFaceCache.get(key);
    const top = P.tile(wallName);
    const c = mkCanvas(32, H);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    // 竖向拉伸铺满（砖块看起来是立起来的墙面）
    x.drawImage(top, 0, 0, 32, 32, 0, 0, 32, H);
    x.fillStyle = 'rgba(0,0,0,0.34)';
    x.fillRect(0, 0, 32, H);
    // 顶部受光边
    x.fillStyle = 'rgba(255,255,255,0.26)';
    x.fillRect(0, 0, 32, 3);
    x.fillStyle = 'rgba(255,255,255,0.10)';
    x.fillRect(0, 3, 32, 1);
    // 墙脚暗边
    x.fillStyle = 'rgba(0,0,0,0.45)';
    x.fillRect(0, H - 5, 32, 5);
    wallFaceCache.set(key, c);
    return c;
  };

  P.mob = (name) => {
    if (P.mobStyle === '3d' && P.assets.mobs[name]) return P.assets.mobs[name];
    const faceKey = FACE_KEY[name];
    if (!faceKey || P.assets.faces[faceKey] || name === 'player') return P.chibi(name);
    return _mob(name);
  };

  P.decor = (seed, kind) => {
    const t = P.assets.tiles;
    if (kind === 'flower' && t.decor_flower) return t.decor_flower;
    if (kind === 'mushroom' && t.decor_mushroom) return t.decor_mushroom;
    return _decor(seed, kind);
  };

  P.itemURL = (id, scale) => {
    const a = P.assets.items[id];
    if (!a) return _itemURL(id, scale);
    const k = 'a:' + id + '@' + (scale || 1);
    if (assetURLs.has(k)) return assetURLs.get(k);
    let src = a;
    if (scale && scale !== 1) {
      src = mkCanvas(16 * scale, 16 * scale);
      const x = src.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.drawImage(a, 0, 0, 16, 16, 0, 0, 16 * scale, 16 * scale);
    }
    const u = src.toDataURL();
    assetURLs.set(k, u);
    return u;
  };

  /* ============================================================
   * 等距（45° 菱形）预渲染：地面菱形 + 立体方块
   * 菱形宽 64、高 32（2:1），方块高度 H 像素
   * ============================================================ */
  const isoCache = new Map();

  P.isoFloor = (texName) => {
    const key = 'f:' + texName;
    if (isoCache.has(key)) return isoCache.get(key);
    const tex = P.tile(texName);
    const c = mkCanvas(64, 32);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.setTransform(1, 0.5, -1, 0.5, 32, 16);
    x.drawImage(tex, -16, -16, 32, 32);
    x.setTransform(1, 0, 0, 1, 0, 0);
    // 菱形描边，格子更清晰
    x.strokeStyle = 'rgba(0,0,0,0.16)';
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(32, 0.5); x.lineTo(63.5, 16); x.lineTo(32, 31.5); x.lineTo(0.5, 16); x.closePath();
    x.stroke();
    isoCache.set(key, c);
    return c;
  };

  function fillQuad(x, pts, color) {
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
    x.fillStyle = color;
    x.fill();
  }

  P.isoBlock = (texName, H) => {
    const key = 'b:' + texName + ':' + H;
    if (isoCache.has(key)) return isoCache.get(key);
    const tex = P.tile(texName);
    const h = H || 24;
    const c = mkCanvas(64, 32 + h);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;

    // 顶面（菱形）
    x.save();
    x.setTransform(1, 0.5, -1, 0.5, 32, 16);
    x.drawImage(tex, -16, -16, 32, 32);
    x.restore();

    // 左下侧面：origin(0,16)，u=(1,0.5)，v=(0,h/32)
    x.save();
    x.setTransform(1, 0.5, 0, h / 32, 0, 16);
    x.drawImage(tex, 0, 0, 32, 32);
    x.restore();
    fillQuad(x, [[0, 16], [32, 32], [32, 32 + h], [0, 16 + h]], 'rgba(0,0,0,0.34)');

    // 右下侧面：origin(32,32)，u=(1,-0.5)，v=(0,h/32)
    x.save();
    x.setTransform(1, -0.5, 0, h / 32, 32, 32);
    x.drawImage(tex, 0, 0, 32, 32);
    x.restore();
    fillQuad(x, [[32, 32], [64, 16], [64, 16 + h], [32, 32 + h]], 'rgba(0,0,0,0.18)');

    // 顶面轮廓
    x.strokeStyle = 'rgba(0,0,0,0.20)';
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(32, 0.5); x.lineTo(63.5, 16); x.lineTo(32, 31.5); x.lineTo(0.5, 16); x.closePath();
    x.stroke();
    // 底面收边
    x.strokeStyle = 'rgba(0,0,0,0.35)';
    x.beginPath();
    x.moveTo(0, 16 + h); x.lineTo(32, 32 + h); x.lineTo(64, 16 + h);
    x.stroke();

    isoCache.set(key, c);
    return c;
  };

  MCX.PX.ready = true;
})();
