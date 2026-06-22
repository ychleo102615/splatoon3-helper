/**
 * weaponFilters.ts — 武器篩選的「行為層」單一事實來源(列表頁 + 隨機器共用)。
 *
 * 這裡只放**純函式 / 純資料**:不持有 state、不碰 i18n、不依賴 React。
 * UI 的狀態編排(列表頁單一狀態 vs 隨機器多槽、搜尋 vs 去重)各自留在元件內——
 * 那些本就不同形,不該硬抽;真正該共用的是「篩選規則語意」與「射程刻度基準」,即本檔。
 */

import type { RangeValue, RangeMark } from '@/components/RangeSlider';
import type { WeaponCategory } from '@/data/schema';

/** 單組篩選條件(維度內 OR、維度間 AND;空集合 = 該維度不限)。 */
export interface FilterCriteria {
  cats: Set<WeaponCategory>;
  subIds: Set<string>;
  specialIds: Set<string>;
  /** 射程選取區間;滿格(= bounds)代表不限。 */
  range: RangeValue;
}

/** 可被篩選的武器最小切面(WeaponCardVM / PickerWeapon 皆結構相容)。 */
interface FilterableWeapon {
  category: WeaponCategory;
  subId: string;
  specialId: string;
  /** 射程相對值(0–100);快照缺值時為 null(視為不符任何射程限制)。 */
  range: number | null;
}

/** 射程是否「有設限」:任一端內縮於軌道邊界即為 true(滿格 = 不限)。 */
export function isRangeLimited(range: RangeValue, bounds: RangeValue): boolean {
  return range.min > bounds.min || range.max < bounds.max;
}

/**
 * 單把武器是否通過一組條件:分類 / 副 / 特殊三維度各自 OR、維度間 AND;
 * 射程僅在有設限時生效(缺值的武器在設限時一律不符)。搜尋字串不在此處理,
 * 由呼叫端視需要另外 AND 疊加(隨機器沒有搜尋,列表頁才有)。
 */
export function matchesFilters(
  w: FilterableWeapon,
  c: FilterCriteria,
  bounds: RangeValue,
): boolean {
  if (c.cats.size > 0 && !c.cats.has(w.category)) return false;
  if (c.subIds.size > 0 && !c.subIds.has(w.subId)) return false;
  if (c.specialIds.size > 0 && !c.specialIds.has(w.specialId)) return false;
  if (isRangeLimited(c.range, bounds)) {
    if (w.range === null || w.range < c.range.min || w.range > c.range.max) return false;
  }
  return true;
}

/** 射程刻度參考(絕對值語意:近/中/遠);此為唯一基準,列表頁與隨機器共用。 */
const RANGE_MARK_DEFS = [
  { value: 30, key: 'rangeNear' },
  { value: 62, key: 'rangeMid' },
  { value: 85, key: 'rangeFar' },
] as const;

/** 刻度的 i18n key(供呼叫端以對應 namespace 的 t 解析 label)。 */
export type RangeMarkKey = (typeof RANGE_MARK_DEFS)[number]['key'];

/** 由軌道邊界 + label 解析器產出可顯示刻度;落在 bounds 外者過濾掉。 */
export function buildRangeMarks(
  bounds: RangeValue,
  label: (key: RangeMarkKey) => string,
): RangeMark[] {
  return RANGE_MARK_DEFS.filter(
    (m) => m.value >= bounds.min && m.value <= bounds.max,
  ).map((m) => ({ value: m.value, label: label(m.key) }));
}
