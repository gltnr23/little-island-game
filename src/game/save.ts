import { emptyInventory, Inventory, ITEM_ORDER } from './items';
import { SITE_ORDER, SiteId } from './sites';

const KEY = 'little-island-save-v1';

export interface SaveData {
  v: 1;
  pos: { x: number; y: number };
  inv: Inventory;
  /** Indices into IslandData.shells that were picked up. */
  shellsTaken: number[];
  restored: SiteId[];
  /** Day cycle phase, 0..1 (0 = early morning). */
  time: number;
  sound: boolean;
}

/** Reads the save from browser storage. Any missing or malformed data yields null (new game). */
export function loadSave(): SaveData | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (d.v !== 1 || !d.pos || !Number.isFinite(d.pos.x) || !Number.isFinite(d.pos.y)) return null;
    const inv = emptyInventory();
    for (const id of ITEM_ORDER) {
      const n = Number(d.inv?.[id]);
      inv[id] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }
    return {
      v: 1,
      pos: { x: d.pos.x, y: d.pos.y },
      inv,
      shellsTaken: Array.isArray(d.shellsTaken) ? d.shellsTaken.filter((n) => Number.isInteger(n)) : [],
      restored: Array.isArray(d.restored) ? d.restored.filter((s): s is SiteId => SITE_ORDER.includes(s)) : [],
      time: Number.isFinite(d.time) ? ((d.time as number) % 1 + 1) % 1 : 0.15,
      sound: d.sound !== false,
    };
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode, quota): the game keeps working without saving.
  }
}

export function clearSave(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
