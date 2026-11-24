/* ============================================================
 * 冒烟测试（仅在 index.html?smoke=1 时运行）
 * 结果写入 #bootlog 与 document.title，便于 headless dump-dom 检查
 * ============================================================ */
(function () {
  'use strict';
  if (location.search.indexOf('smoke') < 0) return;
  const log = [];
  const out = (m) => log.push(m);
  function finish(ok, msg) {
    const box = document.getElementById('bootlog');
    box.hidden = false;
    box.textContent = log.join('\n') + '\n' + (ok ? 'SMOKE-OK' : 'SMOKE-FAIL: ' + msg);
    document.title = ok ? 'SMOKE-OK' : 'SMOKE-FAIL: ' + msg;
  }

  function run() {
    try {
      const G = MCX.Game, E = MCX.E, Ent = MCX.Ent, Wd = MCX.World;
      out('assets loaded=' + (MCX.PX.assetCount || 0) + '/' + ((MCX.ASSETS && ['items','tiles','faces','mobs','skins'].reduce((n, k) => n + Object.keys(MCX.ASSETS[k] || {}).length, 0)) || 0));
      E.Save.reset();
      // 给点启动资金，避免测试受经济影响
      E.Save.data.emerald = 5000;
      E.Save.data.stash = [{ id: 'diamond_sword', qty: 1 }, { id: 'iron_pickaxe', qty: 1 }, { id: 'bag_big', qty: 1 }];
      E.Save.data.loadout = { weapon: 'diamond_sword', armor: null, bag: 'bag_big', items: [{ id: 'apple', qty: 1 }, null, null] };
      E.Save.save();

      // ---- 1. 三张地图生成 ----
      for (const m of MCX.DATA.maps) {
        const w = Wd.gen(m.id);
        out(`map ${m.id}: rooms=${w.rooms.length} cont=${w.containers.length} ores=${w.ores.length} ex=${w.extracts.length} spawnPlan=${w.spawnPlan.length}`);
        if (w.extracts.length !== 3) throw new Error('extract count ' + w.extracts.length);
        if (!w.rooms.length) throw new Error('no rooms');
        const sp = w.spawn;
        if (Wd.solidAt(w, sp.x, sp.y)) throw new Error('spawn inside wall: ' + m.id);
        for (const ex of w.extracts) {
          if (Wd.solidAt(w, ex.x, ex.y)) throw new Error('extract inside wall: ' + m.id);
        }
      }

      // ---- 2. 开一局 ----
      G.startRaid('oak');
      out(`raid start: player hp=${G.player.hp}/${G.player.maxHp} slots=${G.player.slots} enemies=${G.enemies.length}`);
      if (G.state !== 'raid') throw new Error('state not raid');
      if (G.player.slots < 6) throw new Error('bad slots');

      // ---- 3. 模拟 8 秒操作 ----
      const inp = E.Input;
      for (let i = 0; i < 480; i++) {
        inp.keys.d = i % 160 < 70;
        inp.keys.s = i % 200 > 100;
        inp.keys.w = i % 240 > 190;
        inp.mouse.x = 700 + Math.sin(i / 20) * 80;
        inp.mouse.y = 300 + Math.cos(i / 17) * 80;
        inp.mouse.down = i % 40 < 12;
        if (i % 120 === 0) inp.just.e = true;
        G.tick(1 / 60);
        MCX.Render.draw(G.ctx, G);
      }
      out(`after sim: hp=${G.player.hp} kills=${G.player.kills} drops=${G.drops.length} state=${G.state}`);
      if (G.state !== 'raid') throw new Error('died during sim (unexpected but ok): ' + G.state);

      // ---- 4. 强制撤离 ----
      G.enemies = [];
      G.projectiles = [];
      G.player.hp = G.player.maxHp;
      const ex = G.world.extracts[0];
      G.player.x = ex.x;
      G.player.y = ex.y;
      Ent.addItem(G.player, 'diamond', 3);
      Ent.addItem(G.player, 'gold_ingot', 2);
      const beforeStash = E.Save.data.stash.reduce((n, s) => n + s.qty, 0);
      let frames = 0;
      while (G.state === 'raid' && frames < 600) {
        G.player.x = ex.x; G.player.y = ex.y; G.player.hp = G.player.maxHp;
        G.tick(1 / 60);
        MCX.Render.draw(G.ctx, G);
        frames++;
      }
      out(`extract frames=${frames} state=${G.state} progress=${G.extractProgress}`);
      if (G.state !== 'result') throw new Error('extraction failed');
      const afterStash = E.Save.data.stash.reduce((n, s) => n + s.qty, 0);
      out(`stash ${beforeStash} -> ${afterStash}; emerald=${E.Save.data.emerald}; extracts=${E.Save.data.stats.extracts}`);
      if (afterStash <= beforeStash) throw new Error('loot not added to stash');

      // ---- 5. 死亡丢装备 ----
      G.toBase();
      G.startRaid('deep');
      const weaponBefore = E.Save.data.loadout.weapon;
      G.player.hp = 1;
      Ent.hurtPlayer(G, 999, 0, 0);
      out(`death: state=${G.state} weaponBefore=${weaponBefore} after=${E.Save.data.loadout.weapon}`);
      if (G.state !== 'result') throw new Error('death did not end raid');
      if (E.Save.data.loadout.weapon !== null) throw new Error('loadout not cleared on death');

      // ---- 6. 所有怪物类型更新不报错 ----
      G.toBase();
      G.startRaid('nether');
      G.enemies = [];
      const types = Object.keys(MCX.DATA.enemies);
      types.forEach((t, i) => {
        const e = Ent.makeEnemy(t, G.player.x + 60 + i * 22, G.player.y + 40);
        e.aggro = true;
        G.enemies.push(e);
      });
      for (let i = 0; i < 300; i++) {
        G.player.hp = G.player.maxHp;
        G.tick(1 / 60);
        MCX.Render.draw(G.ctx, G);
      }
      out(`all-mob sim: enemies=${G.enemies.length} state=${G.state}`);
      if (G.state !== 'raid') throw new Error('unexpected end state: ' + G.state);

      // ---- 7. 存档往返 ----
      E.Save.save();
      const raw = localStorage.getItem('mcx_save_v1');
      if (!raw) throw new Error('save missing');
      E.Save.load();
      out(`save ok, emerald=${E.Save.data.emerald}, stash=${E.Save.data.stash.length}`);

      // ---- 8. 界面渲染 ----
      G.toBase();
      MCX.UI.showMaps();
      MCX.UI.showHelp();
      MCX.UI.showBase();
      if (!document.getElementById('p-stash').children.length) throw new Error('base ui empty');
      out('ui ok');

      finish(true, '');
    } catch (err) {
      out('EXCEPTION: ' + (err && err.stack ? err.stack : err));
      finish(false, err && err.message ? err.message : String(err));
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const waitReady = () => {
      if (!window.__MCX_READY) { setTimeout(waitReady, 40); return; }
      setTimeout(run, 40);
    };
    waitReady();
  });
})();
