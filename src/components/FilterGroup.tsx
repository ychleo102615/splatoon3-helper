/**
 * 篩選維度群組 + chip(列表頁篩選 + 隨機器抽選槽,單一事實來源)。
 *
 * - **維度語意統一**:每個維度為一組 chip,維度內多選為 OR、各維度間為 AND;
 *   「不限」按鈕清空該維度(= 不限制)。此語意在列表頁與隨機器完全一致,
 *   故抽成共用元件,避免兩處各寫一套同形 UI 而漂移(DESIGN §5 Chips)。
 * - **Two-Zone**:屬篩選區(品牌區但克制);選中態走 Turf Green 量表色(由 chipClass 提供)。
 */

import { chipClass, type ChipTone } from '@/components/chipClass';
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
  mode,
  action,
  dimmed = false,
  children,
}: {
  label: string;
  /**
   * 該維度的「不限 / 必須是 / 可以是」角色切換(DimensionModeToggle),置於標題左側表「它屬於此維度」。
   * 「不限」已收進此控制(切到不限 = 停用但保留已選值);chip 區不再有獨立的「不限」鈕。
   */
  mode?: React.ReactNode;
  /** 標題列右側動作(例:清除此維度);省略則不渲染。 */
  action?: React.ReactNode;
  /**
   * 「不限」時把 chip 區淡化 + 去飽和(opacity-40 + grayscale):表示「停用但記著選了什麼」
   * (切回必須是/可以是即還原)。去飽和是關鍵——飽和的 Turf Green 單靠降透明仍讀作「選取中」,
   * 抽掉彩度成灰才明確讀作「已停用」。chip 仍可點以重新啟用。
   */
  dimmed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {mode}
        <p className="font-label text-xs uppercase tracking-wide text-muted-on-dark">{label}</p>
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      <div
        role="group"
        aria-label={label}
        className={`mt-2 flex flex-wrap gap-2 transition-[opacity,filter] duration-150 ease-state motion-reduce:transition-none ${
          dimmed ? 'opacity-40 grayscale' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  icon,
  tone = 'select',
  children,
}: {
  active: boolean;
  onClick: () => void;
  /** §4.3.1 opt-in:前置圖示 URL(圖文降階);省略 / 未啟用時純文字,版面不變。 */
  icon?: string;
  /** 選中態極性:正向選取(綠,預設)/ 負向排除(琥珀,維度角色為「不要是」時)。 */
  tone?: ChipTone;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        icon
          ? `${chipClass(active, 'icon-text', tone)} inline-flex items-center gap-2`
          : chipClass(active, 'text', tone)
      }
    >
      {icon ? <SubspeIcon src={icon} alt="" className="size-7 p-0.5" /> : null}
      {children}
    </button>
  );
}
