/**
 * 篩選 chip 的共用樣式(列表頁 + 隨機器,單一事實來源)。
 *
 * 未選 = 半透明白底冷白字;選中 = 草綠填充翻黑字(DESIGN §5 Chips)。
 * 互動回饋:hover 提亮、active 微縮(按壓感)。微縮僅 `motion-safe` 套用,
 * `prefers-reduced-motion` 時只保留即時的顏色切換,不位移、不縮放。
 */
export function chipClass(active: boolean): string {
  return [
    'rounded-pill px-3 py-1.5 font-label text-xs font-bold tracking-wide',
    'min-h-[32px] cursor-pointer',
    'transition-[background-color,color,transform] duration-150 ease-state',
    'motion-safe:active:scale-[0.97] motion-reduce:transition-none',
    active
      ? 'bg-turf-green text-ink-900'
      : 'bg-surface-translucent text-text-on-dark hover:bg-white/15',
  ].join(' ');
}
