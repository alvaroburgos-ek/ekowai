import { parseWorksheet } from '@/lib/engine/schema';
import raw01 from './A201-01.json';
import raw02 from './A201-02.json';
import raw03 from './A201-03.json';
import raw04 from './A201-04.json';
import raw05 from './A201-05.json';
import raw06 from './A201-06.json';
import raw07 from './A201-07.json';
import raw08 from './A201-08.json';
import raw09 from './A201-09.json';
import raw10 from './A201-10.json';
import raw11 from './A201-11.json';
import raw12 from './A201-12.json';
import raw13 from './A201-13.json';
import raw14 from './A201-14.json';
import raw15 from './A201-15.json';
import raw16 from './A201-16.json';
import raw17 from './A201-17.json';
import raw18 from './A201-18.json';
import raw19 from './A201-19.json';
import raw20 from './A201-20.json';
import raw21 from './A201-21.json';
import raw22 from './A201-22.json';

const RAW_BUNDLE = [
  raw01,
  raw02,
  raw03,
  raw04,
  raw05,
  raw06,
  raw07,
  raw08,
  raw09,
  raw10,
  raw11,
  raw12,
  raw13,
  raw14,
  raw15,
  raw16,
  raw17,
  raw18,
  raw19,
  raw20,
  raw21,
  raw22,
] as const;

export const ALL_WORKSHEETS = RAW_BUNDLE.map(parseWorksheet);
