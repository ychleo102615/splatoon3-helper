/**
 * 篩選 chip 的共用樣式(列表頁 + 隨機器,單一事實來源)。
 *
 * 未選 = 半透明白底冷白字;選中 = 草綠填充翻黑字(DESIGN §5 Chips)。
 * 互動回饋:hover 提亮、active 微縮(按壓感)。微縮僅 `motion-safe` 套用,
 * `prefers-reduced-motion` 時只保留即時的顏色切換,不位移、不縮放。
 *
 * 幾何依 DESIGN token `chip-filter`(padding 6×12、Label 12px);pill 高 `min-h-32` 緊貼內容——
 * 28px 圓徽圖示幾乎填滿 pill 高度(圖示型 chip 垂直內距收成 `py-0.5`),而非浮在偏高的框裡。
 * 取捨:32px 點擊高度低於 DESIGN §Navigation 的 ≥44px 觸控目標下限,屬刻意換取的密度(維護者拍板)。
 *
 * `shape` 讓「文字」與「帶圖示」的 chip 各用對的內距(共用一種 padding 必顧此失彼);
 * 文字型維持 `py-1.5` 給文字留白,圖示型收成 `py-0.5` 讓 28px 徽章貼住 32px 框、兩者等高:
 *  - `text`:純文字(分類 /「不限」/ 射程 token),兩側留白給文字。
 *  - `icon-text`:圖 + 文(副 / 特殊),前導內距收到與上下等值(`pl-0.5` = `py-0.5` = 2px),
 *    圓徽在 pill 圓端裡同心內縮、四周等距,不留顯眼的左側空白;尾端維持文字側距(`pr-3`)。
 *  - `icon-only`:收合 token 只剩圖示,前導同上(`pl-0.5`)讓圓徽貼齊圓端,尾端留 `pr-2` 給刪除 ×。
 */
export type ChipShape = 'text' | 'icon-text' | 'icon-only';

const CHIP_PADDING: Record<ChipShape, string> = {
  text: 'px-3 py-1.5',
  'icon-text': 'pl-0.5 pr-3 py-0.5',
  'icon-only': 'pl-0.5 pr-2 py-0.5',
};

export function chipClass(active: boolean, shape: ChipShape = 'text'): string {
  return [
    `rounded-pill ${CHIP_PADDING[shape]} font-label text-xs font-bold tracking-wide`,
    'min-h-[32px] cursor-pointer',
    'transition-[background-color,color,transform] duration-150 ease-state',
    'motion-safe:active:scale-[0.97] motion-reduce:transition-none',
    active
      ? 'bg-turf-green text-ink-900'
      : 'bg-surface-translucent text-text-on-dark hover:bg-white/15',
  ].join(' ');
}
