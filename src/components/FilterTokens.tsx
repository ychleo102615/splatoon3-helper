import { chipClass } from '@/components/chipClass';
import { SubspeIcon } from '@/components/SubspeIcon';

/**
 * 已選條件摘要(簡化模式的內容,列表頁 + 隨機器槽預留共用)。
 *
 * 與 FilterGroup / CollapsiblePanel 一致:不加 `'use client'`,作為純呈現子元件由匯入它的
 * client 樹一起打包;自帶指令會把函式 prop 誤判為需 Server Action(Next.js 71007)。
 *
 * - **只顯示已選**:一個 token = 一個被選中的維度值(分類 / 副 / 特殊 / 射程),整顆即「刪除鈕」
 *   ——點擊移除該值(規格「簡化篩選器」§ 只顯示被選中、點擊刪除);× 為刪除可供性的視覺提示。
 * - **圖文降階**(§4.3.1):`iconUrl` 有值(= icon 功能開啟且該維度有官方圖)時整顆**只留圖示**
 *   (收合是最克制的摘要,圖示已足夠辨識,省去文字更省版面);否則純文字,分類無圖一律文字。
 *   icon-only 時文字名改由按鈕 `aria-label`(removeLabel)承載、`title` 補滑過提示,圖示維持裝飾(`alt=""`)。
 * - **新增 = 展開**:末端「新增條件」鈕把面板展開回完整 picker(由呼叫端的 `onAdd` 接上開合)。
 * - 純呈現:token 描述(label / icon / onRemove)由呼叫端依各自條件組裝,本元件不認識篩選語意。
 */

/** 單一已選條件的描述(整顆 = 刪除鈕)。 */
export interface FilterToken {
  /** React key(維度 + 值,呼叫端保證掛載期唯一)。 */
  key: string;
  /** 顯示文字(已在地化:分類名 / 副特殊名 / 射程區間)。 */
  label: string;
  /** §4.3.1 opt-in:副 / 特殊官方圖示外部 URL;未啟用時 undefined → 純文字。 */
  iconUrl?: string;
  /** 移除此條件(回到該維度「不限」)。 */
  onRemove: () => void;
}

export function ActiveFilterTokens({
  tokens,
  onAdd,
  addLabel,
  emptyLabel,
  removeLabel,
}: {
  tokens: FilterToken[];
  /** 展開為完整 picker 以新增條件。 */
  onAdd: () => void;
  addLabel: string;
  /** 無任何已選條件時的提示文字。 */
  emptyLabel: string;
  /** token 刪除鈕的無障礙名稱解析(傳入該條件的 label)。 */
  removeLabel: (name: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tokens.length === 0 ? (
        <span className="font-body text-sm text-muted-on-dark">{emptyLabel}</span>
      ) : (
        tokens.map((token) => (
          <button
            key={token.key}
            type="button"
            onClick={token.onRemove}
            aria-label={removeLabel(token.label)}
            // 圖文降階(§4.3.1):有官方圖時整顆只留圖示(收合 = 最克制的摘要),
            // 文字名仍由 aria-label 承載、並以 title 補上 sighted 的滑過提示;無圖則維持文字。
            title={token.iconUrl ? token.label : undefined}
            className={`${chipClass(true, token.iconUrl ? 'icon-only' : 'text')} inline-flex items-center gap-1.5`}
          >
            {token.iconUrl ? (
              <SubspeIcon src={token.iconUrl} alt="" className="size-7 p-1" />
            ) : (
              <span>{token.label}</span>
            )}
            <span aria-hidden className="text-base leading-none text-ink-900/70">
              ×
            </span>
          </button>
        ))
      )}

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex min-h-[44px] items-center rounded-pill border border-dashed border-ink-700 px-3 font-label text-xs font-bold uppercase tracking-wide text-text-on-dark transition-colors duration-150 ease-state hover:border-muted-on-dark hover:bg-white/5 motion-reduce:transition-none"
      >
        {addLabel}
      </button>
    </div>
  );
}
