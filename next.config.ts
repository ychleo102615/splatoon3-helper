import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { routing } from './src/i18n/routing';

const nextConfig: NextConfig = {
  // localePrefix 'always' + 無 middleware:裸 `/`(無語言前綴)本身沒有對應頁面。
  // 用 HTTP 轉址(307)把它導到預設語言,單一事實來源為 routing.defaultLocale。
  // 註:此為伺服器端轉址,適用 `next start` / Vercel;改用 `output: 'export'` 時
  //     redirects() 不生效,需改由 host(CDN)層設定同等轉址。
  async redirects() {
    return [
      {
        source: '/',
        destination: `/${routing.defaultLocale}`,
        permanent: false,
      },
    ];
  },
};

// 預設讀取 ./src/i18n/request.ts;next-intl 的 App Router i18n 設定入口。
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
