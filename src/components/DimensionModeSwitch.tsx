/**
 * DimensionModeSwitch — 收合(簡化)態用的「角色」單鈕,在必須是(AND)↔ 可以是(OR)間切換。
 *
 * 收合摘要只列「有在篩」的維度(角色非不限、且有值),故這裡不含「不限」——要不限就把該維度的
 * 值用 token 的 × 移除,維度自然從摘要消失(等同清空)。設計取捨見對話:收合保持精簡,單鈕即可。
 *
 * 為了讓「單鈕可切換」這件事可被察覺,鈕上附一個自繪的雙箭頭(⇄)提示(全自繪 SVG,§4 合規)。
 * 視覺:草綠翻黑字(它代表一個「開著」的篩選,與選取 chip 同語言)。
 * 不加 `'use client'`:純呈現子元件,靠匯入它的 client 樹打包(同 FilterTokens)。
 */

import type { DimensionMode } from '@/components/weaponFilters';

export interface DimensionModeSwitchProps {
  value: DimensionMode;
  onChange: (next: DimensionMode) => void;
  /** 'AND' 文案(必須是)。 */
  requiredLabel: string;
  /** 'OR' 文案(可以是)。 */
  anyLabel: string;
  /** 無障礙名稱(例:「副武器:切換 必須是 / 可以是」)。 */
  ariaLabel: string;
}

export function DimensionModeSwitch({
  value,
  onChange,
  requiredLabel,
  anyLabel,
  ariaLabel,
}: DimensionModeSwitchProps) {
  const isRequired = value === 'AND';
  return (
    <button
      type="button"
      onClick={() => onChange(isRequired ? 'OR' : 'AND')}
      aria-label={ariaLabel}
      className="inline-flex min-h-[28px] cursor-pointer items-center gap-1 rounded-pill bg-turf-green px-2.5 py-0.5 font-label text-[11px] font-bold uppercase tracking-wide text-ink-900 transition-[background-color,transform] duration-150 ease-state hover:bg-turf-green/90 motion-safe:active:scale-[0.97] motion-reduce:transition-none"
    >
      {isRequired ? requiredLabel : anyLabel}
      <SwapIcon />
    </button>
  );
}

/** 自繪雙箭頭(全自繪 SVG,§4 合規):提示此鈕可切換。 */
function SwapIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h10l-3-3M13 10H3l3 3" />
    </svg>
  );
}
