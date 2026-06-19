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

/** 主武器三語名稱(找不到語言時退回英文)。 */
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
