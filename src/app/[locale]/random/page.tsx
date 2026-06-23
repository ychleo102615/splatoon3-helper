import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { RandomBrowser } from '@/components/RandomBrowser';
import type { FilterOption, PickerWeapon } from '@/components/RandomPicker';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
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

/** 全 locale 預產(SSG,規格 §5.2);抽選邏輯在 client,頁面本體為靜態。 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Random' });
  return { title: `${t('title')} — SPLAT-DEX` };
}

const CATEGORY_ORDER = new Map(WEAPON_CATEGORIES.map((c, i) => [c, i]));

export default async function RandomPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as SnapshotLocale;
  const t = await getTranslations('Random');
  const tf = await getTranslations('Footer');

  // 伺服器端依 locale 解析名稱(SSG);client 只收精簡抽選池,不持有完整快照。
  const pool: PickerWeapon[] = weapons.map((w) => ({
    id: w.id,
    category: w.category,
    name: weaponName(w, loc),
    subId: w.subWeaponId,
    subName: subWeaponName(w.subWeaponId, loc),
    specialId: w.specialWeaponId,
    specialName: specialWeaponName(w.specialWeaponId, loc),
    // 射程相對值(0–100);用於 client 端「射程區間」篩選。全覆蓋,防禦性保留 null。
    range: weaponRange(w),
    // §4.3.1 opt-in:預設關閉時為 null → 轉 undefined,揭曉卡維持自繪佔位、版面不變。
    iconUrl: weaponIconUrl(w.iconName) ?? undefined,
    subIconUrl: subspeIconUrl(subWeaponIconName(w.subWeaponId)) ?? undefined,
    specialIconUrl: subspeIconUrl(specialWeaponIconName(w.specialWeaponId)) ?? undefined,
  }));

  // 射程滑桿軌道邊界 = 資料實際 min/max(非硬寫 0–100,避免出現沒有任何武器的空段)。
  const rangeValues = weapons
    .map(weaponRange)
    .filter((v): v is number => v !== null);
  const rangeBounds = {
    min: Math.min(...rangeValues),
    max: Math.max(...rangeValues),
  };

  // 篩選維度只列出「池中實際出現」的分類 / 副 / 特殊,並依在地化名稱排序。
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
        <div className="mx-auto w-full max-w-3xl">
          <Link
            href="/"
            className="inline-block font-label text-xs uppercase tracking-wide text-muted-on-dark transition-colors hover:text-text-on-dark"
          >
            {t('backToHome')}
          </Link>

          {/* 品牌區招牌:拉丁字小招牌 + 大標 */}
          <p className="mt-3 font-wordmark text-xs tracking-wide text-splat-magenta">RANDOM</p>
          <h1 className="mt-1 text-balance font-display text-[clamp(1.75rem,6vw,3rem)] font-extrabold leading-[0.95] tracking-tight text-text-on-dark">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-[55ch] font-body leading-relaxed text-muted-on-dark">
            {t('lede')}
          </p>

          <div className="mt-6">
            <RandomBrowser
              weapons={pool}
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
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 font-data text-xs text-muted-on-dark">
          <span>{tf('disclaimer')}</span>
          <span>{tf('dataSource')}</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * 由 id 陣列去重、解析在地化名稱、依名稱排序,產出篩選選項。
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
