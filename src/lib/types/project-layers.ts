export type Layer = 'management' | 'cost' | 'technical';

/** Codes that the recommended structure assigns to each layer when applied. */
export const RECOMMENDED_LAYERS: Record<Layer, readonly string[]> = {
  management: ['DWA-M-820-1', 'DWA-M-820-2', 'DWA-M-820-3'],
  cost: ['DIN-276'],
  technical: [], // every other standard the engineer adds
};
