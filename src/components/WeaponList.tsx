'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SubspeIcon } from '@/components/SubspeIcon';
import { chipClass } from '@/components/chipClass';
import { WEAPON_CATEGORIES, type WeaponCategory } from '@/data/schema';

/** 列表卡片所需的精簡 view-model(名稱已於伺服器端依 locale 解析,client 不持有完整快照)。 */
export interface WeaponCardVM {
  id: string;
  category: WeaponCategory;
  name: string;
  subName: string;
  specialName: string;
  /** §4.3.1 opt-in:主武器官方圖示外部 URL;預設關閉時為 undefined,卡片不渲染圖示。 */
  iconUrl?: string;
  /** §4.3.1 opt-in:副武器圖示外部 URL(預設關閉時 undefined)。 */
  subIconUrl?: string;
  /** §4.3.1 opt-in:特殊武器圖示外部 URL(預設關閉時 undefined)。 */
  specialIconUrl?: string;
}

/** 卡片交替的噴濺強調色(品牌區節奏,避免同質卡海;Two-Zone:列表屬品牌區可用霓虹)。 */
const ACCENTS = ['bg-turf-green', 'bg-splat-magenta', 'bg-ink-purple', 'bg-fresh-yellow'] as const;

export function WeaponList({ items }: { items: WeaponCardVM[] }) {
  const t = useTranslations('Weapons');
  const tc = useTranslations('Categories');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<WeaponCategory>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((w) => {
      if (selected.size > 0 && !selected.has(w.category)) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.subName.toLowerCase().includes(q) ||
        w.specialName.toLowerCase().includes(q)
      );
    });
  }, [items, query, selected]);

  const toggle = (cat: WeaponCategory) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  return (
    <div>
      {/* 搜尋:淺色純白欄(DESIGN input-search) */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        className="w-full rounded-md bg-white px-3.5 py-2.5 font-body text-panel-ink placeholder:text-panel-muted"
      />

      {/* 分類篩選:pill chips,多選 toggle */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          aria-pressed={selected.size === 0}
          className={chipClass(selected.size === 0)}
        >
          {t('allCategories')}
        </button>
        {WEAPON_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => toggle(cat)}
            aria-pressed={selected.has(cat)}
            className={chipClass(selected.has(cat))}
          >
            {tc(cat)}
          </button>
        ))}
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
            onClick={() => {
              setQuery('');
              setSelected(new Set());
            }}
            className="rounded-lg border border-ink-700 px-4 py-2.5 font-label text-xs font-bold uppercase tracking-wide text-text-on-dark transition-colors duration-150 ease-state hover:border-muted-on-dark hover:bg-white/5 motion-reduce:transition-none"
          >
            {t('clearFilters')}
          </button>
        </div>
      ) : (
        <ul role="list" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w, i) => (
            <li key={w.id}>
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
      )}
    </div>
  );
}
