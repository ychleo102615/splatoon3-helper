import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { WeaponsBrowser } from '@/components/WeaponsBrowser';
import type { WeaponCardVM } from '@/components/WeaponList';
import type { FilterOption } from '@/components/FilterGroup';
import { Link } from '@/i18n/navigation';
import { weaponIconUrl, subspeIconUrl } from '@/config/icons';
import {
  WEAPON_CATEGORIES,
  weapons,
  weaponName,
  weaponRange,
  subWeaponName,
  specialWeaponName,
  subWeaponIconName,
  specialWeaponIconName,
  type SnapshotLocale,
  type WeaponCategory,
} from '@/data/weapons';

const CATEGORY_ORDER = new Map(WEAPON_CATEGORIES.map((c, i) => [c, i]));

/**
 * 由 id 陣列去重、解析在地化名稱、依名稱排序,產出篩選選項(與隨機器同一套維度)。
 * `iconOf` 為 §4.3.1 opt-in:回 URL 則 chip / token 圖文降階,回 null(預設關閉)則 undefined → 純文字。
 */
function buildOptions(
  ids: string[],
  nameOf: (id: string) => string,
  loc: SnapshotLocale,
  iconOf: (id: string) => string | null,
): FilterOption[] {
  return [...new Set(ids)]
    .map((id) => ({ id, name: nameOf(id), iconUrl: iconOf(id) ?? undefined }))
    .sort((a, b) => a.name.localeCompare(b.name, loc));
}

export default async function WeaponsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as SnapshotLocale;
  const t = await getTranslations('Weapons');
  const tf = await getTranslations('Footer');

  // 伺服器端依 locale 解析名稱、依分類正序 + 在地化名稱排序,client 只收精簡 VM(SSG,規格 §5.2)。
  const items: WeaponCardVM[] = weapons
    .map((w) => ({
      id: w.id,
      category: w.category,
      name: weaponName(w, loc),
      subId: w.subWeaponId,
      subName: subWeaponName(w.subWeaponId, loc),
      specialId: w.specialWeaponId,
      specialName: specialWeaponName(w.specialWeaponId, loc),
      // 射程相對值(0–100);用於 client 端「射程區間」篩選。全覆蓋,防禦性保留 null。
      range: weaponRange(w),
      // §4.3.1 opt-in:預設關閉時為 null → 轉 undefined,卡片不渲染圖示、版面不變。
      iconUrl: weaponIconUrl(w.iconName) ?? undefined,
      subIconUrl: subspeIconUrl(subWeaponIconName(w.subWeaponId)) ?? undefined,
      specialIconUrl: subspeIconUrl(specialWeaponIconName(w.specialWeaponId)) ?? undefined,
    }))
    .sort(
      (a, b) =>
        (CATEGORY_ORDER.get(a.category) ?? 0) - (CATEGORY_ORDER.get(b.category) ?? 0) ||
        a.name.localeCompare(b.name, loc),
    );

  // 篩選維度只列出「列表中實際出現」的分類 / 副 / 特殊,並依在地化名稱排序(與隨機器一致)。
  const presentCategories = [...new Set(weapons.map((w) => w.category))].sort(
    (a: WeaponCategory, b: WeaponCategory) =>
      (CATEGORY_ORDER.get(a) ?? 0) - (CATEGORY_ORDER.get(b) ?? 0),
  );

  const subs: FilterOption[] = buildOptions(
    weapons.map((w) => w.subWeaponId),
    (id) => subWeaponName(id, loc),
    loc,
    (id) => subspeIconUrl(subWeaponIconName(id)),
  );
  const specials: FilterOption[] = buildOptions(
    weapons.map((w) => w.specialWeaponId),
    (id) => specialWeaponName(id, loc),
    loc,
    (id) => subspeIconUrl(specialWeaponIconName(id)),
  );

  // 射程滑桿軌道邊界 = 資料實際 min/max(非硬寫 0–100,避免出現沒有任何武器的空段)。
  const rangeValues = weapons.map(weaponRange).filter((v): v is number => v !== null);
  const rangeBounds = {
    min: Math.min(...rangeValues),
    max: Math.max(...rangeValues),
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* 品牌外殼:墨黑底上的霓虹輝光(裝飾,純品牌區) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-turf-green opacity-20 blur-3xl" />
        <div className="absolute -right-20 top-1/4 h-64 w-64 rounded-full bg-splat-magenta opacity-15 blur-3xl" />
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

      <main className="flex-1 px-5 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <Link
            href="/"
            className="inline-block font-label text-xs uppercase tracking-wide text-muted-on-dark transition-colors hover:text-text-on-dark"
          >
            {t('backToHome')}
          </Link>

          <h1 className="mt-2 text-balance font-display text-[clamp(1.75rem,6vw,3rem)] font-extrabold leading-[0.95] tracking-tight text-text-on-dark">
            {t('title')}
          </h1>

          <div className="mt-6">
            <WeaponsBrowser
              items={items}
              categories={presentCategories}
              subs={subs}
              specials={specials}
              rangeBounds={rangeBounds}
            />
          </div>
        </div>
      </main>

      {/* 合規(規格 §4.1 / §4.4):非官方聲明 + 來源標註,常駐 */}
      <footer className="mt-6 border-t border-ink-700 px-5 py-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 font-data text-xs text-muted-on-dark">
          <span>{tf('disclaimer')}</span>
          <span>{tf('dataSource')}</span>
        </div>
      </footer>
    </div>
  );
}
