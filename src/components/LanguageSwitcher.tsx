'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

// 顯示順序固定為 中 / JP / EN(對齊 DESIGN.md 語言切換元件)。
const DISPLAY: { locale: Locale; label: string }[] = [
  { locale: 'zh-TW', label: '中' },
  { locale: 'ja-JP', label: 'JP' },
  { locale: 'en', label: 'EN' },
];

export function LanguageSwitcher() {
  const active = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('LanguageSwitcher');

  return (
    <div role="group" aria-label={t('label')} className="inline-flex gap-1">
      {DISPLAY.map(({ locale, label }) => {
        const current = locale === active;
        return (
          <button
            key={locale}
            type="button"
            aria-current={current ? 'true' : undefined}
            onClick={() => router.replace(pathname, { locale })}
            className={[
              'rounded-sm px-2 py-1 text-xs font-bold transition-colors',
              'min-h-[28px] cursor-pointer',
              current
                ? 'bg-splat-magenta text-white'
                : 'text-muted-on-dark hover:text-text-on-dark',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
