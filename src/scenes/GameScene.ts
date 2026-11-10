import Phaser from 'phaser';
import { sfx } from '../game/audio';
import { DAY_LENGTH, nightAmount, tintAt } from '../game/daynight';
import { generateIsland, IslandData, Prop, SiteSpot, Tile } from '../game/island';
import { HILL_HEIGHT, isoToScreen, screenVecToGrid, TILE_DEPTH, TILE_H, TILE_W } from '../game/iso';
import { describeCost, emptyInventory, hasItems, Inventory, ItemId, ITEM_ORDER, ITEMS } from '../game/items';
import { clearSave, loadSave, SaveData, writeSave } from '../game/save';
import { SITE_ORDER, SITES, SiteId } from '../game/sites';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { UIScene } from './UIScene';

const PLAYER_SPEED = 230; // screen px / second
const PLAYER_RADIUS = 0.22; // grid units
const INTERACT_RANGE = 1.3; // grid units from the target tile's centre
/** Collision radius (grid units) of props; bushes can be walked through. */
const PROP_RADIUS: Partial<Record<Prop['kind'], number>> = { tree: 0.22, rock: 0.24 };

// Draw order above the world: night tint, then lights, then markers/popups.
const OVERLAY_DEPTH = 900000;
const LIGHT_DEPTH = OVERLAY_DEPTH + 1;
const FX_DEPTH = OVERLAY_DEPTH + 10;

const GATHER: Record<Prop['kind'], { item: ItemId; min: number; max: number; cooldown: number; label: string; markerY: number }> = {
  tree: { item: 'wood', min: 1, max: 2, cooldown: 20000, label: '흔들기', markerY: 132 },
  rock: { item: 'stone', min: 1, max: 1, cooldown: 25000, label: '캐기', markerY: 44 },
  bush: { item: 'berry', min: 1, max: 2, cooldown: 18000, label: '따기', markerY: 50 },
};

const SITE_MARKER_Y: Record<SiteId, number> = { campfire: 54, garden: 40, hut: 118, dock: 36 };

interface Shell {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image | null;
  taken: boolean;
}

interface PropState {
  prop: Prop;
  sprite: Phaser.GameObjects.Image;
  readyAt: number;
}

interface SiteState {
  spot: SiteSpot;
  restored: boolean;
  objects: Phaser.GameObjects.GameObject[];
  lights: { img: Phaser.GameObjects.Image; strength: number }[];
}

type Target = { kind: 'prop'; state: PropState } | { kind: 'site'; state: SiteState };

export interface Prompt {
  label: string;
  enabled: boolean;
  info?: string;
}

export class GameScene extends Phaser.Scene {
  private island!: IslandData;
  private blocked!: boolean[][];
  private circles: { x: number; y: number; r: number }[] = [];
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Image;
  private pos = new Phaser.Math.Vector2();
  private walkTime = 0;
  private lastStep = 0;
  private shells: Shell[] = [];
  private props: PropState[] = [];
  private sites: SiteState[] = [];
  private inv: Inventory = emptyInventory();
  private phase = 0.15;
  private soundOn = true;
  private night = 0;
  private overlay!: Phaser.GameObjects.Rectangle;
  private fireflies: { img: Phaser.GameObjects.Image; seed: number }[] = [];
  private marker!: Phaser.GameObjects.Image;
  private target: Target | null = null;
  private lastPromptKey = '';
  private resetting = false;
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
    const save = loadSave();
    this.island = generateIsland();
    this.shells = [];
    this.props = [];
    this.sites = [];
    this.fireflies = [];
    this.target = null;
    this.lastPromptKey = '';
    this.inv = save ? { ...save.inv } : emptyInventory();
    this.phase = save?.time ?? 0.15;
    this.soundOn = save?.sound ?? true;
    sfx.setEnabled(this.soundOn);

    const restored = new Set(save?.restored ?? []);
    this.buildBlockedMap();
    this.drawWater();
    this.drawTiles();
    this.drawProps();
    this.drawSites(restored);
    this.drawShells(new Set(save?.shellsTaken ?? []));
    this.createPlayer(save);
    this.setupCamera();
    this.setupKeyboard();
    this.setupDayNight();
    this.marker = this.add.image(0, 0, 'marker').setDepth(FX_DEPTH).setVisible(false);
    this.markerBase = NaN;

    this.wireEvents();
    this.publishShells();
    this.publishInventory();
    this.publishRestored();
    this.registry.set('sound', this.soundOn);
    this.registry.set('night', false);
  }

  // ---------- world building ----------

  private buildBlockedMap(): void {
    const { tiles, props, sites } = this.island;
    this.blocked = tiles.map((row) => row.map((t) => t === Tile.Water || t === Tile.Hill));
    // Trees and rocks are round obstacles (not whole tiles) so the player slides around them.
    this.circles = [];
    for (const prop of props) {
      const r = PROP_RADIUS[prop.kind];
      if (r) this.circles.push({ x: prop.x + 0.5, y: prop.y + 0.5, r });
    }
    for (const site of sites) if (SITES[site.id].blocks) this.blocked[site.y][site.x] = true;
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
      if (prop.kind === 'tree') this.swayTree(img, prop);
      this.props.push({ prop, sprite: img, readyAt: 0 });
    }
  }

  private swayTree(img: Phaser.GameObjects.Image, prop: Prop): void {
    this.tweens.add({
      targets: img,
      angle: { from: -1.5, to: 1.5 },
      duration: 2200 + ((prop.x * 31 + prop.y * 17) % 7) * 150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private drawSites(restored: Set<SiteId>): void {
    for (const spot of this.island.sites) {
      const state: SiteState = { spot, restored: false, objects: [], lights: [] };
      this.sites.push(state);
      if (restored.has(spot.id)) this.restoreSite(state, false);
      else this.drawBrokenSite(state);
    }
  }

  private drawBrokenSite(state: SiteState): void {
    const { spot } = state;
    const s = isoToScreen(spot.x + 0.5, spot.y + 0.5);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (state.objects.push(o), o);
    switch (spot.id) {
      case 'campfire':
        add(this.add.image(s.x, s.y + 4, 'campfire-broken').setOrigin(0.5, 0.7).setDepth(s.y));
        break;
      case 'hut':
        add(this.add.image(s.x, s.y + 8, 'hut-broken').setOrigin(0.5, 0.8).setDepth(s.y));
        break;
      case 'garden':
        add(this.add.image(s.x, s.y, 'garden-dry').setDepth(-10000 + spot.x + spot.y + 0.5));
        break;
      case 'dock': {
        for (const [i, p] of spot.planks.entries()) {
          const ps = isoToScreen(p.x + 0.5, p.y + 0.5);
          if (i === spot.planks.length - 1) {
            add(this.add.image(ps.x - TILE_W / 2 + 14, ps.y, 'dock-post').setOrigin(0.5, 0.7).setDepth(ps.y));
          }
          const debris = add(this.add.image(ps.x + 6, ps.y + 4, 'dock-debris').setDepth(-15000).setAngle(i * 25 - 10));
          this.tweens.add({ targets: debris, y: '+=4', duration: 1400 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        }
        break;
      }
    }
  }

  /** Replaces a site's ruined look with the restored one. */
  private restoreSite(state: SiteState, animate: boolean): void {
    for (const o of state.objects) o.destroy();
    state.objects = [];
    state.restored = true;
    const { spot } = state;
    const s = isoToScreen(spot.x + 0.5, spot.y + 0.5);
    const pop: Phaser.GameObjects.Image[] = [];
    const add = (img: Phaser.GameObjects.Image) => (state.objects.push(img), pop.push(img), img);
    const light = (x: number, y: number, tint: number, scale: number, strength: number) => {
      const img = this.add.image(x, y, 'glow').setTint(tint).setScale(scale).setBlendMode(Phaser.BlendModes.ADD);
      img.setDepth(LIGHT_DEPTH).setAlpha(0);
      state.objects.push(img);
      state.lights.push({ img, strength });
    };

    switch (spot.id) {
      case 'campfire': {
        add(this.add.image(s.x, s.y + 4, 'campfire').setOrigin(0.5, 0.7).setDepth(s.y));
        const flame = add(this.add.image(s.x, s.y + 2, 'flame').setOrigin(0.5, 1).setDepth(s.y + 1));
        this.tweens.add({ targets: flame, scaleY: { from: 0.85, to: 1.12 }, scaleX: { from: 1.05, to: 0.92 }, duration: 160, yoyo: true, repeat: -1 });
        light(s.x, s.y - 10, 0xff9a3c, 3.2, 0.85);
        break;
      }
      case 'hut': {
        add(this.add.image(s.x, s.y, 'hut').setOrigin(0.5, 81 / 104).setDepth(s.y + 10));
        light(s.x - 21, s.y - 21, 0xffd27a, 0.7, 0.9);
        break;
      }
      case 'garden': {
        add(this.add.image(s.x, s.y, 'garden-soil').setDepth(-10000 + spot.x + spot.y + 0.5));
        const fl = add(this.add.image(s.x, s.y + 12, 'flowers').setOrigin(0.5, 0.85).setDepth(s.y));
        this.tweens.add({ targets: fl, angle: { from: -2, to: 2 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        break;
      }
      case 'dock': {
        for (const [i, p] of spot.planks.entries()) {
          const ps = isoToScreen(p.x + 0.5, p.y + 0.5);
          const plank = add(this.add.image(ps.x, ps.y, 'dock-plank').setDepth(-10000 + p.x + p.y + 0.2));
          plank.setOrigin(0.5, TILE_H / 2 / plank.height);
          if (i === spot.planks.length - 1) {
            add(this.add.image(ps.x - TILE_W / 2 + 14, ps.y, 'dock-post').setOrigin(0.5, 0.7).setDepth(ps.y));
            add(this.add.image(ps.x + 14, ps.y + TILE_H / 2 - 4, 'dock-post').setOrigin(0.5, 0.7).setDepth(ps.y + TILE_H / 2));
            light(ps.x, ps.y - 12, 0xfff0b0, 0.9, 0.5);
          }
          this.blocked[p.y][p.x] = false;
        }
        break;
      }
    }

    if (animate) {
      for (const img of pop) {
        const sx = img.scaleX;
        const sy = img.scaleY;
        img.setScale(sx * 0.4, sy * 0.4);
        this.tweens.add({ targets: img, scaleX: sx, scaleY: sy, duration: 450, ease: 'Back.Out' });
      }
      const burst = this.add.particles(s.x, s.y - 20, 'sparkle', {
        speed: { min: 80, max: 220 },
        angle: { min: 200, max: 340 },
        gravityY: 260,
        lifespan: 900,
        scale: { start: 1.6, end: 0 },
        tint: [0xffffff, 0xffe08a, 0xff9ab0, 0xa8f0ff],
        emitting: false,
      });
      burst.setDepth(FX_DEPTH);
      burst.explode(36);
      this.time.delayedCall(1200, () => burst.destroy());
    }
  }

  private drawShells(taken: Set<number>): void {
    for (const [i, sh] of this.island.shells.entries()) {
      if (taken.has(i)) {
        this.shells.push({ x: sh.x, y: sh.y, sprite: null, taken: true });
        continue;
      }
      const s = isoToScreen(sh.x, sh.y);
      const sprite = this.add.image(s.x, s.y - 4, 'shell').setDepth(s.y);
      this.tweens.add({ targets: sprite, y: s.y - 10, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.shells.push({ x: sh.x, y: sh.y, sprite, taken: false });
    }
  }

  private createPlayer(save: SaveData | null): void {
    this.pos.set(this.island.spawn.x, this.island.spawn.y);
    if (save && this.canStand(save.pos.x, save.pos.y)) this.pos.set(save.pos.x, save.pos.y);
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
    kb?.on('keydown-SPACE', () => this.doAction());
    kb?.on('keydown-E', () => this.doAction());
    kb?.on('keydown-M', () => this.toggleSound());
  }

  /** Night is a full-screen multiply tint; lights and fireflies are additive glows drawn above it. */
  private setupDayNight(): void {
    this.overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(OVERLAY_DEPTH)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);

    const rng = new Phaser.Math.RandomDataGenerator(['fireflies']);
    const grass: [number, number][] = [];
    this.island.tiles.forEach((row, y) => row.forEach((t, x) => t === Tile.Grass && grass.push([x, y])));
    for (let i = 0; i < 16 && grass.length; i++) {
      const [gx, gy] = rng.pick(grass);
      const s = isoToScreen(gx + rng.frac(), gy + rng.frac());
      const img = this.add
        .image(s.x, s.y - rng.between(20, 70), 'glow')
        .setTint(0xd8ff7a)
        .setScale(0.14)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(LIGHT_DEPTH)
        .setAlpha(0);
      this.tweens.add({
        targets: img,
        x: `+=${rng.between(-40, 40)}`,
        y: `+=${rng.between(-30, 30)}`,
        duration: rng.between(2500, 4500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
      this.fireflies.push({ img, seed: rng.frac() * 10 });
    }
    this.updateDayNight(0);
  }

  private wireEvents(): void {
    const ev = this.game.events;
    const onAction = () => this.doAction();
    const onSound = () => this.toggleSound();
    const onReset = () => this.resetGame();
    ev.on('ui-action', onAction);
    ev.on('ui-toggle-sound', onSound);
    ev.on('ui-reset', onReset);

    const saveNow = () => this.saveGame();
    const onVisibility = () => document.visibilityState === 'hidden' && saveNow();
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', onVisibility);

    const autosave = this.time.addEvent({ delay: 3000, loop: true, callback: saveNow });
    const melody = this.time.addEvent({ delay: 1300, loop: true, callback: () => sfx.melodyStep(this.night > 0.5) });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      ev.off('ui-action', onAction);
      ev.off('ui-toggle-sound', onSound);
      ev.off('ui-reset', onReset);
      window.removeEventListener('pagehide', saveNow);
      document.removeEventListener('visibilitychange', onVisibility);
      autosave.remove();
      melody.remove();
    });
  }

  // ---------- update loop ----------

  update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const input = this.readInput();

    if (input.lengthSq() > 0) {
      const step = screenVecToGrid(input.x * PLAYER_SPEED * dt, input.y * PLAYER_SPEED * dt);
      this.moveBy(step.x, step.y);

      if (Math.abs(input.x) > 0.15) this.playerSprite.setFlipX(input.x < 0);
      this.playerSprite.setTexture(input.y < -0.3 ? 'player-back' : 'player-front');
      this.walkTime += dt * 12 * Math.min(1, input.length());
      const stepIdx = Math.floor(this.walkTime / Math.PI);
      if (stepIdx !== this.lastStep) {
        this.lastStep = stepIdx;
        const tile = this.island.tiles[Math.floor(this.pos.y)]?.[Math.floor(this.pos.x)];
        sfx.step(tile === Tile.Grass);
      }
    } else {
      this.walkTime = 0;
      this.lastStep = 0;
    }

    this.syncPlayer();
    this.collectShells();
    this.regrowProps(time);
    this.updateTarget(time);
    this.updateDayNight(dt);
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

  /**
   * Moves the player (a circle) and pushes it out of blocked tiles and round obstacles
   * along the contact normal, so it glides around corners instead of stopping dead.
   */
  private moveBy(dx: number, dy: number): void {
    const len = Math.hypot(dx, dy);
    if (len === 0) return;
    // Try the intended direction first, then progressively angled ones, and keep whichever
    // gets furthest forward. This steers around an obstacle hit head-on instead of stalling.
    let best: { x: number; y: number } | null = null;
    let bestScore = 0;
    for (const deg of [0, 30, -30, 60, -60, 85, -85]) {
      const a = Phaser.Math.DegToRad(deg);
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const p = this.resolve(this.pos.x + dx * cos - dy * sin, this.pos.y + dx * sin + dy * cos);
      if (!p || !this.canStand(p.x, p.y)) continue;
      const score = ((p.x - this.pos.x) * dx + (p.y - this.pos.y) * dy) / len; // forward progress
      if (score > bestScore + 1e-4) {
        best = p;
        bestScore = score;
      }
      if (deg === 0 && score > len * 0.6) break; // moving freely enough already
    }
    if (best) {
      this.pos.set(best.x, best.y);
      return;
    }
    // Fallback: axis-by-axis movement.
    if (this.canStand(this.pos.x + dx, this.pos.y)) this.pos.x += dx;
    if (this.canStand(this.pos.x, this.pos.y + dy)) this.pos.y += dy;
  }

  private resolve(x: number, y: number): { x: number; y: number } | null {
    const r = PLAYER_RADIUS;
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      const push = (cx: number, cy: number, min: number): boolean => {
        const ddx = x - cx;
        const ddy = y - cy;
        const d = Math.hypot(ddx, ddy);
        if (d >= min) return true;
        if (d < 1e-6) return false; // centre inside an obstacle: no sensible push direction
        x += (ddx / d) * (min - d);
        y += (ddy / d) * (min - d);
        moved = true;
        return true;
      };
      const fx = Math.floor(x);
      const fy = Math.floor(y);
      for (let ty = fy - 1; ty <= fy + 1; ty++)
        for (let tx = fx - 1; tx <= fx + 1; tx++) {
          if (!this.isBlockedTile(tx, ty)) continue;
          if (!push(Phaser.Math.Clamp(x, tx, tx + 1), Phaser.Math.Clamp(y, ty, ty + 1), r)) return null;
        }
      for (const c of this.circles) if (!push(c.x, c.y, r + c.r)) return null;
      if (!moved) break;
    }
    return { x, y };
  }

  private isBlockedTile(tx: number, ty: number): boolean {
    return this.blocked[ty]?.[tx] !== false;
  }

  private canStand(gx: number, gy: number): boolean {
    const r = PLAYER_RADIUS - 1e-4;
    const fx = Math.floor(gx);
    const fy = Math.floor(gy);
    for (let ty = fy - 1; ty <= fy + 1; ty++)
      for (let tx = fx - 1; tx <= fx + 1; tx++) {
        if (!this.isBlockedTile(tx, ty)) continue;
        const cx = Phaser.Math.Clamp(gx, tx, tx + 1);
        const cy = Phaser.Math.Clamp(gy, ty, ty + 1);
        if (Math.hypot(gx - cx, gy - cy) < r) return false;
      }
    return this.circles.every((c) => Math.hypot(gx - c.x, gy - c.y) >= r + c.r);
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
      if (sh.taken || !sh.sprite) continue;
      if (Phaser.Math.Distance.Between(sh.x, sh.y, this.pos.x, this.pos.y) > 0.5) continue;
      sh.taken = true;
      changed = true;
      const sprite = sh.sprite;
      this.tweens.killTweensOf(sprite);
      this.tweens.add({
        targets: sprite,
        y: sprite.y - 60,
        alpha: 0,
        scale: 1.8,
        duration: 450,
        ease: 'Cubic.Out',
        onComplete: () => sprite.destroy(),
      });
      sh.sprite = null;
      this.inv.shell += 1;
      sfx.pickup();
    }
    if (changed) {
      this.publishShells();
      this.publishInventory();
    }
  }

  // ---------- gathering & restoration ----------

  private regrowProps(now: number): void {
    for (const p of this.props) {
      if (p.readyAt === 0 || now < p.readyAt) continue;
      p.readyAt = 0;
      if (p.prop.kind === 'bush') p.sprite.setTexture('bush');
      if (p.prop.kind === 'rock') p.sprite.clearTint();
    }
  }

  private updateTarget(now: number): void {
    let best: Target | null = null;
    let bestD = INTERACT_RANGE;
    const consider = (t: Target, x: number, y: number) => {
      const d = Phaser.Math.Distance.Between(x + 0.5, y + 0.5, this.pos.x, this.pos.y);
      if (d <= bestD) {
        bestD = d;
        best = t;
      }
    };
    for (const p of this.props) if (p.readyAt === 0 || now >= p.readyAt) consider({ kind: 'prop', state: p }, p.prop.x, p.prop.y);
    for (const s of this.sites) if (!s.restored) consider({ kind: 'site', state: s }, s.spot.x, s.spot.y);
    this.target = best;

    let prompt: Prompt | null = null;
    const tgt = this.target as Target | null;
    if (tgt?.kind === 'prop') {
      const { prop } = tgt.state;
      const s = isoToScreen(prop.x + 0.5, prop.y + 0.5);
      this.marker.setVisible(true).setX(s.x);
      this.setMarkerBase(s.y - GATHER[prop.kind].markerY);
      prompt = { label: GATHER[prop.kind].label, enabled: true };
    } else if (tgt?.kind === 'site') {
      const { spot } = tgt.state;
      const def = SITES[spot.id];
      const s = isoToScreen(spot.x + 0.5, spot.y + 0.5);
      this.marker.setVisible(true).setX(s.x);
      this.setMarkerBase(s.y - SITE_MARKER_Y[spot.id]);
      prompt = { label: '고치기', enabled: hasItems(this.inv, def.cost), info: `${def.name} 고치기 · ${describeCost(this.inv, def.cost)}` };
    } else {
      this.marker.setVisible(false);
    }

    const key = JSON.stringify(prompt);
    if (key !== this.lastPromptKey) {
      this.lastPromptKey = key;
      this.registry.set('prompt', prompt);
    }
  }

  /** The marker bobs via a relative tween, so only move it when its anchor changes. */
  private markerBase = NaN;
  private setMarkerBase(y: number): void {
    if (Math.abs(y - this.markerBase) < 0.5) return;
    this.markerBase = y;
    this.tweens.killTweensOf(this.marker);
    this.marker.setY(y);
    this.tweens.add({ targets: this.marker, y: y - 8, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private doAction(): void {
    const t = this.target;
    if (!t) return;
    if (t.kind === 'prop') this.gather(t.state);
    else this.tryRestore(t.state);
  }

  private gather(p: PropState): void {
    const g = GATHER[p.prop.kind];
    const amount = Phaser.Math.Between(g.min, g.max);
    this.inv[g.item] += amount;
    p.readyAt = this.time.now + g.cooldown;
    sfx.gather();

    const sprite = p.sprite;
    if (p.prop.kind === 'tree') {
      this.tweens.killTweensOf(sprite);
      sprite.setAngle(0);
      this.tweens.add({
        targets: sprite,
        angle: { from: -6, to: 6 },
        duration: 70,
        yoyo: true,
        repeat: 3,
        onComplete: () => this.swayTree(sprite, p.prop),
      });
    } else if (p.prop.kind === 'bush') {
      sprite.setTexture('bush-empty');
      this.tweens.add({ targets: sprite, scaleX: 1.12, scaleY: 0.9, duration: 90, yoyo: true });
    } else {
      sprite.setTint(0xb8b8b8);
      this.tweens.add({ targets: sprite, scaleX: 0.9, scaleY: 1.08, duration: 80, yoyo: true, repeat: 1 });
    }

    const s = isoToScreen(p.prop.x + 0.5, p.prop.y + 0.5);
    this.popItem(s.x, s.y - GATHER[p.prop.kind].markerY + 10, g.item, amount);
    this.publishInventory();
  }

  private tryRestore(state: SiteState): void {
    const def = SITES[state.spot.id];
    if (!hasItems(this.inv, def.cost)) {
      sfx.denied();
      this.game.events.emit('toast', `재료가 부족해요 · ${describeCost(this.inv, def.cost)}`);
      return;
    }
    for (const id of ITEM_ORDER) this.inv[id] -= def.cost[id] ?? 0;
    this.restoreSite(state, true);
    sfx.restore();
    this.game.events.emit('toast', `${withObjectParticle(def.name)} 고쳤어요!`);
    this.publishInventory();
    this.publishRestored();
    this.saveGame();
  }

  private popItem(x: number, y: number, item: ItemId, amount: number): void {
    const icon = this.add.image(-14, 0, ITEMS[item].texture);
    const label = this.add
      .text(4, 0, `+${amount}`, { fontFamily: 'system-ui, sans-serif', fontSize: '26px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setStroke('#0b3954', 5);
    const c = this.add.container(x, y, [icon, label]).setDepth(FX_DEPTH);
    this.tweens.add({ targets: c, y: y - 56, alpha: { from: 1, to: 0 }, duration: 900, ease: 'Cubic.Out', onComplete: () => c.destroy() });
  }

  // ---------- day / night ----------

  private updateDayNight(dt: number): void {
    this.phase = (this.phase + dt / DAY_LENGTH) % 1;
    const tint = tintAt(this.phase);
    this.overlay.setFillStyle(tint);
    this.night = nightAmount(this.phase);
    this.tintPageBackground(tint);

    for (const site of this.sites) for (const l of site.lights) l.img.setAlpha(this.night * l.strength);
    const t = this.time.now / 1000;
    for (const f of this.fireflies) f.img.setAlpha(this.night * (0.45 + 0.45 * Math.sin(t * 2.3 + f.seed)));

    const isNight = this.night > 0.5;
    if (this.registry.get('night') !== isNight) this.registry.set('night', isNight);
  }

  /** Letterbox bars outside the canvas follow the sea colour through the day. */
  private lastPageTint = -1;
  private tintPageBackground(tint: number): void {
    if (tint === this.lastPageTint) return;
    this.lastPageTint = tint;
    const sea = Phaser.Display.Color.IntegerToColor(0x2b8fc4);
    const t = Phaser.Display.Color.IntegerToColor(tint);
    const ch = (a: number, b: number) => Math.round((a * b) / 255);
    document.body.style.background = `rgb(${ch(sea.red, t.red)}, ${ch(sea.green, t.green)}, ${ch(sea.blue, t.blue)})`;
  }

  // ---------- state, save & UI sync ----------

  private toggleSound(): void {
    this.soundOn = !this.soundOn;
    sfx.setEnabled(this.soundOn);
    this.registry.set('sound', this.soundOn);
    this.saveGame();
  }

  private resetGame(): void {
    this.resetting = true;
    clearSave();
    window.location.reload();
  }

  private saveGame(): void {
    if (this.resetting) return;
    writeSave({
      v: 1,
      pos: { x: this.pos.x, y: this.pos.y },
      inv: { ...this.inv },
      shellsTaken: this.shells.flatMap((s, i) => (s.taken ? [i] : [])),
      restored: this.sites.filter((s) => s.restored).map((s) => s.spot.id),
      time: this.phase,
      sound: this.soundOn,
    });
  }

  private publishShells(): void {
    const found = this.shells.filter((s) => s.taken).length;
    this.registry.set('shells', { found, total: this.shells.length });
  }

  private publishInventory(): void {
    this.registry.set('inventory', { ...this.inv });
  }

  private publishRestored(): void {
    const done = this.sites.filter((s) => s.restored).map((s) => s.spot.id);
    this.registry.set('restored', { ids: SITE_ORDER.filter((id) => done.includes(id)), total: this.sites.length });
  }
}

/** Adds the Korean object particle 을/를 depending on the final consonant. */
function withObjectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasBatchim ? '을' : '를'}`;
}
