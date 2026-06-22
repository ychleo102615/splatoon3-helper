/**
 * 篩選維度群組 + chip(列表頁篩選 + 隨機器抽選槽,單一事實來源)。
 *
 * - **維度語意統一**:每個維度為一組 chip,維度內多選為 OR、各維度間為 AND;
 *   「不限」按鈕清空該維度(= 不限制)。此語意在列表頁與隨機器完全一致,
 *   故抽成共用元件,避免兩處各寫一套同形 UI 而漂移(DESIGN §5 Chips)。
 * - **Two-Zone**:屬篩選區(品牌區但克制);選中態走 Turf Green 量表色(由 chipClass 提供)。
 */

import { chipClass } from '@/components/chipClass';
import { SubspeIcon } from '@/components/SubspeIcon';

/** 副 / 特殊武器等篩選選項(id + 已在地化名稱)。 */
export interface FilterOption {
  id: string;
  name: string;
  /** §4.3.1 opt-in:官方圖示外部 URL;未啟用時 undefined(chip 維持純文字)。 */
  iconUrl?: string;
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
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  /** §4.3.1 opt-in:前置圖示 URL(圖文降階);省略 / 未啟用時純文字,版面不變。 */
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={icon ? `${chipClass(active)} inline-flex items-center gap-1.5` : chipClass(active)}
    >
      {icon ? <SubspeIcon src={icon} alt="" className="size-4 p-0.5" /> : null}
      {children}
    </button>
  );
}
