import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// 裸 `/`(無語言前綴)的語言偵測與轉址交由 src/proxy.ts(next-intl middleware)處理,
// 以尊重瀏覽器 Accept-Language 與 NEXT_LOCALE cookie(三語一等公民,規格 §2.1)。
// 不在此用 next.config 的 redirects() 硬編碼 `/ → /<defaultLocale>`:config redirects
// 在 Next 路由管線中先於 middleware 執行,會搶在語言偵測之前無條件導向預設語言。
// 注意:此偵測依賴 middleware 執行,僅適用 `next start` / Vercel。若日後改
// `output: 'export'`,middleware 不會執行,需改由 host(CDN)層設定 `/` 的語言轉址。
const nextConfig: NextConfig = {};

// 預設讀取 ./src/i18n/request.ts;next-intl 的 App Router i18n 設定入口。
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
