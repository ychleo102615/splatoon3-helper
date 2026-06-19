import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link } from '@/i18n/navigation';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Home');
  const tf = await getTranslations('Footer');

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* 品牌外殼:墨黑底上的霓虹輝光(裝飾,純品牌區) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-turf-green opacity-20 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-splat-magenta opacity-15 blur-3xl" />
      </div>

      {/* 頂部列:拉丁字招牌 + 常駐語言切換 */}
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <span className="font-wordmark text-lg tracking-wide text-text-on-dark">
          SPLAT-DEX
        </span>
        <LanguageSwitcher />
      </header>

      {/* Hero(招牌時刻) */}
      <main className="flex flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-xl">
          <p className="font-data text-xs uppercase tracking-[0.2em] text-muted-on-dark">
            Splatoon&nbsp;3 · Weapon&nbsp;Dex
          </p>

          <h1 className="mt-3 text-balance font-display text-[clamp(1.75rem,6vw,3rem)] font-extrabold leading-[0.95] tracking-tight text-text-on-dark">
            {t('tagline')}
          </h1>

          <p className="mt-4 max-w-[65ch] font-body leading-relaxed text-muted-on-dark">
            {t('lede')}
          </p>

          {/* 功能尚未實作 — 按鈕作視覺預覽,標記施工中 */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-pill bg-surface-translucent px-3 py-1 font-data text-xs uppercase tracking-wider text-muted-on-dark">
              <span className="size-1.5 rounded-full bg-fresh-yellow" />
              {t('comingSoon')}
            </span>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-lg bg-turf-green px-5 py-4 text-sm font-bold uppercase tracking-wider text-ink-900 shadow-sticker disabled:opacity-60"
              >
                {t('randomPicker')}
              </button>
              <Link
                href="/weapons"
                className="rounded-lg border border-ink-700 px-5 py-4 text-sm font-bold uppercase tracking-wider text-text-on-dark transition-colors hover:border-muted-on-dark"
              >
                {t('browseWeapons')}
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* 合規(規格 §4.1 / §4.4):非官方聲明 + 來源標註,常駐 */}
      <footer className="border-t border-ink-700 px-5 py-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-1 font-data text-xs text-muted-on-dark">
          <span>{tf('disclaimer')}</span>
          <span>{tf('dataSource')}</span>
        </div>
      </footer>
    </div>
  );
}
