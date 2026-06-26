/**
 * weapons.ts — 武器資料存取層(把 Phase 0 的快照 JSON 接成型別化、locale 感知的 app 資料)。
 *
 * 快照與名稱表為 build 時匯入的靜態資料(規格 §5.2:SSG);此模組只負責「讀取與解析」,
 * 不含任何抓取/轉換邏輯(那是 scripts/ 的職責)。
 */

import snapshotJson from './weapons.snapshot.json';
import subSpecialJson from './sub-special.json';
import type {
  SnapshotLocale,
  WeaponCategory,
  WeaponSnapshot,
  WeaponSnapshotEntry,
} from './schema';
import { WEAPON_CATEGORIES } from './schema';

const snapshot = snapshotJson as unknown as WeaponSnapshot;

interface RefEntry {
  names: Record<SnapshotLocale, string>;
  blurb: Record<SnapshotLocale, string>;
  /** §4.3.1 opt-in:Leanny subspe 圖示檔名參照(非圖檔本體);無對應圖時為 null。 */
  iconName: string | null;
}
interface SubSpecialTables {
  subWeapons: Record<string, RefEntry>;
  specialWeapons: Record<string, RefEntry>;
}
const subSpecial = subSpecialJson as unknown as SubSpecialTables;

export const weapons: readonly WeaponSnapshotEntry[] = snapshot.weapons;
export const snapshotMeta = snapshot.meta;
export { WEAPON_CATEGORIES };
export type { WeaponSnapshotEntry, WeaponCategory, SnapshotLocale };

const byId = new Map(weapons.map((w) => [w.id, w]));

/** 以 id 取單把武器(詳情頁用)。 */
export function weaponById(id: string): WeaponSnapshotEntry | undefined {
  return byId.get(id);
}

/** 主武器四語名稱(找不到語言時退回英文)。 */
export function weaponName(w: WeaponSnapshotEntry, locale: SnapshotLocale): string {
  return w.names[locale] ?? w.names.en;
}

/** 副武器名稱(以 subWeaponId 解析;找不到退回 id)。 */
export function subWeaponName(id: string, locale: SnapshotLocale): string {
  return subSpecial.subWeapons[id]?.names[locale] ?? id;
}

/** 特殊武器名稱(以 specialWeaponId 解析;找不到退回 id)。 */
export function specialWeaponName(id: string, locale: SnapshotLocale): string {
  return subSpecial.specialWeapons[id]?.names[locale] ?? id;
}

/** 副武器一行簡述。 */
export function subWeaponBlurb(id: string, locale: SnapshotLocale): string {
  return subSpecial.subWeapons[id]?.blurb[locale] ?? '';
}

/** 特殊武器一行簡述。 */
export function specialWeaponBlurb(id: string, locale: SnapshotLocale): string {
  return subSpecial.specialWeapons[id]?.blurb[locale] ?? '';
}

/** 副武器圖示檔名參照(§4.3.1);無對應圖或缺欄位時回 null。 */
export function subWeaponIconName(id: string): string | null {
  return subSpecial.subWeapons[id]?.iconName ?? null;
}

/** 特殊武器圖示檔名參照(§4.3.1);無對應圖或缺欄位時回 null。 */
export function specialWeaponIconName(id: string): string | null {
  return subSpecial.specialWeapons[id]?.iconName ?? null;
}

/** 主武器射程(遊戲內 0–100 相對值);快照缺 range 時回 null(coverage 為全覆蓋,防禦性保留)。 */
export function weaponRange(w: WeaponSnapshotEntry): number | null {
  return w.coreStats.find((s) => s.key === 'range')?.value ?? null;
}
