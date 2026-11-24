/* ============================================================
 * 纸片人骨骼（64×64 皮肤贴图驱动）
 * 头/身/双手/双腿分开取 UV，按朝向旋转肢体，走路摆臂摆腿
 * 素材：assets/tex/skin_player.png（Minecraft Wiki 官方皮肤）
 * ============================================================ */
(function () {
  'use strict';
  const MCX = window.MCX = window.MCX || {};
  const P = MCX.PX;
  const E = MCX.E;
  const Puppet = MCX.Puppet = {};

  // 现代 64×64 皮肤布局（1.8+）：[x, y, w, h]
  const UV = {
    head: [8, 8, 8, 8],
    body: [20, 20, 8, 12],
    armR: [44, 20, 4, 12],
    armL: [36, 52, 4, 12],
    legR: [4, 20, 4, 12],
    legL: [20, 52, 4, 12],
  };

  const SCALE = 1.55;   // 1 皮肤像素 → 1.55 屏幕像素（整体约 50px 高）

  function part(ctx, img, uv, pivotX, pivotY, angle) {
    const [sx, sy, sw, sh] = uv;
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(angle);
    ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, 0, sw, sh);
    ctx.restore();
  }

  // 画玩家纸片人：sBase = 脚底屏幕坐标
  Puppet.drawPlayer = function (ctx, g, p, sBase) {
    const img = P.assets.skins && P.assets.skins.player;
    if (!img) return false;

    const fc = p.faceCos === undefined ? 1 : p.faceCos;
    const fs = p.faceSin === undefined ? 0 : p.faceSin;
    const flip = fc < 0 ? -1 : 1;
    const wScale = 0.82 + 0.18 * Math.abs(fc);
    const dim = Math.max(0, -fs) * 0.22;
    const tilt = -0.10 * fc;

    const phase = (p.walked || 0) / 26;
    const swing = Math.sin(phase);
    const stepping = Math.abs(swing);
    const bob = -stepping * 3.0;
    const legA = swing * 0.55;
    const armA = -swing * 0.45;
    const punch = p.swingT > 0 ? (1 - p.swingT / 0.18) : 0;

    ctx.save();
    ctx.translate(Math.round(sBase.x), Math.round(sBase.y + bob));
    ctx.rotate(tilt);
    ctx.scale(flip * wScale * (1 + punch * 0.12), 1 - punch * 0.08);
    ctx.scale(SCALE, SCALE);

    // 腿（髋部 y=-12）
    part(ctx, img, UV.legR, -2, -12, legA);
    part(ctx, img, UV.legL, 2, -12, -legA);
    // 身体
    part(ctx, img, UV.body, 0, -24, 0);
    // 手臂（肩部 y=-22）
    part(ctx, img, UV.armR, -5, -22, armA);
    part(ctx, img, UV.armL, 5, -22, -armA);
    // 头
    part(ctx, img, UV.head, 0, -32, -tilt * 0.5);

    if (dim > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(0,0,0,' + dim + ')';
      ctx.fillRect(-10, -34, 20, 36);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    return true;
  };
})();
