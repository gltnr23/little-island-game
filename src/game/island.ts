import Phaser from 'phaser';
import type { SiteId } from './sites';

export enum Tile {
  Water = 0,
  Sand = 1,
  Grass = 2,
  Hill = 3,
}

export type PropKind = 'tree' | 'rock' | 'bush';

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
}

export interface SiteSpot {
  id: SiteId;
  x: number;
  y: number;
  /** Dock only: the water tiles the planks cover once restored. */
  planks: { x: number; y: number }[];
}

export interface IslandData {
  size: number;
  tiles: Tile[][]; // tiles[y][x]
  props: Prop[];
  sites: SiteSpot[];
  shells: { x: number; y: number }[];
  spawn: { x: number; y: number };
}

/** Generates a small, deterministic island so every run starts on the same map. */
export function generateIsland(seed = 'little-island', size = 18): IslandData {
  const rng = new Phaser.Math.RandomDataGenerator([seed]);
  const c = (size - 1) / 2;
  const tiles: Tile[][] = [];
  const phase = rng.realInRange(0, Math.PI * 2);

  for (let y = 0; y < size; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const angle = Math.atan2(dy, dx);
      // Wobbly coastline from a few sine harmonics.
      const wobble = 0.9 * Math.sin(angle * 3 + phase) + 0.5 * Math.sin(angle * 5 - phase * 2);
      const d = Math.sqrt(dx * dx + dy * dy) - wobble;
      if (d < 4.6) row.push(Tile.Grass);
      else if (d < 6.6) row.push(Tile.Sand);
      else row.push(Tile.Water);
    }
    tiles.push(row);
  }

  const spawn = { x: Math.floor(c) + 0.5, y: Math.floor(c) + 2.5 };
  const nearSpawn = (x: number, y: number) =>
    Math.abs(x + 0.5 - spawn.x) < 2 && Math.abs(y + 0.5 - spawn.y) < 2;

  // A small plateau north of the centre.
  const hillCells: [number, number][] = [
    [0, -2], [1, -2], [-1, -2], [0, -3], [1, -3], [-1, -1],
  ];
  for (const [ox, oy] of hillCells) {
    const hx = Math.floor(c) + ox;
    const hy = Math.floor(c) + oy;
    if (tiles[hy]?.[hx] === Tile.Grass) tiles[hy][hx] = Tile.Hill;
  }

  const occupied = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  const cellsOf = (type: Tile) => {
    const out: [number, number][] = [];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) if (tiles[y][x] === type && !nearSpawn(x, y)) out.push([x, y]);
    return rng.shuffle(out);
  };

  // Restoration sites are reserved before props so trees never cover them.
  const nearest = (type: Tile, tx: number, ty: number, ok: (x: number, y: number) => boolean = () => true) => {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (tiles[y][x] !== type || nearSpawn(x, y) || occupied.has(key(x, y)) || !ok(x, y)) continue;
        const d = (x - tx) ** 2 + (y - ty) ** 2;
        if (d < bestD) {
          bestD = d;
          best = [x, y];
        }
      }
    return best;
  };
  const sites: SiteSpot[] = [];
  const addSite = (id: SiteId, cell: [number, number] | null, planks: { x: number; y: number }[] = []) => {
    if (!cell) return;
    occupied.add(key(cell[0], cell[1]));
    sites.push({ id, x: cell[0], y: cell[1], planks });
  };
  const ci = Math.floor(c);
  addSite('campfire', nearest(Tile.Grass, ci + 2, ci + 2));
  addSite('garden', nearest(Tile.Grass, ci - 3, ci + 1));
  addSite('hut', nearest(Tile.Grass, ci + 3, ci - 3));
  // Dock: a sand tile on the near (screen-bottom) shore with two water tiles in front of it.
  const water = (x: number, y: number) => tiles[y]?.[x] === Tile.Water;
  const dock = nearest(Tile.Sand, ci + 1, size, (x, y) => water(x, y + 1) && water(x, y + 2));
  if (dock) addSite('dock', dock, [{ x: dock[0], y: dock[1] + 1 }, { x: dock[0], y: dock[1] + 2 }]);

  const props: Prop[] = [];
  const place = (cells: [number, number][], kind: PropKind, count: number) => {
    for (const [x, y] of cells) {
      if (count <= 0) break;
      if (occupied.has(key(x, y))) continue;
      occupied.add(key(x, y));
      props.push({ kind, x, y });
      count--;
    }
  };

  const grass = cellsOf(Tile.Grass);
  const sand = cellsOf(Tile.Sand);
  place(grass, 'tree', 11);
  place(grass, 'bush', 6);
  place(sand, 'rock', 5);

  // Fill the plateau into a solid 3x3 block so it has no walkable notch.
  // Done after placing props so the rest of the island (and saved games) keep the same layout.
  for (let oy = -3; oy <= -1; oy++)
    for (let ox = -1; ox <= 1; ox++) {
      const hx = Math.floor(c) + ox;
      const hy = Math.floor(c) + oy;
      if (tiles[hy]?.[hx] !== undefined && tiles[hy][hx] !== Tile.Water) tiles[hy][hx] = Tile.Hill;
    }
  for (let i = props.length - 1; i >= 0; i--) if (tiles[props[i].y][props[i].x] === Tile.Hill) props.splice(i, 1);

  const shells: { x: number; y: number }[] = [];
  for (const [x, y] of sand) {
    if (shells.length >= 8) break;
    if (occupied.has(key(x, y)) || tiles[y][x] !== Tile.Sand) continue;
    occupied.add(key(x, y));
    shells.push({ x: x + 0.5, y: y + 0.5 });
  }

  return { size, tiles, props, sites, shells, spawn };
}
