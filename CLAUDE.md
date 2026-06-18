# CLAUDE.md

Splatoon 3 武器查詢與輔助工具(**非官方、非營利**,與任天堂無關)。React / Next.js(App Router)、Tailwind、next-intl 三語(ja-JP / zh-TW / en)、mobile-first。

## Design Context

設計決策以下列兩份根目錄文件為準,動工任何 UI 前先讀:

- **`PRODUCT.md`** — 策略(register=product、用戶、用途、品牌個性、anti-references、5 條設計原則、a11y)。
- **`DESIGN.md`** — 視覺系統(token、色彩、字體、elevation、元件、Do's/Don'ts)。`.impeccable/design.json` 為其機器可讀 sidecar。

**一句話定調**:North Star =「霓虹噴漆 × 規格室」。暗色霓虹的**品牌外殼**(列表/隨機器/SVG)搭配淺色等寬的**規格表資料核心**(詳情/數值)。

**最常踩的硬規則**(細節見 DESIGN.md):
- **Two-Zone Rule**:品牌區可放膽用霓虹;資料區除單一主數值/選取用綠外保持中性。
- 字體分工:武器名/CJK 標題用 M PLUS Rounded 1c 800;Bungee 僅限拉丁字招牌(無 CJK,不可套武器名);數值用 IBM Plex Mono + tabular-nums。
- Turf Green(#19D719)只作填充/圖示/選取/量表,**不當內文色**。
- 合規:全自繪 SVG、不用官方圖檔、明示非官方、標註資料來源(splatoon3.ink)。

## 探索素材

`design-explorations/` 內有 5 種早期視覺探索(01–05);最終定案為「01 骨幹 + 03 數值」折衷,已固化進 DESIGN.md。
