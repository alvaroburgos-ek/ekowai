import { parseWorksheet } from '@/lib/engine/schema';
import raw from './A201-08.json';

export const A201_08 = parseWorksheet(raw);

export const ALL_WORKSHEETS = [A201_08] as const;
