import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next 16 將 middleware 慣例更名為 proxy;next-intl 的 locale 偵測/重導在此執行。
export default createMiddleware(routing);

export const config = {
  // 略過 API、Next 內部路徑與帶副檔名的靜態資源(如 .svg / .png)。
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
