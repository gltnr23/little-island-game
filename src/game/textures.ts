import Phaser from 'phaser';
import { HILL_HEIGHT, TILE_DEPTH, TILE_H, TILE_W } from './iso';

/**
 * All art is drawn procedurally at boot, so the first version needs no external assets.
 */
export function createTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  const block = (key: string, top: number, left: number, right: number, sideDepth: number, accent?: number) => {
    g.clear();
    const W = TILE_W;
    const H = TILE_H;
    // left face
    g.fillStyle(left);
    g.fillPoints([p(0, H / 2), p(W / 2, H), p(W / 2, H + sideDepth), p(0, H / 2 + sideDepth)], true);
    // right face
    g.fillStyle(right);
    g.fillPoints([p(W / 2, H), p(W, H / 2), p(W, H / 2 + sideDepth), p(W / 2, H + sideDepth)], true);
    // top
    g.fillStyle(top);
    g.fillPoints([p(W / 2, 0), p(W, H / 2), p(W / 2, H), p(0, H / 2)], true);
    if (accent !== undefined) {
      g.fillStyle(accent, 0.55);
      for (const [ax, ay] of [[30, 20], [58, 16], [46, 30], [66, 26], [38, 12]]) g.fillRect(ax, ay, 3, 2);
    }
    // subtle top rim highlight
    g.lineStyle(1, 0xffffff, 0.18);
    g.strokePoints([p(0, H / 2), p(W / 2, 0), p(W, H / 2)], false);
    g.generateTexture(key, W, H + sideDepth);
  };

  block('tile-sand', 0xf3dc9b, 0xd2b06a, 0xb8954f, TILE_DEPTH, 0xc9a866);
  block('tile-grass', 0x7fcf6a, 0x8a6a45, 0x6f5236, TILE_DEPTH, 0x5fae4e);
  block('tile-hill', 0x93db78, 0x7d6b52, 0x62533f, TILE_DEPTH + HILL_HEIGHT, 0x6fbd5a);

  // Foam / shallow water diamond
  g.clear();
  g.fillStyle(0xbfeaf5, 0.55);
  g.fillPoints([p(TILE_W / 2, 0), p(TILE_W, TILE_H / 2), p(TILE_W / 2, TILE_H), p(0, TILE_H / 2)], true);
  g.generateTexture('tile-shallow', TILE_W, TILE_H);

  // Water sparkle
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 2, 10, 2);
  g.fillRect(3, 0, 4, 1);
  g.generateTexture('sparkle', 10, 4);

  // Soft shadow
  g.clear();
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(20, 8, 40, 16);
  g.generateTexture('shadow', 40, 16);

  // Tree
  g.clear();
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(40, 118, 52, 18);
  g.fillStyle(0x7a5232);
  g.fillRect(34, 70, 12, 48);
  g.fillStyle(0x3f9a4f);
  g.fillCircle(40, 52, 30);
  g.fillStyle(0x4fb35c);
  g.fillCircle(30, 42, 22);
  g.fillCircle(52, 46, 20);
  g.fillStyle(0x6ccb6d);
  g.fillCircle(36, 30, 16);
  g.fillStyle(0xffffff, 0.15);
  g.fillCircle(30, 26, 7);
  g.generateTexture('tree', 80, 126);

  // Bush (with berries, and picked-clean variant)
  for (const [key, berries] of [['bush', true], ['bush-empty', false]] as const) {
    g.clear();
    g.fillStyle(0x000000, 0.16);
    g.fillEllipse(28, 38, 44, 12);
    g.fillStyle(0x3f9a4f);
    g.fillCircle(18, 26, 13);
    g.fillCircle(38, 26, 13);
    g.fillStyle(0x58b960);
    g.fillCircle(28, 20, 15);
    if (berries) {
      g.fillStyle(0xe8445f);
      for (const [bx, by] of [[22, 16], [36, 22], [16, 28], [30, 28], [40, 14]]) g.fillCircle(bx, by, 3.2);
    }
    g.generateTexture(key, 56, 44);
  }

  // Rock
  g.clear();
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(26, 34, 46, 12);
  g.fillStyle(0x8c929c);
  g.fillEllipse(26, 24, 44, 26);
  g.fillStyle(0xa9b0ba);
  g.fillEllipse(22, 18, 28, 14);
  g.generateTexture('rock', 52, 40);

  // Shell
  g.clear();
  g.fillStyle(0xffb2a6);
  g.fillTriangle(4, 18, 24, 18, 14, 2);
  g.fillCircle(14, 14, 9);
  g.lineStyle(2, 0xe07f73, 1);
  g.lineBetween(14, 6, 14, 20);
  g.lineBetween(9, 9, 7, 19);
  g.lineBetween(19, 9, 21, 19);
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(11, 10, 2);
  g.generateTexture('shell', 28, 24);

  drawPlayer(g, 'player-front', false);
  drawPlayer(g, 'player-back', true);

  // Joystick
  g.clear();
  g.fillStyle(0xffffff, 0.18);
  g.fillCircle(80, 80, 78);
  g.lineStyle(4, 0xffffff, 0.45);
  g.strokeCircle(80, 80, 76);
  g.generateTexture('joy-base', 160, 160);
  g.clear();
  g.fillStyle(0xffffff, 0.75);
  g.fillCircle(36, 36, 34);
  g.lineStyle(3, 0x2b8fc4, 0.4);
  g.strokeCircle(36, 36, 32);
  g.generateTexture('joy-knob', 72, 72);

  g.destroy();
}

function p(x: number, y: number): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(x, y);
}

function drawPlayer(g: Phaser.GameObjects.Graphics, key: string, back: boolean): void {
  g.clear();
  // legs
  g.fillStyle(0x3b4a6b);
  g.fillRoundedRect(13, 52, 8, 12, 3);
  g.fillRoundedRect(27, 52, 8, 12, 3);
  // body / shirt
  g.fillStyle(0xff7a59);
  g.fillRoundedRect(8, 30, 32, 26, 9);
  g.fillStyle(0xffffff, 0.25);
  g.fillRoundedRect(12, 33, 10, 6, 3);
  // head
  g.fillStyle(0xffd8b5);
  g.fillCircle(24, 20, 15);
  // hair
  g.fillStyle(0x5a3a26);
  if (back) {
    g.fillCircle(24, 18, 15);
  } else {
    g.fillEllipse(24, 9, 30, 12);
    // eyes & blush
    g.fillStyle(0x2b2b2b);
    g.fillCircle(18, 21, 2.2);
    g.fillCircle(30, 21, 2.2);
    g.fillStyle(0xff9a9a, 0.6);
    g.fillCircle(15, 26, 2.5);
    g.fillCircle(33, 26, 2.5);
  }
  // straw hat
  g.fillStyle(0xf2cf63);
  g.fillEllipse(24, 8, 40, 9);
  g.fillStyle(0xe8bd45);
  g.fillEllipse(24, 4, 22, 9);
  g.fillStyle(0xd9534f);
  g.fillRect(14, 5, 20, 3);
  g.generateTexture(key, 48, 66);
}
