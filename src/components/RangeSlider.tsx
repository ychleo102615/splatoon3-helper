'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 雙握把射程區間滑桿(列表頁與隨機器射程篩選共用)。
 *
 * - **原生承接 a11y**:以兩個 `<input type="range">` 疊合,鍵盤操作、focus、slider 語意
 *   全由瀏覽器原生提供;視覺(中性軌道 + 綠色區間填充 + 握把)的疊合技巧見 globals.css `.range-dual`。
 * - **資料分布驅動的軌道**:軌道上下界 = 快照射程實際 min/max(由 page 計算傳入,非硬寫 0–100),
 *   滿格即代表「不限」(與全站「未選=不限」語意一致)。
 * - **刻度參考**:近/中/遠標記疊在軌道下方,把 0–100 相對值翻成可讀的射程感。
 * - **即時草稿 + 去抖提交**:拖曳期間握把/數值/填充讀「草稿」即時更新,手感不卡;
 *   對外的 `onChange`(會觸發整份清單重算與 localStorage 落盤)則去抖,只在停手後提交一次。
 *   外部 `value` 因任何理由變動(重置、localStorage 還原、另一消費端覆寫)時,草稿隨之校準。
 * - **重置**:給定 `resetLabel` 且區間有設限時顯示;按下立即(略過去抖)把區間還原成滿格 = 不限。
 * - **Two-Zone**:屬篩選區(品牌區但克制);握把/填充用 Turf Green 量表色,數值走 IBM Plex Mono。
 */

export interface RangeValue {
  min: number;
  max: number;
}

export interface RangeMark {
  value: number;
  label: string;
}

interface Props {
  /** 軌道上下界(資料實際 min/max)。 */
  bound: RangeValue;
  /** 目前選取區間。 */
  value: RangeValue;
  step?: number;
  onChange: (next: RangeValue) => void;
  /** 視覺標題 + 群組語意。 */
  label: string;
  /** a11y:下限握把名稱。 */
  minHandleLabel: string;
  /** a11y:上限握把名稱。 */
  maxHandleLabel: string;
  /** 滿格(=不限)時的顯示字。 */
  anyLabel: string;
  /** 近/中/遠等刻度參考(value 落在 bound 範圍內)。 */
  marks?: RangeMark[];
  /** 拖曳停手後延遲提交的毫秒數;`0` = 立即提交。預設 200。 */
  debounceMs?: number;
  /** 重置鈕文字;給定時於區間有設限才顯示,省略則不渲染重置鈕。 */
  resetLabel?: string;
}

export function RangeSlider({
  bound,
  value,
  step = 1,
  onChange,
  label,
  minHandleLabel,
  maxHandleLabel,
  anyLabel,
  marks = [],
  debounceMs = 200,
  resetLabel,
}: Props) {
  // 拖曳期間的即時草稿:所有視覺(握把位置/數值/填充)都讀它,確保拖動順手;
  // 對外提交(觸發篩選/落盤)另走去抖。
  const [draft, setDraft] = useState(value);

  // 外部 value 變動(重置、localStorage 還原、另一消費端覆寫)時,於 render 期校準草稿:
  // 採 React 官方「prop 改變時調整 state」做法,避免在 effect 內 setState 造成連鎖渲染。
  const [syncedValue, setSyncedValue] = useState(value);
  if (value.min !== syncedValue.min || value.max !== syncedValue.max) {
    setSyncedValue(value);
    setDraft(value);
  }

  // 去抖計時器;以 ref 持有以便取消與卸載清理。
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPending = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // 拖曳:即時更新草稿,去抖後才把值提交給父層。
  const commit = (next: RangeValue) => {
    setDraft(next);
    clearPending();
    if (debounceMs <= 0) {
      onChange(next);
      return;
    }
    timer.current = setTimeout(() => onChange(next), debounceMs);
  };

  // 明確動作(重置):略過去抖,立即提交。
  const flush = (next: RangeValue) => {
    clearPending();
    setDraft(next);
    onChange(next);
  };

  const span = bound.max - bound.min || 1;
  const pct = (v: number) => ((v - bound.min) / span) * 100;

  const isFull = draft.min <= bound.min && draft.max >= bound.max;
  const display = isFull ? anyLabel : `${draft.min}–${draft.max}`;

  // 兩握把相遇時,把「偏右的那一邊」浮到上層,確保兩端都好拖。
  const minOnTop = draft.min > (bound.min + bound.max) / 2;

  const handleMin = (raw: number) => {
    commit({ min: Math.min(raw, draft.max), max: draft.max });
  };
  const handleMax = (raw: number) => {
    commit({ min: draft.min, max: Math.max(raw, draft.min) });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-label text-xs uppercase tracking-wide text-muted-on-dark">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-data text-xs tabular-nums text-text-on-dark">{display}</span>
          {resetLabel && !isFull ? (
            <button
              type="button"
              onClick={() => flush({ ...bound })}
              className="font-label text-xs uppercase tracking-wide text-muted-on-dark underline-offset-2 transition-colors hover:text-text-on-dark hover:underline"
            >
              {resetLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="range-dual relative mt-2 h-9">
        {/* 軌道底(中性) */}
        <div
          aria-hidden
          className="absolute left-0 top-1/2 h-1.5 w-full -translate-y-1/2 rounded-pill bg-ink-700"
        />
        {/* 選取區間填充(量表綠) */}
        <div
          aria-hidden
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-pill bg-turf-green"
          style={{ left: `${pct(draft.min)}%`, right: `${100 - pct(draft.max)}%` }}
        />
        <input
          type="range"
          min={bound.min}
          max={bound.max}
          step={step}
          value={draft.min}
          onChange={(e) => handleMin(Number(e.target.value))}
          aria-label={minHandleLabel}
          aria-valuetext={String(draft.min)}
          style={{ zIndex: minOnTop ? 30 : 20 }}
        />
        <input
          type="range"
          min={bound.min}
          max={bound.max}
          step={step}
          value={draft.max}
          onChange={(e) => handleMax(Number(e.target.value))}
          aria-label={maxHandleLabel}
          aria-valuetext={String(draft.max)}
          style={{ zIndex: minOnTop ? 20 : 30 }}
        />
      </div>

      {marks.length > 0 ? (
        <div aria-hidden className="relative mt-1 h-4">
          {marks.map((m) => (
            <span
              key={m.label}
              className="absolute -translate-x-1/2 font-data text-[10px] uppercase tracking-wide text-muted-on-dark"
              style={{ left: `${pct(m.value)}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
