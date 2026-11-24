/* ============================================================
 * 引擎层：数学工具 / 输入 / 相机 / 粒子 / 飘字 / 音效 / 存档
 * ============================================================ */
(function () {
  'use strict';
  const MCX = window.MCX = window.MCX || {};
  const E = MCX.E = {};

  E.W = 960; E.H = 540; E.TILE = 32;

  /* ---------------- 数学 ---------------- */
  E.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  E.lerp = (a, b, t) => a + (b - a) * t;
  E.rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  E.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  E.pick = (arr) => arr[(Math.random() * arr.length) | 0];
  E.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
  E.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  E.dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
  E.angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  E.angLerp = (a, b, t) => a + E.angDiff(b, a) * t;
  E.pointInRect = (px, py, x, y, w, h) => px >= x && px <= x + w && py >= y && py <= y + h;

  // 带权随机
  E.weighted = (list) => {
    let total = 0;
    for (const it of list) total += it.w;
    let r = Math.random() * total;
    for (const it of list) { r -= it.w; if (r <= 0) return it; }
    return list[list.length - 1];
  };

  /* ---------------- 输入 ---------------- */
  const Input = E.Input = {
    keys: Object.create(null),
    just: Object.create(null),
    mouse: { x: E.W / 2, y: E.H / 2, down: false, justDown: false, right: false, justRight: false },
    any: false,
    touch: false,
    enabled: true,
  };

  Input.codes = {
    KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
    ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd',
    Space: 'space', KeyE: 'e', Tab: 'tab', KeyF: 'f', Escape: 'esc',
    Digit1: '1', Digit2: '2', Digit3: '3', ShiftLeft: 'shift', ShiftRight: 'shift',
  };

  Input.init = (canvas) => {
    const map = (e) => {
      const k = Input.codes[e.code] || (e.key && e.key.toLowerCase());
      return k;
    };
    window.addEventListener('keydown', (e) => {
      const k = map(e);
      if (!k) return;
      if (['w', 'a', 's', 'd', 'space', 'tab', 'e', 'f', '1', '2', '3'].includes(k)) e.preventDefault();
      if (!Input.keys[k]) Input.just[k] = true;
      Input.keys[k] = true;
      Input.any = true;
      if (MCX.SFX) MCX.SFX.unlock();
    }, { passive: false });
    window.addEventListener('keyup', (e) => {
      const k = map(e);
      if (!k) return;
      Input.keys[k] = false;
    });
    window.addEventListener('blur', () => { for (const k in Input.keys) Input.keys[k] = false; });

    const toLocal = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * E.W,
        y: ((clientY - r.top) / r.height) * E.H,
      };
    };
    canvas.addEventListener('mousemove', (e) => {
      const p = toLocal(e.clientX, e.clientY);
      Input.mouse.x = p.x; Input.mouse.y = p.y;
    });
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      MCX.SFX && MCX.SFX.unlock();
      const p = toLocal(e.clientX, e.clientY);
      Input.mouse.x = p.x; Input.mouse.y = p.y;
      if (e.button === 0) { Input.mouse.down = true; Input.mouse.justDown = true; }
      if (e.button === 2) { Input.mouse.right = true; Input.mouse.justRight = true; }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) Input.mouse.down = false;
      if (e.button === 2) Input.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('blur', () => { Input.mouse.down = false; Input.mouse.right = false; });

    /* ---- 触屏虚拟摇杆 ---- */
    const touchState = { stick: null, moveX: 0, moveY: 0, buttons: [] };
    Input.touchState = touchState;
    const handleTouch = (e) => {
      e.preventDefault();
      Input.touch = true;
      touchState.buttons = [];
      touchState.moveX = 0; touchState.moveY = 0;
      let stickId = null;
      const rect = canvas.getBoundingClientRect();
      for (const t of e.touches) {
        const x = ((t.clientX - rect.left) / rect.width) * E.W;
        const y = ((t.clientY - rect.top) / rect.height) * E.H;
        if (x < E.W * 0.45 && stickId === null) {
          stickId = t.identifier;
          touchState.stick = { ox: x, oy: y, x, y };
          const dx = x - touchState.stick.ox, dy = y - touchState.stick.oy;
          const d = Math.hypot(dx, dy) || 1;
          const m = Math.min(d, 46) / 46;
          touchState.moveX = (dx / d) * m;
          touchState.moveY = (dy / d) * m;
        } else {
          touchState.buttons.push({ x, y });
        }
      }
      if (!stickId) touchState.stick = null;
      // 触屏按钮：A 攻击 / E 交互 / D 冲刺 / B 背包
      Input.mouse.down = touchState.buttons.some((b) => b.x > E.W - 140 && b.y > E.H - 120);
      Input.mouse.justDown = Input.mouse.down;
      Input.keys.e = touchState.buttons.some((b) => b.x > E.W - 250 && b.x < E.W - 150 && b.y > E.H - 130);
      Input.keys.space = touchState.buttons.some((b) => b.x > E.W - 150 && b.x < E.W - 60 && b.y > E.H - 230 && b.y < E.H - 140);
      if (touchState.buttons.some((b) => b.x > E.W - 80 && b.y < 70)) Input.just.tab = true;
      // 瞄准：右半屏点击方向
      if (touchState.buttons.length) {
        const b = touchState.buttons[0];
        const p = MCX.Game && MCX.Game.player;
        if (p) {
          const wx = p.x + (b.x - E.W / 2), wy = p.y + (b.y - E.H / 2);
          Input.mouse.x = E.W / 2 + (wx - p.x) * 0.5;
          Input.mouse.y = E.H / 2 + (wy - p.y) * 0.5;
        }
      }
    };
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleTouch, { passive: false });
  };

  Input.axis = () => {
    let x = 0, y = 0;
    if (Input.keys.a) x -= 1;
    if (Input.keys.d) x += 1;
    if (Input.keys.w) y -= 1;
    if (Input.keys.s) y += 1;
    if (Input.touchState) { x += Input.touchState.moveX; y += Input.touchState.moveY; }
    const d = Math.hypot(x, y);
    if (d > 1) { x /= d; y /= d; }
    return { x, y };
  };

  Input.endFrame = () => {
    for (const k in Input.just) delete Input.just[k];
    Input.mouse.justDown = false;
    Input.mouse.justRight = false;
  };

  /* ---------------- 相机 ---------------- */
  const Cam = E.Cam = {
    x: 0, y: 0, shakeT: 0, shakeMag: 0, ox: 0, oy: 0,
    follow(tx, ty, dt, world) {
      this.x = E.lerp(this.x, tx, Math.min(1, dt * 9));
      this.y = E.lerp(this.y, ty, Math.min(1, dt * 9));
      if (world) {
        const hw = E.W / 2, hh = E.H / 2;
        const mw = world.w * E.TILE, mh = world.h * E.TILE;
        this.x = mw > E.W ? E.clamp(this.x, hw, mw - hw) : mw / 2;
        this.y = mh > E.H ? E.clamp(this.y, hh, mh - hh) : mh / 2;
      }
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        const k = Math.max(0, this.shakeT) * this.shakeMag;
        this.ox = E.rand(-k, k); this.oy = E.rand(-k, k);
      } else { this.ox = 0; this.oy = 0; }
    },
    shake(mag, dur) {
      this.shakeMag = Math.max(this.shakeMag * 0.6, mag);
      this.shakeT = Math.max(this.shakeT, dur);
    },
    toWorld(sx, sy) { return { x: sx - E.W / 2 + this.x - this.ox, y: sy - E.H / 2 + this.y - this.oy }; },
    toScreen(wx, wy) { return { x: wx - this.x + E.W / 2 + this.ox, y: wy - this.y + E.H / 2 + this.oy }; },
    apply(ctx) { ctx.translate(E.W / 2 - this.x + this.ox, E.H / 2 - this.y + this.oy); },
  };

  /* ---------------- 粒子 / 飘字 ---------------- */
  const FX = E.FX = {
    parts: [],
    floats: [],
    clear() { this.parts.length = 0; this.floats.length = 0; },
    burst(x, y, color, n = 8, spd = 120, size = 3, life = 0.5) {
      for (let i = 0; i < n; i++) {
        const a = E.rand(Math.PI * 2), s = E.rand(spd * 0.3, spd);
        this.parts.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: E.rand(life * 0.6, life), max: life, size: E.rand(size * 0.6, size),
          color, grav: 30,
        });
      }
    },
    text(x, y, str, color = '#fff', size = 13) {
      this.floats.push({ x, y, vy: -34, life: 0.9, max: 0.9, str, color, size });
    },
    update(dt) {
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life -= dt;
        if (p.life <= 0) { this.parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += p.grav * dt;
        p.vx *= 1 - dt * 2.5; p.vy *= 1 - dt * 1.2;
      }
      for (let i = this.floats.length - 1; i >= 0; i--) {
        const f = this.floats[i];
        f.life -= dt;
        if (f.life <= 0) { this.floats.splice(i, 1); continue; }
        f.y += f.vy * dt; f.vy *= 1 - dt * 1.5;
      }
    },
  };

  /* ---------------- 音效（程序合成） ---------------- */
  const SFX = MCX.SFX = {
    ctx: null, master: null, muted: false, noiseBuf: null,
    unlock() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 0.4;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = buf;
      } catch (e) { /* 静默 */ }
    },
    blip(freq, dur, type, gain, freq2) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (freq2) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq2), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.25, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, gain, filterFreq, sweepTo) {
      if (!this.ctx || this.muted || !this.noiseBuf) return;
      const t = this.ctx.currentTime;
      const s = this.ctx.createBufferSource();
      s.buffer = this.noiseBuf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(filterFreq || 1200, t);
      if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(60, sweepTo), t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain || 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t); s.stop(t + dur + 0.02);
    },
    play(name) {
      if (!this.ctx || this.muted) return;
      switch (name) {
        case 'swing': this.blip(320, 0.08, 'sawtooth', 0.12, 120); break;
        case 'hit': this.blip(180, 0.09, 'square', 0.18, 70); this.noise(0.08, 0.12, 900, 300); break;
        case 'shoot': this.blip(700, 0.09, 'triangle', 0.12, 260); break;
        case 'pickup': this.blip(700, 0.06, 'sine', 0.16, 1050); break;
        case 'coin': this.blip(880, 0.07, 'square', 0.12, 1300); break;
        case 'open': this.blip(240, 0.14, 'square', 0.14, 420); break;
        case 'mine': this.noise(0.09, 0.2, 700, 200); break;
        case 'hurt': this.blip(220, 0.22, 'sawtooth', 0.24, 70); break;
        case 'die': this.blip(180, 0.7, 'sawtooth', 0.26, 40); break;
        case 'explode': this.noise(0.55, 0.5, 1400, 60); this.blip(80, 0.4, 'sawtooth', 0.2, 30); break;
        case 'extract': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'triangle', 0.2), i * 110)); break;
        case 'buy': this.blip(520, 0.07, 'square', 0.14); setTimeout(() => this.blip(780, 0.1, 'square', 0.14), 70); break;
        case 'error': this.blip(120, 0.16, 'square', 0.16, 90); break;
        case 'warn': this.blip(440, 0.3, 'sine', 0.16, 440); break;
        case 'dash': this.noise(0.16, 0.16, 2200, 400); break;
        case 'teleport': this.blip(900, 0.15, 'sine', 0.14, 200); break;
        case 'step': this.noise(0.05, 0.05, 500, 200); break;
      }
    },
  };

  /* ---------------- 存档 ---------------- */
  const KEY = 'mcx_save_v1';
  const Save = E.Save = {
    data: null,
    fresh() {
      return {
        emerald: 120,
        stash: [
          { id: 'wood_sword', qty: 1 },
          { id: 'apple', qty: 2 },
        ],
        loadout: { weapon: 'wood_sword', armor: null, bag: null, items: [null, null, null] },
        up: { hp: 0, slots: 0, speed: 0 },
        stats: { raids: 0, extracts: 0, deaths: 0, kills: 0, best: 0, earned: 0 },
        quests: {},
        muted: false,
      };
    },
    load() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
      const base = this.fresh();
      if (!d || typeof d !== 'object') d = base;
      // 合并缺省字段，兼容旧档
      d.emerald = Number.isFinite(d.emerald) ? d.emerald : 0;
      d.stash = Array.isArray(d.stash) ? d.stash : [];
      d.loadout = Object.assign({ weapon: null, armor: null, bag: null, items: [null, null, null] }, d.loadout || {});
      if (!Array.isArray(d.loadout.items)) d.loadout.items = [null, null, null];
      while (d.loadout.items.length < 3) d.loadout.items.push(null);
      d.up = Object.assign({ hp: 0, slots: 0, speed: 0 }, d.up || {});
      d.stats = Object.assign(base.stats, d.stats || {});
      d.quests = d.quests || {};
      if (typeof d.muted !== 'boolean') d.muted = false;
      this.data = d;
      return d;
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* 满/隐私模式 */ }
    },
    reset() {
      this.data = this.fresh();
      this.save();
      return this.data;
    },
  };

  E.mkCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return c;
  };
})();
