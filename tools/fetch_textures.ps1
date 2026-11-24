# ============================================================
# 从中文 Minecraft Wiki（zh.minecraft.wiki）抓取游戏用到的官方贴图
# 用法：pwsh -File tools/fetch_textures.ps1
# 产物：assets/tex/item_*.png / tile_*.png / mob_*.png（缺图时游戏会自动回退程序化像素）
# ============================================================
$ErrorActionPreference = 'Stop'
$ua = 'MCXGameAssetFetcher/1.0 (fan game asset fetch)'
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root 'assets\tex'
New-Item -ItemType Directory -Force -Path $dest | Out-Null

# 物品图标（16×16）：游戏物品 id → Wiki 文件名
$items = @{
  coal='ItemSprite_coal.png'; redstone='ItemSprite_redstone.png'; lapis='ItemSprite_lapis-lazuli.png'; flint='ItemSprite_flint.png';
  iron_ingot='ItemSprite_iron-ingot.png'; gold_ingot='ItemSprite_gold-ingot.png'; quartz='ItemSprite_nether-quartz.png';
  emerald='ItemSprite_emerald.png'; diamond='ItemSprite_diamond.png'; scrap='ItemSprite_netherite-scrap.png';
  bone='ItemSprite_bone.png'; string='ItemSprite_string.png'; gunpowder='ItemSprite_gunpowder.png'; flesh='ItemSprite_rotten-flesh.png';
  spider_eye='ItemSprite_spider-eye.png'; arrow_item='ItemSprite_arrow.png'; arrow='ItemSprite_arrow.png';
  slime_ball='ItemSprite_slimeball.png'; wood_sword='ItemSprite_wooden-sword.png'; iron_sword='ItemSprite_iron-sword.png';
  diamond_sword='ItemSprite_diamond-sword.png'; netherite_sword='ItemSprite_netherite-sword.png';
  iron_pickaxe='ItemSprite_iron-pickaxe.png'; diamond_pickaxe='ItemSprite_diamond-pickaxe.png';
  bow='ItemSprite_bow.png'; crossbow='ItemSprite_crossbow.png';
  chest_leather='ItemSprite_leather-chestplate.png'; chest_iron='ItemSprite_iron-chestplate-pre-texture-update.png';
  chest_diamond='ItemSprite_diamond-chestplate.png'; bag_leather='ItemSprite_bundle.png'; bag_big='ItemSprite_bundle-open.png';
  bag_shulker='BlockSprite_shulker-box.png'; apple='ItemSprite_apple.png'; bread='ItemSprite_bread.png';
  golden_apple='ItemSprite_golden-apple.png'; potion_heal='ItemSprite_potion-of-healing.png';
  potion_speed='ItemSprite_potion-of-swiftness.png'; potion_str='ItemSprite_potion-of-strength.png';
  tnt='BlockSprite_tnt.png'; pearl='ItemSprite_ender-pearl.png'; coin='ItemSprite_emerald.png'
}

# 方块贴图（16×16）：游戏里的 tile 名 → Wiki 文件名
$blocks = @{
  grass='BlockSprite_grass-block-top.png'; stone='BlockSprite_stone.png'; planks='BlockSprite_oak-planks.png';
  cobble='BlockSprite_cobble.png'; deepslate='BlockSprite_deepslate.png'; netherrack='BlockSprite_netherrack.png';
  gravel='BlockSprite_gravel.png'; mossy='BlockSprite_moss-block.png'; bedrock='BlockSprite_bedrock.png';
  wall_stone='BlockSprite_stone-bricks.png'; wall_deepslate='BlockSprite_deepslate-bricks.png';
  ore_coal='BlockSprite_coal-ore.png'; ore_iron='BlockSprite_iron-ore.png'; ore_gold='BlockSprite_gold-ore.png';
  ore_lapis='BlockSprite_lapis-lazuli-ore.png'; ore_redstone='BlockSprite_redstone-ore.png';
  ore_quartz='BlockSprite_nether-quartz-ore.png'; ore_diamond='BlockSprite_diamond-ore.png';
  ore_emerald='BlockSprite_emerald-ore.png'; ore_netherite='BlockSprite_ancient-debris.png';
  portal='BlockSprite_nether-portal.png'; furnace='BlockSprite_furnace.png'; crafting='BlockSprite_crafting-table-top.png';
  barrel='BlockSprite_barrel-top.png'; chest='BlockSprite_chest-top.png';
  decor_flower='BlockSprite_poppy.png'; decor_mushroom='BlockSprite_red-mushroom.png'
}

# 实体渲染图（3D 渲染，游戏里缩放到 30~92px）
$mobs = @{
  player='Steve.png'; zombie='Zombie.png'; skeleton='Skeleton.png'; creeper='Creeper.png'; spider='Spider.png';
  slime='Slime.png'; enderman='Enderman.png'; blaze='Blaze.png'; wither='Wither.png'
}

function Fetch([string]$file, [string]$outFile) {
  $url = 'https://zh.minecraft.wiki/wiki/Special:FilePath/' + [uri]::EscapeDataString($file)
  Invoke-WebRequest -Uri $url -Headers @{ 'User-Agent' = $ua } -OutFile $outFile -TimeoutSec 60
  $b = [System.IO.File]::ReadAllBytes($outFile)
  if ($b.Length -lt 60 -or $b[0] -ne 137) { throw "not a png: $file" }
  return $b.Length
}

$ok = 0; $fail = @()
foreach ($k in $items.Keys)  { try { Fetch $items[$k]  (Join-Path $dest "item_$k.png")  | Out-Null; $ok++ } catch { $fail += "item:$k" } }
foreach ($k in $blocks.Keys) { try { Fetch $blocks[$k] (Join-Path $dest "tile_$k.png")  | Out-Null; $ok++ } catch { $fail += "tile:$k" } }
foreach ($k in $mobs.Keys)   { try { Fetch $mobs[$k]   (Join-Path $dest "mob_$k.png")   | Out-Null; $ok++ } catch { $fail += "mob:$k" } }

Write-Host "downloaded=$ok failed=$($fail.Count)"
if ($fail.Count) { Write-Host ("missing: " + ($fail -join ', ')) }
Write-Host "别忘了重新生成 js/assets.js 清单"
