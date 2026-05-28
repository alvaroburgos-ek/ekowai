export type Layer = 'management' | 'cost' | 'technical';

/** Relationship of a project_standards row to its parent within the technical
 * train.
 *  - series       : downstream step (parent → child)
 *  - parallel     : alternative at the same stage as siblings under the same parent
 *  - sub_standard : nested inside parent's process scope */
export type RelationType = 'series' | 'parallel' | 'sub_standard';

/** Codes that the recommended structure assigns to each layer when applied. */
export const RECOMMENDED_LAYERS: Record<Layer, readonly string[]> = {
  management: ['DWA-M-820-1', 'DWA-M-820-2', 'DWA-M-820-3'],
  cost: ['DIN-276'],
  technical: [], // every other standard the engineer adds
};
