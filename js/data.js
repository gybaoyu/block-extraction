/* ============================================================
 * 数据层：物品 / 武器 / 护甲 / 背包 / 敌人 / 地图 / 掉落 / 商店
 * 所有数值集中在这里，调平衡只改这个文件。
 * ============================================================ */
(function () {
  'use strict';
  const MCX = window.MCX = window.MCX || {};

  // 木材质（木剑用）
  MCX.PX.MAT.wood = { base: '#9c7442', light: '#c09a62', dark: '#6b4a26', edge: '#3d2a12' };

  const items = {
    /* ---------- 矿物 / 战利品 ---------- */
    coal:        { name: '煤炭', icon: ['nugget', 'coal'], stack: 32, value: 3, tier: 1, kind: 'mat', desc: '烧火用，撤出去能卖点零钱。' },
    redstone:    { name: '红石', icon: ['dust', 'redstone'], stack: 32, value: 5, tier: 1, kind: 'mat', desc: '矿洞里到处都有，不太值钱。' },
    lapis:       { name: '青金石', icon: ['nugget', 'lapis'], stack: 32, value: 6, tier: 1, kind: 'mat', desc: '蓝汪汪的一小把。' },
    flint:       { name: '燧石', icon: ['nugget', 'flint'], stack: 32, value: 4, tier: 1, kind: 'mat', desc: '打火用的碎石。' },
    iron_ingot:  { name: '铁锭', icon: ['ingot', 'iron'], stack: 16, value: 8, tier: 1, kind: 'mat', desc: '硬通货，哪儿都要。' },
    gold_ingot:  { name: '金锭', icon: ['ingot', 'gold'], stack: 16, value: 15, tier: 2, kind: 'mat', desc: '闪得刺眼。' },
    quartz:      { name: '下界石英', icon: ['nugget', 'quartz'], stack: 32, value: 7, tier: 2, kind: 'mat', desc: '下界特产。' },
    emerald:     { name: '绿宝石', icon: ['gem', 'emerald'], stack: 16, value: 20, tier: 2, kind: 'mat', desc: '村子里的钱，也是你的钱。' },
    diamond:     { name: '钻石', icon: ['gem', 'diamond'], stack: 16, value: 40, tier: 3, kind: 'mat', desc: '这趟值了。' },
    scrap:       { name: '远古残骸', icon: ['scrap'], stack: 8, value: 95, tier: 3, kind: 'mat', desc: '下界最深处的东西，卖一把能吃三天。' },
    bone:        { name: '骨头', icon: ['bone'], stack: 16, value: 4, tier: 1, kind: 'mat', desc: '骷髅掉的。' },
    string:      { name: '线', icon: ['string'], stack: 16, value: 4, tier: 1, kind: 'mat', desc: '蜘蛛掉的。' },
    gunpowder:   { name: '火药', icon: ['gunpowder'], stack: 16, value: 5, tier: 1, kind: 'mat', desc: '苦力怕的味道。' },
    flesh:       { name: '腐肉', icon: ['flesh'], stack: 16, value: 3, tier: 1, kind: 'mat', desc: '别吃。' },
    spider_eye:  { name: '蜘蛛眼', icon: ['spider_eye'], stack: 16, value: 7, tier: 2, kind: 'mat', desc: '有点恶心，但值钱。' },

    /* ---------- 武器 ---------- */
    wood_sword:     { name: '木剑', icon: ['sword', 'wood'], stack: 1, value: 12, kind: 'weapon', wkind: 'melee', dmg: 4, cd: 0.40, range: 64, desc: '基地发的新手剑，别拿它打末影人。' },
    iron_sword:     { name: '铁剑', icon: ['sword', 'iron'], stack: 1, value: 70, kind: 'weapon', wkind: 'melee', dmg: 6, cd: 0.42, range: 68, desc: '趁手。' },
    diamond_sword:  { name: '钻石剑', icon: ['sword', 'diamond'], stack: 1, value: 220, kind: 'weapon', wkind: 'melee', dmg: 10, cd: 0.38, range: 72, desc: '切开僵尸像切豆腐。' },
    netherite_sword:{ name: '下界合金剑', icon: ['sword', 'netherite'], stack: 1, value: 520, kind: 'weapon', wkind: 'melee', dmg: 14, cd: 0.34, range: 78, desc: '下界要塞特产，挥起来带风。' },
    iron_pickaxe:   { name: '铁镐', icon: ['pickaxe', 'iron'], stack: 1, value: 50, kind: 'weapon', wkind: 'melee', dmg: 4, cd: 0.50, range: 58, mine: 1, desc: '能挖铁矿、金矿，打人一般。' },
    diamond_pickaxe:{ name: '钻石镐', icon: ['pickaxe', 'diamond'], stack: 1, value: 160, kind: 'weapon', wkind: 'melee', dmg: 6, cd: 0.45, range: 58, mine: 2, desc: '能挖钻石矿和远古残骸。' },
    bow:            { name: '弓', icon: ['bow'], stack: 1, value: 130, kind: 'weapon', wkind: 'bow', dmg: 8, cd: 0.75, projSpeed: 440, desc: '远程风筝，箭自带。' },
    crossbow:       { name: '弩', icon: ['crossbow'], stack: 1, value: 260, kind: 'weapon', wkind: 'bow', dmg: 16, cd: 1.10, projSpeed: 580, desc: '一箭一只蜘蛛。' },

    /* ---------- 护甲 / 背包 ---------- */
    chest_leather:  { name: '皮革胸甲', icon: ['chestplate_leather'], stack: 1, value: 60, kind: 'armor', dr: 0.15, desc: '减伤 15%。' },
    chest_iron:     { name: '铁胸甲', icon: ['chestplate_iron'], stack: 1, value: 170, kind: 'armor', dr: 0.30, desc: '减伤 30%。' },
    chest_diamond:  { name: '钻石胸甲', icon: ['chestplate_diamond'], stack: 1, value: 460, kind: 'armor', dr: 0.45, desc: '减伤 45%。' },
    bag_leather:    { name: '皮革背包', icon: ['bag_leather'], stack: 1, value: 60, kind: 'bag', slots: 6, desc: '背包 +6 格。' },
    bag_big:        { name: '大背包', icon: ['bag_big'], stack: 1, value: 150, kind: 'bag', slots: 10, desc: '背包 +10 格。' },
    bag_shulker:    { name: '潜影箱', icon: ['bag_shulker'], stack: 1, value: 380, kind: 'bag', slots: 16, desc: '背包 +16 格，够肥。' },

    /* ---------- 消耗品 ---------- */
    apple:          { name: '苹果', icon: ['apple'], stack: 8, value: 10, kind: 'use', heal: 5, desc: '回 5 点生命。' },
    bread:          { name: '面包', icon: ['bread'], stack: 8, value: 7, kind: 'use', heal: 3, desc: '回 3 点生命。' },
    golden_apple:   { name: '金苹果', icon: ['golden_apple'], stack: 4, value: 45, kind: 'use', heal: 20, shield: 3, desc: '回满血 + 3 秒无敌。' },
    potion_heal:    { name: '治疗药水', icon: ['potion_heal'], stack: 4, value: 30, kind: 'use', heal: 12, desc: '回 12 点生命。' },
    potion_speed:   { name: '迅捷药水', icon: ['potion_speed'], stack: 4, value: 35, kind: 'use', buff: 'speed', desc: '8 秒移速 +50%。' },
    potion_str:     { name: '力量药水', icon: ['potion_str'], stack: 4, value: 40, kind: 'use', buff: 'str', desc: '10 秒伤害 +60%。' },
    tnt:            { name: 'TNT', icon: ['tnt'], stack: 4, value: 40, kind: 'use', throwTnt: true, desc: '丢出去，3 秒后炸一片。' },
    pearl:          { name: '末影珍珠', icon: ['pearl'], stack: 4, value: 45, kind: 'use', teleport: 190, desc: '朝鼠标方向瞬移。' },
  };

  /* ---------- 敌人 ---------- */
  const enemies = {
    zombie:   { name: '僵尸', hp: 16, dmg: 3, speed: 84, r: 13, sprite: 'zombie', ai: 'chase', cd: 1.4, drops: [['flesh', 0.5, 1, 2], ['iron_ingot', 0.12, 1, 1]], tier: 1 },
    spider:   { name: '蜘蛛', hp: 10, dmg: 3, speed: 134, r: 12, sprite: 'spider', ai: 'chase', cd: 1.25, leap: 2.4, drops: [['string', 0.6, 1, 2], ['spider_eye', 0.15, 1, 1]], tier: 1 },
    slime:    { name: '史莱姆', hp: 12, dmg: 3, speed: 60, r: 14, sprite: 'slime', ai: 'chase', cd: 1.45, split: true, drops: [['slime_ball', 0.0, 1, 1]], tier: 1 },
    skeleton: { name: '骷髅', hp: 14, dmg: 4, speed: 70, r: 12, sprite: 'skeleton', ai: 'shooter', cd: 2.5, keep: 190, drops: [['bone', 0.7, 1, 2], ['arrow_item', 0.0, 1, 1]], tier: 2 },
    creeper:  { name: '苦力怕', hp: 14, dmg: 11, speed: 90, r: 13, sprite: 'creeper', ai: 'bomber', cd: 99, fuse: 1.7, drops: [['gunpowder', 0.8, 1, 3]], tier: 2 },
    enderman: { name: '末影人', hp: 26, dmg: 7, speed: 116, r: 13, sprite: 'enderman', ai: 'blink', cd: 1.5, blinkCd: 3.2, drops: [['pearl', 0.45, 1, 1], ['diamond', 0.12, 1, 1]], tier: 3 },
    blaze:    { name: '烈焰人', hp: 20, dmg: 5, speed: 64, r: 13, sprite: 'blaze', ai: 'shooter', cd: 2.3, keep: 200, drops: [['quartz', 0.5, 1, 2], ['gold_ingot', 0.2, 1, 1]], tier: 3 },
    wither:   { name: '凋灵', hp: 220, dmg: 9, speed: 82, r: 24, sprite: 'wither', ai: 'boss', cd: 1.5, boss: true, drops: [['scrap', 1, 2, 3], ['diamond', 1, 2, 4]], tier: 4 },
  };

  /* ---------- 敌人掉落表（补充 % 掉率用） ---------- */
  // 上面 drops 里出现的占位物品，这里给真正的值
  items.slime_ball = { name: '粘液球', icon: ['nugget', 'emerald'], stack: 16, value: 6, tier: 1, kind: 'mat', desc: '史莱姆的黏糊糊的东西。' };
  items.arrow_item = { name: '箭', icon: ['arrow'], stack: 16, value: 3, tier: 1, kind: 'mat', desc: '一捆箭。' };

  /* ---------- 容器掉落表 ---------- */
  const lootTables = {
    1: [
      { id: 'coal', w: 16, q: [1, 4] },
      { id: 'redstone', w: 12, q: [1, 4] },
      { id: 'lapis', w: 9, q: [1, 3] },
      { id: 'flint', w: 9, q: [1, 3] },
      { id: 'iron_ingot', w: 12, q: [1, 3] },
      { id: 'bone', w: 8, q: [1, 3] },
      { id: 'string', w: 8, q: [1, 3] },
      { id: 'flesh', w: 8, q: [1, 2] },
      { id: 'apple', w: 7, q: [1, 2] },
      { id: 'bread', w: 7, q: [1, 2] },
      { id: 'wood_sword', w: 3, q: [1, 1] },
      { id: 'gold_ingot', w: 4, q: [1, 2] },
    ],
    2: [
      { id: 'iron_ingot', w: 14, q: [1, 3] },
      { id: 'gold_ingot', w: 12, q: [1, 3] },
      { id: 'quartz', w: 10, q: [1, 4] },
      { id: 'emerald', w: 9, q: [1, 2] },
      { id: 'diamond', w: 6, q: [1, 1] },
      { id: 'spider_eye', w: 8, q: [1, 2] },
      { id: 'iron_sword', w: 4, q: [1, 1] },
      { id: 'bow', w: 3, q: [1, 1] },
      { id: 'iron_pickaxe', w: 4, q: [1, 1] },
      { id: 'chest_leather', w: 4, q: [1, 1] },
      { id: 'potion_heal', w: 6, q: [1, 1] },
      { id: 'potion_speed', w: 5, q: [1, 1] },
      { id: 'apple', w: 6, q: [1, 2] },
      { id: 'tnt', w: 3, q: [1, 1] },
    ],
    3: [
      { id: 'diamond', w: 14, q: [1, 3] },
      { id: 'emerald', w: 10, q: [1, 3] },
      { id: 'gold_ingot', w: 9, q: [2, 4] },
      { id: 'scrap', w: 4, q: [1, 1] },
      { id: 'diamond_sword', w: 4, q: [1, 1] },
      { id: 'crossbow', w: 3, q: [1, 1] },
      { id: 'diamond_pickaxe', w: 4, q: [1, 1] },
      { id: 'chest_iron', w: 5, q: [1, 1] },
      { id: 'chest_diamond', w: 3, q: [1, 1] },
      { id: 'bag_big', w: 3, q: [1, 1] },
      { id: 'golden_apple', w: 5, q: [1, 1] },
      { id: 'potion_str', w: 5, q: [1, 1] },
      { id: 'pearl', w: 5, q: [1, 1] },
      { id: 'netherite_sword', w: 1, q: [1, 1] },
      { id: 'bag_shulker', w: 1, q: [1, 1] },
    ],
  };

  /* ---------- 矿点 ---------- */
  const ores = {
    coal:     { name: '煤矿', tex: 'ore_coal', mine: 1, time: 0.9, drops: [['coal', 1, 2, 4]], tier: 1 },
    iron:     { name: '铁矿', tex: 'ore_iron', mine: 1, time: 1.1, drops: [['iron_ingot', 1, 1, 2]], tier: 1 },
    gold:     { name: '金矿', tex: 'ore_gold', mine: 1, time: 1.3, drops: [['gold_ingot', 1, 1, 2]], tier: 2 },
    lapis:    { name: '青金石矿', tex: 'ore_lapis', mine: 1, time: 1.1, drops: [['lapis', 1, 2, 4]], tier: 2 },
    redstone: { name: '红石矿', tex: 'ore_redstone', mine: 1, time: 1.0, drops: [['redstone', 1, 2, 5]], tier: 1 },
    quartz:   { name: '石英矿', tex: 'ore_quartz', mine: 1, time: 1.1, drops: [['quartz', 1, 2, 4]], tier: 2 },
    diamond:  { name: '钻石矿', tex: 'ore_diamond', mine: 2, time: 1.6, drops: [['diamond', 1, 1, 2]], tier: 3 },
    emerald:  { name: '绿宝石矿', tex: 'ore_emerald', mine: 2, time: 1.5, drops: [['emerald', 1, 1, 2]], tier: 3 },
    scrap:    { name: '远古残骸', tex: 'ore_netherite', mine: 2, time: 2.0, drops: [['scrap', 1, 1, 1]], tier: 3 },
  };

  /* ---------- 地图 ---------- */
  const maps = [
    {
      id: 'oak', name: '橡木平原 · 废弃矿井', theme: 'oak', danger: 1,
      time: 420, rooms: 16, desc: '草地和木板矿道，怪物稀疏，钻石也少。适合练手。',
      floors: ['grass', 'grass', 'planks', 'stone', 'mossy'], wall: 'wall_stone',
      mobs: ['zombie', 'zombie', 'spider', 'slime', 'skeleton'], orePool: ['coal', 'iron', 'iron', 'lapis', 'gold', 'redstone'],
      lootBias: 0,
    },
    {
      id: 'deep', name: '深板岩矿洞', theme: 'deep', danger: 2,
      time: 480, rooms: 20, desc: '石头与深板岩，苦力怕很多，钻石产地。',
      floors: ['stone', 'stone', 'cobble', 'gravel', 'mossy'], wall: 'wall_deepslate',
      mobs: ['zombie', 'skeleton', 'creeper', 'spider', 'creeper'], orePool: ['iron', 'gold', 'gold', 'redstone', 'diamond', 'diamond', 'emerald'],
      lootBias: 1,
    },
    {
      id: 'nether', name: '下界要塞 · 熔岩回廊', theme: 'nether', danger: 3,
      time: 540, rooms: 22, desc: '下界岩与要塞走廊，烈焰人和末影人巡场，深处有凋灵守着远古残骸。',
      floors: ['netherrack', 'netherrack', 'deepslate', 'stone', 'gravel'], wall: 'wall_deepslate',
      mobs: ['blaze', 'skeleton', 'creeper', 'enderman', 'zombie'], orePool: ['quartz', 'gold', 'gold', 'diamond', 'scrap', 'emerald'],
      lootBias: 2, boss: 'wither',
    },
  ];

  /* ---------- 商店 ---------- */
  const shop = [
    { id: 'iron_sword', price: 120 },
    { id: 'diamond_sword', price: 380 },
    { id: 'netherite_sword', price: 900 },
    { id: 'bow', price: 200 },
    { id: 'crossbow', price: 420 },
    { id: 'iron_pickaxe', price: 80 },
    { id: 'diamond_pickaxe', price: 240 },
    { id: 'chest_leather', price: 90 },
    { id: 'chest_iron', price: 260 },
    { id: 'chest_diamond', price: 720 },
    { id: 'bag_leather', price: 80 },
    { id: 'bag_big', price: 200 },
    { id: 'bag_shulker', price: 520 },
    { id: 'apple', price: 18 },
    { id: 'golden_apple', price: 90 },
    { id: 'potion_heal', price: 65 },
    { id: 'potion_speed', price: 70 },
    { id: 'potion_str', price: 80 },
    { id: 'tnt', price: 75 },
    { id: 'pearl', price: 70 },
  ];

  /* ---------- 升级 ---------- */
  const upgrades = {
    hp:    { name: '生命上限', desc: '每级 +4 点生命上限', max: 5, base: 150, mult: 1.75, icon: ['golden_apple'] },
    slots: { name: '背包扩容', desc: '每级 +2 格背包', max: 3, base: 180, mult: 1.8, icon: ['bag_big'] },
    speed: { name: '轻功', desc: '每级移速 +6%', max: 4, base: 120, mult: 1.7, icon: ['potion_speed'] },
  };

  /* ---------- 任务 ---------- */
  const quests = [
    { id: 'q_diamond', name: '钻石矿工', desc: '带出 5 颗钻石', need: 5, item: 'diamond', reward: 180, repeat: true },
    { id: 'q_kill', name: '清道夫', desc: '击杀 15 只怪物', need: 15, stat: 'kills', reward: 150, repeat: true },
    { id: 'q_extract', name: '老手', desc: '成功撤离 3 次', need: 3, stat: 'extracts', reward: 220, repeat: true },
  ];

  /* ---------- 配置 ---------- */
  const cfg = {
    baseHp: 20,
    baseSpeed: 208,
    baseSlots: 6,
    extractHold: 5.0,
    extractRadius: 52,
    dashCd: 1.1,
    dashTime: 0.16,
    dashSpeed: 620,
    invulnAfterHit: 0.55,
    pickupRadius: 42,
    containerTime: 0.5,
    questSlots: 3,
  };

  MCX.DATA = { items, enemies, lootTables, ores, maps, shop, upgrades, quests, cfg };
})();
