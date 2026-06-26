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
import type { FilterCriteria, DimensionRole } from '@/components/weaponFilters';
import type { WeaponCategory } from '@/data/schema';

/**
 * localStorage key。版號隨「存檔形狀」變更而升——舊版鍵自然被忽略(讀不到新鍵),
 * 而非以舊形狀誤讀,避免跨版本的悄悄壞值。
 */
export const WEAPONS_FILTER_KEY = 'splatdex:weapons-filter:v1';
export const RANDOM_PICKER_KEY = 'splatdex:random:v1';

/**
 * 隨機器「最近一次抽選結果」存檔。與 RANDOM_PICKER_KEY(設定)分鍵:結果是「抽到了什麼」、
 * 設定是「要從哪裡抽」,兩者生命週期獨立——改條件不動結果,清結果不動條件(同 open 偏好分鍵之理)。
 * 只存武器 id 陣列(非整個物件):還原時對當前快照 / 語系重新解析名稱,缺值的 id 視為空槽。
 * 只留最近一筆、跨次抽選互不參考,§3.2 的「無狀態純抽選」不變量不受影響。
 */
export const RANDOM_RESULT_KEY = 'splatdex:random-result:v1';

/**
 * 列表頁篩選面板的展開 / 收合(簡化模式)偏好。獨立於條件存檔:它是「介面音量」
 * 而非篩選語意,變更不該動到條件版號,反之亦然。預設展開(= 沿用原本的完整檢視)。
 */
export const WEAPONS_FILTERS_OPEN_KEY = 'splatdex:weapons-filters-open:v1';

/** JSON 安全的條件形狀(Set 攤平為 array;射程與 roles 本就是純物件 / 字面量)。 */
export interface StoredCriteria {
  cats: string[];
  subIds: string[];
  specialIds: string[];
  range: RangeValue;
  /** 各維度角色(不限 / 必須是 / 可以是),與已選值解耦獨立存。 */
  roles: { cats: DimensionRole; subIds: DimensionRole; specialIds: DimensionRole };
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

/**
 * 還原單一維度角色,維持「'AND'/'OR'/'NOT' ⟹ 至少一個值」的不變量:
 *  - 無值(valuesSize 0)→ 一律 'none'(不限);涵蓋舊存檔的空維度與防呆。
 *  - 有值 → 沿用存的角色;舊存檔無角色欄位(壞值 / 缺值)→ 'AND'(沿用舊「必須」預設)。
 * 注意「有值 + 角色 'none'」是合法的「停用但記住」狀態,故有值時不強制覆寫角色。
 * 舊存檔不含 'NOT',不需遷移;新增 'NOT' 僅是放行新值。
 */
function reconstructRole(raw: unknown, valuesSize: number): DimensionRole {
  if (valuesSize === 0) return 'none';
  return raw === 'none' || raw === 'AND' || raw === 'OR' || raw === 'NOT' ? raw : 'AND';
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
    roles: { ...c.roles },
  };
}

/** JSON 還原值 → 對當前快照清洗過的 FilterCriteria(任一欄壞掉只影響該維度,退回不限)。 */
export function deserializeCriteria(raw: unknown, options: FilterOptions): FilterCriteria {
  const o = (raw ?? {}) as Partial<StoredCriteria>;
  // 先清洗值集合,再據其「是否有值」還原角色(維持 'AND'/'OR' ⟹ 至少一個值 的不變量)。
  const cats = sanitizeIds(o.cats, options.cats);
  const subIds = sanitizeIds(o.subIds, options.subIds);
  const specialIds = sanitizeIds(o.specialIds, options.specialIds);
  const rawRoles = (o.roles ?? {}) as Partial<StoredCriteria['roles']>;
  return {
    cats,
    subIds,
    specialIds,
    range: sanitizeRange(o.range, options.bounds),
    roles: {
      cats: reconstructRole(rawRoles.cats, cats.size),
      subIds: reconstructRole(rawRoles.subIds, subIds.size),
      specialIds: reconstructRole(rawRoles.specialIds, specialIds.size),
    },
  };
}
