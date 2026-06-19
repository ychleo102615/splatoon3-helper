/**
 * extract-stats.mjs — 從 Leanny 武器參數(GameParameters)抽出精簡核心子集數值。
 *
 * 立場與作法(規格 §4.2、反幻覺原則):
 * - 只輸出能在來源「指名某欄位」取得的數值;指不到欄位則該數值留空(coverage 標記 false),**絕不臆造**。
 * - 數值單位轉換為自有語意:
 *     damage         遊戲內部值 ÷ 10 = HP(已用 .52加侖=52.0、斯普拉射擊槍=36.0 等已知值校驗 ÷10 慣例)
 *     inkConsumption 占墨水槽比例 × 100 = 百分比
 *     cadence        幀(60fps);依分類為連射間隔或滿充時間,以 label 標明其語意
 * - 每筆數值附 `label`(自有語意標籤,經 i18n 顯示):明確標示該數字「代表什麼」,
 *   避免把單一來源欄位誤稱為該分類的「唯一節奏/傷害」。
 * - range 不在參數檔,改由 WeaponInfoMain.UIParam(遊戲內 0–100)取得,於 build-snapshot 併入。
 *
 * 每個抽取器回傳 CoreStat[](對應 src/data/schema.ts 的 CoreStat)。
 */

/** 內部值 → HP。 */
const hp = (v) => (Number.isFinite(v) ? Math.round((v / 10) * 100) / 100 : null);
/** 比例 → 百分比。 */
const pct = (v) => (Number.isFinite(v) ? Math.round(v * 100 * 100) / 100 : null);

/**
 * 安全推入一筆數值:僅收「有限且 > 0」的值。
 * 本四項核心數值(damage/range/ink/cadence)不存在語意上的 0;參數檔中的 0 多為「未覆寫、沿用引擎預設」,
 * 讀不到真實值故略過(反幻覺:不以預設值臆造)。
 */
function push(list, key, label, value, unit) {
  if (Number.isFinite(value) && value > 0) list.push({ key, label, value, unit });
}

/** 共用:射手系 DamageParam(ValueMax 近 / ValueMin 遠)。 */
function shooterLikeDamage(out, dmg) {
  if (!dmg) return;
  push(out, 'damage', 'near', hp(dmg.ValueMax), 'hp');
  if (dmg.ValueMin !== dmg.ValueMax) push(out, 'damage', 'far', hp(dmg.ValueMin), 'hp');
}

/** 共用:roller / brush 揮甩 UnitGroup 的 Inside 傷害(近 max / 遠 min)。 */
function flingDamage(out, unitGroup) {
  const d = unitGroup?.DamageParam?.Inside;
  if (!d) return;
  push(out, 'damage', 'flingNear', hp(d.DamageMaxValue), 'hp');
  push(out, 'damage', 'flingFar', hp(d.DamageMinValue ?? d.FinalDamageMinValue), 'hp');
}

/**
 * 各分類抽取器:輸入 GameParameters,輸出 CoreStat[](不含 range)。
 * key 為我方分類代號(對應 schema.WEAPON_CATEGORIES)。
 */
export const EXTRACTORS = {
  shooter(gp) {
    const out = [];
    shooterLikeDamage(out, gp.DamageParam);
    push(out, 'inkConsumption', 'perShot', pct(gp.WeaponParam?.InkConsume), 'percent');
    push(out, 'cadence', 'fireInterval', gp.WeaponParam?.RepeatFrame, 'frame');
    return out;
  },

  blaster(gp) {
    const out = [];
    push(out, 'damage', 'direct', hp(gp.DamageParam?.ValueMax), 'hp');
    // 爆炸:DistanceDamage 陣列第一筆為最近(最高)爆風傷害。
    const blast = gp.BlastParam?.DistanceDamage?.[0]?.Damage;
    push(out, 'damage', 'blast', hp(blast), 'hp');
    push(out, 'inkConsumption', 'perShot', pct(gp.WeaponParam?.InkConsume), 'percent');
    push(out, 'cadence', 'fireInterval', gp.WeaponParam?.RepeatFrame, 'frame');
    return out;
  },

  roller(gp) {
    const out = [];
    flingDamage(out, gp.VerticalSwingUnitGroupParam);
    const swing = gp.WeaponVerticalSwingParam;
    push(out, 'inkConsumption', 'perSwing', pct(swing?.InkConsume), 'percent');
    push(out, 'cadence', 'swingInterval', swing?.SwingFrame, 'frame');
    return out;
  },

  brush(gp) {
    const out = [];
    flingDamage(out, gp.SwingUnitGroupParam);
    const swing = gp.WeaponSwingParam;
    push(out, 'inkConsumption', 'perSwing', pct(swing?.InkConsume), 'percent');
    push(out, 'cadence', 'swingInterval', swing?.SwingFrame, 'frame');
    return out;
  },

  charger(gp) {
    const out = [];
    const dmg = gp.DamageParam;
    push(out, 'damage', 'tap', hp(dmg?.ValueMinCharge), 'hp');
    push(out, 'damage', 'fullCharge', hp(dmg?.ValueFullCharge ?? dmg?.ValueMaxCharge), 'hp');
    push(out, 'inkConsumption', 'perFullCharge', pct(gp.WeaponParam?.InkConsumeFullCharge), 'percent');
    push(out, 'cadence', 'fullChargeTime', gp.WeaponParam?.ChargeFrameFullCharge, 'frame');
    return out;
  },

  slosher(gp) {
    const out = [];
    const d = gp.UnitGroupParam?.Unit?.[0]?.DamageParam;
    push(out, 'damage', 'near', hp(d?.ValueMax), 'hp');
    if (d && d.ValueMin !== d.ValueMax) push(out, 'damage', 'far', hp(d.ValueMin), 'hp');
    push(out, 'inkConsumption', 'perSlosh', pct(gp.WeaponParam?.InkConsume), 'percent');
    push(out, 'cadence', 'sloshInterval', gp.WeaponParam?.RepeatFrame, 'frame');
    return out;
  },

  splatling(gp) {
    const out = [];
    shooterLikeDamage(out, gp.DamageParam);
    // InkConsume 為旋轉系的墨水消耗欄位;以 label 標明對應一次蓄力噴發。
    push(out, 'inkConsumption', 'perFullCharge', pct(gp.WeaponParam?.InkConsume), 'percent');
    push(out, 'cadence', 'fullChargeTime', gp.WeaponParam?.ChargeFrame_Second, 'frame');
    return out;
  },

  dualies(gp) {
    const out = [];
    shooterLikeDamage(out, gp.DamageParam);
    push(out, 'inkConsumption', 'perShot', pct(gp.WeaponParam?.InkConsume), 'percent');
    push(out, 'cadence', 'fireInterval', gp.WeaponParam?.RepeatFrame, 'frame');
    return out;
  },

  brella(gp) {
    const out = [];
    // 散彈:GroupParams 各彈丸 DamageParam(取第一群代表單發彈丸近/遠)。
    const pellet = gp['spl__BulletShelterShotgunParam']?.GroupParams?.[0]?.DamageParam;
    push(out, 'damage', 'pelletNear', hp(pellet?.ValueMax), 'hp');
    if (pellet && pellet.ValueMin !== pellet.ValueMax) push(out, 'damage', 'pelletFar', hp(pellet.ValueMin), 'hp');
    const wp = gp['spl__WeaponShelterShotgunParam'];
    push(out, 'inkConsumption', 'perShot', pct(wp?.InkConsume), 'percent');
    push(out, 'cadence', 'fireInterval', wp?.RepeatFrame, 'frame');
    return out;
  },

  stringer(gp) {
    const out = [];
    const d = gp['spl__BulletStringerParam']?.DamageParam;
    push(out, 'damage', 'directMax', hp(d?.DirectHitDamageMax), 'hp');
    if (d && d.DirectHitDamageMin !== d.DirectHitDamageMax)
      push(out, 'damage', 'directMin', hp(d.DirectHitDamageMin), 'hp');
    const charge = gp['spl__WeaponStringerParam']?.ChargeParam;
    push(out, 'inkConsumption', 'perFullCharge', pct(charge?.InkConsumeFullCharge), 'percent');
    push(out, 'cadence', 'fullChargeTime', charge?.ChargeFrameFullCharge, 'frame');
    return out;
  },

  splatana(gp) {
    const out = [];
    // 縱向快速揮砍命中傷害 + 蓄力縱斬傷害。
    push(out, 'damage', 'swing', hp(gp.BulletSaberVerticalParam?.DamageParam?.HitDamage), 'hp');
    push(out, 'damage', 'chargedSlash', hp(gp.BulletSaberSlashVerticalParam?.DamageParam?.DamageValue), 'hp');
    const saber = gp['spl__WeaponSaberParam'];
    push(out, 'inkConsumption', 'perSwing', pct(saber?.SwingParam?.InkConsume), 'percent');
    push(out, 'cadence', 'fullChargeTime', saber?.ChargeParam?.ChargeFrameFullCharge, 'frame');
    return out;
  },
};

/** Leanny __RowId 前綴 → 我方分類代號(對應 schema.WEAPON_CATEGORIES)。 */
export const PREFIX_TO_CATEGORY = {
  Shooter: 'shooter',
  Blaster: 'blaster',
  Roller: 'roller',
  Brush: 'brush',
  Charger: 'charger',
  Slosher: 'slosher',
  Spinner: 'splatling',
  Maneuver: 'dualies',
  Shelter: 'brella',
  Stringer: 'stringer',
  Saber: 'splatana',
};

/**
 * 對單把武器抽出 coreStats(不含 range)。
 * @param {string} category 我方分類代號
 * @param {object} gameParameters 該武器本體的 GameParameters
 * @returns {{key:string,label?:string,value:number,unit:string}[]}
 */
export function extractCoreStats(category, gameParameters) {
  const fn = EXTRACTORS[category];
  if (!fn || !gameParameters) return [];
  return fn(gameParameters);
}
