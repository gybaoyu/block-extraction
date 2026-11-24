/* ============================================================
 * 渲染层：世界 / 实体 / 特效 / HUD / 小地图
 * ============================================================ */
(function () {
  'use strict';
  const MCX = window.MCX = window.MCX || {};
  const E = MCX.E;
  const Wd = MCX.World;
  const P = MCX.PX;
  const R = MCX.Render = {};
  const TILE = E.TILE;

  const FONT = (s, w) => `${w ? 'bold ' : ''}${s}px "Microsoft YaHei","PingFang SC",monospace`;

  function text(ctx, str, x, y, size, color, align, weight) {
    ctx.font = FONT(size, weight !== false);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillText(str, x + 1.5, y + 1.5);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function shadowEllipse(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fill();
  }

  function heartPath(ctx, x, y, s, color) {
    // 9x8 像素心
    const rows = [
      '.##...##.',
      '#########',
      '#########',
      '#########',
      '.#######.',
      '..#####..',
      '...###...',
      '....#....',
    ];
    ctx.fillStyle = color;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < 9; c++) {
        if (rows[r][c] === '#') ctx.fillRect(x + c * s, y + r * s, s, s);
      }
    }
  }

  /* ---------------- 小地图 ---------------- */
  function buildMini(g) {
    const w = g.world.w, h = g.world.h;
    const c = E.mkCanvas(w, h);
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (!g.world.seen[j * w + i]) continue;
        const t = g.world.tiles[j * w + i];
        let col = '#3a3a3a';
        if (t === Wd.T.GRASS) col = '#4e8c39';
        else if (t === Wd.T.STONE || t === Wd.T.COBBLE) col = '#7a7a7a';
        else if (t === Wd.T.PLANKS) col = '#8a6538';
        else if (t === Wd.T.DEEP) col = '#4a4a50';
        else if (t === Wd.T.NETHER) col = '#703030';
        else if (t === Wd.T.GRAVEL) col = '#6a6a6a';
        else if (t === Wd.T.MOSSY) col = '#5e7048';
        else if (t === Wd.T.WALL) col = '#222';
        else col = '#111';
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    g.mini = c;
    g.miniT = 0;
  }
  R.buildMini = buildMini;

  /* ---------------- 世界 ---------------- */
  function drawWorld(ctx, g) {
    const p = g.player;
    const pt = Wd.tileAt(g.world, p.x, p.y);
    const camX = E.Cam.x, camY = E.Cam.y;
    const x0 = Math.max(0, Math.floor((camX - E.W / 2) / TILE) - 1);
    const x1 = Math.min(g.world.w - 1, Math.ceil((camX + E.W / 2) / TILE) + 1);
    const halfH = E.H / (2 * E.Cam.KY);
    const y0 = Math.max(0, Math.floor((camY - halfH) / TILE) - 1);
    const y1 = Math.min(g.world.h - 1, Math.ceil((camY + halfH) / TILE) + 1);
    const ptx = p.x / TILE, pty = p.y / TILE;

    // ---- 1. 地面（只画地板，墙单独一层，便于做出高度）----
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i = ty * g.world.w + tx;
        if (!g.world.seen[i]) continue;
        const t = g.world.tiles[i];
        if (Wd.isSolidTile(t)) continue;
        const sx = tx * TILE, sy = ty * TILE;
        const d = Math.hypot(tx - ptx, ty - pty);
        ctx.globalAlpha = d < 11 ? 1 : Math.max(0.45, 1 - (d - 11) * 0.09);
        ctx.drawImage(P.tile(Wd.texName(g.world, t)), sx, sy);
        // 装饰
        const dec = g.world.decor[i];
        if (dec) {
          const kinds = [null, 'flower', 'pebble', 'crack', 'mushroom'];
          const k = kinds[dec];
          if (k) ctx.drawImage(P.decor((tx * 7 + ty * 13) % 4, k), sx, sy, TILE, TILE);
        }
        // 贴墙阴影（墙在玩家北侧 → 地面顶部压暗）
        if (ty > 0 && Wd.isSolidTile(g.world.tiles[i - g.world.w])) ctx.drawImage(P.shadowTop(), sx, sy);
        if (tx > 0 && Wd.isSolidTile(g.world.tiles[i - 1])) {
          ctx.fillStyle = 'rgba(0,0,0,0.32)';
          ctx.fillRect(sx, sy, 4, TILE);
        }
        ctx.globalAlpha = 1;
      }
    }

    // ---- 2. 墙体：整块「顶面 + 正面」，像真的立在地面上 ----
    const KY = E.Cam.KY;
    const WALL_H = 56;                 // 墙面高度（屏幕像素）
    const faceTex = P.wallFace(g.world.wallTex, WALL_H);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i = ty * g.world.w + tx;
        if (!g.world.seen[i]) continue;
        const t = g.world.tiles[i];
        if (!Wd.isSolidTile(t)) continue;
        const sx = tx * TILE;
        const baseY = (ty + 1) * TILE;              // 方块底边（世界坐标）
        const d = Math.hypot(tx - ptx, ty - pty);
        ctx.globalAlpha = d < 11 ? 1 : Math.max(0.45, 1 - (d - 11) * 0.09);
        const ore = g.oreMap ? g.oreMap[i] : null;
        const topTex = ore
          ? P.tile(MCX.DATA.ores[ore.type].tex)
          : (t === Wd.T.WALL ? P.wallVar(g.world.wallTex, (tx * 7 + ty * 13) % 3) : P.tile(Wd.texName(g.world, t)));
        // 顶面：整体上抬 WALL_H，看上去是“站在地上的方块”的上表面
        ctx.drawImage(topTex, sx, baseY - TILE - WALL_H / KY, TILE, TILE);
        // 顶面描边：让每块砖都看得出是一块方块
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 0.5, baseY - TILE - WALL_H / KY + 0.5, TILE - 1, TILE - 1);
        // 侧面（贴墙的垂直面）：左右相邻是地面时给一条暗边，方块感更强
        const westFloor = tx > 0 && !Wd.isSolidTile(g.world.tiles[i - 1]);
        const eastFloor = tx < g.world.w - 1 && !Wd.isSolidTile(g.world.tiles[i + 1]);
        if (westFloor || eastFloor) {
          ctx.save();
          ctx.translate(sx, baseY);
          ctx.scale(1, 1 / KY);
          if (westFloor) {
            ctx.drawImage(faceTex, 0, 0, 7, WALL_H, 0, -WALL_H, 7, WALL_H);
            ctx.fillStyle = 'rgba(0,0,0,0.30)';
            ctx.fillRect(0, -WALL_H, 7, WALL_H);
          }
          if (eastFloor) {
            ctx.drawImage(faceTex, 25, 0, 7, WALL_H, TILE - 7, -WALL_H, 7, WALL_H);
            ctx.fillStyle = 'rgba(0,0,0,0.30)';
            ctx.fillRect(TILE - 7, -WALL_H, 7, WALL_H);
          }
          ctx.restore();
        }
        // 正面：只有南边是可走地面才画（朝镜头的一面）
        const southTile = ty + 1 < g.world.h ? g.world.tiles[i + g.world.w] : Wd.T.VOID;
        if (!Wd.isSolidTile(southTile) && southTile !== Wd.T.VOID) {
          ctx.save();
          ctx.translate(sx, baseY);
          ctx.scale(1, 1 / KY);                     // 抵消镜头压扁：墙面竖直
          ctx.drawImage(faceTex, 0, -WALL_H, TILE, WALL_H);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    }

    // 撤离点
    for (const ex of g.world.extracts) {
      const t = g.time;
      const r = ex.r;
      const grd = ctx.createRadialGradient(ex.x, ex.y, 4, ex.x, ex.y, r);
      grd.addColorStop(0, 'rgba(160,80,240,0.55)');
      grd.addColorStop(0.6, 'rgba(120,40,200,0.25)');
      grd.addColorStop(1, 'rgba(80,0,160,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2); ctx.fill();
      // 传送门方块
      srcPortal(ctx, ex.x, ex.y, t);
      ctx.font = FONT(11);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(ex.x - 42, ex.y - r - 22, 84, 15);
      ctx.fillStyle = '#e0c0ff';
      ctx.fillText('撤离点', ex.x, ex.y - r - 11);
      if (g.extractProgress > 0 && g.nearExtract === ex) {
        const w = 90, h = 7;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(ex.x - w / 2, ex.y + r + 6, w, h);
        ctx.fillStyle = '#a24ae8';
        ctx.fillRect(ex.x - w / 2, ex.y + r + 6, w * g.extractProgress, h);
      }
    }

    // 容器：画成有厚度的小方块（顶面 + 正面）
    const CH = 14;
    for (const c of g.world.containers) {
      if (!g.world.seen[c.ty * g.world.w + c.tx]) continue;
      const texName = c.type === 'chest' ? 'chest' : c.type === 'furnace' ? 'furnace' : 'crafting';
      const baseY = c.y + 16;
      ctx.save();
      ctx.globalAlpha = c.opened ? 0.45 : 1;
      shadowEllipse(ctx, c.x, baseY + 1, 15, 5);
      ctx.drawImage(P.tile(texName), c.x - 16, baseY - TILE - CH / E.Cam.KY, 32, 32);
      ctx.translate(c.x - 16, baseY);
      ctx.scale(1, 1 / E.Cam.KY);
      ctx.drawImage(P.wallFace(texName, CH), 0, -CH, 32, CH);
      ctx.restore();
      if (!c.opened) {
        const bob = Math.sin(g.time * 3 + c.x) * 1.5;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(c.x - 1, c.y - 34 + bob, 2, 2);
        ctx.fillRect(c.x - 2.5, c.y - 35.5 + bob, 5, 1);
        ctx.globalAlpha = 1;
      }
    }
  }

  function srcPortal(ctx, x, y, t) {
    // 立起来的传送门：底部贴地，竖直方向不压缩
    const w = 44, h = 56;
    const KY = E.Cam.KY;
    ctx.save();
    ctx.translate(x, y + 22);
    ctx.scale(1, 1 / KY);
    ctx.translate(-w / 2, -h);
    const t0 = performance.now() / 1000;
    ctx.fillStyle = '#160b22';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3a1a55';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const a = (t || t0) * 1.4 + i * 1.7;
      const px = w / 2 + Math.sin(a) * 13;
      const py = h / 2 + Math.cos(a * 1.3) * 20;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(a * 2);
      ctx.fillStyle = i % 2 ? '#b06ae8' : '#e0b0ff';
      const s = 3 + (i % 3);
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }
    ctx.restore();
  }

  /* ---------------- 实体 ---------------- */
  function drawDrops(ctx, g) {
    for (const d of g.drops) {
      const bob = Math.sin(d.t * 4) * 2;
      shadowEllipse(ctx, d.x, d.y + 7, 7, 3);
      const img = P.item(d.id);
      ctx.drawImage(img, 0, 0, 16, 16, d.x - 9, d.y - 10 + bob, 18, 18);
    }
  }

  function drawEnemies(ctx, g) {
    const p = g.player;
    const KY = E.Cam.KY;
    const list = g.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of list) {
      const img = P.mob(e.def.sprite);
      const sc = e.small ? 0.62 : 1;
      const w = img.width * sc, h = img.height * sc;
      const footY = e.y + e.r * 0.65;
      const topWorld = footY - h / KY;
      shadowEllipse(ctx, e.x, footY, Math.max(8, e.r * 0.85), e.r * 0.32);
      const flip = (p.x < e.x) ? -1 : 1;
      ctx.save();
      ctx.translate(e.x, footY);
      ctx.scale(1, 1 / KY);          // 抵消镜头压扁，让角色立起来
      if (flip < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, -h, w, h);
      // 受击白闪
      if (e.hitT > 0) {
        ctx.globalAlpha = e.hitT * 3.2;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(img, -w / 2, -h, w, h);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // 血条
      if (e.hp < e.maxHp && !e.def.boss) {
        const bw = 28, bh = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(e.x - bw / 2, topWorld - 4, bw, bh);
        ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#5cf06a' : e.hp / e.maxHp > 0.25 ? '#ffd24a' : '#ff5a4a';
        ctx.fillRect(e.x - bw / 2, topWorld - 4, bw * (e.hp / e.maxHp), bh);
      }
      // 苦力怕点燃
      if (e.fuse > 0) {
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(g.time * 22);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(e.x, footY - 2, Math.max(w, h) * 0.5, Math.max(w, h) * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawPlayer(ctx, g) {
    const p = g.player;
    const img = P.mob('player');
    const w = img.width, h = img.height;
    const footY = p.y + 12;
    shadowEllipse(ctx, p.x, footY, 12, 5);
    // 脚下光环：一眼认出自己
    ctx.save();
    ctx.strokeStyle = 'rgba(255,226,120,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.x, footY - 1, 15, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,226,120,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(p.x, footY - 1, 19, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // 冲刺拖影
    if (p.dashT > 0) {
      ctx.globalAlpha = 0.28;
      for (let i = 1; i <= 3; i++) {
        const tx = p.x - Math.cos(p.dashDir) * i * 12;
        const ty = footY - Math.sin(p.dashDir) * i * 12;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(1, 1 / E.Cam.KY);
        ctx.drawImage(img, -w / 2, -h, w, h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    // 瞄准指示
    const ax = Math.cos(p.angle), ay = Math.sin(p.angle);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + ax * 20, p.y - 2 + ay * 20);
    ctx.lineTo(p.x + ax * 32, p.y - 2 + ay * 32);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(p.x, footY);
    ctx.scale(1, 1 / E.Cam.KY);      // 抵消镜头压扁
    if (ax < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();

    // 挥砍特效
    if (p.swingT > 0) {
      const t = p.swingT / 0.18;
      const range = p.weapon.range || 50;
      ctx.save();
      ctx.globalAlpha = 0.55 * t;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, range, p.swingDir - 1.05, p.swingDir + 1.05);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.9 * t;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, range - 2, p.swingDir - 0.5, p.swingDir + 0.9);
      ctx.stroke();
      ctx.restore();
    }
    // 无敌帧闪烁
    if (p.invuln > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(g.time * 30);
      ctx.strokeStyle = '#8ffbef';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y - 2, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // 交互进度
    if (p.act) {
      const a = p.act;
      const w = 46, h = 6;
      const px = a.x, py = a.y - 26;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(px - w / 2, py, w, h);
      ctx.fillStyle = a.kind === 'ore' ? '#9ad8ff' : '#ffe066';
      ctx.fillRect(px - w / 2, py, w * (a.t / a.dur), h);
    }
  }

  function drawProjectiles(ctx, g) {
    for (const pr of g.projectiles) {
      if (pr.kind === 'arrow') {
        const arrow = P.itemSpec('arrow');
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(Math.atan2(pr.vy, pr.vx) + Math.PI / 4);
        ctx.drawImage(arrow, -8, -8);
        ctx.restore();
      } else if (pr.kind === 'fire') {
        ctx.fillStyle = '#ffb347';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff0a0';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 3, 0, Math.PI * 2); ctx.fill();
      } else if (pr.kind === 'skull') {
        ctx.fillStyle = '#2a2a2e';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff5a4a';
        ctx.fillRect(pr.x - 4, pr.y - 2, 3, 3);
        ctx.fillRect(pr.x + 1, pr.y - 2, 3, 3);
      } else if (pr.kind === 'tnt') {
        const img = P.itemSpec('tnt');
        ctx.save();
        const w = 18 + Math.sin(g.time * 24) * 2;
        ctx.drawImage(img, pr.x - w / 2, pr.y - w / 2, w, w);
        ctx.restore();
        if (pr.life < 0.5) {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#ff5a4a';
          ctx.beginPath(); ctx.arc(pr.x, pr.y, 40 * (1 - pr.life / 0.5), 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  function drawFX(ctx, g) {
    for (const p of E.FX.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / (p.max * 0.6)));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const f of E.FX.floats) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.45));
      text(ctx, f.str, f.x, f.y, f.size, f.color, 'center');
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- HUD ---------------- */
  function drawHud(ctx, g) {
    const p = g.player;
    const W = E.W, H = E.H;

    // 受伤红闪
    if (p.hurtT > 0) {
      ctx.fillStyle = 'rgba(200,20,20,' + (p.hurtT * 0.8) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    // 低血心跳
    if (p.hp / p.maxHp < 0.3) {
      const a = 0.12 + 0.1 * Math.sin(g.time * 6);
      const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.7);
      grd.addColorStop(0, 'rgba(180,0,0,0)');
      grd.addColorStop(1, 'rgba(180,0,0,' + a + ')');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    // 心
    const s = 2;
    const perHeart = Math.max(2, Math.ceil(p.maxHp / 20) * 2);
    const heartCount = Math.ceil(p.maxHp / perHeart);
    let heartsPerRow = 10;
    // 血条：仿 MC，居中放在快捷栏正上方
    const barSlot = 40, barGap = 3, barN = 4;
    const barW = barN * barSlot + (barN - 1) * barGap;
    const barX = W / 2 - barW / 2;
    const barY = H - barSlot - 16;
    const heartSpacing = 18;
    const hx0 = W / 2 - (heartsPerRow * heartSpacing) / 2;
    const hy0 = barY - 24;
    for (let i = 0; i < heartCount; i++) {
      const row = Math.floor(i / heartsPerRow);
      const col = i % heartsPerRow;
      const hx = hx0 + col * heartSpacing;
      const hy = hy0 + row * 18;
      const hpIn = E.clamp(p.hp - i * perHeart, 0, perHeart);
      heartPath(ctx, hx, hy, s, 'rgba(0,0,0,0.55)');
      if (hpIn > 0) {
        if (hpIn >= perHeart * 0.5) heartPath(ctx, hx, hy, s, '#e02b2b');
        if (hpIn >= perHeart * 0.5 && hpIn < perHeart) {
          ctx.save();
          ctx.beginPath(); ctx.rect(hx, hy, 9, 8);
          ctx.clip();
          heartPath(ctx, hx, hy, s, '#e02b2b');
          ctx.restore();
        }
      }
    }
    // 护甲图标 + buff，放在血条左侧
    let sy = 12;
    if (p.armor) {
      ctx.drawImage(P.item(p.armor.id), hx0 - 30, hy0 - 2, 20, 20);
      sy = hy0 - 12;
    }
    if (p.buffs.speed > 0) { text(ctx, '迅捷 ' + p.buffs.speed.toFixed(0) + 's', hx0 - 30, sy, 11, '#4ad8e8'); sy -= 14; }
    if (p.buffs.str > 0) { text(ctx, '力量 ' + p.buffs.str.toFixed(0) + 's', hx0 - 30, sy, 11, '#d86ae8'); sy -= 14; }

    // 计时
    const tleft = Math.max(0, g.world.timeLeft - g.time);
    const mm = Math.floor(tleft / 60), ss = Math.floor(tleft % 60);
    const tstr = mm + ':' + String(ss).padStart(2, '0');
    const urgent = tleft < 60;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(W / 2 - 46, 8, 92, 26);
    text(ctx, tstr, W / 2, 28, 18, urgent ? '#ff5a4a' : '#ffffff', 'center');

    // 小地图
    const mw = 168, mh = 112;
    const mx = W - mw - 12, my = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 2.5, my - 2.5, mw + 5, mh + 5);
    if (g.mini) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(g.mini, mx, my, mw, mh);
      ctx.restore();
      const sx = mw / g.world.w, sy2 = mh / g.world.h;
      // 撤离点
      for (const ex of g.world.extracts) {
        const exx = mx + (ex.x / TILE) * sx, eyy = my + (ex.y / TILE) * sy2;
        ctx.fillStyle = g.nearExtract === ex ? '#e0a0ff' : '#a24ae8';
        ctx.fillRect(exx - 3, eyy - 3, 6, 6);
      }
      // 未开箱
      for (const c of g.world.containers) {
        if (c.opened) continue;
        if (!g.world.seen[c.ty * g.world.w + c.tx]) continue;
        ctx.fillStyle = '#ffd24a';
        ctx.fillRect(mx + c.tx * sx - 1.5, my + c.ty * sy2 - 1.5, 3, 3);
      }
      // 敌人
      for (const e of g.enemies) {
        const exx = mx + (e.x / TILE) * sx, eyy = my + (e.y / TILE) * sy2;
        if (E.dist(p.x, p.y, e.x, e.y) > 420) continue;
        ctx.fillStyle = e.def.boss ? '#c04ae8' : '#ff4a4a';
        ctx.fillRect(exx - 1.5, eyy - 1.5, 3, 3);
      }
      // 玩家
      const pxx = mx + (p.x / TILE) * sx, pyy = my + (p.y / TILE) * sy2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pxx - 2, pyy - 2, 4, 4);
    }

    // Boss 血条（只在交战时显示）
    const boss = g.enemies.find((e) => e.def.boss && !e.dead && e.aggro);
    if (boss) {
      const bw = 420;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(W / 2 - bw / 2, H - 34, bw, 16);
      ctx.fillStyle = '#a24ae8';
      ctx.fillRect(W / 2 - bw / 2 + 2, H - 32, (bw - 4) * E.clamp(boss.hp / boss.maxHp, 0, 1), 12);
      text(ctx, '凋灵 ' + Math.max(0, Math.ceil(boss.hp)) + '/' + boss.maxHp, W / 2, H - 22, 12, '#ffffff', 'center');
    }

    // 快捷栏（仿 MC，居中底部）：武器 + 3 个快捷道具
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(barX - 5, barY - 5, barW + 10, barSlot + 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 5.5, barY - 5.5, barW + 11, barSlot + 11);
    const slotItems = [p.weapon, p.quick[0], p.quick[1], p.quick[2]];
    for (let i = 0; i < barN; i++) {
      const x = barX + i * (barSlot + barGap), y = barY;
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(x, y, barSlot, barSlot);
      ctx.strokeStyle = i === 0 ? 'rgba(255,226,120,0.6)' : 'rgba(255,255,255,0.22)';
      ctx.strokeRect(x + 0.5, y + 0.5, barSlot - 1, barSlot - 1);
      const it = slotItems[i];
      if (it) ctx.drawImage(P.item(it.id), x + 8, y + 8, barSlot - 16, barSlot - 16);
      if (i > 0) text(ctx, String(i), x + 3, y + 12, 10, '#cfcfcf');
    }
    if (p.weapon) text(ctx, p.weapon.name, 8, 18, 11, '#cfcfcf');

    // 背包 / 价值（右下角）
    const used = MCX.Ent.invUsed(p);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W - 118, H - 40, 110, 30);
    text(ctx, '背包 ' + used + '/' + p.slots, W - 110, H - 22, 11, used >= p.slots ? '#ff5a4a' : '#ffffff');
    text(ctx, '价值 ' + MCX.Ent.invValue(p), W - 110, H - 10, 10, '#9ad8ff');

    // 交互提示
    const it = MCX.Ent.findInteractable(g);
    if (it && !p.act) {
      const label = it.kind === 'container' ? (it.target.trap ? '打开箱子' : '打开' + (it.target.type === 'chest' ? '木箱' : it.target.type === 'furnace' ? '熔炉' : '工作台'))
        : '挖 ' + MCX.DATA.ores[it.target.type].name;
      const can = it.kind !== 'ore' || it.canMine;
      const sp = E.Cam.projS(it.x, it.y);
      text(ctx, (can ? '[E] ' : '') + label + (can ? '' : '（需要更好的镐）'),
        sp.x, sp.y - 40, 12, can ? '#ffe066' : '#ff8a5a', 'center');
    }

    // 撤离提示
    if (g.nearExtract) {
      const remain = Math.max(0, MCX.DATA.cfg.extractHold - g.extractProgress * MCX.DATA.cfg.extractHold);
      text(ctx, '撤离中… ' + remain.toFixed(1) + 's  （受伤会中断）', W / 2, H - 70, 15, '#e0c0ff', 'center');
    }

    // 开局提示
    if (g.time < 3.2) {
      ctx.globalAlpha = Math.min(1, 3.2 - g.time);
      text(ctx, '搜刮 → 战斗 → 撤离', W / 2, 96, 26, '#ffffff', 'center');
      text(ctx, '倒计时结束前跑到紫色传送门', W / 2, 120, 14, '#c0c0c0', 'center');
      ctx.globalAlpha = 1;
    }

    // 触屏按钮
    if (E.Input.touch) {
      const st = E.Input.touchState;
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(W - 90, H - 60, 34, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W - 200, H - 70, 28, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W - 105, H - 185, 24, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9;
      text(ctx, 'A', W - 90, H - 54, 18, '#000', 'center');
      text(ctx, 'E', W - 200, H - 64, 16, '#000', 'center');
      text(ctx, 'D', W - 105, H - 178, 14, '#000', 'center');
      if (st && st.stick) {
        ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(st.stick.ox, st.stick.oy, 46, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(st.stick.ox + st.moveX * 40, st.stick.oy + st.moveY * 40, 18, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- 主绘制 ---------------- */
  R.draw = function (ctx, g) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, E.W, E.H);
    if (!g || g.state !== 'raid') return;

    // 小地图缓存刷新
    g.miniT = (g.miniT || 0) - 0.016;
    if (!g.mini || g.miniT <= 0) { buildMini(g); g.miniT = 0.4; }

    ctx.save();
    E.Cam.apply(ctx);
    drawWorld(ctx, g);
    drawDrops(ctx, g);
    drawEnemies(ctx, g);
    drawPlayer(ctx, g);
    drawProjectiles(ctx, g);
    drawFX(ctx, g);
    ctx.restore();

    // 暗角
    const vg = ctx.createRadialGradient(E.W / 2, E.H / 2, E.H * 0.35, E.W / 2, E.H / 2, E.H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, E.W, E.H);

    drawHud(ctx, g);
  };

  R.text = text;
  R.drawHud = drawHud;
  R.heartPath = heartPath;
})();
