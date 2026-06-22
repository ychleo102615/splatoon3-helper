/**
 * filterStorage.ts — 篩選條件「持久化語意」的單一事實來源(列表頁 + 隨機器共用)。
 *
 * 與 weaponFilters.ts 平權:那裡定義「條件如何篩武器」(行為層),
 * 這裡定義「條件如何安全地存進 / 還原自 localStorage」。同樣只放純函式 / 純資料,
 * 不持有 state、不碰 React、不碰 i18n。共用的單位是 FilterCriteria——
 * 各畫面的外圍記錄(列表頁多一個搜尋字串、隨機器是多槽 + 不重複)由元件自行組合。
 *
 * 還原時有兩道關卡,確保結果永遠落在「對當前快照合法」的範圍內:
 *  1. 形狀轉換:JSON 沒有 Set,存檔以 array 表示,還原時轉回 Set。
 *  2. 清洗:剔除當前快照已不存在的 id(遊戲版本更迭後的舊存檔)、把射程夾回當前軌道邊界。
 * 寧可丟棄壞值退回「不限」,也不讓殘留存檔污染篩選結果。
 */

import type { RangeValue } from '@/components/RangeSlider';
import type { FilterCriteria } from '@/components/weaponFilters';
import type { WeaponCategory } from '@/data/schema';

/**
 * localStorage key。版號隨「存檔形狀」變更而升——舊版鍵自然被忽略(讀不到新鍵),
 * 而非以舊形狀誤讀,避免跨版本的悄悄壞值。
 */
export const WEAPONS_FILTER_KEY = 'splatdex:weapons-filter:v1';
export const RANDOM_PICKER_KEY = 'splatdex:random:v1';

/** JSON 安全的條件形狀(Set 攤平為 array;射程本就是純物件)。 */
export interface StoredCriteria {
  cats: string[];
  subIds: string[];
  specialIds: string[];
  range: RangeValue;
}

/** 清洗還原值所需的「當前合法集合」:任何不在其中的 id 一律剔除,射程夾回 bounds。 */
export interface FilterOptions {
  cats: Set<WeaponCategory>;
  subIds: Set<string>;
  specialIds: Set<string>;
  bounds: RangeValue;
}

/** 只保留 allowed 內的字串成員(形狀不對則回空集合 = 不限)。 */
function sanitizeIds<T extends string>(raw: unknown, allowed: Set<T>): Set<T> {
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((v): v is T => typeof v === 'string' && allowed.has(v as T)));
}

/** 把射程夾回當前軌道邊界;形狀不對則退回「不限」(= bounds)。 */
function sanitizeRange(raw: unknown, bounds: RangeValue): RangeValue {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as RangeValue).min === 'number' &&
    typeof (raw as RangeValue).max === 'number'
  ) {
    const min = Math.min(Math.max((raw as RangeValue).min, bounds.min), bounds.max);
    const max = Math.max(Math.min((raw as RangeValue).max, bounds.max), bounds.min);
    return min <= max ? { min, max } : { ...bounds };
  }
  return { ...bounds };
}

/** FilterCriteria → JSON 安全形狀。 */
export function serializeCriteria(c: FilterCriteria): StoredCriteria {
  return {
    cats: [...c.cats],
    subIds: [...c.subIds],
    specialIds: [...c.specialIds],
    range: c.range,
  };
}

/** JSON 還原值 → 對當前快照清洗過的 FilterCriteria(任一欄壞掉只影響該維度,退回不限)。 */
export function deserializeCriteria(raw: unknown, options: FilterOptions): FilterCriteria {
  const o = (raw ?? {}) as Partial<StoredCriteria>;
  return {
    cats: sanitizeIds(o.cats, options.cats),
    subIds: sanitizeIds(o.subIds, options.subIds),
    specialIds: sanitizeIds(o.specialIds, options.specialIds),
    range: sanitizeRange(o.range, options.bounds),
  };
}
