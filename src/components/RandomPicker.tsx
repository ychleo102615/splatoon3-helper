'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { StickerButton } from '@/components/StickerButton';
import { SubspeIcon } from '@/components/SubspeIcon';
import { chipClass } from '@/components/chipClass';
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
  /** §4.3.1 opt-in:主武器官方圖示外部 URL;預設關閉時 undefined,揭曉卡維持自繪佔位。 */
  iconUrl?: string;
  /** §4.3.1 opt-in:副武器圖示徽章外部 URL(預設關閉時 undefined)。 */
  subIconUrl?: string;
  /** §4.3.1 opt-in:特殊武器圖示徽章外部 URL(預設關閉時 undefined)。 */
  specialIconUrl?: string;
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
        <StickerButton onClick={draw} disabled={empty} className="w-full sm:w-auto">
          {result ? t('spinAgain') : t('spin')}
        </StickerButton>
      </div>

      {/* ── 揭曉區:抽中結果(品牌區放膽,Splat Magenta 揭曉氛圍) ─────────── */}
      <div className="mt-6">
        {empty ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ink-700 px-4 py-8 text-center">
            <p className="font-body text-sm text-text-on-dark">{t('emptyPool')}</p>
            <p className="max-w-[40ch] font-body text-xs leading-relaxed text-muted-on-dark">
              {t('emptyPoolHint')}
            </p>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-ink-700 px-4 py-2 font-label text-xs font-bold uppercase tracking-wide text-text-on-dark transition-colors duration-150 ease-state hover:border-muted-on-dark hover:bg-white/5 motion-reduce:transition-none"
            >
              {t('resetFilters')}
            </button>
          </div>
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
              {/* 視覺槽:霓虹噴濺底(品牌氛圍)。§4.3.1 opt-in 開啟時疊上官方主武器圖;
                  未啟用(預設)維持自繪綠點佔位,版面與「全自繪」狀態一致。Phase 3 將改為該分類自繪 SVG。 */}
              <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-md bg-ink-800">
                <span
                  aria-hidden
                  className="absolute size-16 rounded-full bg-splat-magenta opacity-30 blur-xl"
                />
                {result.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- §4.3.1 opt-in 外部圖,刻意用 <img> 避開 next/image 遠端 host 設定
                  <img
                    src={result.iconUrl}
                    alt={tw('iconAlt', { name: result.name })}
                    width={88}
                    height={88}
                    loading="lazy"
                    className="relative size-[88px] object-contain drop-shadow"
                  />
                ) : (
                  <span aria-hidden className="size-12 rounded-full bg-turf-green opacity-90" />
                )}
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
                  <div className="flex items-center gap-1.5">
                    <dt className="font-label uppercase tracking-wide">{tw('subLabel')}</dt>
                    {/* §4.3.1 opt-in:副武器圖示徽章(淺色背板);未啟用時不渲染。 */}
                    {result.subIconUrl ? (
                      <SubspeIcon
                        src={result.subIconUrl}
                        alt={tw('iconAlt', { name: result.subName })}
                        className="size-5 p-0.5"
                      />
                    ) : null}
                    <dd className="font-body text-text-on-dark">{result.subName}</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <dt className="font-label uppercase tracking-wide">{tw('specialLabel')}</dt>
                    {/* §4.3.1 opt-in:特殊武器圖示徽章;未啟用時不渲染。 */}
                    {result.specialIconUrl ? (
                      <SubspeIcon
                        src={result.specialIconUrl}
                        alt={tw('iconAlt', { name: result.specialName })}
                        className="size-5 p-0.5"
                      />
                    ) : null}
                    <dd className="font-body text-text-on-dark">{result.specialName}</dd>
                  </div>
                </dl>

                <Link
                  href={`/weapons/${result.id}`}
                  className="mt-4 inline-block font-label text-xs uppercase tracking-wide text-text-on-dark underline decoration-white/40 underline-offset-4 transition-colors duration-150 ease-state hover:decoration-text-on-dark motion-reduce:transition-none"
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
