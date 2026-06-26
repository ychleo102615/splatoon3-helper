# 資料管線(Phase 0)與資料檔

本目錄為武器資料的「自建快照」與其管線產出。動工前請先讀根目錄 `Splatoon3-武器工具-規格說明書.md` §4(資料來源與合規)。

## 產出檔

| 檔案 | 內容 | 來源 |
|---|---|---|
| `schema.ts` | 自有 TypeScript schema(型別與常數,無資料) | 自建(規格 §4.2) |
| `weapons.snapshot.json` | 全 roster 武器快照(數值 + 四語名稱 + 版本) | 見下「來源與合規」 |
| `sub-special.json` | 副/特殊武器四語名稱 + 一行簡述 + 圖示檔名參照(`iconName`,§4.3.1) | Leanny 語言檔 + `subspe` 檔名 |
| `locale/weapon-names.json` | splatoon3.ink 開放名稱(四語交集) | splatoon3.ink(規格 §4.1) |

## 執行順序

```bash
SPLATOON3INK_UA="splatoon3-helper/0.1 (non-commercial fan tool; <你的聯絡方式>)" \
  pnpm data:fetch-locale     # splatoon3.ink 四語名稱(設 UA、≤1h 快取守門)
pnpm data:fetch-leanny       # Leanny 武器資訊/語言/參數(快取至 .cache/leanny,版本固定)
pnpm data:build-snapshot     # 合併產出 weapons.snapshot.json 與 sub-special.json
```

`.cache/` 為原始回應快取(gitignore);版控只收抽取後的資料檔。

## 來源與合規(規格 §4)

- **名稱**:優先採 **splatoon3.ink** 開放 locale(§4.1:標來源、設 UA、≤每小時抓一次、產品免費)。
  splatoon3.ink 的 `weapons` 為賽程/活動 feed 衍生,僅涵蓋近期出現過的武器(實測四語一致約 63 把);
  其餘 roster 之名稱以 **Leanny 語言檔**補足(§4.2,事實性數據立場;此舉合規風險較高,為產品決策)。
  每筆武器的 `nameSource` 標明其名稱來源。
- **數值**:取自 **Leanny** 遊戲參數,僅以「事實性數據」立場使用;**不照抄其結構**,轉為本目錄 `schema.ts` 的扁平自有 schema。
- **版本**:`meta.gameVersion`(由 Leanny 版本碼推導,如 `1120` → `11.2.0`)標註快照對應遊戲版本(§4.5)。
- **圖像**:本管線**不下載、不入庫任何官方圖檔**(§4.3,全自繪 SVG 另行處理)。
  唯一例外為 §4.3.1 opt-in:每筆 `iconName` 僅存**檔名參照字串**(非圖檔本體)——主武器取自 Leanny `weapon_flat`、
  副/特殊武器取自 Leanny `subspe`;圖檔是否於執行時外部載入,由 app 端環境變數 `NEXT_PUBLIC_WEAPON_ICONS`(預設關閉)
  控制,見 `.env.example` 與 `src/config/icons.ts`。
- **非官方**:`meta.disclaimer` 標明非官方、與任天堂無關(§4.4)。

## 數值抽取規則(精簡核心子集,規格 §3.1)

數值僅取來源確有的欄位,單位轉為自有語意;**讀不到真實值即留空,不以引擎預設臆造**(反幻覺)。

- `range`:WeaponInfoMain `UIParam`(遊戲內 0–100 相對值),全分類皆有。
- `damage`:遊戲內部值 ÷ 10 = HP(以 .52加侖=52.0、斯普拉射擊槍=36.0 等已知值校驗)。多段以 `label` 標示
  (如 near/far、direct/blast、tap/fullCharge、flingNear/flingFar…),取自各分類對應的參數結構。
- `inkConsumption`:占墨水槽比例 × 100 = 百分比;`label` 標明對應動作(perShot / perSwing / perFullCharge…)。
- `cadence`:幀(60fps);`label` 標明語意(fireInterval / swingInterval / fullChargeTime…)。

### 已知缺口(透明標示於 `meta.coverage`)

- **cadence**:Splattershot 家族(`Shooter_Normal_*`)與 Splat Charger 家族(`Charger_Normal_*`)的連射/滿充幀
  **未寫進** Leanny 的逐武器參數(沿用引擎預設),故留空;傘(brella)為單發、無連射間隔,亦留空。
- **gearEffects**:裝備效益曲線屬獨立資料集,Phase 0 暫為空陣列(規格 §3.1,待後續階段)。

## Roster 範圍

採 WeaponInfoMain 中 `Type == "Versus"` 的 173 把,涵蓋各 kit 與 Hero/Octo/Order 複製、聯名/裝飾等變體
(皆為遊戲內可選主武器)。`id` 為由 Leanny 內部 id 轉成的 kebab-case 自有 slug(如 `shooter-normal-00`)。

## Q6(規格 §7)落地紀錄:Leanny 原始 key → 自有欄位

| 自有欄位 | Leanny 來源 |
|---|---|
| `category` | `__RowId` 前綴(Shooter/Blaster/…/Saber)對應 11 分類 |
| `subWeaponId` / `specialWeaponId` | `SubWeapon` / `SpecialWeapon` gyml 路徑 basename → kebab |
| `season` | `Season` |
| `coreStats.range` | `UIParam[].{Type:"Range",Value}` |
| `coreStats.damage` | 各分類 `DamageParam` / `BlastParam` / `*UnitGroupParam` / `Bullet*Param`(÷10) |
| `coreStats.inkConsumption` | `WeaponParam.InkConsume` / `InkConsumeFullCharge` / 各 swing 參數(×100) |
| `coreStats.cadence` | `WeaponParam.RepeatFrame` / `ChargeFrameFullCharge` / `ChargeFrame_Second` 等 |
| `iconName`(§4.3.1) | 以 `__RowId` 對 Leanny `images/weapon_flat` 檔名清單比對(`Path_Wst_<__RowId>.png`);僅存檔名字串,無圖檔 |

> 立場聲明:上述為著作權一般原則下的風險評估,非正式法律意見。開工前請再次確認 Leanny 與 splatoon3.ink 當下的使用條款。
