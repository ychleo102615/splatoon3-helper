/**
 * weaponFilters.ts — 武器篩選的「行為層」單一事實來源(列表頁 + 隨機器共用)。
 *
 * 這裡只放**純函式 / 純資料**:不持有 state、不碰 i18n、不依賴 React。
 * UI 的狀態編排(列表頁單一狀態 vs 隨機器多槽、搜尋 vs 去重)各自留在元件內——
 * 那些本就不同形,不該硬抽;真正該共用的是「篩選規則語意」與「射程刻度基準」,即本檔。
 */

import type { RangeValue, RangeMark } from '@/components/RangeSlider';
import type { WeaponCategory } from '@/data/schema';

/**
 * 三個「有在篩」的角色:
 *  - 'AND' = 必須是(正向交集:所有「必須是」維度都得命中)。
 *  - 'OR'  = 可以是(正向聯集:所有「可以是」維度組成一群,至少命中一個)。
 *  - 'NOT' = 不要是(負向交集:所有「不要是」維度都不得命中;與正向群獨立疊加)。
 */
export type DimensionMode = 'AND' | 'OR' | 'NOT';

/**
 * 單一離散維度(分類 / 副 / 特殊)在合成中的「角色」。**與「已選值」解耦、獨立儲存**:
 *  - 'none' = 不限:該維度不參與篩選。切到不限**不清空**已選值(只是停用),切回時自動還原。
 *  - 'AND'  = 必須是:該維度必須符合(所有「必須是」維度取交集)。
 *  - 'OR'   = 可以是:屬「至少符合一個」的群(所有「可以是」維度取聯集)。
 *  - 'NOT'  = 不要是:值落在已選集合即淘汰(所有「不要是」維度取交集,與正向群獨立疊加)。
 * 不變量:'AND'/'OR'/'NOT' ⟹ 該維度至少有一個值(切換時自動選第一項 / 清空時自動退回 'none' 維持);
 * 「不要是」排除空集合 = 無作用,故同樣以退回 'none' 維持。
 */
export type DimensionRole = 'none' | DimensionMode;

/**
 * 單組篩選條件。維度**內**正向角色為 OR(同維度多選為聯集)、負向角色為「不在集合內」(De Morgan
 * 對偶,等於排除整個已選集合);維度**間**採「分組」語意,由各維度的 roles 決定角色,**與順序無關**:
 *   通過 ⟺ (所有「必須是」都符合) ∧ (所有「不要是」都不符合)
 *          ∧ (「可以是」群至少符合一個;該群為空則略過)。
 * 角色 'none' 或無值的維度 = 不參與。射程獨立,恆為 AND。
 */
export interface FilterCriteria {
  cats: Set<WeaponCategory>;
  subIds: Set<string>;
  specialIds: Set<string>;
  /** 射程選取區間;滿格(= bounds)代表不限。 */
  range: RangeValue;
  /** 各離散維度的角色(不限 / 必須是 / 可以是 / 不要是);與上面的已選值集合解耦。射程不在內。預設全 'none'。 */
  roles: {
    cats: DimensionRole;
    subIds: DimensionRole;
    specialIds: DimensionRole;
  };
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
 * 分類 / 副 / 特殊三個離散維度的合成判定(集合 has)。採「分組」語意,**與順序無關**:把「有在篩」
 * (角色非 'none' 且有值)的維度依角色分成必須是群 / 可以是群 / 不要是群——
 *   · 必須是群:全部命中(交集);
 *   · 可以是群:至少一個命中(該群為空則略過);
 *   · 不要是群:任一命中即淘汰(命中 = 值落在該維度排除集內),與正向群獨立疊加。
 * 三群皆空 → 不限,交由射程獨立把關。
 *
 * 註:單獨一個「可以是」維度等同必須——「至少符合一個」當群只有一員時即「符合那一個」,
 * 是聯集語意的自然結果而非套用順序所致。「必須是 S」與「不要是 S」(同維度同集合)恰為互補:
 * 前者要 v∈S、後者要 v∉S,把武器切成不相交兩半;角色為單選,故兩者永不並存於同一維度。
 */
function matchesDimensions(w: FilterableWeapon, c: FilterCriteria): boolean {
  let hasRequired = false;
  let allRequiredHit = true;
  let hasOptional = false;
  let anyOptionalHit = false;
  let excludedHit = false; // 任一「不要是」維度命中即淘汰

  const judge = (role: DimensionRole, selected: boolean, hit: boolean) => {
    if (role === 'none' || !selected) return; // 不限 或 無值:不參與任何群
    if (role === 'OR') {
      hasOptional = true;
      if (hit) anyOptionalHit = true;
    } else if (role === 'NOT') {
      if (hit) excludedHit = true; // 落在排除集 → 淘汰
    } else {
      hasRequired = true;
      if (!hit) allRequiredHit = false;
    }
  };

  judge(c.roles.cats, c.cats.size > 0, c.cats.has(w.category));
  judge(c.roles.subIds, c.subIds.size > 0, c.subIds.has(w.subId));
  judge(c.roles.specialIds, c.specialIds.size > 0, c.specialIds.has(w.specialId));

  if (excludedHit) return false; // 不要是群:任一命中即出局
  if (hasRequired && !allRequiredHit) return false; // 必須是群:全中
  if (hasOptional && !anyOptionalHit) return false; // 可以是群:至少一中
  return true;
}

/**
 * 單把武器是否通過一組條件:分類 / 副 / 特殊三維度依「分組(必須 / 任一 / 排除)」合成;
 * 射程**恆為獨立 AND 疊加**——無論維度角色為何,有設限時都必須落在區間內
 * (缺值的武器在設限時一律不符)。搜尋字串不在此處理,由呼叫端視需要另外 AND 疊加
 * (隨機器沒有搜尋,列表頁才有)。
 */
export function matchesFilters(
  w: FilterableWeapon,
  c: FilterCriteria,
  bounds: RangeValue,
): boolean {
  if (!matchesDimensions(w, c)) return false;
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
