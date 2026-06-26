/**
 * 武器快照資料 schema(自建,規格 §4.2)。
 *
 * 設計原則:
 * - **自建、不照抄 Leanny**:欄位採扁平、語意命名,不沿用 Leanny 的 key 命名與巢狀編排
 *   (規避「編輯著作權」,僅以事實性數據立場使用其數值)。
 * - **名稱與數值分離**:本快照只放「事實性數值 + 結構性 id」,四語名稱不寫進快照,
 *   改由 splatoon3.ink locale 以 `localeId` 對應解析(規格 §4.2)。
 * - **快照標註版本**:每份快照在 `meta.gameVersion` 標明其對應的遊戲版本(規格 §4.5)。
 *
 * 此檔僅定義「型別與常數」,不含任何實際數值;數值與名稱由 `scripts/` 的資料管線產出。
 */

/* -------------------------------------------------------------------------- */
/*  11 個主武器分類(規格 §3.3)                                               */
/* -------------------------------------------------------------------------- */

/** 我方自有的分類代號(語意命名);與遊戲 11 分類一對一。 */
export const WEAPON_CATEGORIES = [
  'shooter', // シューター / Shooter
  'blaster', // ブラスター / Blaster
  'roller', // ローラー / Roller
  'brush', // フデ / Brush
  'charger', // チャージャー / Charger
  'slosher', // スロッシャー / Slosher
  'splatling', // スピナー / Splatling
  'dualies', // マニューバー / Dualies
  'brella', // シェルター / Brella
  'stringer', // ストリンガー / Stringer
  'splatana', // ワイパー / Splatana
] as const;

export type WeaponCategory = (typeof WEAPON_CATEGORIES)[number];

/* -------------------------------------------------------------------------- */
/*  戰鬥數值:精簡核心子集(規格 §3.1 / §4.2)                                 */
/* -------------------------------------------------------------------------- */

/**
 * 核心數值四類(固定呈現,其餘參數日後擴充):
 * - `damage`         傷害(可能多段,以多筆 `CoreStat` + `label` 表示)
 * - `range`          射程(遊戲內 0–100 相對值)
 * - `inkConsumption` 墨水消耗(每次發射占墨水槽 %)
 * - `cadence`        節奏:射手類=連射間隔;蓄力類=滿充時間;其餘取代表節奏值
 */
export const CORE_STAT_KEYS = [
  'damage',
  'range',
  'inkConsumption',
  'cadence',
] as const;

export type CoreStatKey = (typeof CORE_STAT_KEYS)[number];

/**
 * 數值單位(自有列舉,語意明確):
 * - `hp`        對玩家造成的傷害點數(玩家 100 為基準)
 * - `relative`  遊戲內 0–100 相對值(用於 range)
 * - `percent`   占墨水槽百分比(用於 inkConsumption)
 * - `frame`     幀(60fps;cadence 視分類為連射間隔或滿充)
 * - `second`    秒(cadence 以秒表示時)
 */
export type StatUnit = 'hp' | 'relative' | 'percent' | 'frame' | 'second';

/**
 * 一筆核心數值。`label` 用於同一 key 的多段(如傷害的「直擊 / 範圍」、「近 / 遠」),
 * 為自有語意標籤,於 UI 走 i18n,不寫死顯示字串。
 */
export interface CoreStat {
  key: CoreStatKey;
  /** 多段數值的語意標籤(自有);單段可省略。例:'direct' / 'splash' / 'near' / 'far'。 */
  label?: string;
  value: number;
  unit: StatUnit;
}

/* -------------------------------------------------------------------------- */
/*  裝備效益(規格 §3.1:靜態列出,不互動計算)                                */
/* -------------------------------------------------------------------------- */

/**
 * 一筆裝備效益的效果量。`key` 為自有語意鍵(對應某項裝備效益),
 * 顯示名稱走 i18n / splatoon3.ink locale,不寫死。
 */
export interface GearEffect {
  key: string;
  value: number;
  unit: StatUnit | 'multiplier';
}

/* -------------------------------------------------------------------------- */
/*  武器快照單筆(每把主武器一筆)                                             */
/* -------------------------------------------------------------------------- */

/**
 * 名稱來源(per-weapon provenance):
 * - `splatoon3.ink`:該名稱取自 splatoon3.ink 開放 locale(優先;規格 §4.1)。
 * - `leanny`:splatoon3.ink 未涵蓋,改取自 Leanny 語言檔(規格 §4.2,事實性數據立場;合規風險較高)。
 */
export type NameSource = 'splatoon3.ink' | 'leanny';

export interface WeaponSnapshotEntry {
  /** 我方自有的穩定 id(kebab-case 語意 slug,作為 app 內主鍵與 SVG / 路由對應)。 */
  id: string;
  /** 所屬分類(11 分類之一)。 */
  category: WeaponCategory;
  /** 副武器的自有 id。 */
  subWeaponId: string;
  /** 特殊武器的自有 id。 */
  specialWeaponId: string;
  /** 該武器解鎖的季節編號(Leanny Season)。 */
  season: number;
  /** 四語名稱(內嵌以利使用;規格 §4.2 的「以 id 對應」原則由 src/data/locale 名稱表另存維持)。 */
  names: Record<SnapshotLocale, string>;
  /** 名稱來源(per-weapon)。 */
  nameSource: NameSource;
  /** 若名稱取自 splatoon3.ink,對應的 locale 雜湊 id(規格 §4.2);取自 Leanny 時為 null。 */
  localeId: string | null;
  /**
   * 官方武器圖示的「檔名參照」(規格 §4.3.1 opt-in 例外):Leanny `weapon_flat` 的檔名
   * (如 `Path_Wst_Blaster_Light_00.png`),於 build 時以原始 `__RowId` 比對目錄清單產生;
   * 找不到對應圖時為 `null`。
   *
   * 合規界線:此欄位**僅為指標字串(metadata),非任天堂美術著作本體**。圖檔 PNG 一律不入庫;
   * 僅在環境變數 `NEXT_PUBLIC_WEAPON_ICONS` 開啟時,於執行時自外部 base URL hotlink(見 src/config/icons.ts)。
   */
  iconName: string | null;
  /** 精簡核心子集數值(含 range)。 */
  coreStats: CoreStat[];
  /** 各裝備效益的效果量(靜態);裝備效益曲線屬獨立資料集,Phase 0 暫為空陣列。 */
  gearEffects: GearEffect[];
}

/* -------------------------------------------------------------------------- */
/*  快照容器 + 來源/版本標註(規格 §4.1 標來源、§4.5 標版本)                  */
/* -------------------------------------------------------------------------- */

export interface WeaponSnapshotMeta {
  /** 本份數值對應的遊戲版本(快照標註,規格 §4.5);由 Leanny 版本碼推導的點分版本。 */
  gameVersion: string;
  /** Leanny 原始版本碼(如 '1120'),保留以利追溯。 */
  dataVersionCode: string;
  /** 產生時間(ISO 8601)。 */
  generatedAt: string;
  /** 名稱來源說明(規格 §4.1 優先 splatoon3.ink,缺者以 Leanny 補;per-weapon 見各筆 nameSource)。 */
  nameSource: string;
  /** 數值來源與立場註記(規格 §4.2:Leanny 事實性數據立場、自建 schema)。 */
  statSource: string;
  /** 非官方聲明(規格 §4.4)。 */
  disclaimer: string;
  /** 各 coreStat key 的涵蓋率(實際輸出筆數),透明標示資料完整度。 */
  coverage: Record<string, number>;
}

export interface WeaponSnapshot {
  meta: WeaponSnapshotMeta;
  weapons: WeaponSnapshotEntry[];
}

/* -------------------------------------------------------------------------- */
/*  名稱(由 splatoon3.ink locale 解析,與快照分離,規格 §4.2)               */
/* -------------------------------------------------------------------------- */

/** splatoon3.ink 支援且本專案採用的四語 locale 代號(與 i18n routing 對齊)。 */
export const LOCALES = ['ja-JP', 'zh-TW', 'en', 'ko-KR'] as const;
export type SnapshotLocale = (typeof LOCALES)[number];

/** 單一語言的「localeId → 名稱」對照表(取自 splatoon3.ink `weapons` 區塊)。 */
export type LocaleNameMap = Record<string, string>;

/** 四語名稱表;以 `WeaponSnapshotEntry.localeId` 對應查名。 */
export type WeaponNames = Record<SnapshotLocale, LocaleNameMap>;
