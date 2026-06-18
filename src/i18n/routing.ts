import { defineRouting } from 'next-intl/routing';

/**
 * 三語為一等公民(規格 §2.1、PRODUCT 原則 5)。
 * locale 代碼與 splatoon3.ink 對齊:ja-JP / zh-TW / en。
 * localePrefix 'always':每個語言都顯式出現在網址,行為可預測、利於 SSG。
 */
export const routing = defineRouting({
  locales: ['ja-JP', 'zh-TW', 'en'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
