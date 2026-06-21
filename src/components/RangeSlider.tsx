'use client';

/**
 * 雙握把射程區間滑桿(隨機器射程篩選用)。
 *
 * - **原生承接 a11y**:以兩個 `<input type="range">` 疊合,鍵盤操作、focus、slider 語意
 *   全由瀏覽器原生提供;視覺(中性軌道 + 綠色區間填充 + 握把)的疊合技巧見 globals.css `.range-dual`。
 * - **資料分布驅動的軌道**:軌道上下界 = 快照射程實際 min/max(由 page 計算傳入,非硬寫 0–100),
 *   滿格即代表「不限」(與全站「未選=不限」語意一致)。
 * - **刻度參考**:近/中/遠標記疊在軌道下方,把 0–100 相對值翻成可讀的射程感。
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
}: Props) {
  const span = bound.max - bound.min || 1;
  const pct = (v: number) => ((v - bound.min) / span) * 100;

  const isFull = value.min <= bound.min && value.max >= bound.max;
  const display = isFull ? anyLabel : `${value.min}–${value.max}`;

  // 兩握把相遇時,把「偏右的那一邊」浮到上層,確保兩端都好拖。
  const minOnTop = value.min > (bound.min + bound.max) / 2;

  const handleMin = (raw: number) => {
    onChange({ min: Math.min(raw, value.max), max: value.max });
  };
  const handleMax = (raw: number) => {
    onChange({ min: value.min, max: Math.max(raw, value.min) });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-label text-xs uppercase tracking-wide text-muted-on-dark">
          {label}
        </span>
        <span className="font-data text-xs tabular-nums text-text-on-dark">{display}</span>
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
          style={{ left: `${pct(value.min)}%`, right: `${100 - pct(value.max)}%` }}
        />
        <input
          type="range"
          min={bound.min}
          max={bound.max}
          step={step}
          value={value.min}
          onChange={(e) => handleMin(Number(e.target.value))}
          aria-label={minHandleLabel}
          aria-valuetext={String(value.min)}
          style={{ zIndex: minOnTop ? 30 : 20 }}
        />
        <input
          type="range"
          min={bound.min}
          max={bound.max}
          step={step}
          value={value.max}
          onChange={(e) => handleMax(Number(e.target.value))}
          aria-label={maxHandleLabel}
          aria-valuetext={String(value.max)}
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
