/**
 * fetch-leanny.mjs — 抓取並快取 Leanny 的遊戲參數資料(資料管線 Phase 0,規格 §4.2)。
 *
 * 立場(規格 §4.2 / §8):
 * - 僅以「事實性數據」立場使用 Leanny 的數值;Leanny 無明確開源授權,不主張獲得授權。
 * - 本腳本只「抓取與快取」原始檔;**不照抄其資料結構**——轉換為自有 schema 的工作在 build-snapshot.mjs。
 * - Leanny 資料以 github.io 靜態 CDN 提供且按遊戲版本固定(immutable),無 splatoon3.ink 的 1h 抓取頻率條件;
 *   已抓過的版本化檔案直接沿用快取,不重抓。
 *
 * 產出(皆 gitignore,僅作建構輸入):
 * - `.cache/leanny/versions.json`
 * - `.cache/leanny/<ver>/WeaponInfoMain.json`、`WeaponInfoSub.json`、`WeaponInfoSpecial.json`
 * - `.cache/leanny/<ver>/language/<JPja|TWzh|USen>.json`
 * - `.cache/leanny/<ver>/weapon/<SpecActor>.game__GameParameterTable.json`(各對戰本體一份)
 *
 * 用法:node scripts/fetch-leanny.mjs
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const BASE = 'https://leanny.github.io/splat3';
const CACHE_DIR = join(ROOT, '.cache', 'leanny');

const USER_AGENT =
  process.env.SPLATOON3INK_UA ??
  'splatoon3-helper/0.1 (non-commercial fan tool; set SPLATOON3INK_UA to add contact)';

/** 本專案三語 → Leanny 語言檔名。 */
export const LEANNY_LANG_FILES = { 'ja-JP': 'JPja', 'zh-TW': 'TWzh', en: 'USen' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`抓取失敗 ${url}:HTTP ${res.status}`);
  return res.text();
}

/** 抓取文字;404 回 null(供參數檔 fallback 解析用),其餘錯誤照拋。 */
async function fetchTextAllowMissing(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`抓取失敗 ${url}:HTTP ${res.status}`);
  return res.text();
}

/**
 * kit 變體(_Cstm / _Cstm2 / _O)常無獨立參數檔,與本體共用主武器數值。
 * 回傳由特定到一般的候選 actor 名稱(去後綴)。
 */
export function actorParamCandidates(actor) {
  const candidates = [actor];
  const stripped = actor.replace(/_(Cstm2|Cstm|O)$/, '');
  if (stripped !== actor) candidates.push(stripped);
  return candidates;
}

/** 抓取並快取單一檔案;已存在於快取則沿用(版本化檔案 immutable)。 */
async function cacheFile(url, cachePath, { force = false } = {}) {
  if (!force && existsSync(cachePath)) return JSON.parse(await readFile(cachePath, 'utf8'));
  const text = await fetchText(url);
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, text, 'utf8');
  await sleep(120); // 對 CDN 友善
  return JSON.parse(text);
}

/** WeaponInfoMain 的 SpecActor / SubWeapon / SpecialWeapon 皆為 gyml 路徑,取其 basename 作為 id。 */
export function gymlBasename(path) {
  if (!path) return '';
  const file = path.split('/').pop() ?? '';
  return file.split('.')[0]; // 去掉 .engine__... / .spl__... 等副檔
}

async function main() {
  console.log('資料來源:Leanny(規格 §4.2,事實性數據立場)');
  console.log(`User-Agent:${USER_AGENT}\n`);
  await mkdir(CACHE_DIR, { recursive: true });

  // 1) 版本:取清單最後一個為最新。
  const versions = await cacheFile(`${BASE}/versions.json`, join(CACHE_DIR, 'versions.json'), {
    force: true,
  });
  const ver = versions[versions.length - 1];
  console.log(`最新資料版本(Leanny code):${ver}\n`);
  const verDir = join(CACHE_DIR, ver);

  // 2) 武器主/副/特殊資訊。
  console.log('抓取 WeaponInfo*…');
  const main = await cacheFile(`${BASE}/data/mush/${ver}/WeaponInfoMain.json`, join(verDir, 'WeaponInfoMain.json'));
  await cacheFile(`${BASE}/data/mush/${ver}/WeaponInfoSub.json`, join(verDir, 'WeaponInfoSub.json'));
  await cacheFile(`${BASE}/data/mush/${ver}/WeaponInfoSpecial.json`, join(verDir, 'WeaponInfoSpecial.json'));

  // 3) 三語言檔。
  console.log('抓取語言檔…');
  for (const code of Object.values(LEANNY_LANG_FILES)) {
    await cacheFile(`${BASE}/data/language/${code}.json`, join(verDir, 'language', `${code}.json`));
  }

  // 4) 對戰武器的參數檔(以 SpecActor basename 去重);kit 變體無獨立檔時退回本體。
  const versus = main.filter((w) => w.Type === 'Versus');
  const specActors = [...new Set(versus.map((w) => gymlBasename(w.SpecActor)).filter(Boolean))];
  console.log(`解析 ${specActors.length} 個對戰本體參數檔(共 ${versus.length} 把對戰武器)…`);

  /** @type {Record<string,string|null>} specActor → 實際提供數值的參數檔名(或 null=找不到) */
  const paramMap = {};
  let n = 0;
  for (const actor of specActors) {
    let resolved = null;
    for (const cand of actorParamCandidates(actor)) {
      const file = `${cand}.game__GameParameterTable.json`;
      const cachePath = join(verDir, 'weapon', file);
      if (existsSync(cachePath)) {
        resolved = file;
        break;
      }
      const text = await fetchTextAllowMissing(`${BASE}/data/parameter/${ver}/weapon/${file}`);
      if (text !== null) {
        await mkdir(dirname(cachePath), { recursive: true });
        await writeFile(cachePath, text, 'utf8');
        await sleep(120);
        resolved = file;
        break;
      }
    }
    paramMap[actor] = resolved;
    if (resolved === null) console.warn(`  ⚠ 找不到 ${actor} 的參數檔(數值將留空)`);
    if (++n % 20 === 0) console.log(`  …${n}/${specActors.length}`);
  }
  await writeFile(join(verDir, 'weapon-param-map.json'), JSON.stringify(paramMap, null, 2), 'utf8');

  await writeFile(
    join(CACHE_DIR, 'fetched.json'),
    JSON.stringify({ version: ver, fetchedAt: new Date().toISOString(), source: 'leanny.github.io/splat3' }, null, 2),
    'utf8',
  );
  console.log(`\n完成。版本 ${ver} 已快取於 .cache/leanny/${ver}/`);
}

// 僅在直接執行時跑 main;被 import 時只匯出工具函式。
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('\nLeanny 抓取失敗:', err.message);
    process.exitCode = 1;
  });
}
