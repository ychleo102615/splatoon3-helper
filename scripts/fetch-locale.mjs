/**
 * fetch-locale.mjs — 抓取 splatoon3.ink 的四語 locale 名稱(資料管線 Phase 0)。
 *
 * 合規(規格 §4.1,以 splatoon3.ink 開放條件為準):
 * 1. 標註來源 splatoon3.ink            → 寫入快取 meta 與輸出檔 header。
 * 2. 抓取頻率不高於每小時一次          → 以快取時戳硬性守門:距上次抓取 < 1h 即略過,改用快取。
 * 3. 送請求時設定 User-Agent           → 由 SPLATOON3INK_UA 覆寫,預設帶產品名與用途。
 * 4. 產品免費(可自願捐款)             → 屬產品層面,非本腳本職責。
 *
 * 重要事實(2026-06 實測,寫死於註解供後人參考):
 * - splatoon3.ink 的英文 locale 代碼為 `en-US` / `en-GB`,**非** `en`(故需 app→source 對應表)。
 * - locale 的 `weapons` 區塊是「從賽程/活動 feed 衍生」的,只涵蓋近期出現過的武器
 *   (實測四語一致的武器僅約 65 把),**並非完整全武器字典**;且各語言檔可能混入
 *   同名的陳舊重複 hash id(實測 zh-TW 有 268 個 id 但僅 65 個唯一名稱)。
 * - 因此本腳本只採「四語都存在的 id 交集」作為可靠的跨語言對應集合,並回報涵蓋率。
 *
 * 產出:
 * - `.cache/splatoon3ink/<sourceLocale>.json`   原始回應(gitignore,僅作快取)。
 * - `.cache/splatoon3ink/meta.json`             各 locale 的最後抓取時戳(守門用)。
 * - `src/data/locale/weapon-names.json`         四語名稱對照表(納入版控,供 app 與快照建構使用)。
 *
 * 用法:
 *   node scripts/fetch-locale.mjs
 *   SPLATOON3INK_UA="my-app/1.0 (contact)" node scripts/fetch-locale.mjs
 *
 * 注意:本腳本刻意「不」提供繞過 1h 守門的選項,以免違反 splatoon3.ink 抓取頻率條件。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/**
 * app locale(與 src/i18n/routing.ts、schema.ts LOCALES 對齊) → splatoon3.ink source locale。
 * ja-JP / zh-TW / ko-KR 兩邊一致;英文我方用 `en`,來源端用 `en-US`(美式為預設,en-GB 差異極小)。
 */
const LOCALE_SOURCE_MAP = {
  'ja-JP': 'ja-JP',
  'zh-TW': 'zh-TW',
  en: 'en-US',
  'ko-KR': 'ko-KR',
};

/** app locale 清單(輸出以此為 key)。 */
const APP_LOCALES = Object.keys(LOCALE_SOURCE_MAP);

const BASE_URL = 'https://splatoon3.ink/data/locale';
const SOURCE_LABEL = 'splatoon3.ink';

/** 合規:抓取頻率不高於每小時一次。 */
const MIN_FETCH_INTERVAL_MS = 60 * 60 * 1000;

/** 合規:必設 User-Agent。預設不主張任何不存在的 URL,可由環境變數覆寫加上聯絡方式。 */
const USER_AGENT =
  process.env.SPLATOON3INK_UA ??
  'splatoon3-helper/0.1 (non-commercial fan tool; set SPLATOON3INK_UA to add contact)';

const CACHE_DIR = join(ROOT, '.cache', 'splatoon3ink');
const CACHE_META_PATH = join(CACHE_DIR, 'meta.json');
const NAMES_OUT_PATH = join(ROOT, 'src', 'data', 'locale', 'weapon-names.json');

/** 對請求之間的小延遲,對來源伺服器友善。 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * 取得單一 source locale 的原始資料:若快取在 1h 內則沿用,否則抓取並更新快取。
 * @returns {Promise<{ data: object, fromCache: boolean }>}
 */
async function getLocaleData(sourceLocale, meta) {
  const cachePath = join(CACHE_DIR, `${sourceLocale}.json`);
  const lastFetched = meta[sourceLocale]?.fetchedAt ? Date.parse(meta[sourceLocale].fetchedAt) : 0;
  const age = Date.now() - lastFetched;

  if (age < MIN_FETCH_INTERVAL_MS && existsSync(cachePath)) {
    const cached = await readJsonIfExists(cachePath);
    if (cached) {
      const mins = Math.ceil((MIN_FETCH_INTERVAL_MS - age) / 60000);
      console.log(`  [${sourceLocale}] 使用快取(${mins} 分鐘後才允許再次抓取)`);
      return { data: cached, fromCache: true };
    }
  }

  const url = `${BASE_URL}/${sourceLocale}.json`;
  console.log(`  [${sourceLocale}] 抓取 ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`抓取 ${sourceLocale} 失敗:HTTP ${res.status} ${res.statusText}`);
  }
  const data = await res.json();

  await writeJson(cachePath, data);
  meta[sourceLocale] = { fetchedAt: new Date().toISOString(), source: SOURCE_LABEL, url };
  // 立即持久化時戳:即使後續 locale 抓取失敗,1h 守門對「已抓成功」的端點仍然有效。
  await writeJson(CACHE_META_PATH, meta);
  return { data, fromCache: false };
}

/** 從 locale 原始資料抽出「localeId → 主武器名稱」表。 */
function extractWeaponNames(data) {
  const weapons = data?.weapons ?? {};
  /** @type {Record<string, string>} */
  const names = {};
  for (const [id, entry] of Object.entries(weapons)) {
    if (entry && typeof entry.name === 'string') names[id] = entry.name;
  }
  return names;
}

async function main() {
  console.log('資料來源:splatoon3.ink(規格 §4.1)');
  console.log(`User-Agent:${USER_AGENT}\n`);

  await mkdir(CACHE_DIR, { recursive: true });
  const meta = (await readJsonIfExists(CACHE_META_PATH)) ?? {};

  /** @type {Record<string, Record<string,string>>} app locale → (localeId → name) */
  const perLocale = {};
  let fetchedCount = 0;

  for (const appLocale of APP_LOCALES) {
    const sourceLocale = LOCALE_SOURCE_MAP[appLocale];
    const { data, fromCache } = await getLocaleData(sourceLocale, meta);
    if (!fromCache) fetchedCount++;

    const names = extractWeaponNames(data);
    perLocale[appLocale] = names;
    const uniqueNames = new Set(Object.values(names)).size;
    console.log(
      `  [${appLocale} ← ${sourceLocale}] id=${Object.keys(names).length} 唯一名稱=${uniqueNames}`,
    );

    if (!fromCache) await sleep(750); // 對來源友善
  }
  await writeJson(CACHE_META_PATH, meta);

  // 只採「四語都存在的 id 交集」作為可靠的跨語言對應集合。
  const idSets = APP_LOCALES.map((l) => new Set(Object.keys(perLocale[l])));
  const commonIds = [...idSets[0]]
    .filter((id) => idSets.every((s) => s.has(id)))
    .sort((a, b) => a.localeCompare(b));

  /** @type {Record<string, Record<string,string>>} localeId → { 'ja-JP', 'zh-TW', 'en' } */
  const byId = {};
  for (const id of commonIds) {
    byId[id] = Object.fromEntries(APP_LOCALES.map((l) => [l, perLocale[l][id]]));
  }

  await writeJson(NAMES_OUT_PATH, {
    _source: SOURCE_LABEL,
    _note:
      '主武器四語名稱(localeId → { ja-JP, zh-TW, en, ko-KR }),取自 splatoon3.ink locale 的 weapons 區塊,僅含四語皆存在的 id 交集;不含數值。',
    _coverageWarning:
      'splatoon3.ink locale 的 weapons 為賽程/活動 feed 衍生,僅涵蓋近期出現過的武器,並非完整全武器字典;涵蓋的武器數會隨時間變動。',
    _generatedAt: new Date().toISOString(),
    _localeSourceMap: LOCALE_SOURCE_MAP,
    coverage: { commonWeaponIds: commonIds.length },
    names: byId,
  });

  console.log(
    `\n完成。本次實際抓取 ${fetchedCount} / ${APP_LOCALES.length} 個 locale。` +
      `\n四語一致的武器 id = ${commonIds.length} 筆 → ${NAMES_OUT_PATH.replace(ROOT + '/', '')}`,
  );
  console.log(
    '注意:此數量遠少於完整全武器roster,因 splatoon3.ink locale 僅含近期 feed 出現的武器(見輸出檔 _coverageWarning)。',
  );
}

main().catch((err) => {
  console.error('\n資料管線失敗:', err.message);
  process.exitCode = 1;
});
