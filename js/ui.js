/* ============================================================
 * UI 层：基地 / 仓库 / 商店 / 升级 / 任务 / 地图选择 / 结算 / 局内背包
 * ============================================================ */
(function () {
  'use strict';
  const MCX = window.MCX = window.MCX || {};
  const E = MCX.E;
  const P = MCX.PX;
  const UI = MCX.UI = {};
  let G = null;

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  };
  const iconEl = (id, size) => {
    const img = document.createElement('img');
    img.src = P.itemURL(id, 2);
    img.alt = '';
    img.style.width = img.style.height = (size || 32) + 'px';
    img.style.imageRendering = 'pixelated';
    return img;
  };
  const D = () => MCX.DATA;
  const S = () => E.Save.data;

  /* ---------------- 提示条 ---------------- */
  UI.toast = (msg, cls) => {
    const box = $('toasts');
    if (!box) return;
    const t = el('div', 'toast ' + (cls || ''), msg);
    box.appendChild(t);
    setTimeout(() => t.remove(), 2700);
  };

  /* ---------------- 通用 ---------------- */
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  function itemValue(id) { return (D().items[id] || {}).value || 0; }
  function itemName(id) { return (D().items[id] || {}).name || id; }

  function addToStash(id, qty) {
    const st = S().stash;
    const hit = st.find((s) => s.id === id);
    if (hit) hit.qty += qty;
    else st.push({ id, qty });
  }
  UI.addToStash = addToStash;

  function stashCount() { return S().stash.reduce((n, s) => n + s.qty, 0); }

  function takeFromStash(idx, qty) {
    const st = S().stash;
    const s = st[idx];
    if (!s) return null;
    const take = Math.min(qty || 1, s.qty);
    s.qty -= take;
    const out = { id: s.id, qty: take };
    if (s.qty <= 0) st.splice(idx, 1);
    return out;
  }

  function loadoutSlots() {
    const lo = S().loadout;
    const bagSlots = lo.bag ? (D().items[lo.bag].slots || 0) : 0;
    const up = S().up;
    return D().cfg.baseSlots + (up.slots || 0) * 2 + bagSlots;
  }

  function playerStatsPreview() {
    const up = S().up, lo = S().loadout, cfg = D().cfg;
    const maxHp = cfg.baseHp + (up.hp || 0) * 4;
    const speed = cfg.baseSpeed * (1 + (up.speed || 0) * 0.06);
    const dr = lo.armor ? (D().items[lo.armor].dr || 0) : 0;
    return { maxHp, speed, dr, slots: loadoutSlots() };
  }

  /* ---------------- 基地 ---------------- */
  UI.showBase = function () {
    hideAll();
    $('s-base').classList.remove('hidden');
    renderTop();
    renderLoadout();
    renderStash();
    renderShop();
  };
  UI.refreshBase = function () {
    if (!$('s-base').classList.contains('hidden')) {
      renderTop(); renderLoadout(); renderStash(); renderShop();
    }
  };

  function renderTop() {
    $('ui-emerald').textContent = S().emerald;
    const st = S().stats;
    $('ui-stats').textContent = `出击 ${st.raids} · 撤离 ${st.extracts} · 阵亡 ${st.deaths} · 击杀 ${st.kills}`;
    $('btn-mute').textContent = '音效：' + (S().muted ? '关' : '开');
  }

  let selStash = -1;

  function renderLoadout() {
    const box = $('p-loadout');
    clear(box);
    box.appendChild(el('h3', null, '装备 · 带进战场'));
    const lo = S().loadout;

    const rows = [
      { key: 'weapon', label: '主武器', kind: 'weapon', id: lo.weapon },
      { key: 'armor', label: '护甲', kind: 'armor', id: lo.armor },
      { key: 'bag', label: '背包', kind: 'bag', id: lo.bag },
    ];
    for (const r of rows) {
      const row = el('div', 'slot-row');
      const slot = el('div', 'slot');
      if (r.id) slot.appendChild(iconEl(r.id, 36));
      else slot.appendChild(el('span', 'dim', '+'));
      const lab = el('div', 'lab', r.label);
      slot.appendChild(lab);
      slot.onclick = () => openPick(r.kind, (id, idx) => {
        takeFromStash(idx, 1);
        if (r.id) addToStash(r.id, 1);
        lo[r.key] = id;
        E.Save.save();
        MCX.SFX.play('buy');
        UI.refreshBase();
      }, () => {
        if (!r.id) return;
        addToStash(r.id, 1);
        lo[r.key] = null;
        E.Save.save();
        UI.refreshBase();
      });
      const info = el('div', 'slot-info');
      if (r.id) {
        const it = D().items[r.id];
        let line = '';
        if (r.kind === 'weapon') line = `伤害 ${it.dmg} · ${it.wkind === 'bow' ? '远程' : '近战'} · 间隔 ${it.cd}s` + (it.mine ? ` · 可挖 ${it.mine} 级矿` : '');
        if (r.kind === 'armor') line = `减伤 ${Math.round(it.dr * 100)}%`;
        if (r.kind === 'bag') line = `背包 +${it.slots} 格`;
        info.appendChild(el('b', null, it.name));
        info.appendChild(el('span', null, line));
      } else {
        info.appendChild(el('b', 'dim', '空'));
        info.appendChild(el('span', null, '点击选择'));
      }
      row.appendChild(slot);
      row.appendChild(info);
      box.appendChild(row);
    }

    // 快捷栏
    box.appendChild(el('h3', null, '快捷栏 · 局内按 1 / 2 / 3'));
    const qrow = el('div', 'row');
    for (let i = 0; i < 3; i++) {
      const id = lo.items[i];
      const slot = el('div', 'slot');
      if (id) slot.appendChild(iconEl(id, 34));
      else slot.appendChild(el('span', 'dim', String(i + 1)));
      const lab = el('div', 'lab', String(i + 1));
      slot.appendChild(lab);
      slot.onclick = () => {
        if (id) {
          addToStash(id, 1);
          lo.items[i] = null;
          E.Save.save();
          UI.refreshBase();
        } else {
          openPick('use', (nid, idx) => {
            takeFromStash(idx, 1);
            lo.items[i] = nid;
            E.Save.save();
            UI.refreshBase();
          });
        }
      };
      qrow.appendChild(slot);
    }
    box.appendChild(qrow);

    // 属性
    const ps = playerStatsPreview();
    box.appendChild(el('h3', null, '属性'));
    const lines = [
      ['生命上限', ps.maxHp + '（' + Math.round(ps.maxHp / 2) + ' 颗心）'],
      ['移动速度', Math.round(ps.speed) + ' px/s'],
      ['减伤', Math.round(ps.dr * 100) + '%'],
      ['背包格数', ps.slots + ' 格'],
    ];
    for (const [k, v] of lines) {
      const line = el('div', 'stat-line');
      line.appendChild(el('span', null, k));
      line.appendChild(el('b', null, v));
      box.appendChild(line);
    }

    const go = el('button', 'mc green', '选择战场 →');
    go.style.marginTop = '10px';
    go.style.width = '100%';
    go.style.fontSize = '15px';
    go.style.padding = '10px';
    go.onclick = () => { MCX.SFX.play('buy'); UI.showMaps(); };
    box.appendChild(go);
  }

  function renderStash() {
    const box = $('p-stash');
    clear(box);
    const head = el('div', 'row');
    head.appendChild(el('h3', null, `仓库 · ${stashCount()} 件`));
    head.appendChild(el('div', 'spacer'));
    const sellAll = el('button', 'mc gold', '一键出售');
    sellAll.onclick = () => {
      let total = 0, n = 0;
      for (const s of S().stash.slice()) {
        if (isEquipped(s.id)) continue;
        total += itemValue(s.id) * s.qty;
        n += s.qty;
      }
      if (!total) { UI.toast('没有可卖的东西', 'warn'); return; }
      S().stash = S().stash.filter((s) => isEquipped(s.id));
      S().emerald += total;
      S().stats.earned += total;
      E.Save.save();
      MCX.SFX.play('coin');
      UI.toast(`卖出 ${n} 件，+${total} 绿宝石`, 'good');
      selStash = -1;
      UI.refreshBase();
    };
    head.appendChild(sellAll);
    box.appendChild(head);

    const grid = el('div', 'grid-cells');
    if (!S().stash.length) {
      box.appendChild(el('p', 'dim', '仓库空空的。去战场带点东西回来。'));
    }
    S().stash.forEach((s, i) => {
      const cell = el('div', 'cell' + (selStash === i ? ' sel' : ''));
      cell.appendChild(iconEl(s.id, 32));
      if (s.qty > 1) cell.appendChild(el('div', 'qty', String(s.qty)));
      cell.onclick = () => { selStash = selStash === i ? -1 : i; renderStash(); renderStashDetail(); };
      grid.appendChild(cell);
    });
    box.appendChild(grid);
    const detail = el('div');
    detail.id = 'stash-detail';
    box.appendChild(detail);
    renderStashDetail();
  }

  function isEquipped(id) {
    const lo = S().loadout;
    return lo.weapon === id || lo.armor === id || lo.bag === id || (lo.items || []).includes(id);
  }

  function renderStashDetail() {
    const box = $('stash-detail');
    if (!box) return;
    clear(box);
    const s = S().stash[selStash];
    if (!s) return;
    const it = D().items[s.id];
    const card = el('div', 'card');
    card.appendChild(iconEl(s.id, 32));
    const body = el('div', 'body');
    body.appendChild(el('b', null, `${it.name} ×${s.qty}`));
    body.appendChild(el('span', null, it.desc || ''));
    body.appendChild(el('span', null, `单价 ${it.value || 0} 绿宝石`));
    card.appendChild(body);
    box.appendChild(card);

    const act = el('div', 'row');
    if (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'bag') {
      const b = el('button', 'mc green', '装备');
      b.onclick = () => {
        const lo = S().loadout;
        const cur = it.kind === 'weapon' ? lo.weapon : it.kind === 'armor' ? lo.armor : lo.bag;
        const got = takeFromStash(selStash, 1);
        if (!got) return;
        if (cur) addToStash(cur, 1);
        if (it.kind === 'weapon') lo.weapon = got.id;
        else if (it.kind === 'armor') lo.armor = got.id;
        else lo.bag = got.id;
        E.Save.save();
        MCX.SFX.play('buy');
        selStash = -1;
        UI.refreshBase();
      };
      act.appendChild(b);
    }
    if (it.kind === 'use') {
      const b = el('button', 'mc green', '放入快捷栏');
      b.onclick = () => {
        const lo = S().loadout;
        const free = lo.items.findIndex((x) => !x);
        const i = free >= 0 ? free : 0;
        const got = takeFromStash(selStash, 1);
        if (!got) return;
        if (lo.items[i]) addToStash(lo.items[i], 1);
        lo.items[i] = got.id;
        E.Save.save();
        MCX.SFX.play('buy');
        selStash = -1;
        UI.refreshBase();
      };
      act.appendChild(b);
    }
    const sell = el('button', 'mc gold', '出售全部');
    sell.onclick = () => {
      const v = itemValue(s.id) * s.qty;
      S().emerald += v;
      S().stats.earned += v;
      S().stash.splice(selStash, 1);
      selStash = -1;
      E.Save.save();
      MCX.SFX.play('coin');
      UI.toast('+' + v + ' 绿宝石', 'good');
      UI.refreshBase();
    };
    act.appendChild(sell);
    box.appendChild(act);
  }

  let shopTab = 'shop';

  function renderShop() {
    const box = $('p-shop');
    clear(box);
    const tabs = el('div', 'tabs');
    [['shop', '商店'], ['up', '升级'], ['quest', '任务']].forEach(([k, label]) => {
      const b = el('button', 'mc' + (shopTab === k ? ' on' : ''), label);
      b.onclick = () => { shopTab = k; renderShop(); };
      tabs.appendChild(b);
    });
    box.appendChild(tabs);

    if (shopTab === 'shop') {
      for (const s of D().shop) {
        const it = D().items[s.id];
        const card = el('div', 'card');
        card.appendChild(iconEl(s.id, 28));
        const body = el('div', 'body');
        body.appendChild(el('b', null, it.name));
        body.appendChild(el('span', null, it.desc || ''));
        card.appendChild(body);
        const price = el('div', 'price', String(s.price));
        card.appendChild(price);
        const b = el('button', 'mc', '买');
        b.disabled = S().emerald < s.price;
        b.onclick = () => {
          if (S().emerald < s.price) { UI.toast('绿宝石不够', 'bad'); MCX.SFX.play('error'); return; }
          S().emerald -= s.price;
          addToStash(s.id, 1);
          E.Save.save();
          MCX.SFX.play('buy');
          UI.toast('买到 ' + it.name, 'good');
          UI.refreshBase();
        };
        card.appendChild(b);
        box.appendChild(card);
      }
    } else if (shopTab === 'up') {
      for (const key of Object.keys(D().upgrades)) {
        const up = D().upgrades[key];
        const lv = S().up[key] || 0;
        const cost = Math.round(up.base * Math.pow(up.mult, lv));
        const card = el('div', 'card');
        card.appendChild(iconEl(up.icon ? up.icon[0] : 'heart', 28));
        const body = el('div', 'body');
        body.appendChild(el('b', null, `${up.name} Lv.${lv}/${up.max}`));
        body.appendChild(el('span', null, up.desc));
        card.appendChild(body);
        const price = el('div', 'price', lv >= up.max ? 'MAX' : String(cost));
        card.appendChild(price);
        const b = el('button', 'mc', '升级');
        b.disabled = lv >= up.max || S().emerald < cost;
        b.onclick = () => {
          if (S().emerald < cost) { MCX.SFX.play('error'); return; }
          S().emerald -= cost;
          S().up[key] = lv + 1;
          E.Save.save();
          MCX.SFX.play('buy');
          UI.refreshBase();
        };
        card.appendChild(b);
        box.appendChild(card);
      }
    } else {
      for (const q of D().quests) {
        const rec = S().quests[q.id] || { p: 0 };
        const prog = rec.p || 0;
        const done = prog >= q.need;
        const card = el('div', 'card');
        card.appendChild(iconEl(q.id === 'q_diamond' ? 'diamond' : q.id === 'q_kill' ? 'iron_sword' : 'emerald', 28));
        const body = el('div', 'body');
        body.appendChild(el('b', null, q.name));
        body.appendChild(el('span', null, `${q.desc}　进度 ${Math.min(prog, q.need)}/${q.need}`));
        card.appendChild(body);
        const price = el('div', 'price', '+' + q.reward);
        card.appendChild(price);
        const b = el('button', 'mc green', done ? '领取' : '进行中');
        b.disabled = !done;
        b.onclick = () => {
          S().emerald += q.reward;
          S().stats.earned += q.reward;
          rec.p = Math.max(0, prog - q.need);
          S().quests[q.id] = rec;
          E.Save.save();
          MCX.SFX.play('coin');
          UI.toast('任务完成 +' + q.reward, 'good');
          UI.refreshBase();
        };
        card.appendChild(b);
        box.appendChild(card);
      }
      const line = el('p', 'dim', '任务可以重复完成，进度在撤离成功后结算。');
      box.appendChild(line);
    }
  }

  /* ---------------- 选择器 ---------------- */
  function openPick(kind, onPick, onClear) {
    const box = $('pick-box');
    clear(box);
    box.appendChild(el('h2', null, '从仓库选择'));
    const grid = el('div', 'grid-cells');
    let any = false;
    S().stash.forEach((s, i) => {
      const it = D().items[s.id];
      if (!it || it.kind !== kind) return;
      any = true;
      const cell = el('div', 'cell');
      cell.appendChild(iconEl(s.id, 32));
      if (s.qty > 1) cell.appendChild(el('div', 'qty', String(s.qty)));
      cell.title = it.name;
      cell.onclick = () => { closeAll(); onPick(s.id, i); };
      grid.appendChild(cell);
    });
    if (!any) box.appendChild(el('p', 'dim', '仓库里没有这类东西。去商店买点，或者先去战场带回来。'));
    box.appendChild(grid);
    const row = el('div', 'row end');
    if (onClear) {
      const b = el('button', 'mc danger', '卸下');
      b.onclick = () => { closeAll(); onClear(); };
      row.appendChild(b);
    }
    const c = el('button', 'mc', '取消');
    c.onclick = () => closeAll();
    row.appendChild(c);
    box.appendChild(row);
    hideAll();
    $('s-pick').classList.remove('hidden');
  }

  /* ---------------- 地图选择 ---------------- */
  UI.showMaps = function () {
    hideAll();
    $('s-map').classList.remove('hidden');
    const list = $('map-list');
    clear(list);
    const ps = playerStatsPreview();
    for (const m of D().maps) {
      const card = el('div', 'map-card');
      const info = el('div', 'info');
      info.appendChild(el('b', null, m.name));
      info.appendChild(el('span', null, m.desc));
      info.appendChild(el('span', null, `时长 ${Math.floor(m.time / 60)} 分 · 房间 ${m.rooms} · 掉落层级 ${m.danger}`));
      card.appendChild(info);
      const danger = el('div', 'danger', '★'.repeat(m.danger) + '☆'.repeat(3 - m.danger));
      card.appendChild(danger);
      const go = el('button', 'mc green', '进入');
      go.onclick = (ev) => {
        ev.stopPropagation();
        MCX.SFX.play('buy');
        hideAll();
        G.startRaid(m.id);
      };
      card.appendChild(go);
      card.onclick = () => { hideAll(); G.startRaid(m.id); };
      list.appendChild(card);
    }
    const summary = el('p', 'dim', `当前：生命 ${ps.maxHp} · 速度 ${Math.round(ps.speed)} · 减伤 ${Math.round(ps.dr * 100)}% · 背包 ${ps.slots} 格`);
    list.appendChild(summary);
  };

  /* ---------------- 结算 ---------------- */
  UI.showResult = function (res) {
    hideAll();
    const box = $('result-box');
    clear(box);
    const ok = res.type === 'extract';
    box.appendChild(el('h2', null, ok ? '撤离成功' : res.type === 'timeout' ? '倒计时结束' : '你死了'));
    box.appendChild(el('p', 'dim', ok ? '带着战利品回到了基地。' : res.type === 'timeout' ? '没赶上撤离，装备和战利品都留在了里面。' : '身上的东西留在了那里。'));

    if (ok) {
      const line = el('div', 'row');
      const v = el('div');
      v.innerHTML = `<div class="dim">本局战利品价值</div><div class="big-num gold">${res.value}</div>`;
      line.appendChild(v);
      box.appendChild(line);
      const list = el('div', 'loot-list');
      for (const s of res.loot) {
        const d = el('div', 'loot-item');
        d.appendChild(iconEl(s.id, 20));
        d.appendChild(el('span', null, itemName(s.id) + (s.qty > 1 ? ' ×' + s.qty : '')));
        d.appendChild(el('span', 'v', String(itemValue(s.id) * s.qty)));
        list.appendChild(d);
      }
      if (!res.loot.length) list.appendChild(el('p', 'dim', '背包是空的……下次多搜点。'));
      box.appendChild(list);
    } else {
      const list = el('div', 'loot-list');
      for (const s of res.lost) {
        const d = el('div', 'loot-item');
        d.appendChild(iconEl(s.id, 20));
        d.appendChild(el('span', null, itemName(s.id) + (s.qty > 1 ? ' ×' + s.qty : '')));
        list.appendChild(d);
      }
      if (!res.lost.length) list.appendChild(el('p', 'dim', '还好，身上没什么值钱的。'));
      box.appendChild(list);
      box.appendChild(el('p', 'dim', '装备与快捷栏里的东西一起没了。仓库里的东西是安全的。'));
    }

    const stats = el('p', 'dim', `击杀 ${res.kills} · 用时 ${res.time} · 累计出击 ${S().stats.raids}`);
    box.appendChild(stats);

    const row = el('div', 'row end');
    const b = el('button', 'mc green', '返回基地');
    b.onclick = () => { MCX.SFX.play('buy'); G.toBase(); };
    row.appendChild(b);
    box.appendChild(row);
    $('s-result').classList.remove('hidden');
  };

  /* ---------------- 局内背包 ---------------- */
  UI.openInv = function () {
    const p = G.player;
    if (!p) return;
    hideAll();
    $('s-inv').classList.remove('hidden');
    const box = $('inv-box');
    clear(box);
    box.appendChild(el('h2', null, `背包 ${MCX.Ent.invUsed(p)}/${p.slots}`));
    let sel = -1;
    const grid = el('div', 'grid-cells');
    const refresh = () => UI.openInv();
    for (let i = 0; i < p.inv.length; i++) {
      const s = p.inv[i];
      const cell = el('div', 'cell' + (s ? '' : ' empty') + (sel === i ? ' sel' : ''));
      if (s) {
        cell.appendChild(iconEl(s.id, 32));
        if (s.qty > 1) cell.appendChild(el('div', 'qty', String(s.qty)));
        cell.title = `${itemName(s.id)} — ${D().items[s.id].desc || ''}`;
        cell.onclick = () => {
          const def = D().items[s.id];
          if (def.kind === 'use') {
            if (MCX.Ent.useItem(G, s.id)) {
              MCX.Ent.removeAt(p, i, 1);
              refresh();
            }
            return;
          }
          if (def.kind === 'weapon' || def.kind === 'armor' || def.kind === 'bag') {
            const msg = MCX.Ent.equipFromInv(G, i);
            if (msg) {
              UI.toast(msg, 'good');
              MCX.SFX.play('buy');
            } else if (msg === null) {
              UI.toast('换不了', 'warn');
            } else {
              UI.toast(msg, 'bad');
            }
            refresh();
            return;
          }
          sel = i;
          refresh();
        };
      }
      grid.appendChild(cell);
    }
    box.appendChild(grid);
    // 选中物的操作
    if (sel >= 0 && p.inv[sel]) {
      const s = p.inv[sel];
      const row = el('div', 'row');
      row.appendChild(el('span', 'dim', `${itemName(s.id)} ×${s.qty}　价值 ${itemValue(s.id) * s.qty}`));
      const drop = el('button', 'mc danger', '丢弃');
      drop.onclick = () => {
        MCX.Ent.dropItem(G, sel);
        MCX.SFX.play('error');
        refresh();
      };
      row.appendChild(drop);
      box.appendChild(row);
    }
    box.appendChild(el('div', 'dim', '点武器/护甲/背包 = 换上（原来那件进背包）· 点消耗品 = 使用 · 点矿物 = 选中后可丢弃'));
    const row = el('div', 'row end');
    const info = el('span', 'dim', `盾：${Math.round(MCX.Ent.playerDr(p) * 100)}% 减伤　武器：${p.weapon.name}`);
    row.appendChild(info);
    const b = el('button', 'mc green', '继续（Tab）');
    b.onclick = () => UI.closeInv();
    row.appendChild(b);
    box.appendChild(row);
  };

  UI.closeInv = function () {
    $('s-inv').classList.add('hidden');
    G.paused = false;
  };

  /* ---------------- 帮助 ---------------- */
  UI.showHelp = function () {
    hideAll();
    $('s-help').classList.remove('hidden');
    const box = $('help-box');
    clear(box);
    box.appendChild(el('h2', null, '怎么玩'));
    const g = el('div', 'help-grid');
    const blocks = [
      ['目标', '进图 → 搜箱子 / 挖矿 → 打怪 → 在倒计时结束前站进紫色传送门撤离。撤离读条 5 秒，受伤会中断。'],
      ['操作', '<kbd>WASD</kbd> 移动　<kbd>鼠标</kbd> 瞄准　<kbd>左键</kbd> 攻击<br><kbd>E</kbd> 开箱 / 挖矿　<kbd>空格</kbd> 冲刺（无敌）<br><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 快捷道具　<kbd>F</kbd> 快速用药<br><kbd>Tab</kbd> 背包　<kbd>Esc</kbd> 暂停'],
      ['死亡', '阵亡 = 身上的武器、护甲、背包、快捷道具和这局捡的东西全丢。仓库里的东西不会丢。'],
      ['镐子', '钻石矿和远古残骸必须带钻石镐才能挖。带镐子就意味着少一把好武器，自己权衡。'],
      ['手机', '左半屏拖动 = 摇杆，右下 A = 攻击，E = 交互，D = 冲刺。'],
    ];
    for (const [t, c] of blocks) {
      const d = el('div');
      d.appendChild(el('b', null, t));
      const p = el('div');
      p.innerHTML = c;
      d.appendChild(p);
      g.appendChild(d);
    }
    box.appendChild(g);
    const row = el('div', 'row end');
    const b = el('button', 'mc green', '知道了');
    b.onclick = () => UI.showBase();
    row.appendChild(b);
    box.appendChild(row);
  };

  /* ---------------- 暂停 ---------------- */
  UI.showPause = function () {
    hideAll();
    $('s-result').classList.remove('hidden');
    const box = $('result-box');
    clear(box);
    box.appendChild(el('h2', null, '暂停'));
    box.appendChild(el('p', 'dim', '单机游戏，随时可以停。'));
    const row = el('div', 'row');
    const b1 = el('button', 'mc green', '继续');
    b1.onclick = () => { $('s-result').classList.add('hidden'); G.paused = false; };
    const b2 = el('button', 'mc danger', '放弃撤离（等于阵亡）');
    b2.onclick = () => { G.giveUp(); };
    row.appendChild(b1); row.appendChild(b2);
    box.appendChild(row);
  };

  function hideAll() {
    ['s-base', 's-map', 's-result', 's-inv', 's-pick', 's-help'].forEach((id) => {
      const n = $(id);
      if (n) n.classList.add('hidden');
    });
  }
  UI.hideAll = hideAll;

  UI.init = function (game) {
    G = game;
    document.querySelectorAll('[data-ico]').forEach((img) => {
      img.src = P.url([img.dataset.ico], 2);
    });
    $('btn-help').onclick = () => UI.showHelp();
    $('btn-mute').onclick = () => {
      S().muted = !S().muted;
      MCX.SFX.muted = S().muted;
      E.Save.save();
      renderTop();
    };
    $('btn-reset').onclick = () => {
      if (!window.confirm('清空存档？仓库、绿宝石、升级全部重置。')) return;
      E.Save.reset();
      MCX.SFX.muted = false;
      UI.toast('存档已清空', 'warn');
      UI.refreshBase();
    };
    $('btn-map-back').onclick = () => UI.showBase();
    MCX.SFX.muted = !!S().muted;
    UI.showBase();
  };

  // 供 game.js 调用
  UI.renderTop = renderTop;
  UI.isInvOpen = () => !$('s-inv').classList.contains('hidden');
})();
