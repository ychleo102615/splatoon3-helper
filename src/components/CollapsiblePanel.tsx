import { useId } from 'react';

/**
 * CollapsiblePanel — 篩選面板的可收合外殼(列表頁 + 隨機器槽預留共用)。
 *
 * 刻意不加 `'use client'`:與 FilterGroup 同樣是「只被 client 元件(WeaponList)匯入」的
 * 純呈現子元件,靠匯入它的 client 樹一起打包即可用 hook;自帶指令反而會被當成 RSC 邊界,
 * 逼著函式 prop 變 Server Action(Next.js 71007)。邊界由 WeaponsBrowser 的 `ssr:false` 界定。
 *
 * 一個面板兩種音量,由 `open` 決定(規格「簡化篩選器」§ 切換):
 *  - **展開** = 完整檢視:`children`(全部 chip + 射程)現身,屬可編輯的 picker。
 *  - **收合** = 簡化模式:只留 `summary`(已選條件 token + 新增),把控制面收進去。
 *
 * 設計取捨:
 *  - **高度動畫走 grid-rows**(`0fr↔1fr`)而非 max-height 猜值——auto 高度也能平滑過渡,
 *    內容增減不需重算魔術數字。`prefers-reduced-motion` 一律瞬切(無位移、無高度補間)。
 *  - **收合 = 真收合**:body 加 `inert`,內部 chip / 滑桿不被 Tab、不被報讀,
 *    避免「看不見卻仍可聚焦」的 a11y 陷阱;切換鈕以 `aria-expanded` / `aria-controls` 綁定 body。
 *  - 只認「殼」的職責:標題、開合、動畫、a11y;token 怎麼長、chip 怎麼排,留給呼叫端注入,
 *    故列表頁與隨機器能各自組裝內容、共用同一套收合語意(與 FilterGroup 的抽法一致)。
 */
export function CollapsiblePanel({
  open,
  onOpenChange,
  title,
  toolbar,
  summary,
  expandLabel,
  collapseLabel,
  children,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** 面板標題(uppercase eyebrow)。 */
  title: string;
  /** 標題右側工具區(例:清除篩選);省略則不渲染。 */
  toolbar?: React.ReactNode;
  /** 收合時顯示的簡化摘要(已選 token + 新增條件);展開時隱藏。 */
  summary: React.ReactNode;
  /** 切換鈕在「收合態」的無障礙名稱(動作 = 展開)。 */
  expandLabel: string;
  /** 切換鈕在「展開態」的無障礙名稱(動作 = 收合)。 */
  collapseLabel: string;
  /** 展開時的完整控制(全部 chip + 射程)。 */
  children: React.ReactNode;
}) {
  const bodyId = useId();

  return (
    <div className="rounded-lg bg-card-translucent p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-label text-xs uppercase tracking-wide text-muted-on-dark">{title}</h2>
        <div className="flex items-center gap-3">
          {toolbar}
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={open ? collapseLabel : expandLabel}
            className="grid size-7 place-items-center rounded-pill text-muted-on-dark transition-colors duration-150 ease-state hover:bg-white/10 hover:text-text-on-dark motion-reduce:transition-none"
          >
            <Chevron open={open} />
          </button>
        </div>
      </div>

      {/* 收合摘要:只在收合時佔位;展開時 chip 自己就表達了選取狀態,毋須重複。 */}
      {open ? null : <div className="mt-3">{summary}</div>}

      {/* 完整控制:grid-rows 高度補間;inert 確保收合時內部不可聚焦/報讀。 */}
      <div
        id={bodyId}
        inert={!open}
        className="grid transition-[grid-template-rows] duration-200 ease-state motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** 自繪折角箭頭(全自繪 SVG,§4 合規);展開時旋轉 180°。 */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`size-4 transition-transform duration-200 ease-state motion-reduce:transition-none ${
        open ? 'rotate-180' : ''
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
