/**
 * 篩選維度群組 + chip(列表頁篩選 + 隨機器抽選槽,單一事實來源)。
 *
 * - **維度語意統一**:每個維度為一組 chip,維度內多選為 OR、各維度間為 AND;
 *   「不限」按鈕清空該維度(= 不限制)。此語意在列表頁與隨機器完全一致,
 *   故抽成共用元件,避免兩處各寫一套同形 UI 而漂移(DESIGN §5 Chips)。
 * - **Two-Zone**:屬篩選區(品牌區但克制);選中態走 Turf Green 量表色(由 chipClass 提供)。
 */

import { chipClass } from '@/components/chipClass';

/** 副 / 特殊武器等篩選選項(id + 已在地化名稱)。 */
export interface FilterOption {
  id: string;
  name: string;
}

export function FilterGroup({
  label,
  anyLabel,
  anyActive,
  onAny,
  children,
}: {
  label: string;
  anyLabel: string;
  anyActive: boolean;
  onAny: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="font-label text-xs uppercase tracking-wide text-muted-on-dark">{label}</p>
      <div role="group" aria-label={label} className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={onAny} aria-pressed={anyActive} className={chipClass(anyActive)}>
          {anyLabel}
        </button>
        {children}
      </div>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={chipClass(active)}>
      {children}
    </button>
  );
}
