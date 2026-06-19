# CLAUDE.md

Splatoon 3 武器查詢與輔助工具(**非官方、非營利**,與任天堂無關)。React / Next.js(App Router)、Tailwind、next-intl 三語(ja-JP / zh-TW / en)、mobile-first。

## 文件權責

- **做什麼 / 範圍 / 合規 / 架構** → `Splatoon3-武器工具-規格說明書.md`(本檔下方為其硬性摘要)。
- **為什麼 / 優先序 / 個性** → `PRODUCT.md`。
- **長什麼樣 / token / 元件** → `DESIGN.md`(+ `.impeccable/design.json`)。
- 衝突時優先序:**合規 > 範圍 > PRODUCT 原則 > DESIGN token**。三份文件平權,沒有任何一份能單獨主導。

## 範圍與合規(硬性,以規格說明書為準)

動工前讀 `Splatoon3-武器工具-規格說明書.md` §2 範圍、§4 合規;以下為不可違反項:
- **不做(§2.2)**:賽程/鮭魚跑排程、勝率/使用率統計、互動裝備效益計算機、雙武器/配裝比較、讀取個人對戰資料(不碰 SplatNet 非公開 API、不做 token 生成)。
- **合規(§4)**:對 splatoon3.ink 快取且抓取 ≤ 每小時一次、請求設 User-Agent、產品免費(可自願捐款)、標註來源 splatoon3.ink、預設全自繪 SVG 不用任何官方圖檔、明示「非官方,與任天堂無關」、數值需標快照遊戲版本、不照抄 Leanny 資料結構(自建 schema)。
- **官方圖示 opt-in 例外(§4.3.1)**:唯一允許「官方圖檔」的情形 = 環境變數 `NEXT_PUBLIC_WEAPON_ICONS` 開啟、執行時外部 hotlink、**PNG 一律不入庫(repo 僅留檔名/URL 參照字串)**、預設關閉、風險由開啟者自負。除此之外仍是「全自繪、無官方圖檔」。

## Design Context

設計決策以下列兩份根目錄文件為準,動工任何 UI 前先讀:

- **`PRODUCT.md`** — 策略(register=product、用戶、用途、品牌個性、anti-references、5 條設計原則、a11y)。
- **`DESIGN.md`** — 視覺系統(token、色彩、字體、elevation、元件、Do's/Don'ts)。`.impeccable/design.json` 為其機器可讀 sidecar。

**一句話定調**:North Star =「霓虹噴漆 × 規格室」。暗色霓虹的**品牌外殼**(列表/隨機器/SVG)搭配淺色等寬的**規格表資料核心**(詳情/數值)。

**最常踩的硬規則**(細節見 DESIGN.md):
- **Two-Zone Rule**:品牌區可放膽用霓虹;資料區除單一主數值/選取用綠外保持中性。
- 字體分工:武器名/CJK 標題用 M PLUS Rounded 1c 800;Bungee 僅限拉丁字招牌(無 CJK,不可套武器名);數值用 IBM Plex Mono + tabular-nums。
- Turf Green(#19D719)只作填充/圖示/選取/量表,**不當內文色**。
- 合規硬條款見上方「範圍與合規」一節(那裡為準)。

## 探索素材

`design-explorations/` 內有 5 種早期視覺探索(01–05);最終定案為「01 骨幹 + 03 數值」折衷,已固化進 DESIGN.md。
