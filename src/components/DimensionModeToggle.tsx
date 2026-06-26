/**
 * DimensionModeToggle — 單一篩選維度的「角色」四選一:不限 ｜ 必須是(AND) ｜ 可以是(OR) ｜ 不要是(NOT)。
 * (展開態用;收合態改用單鈕 DimensionModeSwitch。)
 *
 * 角色與「已選值」**解耦**(見 weaponFilters.ts DimensionRole):
 *  - **不限** = 不參與篩選。切到不限**不清空**已選值(只是停用、淡化),切回時自動還原。
 *  - **必須是** = 必須符合(交集)。 **可以是** = 屬「至少符合一個」的群(聯集)。
 *    **不要是** = 值落在已選集合即淘汰(排除整個集合)。
 * 四段**皆永遠可按**(不再因空狀態停用):切到必須是/可以是/不要是時若沒值,由呼叫端自動選第一項或還原上次。
 *
 * 視覺(DESIGN §5 / Two-Zone 品牌區):選中的必須是/可以是 = Turf Green 翻黑字(正向選取,「要這個」);
 * 選中的不要是 = Callout Amber 翻黑字(負向排除,刻意離開綠色避免「被選=想要」誤讀);
 * 不限選中 = 中性灰(「關閉」態,安靜)。
 * 不加 `'use client'`:純呈現子元件,靠匯入它的 client 樹打包(同 FilterGroup / FilterTokens)。
 */

import type { DimensionRole } from '@/components/weaponFilters';

export interface DimensionModeToggleProps {
  value: DimensionRole;
  onChange: (next: DimensionRole) => void;
  /** 'none' 段標籤(不限)。 */
  noneLabel: string;
  /** 'AND' 段標籤(必須是)。 */
  requiredLabel: string;
  /** 'OR' 段標籤(可以是)。 */
  anyLabel: string;
  /** 'NOT' 段標籤(不要是)。 */
  excludeLabel: string;
  /** 整組的無障礙名稱(例:「副武器 的符合方式」)。 */
  ariaLabel: string;
}

export function DimensionModeToggle({
  value,
  onChange,
  noneLabel,
  requiredLabel,
  anyLabel,
  excludeLabel,
  ariaLabel,
}: DimensionModeToggleProps) {
  const options: { key: DimensionRole; text: string }[] = [
    { key: 'none', text: noneLabel },
    { key: 'AND', text: requiredLabel },
    { key: 'OR', text: anyLabel },
    { key: 'NOT', text: excludeLabel },
  ];

  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex rounded-pill bg-surface-translucent p-0.5">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={active}
            className={[
              'min-h-[26px] cursor-pointer rounded-pill px-2.5 py-0.5 font-label text-[11px] font-bold uppercase tracking-wide',
              'transition-[background-color,color] duration-150 ease-state motion-reduce:transition-none',
              active
                ? opt.key === 'none'
                  ? 'bg-white/20 text-text-on-dark' // 不限選中:中性灰(關閉態,安靜)
                  : opt.key === 'NOT'
                    ? 'bg-callout-amber text-ink-900' // 不要是選中:琥珀翻黑字(負向排除)
                    : 'bg-turf-green text-ink-900' // 必須是/可以是選中:草綠翻黑字(正向選取,同 chip 語言)
                : 'text-muted-on-dark hover:text-text-on-dark',
            ].join(' ')}
          >
            {opt.text}
          </button>
        );
      })}
    </div>
  );
}
