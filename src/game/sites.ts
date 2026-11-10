import type { Inventory } from './items';

/** Broken places on the island the player can restore with gathered materials. */
export type SiteId = 'campfire' | 'garden' | 'hut' | 'dock';

export const SITE_ORDER: SiteId[] = ['campfire', 'garden', 'hut', 'dock'];

export interface SiteDef {
  name: string;
  cost: Partial<Inventory>;
  /** Whether the site's own tile blocks walking. */
  blocks: boolean;
}

export const SITES: Record<SiteId, SiteDef> = {
  campfire: { name: '모닥불', cost: { wood: 3, stone: 2 }, blocks: true },
  garden: { name: '꽃밭', cost: { berry: 4 }, blocks: false },
  hut: { name: '오두막', cost: { wood: 6, stone: 3 }, blocks: true },
  dock: { name: '부두', cost: { wood: 5, shell: 3 }, blocks: false },
};
