import Phaser from 'phaser';
import { generateIsland, IslandData, Tile } from '../game/island';
import { HILL_HEIGHT, isoToScreen, screenVecToGrid, TILE_DEPTH, TILE_H } from '../game/iso';
import type { UIScene } from './UIScene';

const PLAYER_SPEED = 230; // screen px / second
const PLAYER_RADIUS = 0.22; // grid units

interface Shell {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  taken: boolean;
}

export class GameScene extends Phaser.Scene {
  private island!: IslandData;
  private blocked!: boolean[][];
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Image;
  private pos = new Phaser.Math.Vector2();
  private walkTime = 0;
  private shells: Shell[] = [];
  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
  };

  constructor() {
    super('Game');
  }

  create(): void {
    this.island = generateIsland();
    this.shells = [];
    this.buildBlockedMap();
    this.drawWater();
    this.drawTiles();
    this.drawProps();
    this.drawShells();
    this.createPlayer();
    this.setupCamera();
    this.setupKeyboard();
    this.publishShells();
  }

  // ---------- world building ----------

  private buildBlockedMap(): void {
    const { tiles, props } = this.island;
    this.blocked = tiles.map((row) => row.map((t) => t === Tile.Water || t === Tile.Hill));
    for (const prop of props) if (prop.kind !== 'bush') this.blocked[prop.y][prop.x] = true;
  }

  private drawWater(): void {
    const { size, tiles } = this.island;
    const landAt = (x: number, y: number) => tiles[y]?.[x] !== undefined && tiles[y][x] !== Tile.Water;

    // Shallow foam ring around the shore.
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (tiles[y][x] !== Tile.Water) continue;
        let near = false;
        for (let oy = -1; oy <= 1 && !near; oy++) for (let ox = -1; ox <= 1; ox++) if (landAt(x + ox, y + oy)) near = true;
        if (!near) continue;
        const s = isoToScreen(x + 0.5, y + 0.5);
        const foam = this.add.image(s.x, s.y + TILE_DEPTH * 0.6, 'tile-shallow').setDepth(-20000);
        this.tweens.add({
          targets: foam,
          alpha: { from: 0.55, to: 1 },
          duration: 1400 + ((x * 7 + y * 13) % 5) * 200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      }
    }

    // Twinkling sparkles on the open sea.
    const rng = new Phaser.Math.RandomDataGenerator(['waves']);
    for (let i = 0; i < 70; i++) {
      const gx = rng.realInRange(-6, size + 6);
      const gy = rng.realInRange(-6, size + 6);
      const tx = Math.floor(gx);
      const ty = Math.floor(gy);
      if (landAt(tx, ty)) continue;
      const s = isoToScreen(gx, gy);
      const sparkle = this.add.image(s.x, s.y, 'sparkle').setAlpha(0).setDepth(-25000);
      this.tweens.add({
        targets: sparkle,
        alpha: { from: 0, to: 0.8 },
        x: s.x + 8,
        duration: rng.between(900, 1800),
        delay: rng.between(0, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }

  private drawTiles(): void {
    const { size, tiles } = this.island;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const t = tiles[y][x];
        if (t === Tile.Water) continue;
        const s = isoToScreen(x + 0.5, y + 0.5);
        if (t === Tile.Hill) {
          // Hill blocks sort with characters so they can be walked behind.
          const img = this.add.image(s.x, s.y - HILL_HEIGHT, 'tile-hill');
          img.setOrigin(0.5, TILE_H / 2 / img.height);
          img.setDepth(s.y + TILE_H / 2);
        } else {
          const key = t === Tile.Grass ? 'tile-grass' : 'tile-sand';
          const img = this.add.image(s.x, s.y, key);
          img.setOrigin(0.5, TILE_H / 2 / img.height);
          img.setDepth(-10000 + x + y);
        }
      }
    }
  }

  private drawProps(): void {
    for (const prop of this.island.props) {
      const s = isoToScreen(prop.x + 0.5, prop.y + 0.5);
      const img = this.add.image(s.x, s.y + 6, prop.kind).setOrigin(0.5, 0.92);
      img.setDepth(s.y);
      if (prop.kind === 'tree') {
        this.tweens.add({
          targets: img,
          angle: { from: -1.5, to: 1.5 },
          duration: 2200 + ((prop.x * 31 + prop.y * 17) % 7) * 150,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      }
    }
  }

  private drawShells(): void {
    for (const sh of this.island.shells) {
      const s = isoToScreen(sh.x, sh.y);
      const sprite = this.add.image(s.x, s.y - 4, 'shell').setDepth(s.y);
      this.tweens.add({ targets: sprite, y: s.y - 10, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.shells.push({ x: sh.x, y: sh.y, sprite, taken: false });
    }
  }

  private createPlayer(): void {
    this.pos.set(this.island.spawn.x, this.island.spawn.y);
    const shadow = this.add.image(0, 0, 'shadow');
    this.playerSprite = this.add.image(0, 2, 'player-front').setOrigin(0.5, 1);
    this.player = this.add.container(0, 0, [shadow, this.playerSprite]);
    this.syncPlayer();
  }

  private setupCamera(): void {
    const { size } = this.island;
    const left = isoToScreen(0, size).x;
    const right = isoToScreen(size, 0).x;
    const bottom = isoToScreen(size, size).y;
    const pad = 420;
    const cam = this.cameras.main;
    cam.setBounds(left - pad, -pad - 200, right - left + pad * 2, bottom + pad * 2 + 200);
    cam.startFollow(this.player, false, 0.12, 0.12, 0, 60);
    cam.setRoundPixels(false);
    cam.fadeIn(500, 43, 143, 196);
  }

  private setupKeyboard(): void {
    const kb = this.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const add = (...codes: number[]) => (kb ? codes.map((c) => kb.addKey(c)) : []);
    this.keys = {
      up: add(K.UP, K.W),
      down: add(K.DOWN, K.S),
      left: add(K.LEFT, K.A),
      right: add(K.RIGHT, K.D),
    };
  }

  // ---------- update loop ----------

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const input = this.readInput();

    if (input.lengthSq() > 0) {
      const step = screenVecToGrid(input.x * PLAYER_SPEED * dt, input.y * PLAYER_SPEED * dt);
      // Move axis-by-axis so the player slides along obstacles.
      if (this.canStand(this.pos.x + step.x, this.pos.y)) this.pos.x += step.x;
      if (this.canStand(this.pos.x, this.pos.y + step.y)) this.pos.y += step.y;

      if (Math.abs(input.x) > 0.15) this.playerSprite.setFlipX(input.x < 0);
      this.playerSprite.setTexture(input.y < -0.3 ? 'player-back' : 'player-front');
      this.walkTime += dt * 12 * Math.min(1, input.length());
    } else {
      this.walkTime = 0;
    }

    this.syncPlayer();
    this.collectShells();
  }

  private readInput(): Phaser.Math.Vector2 {
    const v = new Phaser.Math.Vector2();
    const down = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((k) => k.isDown);
    if (down(this.keys.left)) v.x -= 1;
    if (down(this.keys.right)) v.x += 1;
    if (down(this.keys.up)) v.y -= 1;
    if (down(this.keys.down)) v.y += 1;
    if (v.lengthSq() > 0) return v.normalize();

    const ui = this.scene.get('UI') as UIScene | undefined;
    if (ui?.joystick) v.copy(ui.joystick.vector);
    return v;
  }

  private canStand(gx: number, gy: number): boolean {
    const r = PLAYER_RADIUS;
    const pts: [number, number][] = [
      [gx - r, gy - r], [gx + r, gy - r], [gx - r, gy + r], [gx + r, gy + r],
    ];
    return pts.every(([x, y]) => {
      const tx = Math.floor(x);
      const ty = Math.floor(y);
      return this.blocked[ty]?.[tx] === false;
    });
  }

  private syncPlayer(): void {
    const s = isoToScreen(this.pos.x, this.pos.y);
    this.player.setPosition(s.x, s.y);
    this.player.setDepth(s.y);
    const bob = this.walkTime > 0 ? Math.abs(Math.sin(this.walkTime)) * -6 : 0;
    this.playerSprite.y = 2 + bob;
    this.playerSprite.angle = this.walkTime > 0 ? Math.sin(this.walkTime) * 4 : 0;
  }

  private collectShells(): void {
    let changed = false;
    for (const sh of this.shells) {
      if (sh.taken) continue;
      if (Phaser.Math.Distance.Between(sh.x, sh.y, this.pos.x, this.pos.y) > 0.5) continue;
      sh.taken = true;
      changed = true;
      this.tweens.killTweensOf(sh.sprite);
      this.tweens.add({
        targets: sh.sprite,
        y: sh.sprite.y - 60,
        alpha: 0,
        scale: 1.8,
        duration: 450,
        ease: 'Cubic.Out',
        onComplete: () => sh.sprite.destroy(),
      });
    }
    if (changed) this.publishShells();
  }

  private publishShells(): void {
    const found = this.shells.filter((s) => s.taken).length;
    this.registry.set('shells', { found, total: this.shells.length });
  }
}
