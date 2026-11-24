/* ============================================================
 * 主流程：状态机（基地 / 战场 / 结算）、撤离与死亡、存档结算、主循环
 * ============================================================ */
(function () {
  'use strict';
  const MCX = window.MCX = window.MCX || {};
  const E = MCX.E;
  const Wd = MCX.World;
  const Ent = MCX.Ent;
  const R = MCX.Render;
  const Game = MCX.Game = {
    state: 'base',
    paused: false,
    player: null,
    world: null,
    enemies: [],
    projectiles: [],
    drops: [],
    time: 0,
    nearExtract: null,
    extractProgress: 0,
    stats: { kills: 0 },
    mini: null,
    canvas: null,
    ctx: null,
  };

  const S = () => E.Save.data;
  const D = () => MCX.DATA;

  /* ---------------- 启动 ---------------- */
  Game.init = function () {
    E.Save.load();
    this.canvas = document.getElementById('cv');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    E.Input.init(this.canvas);
    MCX.UI.init(this);
    this.state = 'base';
    if (location.search.indexOf('smoke') >= 0) {
      // 冒烟测试：不启动 RAF，由 tools/smoke 驱动 tick
      window.__MCX_READY = true;
      return;
    }
    if (location.search.indexOf('shot') >= 0) {
      // 截图模式：开一局并模拟若干帧后停住，供 headless 截图检查画面
      const params = new URLSearchParams(location.search);
      const map = params.get('map') || 'oak';
      const frames = parseInt(params.get('frames') || '150', 10);
      E.Save.data.loadout = { weapon: 'diamond_sword', armor: 'chest_iron', bag: 'bag_big', items: [{ id: 'apple', qty: 2 }, { id: 'tnt', qty: 1 }, null] };
      this.startRaid(map);
      const p = this.player;
      const types = ['zombie', 'skeleton', 'creeper', 'spider'];
      types.forEach((t, i) => {
        const a = i * 1.7 + 0.4;
        const e = Ent.makeEnemy(t, p.x + Math.cos(a) * 150, p.y + Math.sin(a) * 150);
        e.aggro = true;
        this.enemies.push(e);
      });
      for (let i = 0; i < 40; i++) {
        Ent.spawnDrop(this, p.x + Math.cos(i) * (60 + i * 3), p.y + Math.sin(i) * (60 + i * 3),
          ['diamond', 'gold_ingot', 'emerald', 'coal', 'iron_ingot'][i % 5], 1);
      }
      for (let i = 0; i < frames; i++) {
        E.Input.mouse.x = 640;
        E.Input.mouse.y = 300;
        E.Input.mouse.down = i % 30 < 8;
        p.invuln = 99;
        this.tick(1 / 60);
      }
      R.draw(this.ctx, this);
      const ui = params.get('ui');
      if (ui === 'inv') MCX.UI.openInv();
      if (ui === 'result') this.extract();
      if (ui === 'map') MCX.UI.showMaps();
      if (ui === 'help') MCX.UI.showHelp();
      window.__MCX_READY = true;
      return;
    }
    let last = performance.now();
    const frame = (t) => {
      let dt = (t - last) / 1000;
      last = t;
      if (!Number.isFinite(dt)) dt = 0.016;
      dt = Math.min(dt, 0.05);
      this.tick(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    window.__MCX_READY = true;
  };

  /* ---------------- 每帧 ---------------- */
  Game.tick = function (dt) {
    const inp = E.Input;
    if (this.state === 'raid') {
      if (inp.just.esc) {
        if (this.paused) {
          this.paused = false;
          MCX.UI.hideAll();
        } else {
          this.paused = true;
          MCX.UI.showPause();
        }
      }
      if (inp.just.tab) {
        if (this.paused && MCX.UI.isInvOpen && MCX.UI.isInvOpen()) {
          MCX.UI.closeInv();
        } else if (!this.paused) {
          this.paused = true;
          MCX.UI.openInv();
        }
      }
      if (!this.paused) this.update(dt);
    }
    if (this.state === 'raid' || this.state === 'result') {
      if (this.player && this.world) R.draw(this.ctx, this);
    }
    E.Input.endFrame();
  };

  /* ---------------- 开一局 ---------------- */
  Game.startRaid = function (mapId) {
    MCX.SFX.unlock();
    const world = Wd.gen(mapId);
    this.world = world;
    this.player = Ent.makePlayer();
    this.player.x = world.spawn.x;
    this.player.y = world.spawn.y;
    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.stats = { kills: 0 };
    this.time = 0;
    this.extractProgress = 0;
    this.nearExtract = null;
    this.bossKilled = false;
    this.warned = false;
    this.paused = false;
    this.state = 'raid';
    this.oreMap = {};
    for (const o of world.ores) this.oreMap[o.ty * world.w + o.tx] = o;
    Ent.spawnEnemies(this);
    E.FX.clear();
    E.Cam.x = this.player.x;
    E.Cam.y = this.player.y;
    E.Cam.shakeT = 0;
    R.buildMini(this);
    S().stats.raids++;
    E.Save.save();
    MCX.UI.hideAll();
    MCX.UI.toast(world.map.name, 'good');
    MCX.SFX.play('open');
  };

  /* ---------------- 更新 ---------------- */
  Game.update = function (dt) {
    const p = this.player;
    if (!p) return;
    const prevHp = p.hp;
    Ent.update(this, dt);

    // 撤离读条
    if (this.nearExtract && p.hp > 0) {
      if (p.hp < prevHp) {
        this.extractProgress = 0;
        E.FX.text(p.x, p.y - 30, '撤离中断！', '#ff5a4a', 15);
        MCX.SFX.play('error');
      } else {
        this.extractProgress += dt / D().cfg.extractHold;
        if (this.extractProgress >= 1) {
          this.extractProgress = 1;
          this.extract();
          return;
        }
      }
    } else {
      this.extractProgress = 0;
    }

    // 倒计时
    if (this.time >= this.world.timeLeft) {
      this.finishRaid('timeout');
      return;
    }
    if (this.time > this.world.timeLeft - 60 && !this.warned) {
      this.warned = true;
      MCX.SFX.play('warn');
      MCX.UI.toast('还剩 60 秒！立刻撤离！', 'bad');
      E.Cam.shake(6, 0.5);
    }
  };

  /* ---------------- 撤离成功 ---------------- */
  Game.extract = function () {
    const p = this.player;
    const loot = [];
    for (const s of p.inv) if (s) loot.push({ id: s.id, qty: s.qty });
    let value = 0;
    for (const s of loot) value += (D().items[s.id].value || 0) * s.qty;

    // 入库
    for (const s of loot) MCX.UI.addToStash(s.id, s.qty);
    // 没用掉的快捷道具也带回来
    for (const q of p.quick) {
      if (q) MCX.UI.addToStash(q.id, q.qty);
    }
    // 局内换上的装备入库（避免和基地装备栏重复）
    const lo = S().loadout;
    const settleEquip = (slot, cur) => {
      if (!cur) return;
      if (lo[slot] === cur.id) return;
      if (slot === 'weapon' && !lo.weapon && cur.id === 'wood_sword') return;
      MCX.UI.addToStash(cur.id, 1);
      lo[slot] = null;
    };
    settleEquip('weapon', p.weapon);
    settleEquip('armor', p.armor);
    settleEquip('bag', p.bag);

    const st = S().stats;
    st.extracts++;
    st.best = Math.max(st.best || 0, value);
    st.kills += this.stats.kills;
    const diamond = loot.filter((s) => s.id === 'diamond').reduce((n, s) => n + s.qty, 0);
    this.questAdd('q_diamond', diamond);
    this.questAdd('q_kill', this.stats.kills);
    this.questAdd('q_extract', 1);
    E.Save.save();
    MCX.SFX.play('extract');

    this.state = 'result';
    this.result = {
      type: 'extract',
      value, loot,
      kills: this.stats.kills,
      time: this.formatTime(this.time),
    };
    MCX.UI.showResult(this.result);
  };

  /* ---------------- 死亡 / 超时 ---------------- */
  Game.finishRaid = function (type) {
    const p = this.player;
    const lost = [];
    for (const s of p.inv) if (s) lost.push({ id: s.id, qty: s.qty });
    if (p.weapon) lost.push({ id: p.weapon.id, qty: 1 });
    if (p.armor) lost.push({ id: p.armor.id, qty: 1 });
    if (p.bag) lost.push({ id: p.bag.id, qty: 1 });
    for (const q of p.quick) if (q) lost.push({ id: q.id, qty: q.qty });

    // 装备丢失
    const lo = S().loadout;
    lo.weapon = null; lo.armor = null; lo.bag = null;
    lo.items = [null, null, null];
    S().stats.deaths++;
    S().stats.kills += this.stats.kills;
    this.questAdd('q_kill', this.stats.kills);
    E.Save.save();
    MCX.SFX.play('die');
    E.Cam.shake(16, 0.6);

    this.state = 'result';
    this.result = {
      type: type || 'death',
      lost,
      kills: this.stats.kills,
      time: this.formatTime(this.time),
    };
    MCX.UI.showResult(this.result);
  };

  Game.onPlayerDeath = function () {
    if (this.state !== 'raid') return;
    E.FX.burst(this.player.x, this.player.y, '#8a3a3a', 30, 200, 4, 0.9);
    this.finishRaid('death');
  };

  Game.giveUp = function () {
    if (this.state !== 'raid') return;
    this.finishRaid('death');
  };

  Game.toBase = function () {
    this.state = 'base';
    this.paused = false;
    this.player = null;
    this.world = null;
    MCX.UI.showBase();
  };

  Game.questAdd = function (id, n) {
    if (!n) return;
    const q = S().quests[id] || { p: 0 };
    q.p = (q.p || 0) + n;
    S().quests[id] = q;
  };

  Game.formatTime = function (t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + String(s).padStart(2, '0');
  };

  /* ---------------- 启动钩子 ---------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Game.init());
  } else {
    Game.init();
  }
})();
