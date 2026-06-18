import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Bungee, IBM_Plex_Mono, M_PLUS_Rounded_1c } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import '../globals.css';

// 武器名 / CJK 標題 / UI 內文皆走 M PLUS Rounded 1c(可渲染日文/中文)。
const mplus = M_PLUS_Rounded_1c({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-mplus',
  display: 'swap',
});

// 拉丁字招牌專用,不含 CJK,絕不套武器名。
const bungee = Bungee({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bungee',
  display: 'swap',
});

// 規格表數值與編號。
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // 啟用靜態渲染(SSG);規格 §5.2 的資料取得策略。
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${mplus.variable} ${bungee.variable} ${mono.variable}`}
    >
      <body className="min-h-dvh">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
