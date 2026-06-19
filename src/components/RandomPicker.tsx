'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { WeaponCategory } from '@/data/schema';

/**
 * 隨機武器決定器(規格 §3.2)。
 *
 * - **無狀態純抽選**:不記錄歷史、允許連抽到同一把(規格 §3.2 已定案,不做「排除剛抽過」)。
 * - **多重條件篩選**:分類 / 副武器 / 特殊武器三維度,各維度內為 OR、維度間為 AND;
 *   某維度未選任何項即代表「不限」。
 * - **招牌時刻**(DESIGN Two-Zone):這是品牌區,抽選揭曉放膽用霓虹(Splat Magenta 揭曉氛圍);
 *   主 CTA 為草綠貼紙鈕。資料(副/特殊名稱)維持克制。
 * - 抽選只在點擊事件中發生(client),render 期間不取亂數,避免 SSG/hydration 不一致。
 */

/** 抽選池中的單把武器(名稱已於伺服器端依 locale 解析)。 */
export interface PickerWeapon {
  id: string;
  category: WeaponCategory;
  name: string;
  subId: string;
  subName: string;
  specialId: string;
  specialName: string;
}

/** 副 / 特殊武器篩選選項(id + 已在地化名稱)。 */
export interface FilterOption {
  id: string;
  name: string;
}

interface Props {
  weapons: PickerWeapon[];
  /** 出現在抽選池中的分類(依 WEAPON_CATEGORIES 正序);名稱走 Categories i18n。 */
  categories: WeaponCategory[];
  subs: FilterOption[];
  specials: FilterOption[];
}

export function RandomPicker({ weapons, categories, subs, specials }: Props) {
  const t = useTranslations('Random');
  const tw = useTranslations('Weapons');
  const tc = useTranslations('Categories');

  const [cats, setCats] = useState<Set<WeaponCategory>>(new Set());
  const [subIds, setSubIds] = useState<Set<string>>(new Set());
  const [specialIds, setSpecialIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<PickerWeapon | null>(null);
  // 每次抽選自增,作為揭曉卡片的 key:強制重掛載以重播 reveal 動畫。
  const [drawSeq, setDrawSeq] = useState(0);

  const pool = useMemo(
    () =>
      weapons.filter(
        (w) =>
          (cats.size === 0 || cats.has(w.category)) &&
          (subIds.size === 0 || subIds.has(w.subId)) &&
          (specialIds.size === 0 || specialIds.has(w.specialId)),
      ),
    [weapons, cats, subIds, specialIds],
  );

  // 任一篩選變動都清掉上次結果:結果是「對當下抽選池的一次抽選」,條件變了就回到提示態。
  const toggle = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
    setResult(null);
  };

  const clearDimension = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>) => {
    setter(new Set());
    setResult(null);
  };

  const resetAll = () => {
    setCats(new Set());
    setSubIds(new Set());
    setSpecialIds(new Set());
    setResult(null);
  };

  const draw = () => {
    if (pool.length === 0) return;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    setResult(picked);
    setDrawSeq((s) => s + 1);
  };

  const empty = pool.length === 0;

  return (
    <div>
      {/* ── 篩選區:三維度 chips(品牌區,但維持克制) ───────────────────────── */}
      <section aria-labelledby="filters-heading" className="rounded-lg bg-card-translucent p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="filters-heading"
            className="font-label text-xs uppercase tracking-wide text-muted-on-dark"
          >
            {t('filtersTitle')}
          </h2>
          <button
            type="button"
            onClick={resetAll}
            className="font-label text-xs uppercase tracking-wide text-muted-on-dark underline-offset-2 transition-colors hover:text-text-on-dark hover:underline"
          >
            {t('resetFilters')}
          </button>
        </div>

        <FilterGroup label={t('categoryGroup')} anyLabel={t('any')} onAny={() => clearDimension(setCats)} anyActive={cats.size === 0}>
          {categories.map((cat) => (
            <Chip key={cat} active={cats.has(cat)} onClick={() => toggle(setCats, cat)}>
              {tc(cat)}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label={t('subGroup')} anyLabel={t('any')} onAny={() => clearDimension(setSubIds)} anyActive={subIds.size === 0}>
          {subs.map((s) => (
            <Chip key={s.id} active={subIds.has(s.id)} onClick={() => toggle(setSubIds, s.id)}>
              {s.name}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label={t('specialGroup')} anyLabel={t('any')} onAny={() => clearDimension(setSpecialIds)} anyActive={specialIds.size === 0}>
          {specials.map((s) => (
            <Chip key={s.id} active={specialIds.has(s.id)} onClick={() => toggle(setSpecialIds, s.id)}>
              {s.name}
            </Chip>
          ))}
        </FilterGroup>
      </section>

      {/* ── 抽選列:池計數 + 主 CTA(草綠貼紙鈕,招牌時刻) ───────────────── */}
      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" aria-live="polite" className="font-data text-xs text-muted-on-dark">
          {t('poolCount', { count: pool.length })}
        </p>
        <button
          type="button"
          onClick={draw}
          disabled={empty}
          className="w-full rounded-lg bg-turf-green px-6 py-4 font-label text-sm font-bold uppercase tracking-wider text-ink-900 shadow-sticker transition-transform active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none motion-reduce:transition-none sm:w-auto"
        >
          {result ? t('spinAgain') : t('spin')}
        </button>
      </div>

      {/* ── 揭曉區:抽中結果(品牌區放膽,Splat Magenta 揭曉氛圍) ─────────── */}
      <div className="mt-6">
        {empty ? (
          <p className="rounded-lg border border-dashed border-ink-700 px-4 py-8 text-center font-body text-sm text-muted-on-dark">
            {t('emptyPool')}
          </p>
        ) : result ? (
          <article
            key={drawSeq}
            className="relative overflow-hidden rounded-lg border border-splat-magenta/40 bg-card-translucent p-5 motion-safe:animate-reveal sm:p-6"
          >
            {/* 揭曉輝光(裝飾) */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-splat-magenta opacity-20 blur-3xl"
            />

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Phase 3 將以該分類自繪 SVG 取代此視覺槽;現為霓虹噴濺佔位(裝飾)。 */}
              <div
                aria-hidden
                className="relative grid h-28 w-28 shrink-0 place-items-center rounded-md bg-ink-800"
              >
                <span className="absolute size-16 rounded-full bg-splat-magenta opacity-30 blur-xl" />
                <span className="size-12 rounded-full bg-turf-green opacity-90" />
              </div>

              <div className="min-w-0">
                <p className="font-data text-xs uppercase tracking-[0.2em] text-splat-magenta">
                  {t('resultEyebrow')}
                </p>
                <p className="mt-1 flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-muted-on-dark">
                  <span className="size-2 rounded-full bg-turf-green" aria-hidden />
                  {tc(result.category)}
                </p>
                <h2 className="mt-1 text-balance font-display text-2xl font-extrabold leading-tight text-text-on-dark">
                  {result.name}
                </h2>

                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-on-dark">
                  <div className="flex gap-1.5">
                    <dt className="font-label uppercase tracking-wide">{tw('subLabel')}</dt>
                    <dd className="font-body text-text-on-dark">{result.subName}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="font-label uppercase tracking-wide">{tw('specialLabel')}</dt>
                    <dd className="font-body text-text-on-dark">{result.specialName}</dd>
                  </div>
                </dl>

                <Link
                  href={`/weapons/${result.id}`}
                  className="mt-4 inline-block font-label text-xs uppercase tracking-wide text-turf-green underline-offset-4 transition-opacity hover:underline hover:opacity-80"
                >
                  {t('viewDetails')}
                </Link>
              </div>
            </div>
          </article>
        ) : (
          <p className="rounded-lg border border-dashed border-ink-700 px-4 py-8 text-center font-body text-sm text-muted-on-dark">
            {t('prompt')}
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  區域元件                                                                   */
/* -------------------------------------------------------------------------- */

function FilterGroup({
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
    <div className="mt-4 first:mt-3">
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

function Chip({
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

function chipClass(active: boolean): string {
  return [
    'rounded-pill px-3 py-1.5 font-label text-xs font-bold tracking-wide transition-colors',
    'min-h-[32px] cursor-pointer',
    active
      ? 'bg-turf-green text-ink-900'
      : 'bg-surface-translucent text-text-on-dark hover:bg-white/15',
  ].join(' ');
}
