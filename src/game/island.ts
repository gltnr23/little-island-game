import Phaser from 'phaser';

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

export interface IslandData {
  size: number;
  tiles: Tile[][]; // tiles[y][x]
  props: Prop[];
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

  const shells: { x: number; y: number }[] = [];
  for (const [x, y] of sand) {
    if (shells.length >= 8) break;
    if (occupied.has(key(x, y))) continue;
    occupied.add(key(x, y));
    shells.push({ x: x + 0.5, y: y + 0.5 });
  }

  return { size, tiles, props, shells, spawn };
}
