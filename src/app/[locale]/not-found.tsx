import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link } from '@/i18n/navigation';

/**
 * 在地化 404(規格 §2.1 四語平等)。
 *
 * 接住 `[locale]/weapons/[id]/page.tsx` 對未知 id 拋出的 `notFound()`,
 * 以及任何 locale 內未匹配的路徑。由 `[locale]/layout.tsx` 包裹,
 * 其 `setRequestLocale` 已設定請求 locale,故 `useTranslations` 正確取得當前語言。
 *
 * 維持品牌外殼(墨黑底霓虹 + wordmark + 常駐語言切換 + 合規 footer),
 * 並提供明確復原出口(回武器一覽),不是死巷。
 */
export default function LocaleNotFound() {
  const t = useTranslations('NotFound');
  const tf = useTranslations('Footer');

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* 品牌外殼:墨黑底上的霓虹輝光(裝飾,純品牌區) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-turf-green opacity-20 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-splat-magenta opacity-15 blur-3xl" />
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

      <main className="flex flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-xl">
          <p className="font-data text-xs uppercase tracking-[0.2em] text-splat-magenta">404</p>

          <h1 className="mt-3 text-balance font-display text-[clamp(1.75rem,6vw,3rem)] font-extrabold leading-[0.95] tracking-tight text-text-on-dark">
            {t('title')}
          </h1>

          <p className="mt-4 max-w-[60ch] font-body leading-relaxed text-muted-on-dark">
            {t('body')}
          </p>

          <Link
            href="/weapons"
            className="mt-8 inline-flex items-center justify-center rounded-lg border border-ink-700 px-5 py-3 font-label text-sm font-bold uppercase tracking-wider text-text-on-dark transition-colors duration-150 ease-state hover:border-muted-on-dark hover:bg-white/5 motion-reduce:transition-none"
          >
            {t('backToList')}
          </Link>
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
