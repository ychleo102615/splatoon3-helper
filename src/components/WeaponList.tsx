'use client';

import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SubspeIcon } from '@/components/SubspeIcon';
import { FilterGroup, Chip, type FilterOption } from '@/components/FilterGroup';
import { CollapsiblePanel } from '@/components/CollapsiblePanel';
import { ActiveFilterTokens, type FilterToken } from '@/components/FilterTokens';
import { RangeSlider, type RangeValue, type RangeMark } from '@/components/RangeSlider';
import {
  matchesFilters,
  isRangeLimited,
  buildRangeMarks,
  type FilterCriteria,
} from '@/components/weaponFilters';
import { usePersistentState, type PersistentCodec } from '@/components/usePersistentState';
import {
  WEAPONS_FILTER_KEY,
  WEAPONS_FILTERS_OPEN_KEY,
  serializeCriteria,
  deserializeCriteria,
  type FilterOptions,
} from '@/components/filterStorage';
import type { WeaponCategory } from '@/data/schema';

/** 列表頁的完整篩選狀態:共用的 FilterCriteria + 列表頁特有的搜尋字串。 */
type WeaponsFilter = FilterCriteria & { query: string };

/** 列表卡片所需的精簡 view-model(名稱已於伺服器端依 locale 解析,client 不持有完整快照)。 */
export interface WeaponCardVM {
  id: string;
  category: WeaponCategory;
  name: string;
  subId: string;
  subName: string;
  specialId: string;
  specialName: string;
  /** 射程相對值(0–100);用於射程區間篩選。快照缺值時為 null(視為不符射程限制)。 */
  range: number | null;
  /** §4.3.1 opt-in:主武器官方圖示外部 URL;預設關閉時為 undefined,卡片不渲染圖示。 */
  iconUrl?: string;
  /** §4.3.1 opt-in:副武器圖示外部 URL(預設關閉時 undefined)。 */
  subIconUrl?: string;
  /** §4.3.1 opt-in:特殊武器圖示外部 URL(預設關閉時 undefined)。 */
  specialIconUrl?: string;
}

interface Props {
  items: WeaponCardVM[];
  /** 出現在列表中的分類(依 WEAPON_CATEGORIES 正序);名稱走 Categories i18n。 */
  categories: WeaponCategory[];
  subs: FilterOption[];
  specials: FilterOption[];
  /** 射程滑桿軌道邊界(= 資料實際 min/max)。 */
  rangeBounds: RangeValue;
}

/** 卡片交替的噴濺強調色(品牌區節奏,避免同質卡海;Two-Zone:列表屬品牌區可用霓虹)。 */
const ACCENTS = ['bg-turf-green', 'bg-splat-magenta', 'bg-ink-purple', 'bg-fresh-yellow'] as const;

/** 展開 / 收合偏好的存檔形狀:就是一個布林。壞值 / 缺值退回 true(= 沿用原本的完整檢視)。 */
const FILTERS_OPEN_CODEC: PersistentCodec<boolean> = {
  serialize: (open) => open,
  deserialize: (raw) => (typeof raw === 'boolean' ? raw : true),
};

export function WeaponList({ items, categories, subs, specials, rangeBounds }: Props) {
  const t = useTranslations('Weapons');
  const tc = useTranslations('Categories');

  // 整份篩選狀態收斂為一筆記錄,暫存到 localStorage:重新整理後沿用上次條件。
  // 還原時對「當前快照」清洗(剔除已不存在的 id、射程夾回邊界),語意層見 filterStorage.ts。
  const codec = useMemo<PersistentCodec<WeaponsFilter>>(() => {
    const options: FilterOptions = {
      cats: new Set(categories),
      subIds: new Set(subs.map((s) => s.id)),
      specialIds: new Set(specials.map((s) => s.id)),
      bounds: rangeBounds,
    };
    return {
      serialize: (f) => ({ query: f.query, ...serializeCriteria(f) }),
      deserialize: (raw) => {
        const o = (raw ?? {}) as { query?: unknown };
        return {
          query: typeof o.query === 'string' ? o.query : '',
          ...deserializeCriteria(raw, options),
        };
      },
    };
  }, [categories, subs, specials, rangeBounds]);

  const [filters, setFilters] = usePersistentState<WeaponsFilter>(
    WEAPONS_FILTER_KEY,
    () => ({ query: '', cats: new Set(), subIds: new Set(), specialIds: new Set(), range: { ...rangeBounds } }),
    codec,
  );
  // 解構出同名 local,讓下方讀取維持不變;變更一律經 patch 合併回單一記錄。
  const { query, cats, subIds, specialIds, range } = filters;
  const patch = (p: Partial<WeaponsFilter>) => setFilters((f) => ({ ...f, ...p }));

  // 簡化模式開合:展開 = 完整 chip picker;收合 = 只留已選 token。與條件分檔持久化(見 filterStorage)。
  const [filtersOpen, setFiltersOpen] = usePersistentState<boolean>(
    WEAPONS_FILTERS_OPEN_KEY,
    true,
    FILTERS_OPEN_CODEC,
  );

  const rangeMarks: RangeMark[] = useMemo(
    () => buildRangeMarks(rangeBounds, (k) => t(k)),
    [rangeBounds, t],
  );

  // 維度語意由 matchesFilters 統一定義(與隨機器同一份);搜尋字串在外層另外 AND 疊加。
  const filtered = useMemo(() => {
    const criteria = { cats, subIds, specialIds, range };
    const q = query.trim().toLowerCase();
    return items.filter((w) => {
      if (!matchesFilters(w, criteria, rangeBounds)) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.subName.toLowerCase().includes(q) ||
        w.specialName.toLowerCase().includes(q)
      );
    });
  }, [items, query, cats, subIds, specialIds, range, rangeBounds]);

  const toggleIn = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const hasActiveFilters =
    query.trim() !== '' ||
    cats.size > 0 ||
    subIds.size > 0 ||
    specialIds.size > 0 ||
    isRangeLimited(range, rangeBounds);

  const clearAll = () =>
    setFilters({
      query: '',
      cats: new Set(),
      subIds: new Set(),
      specialIds: new Set(),
      range: { ...rangeBounds },
    });

  // 已選條件 → 可逐一刪除的 token(簡化模式內容)。副 / 特殊的顯示名與圖示由選項表反查;
  // 射程僅在有設限時成為一顆 token(滿格 = 不限,不顯示)。搜尋字串自有輸入框,不入 token。
  const subById = useMemo(() => new Map(subs.map((s) => [s.id, s])), [subs]);
  const specialById = useMemo(() => new Map(specials.map((s) => [s.id, s])), [specials]);
  const without = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    next.delete(value);
    return next;
  };
  const tokens: FilterToken[] = [
    ...[...cats].map((c) => ({
      key: `cat:${c}`,
      label: tc(c),
      onRemove: () => patch({ cats: without(cats, c) }),
    })),
    ...[...subIds].map((id) => ({
      key: `sub:${id}`,
      label: subById.get(id)?.name ?? id,
      iconUrl: subById.get(id)?.iconUrl,
      onRemove: () => patch({ subIds: without(subIds, id) }),
    })),
    ...[...specialIds].map((id) => ({
      key: `spe:${id}`,
      label: specialById.get(id)?.name ?? id,
      iconUrl: specialById.get(id)?.iconUrl,
      onRemove: () => patch({ specialIds: without(specialIds, id) }),
    })),
    ...(isRangeLimited(range, rangeBounds)
      ? [
          {
            key: 'range',
            label: t('rangeToken', { min: range.min, max: range.max }),
            onRemove: () => patch({ range: { ...rangeBounds } }),
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* 搜尋:淺色純白欄(DESIGN input-search) */}
      <input
        type="search"
        value={query}
        onChange={(e) => patch({ query: e.target.value })}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        className="w-full rounded-md bg-white px-3.5 py-2.5 font-body text-panel-ink placeholder:text-panel-muted"
      />

      {/* 篩選面板:可收合(簡化模式)。展開 = 完整 chip picker;收合 = 已選條件 token 摘要。 */}
      <div className="mt-4">
        <CollapsiblePanel
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          header={
            <h2 className="font-label text-xs uppercase tracking-wide text-muted-on-dark">
              {t('filtersTitle')}
            </h2>
          }
          expandLabel={t('filtersExpand')}
          collapseLabel={t('filtersCollapse')}
          toolbar={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAll}
                className="font-label text-xs uppercase tracking-wide text-muted-on-dark underline-offset-2 transition-colors hover:text-text-on-dark hover:underline"
              >
                {t('clearFilters')}
              </button>
            ) : null
          }
          summary={
            <ActiveFilterTokens
              tokens={tokens}
              onAdd={() => setFiltersOpen(true)}
              addLabel={t('addCondition')}
              emptyLabel={t('noConditions')}
              removeLabel={(name) => t('removeCondition', { name })}
            />
          }
        >
          <FilterGroup
            label={t('categoryGroup')}
            anyLabel={t('any')}
            anyActive={cats.size === 0}
            onAny={() => patch({ cats: new Set() })}
          >
            {categories.map((cat) => (
              <Chip key={cat} active={cats.has(cat)} onClick={() => patch({ cats: toggleIn(cats, cat) })}>
                {tc(cat)}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup
            label={t('subLabel')}
            anyLabel={t('any')}
            anyActive={subIds.size === 0}
            onAny={() => patch({ subIds: new Set() })}
          >
            {subs.map((s) => (
              <Chip
                key={s.id}
                active={subIds.has(s.id)}
                icon={s.iconUrl}
                onClick={() => patch({ subIds: toggleIn(subIds, s.id) })}
              >
                {s.name}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup
            label={t('specialLabel')}
            anyLabel={t('any')}
            anyActive={specialIds.size === 0}
            onAny={() => patch({ specialIds: new Set() })}
          >
            {specials.map((s) => (
              <Chip
                key={s.id}
                active={specialIds.has(s.id)}
                icon={s.iconUrl}
                onClick={() => patch({ specialIds: toggleIn(specialIds, s.id) })}
              >
                {s.name}
              </Chip>
            ))}
          </FilterGroup>

          <div className="mt-4">
            <RangeSlider
              bound={rangeBounds}
              value={range}
              onChange={(next) => patch({ range: next })}
              label={t('rangeGroup')}
              minHandleLabel={t('rangeMin')}
              maxHandleLabel={t('rangeMax')}
              anyLabel={t('any')}
              resetLabel={t('rangeReset')}
              marks={rangeMarks}
            />
          </div>
        </CollapsiblePanel>
      </div>

      {/* 結果計數(螢幕報讀) */}
      <p role="status" aria-live="polite" className="mt-4 font-data text-xs text-muted-on-dark">
        {t('results', { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-8 flex flex-col items-start gap-3">
          <p className="font-body text-text-on-dark">{t('empty')}</p>
          <p className="max-w-[50ch] font-body text-sm text-muted-on-dark">{t('emptyHint')}</p>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-ink-700 px-4 py-2.5 font-label text-xs font-bold uppercase tracking-wide text-text-on-dark transition-colors duration-150 ease-state hover:border-muted-on-dark hover:bg-white/5 motion-reduce:transition-none"
          >
            {t('clearFilters')}
          </button>
        </div>
      ) : (
        <WeaponGrid items={filtered} />
      )}
    </div>
  );
}

/**
 * 結果卡格(173 張卡)。抽成 `memo` 並只吃 `items`:篩選面板開合(`filtersOpen`)時,
 * 父層 `filtered` 參考不變 → 跳過整格重渲染,避免「切換介面」連帶重建上百張卡的 React 成本。
 * 自取 i18n(非以 prop 傳入)以保 memo 邊界乾淨。搭配 `<li>` 的 `content-visibility:auto`
 * (畫面外卡跳過 paint/raster),分別壓下開合時的「JS 重渲染」與「重繪」兩大成本。
 */
const WeaponGrid = memo(function WeaponGrid({ items }: { items: WeaponCardVM[] }) {
  const t = useTranslations('Weapons');
  const tc = useTranslations('Categories');
  return (
    <ul role="list" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((w, i) => (
        <li key={w.id} className="[content-visibility:auto] [contain-intrinsic-size:auto_120px]">
          <Link href={`/weapons/${w.id}`} className="group block h-full rounded-lg">
            <article className="relative h-full overflow-hidden rounded-lg bg-card-translucent p-3 transition-[background-color,transform] duration-150 ease-state group-hover:bg-white/10 group-focus-visible:bg-white/10 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-focus-visible:-translate-y-0.5 motion-reduce:transition-none">
              {/* 交替噴濺色塊(裝飾,品牌區) */}
              <span
                aria-hidden
                className={`pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-20 blur-2xl ${ACCENTS[i % ACCENTS.length]}`}
              />
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-muted-on-dark">
                    <span className={`size-2 rounded-full ${ACCENTS[i % ACCENTS.length]}`} aria-hidden />
                    {tc(w.category)}
                  </p>
                  <h2 className="mt-1.5 text-balance font-display text-lg font-bold leading-tight text-text-on-dark">
                    {w.name}
                  </h2>
                </div>
                {/* §4.3.1 opt-in:官方圖示(外部 hotlink);未啟用時 iconUrl 為 undefined → 不渲染,版面不變。 */}
                {w.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 刻意用 <img>:opt-in 外部圖,避免 next/image 遠端 host 設定
                  <img
                    src={w.iconUrl}
                    alt={t('iconAlt', { name: w.name })}
                    width={56}
                    height={56}
                    loading="lazy"
                    className="size-14 shrink-0 object-contain drop-shadow"
                  />
                ) : null}
              </div>
              <dl className="mt-2 space-y-1 text-xs text-muted-on-dark">
                <div className="flex items-center gap-1.5">
                  <dt className="font-label uppercase tracking-wide">{t('subLabel')}</dt>
                  {/* §4.3.1 opt-in:副武器圖示徽章(淺色背板);未啟用時不渲染。 */}
                  {w.subIconUrl ? (
                    <SubspeIcon
                      src={w.subIconUrl}
                      alt={t('iconAlt', { name: w.subName })}
                      className="size-5 p-0.5"
                    />
                  ) : null}
                  <dd className="font-body text-text-on-dark">{w.subName}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="font-label uppercase tracking-wide">{t('specialLabel')}</dt>
                  {/* §4.3.1 opt-in:特殊武器圖示徽章;未啟用時不渲染。 */}
                  {w.specialIconUrl ? (
                    <SubspeIcon
                      src={w.specialIconUrl}
                      alt={t('iconAlt', { name: w.specialName })}
                      className="size-5 p-0.5"
                    />
                  ) : null}
                  <dd className="font-body text-text-on-dark">{w.specialName}</dd>
                </div>
              </dl>
            </article>
          </Link>
        </li>
      ))}
    </ul>
  );
});
