/* ============================================================
 * 实体层：玩家 / 敌人 AI / 弹道 / 掉落 / 伤害 / 交互
 * ============================================================ */
(function () {
  'use strict';
  const MCX = window.MCX = window.MCX || {};
  const E = MCX.E;
  const Wd = MCX.World;
  const Ent = MCX.Ent = {};
  const TILE = E.TILE;

  /* ---------------- 背包工具 ---------------- */
  Ent.addItem = function (p, id, qty) {
    const def = MCX.DATA.items[id];
    if (!def) return qty;
    const max = def.stack || 1;
    let left = qty;
    for (let i = 0; i < p.inv.length && left > 0; i++) {
      const s = p.inv[i];
      if (s && s.id === id && s.qty < max) {
        const take = Math.min(max - s.qty, left);
        s.qty += take; left -= take;
      }
    }
    for (let i = 0; i < p.inv.length && left > 0; i++) {
      if (!p.inv[i]) {
        const take = Math.min(max, left);
        p.inv[i] = { id, qty: take };
        left -= take;
      }
    }
    return left;
  };

  Ent.invCount = function (p, id) {
    let n = 0;
    for (const s of p.inv) if (s && s.id === id) n += s.qty;
    return n;
  };

  Ent.invValue = function (p) {
    let v = 0;
    for (const s of p.inv) if (s) v += (MCX.DATA.items[s.id].value || 0) * s.qty;
    return v;
  };

  Ent.invUsed = function (p) {
    let n = 0;
    for (const s of p.inv) if (s) n++;
    return n;
  };

  Ent.removeAt = function (p, i, qty) {
    const s = p.inv[i];
    if (!s) return;
    if (qty === undefined || qty >= s.qty) p.inv[i] = null;
    else s.qty -= qty;
  };

  /* ---------------- 玩家 ---------------- */
  Ent.makePlayer = function () {
    const DATA = MCX.DATA, cfg = DATA.cfg, S = MCX.E.Save.data;
    const up = S.up || { hp: 0, slots: 0, speed: 0 };
    const lo = S.loadout || {};
    const weaponId = lo.weapon && DATA.items[lo.weapon] ? lo.weapon : 'wood_sword';
    const armorId = lo.armor && DATA.items[lo.armor] ? lo.armor : null;
    const bagId = lo.bag && DATA.items[lo.bag] ? lo.bag : null;
    const bagSlots = bagId ? (DATA.items[bagId].slots || 0) : 0;
    const slots = cfg.baseSlots + (up.slots || 0) * 2 + bagSlots;
    const maxHp = cfg.baseHp + (up.hp || 0) * 4;
    const p = {
      x: 0, y: 0, r: 11,
      hp: maxHp, maxHp,
      speed: cfg.baseSpeed * (1 + (up.speed || 0) * 0.06),
      angle: 0,
      weapon: Object.assign({ id: weaponId }, DATA.items[weaponId]),
      armor: armorId ? Object.assign({ id: armorId }, DATA.items[armorId]) : null,
      bag: bagId ? Object.assign({ id: bagId }, DATA.items[bagId]) : null,
      slots,
      inv: new Array(slots).fill(null),
      quick: [null, null, null],
      atkCd: 0, swingT: 0, swingDir: 0,
      dashCd: 0, dashT: 0, dashDir: 0,
      invuln: 0, hurtT: 0,
      buffs: { speed: 0, str: 0 },
      act: null,
      stepT: 0,
      kills: 0,
      walked: 0,
    };
    (lo.items || []).forEach((id, i) => {
      if (id && DATA.items[id]) p.quick[i] = { id, qty: 1 };
    });
    return p;
  };

  Ent.playerDr = (p) => (p.armor ? p.armor.dr || 0 : 0);
  Ent.weaponDmg = (p) => {
    const w = p.weapon;
    return (w.dmg || 3) * (p.buffs.str > 0 ? 1.6 : 1);
  };

  Ent.hurtPlayer = function (g, dmg, fromX, fromY, isExplosion) {
    const p = g.player;
    if (p.invuln > 0 || g.state !== 'raid') return;
    let final = dmg * (1 - Ent.playerDr(p));
    final = Math.max(1, Math.round(final));
    p.hp -= final;
    p.invuln = MCX.DATA.cfg.invulnAfterHit;
    p.hurtT = 0.35;
    p.act = null;
    E.Cam.shake(7, 0.22);
    E.FX.text(p.x, p.y - 18, '-' + final, '#ff5a4a', 15);
    E.FX.burst(p.x, p.y, '#e02b2b', 10, 150, 3, 0.5);
    MCX.SFX.play('hurt');
    if (fromX !== undefined) {
      const a = Math.atan2(p.y - fromY, p.x - fromX);
      Wd.moveEnt(g.world, p, Math.cos(a) * 14, Math.sin(a) * 14);
    }
    if (p.hp <= 0) {
      p.hp = 0;
      g.onPlayerDeath();
    }
  };

  Ent.healPlayer = function (g, amount) {
    const p = g.player;
    p.hp = Math.min(p.maxHp, p.hp + amount);
    E.FX.text(p.x, p.y - 20, '+' + amount, '#5cf06a', 14);
    E.FX.burst(p.x, p.y, '#5cf06a', 8, 90, 3, 0.4);
  };

  /* ---------------- 使用消耗品 ---------------- */
  Ent.useItem = function (g, id) {
    const p = g.player;
    const def = MCX.DATA.items[id];
    if (!def) return false;
    if (def.kind !== 'use') return false;
    if (def.heal) Ent.healPlayer(g, def.heal);
    if (def.shield) p.invuln = Math.max(p.invuln, def.shield);
    if (def.buff === 'speed') p.buffs.speed = 8;
    if (def.buff === 'str') p.buffs.str = 10;
    if (def.teleport) {
      const a = p.angle;
      const tx = p.x + Math.cos(a) * def.teleport;
      const ty = p.y + Math.sin(a) * def.teleport;
      const spot = Wd.freeSpot(g.world, tx, ty, 26, 22);
      p.x = spot.x; p.y = spot.y;
      E.FX.burst(p.x, p.y, '#b06ae8', 16, 200, 3, 0.5);
      MCX.SFX.play('teleport');
    }
    if (def.throwTnt) {
      g.projectiles.push({
        x: p.x + Math.cos(p.angle) * 16, y: p.y + Math.sin(p.angle) * 16,
        vx: Math.cos(p.angle) * 300, vy: Math.sin(p.angle) * 300,
        dmg: 22, from: 'player', kind: 'tnt', life: 1.4, r: 6, spin: 0,
      });
    }
    MCX.SFX.play('pickup');
    return true;
  };

  /* ---------------- 攻击 ---------------- */
  function lineOfSight(world, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const d = Math.hypot(dx, dy);
    const steps = Math.ceil(d / 14);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (Wd.solidAt(world, x1 + dx * t, y1 + dy * t)) return false;
    }
    return true;
  }
  Ent.lineOfSight = lineOfSight;

  Ent.playerAttack = function (g) {
    const p = g.player;
    if (p.atkCd > 0) return;
    const w = p.weapon;
    p.atkCd = w.cd || 0.4;
    if (w.wkind === 'bow') {
      const spd = w.projSpeed || 460;
      g.projectiles.push({
        x: p.x + Math.cos(p.angle) * 14, y: p.y + Math.sin(p.angle) * 14,
        vx: Math.cos(p.angle) * spd, vy: Math.sin(p.angle) * spd,
        dmg: Ent.weaponDmg(p), from: 'player', kind: 'arrow', life: 1.6, r: 5, angle: p.angle,
      });
      MCX.SFX.play('shoot');
      E.Cam.shake(2, 0.08);
      return;
    }
    p.swingT = 0.18;
    p.swingDir = p.angle;
    MCX.SFX.play('swing');
    const range = w.range || 50;
    let hitAny = false;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const d = E.dist(p.x, p.y, e.x, e.y);
      if (d > range + e.r) continue;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      if (Math.abs(E.angDiff(a, p.angle)) > 1.15) continue;
      Ent.hurtEnemy(g, e, Ent.weaponDmg(p), a);
      hitAny = true;
    }
    if (hitAny) {
      E.Cam.shake(4, 0.12);
      MCX.SFX.play('hit');
    }
  };

  Ent.hurtEnemy = function (g, e, dmg, angle, isExplosion) {
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    e.hitT = 0.14;
    e.aggro = true;
    E.FX.text(e.x + E.rand(-6, 6), e.y - e.r - 8, String(dmg), '#ffe066', 14);
    E.FX.burst(e.x, e.y, e.def.boss ? '#a24ae8' : '#e05a5a', 6, 120, 3, 0.4);
    if (!isExplosion) {
      const kb = e.def.boss ? 2 : 12;
      Wd.moveEnt(g.world, e, Math.cos(angle) * kb, Math.sin(angle) * kb);
    }
    if (e.hp <= 0) Ent.killEnemy(g, e);
  };

  Ent.killEnemy = function (g, e) {
    if (e.dead) return;
    e.dead = true;
    g.player.kills++;
    g.stats.kills++;
    E.FX.burst(e.x, e.y, e.def.boss ? '#a24ae8' : '#8a3a3a', e.def.boss ? 40 : 14, e.def.boss ? 260 : 160, 4, 0.7);
    E.Cam.shake(e.def.boss ? 14 : 4, e.def.boss ? 0.6 : 0.15);
    MCX.SFX.play(e.def.boss ? 'explode' : 'hit');
    // 掉落
    const drops = e.def.drops || [];
    for (const [id, chance, qmin, qmax] of drops) {
      if (Math.random() < chance) {
        const qty = E.randInt(qmin, qmax);
        Ent.spawnDrop(g, e.x + E.rand(-8, 8), e.y + E.rand(-8, 8), id, qty);
      }
    }
    if (e.def.boss) {
      E.FX.text(e.x, e.y - 40, '凋灵倒下了', '#d89aff', 18);
      for (let i = 0; i < 4; i++) Ent.spawnDrop(g, e.x + E.rand(-30, 30), e.y + E.rand(-30, 30), 'diamond', 1);
      Ent.spawnDrop(g, e.x, e.y + 20, 'netherite_sword', 1);
    }
    if (e.def.split && !e.small) {
      for (let i = 0; i < 2; i++) {
        const child = Ent.makeEnemy('slime', e.x + E.rand(-14, 14), e.y + E.rand(-14, 14));
        child.small = true;
        child.hp = Math.max(4, Math.round(e.def.hp * 0.4));
        child.maxHp = child.hp;
        child.r = 8;
        child.def = Object.assign({}, e.def, { dmg: 2, speed: 90, split: false, drops: [] });
        child.aggro = true;
        g.enemies.push(child);
      }
    }
    if (e.def.boss) g.bossKilled = true;
  };

  Ent.spawnDrop = function (g, x, y, id, qty) {
    if (!MCX.DATA.items[id]) return;
    g.drops.push({ x, y, id, qty, t: 0, life: 60, vx: E.rand(-40, 40), vy: E.rand(-40, 40) });
  };

  /* ---------------- 敌人 ---------------- */
  Ent.makeEnemy = function (type, x, y) {
    const def = MCX.DATA.enemies[type] || MCX.DATA.enemies.zombie;
    return {
      type, def,
      x, y, r: def.r || 12,
      hp: def.hp, maxHp: def.hp,
      angle: 0, atkCd: E.rand(0.2, 0.8),
      aggro: false, hitT: 0, dead: false,
      blinkCd: E.rand(1, 3), fuse: -1, t: E.rand(0, 6),
      wander: { x: 0, y: 0, t: 0 },
      small: false,
    };
  };

  Ent.spawnEnemies = function (g) {
    for (const s of g.world.spawnPlan) {
      const e = Ent.makeEnemy(s.type, s.x, s.y);
      g.enemies.push(e);
    }
  };

  function enemyMove(g, e, dx, dy, mult) {
    const m = mult === undefined ? 1 : mult;
    Wd.moveEnt(g.world, e, dx * m, dy * m);
  }

  Ent.updateEnemies = function (g, dt) {
    const p = g.player;
    for (const e of g.enemies) {
      if (e.dead) continue;
      e.hitT = Math.max(0, e.hitT - dt);
      e.t += dt;
      const d = E.dist(e.x, e.y, p.x, p.y);
      const dx = p.x - e.x, dy = p.y - e.y;
      const nx = d > 0.001 ? dx / d : 0, ny = d > 0.001 ? dy / d : 0;
      e.angle = Math.atan2(dy, dx);
      const def = e.def;
      const speed = def.speed;
      // 走路动画相位（按移动速度推进）
      const moved = e.x !== e._px || e.y !== e._py;
      e._px = e.x; e._py = e.y;
      if (moved) e.animWalk = (e.animWalk || 0) + dt * (speed / 90);
      if (!e.aggro && d < 340) e.aggro = true;
      if (e.aggro && d > 820) e.aggro = false;

      if (!e.aggro) {
        // 闲逛
        e.wander.t -= dt;
        if (e.wander.t <= 0) {
          e.wander.t = E.rand(0.7, 1.8);
          const a = E.rand(Math.PI * 2);
          e.wander.x = Math.cos(a) * speed * 0.3;
          e.wander.y = Math.sin(a) * speed * 0.3;
        }
        enemyMove(g, e, e.wander.x * dt, e.wander.y * dt);
        continue;
      }

      e.atkCd -= dt;
      const ai = def.ai;
      if (ai === 'chase' || ai === 'blink') {
        if (ai === 'blink') {
          e.blinkCd -= dt;
          if (e.blinkCd <= 0 && d > 130) {
            e.blinkCd = def.blinkCd || 3;
            const spot = Wd.freeSpot(g.world, p.x, p.y, 110, 26);
            E.FX.burst(e.x, e.y, '#b06ae8', 12, 140, 3, 0.4);
            e.x = spot.x; e.y = spot.y;
            E.FX.burst(e.x, e.y, '#b06ae8', 12, 140, 3, 0.4);
            MCX.SFX.play('teleport');
            continue;
          }
        }
        enemyMove(g, e, nx * speed * dt, ny * speed * dt);
        if (d < e.r + p.r + 8 && e.atkCd <= 0) {
          e.atkCd = def.cd || 1;
          Ent.hurtPlayer(g, def.dmg, e.x, e.y);
        }
      } else if (ai === 'shooter') {
        const keep = def.keep || 190;
        if (d > keep + 30) enemyMove(g, e, nx * speed * dt, ny * speed * dt);
        else if (d < keep - 40) enemyMove(g, e, -nx * speed * dt, -ny * speed * dt);
        else {
          // 侧移
          enemyMove(g, e, -ny * speed * 0.6 * dt, nx * speed * 0.6 * dt);
        }
        if (e.atkCd <= 0 && d < 460 && lineOfSight(g.world, e.x, e.y, p.x, p.y)) {
          e.atkCd = def.cd || 1.8;
          const kind = e.type === 'blaze' ? 'fire' : 'arrow';
          const spd = kind === 'fire' ? 260 : 380;
          g.projectiles.push({
            x: e.x + nx * 12, y: e.y + ny * 12,
            vx: nx * spd, vy: ny * spd, dmg: def.dmg,
            from: 'enemy', kind, life: 2.2, r: 5, angle: e.angle,
          });
          MCX.SFX.play('shoot');
        }
      } else if (ai === 'bomber') {
        if (d > 54) {
          enemyMove(g, e, nx * speed * dt, ny * speed * dt);
          e.fuse = -1;
        } else {
          if (e.fuse < 0) { e.fuse = def.fuse || 1.2; MCX.SFX.play('warn'); }
          e.fuse -= dt;
          if (e.fuse <= 0) {
            Ent.explode(g, e.x, e.y, 62, def.dmg);
            e.dead = true;
          }
        }
      } else if (ai === 'boss') {
        e.bossCd = (e.bossCd || 2) - dt;
        const dist = 250;
        if (d > dist) enemyMove(g, e, nx * speed * dt, ny * speed * dt);
        else if (d < dist - 70) enemyMove(g, e, -nx * speed * 0.6 * dt, -ny * speed * 0.6 * dt);
        if (e.bossCd <= 0) {
          e.bossCd = 1.7;
          for (let k = -1; k <= 1; k++) {
            const a = e.angle + k * 0.28;
            g.projectiles.push({
              x: e.x + Math.cos(a) * 20, y: e.y + Math.sin(a) * 20,
              vx: Math.cos(a) * 240, vy: Math.sin(a) * 240,
              dmg: def.dmg, from: 'enemy', kind: 'skull', life: 3, r: 7, angle: a,
            });
          }
          MCX.SFX.play('shoot');
        }
        e.summonT = (e.summonT || 6) - dt;
        if (e.summonT <= 0) {
          e.summonT = 7;
          const count = g.enemies.filter((x) => !x.dead && x.type === 'zombie').length;
          if (count < 5) {
            for (let k = 0; k < 2; k++) {
              const spot = Wd.freeSpot(g.world, e.x, e.y, 60, 18);
              const z = Ent.makeEnemy('zombie', spot.x, spot.y);
              z.aggro = true;
              g.enemies.push(z);
            }
            E.FX.text(e.x, e.y - 30, '召唤！', '#ff8a5a', 14);
          }
        }
      }
    }
    // 清理
    g.enemies = g.enemies.filter((e) => !e.dead);
  };

  Ent.explode = function (g, x, y, radius, dmg) {
    E.FX.burst(x, y, '#ffb347', 26, 320, 5, 0.7);
    E.FX.burst(x, y, '#5a5a5a', 12, 180, 4, 0.8);
    E.Cam.shake(12, 0.35);
    MCX.SFX.play('explode');
    const p = g.player;
    const d = E.dist(x, y, p.x, p.y);
    if (d < radius + p.r) Ent.hurtPlayer(g, dmg, x, y, true);
    for (const e of g.enemies) {
      if (e.dead || (e.x === x && e.y === y && e.fuse !== undefined)) continue;
      if (E.dist(x, y, e.x, e.y) < radius) Ent.hurtEnemy(g, e, dmg, Math.atan2(e.y - y, e.x - x), true);
    }
  };

  /* ---------------- 弹道 ---------------- */
  Ent.updateProjectiles = function (g, dt) {
    const p = g.player;
    for (const pr of g.projectiles) {
      pr.life -= dt;
      if (pr.kind === 'tnt') {
        pr.vx *= 1 - dt * 2.5; pr.vy *= 1 - dt * 2.5;
      }
      const steps = Math.max(1, Math.ceil((Math.hypot(pr.vx, pr.vy) * dt) / 10));
      for (let s = 0; s < steps; s++) {
        pr.x += (pr.vx * dt) / steps;
        pr.y += (pr.vy * dt) / steps;
        if (Wd.solidAt(g.world, pr.x, pr.y)) {
          pr.life = 0;
          E.FX.burst(pr.x, pr.y, '#9a9a9a', 5, 80, 2, 0.3);
          if (pr.kind === 'tnt') Ent.explode(g, pr.x, pr.y, 70, pr.dmg);
          break;
        }
        if (pr.from === 'player') {
          for (const e of g.enemies) {
            if (e.dead) continue;
            if (E.dist(pr.x, pr.y, e.x, e.y) < e.r + pr.r) {
              Ent.hurtEnemy(g, e, pr.dmg, Math.atan2(pr.vy, pr.vx));
              pr.life = 0;
              MCX.SFX.play('hit');
              break;
            }
          }
        } else {
          if (E.dist(pr.x, pr.y, p.x, p.y) < p.r + pr.r) {
            Ent.hurtPlayer(g, pr.dmg, pr.x, pr.y, true);
            pr.life = 0;
          }
        }
        if (pr.life <= 0) break;
      }
      if (pr.kind === 'tnt' && pr.life <= 0) {
        Ent.explode(g, pr.x, pr.y, 76, pr.dmg);
      }
    }
    g.projectiles = g.projectiles.filter((pr) => pr.life > 0);
  };

  /* ---------------- 掉落物 ---------------- */
  Ent.updateDrops = function (g, dt) {
    const p = g.player;
    for (const d of g.drops) {
      d.t += dt;
      if (d.t < 0.35) {
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.vx *= 1 - dt * 4; d.vy *= 1 - dt * 4;
      }
      const dist = E.dist(d.x, d.y, p.x, p.y);
      if (d.t > 0.2 && dist < MCX.DATA.cfg.pickupRadius) {
        const left = Ent.addItem(p, d.id, d.qty);
        if (left < d.qty) {
          const got = d.qty - left;
          E.FX.text(p.x, p.y - 24, '+' + MCX.DATA.items[d.id].name + (got > 1 ? ' x' + got : ''), '#9ad8ff', 12);
          d.qty = left;
          MCX.SFX.play('pickup');
          if (left === 0) d.dead = true;
        } else if (!d.warned) {
          d.warned = true;
          E.FX.text(p.x, p.y - 30, '背包满了', '#ff8a5a', 13);
          MCX.SFX.play('error');
        }
      }
    }
    g.drops = g.drops.filter((d) => !d.dead);
  };

  /* ---------------- 战利品生成 ---------------- */
  Ent.rollLoot = function (tier, count, bias) {
    const DATA = MCX.DATA;
    const out = [];
    for (let i = 0; i < count; i++) {
      let t = tier + (bias || 0);
      if (Math.random() < 0.12) t += 1;
      if (Math.random() < 0.06) t -= 1;
      t = E.clamp(t, 1, 3);
      const table = DATA.lootTables[t];
      const pick = E.weighted(table);
      const qty = E.randInt(pick.q[0], pick.q[1]);
      out.push({ id: pick.id, qty });
    }
    return out;
  };

  /* ---------------- 交互：开箱 / 挖矿 ---------------- */
  Ent.findInteractable = function (g) {
    const p = g.player;
    let best = null, bestD = 56;
    for (const c of g.world.containers) {
      if (c.opened) continue;
      const d = E.dist(p.x, p.y, c.x, c.y);
      if (d < bestD) { bestD = d; best = { kind: 'container', target: c, x: c.x, y: c.y, dur: 0.45 }; }
    }
    for (const o of g.world.ores) {
      if (o.mined) continue;
      const def = MCX.DATA.ores[o.type];
      const d = E.dist(p.x, p.y, o.x, o.y);
      if (d < bestD) {
        const canMine = (p.weapon.mine || 0) >= def.mine;
        bestD = d;
        best = { kind: 'ore', target: o, x: o.x, y: o.y, dur: def.time, canMine, need: def.mine };
      }
    }
    return best;
  };

  Ent.tryInteract = function (g) {
    const p = g.player;
    if (p.act) { p.act = null; return; }
    const it = Ent.findInteractable(g);
    if (!it) return;
    if (it.kind === 'ore' && !it.canMine) {
      E.FX.text(p.x, p.y - 26, '需要 ' + (it.need >= 2 ? '钻石镐' : '镐子'), '#ff8a5a', 13);
      MCX.SFX.play('error');
      return;
    }
    p.act = { kind: it.kind, target: it.target, t: 0, dur: it.dur, x: it.x, y: it.y };
  };

  Ent.updateAct = function (g, dt) {
    const p = g.player;
    if (!p.act) return;
    const a = p.act;
    if (E.dist(p.x, p.y, a.x, a.y) > 70) { p.act = null; return; }
    a.t += dt;
    if (a.kind === 'ore' && Math.random() < dt * 22) {
      E.FX.burst(a.x + E.rand(-10, 10), a.y + E.rand(-10, 10), '#a0a0a0', 1, 60, 2, 0.35);
    }
    if (a.t >= a.dur) {
      if (a.kind === 'container') {
        Ent.openContainer(g, a.target);
      } else {
        Ent.mineOre(g, a.target);
      }
      p.act = null;
    }
  };

  Ent.openContainer = function (g, c) {
    if (c.opened) return;
    c.opened = true;
    MCX.SFX.play('open');
    E.FX.burst(c.x, c.y, '#c09a62', 10, 110, 3, 0.5);
    const bias = (g.world.map.lootBias || 0);
    const n = c.type === 'chest' ? E.randInt(1, 3) : c.type === 'crafting' ? E.randInt(2, 4) : E.randInt(1, 2);
    const loot = Ent.rollLoot(c.tier, n, bias);
    loot.forEach((l, i) => {
      Ent.spawnDrop(g, c.x + E.rand(-16, 16), c.y + E.rand(-10, 14), l.id, l.qty);
    });
    if (c.trap) {
      E.FX.text(c.x, c.y - 20, '陷阱箱！', '#ff5a4a', 14);
      Ent.hurtPlayer(g, 4, c.x, c.y);
      for (let i = 0; i < 2; i++) {
        const spot = Wd.freeSpot(g.world, c.x, c.y, 90, 20);
        const z = Ent.makeEnemy('zombie', spot.x, spot.y);
        z.aggro = true;
        g.enemies.push(z);
      }
      MCX.SFX.play('error');
    }
    c.trap = false;
  };

  Ent.mineOre = function (g, o) {
    if (o.mined) return;
    o.mined = true;
    if (g.oreMap) delete g.oreMap[o.ty * g.world.w + o.tx];
    const def = MCX.DATA.ores[o.type];
    MCX.SFX.play('mine');
    E.FX.burst(o.x, o.y, '#b0b0b0', 14, 150, 3, 0.6);
    for (const [id, chance, qmin, qmax] of def.drops) {
      if (Math.random() < chance) {
        Ent.spawnDrop(g, o.x + E.rand(-12, 12), o.y + E.rand(-8, 16), id, E.randInt(qmin, qmax));
      }
    }
  };

  /* ---------------- 局内换装（背包里的武器/护甲/背包可以换上） ---------------- */
  Ent.equipFromInv = function (g, i) {
    const p = g.player;
    const s = p.inv[i];
    if (!s) return null;
    const def = MCX.DATA.items[s.id];
    if (def.kind === 'weapon') {
      const cur = p.weapon;
      p.weapon = Object.assign({ id: s.id }, def);
      p.inv[i] = cur ? { id: cur.id, qty: 1 } : null;
      return '换上了 ' + def.name;
    }
    if (def.kind === 'armor') {
      const cur = p.armor;
      p.armor = Object.assign({ id: s.id }, def);
      p.inv[i] = cur ? { id: cur.id, qty: 1 } : null;
      return '换上了 ' + def.name;
    }
    if (def.kind === 'bag') {
      const cur = p.bag;
      const newSlots = p.slots - (cur ? cur.slots || 0 : 0) + (def.slots || 0);
      if (newSlots < p.inv.length) {
        // 缩小背包：多出来的格子必须是空的
        for (let k = newSlots; k < p.inv.length; k++) {
          if (p.inv[k]) return '背包太小，先把东西腾出来';
        }
      }
      p.bag = Object.assign({ id: s.id }, def);
      p.inv[i] = cur ? { id: cur.id, qty: 1 } : null;
      if (newSlots < p.inv.length) p.inv.length = newSlots;
      else while (p.inv.length < newSlots) p.inv.push(null);
      p.slots = newSlots;
      return '换上了 ' + def.name;
    }
    return null;
  };

  /* ---------------- 局内丢弃 ---------------- */
  Ent.dropItem = function (g, i) {
    const p = g.player;
    const s = p.inv[i];
    if (!s) return;
    Ent.spawnDrop(g, p.x + E.rand(-12, 12), p.y + E.rand(-6, 12), s.id, s.qty);
    p.inv[i] = null;
  };

  /* ---------------- 玩家更新 ---------------- */
  Ent.updatePlayer = function (g, dt) {
    const p = g.player;
    const cfg = MCX.DATA.cfg;
    const inp = E.Input;
    p.atkCd = Math.max(0, p.atkCd - dt);
    p.swingT = Math.max(0, p.swingT - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.buffs.speed = Math.max(0, p.buffs.speed - dt);
    p.buffs.str = Math.max(0, p.buffs.str - dt);

    // 瞄准
    const mw = E.Cam.toWorld(inp.mouse.x, inp.mouse.y);
    p.angle = Math.atan2(mw.y - p.y, mw.x - p.x);

    // 冲刺
    if (p.dashT > 0) {
      p.dashT -= dt;
      Wd.moveEnt(g.world, p, Math.cos(p.dashDir) * cfg.dashSpeed * dt, Math.sin(p.dashDir) * cfg.dashSpeed * dt);
      if (Math.random() < 0.6) E.FX.burst(p.x, p.y, '#ffffff', 1, 40, 2, 0.25);
    } else {
      const ax = E.Input.axis();
      let spd = p.speed * (p.buffs.speed > 0 ? 1.5 : 1);
      if (p.act) {
        spd = 0;
      }
      if (ax.x || ax.y) {
        const before = { x: p.x, y: p.y };
        Wd.moveEnt(g.world, p, ax.x * spd * dt, ax.y * spd * dt);
        p.walked += E.dist(before.x, before.y, p.x, p.y);
      }
      if (inp.keys.space && p.dashCd <= 0 && (ax.x || ax.y)) {
        p.dashT = cfg.dashTime;
        p.dashCd = cfg.dashCd;
        p.invuln = Math.max(p.invuln, cfg.dashTime + 0.12);
        p.dashDir = Math.atan2(ax.y, ax.x);
        MCX.SFX.play('dash');
      }
    }

    // 攻击
    if ((inp.mouse.down || inp.keys.j) && g.state === 'raid') Ent.playerAttack(g);

    // 交互
    if (inp.just.e) Ent.tryInteract(g);
    Ent.updateAct(g, dt);

    // 快速道具 1/2/3
    for (let i = 0; i < 3; i++) {
      if (inp.just[String(i + 1)] && p.quick[i]) {
        const q = p.quick[i];
        if (Ent.useItem(g, q.id)) {
          q.qty--;
          if (q.qty <= 0) p.quick[i] = null;
        }
      }
    }
    // F 快速吃背包里的第一个治疗/食物
    if (inp.just.f) {
      for (let i = 0; i < p.inv.length; i++) {
        const s = p.inv[i];
        if (!s) continue;
        const def = MCX.DATA.items[s.id];
        if (def.kind === 'use' && (def.heal || def.shield || def.buff)) {
          if (Ent.useItem(g, s.id)) { Ent.removeAt(p, i, 1); break; }
        }
      }
    }

    // 踩到撤离点
    g.nearExtract = null;
    for (const ex of g.world.extracts) {
      if (E.dist(p.x, p.y, ex.x, ex.y) < ex.r) { g.nearExtract = ex; break; }
    }

    // 视野
    Wd.reveal(g.world, p.x, p.y, 15);
  };

  /* ---------------- 总更新 ---------------- */
  Ent.update = function (g, dt) {
    if (g.state !== 'raid') return;
    g.time += dt;
    Ent.updatePlayer(g, dt);
    Ent.updateEnemies(g, dt);
    Ent.updateProjectiles(g, dt);
    Ent.updateDrops(g, dt);
    E.FX.update(dt);
    E.Cam.follow(g.player.x, g.player.y, dt, g.world);
  };
})();
