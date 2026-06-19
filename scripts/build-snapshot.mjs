/**
 * build-snapshot.mjs — 產出全 roster 武器快照 JSON(資料管線 Phase 0,bullet 3)。
 *
 * 輸入(皆由 fetch-leanny.mjs / fetch-locale.mjs 先備妥):
 * - .cache/leanny/<ver>/WeaponInfoMain.json、WeaponInfoSub.json、WeaponInfoSpecial.json
 * - .cache/leanny/<ver>/language/<JPja|TWzh|USen>.json
 * - .cache/leanny/<ver>/weapon/<actor>.game__GameParameterTable.json(+ weapon-param-map.json)
 * - src/data/locale/weapon-names.json(splatoon3.ink 開放名稱,優先採用)
 *
 * 產出(納入版控):
 * - src/data/weapons.snapshot.json   全 roster 武器快照(自有 schema,規格 §4.2)
 * - src/data/sub-special.json        副/特殊武器三語名稱 + 一行簡述(規格 §3.1)
 *
 * 合規(規格 §4):名稱優先 splatoon3.ink(§4.1)、缺者以 Leanny 補(§4.2,事實性數據立場);
 * 數值僅取來源確有的欄位、轉為自有單位、附 gameVersion 快照標註(§4.5);標明非官方(§4.4)。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCoreStats, PREFIX_TO_CATEGORY } from './lib/extract-stats.mjs';
import { gymlBasename } from './fetch-leanny.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEANNY_LANG = { 'ja-JP': 'JPja', 'zh-TW': 'TWzh', en: 'USen' };
const APP_LOCALES = ['ja-JP', 'zh-TW', 'en'];

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Leanny 內部 id → 我方 kebab-case 語意 id(處理底線與 camelCase)。 */
const kebab = (s) =>
  s
    .replace(/_/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

/** Leanny 版本碼 → 點分遊戲版本(末位=patch、次末=minor、其餘=major)。例:1120→11.2.0。 */
function dottedVersion(code) {
  const s = String(code);
  return `${s.slice(0, -2)}.${s.slice(-2, -1)}.${s.slice(-1)}`;
}

/** 去除遊戲文字標記([color=..]/[group=.. params=..] 等)與換行,作為一行簡述。 */
function cleanBlurb(text) {
  return (text ?? '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function main() {
  const fetched = readJson(join(ROOT, '.cache', 'leanny', 'fetched.json'));
  const ver = fetched.version;
  const verDir = join(ROOT, '.cache', 'leanny', ver);

  const main = readJson(join(verDir, 'WeaponInfoMain.json'));
  const paramMap = readJson(join(verDir, 'weapon-param-map.json'));

  // 武器圖示「檔名參照」(規格 §4.3.1 opt-in 例外):以原始 __RowId 對 weapon_flat 檔名清單比對。
  // 僅存「檔名字串」(metadata),不下載/不入庫任何圖檔;執行時是否載入由 app 端環境變數決定。
  const flatFile = join(verDir, 'weapon-flat-files.json');
  const flatSet = existsSync(flatFile) ? new Set(readJson(flatFile)) : new Set();
  /** __RowId → Leanny weapon_flat 檔名(如 Path_Wst_Blaster_Light_00.png);找不到對應圖回 null。 */
  const resolveIconName = (rowId) => {
    const candidate = `Path_Wst_${rowId}.png`;
    return flatSet.has(candidate) ? candidate : null;
  };

  // 語言檔(三語各取武器相關區塊)。
  const lang = {};
  for (const loc of APP_LOCALES) {
    const L = readJson(join(verDir, 'language', `${LEANNY_LANG[loc]}.json`));
    lang[loc] = {
      main: L['CommonMsg/Weapon/WeaponName_Main'] ?? {},
      sub: L['CommonMsg/Weapon/WeaponName_Sub'] ?? {},
      special: L['CommonMsg/Weapon/WeaponName_Special'] ?? {},
      subExp: L['CommonMsg/Weapon/WeaponExp_Sub'] ?? {},
      specialExp: L['CommonMsg/Weapon/WeaponExp_Special'] ?? {},
    };
  }

  // splatoon3.ink 開放名稱:以英文名建反查(優先採用,規格 §4.1)。
  const inkFile = join(ROOT, 'src', 'data', 'locale', 'weapon-names.json');
  const inkByEn = new Map();
  if (existsSync(inkFile)) {
    const ink = readJson(inkFile).names ?? {};
    for (const [hashId, names] of Object.entries(ink)) {
      if (names.en) inkByEn.set(names.en, { hashId, names });
    }
  }

  // 參數檔讀取(快取於 Map)。
  const gpCache = new Map();
  const loadGP = (actor) => {
    const file = paramMap[actor];
    if (!file) return null;
    if (!gpCache.has(file)) gpCache.set(file, readJson(join(verDir, 'weapon', file)).GameParameters);
    return gpCache.get(file);
  };

  const versus = main.filter((w) => w.Type === 'Versus');
  const weapons = [];
  const usedSub = new Set();
  const usedSpecial = new Set();
  let inkMatched = 0;

  for (const w of versus) {
    const prefix = w.__RowId.split('_')[0];
    const category = PREFIX_TO_CATEGORY[prefix];
    if (!category) {
      console.warn(`  ⚠ 未知分類前綴 ${prefix}(${w.__RowId}),略過`);
      continue;
    }

    const subId = gymlBasename(w.SubWeapon);
    const specialId = gymlBasename(w.SpecialWeapon);
    if (subId) usedSub.add(subId);
    if (specialId) usedSpecial.add(specialId);

    // 名稱:預設 Leanny;若 splatoon3.ink 有同名則改採其名並標來源。
    const leannyNames = Object.fromEntries(
      APP_LOCALES.map((loc) => [loc, lang[loc].main[w.__RowId] ?? '']),
    );
    let names = leannyNames;
    let nameSource = 'leanny';
    let localeId = null;
    const inkHit = leannyNames.en && inkByEn.get(leannyNames.en);
    if (inkHit) {
      names = inkHit.names;
      nameSource = 'splatoon3.ink';
      localeId = inkHit.hashId;
      inkMatched++;
    }

    // 數值:range(UIParam 0–100)+ 逐分類 damage/ink/cadence。
    const coreStats = [];
    const rangeUI = (w.UIParam ?? []).find((u) => u.Type === 'Range');
    if (rangeUI && Number.isFinite(rangeUI.Value)) {
      coreStats.push({ key: 'range', value: rangeUI.Value, unit: 'relative' });
    }
    coreStats.push(...extractCoreStats(category, loadGP(gymlBasename(w.SpecActor))));

    weapons.push({
      id: kebab(w.__RowId),
      category,
      subWeaponId: kebab(subId),
      specialWeaponId: kebab(specialId),
      season: w.Season ?? 0,
      names,
      nameSource,
      localeId,
      iconName: resolveIconName(w.__RowId),
      coreStats,
      gearEffects: [],
    });
  }

  weapons.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));

  // coverage:各 coreStat key 的輸出筆數,另加 iconName 命中數(§4.3.1)。
  const coverage = {};
  for (const wpn of weapons) {
    for (const s of wpn.coreStats) coverage[s.key] = (coverage[s.key] ?? 0) + 1;
  }
  coverage.iconName = weapons.filter((w) => w.iconName).length;

  const snapshot = {
    meta: {
      gameVersion: dottedVersion(ver),
      dataVersionCode: ver,
      generatedAt: new Date().toISOString(),
      nameSource: `splatoon3.ink 優先(${inkMatched}/${weapons.length} 把),其餘取自 Leanny 語言檔`,
      statSource: 'Leanny 遊戲參數(事實性數據立場,自建 schema,不照抄其結構);damage 內部值÷10、ink×100、cadence 為幀',
      iconSource:
        'iconName 為 Leanny weapon_flat 檔名參照(規格 §4.3.1 opt-in 例外);僅存字串、不含圖檔本體,執行時是否載入由 NEXT_PUBLIC_WEAPON_ICONS 控制',
      disclaimer: '非官方工具,與任天堂無關。名稱資料來源 splatoon3.ink。',
      coverage,
    },
    weapons,
  };
  writeFileSync(
    join(ROOT, 'src', 'data', 'weapons.snapshot.json'),
    JSON.stringify(snapshot, null, 2) + '\n',
  );

  // 副/特殊武器名稱 + 一行簡述(規格 §3.1)。
  const buildRefTable = (ids, nameKey, expKey) => {
    const out = {};
    for (const rowId of [...ids].sort()) {
      out[kebab(rowId)] = {
        names: Object.fromEntries(APP_LOCALES.map((loc) => [loc, lang[loc][nameKey][rowId] ?? ''])),
        blurb: Object.fromEntries(
          APP_LOCALES.map((loc) => [loc, cleanBlurb(lang[loc][expKey][rowId])]),
        ),
      };
    }
    return out;
  };
  const subSpecial = {
    _source: 'Leanny 語言檔(WeaponName_Sub/Special、WeaponExp_Sub/Special)',
    _note: '副/特殊武器三語名稱與一行簡述;key 為快照中的 subWeaponId / specialWeaponId。',
    subWeapons: buildRefTable(usedSub, 'sub', 'subExp'),
    specialWeapons: buildRefTable(usedSpecial, 'special', 'specialExp'),
  };
  writeFileSync(join(ROOT, 'src', 'data', 'sub-special.json'), JSON.stringify(subSpecial, null, 2) + '\n');

  // 報告。
  console.log(`遊戲版本(快照標註):${snapshot.meta.gameVersion}(Leanny code ${ver})`);
  console.log(`武器數:${weapons.length}(splatoon3.ink 命名 ${inkMatched}、Leanny 補 ${weapons.length - inkMatched})`);
  console.log(`副武器 ${usedSub.size} 種、特殊武器 ${usedSpecial.size} 種`);
  console.log('coreStat 涵蓋率:', coverage);
  console.log(`圖示檔名參照(§4.3.1,僅字串):${coverage.iconName}/${weapons.length} 命中 weapon_flat`);
  console.log('→ src/data/weapons.snapshot.json、src/data/sub-special.json');
}

main();
