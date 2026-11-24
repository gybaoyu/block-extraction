/* ============================================================
 * 等距（45° 菱形）渲染层
 * 世界坐标 → 屏幕：sx = dx - dy, sy = (dx + dy) / 2
 * 地面/方块用预渲染菱形贴图，角色/掉落/特效保持直立
 * ============================================================ */
(function () {
  'use strict';
  const MCX = window.MCX = window.MCX || {};
  const E = MCX.E;
  const Wd = MCX.World;
  const P = MCX.PX;
  const R = MCX.Render;
  const TILE = E.TILE;

  const WALL_H = 30;      // 立体方块高度（屏幕像素）
  const BOX_H = 30;       // 木箱等小方块高度

  const proj = (wx, wy) => E.Cam.projS(wx, wy);
  const proj2 = (wx, wy) => E.Cam.proj(wx, wy);

  function shadowEllipse(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fill();
  }

  /* ---------------- 地面 ---------------- */
  function drawFloor(ctx, g, x0, x1, y0, y1) {
    const p = g.player;
    const ptx = p.x / TILE, pty = p.y / TILE;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i = ty * g.world.w + tx;
        if (!g.world.seen[i]) continue;
        const t = g.world.tiles[i];
        if (Wd.isSolidTile(t)) continue;
        const s = proj(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
        if (s.x < -80 || s.x > E.W + 80 || s.y < -60 || s.y > E.H + 60) continue;
        const d = Math.hypot(tx - ptx, ty - pty);
        ctx.globalAlpha = d < 12 ? 1 : Math.max(0.5, 1 - (d - 12) * 0.08);
        ctx.drawImage(P.isoFloor(Wd.texName(g.world, t)), s.x - 32, s.y - 16);
        // 装饰：立起来的小贴图
        const dec = g.world.decor[i];
        if (dec) {
          const kinds = [null, 'flower', 'pebble', 'crack', 'mushroom'];
          const k = kinds[dec];
          if (k) {
            const img = P.decor((tx * 7 + ty * 13) % 4, k);
            ctx.drawImage(img, s.x - 10, s.y - 26, 20, 20);
          }
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  /* ---------------- 立体方块 ---------------- */
  function drawBlockAt(ctx, texName, wx, wy, h, alpha) {
    const s = proj(wx, wy);
    if (s.x < -80 || s.x > E.W + 80 || s.y < -120 || s.y > E.H + 120) return;
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.drawImage(P.isoBlock(texName, h), Math.round(s.x - 32), Math.round(s.y - 16 - h));
    ctx.globalAlpha = 1;
  }

  /* ---------------- 实体 ---------------- */
  function drawEntitySprite(ctx, g, ent, sprite, footY, w, h, opts) {
    const o = opts || {};
    const s = proj(ent.x, footY);
    if (s.x < -120 || s.x > E.W + 120 || s.y < -160 || s.y > E.H + 160) return;
    const flip = o.flip || 1;
    ctx.save();
    ctx.translate(Math.round(s.x), Math.round(s.y));
    if (o.rot) ctx.rotate(o.rot);
    if (o.sx || o.sy) ctx.scale(flip * (o.sx || 1), o.sy || 1);
    else if (flip < 0) ctx.scale(-1, 1);
    // 朝向背面时压暗
    if (o.dim !== undefined && o.dim > 0) {
      ctx.globalAlpha = 1;
      ctx.drawImage(sprite, -w / 2, -h, w, h);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(0,0,0,' + o.dim + ')';
      ctx.fillRect(-w / 2, -h, w, h);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(sprite, -w / 2, -h, w, h);
    }
    ctx.restore();
  }

  /* ---------------- 主绘制 ---------------- */
  R.draw = function (ctx, g) {
    ctx.setTransform(E.SCALE || 1, 0, 0, E.SCALE || 1, 0, 0);
    ctx.fillStyle = '#07070b';
    ctx.fillRect(0, 0, E.W, E.H);
    if (!g || g.state !== 'raid') return;

    g.miniT = (g.miniT || 0) - 0.016;
    if (!g.mini || g.miniT <= 0) { R.buildMini(g); g.miniT = 0.4; }

    // 可见范围（等距下是个菱形，取世界包围盒）
    const corners = [
      E.Cam.toWorld(0, 0), E.Cam.toWorld(E.W, 0),
      E.Cam.toWorld(0, E.H), E.Cam.toWorld(E.W, E.H),
    ];
    const xs = corners.map((c) => c.x), ys = corners.map((c) => c.y);
    const x0 = Math.max(0, Math.floor(Math.min(...xs) / TILE) - 1);
    const x1 = Math.min(g.world.w - 1, Math.ceil(Math.max(...xs) / TILE) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(...ys) / TILE) - 1);
    const y1 = Math.min(g.world.h - 1, Math.ceil(Math.max(...ys) / TILE) + 1);

    drawFloor(ctx, g, x0, x1, y0, y1);

    // 传送门地面光效
    for (const ex of g.world.extracts) {
      const s = proj(ex.x, ex.y);
      const grd = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, ex.r * 0.9);
      grd.addColorStop(0, 'rgba(160,80,240,0.45)');
      grd.addColorStop(1, 'rgba(80,0,160,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, ex.r, ex.r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 深度排序：方块 + 容器 + 掉落 + 角色
    const items = [];
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i = ty * g.world.w + tx;
        if (!g.world.seen[i]) continue;
        if (!Wd.isSolidTile(g.world.tiles[i])) continue;
        const s = proj2(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
        if (s.x < -80 || s.x > E.W + 80 || s.y < -140 || s.y > E.H + 120) continue;
        items.push({ d: (tx + ty + 1) * TILE, kind: 'wall', tx, ty, i });
      }
    }
    for (const c of g.world.containers) {
      if (!g.world.seen[c.ty * g.world.w + c.tx]) continue;
      items.push({ d: c.x + c.y, kind: 'box', c });
    }
    for (const ex of g.world.extracts) items.push({ d: ex.x + ex.y, kind: 'portal', ex });
    for (const d of g.drops) items.push({ d: d.x + d.y, kind: 'drop', d });
    for (const e of g.enemies) if (!e.dead) items.push({ d: e.x + e.y, kind: 'enemy', e });
    items.push({ d: g.player.x + g.player.y, kind: 'player' });
    items.sort((a, b) => a.d - b.d);

    const p = g.player;
    for (const it of items) {
      if (it.kind === 'wall') {
        const tx = it.tx, ty = it.ty, i = it.i;
        const ore = g.oreMap ? g.oreMap[i] : null;
        const t = g.world.tiles[i];
        const texName = ore
          ? MCX.DATA.ores[ore.type].tex
          : (t === Wd.T.WALL ? g.world.wallTex : Wd.texName(g.world, t));
        const d = Math.hypot(tx - p.x / TILE, ty - p.y / TILE);
        const alpha = d < 12 ? 1 : Math.max(0.5, 1 - (d - 12) * 0.08);
        drawBlockAt(ctx, texName, tx * TILE + TILE / 2, ty * TILE + TILE / 2, WALL_H, alpha);
      } else if (it.kind === 'box') {
        const c = it.c;
        const topName = c.type === 'chest' ? 'chest' : c.type === 'furnace' ? 'furnace_top' : 'crafting';
        const sideA = c.type === 'chest' ? 'chest_front' : c.type === 'furnace' ? 'furnace' : 'crafting_side';
        const sideB = c.type === 'chest' ? 'chest_side' : c.type === 'furnace' ? 'furnace_side' : 'crafting_side';
        const s = proj(c.x, c.y);
        shadowEllipse(ctx, s.x, s.y + 6, 20, 9);
        ctx.globalAlpha = c.opened ? 0.5 : 1;
        ctx.drawImage(P.isoBlock(topName, BOX_H, sideA, sideB), Math.round(s.x - 32), Math.round(s.y - 16 - BOX_H));
        ctx.globalAlpha = 1;
        if (!c.opened) {
          const bob = Math.sin(g.time * 3 + c.x) * 1.5;
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = '#ffe066';
          ctx.fillRect(s.x - 1, s.y - BOX_H - 34 + bob, 2, 2);
          ctx.fillRect(s.x - 2.5, s.y - BOX_H - 35.5 + bob, 5, 1);
          ctx.globalAlpha = 1;
        }
      } else if (it.kind === 'drop') {
        const d = it.d;
        const s = proj(d.x, d.y);
        const bob = Math.sin(d.t * 4) * 2;
        shadowEllipse(ctx, s.x, s.y + 4, 8, 4);
        ctx.drawImage(P.item(d.id), s.x - 9, s.y - 20 + bob, 18, 18);
      } else if (it.kind === 'portal') {
        R.drawPortal(ctx, g, it.ex);
      } else if (it.kind === 'enemy') {
        drawEnemy(ctx, g, it.e);
      } else if (it.kind === 'player') {
        drawPlayer(ctx, g);
      }
    }

    // 弹道
    drawProjectiles(ctx, g);
    // 粒子/飘字
    drawFX(ctx, g);

    // 暗角
    const vg = ctx.createRadialGradient(E.W / 2, E.H / 2, E.H * 0.35, E.W / 2, E.H / 2, E.H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, E.W, E.H);

    R.drawHud(ctx, g);
  };

  /* ---------------- 怪物 ---------------- */
  function drawEnemy(ctx, g, e) {
    const p = g.player;
    const img = P.mob(e.def.sprite);
    const sc = e.small ? 0.62 : 1;
    const w = img.width * sc, h = img.height * sc;
    const sBase = proj(e.x, e.y + e.r * 0.4);
    if (sBase.x < -140 || sBase.x > E.W + 140 || sBase.y < -200 || sBase.y > E.H + 140) return;
    shadowEllipse(ctx, sBase.x, sBase.y, e.r * 1.05, e.r * 0.5);

    // 朝向：屏幕空间角度 → 转身（侧身宽、正/背窄，背对镜头压暗）
    const sb2 = E.Cam.proj(e.x, e.y);
    const sf2 = E.Cam.proj(e.x + Math.cos(e.angle || 0) * 24, e.y + Math.sin(e.angle || 0) * 24);
    const angS = Math.atan2(sf2.y - sb2.y, sf2.x - sb2.x);
    const fc = Math.cos(angS), fsn = Math.sin(angS);
    const flip = fc < 0 ? -1 : 1;
    const wScale = 0.82 + 0.18 * Math.abs(fc);
    const dim = Math.max(0, -fsn) * 0.22;

    // 动画：步频相位 → 上下颠 + 左右倾 + 挤压
    const phase = (e.animWalk || 0) * 3.4;
    const stepping = Math.abs(Math.sin(phase));
    const bob = -stepping * 3.0;
    const lean = Math.sin(phase) * 0.05 * flip;
    const punch = e.hitT > 0 ? 0.12 : 0;
    const sx = 1 + punch + (1 - stepping) * 0.02;
    const sy = 1 - punch + stepping * 0.025;

    ctx.save();
    ctx.translate(sBase.x, sBase.y + bob);
    ctx.rotate(lean);
    ctx.scale(flip * sx * wScale, sy);
    ctx.transform(1, 0, -0.10 * fc, 1, 0, 0);
    ctx.drawImage(img, -w / 2, -h, w, h);
    if (dim > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(0,0,0,' + dim + ')';
      ctx.fillRect(-w / 2, -h, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (e.hitT > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = e.hitT * 3;
      ctx.drawImage(img, -w / 2, -h, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // 血条
    if (e.hp < e.maxHp && !e.def.boss) {
      const bw = 30, bh = 3;
      const topY = sBase.y + bob - h - 4;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(sBase.x - bw / 2, topY, bw, bh);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#5cf06a' : e.hp / e.maxHp > 0.25 ? '#ffd24a' : '#ff5a4a';
      ctx.fillRect(sBase.x - bw / 2, topY, bw * (e.hp / e.maxHp), bh);
    }
    // 苦力怕点火
    if (e.fuse > 0) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(g.time * 22);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sBase.x, sBase.y - 2, w * 0.75, w * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- 玩家 ---------------- */
  function drawPlayer(ctx, g) {
    const p = g.player;
    const img = P.mob('player');
    const w = img.width, h = img.height;
    const sBase = proj(p.x, p.y + 10);
    shadowEllipse(ctx, sBase.x, sBase.y, 13, 6);
    // 脚下光环
    ctx.save();
    ctx.strokeStyle = 'rgba(255,226,120,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sBase.x, sBase.y - 1, 17, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,226,120,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(sBase.x, sBase.y - 1, 22, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 朝向：等距屏幕空间角度 → 转身（侧身宽、正/背窄，背对镜头压暗）
    const ax = Math.cos(p.angle), ay = Math.sin(p.angle);
    const fc = p.faceCos === undefined ? 1 : p.faceCos;
    const fs = p.faceSin === undefined ? 0 : p.faceSin;
    const flip = fc < 0 ? -1 : 1;
    const wScale = 0.80 + 0.20 * Math.abs(fc);
    const dim = Math.max(0, -fs) * 0.22;

    // 走路动画：步频相位 → 上下颠 + 左右倾 + 落地挤压
    const phase = (p.walked || 0) / 26;
    const stepping = Math.abs(Math.sin(phase));
    const bob = -stepping * 3.2;
    const lean = Math.sin(phase) * 0.055 * flip;
    const punch = p.swingT > 0 ? (1 - p.swingT / 0.18) : 0;
    const sx = 1 + punch * 0.18 + (1 - stepping) * 0.03;
    const sy = 1 - punch * 0.10 - (1 - stepping) * 0.02 + stepping * 0.02;

    {
      ctx.save();
      ctx.translate(Math.round(sBase.x), Math.round(sBase.y + bob));
      ctx.rotate(lean);
      ctx.scale(flip * sx * wScale, sy);
      ctx.transform(1, 0, -0.10 * fc, 1, 0, 0);
      ctx.drawImage(img, -w / 2, -h, w, h);
      if (dim > 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(0,0,0,' + dim + ')';
        ctx.fillRect(-w / 2, -h, w, h);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    }

    // 手上的武器：按瞄准方向伸出，挥砍时扫一个弧
    const wId = p.weapon && p.weapon.id;
    if (wId) {
      const icon = P.item(wId);
      const hand = E.Cam.projS(p.x + ax * 7, p.y + ay * 7);
      const tipS = E.Cam.projS(p.x + ax * 30, p.y + ay * 30);
      const aimAng = Math.atan2(tipS.y - hand.y, tipS.x - hand.x);
      const sweep = p.swingT > 0 ? Math.sin((1 - p.swingT / 0.18) * Math.PI) * 1.5 - 0.6 : 0;
      ctx.save();
      ctx.translate(hand.x, hand.y - 16 + bob * 0.6);
      ctx.rotate(aimAng + sweep);
      ctx.scale(1.15, 1.15);
      ctx.drawImage(icon, 2, -16, 16, 16);
      ctx.restore();
    }

    // 挥砍：等距平面上的椭圆扇形
    if (p.swingT > 0) {
      const t = p.swingT / 0.18;
      const range = (p.weapon.range || 50);
      const scr = E.Cam.projS(p.x + ax * 10, p.y + ay * 10);
      const ang = Math.atan2(scr.y - sBase.y, scr.x - sBase.x);
      ctx.save();
      ctx.translate(sBase.x, sBase.y - 14);
      ctx.scale(1, 0.5);
      ctx.globalAlpha = 0.5 * t;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, range, ang - 1.05, ang + 1.05);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.85 * t;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, range - 3, ang - 0.5, ang + 0.9);
      ctx.stroke();
      ctx.restore();
    }

    // 瞄准指示
    const tip = E.Cam.projS(p.x + ax * 34, p.y + ay * 34);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sBase.x, sBase.y - 14);
    ctx.lineTo(tip.x, tip.y - 14);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 交互进度
    if (p.act) {
      const a = p.act;
      const s = proj(a.x, a.y);
      const bw = 46, bh = 6;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(s.x - bw / 2, s.y - 46, bw, bh);
      ctx.fillStyle = a.kind === 'ore' ? '#9ad8ff' : '#ffe066';
      ctx.fillRect(s.x - bw / 2, s.y - 46, bw * (a.t / a.dur), bh);
    }
  }

  /* ---------------- 弹道 ---------------- */
  function drawProjectiles(ctx, g) {
    for (const pr of g.projectiles) {
      const s = proj(pr.x, pr.y);
      if (s.x < -40 || s.x > E.W + 40 || s.y < -40 || s.y > E.H + 40) continue;
      if (pr.kind === 'arrow') {
        ctx.save();
        ctx.translate(s.x, s.y - 10);
        ctx.rotate(Math.atan2(pr.vy, pr.vx) + Math.PI / 4);
        ctx.drawImage(P.itemSpec('arrow'), -8, -8);
        ctx.restore();
      } else if (pr.kind === 'fire') {
        ctx.fillStyle = '#ffb347';
        ctx.beginPath(); ctx.arc(s.x, s.y - 10, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff0a0';
        ctx.beginPath(); ctx.arc(s.x, s.y - 10, 3, 0, Math.PI * 2); ctx.fill();
      } else if (pr.kind === 'skull') {
        ctx.fillStyle = '#2a2a2e';
        ctx.beginPath(); ctx.arc(s.x, s.y - 10, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff5a4a';
        ctx.fillRect(s.x - 4, s.y - 12, 3, 3);
        ctx.fillRect(s.x + 1, s.y - 12, 3, 3);
      } else if (pr.kind === 'tnt') {
        const w = 18 + Math.sin(g.time * 24) * 2;
        ctx.drawImage(P.itemSpec('tnt'), s.x - w / 2, s.y - 18, w, w);
      }
    }
  }

  /* ---------------- 粒子 / 飘字 ---------------- */
  function drawFX(ctx, g) {
    for (const q of E.FX.parts) {
      const s = proj(q.x, q.y);
      ctx.globalAlpha = Math.max(0, Math.min(1, q.life / (q.max * 0.6)));
      ctx.fillStyle = q.color;
      ctx.fillRect(s.x - q.size / 2, s.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;
    for (const f of E.FX.floats) {
      const s = proj(f.x, f.y);
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.45));
      R.text(ctx, f.str, s.x, s.y - 10, f.size, f.color, 'center');
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- 传送门 ---------------- */
  const _oldDraw = R.draw;
  R.drawPortal = function (ctx, g, ex) {
    const s = proj(ex.x, ex.y);
    const w = 46, h = 60;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = '#160b22';
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeStyle = '#3a1a55';
    ctx.lineWidth = 3;
    ctx.strokeRect(-w / 2, -h, w, h);
    for (let i = 0; i < 10; i++) {
      const a = g.time * 1.6 + i * 1.7;
      const px = Math.sin(a) * 14;
      const py = h / 2 + Math.cos(a * 1.3) * 22;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(a * 2);
      ctx.fillStyle = i % 2 ? '#b06ae8' : '#e0b0ff';
      const s2 = 3 + (i % 3);
      ctx.fillRect(px - s2 / 2, py - s2 / 2, s2, s2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    R.text(ctx, '撤离点', s.x, s.y - h - 10, 11, '#e0c0ff', 'center');
  };
})();
