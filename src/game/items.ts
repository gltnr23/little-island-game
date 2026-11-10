export type ItemId = 'shell' | 'wood' | 'stone' | 'berry';

export type Inventory = Record<ItemId, number>;

export const ITEM_ORDER: ItemId[] = ['shell', 'wood', 'stone', 'berry'];

export const ITEMS: Record<ItemId, { name: string; texture: string }> = {
  shell: { name: '조개', texture: 'shell' },
  wood: { name: '목재', texture: 'item-wood' },
  stone: { name: '돌', texture: 'item-stone' },
  berry: { name: '열매', texture: 'item-berry' },
};

export function emptyInventory(): Inventory {
  return { shell: 0, wood: 0, stone: 0, berry: 0 };
}

export function hasItems(inv: Inventory, cost: Partial<Inventory>): boolean {
  return ITEM_ORDER.every((id) => inv[id] >= (cost[id] ?? 0));
}

/** "목재 2/3 · 돌 0/2" */
export function describeCost(inv: Inventory, cost: Partial<Inventory>): string {
  return ITEM_ORDER.filter((id) => cost[id])
    .map((id) => `${ITEMS[id].name} ${Math.min(inv[id], cost[id]!)}/${cost[id]}`)
    .join(' · ');
}
