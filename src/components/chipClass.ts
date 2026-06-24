/**
 * 篩選 chip 的共用樣式(列表頁 + 隨機器,單一事實來源)。
 *
 * 未選 = 半透明白底冷白字;選中 = 草綠填充翻黑字(DESIGN §5 Chips)。
 * 互動回饋:hover 提亮、active 微縮(按壓感)。微縮僅 `motion-safe` 套用,
 * `prefers-reduced-motion` 時只保留即時的顏色切換,不位移、不縮放。
 *
 * 幾何依 DESIGN token `chip-filter`(padding 6×12、Label 12px),點擊區再以 `min-h-44`
 * 補到觸控目標下限(DESIGN §Navigation ≥44px)——「放大」靠點擊區與圖示,不灌大視覺 padding/字級。
 *
 * `shape` 讓「文字」與「帶圖示」的 chip 各用對的水平內距(共用一種 padding 必顧此失彼):
 *  - `text`:純文字(分類 /「不限」/ 射程 token),兩側留白給文字。
 *  - `icon-text`:圖 + 文(副 / 特殊),前導收窄(圓形徽章自帶視覺邊距),尾端維持文字側距。
 *  - `icon-only`:收合 token 只剩圖示,近方形緊湊內距,讓圖示當主角而非浮在空 pill 裡。
 */
export type ChipShape = 'text' | 'icon-text' | 'icon-only';

const CHIP_PADDING: Record<ChipShape, string> = {
  text: 'px-3 py-1.5',
  'icon-text': 'pl-2 pr-3 py-1.5',
  'icon-only': 'px-2 py-1.5',
};

export function chipClass(active: boolean, shape: ChipShape = 'text'): string {
  return [
    `rounded-pill ${CHIP_PADDING[shape]} font-label text-xs font-bold tracking-wide`,
    'min-h-[44px] cursor-pointer',
    'transition-[background-color,color,transform] duration-150 ease-state',
    'motion-safe:active:scale-[0.97] motion-reduce:transition-none',
    active
      ? 'bg-turf-green text-ink-900'
      : 'bg-surface-translucent text-text-on-dark hover:bg-white/15',
  ].join(' ');
}
