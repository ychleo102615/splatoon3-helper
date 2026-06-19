/**
 * 武器官方圖示設定(規格 §4.3.1 opt-in 例外)。
 *
 * 合規界線(預設關閉、不入庫、執行時外部載入):
 * - 預設 / 未設環境變數 → 一律關閉;UI 不顯示任何官方圖,版面與「全自繪」狀態一致。
 * - 啟用時才於執行時自 base URL hotlink 外部圖檔(預設 Leanny weapon_flat);repo 僅存檔名參照(snapshot 的 iconName)。
 * - 開啟此 flag = 在自己的部署散布官方美術,合規風險由「開啟者自負」(見規格 §4.3.1 / CLAUDE.md)。
 *
 * 以 NEXT_PUBLIC_ 前綴,讓 server component 與 client component('use client')取得一致的 build-time inlined 值。
 */

/** 主武器圖示外部來源的預設 base URL(數值同源 Leanny,§4.2 / §4.3.1)。 */
const DEFAULT_ICON_BASE_URL = 'https://leanny.github.io/splat3/images/weapon_flat';

/** 副 / 特殊武器圖示外部來源的預設 base URL(Leanny subspe;§4.3.1)。 */
const DEFAULT_SUBSPE_BASE_URL = 'https://leanny.github.io/splat3/images/subspe';

/** 是否啟用官方武器圖示(預設關閉;唯有環境變數明確設為 'on' 才開啟;主武器與副/特殊共用此開關)。 */
export const weaponIconsEnabled = process.env.NEXT_PUBLIC_WEAPON_ICONS === 'on';

/** 主武器圖示外部來源 base URL(可換來源 / 自架鏡像);未設則用預設 Leanny weapon_flat。 */
export const weaponIconBaseUrl =
  process.env.NEXT_PUBLIC_WEAPON_ICON_BASE_URL ?? DEFAULT_ICON_BASE_URL;

/** 副 / 特殊武器圖示外部來源 base URL(可換來源 / 自架鏡像);未設則用預設 Leanny subspe。 */
export const weaponIconSubspeBaseUrl =
  process.env.NEXT_PUBLIC_WEAPON_ICON_SUBSPE_BASE_URL ?? DEFAULT_SUBSPE_BASE_URL;

/**
 * 由 snapshot 的 `iconName` 參照組出可載入的圖示 URL。
 * 僅在「已啟用」且「iconName 非空」時回傳 URL,否則回 `null`
 * (呼叫端據此不渲染圖示、維持原有版面)。
 */
export function weaponIconUrl(iconName: string | null | undefined): string | null {
  if (!weaponIconsEnabled || !iconName) return null;
  return `${weaponIconBaseUrl.replace(/\/$/, '')}/${iconName}`;
}

/**
 * 由 sub-special 的 `iconName` 參照組出副 / 特殊武器圖示 URL。
 * 同樣受 `weaponIconsEnabled` 控制;未啟用或 iconName 為空時回 `null`。
 */
export function subspeIconUrl(iconName: string | null | undefined): string | null {
  if (!weaponIconsEnabled || !iconName) return null;
  return `${weaponIconSubspeBaseUrl.replace(/\/$/, '')}/${iconName}`;
}
