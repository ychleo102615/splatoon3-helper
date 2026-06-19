import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { weaponIconUrl, subspeIconUrl } from '@/config/icons';
import {
  weapons,
  weaponById,
  weaponName,
  subWeaponName,
  specialWeaponName,
  subWeaponBlurb,
  specialWeaponBlurb,
  subWeaponIconName,
  specialWeaponIconName,
  snapshotMeta,
  type SnapshotLocale,
} from '@/data/weapons';

/** 全 locale × 全武器預產(SSG,規格 §5.2)。 */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => weapons.map((w) => ({ locale, id: w.id })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const w = weaponById(id);
  if (!w) return {};
  return { title: `${weaponName(w, locale as SnapshotLocale)} — SPLAT-DEX` };
}

/** 規格表的數值分組順序。 */
const STAT_ORDER = ['range', 'damage', 'inkConsumption', 'cadence'] as const;

export default async function WeaponDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const loc = locale as SnapshotLocale;
  const w = weaponById(id);
  if (!w) notFound();

  const t = await getTranslations('Weapons');
  const ts = await getTranslations('Stats');
  const tc = await getTranslations('Categories');
  const tf = await getTranslations('Footer');

  // §4.3.1 opt-in:官方圖示 URL;預設關閉(或無 iconName)時為 null → 不渲染圖示。
  const iconUrl = weaponIconUrl(w.iconName);
  const subIconUrl = subspeIconUrl(subWeaponIconName(w.subWeaponId));
  const specialIconUrl = subspeIconUrl(specialWeaponIconName(w.specialWeaponId));
  const name = weaponName(w, loc);

  // 段落語意 label:有翻譯用翻譯,否則退回原始 key(防止漏字串時崩潰)。
  const seg = (label?: string) =>
    label && ts.has(`seg.${label}`) ? ts(`seg.${label}`) : (label ?? '');
  const fmtValue = (s: { value: number; unit: string }) => {
    switch (s.unit) {
      case 'percent':
        return `${s.value}%`;
      case 'frame':
        return `${s.value} ${ts('unit.frame')}`;
      case 'second':
        return `${s.value} ${ts('unit.second')}`;
      default:
        return `${s.value}`;
    }
  };

  const groups = STAT_ORDER.map((key) => ({
    key,
    entries: w.coreStats.filter((s) => s.key === key),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-turf-green opacity-20 blur-3xl" />
        <div className="absolute -right-20 top-1/4 h-64 w-64 rounded-full bg-splat-magenta opacity-15 blur-3xl" />
      </div>

      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="font-wordmark text-lg tracking-wide text-text-on-dark transition-opacity hover:opacity-80"
        >
          SPLAT-DEX
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 px-5 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <Link
            href="/weapons"
            className="inline-block font-label text-xs uppercase tracking-wide text-muted-on-dark transition-colors hover:text-text-on-dark"
          >
            {t('backToList')}
          </Link>

          {/* 品牌區:分類 + 武器名(招牌時刻) */}
          <div className="mt-3 flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-muted-on-dark">
                <span className="size-2 rounded-full bg-turf-green" aria-hidden />
                {tc(w.category)}
              </p>
              <h1 className="mt-2 text-balance font-display text-[clamp(1.75rem,6vw,3rem)] font-extrabold leading-[0.95] tracking-tight text-text-on-dark">
                {name}
              </h1>
            </div>
            {/* §4.3.1 opt-in:官方圖示(外部 hotlink);未啟用時 iconUrl 為 null → 不渲染,版面與原狀一致。 */}
            {iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- 刻意用 <img>:opt-in 外部圖,避免 next/image 遠端 host 設定
              <img
                src={iconUrl}
                alt={t('iconAlt', { name })}
                width={96}
                height={96}
                className="size-20 shrink-0 object-contain drop-shadow sm:size-24"
              />
            ) : null}
          </div>

          {/* 資料區:規格表(Two-Zone 的淺色冷靜面板) */}
          <section
            aria-label={ts('title')}
            className="mt-6 rounded-md bg-panel-bg p-4 text-panel-ink shadow-panel-lift sm:p-6"
          >
            <h2 className="font-label text-xs uppercase tracking-[0.04em] text-panel-muted">
              {ts('title')}
            </h2>

            <div className="mt-3">
              {groups.map((g) => (
                <div
                  key={g.key}
                  className="border-t border-panel-line pt-3 first:border-t-0 first:pt-0 [&+&]:mt-3"
                >
                  <p className="font-label text-xs uppercase tracking-wide text-panel-muted">
                    {ts(`key.${g.key}`)}
                  </p>
                  {g.entries.map((s, i) => (
                    <div key={`${s.key}-${s.label ?? i}`} className="mt-1.5 flex items-center gap-3">
                      {s.label ? (
                        <span className="font-body text-sm text-panel-ink">{seg(s.label)}</span>
                      ) : null}
                      {g.key === 'range' ? (
                        <span
                          className="h-1.5 flex-1 overflow-hidden rounded-pill bg-panel-line"
                          aria-hidden
                        >
                          <span
                            className="block h-full rounded-pill bg-callout-amber"
                            style={{ width: `${Math.min(100, s.value)}%` }}
                          />
                        </span>
                      ) : null}
                      <span className="ml-auto font-data text-sm text-panel-ink">{fmtValue(s)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* §4.5:數值表標註對應遊戲版本 */}
            <p className="mt-4 font-data text-xs text-panel-muted">
              {ts('version', { version: snapshotMeta.gameVersion })}
            </p>
          </section>

          {/* 副 / 特殊武器:名稱 + 一行簡述(§3.1,不做獨立詳情頁) */}
          <section className="mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <h2 className="font-label text-xs uppercase tracking-wide text-muted-on-dark">
                {t('subLabel')}
              </h2>
              <div className="mt-1 flex items-center gap-2.5">
                {/* §4.3.1 opt-in:副武器圖示;未啟用時為 null → 不渲染,版面不變。 */}
                {subIconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 刻意用 <img>:opt-in 外部圖,避免 next/image 遠端 host 設定
                  <img
                    src={subIconUrl}
                    alt={t('iconAlt', { name: subWeaponName(w.subWeaponId, loc) })}
                    width={40}
                    height={40}
                    loading="lazy"
                    className="size-9 shrink-0 object-contain drop-shadow"
                  />
                ) : null}
                <p className="font-display text-base font-bold text-text-on-dark">
                  {subWeaponName(w.subWeaponId, loc)}
                </p>
              </div>
              <p className="mt-1 font-body text-sm leading-relaxed text-muted-on-dark">
                {subWeaponBlurb(w.subWeaponId, loc)}
              </p>
            </div>
            <div>
              <h2 className="font-label text-xs uppercase tracking-wide text-muted-on-dark">
                {t('specialLabel')}
              </h2>
              <div className="mt-1 flex items-center gap-2.5">
                {/* §4.3.1 opt-in:特殊武器圖示;未啟用時為 null → 不渲染,版面不變。 */}
                {specialIconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 刻意用 <img>:opt-in 外部圖,避免 next/image 遠端 host 設定
                  <img
                    src={specialIconUrl}
                    alt={t('iconAlt', { name: specialWeaponName(w.specialWeaponId, loc) })}
                    width={40}
                    height={40}
                    loading="lazy"
                    className="size-9 shrink-0 object-contain drop-shadow"
                  />
                ) : null}
                <p className="font-display text-base font-bold text-text-on-dark">
                  {specialWeaponName(w.specialWeaponId, loc)}
                </p>
              </div>
              <p className="mt-1 font-body text-sm leading-relaxed text-muted-on-dark">
                {specialWeaponBlurb(w.specialWeaponId, loc)}
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-6 border-t border-ink-700 px-5 py-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 font-data text-xs text-muted-on-dark">
          <span>{tf('disclaimer')}</span>
          <span>{tf('dataSource')}</span>
        </div>
      </footer>
    </div>
  );
}
