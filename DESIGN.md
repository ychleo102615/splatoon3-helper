---
name: Splatoon 3 武器工具 (SPLAT-DEX)
description: 非官方武器查詢工具 — 霓虹噴漆的品牌外殼,規格室的資料核心
colors:
  ink-900: "#0C1219"
  ink-800: "#17202B"
  ink-700: "#28323F"
  text-on-dark: "#E8EDF2"
  muted-on-dark: "#94A3B2"
  surface-translucent: "#FFFFFF14"
  card-translucent: "#FFFFFF0D"
  turf-green: "#19D719"
  turf-green-deep: "#12A912"
  splat-magenta: "#F02D7D"
  ink-purple: "#7B2FF7"
  fresh-yellow: "#FFE21D"
  panel-bg: "#EEF2F1"
  panel-ink: "#0F1620"
  panel-muted: "#5A6B66"
  panel-line: "#C9D4D0"
  callout-amber: "#E08A1E"
  subspe-badge: "#3F6FB0"
typography:
  display:
    fontFamily: "\"M PLUS Rounded 1c\", \"Zen Maru Gothic\", \"Noto Sans TC\", system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 6vw, 3rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  wordmark:
    fontFamily: "Bungee, \"M PLUS Rounded 1c\", sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  headline:
    fontFamily: "\"M PLUS Rounded 1c\", \"Noto Sans TC\", sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "\"M PLUS Rounded 1c\", \"Noto Sans TC\", sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "\"M PLUS Rounded 1c\", \"Noto Sans TC\", \"Noto Sans JP\", system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "\"M PLUS Rounded 1c\", \"Noto Sans TC\", sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.04em"
  data:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "\"tnum\" 1"
rounded:
  sm: "8px"
  md: "14px"
  lg: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.turf-green}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.turf-green-deep}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
  chip-filter:
    backgroundColor: "{colors.surface-translucent}"
    textColor: "{colors.text-on-dark}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
    typography: "{typography.label}"
  chip-filter-selected:
    backgroundColor: "{colors.turf-green}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  card-weapon:
    backgroundColor: "{colors.card-translucent}"
    textColor: "{colors.text-on-dark}"
    rounded: "{rounded.lg}"
    padding: "12px"
  input-search:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.panel-ink}"
    rounded: "{rounded.md}"
    padding: "11px 14px"
  panel-data:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.panel-ink}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Splatoon 3 武器工具 (SPLAT-DEX)

> 本檔只談「長什麼樣」。範圍與合規以 `Splatoon3-武器工具-規格說明書.md`(§2 / §4)為準,視覺不得為了效果違反該二者。

## 1. Overview

**Creative North Star: "霓虹噴漆 × 規格室 (The Spray Can & The Spec Sheet)"**

這個系統活在兩個地帶的張力之間。**外殼是街頭**:墨黑底色上爆出霓虹噴漆,貼紙般的招牌字,武器卡是噴濺色塊,抽武器像在牆上甩一筆漆。**核心是規格室**:當玩家要看數值,畫面切換成一張冷靜的淺色「規格表」——等寬數字、細線分隔、量測式標註,像工程圖鑑而非廣告。品牌負責「想逛、想抽」,規格表負責「看得懂、信得過」。

兩個地帶不是兩套設計,而是同一產品的兩個音量。大膽集中在少數招牌時刻(列表氛圍、SVG 美術、抽選揭曉);資料畫面刻意安靜。這是本產品最核心的設計紀律,具體由下方的 **The Two-Zone Rule** 管控。

這個系統明確拒絕三件事:① 藍灰側欄 + 同尺寸卡片網格的**一般 SaaS 儀表板**;② 米色背景 + 高反差襯線 + 赤陶色、或旋轉卡片堆砌的**通用 AI 模板**;③ 任何讓人誤認為**官方/任天堂授權**的外觀(合規硬限制,非美學偏好)。

**Key Characteristics:**
- 墨黑霓虹的品牌外殼 + 淺色規格表的資料核心,涇渭分明。
- 視覺資產一律自繪 SVG;美術是內容亮點,不是裝飾。
- 三語(ja-JP / zh-TW / en)一等公民,字體與版面需容納 CJK 與不同長度。
- Mobile-first;招牌處放膽,資料處克制。

## 2. Colors

雙地帶調色:墨黑底 + 一組高彩霓虹當「噴漆」,以及一面冷調近白的「規格表」面板。工作色彩空間為 OKLCH(下方括號內為等值 sRGB hex,與 frontmatter 一致)。

### Primary
- **Turf Green 草綠 (#19D719)**:主品牌色與主要行動色。用於主 CTA(「抽!」、主要按鈕)、目前選取狀態、選中的篩選 chip、品牌量表的填充。**僅用於填充、大面積、圖示與選取狀態,不用於內文**——高彩綠當小字會震動且對比不穩。
- **Turf Green Deep 深草綠 (#12A912)**:綠色按鈕的 hover / pressed 態與硬陰影色。

### Secondary
- **Splat Magenta 噴濺洋紅 (#F02D7D)**:對隊色與能量色。用於隨機決定器的揭曉氛圍、次要高亮、列表中與綠色交替的卡片噴濺,製造「雙隊對比」的招牌感。

### Tertiary
- **Ink Purple 墨紫 (#7B2FF7)**:分類標籤與少量點綴。
- **Fresh Yellow 鮮黃 (#FFE21D)**:分類膠囊標、招牌時刻的小面積強調。高彩黃僅作背景填充配深色文字,絕不當文字色。

### Neutral
- **Ink-900 墨底 (#0C1219)**:App 主背景(暗色外殼的最底層)。
- **Ink-800 墨面 (#17202B)**:暗色上的卡片 / 抬升表面。
- **Ink-700 墨線 (#28323F)**:暗色上的邊框與分隔線。
- **Text-on-Dark 冷白文字 (#E8EDF2)**:暗色上的主要文字(對 Ink-900 約 16:1)。**這是冷調近白,不是暖奶油色**——刻意避開 AI 模板的暖白。
- **Muted-on-Dark 冷灰 (#94A3B2)**:暗色上的次要文字 / 說明(對 Ink-900 約 7:1)。
- **Panel-bg 規格表面 (#EEF2F1)**:資料畫面的淺色面板,極淺冷調(微帶綠 hue,呼應品牌而非暖白)。
- **Panel-ink 規格黑字 (#0F1620)**:規格表上的數值與主文字(對 Panel-bg 約 15:1,數字最清晰)。
- **Panel-muted 規格灰 (#5A6B66)**:規格表上的欄位標籤(對 Panel-bg 約 6:1)。
- **Panel-line 規格細線 (#C9D4D0)**:規格表的髮絲分隔線與量測格線。
- **Callout-amber 標註琥珀 (#E08A1E)**:規格表上的量測標註 / 重點數值高亮(已調深以在淺底達 ≥4.5:1)。

### 元件色(Component)
- **Subspe-badge 圖示徽板 (#3F6FB0)**:副 / 特殊武器圖示的圓形背板(`SubspeIcon`)。官方圖為黑白雙調,需**中明度**底色讓黑與白同時可讀(白 ≈5.1:1、黑 ≈4.1:1)。選用中明度藍而非高彩 Ink Purple:徽章常疊在選中 chip / 收合 token 的 Turf Green 上,高彩紫與綠會振動「發花」,降彩度的藍可避免此衝突並保留兩種筆畫的清晰度。僅作此徽板填充,不作他用。

### Named Rules
**The Two-Zone Rule.** 全站只有兩種色彩音量。**品牌區**(列表卡、隨機器、SVG 美術、wordmark)可以 Committed——霓虹可大面積出現。**資料區**(詳情數值表、規格面板)是 Restrained——除了單一主數值/選取用綠,其餘一律中性。禁止把霓虹潑進資料表當裝飾。

**The Green-Is-Not-Ink Rule.** Turf Green 永不作為內文或長文字色,只作填充、圖示、選取、量表。需要綠色「文字感」時,改用綠色底 + 墨黑字。

**The Category-Never-Color-Alone Rule.** 11 分類的區分一律靠「自繪 SVG 圖示 + 文字標籤」,顏色只是輔助。任何分類資訊不可僅靠顏色傳達(色盲友善預留)。

## 3. Typography

**Display / 武器名 Font:** "M PLUS Rounded 1c" ExtraBold(fallback "Zen Maru Gothic", "Noto Sans TC")— 圓潤厚重的黑體,能渲染日文假名/漢字與中文,扛招牌時刻與武器名。
**Wordmark Font (Latin only):** Bungee — 貼紙感的城市體,**僅用於拉丁字招牌**(站名 SPLAT-DEX、「SPLAT!」「RANDOM」等)。Bungee 不含 CJK,**絕不可套用在武器名或任何日文/中文字串上**。
**Body / UI Font:** "M PLUS Rounded 1c"(fallback "Noto Sans TC", "Noto Sans JP", system-ui)— 同一圓體家族扛 UI、標籤、按鈕、內文,維持三語一致。
**Data / Mono Font:** "IBM Plex Mono"(tabular numerals)— 規格表的數字、編號、技術標籤。

**Character:** 圓潤親和的黑體(品牌的「鮮快」)對上機械精準的等寬(規格的「有序」)。對比軸是「圓 vs 方、人味 vs 紀律」,而非兩個相似的 sans 互打。

### Hierarchy
產品 UI 採**固定 rem 級距**(比例約 1.2),不用流體縮放;唯一例外是 Display 用一段克制的 clamp(上限 3rem,mobile-first 不喊叫)。
- **Display** (M PLUS Rounded 1c 800, clamp 1.75–3rem, lh 0.95):招牌時刻的標題與武器名(列表頁 hero、抽選揭曉)。`text-wrap: balance`。
- **Wordmark** (Bungee 400, 1.125rem):站名與少量拉丁字招牌,點到為止。
- **Headline** (M PLUS Rounded 1c 700, 1.375rem, lh 1.15):區塊標題。
- **Title** (M PLUS Rounded 1c 700, 1.125rem):卡片名、詳情頁副標。
- **Body** (M PLUS Rounded 1c 500, 1rem, lh 1.6):一般說明文字;長文 65–75ch。
- **Label** (M PLUS Rounded 1c 700, 0.75rem, ls 0.04em):chip、按鈕、欄位標籤。
- **Data** (IBM Plex Mono 500, 0.8125rem, tnum):規格表數值與編號;務必開 tabular-nums 讓數字對齊。

### Named Rules
**The Display-Stays-Home Rule.** Display 與 Wordmark 只活在招牌時刻。資料表、UI 標籤、按鈕、表單一律 Body/Label/Data 字體。禁止用 Bungee 或 800 圓黑去做欄位標籤或數值——那是 product 的大忌。

**The Mono-For-Numbers Rule.** 所有並列比較的數值用 IBM Plex Mono + tnum。武器間的數值要能上下對齊掃讀。

## 4. Elevation

以**色調分層**為主、陰影為輔。暗色外殼靠 Ink-900 → Ink-800 → Ink-700 的明度分層表達深度,表面預設平。系統只保留兩個刻意的陰影語彙,各有明確職責。

### Shadow Vocabulary
- **Sticker Shadow 貼紙硬陰影** (`box-shadow: 0 6px 0 var(--turf-green-deep), 0 14px 24px rgba(25,215,25,.35)`):**只**用在主品牌 CTA(「抽!」鈕),製造可按壓的貼紙厚度。這是招牌時刻,不可濫用於一般按鈕。
- **Panel Lift 面板抬升** (`box-shadow: 0 12px 32px rgba(0,0,0,.45)`):把淺色規格表面板從墨黑底上抬起來,劃清品牌區與資料區的界線。

### Named Rules
**The Flat-By-Default Rule.** 表面預設平,深度靠色調分層。陰影只在兩種情況出現:主 CTA 的貼紙厚度、淺色資料面板的抬升。其餘元件不給陰影。

## 5. Components

### Buttons
- **Shape:** 圓角(18px,`{rounded.lg}`)。
- **Primary(品牌 CTA):** Turf Green 填充 + Ink-900 文字,padding 16px 20px,Label 字體;帶 Sticker Shadow。用於「抽!/ 再抽一次」與主要行動。
- **Hover / Focus:** hover 轉 Turf Green Deep;`:focus-visible` 給 2px 草綠外框(offset 2px)。轉場 150–200ms ease-out。
- **Secondary / Ghost:** 暗色上的透明底 + Ink-700 邊框 + 冷白文字;hover 提高邊框亮度。資料區的次要操作用此,不搶綠色。

### Chips(篩選)
- **Style:** pill(999px)。未選 = Surface-Translucent(8% 白)+ 冷白文字;選中 = Turf Green 填充 + Ink-900 文字。
- **State:** 篩選為多選 toggle;選中態僅靠綠色填充 + 字色翻轉,不額外加邊框。鍵盤可聚焦,focus 給草綠外框。

### Cards / Containers(武器卡)
- **Corner Style:** 18px(`{rounded.lg}`)。
- **Background:** Card-Translucent(5% 白)on 墨底;卡內以自繪 ink-splat SVG 作背景點綴,綠/洋紅/紫/黃**交替**配色。
- **Shadow Strategy:** 平(無陰影),靠半透明分層。
- **Internal Padding:** 12px。
- **反 identical-grid:** 卡片靠交替的噴濺色與分類 SVG 製造節奏,避免「同尺寸 icon+標題+文字」無限複製的 AI 卡海。

### Inputs / Fields(搜尋)
- **Style:** 暗色上的純白圓角欄(14px),內含搜尋圖示 + placeholder。placeholder 用 Panel-muted 等級的對比(≥4.5:1),不可用淺到看不清的灰。
- **Focus:** 2px 草綠外框 + 輕微亮度提升;不位移版面。

### Navigation
- **Style:** 頂部列 = Wordmark(Bungee 拉丁招牌)+ 語言切換(中 / JP / EN)。語言切換是常駐、可見的一等元件:目前語言用洋紅/綠填充標示,其餘為冷灰文字。
- **Mobile:** 頂部精簡;返回以「‹ 返回列表」文字鈕呈現。手機優先,觸控目標 ≥44px。

### Spec Sheet Panel(簽名元件)
資料畫面的核心。淺色冷白面板(Panel-bg)+ Panel-ink 等寬數值 + Panel-line 髮絲分隔 + 量測式標註(Callout-amber)。數值列為「標籤 — 量表 — 數值」三欄,量表在資料區是乾淨的單色條(非品牌的滴墨條),數值靠右對齊、tabular。這面板把 03 圖鑑的紀律帶進暗色品牌裡。

### Stat Meter(兩種處理)
- **品牌區(列表/抽選):** 草綠→鮮黃的滴墨量表(ink-drip),帶噴濺收邊,招牌氛圍。
- **資料區(規格表):** 單色實心條 on 淺底,無裝飾,純粹表達比例。同一資料、兩種音量,由 Two-Zone Rule 決定用哪種。

## 6. Do's and Don'ts

### Do:
- **Do** 把霓虹大膽集中在品牌區(列表卡、隨機器、SVG、wordmark);資料區一律 Restrained。一處放膽,其餘安靜。
- **Do** 用淺色 Panel-bg + IBM Plex Mono + tabular-nums 呈現所有數值,讓武器間能上下對齊掃讀。
- **Do** 武器名與 CJK 標題用 M PLUS Rounded 1c 800(可渲染日文/中文)。
- **Do** 內文用冷白 Text-on-Dark(#E8EDF2),資料用 Panel-ink(#0F1620);對比 ≥4.5:1。
- **Do** 11 分類一律「SVG 圖示 + 文字標籤」並行,顏色只是輔助。
- **Do** 尊重 `prefers-reduced-motion`:待機微動、hover/抽中回饋都要有降階(淡入或瞬切)版本。

### Don't:
- **Don't** 做成**一般 SaaS 儀表板**:藍灰側欄 + 同尺寸卡片網格 + 企業感。
- **Don't** 落入**通用 AI 模板**:米色/奶油背景、高反差襯線、赤陶色、旋轉卡片堆砌。本系統的近白是冷調 #E8EDF2 / #EEF2F1,不是暖奶油。
- **Don't** 讓 UI 看起來像**官方或任天堂授權**工具;不使用任何遊戲 dump 的官方圖檔(全自繪 SVG)。
- **Don't** 把 Bungee 或 800 圓黑用在武器名、欄位標籤、按鈕或數值上(Bungee 無 CJK;display 入資料是 product 大忌)。
- **Don't** 用 Turf Green 當內文或長文字色;綠色只作填充、圖示、選取、量表。
- **Don't** 把霓虹潑進規格表當裝飾;資料區除單一主數值/選取外保持中性。
- **Don't** 用淺到看不清的灰當 placeholder 或內文(對比不足是這類設計最常見的可讀性失敗)。
- **Don't** 濫用陰影:只有主 CTA(貼紙硬陰影)與淺色資料面板(抬升)能有陰影。
