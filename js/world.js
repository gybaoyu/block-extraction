/* ============================================================
 * 世界层：随机地图（房间 + 走廊 + 分级）、碰撞、黑雾、矿点/容器/撤离点
 * ============================================================ */
(function () {
  'use strict';
  const MCX = window.MCX = window.MCX || {};
  const E = MCX.E;
  const TILE = E.TILE;
  const Wd = MCX.World = {};

  const T = Wd.T = {
    VOID: 0, GRASS: 1, STONE: 2, PLANKS: 3, DEEP: 4, NETHER: 5,
    GRAVEL: 6, MOSSY: 7, COBBLE: 8, WATER: 9, WALL: 10, BEDROCK: 11,
  };
  const FLOOR_OF = {
    grass: T.GRASS, stone: T.STONE, planks: T.PLANKS, deepslate: T.DEEP,
    netherrack: T.NETHER, gravel: T.GRAVEL, mossy: T.MOSSY, cobble: T.COBBLE,
  };
  const TEX_OF = {
    1: 'grass', 2: 'stone', 3: 'planks', 4: 'deepslate', 5: 'netherrack',
    6: 'gravel', 7: 'mossy', 8: 'cobble', 9: 'water', 11: 'bedrock',
  };
  const SOLID = new Set([0, 9, 10, 11]);
  Wd.isSolidTile = (t) => SOLID.has(t);

  const W = 112, H = 74;
  const CW = 18, CH = 17;      // 单元格尺寸
  const GW = 6, GH = 4;        // 单元格数量

  Wd.gen = function (mapId) {
    const DATA = MCX.DATA;
    const map = DATA.maps.find((m) => m.id === mapId) || DATA.maps[0];
    const tiles = new Uint8Array(W * H).fill(T.WALL);
    const decor = new Uint8Array(W * H);
    const seen = new Uint8Array(W * H);
    const idx = (x, y) => y * W + x;

    const floorPick = () => {
      const arr = map.floors;
      const name = Math.random() < 0.55 ? arr[0] : E.pick(arr);
      return FLOOR_OF[name] || T.STONE;
    };

    function carveRect(x, y, w, h, texFn) {
      for (let j = y; j < y + h; j++) {
        for (let i = x; i < x + w; i++) {
          if (i < 1 || j < 1 || i >= W - 1 || j >= H - 1) continue;
          tiles[idx(i, j)] = texFn ? texFn() : floorPick();
        }
      }
    }

    // ---- 1. 选单元格 ----
    const cells = [];
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) cells.push({ i, j });
    const spawnCell = { i: GW >> 1, j: GH >> 1 };
    const others = cells.filter((c) => !(c.i === spawnCell.i && c.j === spawnCell.j));
    E.shuffle(others);
    const want = E.clamp(map.rooms, 6, cells.length);
    const chosen = [{ ...spawnCell }].concat(others.slice(0, want - 1));
    const cellKey = (c) => c.i + ',' + c.j;
    const cellMap = new Map();
    chosen.forEach((c) => cellMap.set(cellKey(c), c));

    // ---- 2. 生成房间矩形 ----
    const rooms = [];
    for (const c of chosen) {
      const rw = E.randInt(CW - 5, CW - 3);
      const rh = E.randInt(CH - 5, CH - 3);
      const rx = E.clamp(1 + c.i * CW + E.randInt(1, CW - rw - 1), 1, W - rw - 2);
      const ry = E.clamp(1 + c.j * CH + E.randInt(1, CH - rh - 1), 1, H - rh - 2);
      const room = {
        x: rx, y: ry, w: rw, h: rh,
        cx: rx + (rw >> 1), cy: ry + (rh >> 1),
        i: c.i, j: c.j, tier: 1, depth: 0,
        cont: [], ores: [], enemies: [],
      };
      rooms.push(room);
      c.room = room;
      // 主地板统一，局部再铺一块异色地砖，避免满屏噪点
      const primary = floorPick();
      carveRect(rx, ry, rw, rh, () => primary);
      if (Math.random() < 0.6) {
        const pw = E.randInt(2, 4), ph = E.randInt(2, 4);
        const px2 = E.randInt(rx, rx + Math.max(0, rw - pw));
        const py2 = E.randInt(ry, ry + Math.max(0, rh - ph));
        const sec = floorPick();
        carveRect(px2, py2, pw, ph, () => sec);
      }
    }

    // ---- 3. 走廊（随机 DFS 生成树，保证连通） ----
    const startCell = cellMap.get(cellKey(spawnCell));
    const visited = new Set([cellKey(startCell)]);
    const stack = [startCell];
    const carveCorr = (a, b) => {
      const ax = a.room.cx, ay = a.room.cy, bx = b.room.cx, by = b.room.cy;
      const f = floorPick();
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) {
        carveRect(x, by - 1, 1, 2, () => f);
      }
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) {
        carveRect(bx - 1, y, 2, 1, () => f);
      }
    };
    let guard = 0;
    while (stack.length && guard++ < 4000) {
      const cur = stack[stack.length - 1];
      const nbrs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(([di, dj]) => cellMap.get((cur.i + di) + ',' + (cur.j + dj)))
        .filter((c) => c && !visited.has(cellKey(c)));
      if (!nbrs.length) { stack.pop(); continue; }
      const nxt = E.pick(nbrs);
      visited.add(cellKey(nxt));
      carveCorr(cur, nxt);
      stack.push(nxt);
    }

    // ---- 4. 深度分级 ----
    const spawnRoom = startCell.room;
    rooms.forEach((r) => {
      const d = Math.abs(r.i - spawnCell.i) + Math.abs(r.j - spawnCell.j);
      r.depth = d;
      r.tier = d <= 1 ? 1 : d <= 3 ? 2 : 3;
    });
    // 保证至少有 4 个 2 级以上的房间
    rooms.forEach((r) => { if (r.tier === 1 && r !== spawnRoom && Math.random() < 0.25) r.tier = 2; });

    const world = {
      mapId: map.id, map, w: W, h: H, tiles, decor, seen,
      rooms, spawnRoom, wallTex: map.wall,
      containers: [], ores: [], extracts: [], boss: null,
      time: map.time, timeLeft: map.time,
      danger: map.danger,
      seed: Math.random(),
    };

    // ---- 5. 装饰 ----
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const t = tiles[idx(x, y)];
        if (t === T.GRASS) {
          const r = Math.random();
          if (r < 0.05) decor[idx(x, y)] = 1;       // 花
          else if (r < 0.11) decor[idx(x, y)] = 2;  // 碎石
          else if (r < 0.125) decor[idx(x, y)] = 4; // 蘑菇
        } else if (t === T.STONE || t === T.COBBLE) {
          const r = Math.random();
          if (r < 0.03) decor[idx(x, y)] = 3;
          else if (r < 0.08) decor[idx(x, y)] = 2;
        } else if (t === T.NETHER) {
          if (Math.random() < 0.06) decor[idx(x, y)] = 3;
        }
      }
    }

    // ---- 6. 容器 ----
    const contType = () => {
      const r = Math.random();
      return r < 0.6 ? 'chest' : r < 0.82 ? 'crafting' : 'furnace';
    };
    rooms.forEach((room) => {
      if (room === spawnRoom) return;
      let n = 1 + (Math.random() < 0.55 ? 1 : 0) + (room.tier > 1 && Math.random() < 0.45 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const tx = E.randInt(room.x + 1, room.x + room.w - 2);
        const ty = E.randInt(room.y + 1, room.y + room.h - 2);
        const c = {
          x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2,
          tx, ty, type: contType(), opened: false, tier: room.tier,
          trap: Math.random() < 0.16,
        };
        room.cont.push(c);
        world.containers.push(c);
      }
    });

    // ---- 7. 矿点（贴在墙上） ----
    const oreWeight = (tier) => {
      const pool = map.orePool;
      if (tier >= 3) return E.pick(pool);
      if (tier === 2) return E.pick(pool.filter((o) => o !== 'scrap') || pool);
      const low = pool.filter((o) => ['coal', 'iron', 'redstone', 'lapis', 'gold'].includes(o));
      return E.pick(low.length ? low : pool);
    };
    rooms.forEach((room) => {
      let n = room.tier >= 3 ? E.randInt(1, 3) : room.tier === 2 ? E.randInt(0, 2) : (Math.random() < 0.5 ? 1 : 0);
      let guard2 = 0;
      while (n > 0 && guard2++ < 60) {
        const tx = E.randInt(room.x, room.x + room.w - 1);
        const ty = E.randInt(room.y, room.y + room.h - 1);
        const t = tiles[idx(tx, ty)];
        if (SOLID.has(t)) continue;
        // 找相邻的墙
        const dirs = E.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        for (const [dx, dy] of dirs) {
          const wx2 = tx + dx, wy2 = ty + dy;
          if (wx2 < 1 || wy2 < 1 || wx2 >= W - 1 || wy2 >= H - 1) continue;
          if (tiles[idx(wx2, wy2)] !== T.WALL) continue;
          if (world.ores.some((o) => o.tx === wx2 && o.ty === wy2)) continue;
          const o = {
            x: wx2 * TILE + TILE / 2, y: wy2 * TILE + TILE / 2,
            tx: wx2, ty: wy2, type: oreWeight(room.tier), mined: false, tier: room.tier,
          };
          world.ores.push(o);
          room.ores.push(o);
          n--;
          break;
        }
      }
    });

    // ---- 8. 撤离点（最深的几个房间） ----
    const sorted = rooms.filter((r) => r !== spawnRoom).sort((a, b) => (b.depth + b.tier) - (a.depth + a.tier));
    const exRooms = sorted.slice(0, 3);
    exRooms.forEach((room, i) => {
      // 把中心 3x3 铺成传送门
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = room.cx + dx, ty = room.cy + dy;
          if (tx > 0 && ty > 0 && tx < W - 1 && ty < H - 1) tiles[idx(tx, ty)] = T.PLANKS; // 保证可站
        }
      }
      world.extracts.push({
        x: room.cx * TILE + TILE / 2,
        y: room.cy * TILE + TILE / 2,
        r: 54, name: ['北侧传送门', '东侧传送门', '深处传送门'][i] || '传送门',
        tier: room.tier,
      });
    });

    // ---- 9. 出生点 ----
    world.spawn = { x: spawnRoom.cx * TILE + TILE / 2, y: spawnRoom.cy * TILE + TILE / 2 };

    // ---- 10. 敌人出生计划 ----
    const plan = [];
    const mobPool = map.mobs;
    const pickMob = (tier) => {
      const list = mobPool.filter((m) => (DATA.enemies[m] || {}).tier <= tier + 1);
      return E.pick(list.length ? list : mobPool);
    };
    rooms.forEach((room) => {
      if (room === spawnRoom) return;
      if (room === exRooms[0] && Math.random() < 0.5) return;
      const count = room.tier + (Math.random() < 0.4 ? 1 : 0) + (map.danger - 1);
      for (let k = 0; k < count; k++) {
        plan.push({
          type: pickMob(room.tier),
          x: (room.x + E.rand(1.5, room.w - 1.5)) * TILE,
          y: (room.y + E.rand(1.5, room.h - 1.5)) * TILE,
          tier: room.tier,
        });
      }
    });
    if (map.boss && sorted[0]) {
      const r = sorted[0];
      world.boss = { type: map.boss, x: r.cx * TILE, y: r.cy * TILE };
      plan.push({ type: map.boss, x: r.cx * TILE, y: r.cy * TILE, tier: 4, boss: true });
    }
    // 走廊里散布几只
    for (let i = 0; i < 6; i++) {
      const room = E.pick(rooms);
      if (room === spawnRoom) continue;
      plan.push({
        type: pickMob(room.tier),
        x: (room.x + E.rand(1.5, room.w - 1.5)) * TILE,
        y: (room.y + E.rand(1.5, room.h - 1.5)) * TILE,
        tier: room.tier,
      });
    }
    world.spawnPlan = plan;

    // ---- 11. 初始视野 ----
    Wd.reveal(world, world.spawn.x, world.spawn.y, 16);
    return world;
  };

  Wd.reveal = function (world, px, py, radiusTiles) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    const r = radiusTiles;
    const r2 = r * r;
    for (let y = ty - r; y <= ty + r; y++) {
      if (y < 0 || y >= world.h) continue;
      for (let x = tx - r; x <= tx + r; x++) {
        if (x < 0 || x >= world.w) continue;
        const dx = x - tx, dy = y - ty;
        if (dx * dx + dy * dy > r2) continue;
        world.seen[y * world.w + x] = 1;
      }
    }
  };

  Wd.tileAt = function (world, px, py) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return T.VOID;
    return world.tiles[ty * world.w + tx];
  };

  Wd.solidAt = function (world, px, py) {
    return SOLID.has(Wd.tileAt(world, px, py));
  };

  Wd.circleBlocked = function (world, x, y, r) {
    return (
      Wd.solidAt(world, x - r, y - r) || Wd.solidAt(world, x + r, y - r) ||
      Wd.solidAt(world, x - r, y + r) || Wd.solidAt(world, x + r, y + r) ||
      Wd.solidAt(world, x, y)
    );
  };

  // 轴分离移动：先 X 再 Y，被墙挡住就只取消该轴
  Wd.moveEnt = function (world, ent, dx, dy) {
    if (dx) {
      const nx = ent.x + dx;
      if (!Wd.circleBlocked(world, nx, ent.y, ent.r)) ent.x = nx;
      else {
        // 试着贴墙滑动
        const step = Math.sign(dx) * Math.max(1, Math.abs(dx) * 0.25);
        let moved = 0;
        while (Math.abs(moved) < Math.abs(dx) && !Wd.circleBlocked(world, ent.x + step, ent.y, ent.r)) {
          ent.x += step; moved += step;
        }
      }
    }
    if (dy) {
      const ny = ent.y + dy;
      if (!Wd.circleBlocked(world, ent.x, ny, ent.r)) ent.y = ny;
      else {
        const step = Math.sign(dy) * Math.max(1, Math.abs(dy) * 0.25);
        let moved = 0;
        while (Math.abs(moved) < Math.abs(dy) && !Wd.circleBlocked(world, ent.x, ent.y + step, ent.r)) {
          ent.y += step; moved += step;
        }
      }
    }
  };

  Wd.texName = function (world, t) {
    if (t === T.WALL) return world.wallTex;
    return TEX_OF[t] || 'stone';
  };

  // 射线：用于箭矢/瞬移落点检测
  Wd.raySolid = function (world, x, y) {
    return Wd.solidAt(world, x, y);
  };

  Wd.freeSpot = function (world, cx, cy, radius, tries) {
    for (let i = 0; i < (tries || 30); i++) {
      const x = cx + E.rand(-radius, radius);
      const y = cy + E.rand(-radius, radius);
      if (!Wd.circleBlocked(world, x, y, 12)) return { x, y };
    }
    return { x: cx, y: cy };
  };
})();
