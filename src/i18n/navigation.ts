import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// locale 感知的導航工具,元件一律從這裡 import,不直接用 next/link。
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
