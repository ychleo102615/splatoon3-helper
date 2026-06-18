import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {};

// 預設讀取 ./src/i18n/request.ts;next-intl 的 App Router i18n 設定入口。
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
