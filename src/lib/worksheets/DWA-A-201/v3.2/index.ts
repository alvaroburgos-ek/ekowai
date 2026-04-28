import { parseWorksheet } from '@/lib/engine/schema';
import raw01 from './A201-01.json';
import raw02 from './A201-02.json';
import raw03 from './A201-03.json';
import raw08 from './A201-08.json';
import raw12 from './A201-12.json';

export const A201_01 = parseWorksheet(raw01);
export const A201_02 = parseWorksheet(raw02);
export const A201_03 = parseWorksheet(raw03);
export const A201_08 = parseWorksheet(raw08);
export const A201_12 = parseWorksheet(raw12);

export const ALL_WORKSHEETS = [A201_01, A201_02, A201_03, A201_08, A201_12] as const;
