import Phaser from 'phaser';
import { TILE_H, TILE_W } from './iso';

/**
 * Textures for gathering, restoration sites, lighting and HUD icons.
 * Like the base textures, everything is drawn in code at boot.
 */
export function createWorldTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const P = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

  // ---------- inventory items ----------
  g.clear();
  g.fillStyle(0x8a5a33);
  g.fillRoundedRect(2, 6, 24, 14, 6);
  g.fillStyle(0xd9a86c);
  g.fillEllipse(25, 13, 9, 14);
  g.lineStyle(1.5, 0x9b6b43);
  g.strokeEllipse(25, 13, 5, 8);
  g.fillStyle(0x6b4425);
  g.fillRect(6, 10, 12, 2);
  g.generateTexture('item-wood', 30, 26);

  g.clear();
  g.fillStyle(0x7c838d);
  g.fillEllipse(14, 14, 26, 18);
  g.fillStyle(0xa9b0ba);
  g.fillEllipse(11, 10, 14, 8);
  g.generateTexture('item-stone', 28, 24);

  g.clear();
  g.fillStyle(0x4fae4e);
  g.fillEllipse(17, 5, 12, 6);
  g.fillStyle(0xe8445f);
  g.fillCircle(9, 15, 7);
  g.fillCircle(19, 17, 7);
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(7, 12, 2);
  g.fillCircle(17, 14, 2);
  g.generateTexture('item-berry', 28, 26);

  // ---------- campfire ----------
  const stones = (cx: number, cy: number, rx: number, ry: number, n: number, jitter = 0) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const jx = jitter ? Math.sin(i * 12.9898) * jitter : 0;
      const jy = jitter ? Math.cos(i * 78.233) * jitter * 0.5 : 0;
      g.fillStyle(i % 2 ? 0x8c929c : 0x9fa6b0);
      g.fillEllipse(cx + Math.cos(a) * rx + jx, cy + Math.sin(a) * ry + jy, 12, 8);
    }
  };
  g.clear();
  g.fillStyle(0x000000, 0.15);
  g.fillEllipse(32, 30, 54, 18);
  g.fillStyle(0x3b3330, 0.8);
  g.fillEllipse(30, 28, 22, 8);
  stones(32, 28, 26, 10, 5, 8);
  g.fillStyle(0x4a3a2c);
  g.fillPoints([P(18, 26), P(40, 20), P(42, 24), P(20, 30)], true);
  g.generateTexture('campfire-broken', 64, 42);

  g.clear();
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(32, 32, 58, 20);
  g.fillStyle(0x2e2623);
  g.fillEllipse(32, 30, 34, 13);
  g.fillStyle(0x7a5232);
  g.fillPoints([P(18, 34), P(44, 22), P(47, 26), P(21, 38)], true);
  g.fillStyle(0x8a6040);
  g.fillPoints([P(18, 24), P(46, 34), P(43, 38), P(16, 28)], true);
  stones(32, 30, 25, 10, 9);
  g.generateTexture('campfire', 64, 44);

  g.clear();
  g.fillStyle(0xff8a2b);
  g.fillCircle(13, 24, 11);
  g.fillTriangle(2, 22, 24, 22, 13, 0);
  g.fillStyle(0xffd34d);
  g.fillCircle(13, 27, 6);
  g.fillTriangle(7, 26, 19, 26, 13, 10);
  g.generateTexture('flame', 26, 36);

  // ---------- hut ----------
  g.clear();
  g.fillStyle(0x000000, 0.16);
  g.fillEllipse(50, 56, 86, 22);
  g.fillStyle(0x8a6040);
  g.fillPoints([P(10, 50), P(52, 34), P(56, 40), P(14, 56)], true);
  g.fillStyle(0x9b7048);
  g.fillPoints([P(30, 58), P(84, 44), P(86, 50), P(32, 64)], true);
  g.fillStyle(0x7a5232);
  g.fillPoints([P(46, 36), P(90, 52), P(88, 56), P(44, 40)], true);
  g.fillRect(70, 8, 7, 44);
  g.fillStyle(0xb84c3b);
  g.fillPoints([P(58, 20), P(80, 26), P(70, 34)], true);
  g.generateTexture('hut-broken', 100, 70);

  g.clear();
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(55, 100, 96, 26);
  // walls
  g.fillStyle(0xd8b07a);
  g.fillPoints([P(17, 81), P(55, 100), P(55, 60), P(17, 41)], true);
  g.fillStyle(0xbf9563);
  g.fillPoints([P(55, 100), P(93, 81), P(93, 41), P(55, 60)], true);
  // window (left wall) — the night light glows on top of it
  g.fillStyle(0x5b4630);
  g.fillPoints([P(26, 62), P(42, 70), P(42, 58), P(26, 50)], true);
  g.fillStyle(0xffe08a);
  g.fillPoints([P(28, 61), P(40, 67), P(40, 59), P(28, 53)], true);
  // door (right wall)
  g.fillStyle(0x7a5232);
  g.fillPoints([P(66, 94), P(80, 87), P(80, 64), P(66, 71)], true);
  g.fillStyle(0xf2cf63);
  g.fillCircle(77, 78, 1.8);
  // roof
  g.fillStyle(0xd9634f);
  g.fillPoints([P(7, 44), P(55, 68), P(55, 2)], true);
  g.fillStyle(0xb84c3b);
  g.fillPoints([P(55, 68), P(103, 44), P(55, 2)], true);
  g.lineStyle(2, 0xffffff, 0.2);
  g.lineBetween(55, 2, 55, 68);
  g.generateTexture('hut', 110, 104);

  // ---------- garden ----------
  const dirt = (key: string, dry: boolean) => {
    g.clear();
    g.fillStyle(dry ? 0xa78058 : 0x8a5a3a);
    g.fillPoints([P(TILE_W / 2, 5), P(TILE_W - 10, TILE_H / 2), P(TILE_W / 2, TILE_H - 5), P(10, TILE_H / 2)], true);
    g.lineStyle(2, dry ? 0x8c6a46 : 0x6b4425, 0.8);
    for (let i = -1; i <= 1; i++) g.lineBetween(TILE_W / 2 - 22 + i * 14, TILE_H / 2 - 8 + i * 7, TILE_W / 2 + 6 + i * 14, TILE_H / 2 + 6 + i * 7);
    if (dry) {
      g.lineStyle(2, 0x7a5a36);
      g.lineBetween(36, 22, 42, 16);
      g.lineBetween(56, 28, 60, 21);
      g.lineBetween(48, 20, 50, 15);
    }
    g.generateTexture(key, TILE_W, TILE_H);
  };
  dirt('garden-dry', true);
  dirt('garden-soil', false);

  g.clear();
  const flowers: [number, number, number][] = [
    [12, 30, 0xff8fa3], [26, 22, 0xffd34d], [40, 30, 0xffffff], [54, 22, 0xc59bff], [64, 32, 0xff8fa3],
    [20, 38, 0xc59bff], [34, 40, 0xff6f61], [48, 38, 0xffd34d], [58, 42, 0xffffff],
  ];
  for (const [x, y] of flowers) {
    g.fillStyle(0x3f9a4f);
    g.fillRect(x - 1, y, 2, 10);
    g.fillEllipse(x + 3, y + 6, 6, 3);
  }
  for (const [x, y, col] of flowers) {
    g.fillStyle(col);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.fillCircle(x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2, 2.6);
    }
    g.fillStyle(0xffb72b);
    g.fillCircle(x, y, 2);
  }
  g.generateTexture('flowers', 76, 52);

  // ---------- dock ----------
  const plankDepth = 7;
  g.clear();
  g.fillStyle(0x7a5232);
  g.fillPoints([P(0, TILE_H / 2), P(TILE_W / 2, TILE_H), P(TILE_W / 2, TILE_H + plankDepth), P(0, TILE_H / 2 + plankDepth)], true);
  g.fillStyle(0x62412a);
  g.fillPoints([P(TILE_W / 2, TILE_H), P(TILE_W, TILE_H / 2), P(TILE_W, TILE_H / 2 + plankDepth), P(TILE_W / 2, TILE_H + plankDepth)], true);
  g.fillStyle(0xb58456);
  g.fillPoints([P(TILE_W / 2, 0), P(TILE_W, TILE_H / 2), P(TILE_W / 2, TILE_H), P(0, TILE_H / 2)], true);
  g.lineStyle(1.5, 0x8a6040, 0.9);
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    // plank seams run across the dock (parallel to the shore)
    g.lineBetween(t * (TILE_W / 2), TILE_H / 2 - t * (TILE_H / 2), TILE_W / 2 + t * (TILE_W / 2), TILE_H - t * (TILE_H / 2));
  }
  g.generateTexture('dock-plank', TILE_W, TILE_H + plankDepth);

  g.clear();
  g.fillStyle(0x5b3d26);
  g.fillRect(0, 0, 8, 34);
  g.fillStyle(0x8a6040);
  g.fillEllipse(4, 1, 8, 4);
  g.generateTexture('dock-post', 8, 34);

  g.clear();
  g.fillStyle(0x8a6040);
  g.fillPoints([P(2, 10), P(40, 2), P(42, 7), P(4, 15)], true);
  g.generateTexture('dock-debris', 44, 18);

  // ---------- UI bits ----------
  g.clear();
  g.fillStyle(0xffffff);
  g.fillTriangle(0, 0, 22, 0, 11, 13);
  g.lineStyle(2, 0xff7a59);
  g.strokeTriangle(1, 1, 21, 1, 11, 12);
  g.generateTexture('marker', 22, 14);

  g.clear();
  g.fillStyle(0x000000, 0.2);
  g.fillCircle(70, 74, 64);
  g.fillStyle(0xff7a59);
  g.fillCircle(70, 70, 64);
  g.fillStyle(0xffffff, 0.18);
  g.fillEllipse(58, 46, 70, 34);
  g.lineStyle(5, 0xffffff, 0.9);
  g.strokeCircle(70, 70, 61);
  g.generateTexture('btn-action', 140, 140);

  g.clear();
  g.fillStyle(0x0b3954, 0.45);
  g.fillCircle(32, 32, 30);
  g.generateTexture('btn-round', 64, 64);

  g.clear();
  g.fillStyle(0xffd34d);
  g.fillCircle(20, 20, 9);
  g.lineStyle(3, 0xffd34d);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    g.lineBetween(20 + Math.cos(a) * 13, 20 + Math.sin(a) * 13, 20 + Math.cos(a) * 18, 20 + Math.sin(a) * 18);
  }
  g.generateTexture('icon-sun', 40, 40);

  // speaker on / off
  for (const on of [true, false]) {
    g.clear();
    g.fillStyle(0xffffff);
    g.fillRect(7, 15, 7, 10);
    g.fillPoints([P(13, 15), P(22, 7), P(22, 33), P(13, 25)], true);
    g.lineStyle(3, 0xffffff);
    if (on) {
      g.beginPath();
      g.arc(23, 20, 6, -0.8, 0.8);
      g.strokePath();
      g.beginPath();
      g.arc(23, 20, 11, -0.8, 0.8);
      g.strokePath();
    } else {
      g.lineBetween(27, 14, 36, 26);
      g.lineBetween(36, 14, 27, 26);
    }
    g.generateTexture(on ? 'icon-sound-on' : 'icon-sound-off', 40, 40);
  }

  // restart arrow
  g.clear();
  g.lineStyle(4, 0xffffff);
  g.beginPath();
  g.arc(20, 21, 11, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(220));
  g.strokePath();
  const ex = 20 + 11 * Math.cos(Phaser.Math.DegToRad(-60));
  const ey = 21 + 11 * Math.sin(Phaser.Math.DegToRad(-60));
  g.fillStyle(0xffffff);
  g.fillTriangle(ex - 7, ey - 5, ex + 6, ey - 6, ex + 1, ey + 6);
  g.generateTexture('icon-reset', 40, 40);

  g.destroy();

  // ---------- canvas textures: soft light and crescent moon ----------
  const glow = scene.textures.createCanvas('glow', 128, 128);
  if (glow) {
    const ctx = glow.getContext();
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    glow.refresh();
  }

  const moon = scene.textures.createCanvas('icon-moon', 40, 40);
  if (moon) {
    const ctx = moon.getContext();
    ctx.fillStyle = '#fff1b5';
    ctx.beginPath();
    ctx.arc(20, 20, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(28, 14, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    moon.refresh();
  }
}
