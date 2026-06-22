'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { WeaponList } from '@/components/WeaponList';

/**
 * WeaponList 的 client-only 邊界。
 *
 * 以 next/dynamic `ssr:false` 掛載 WeaponList:伺服器端只輸出下方骨架,真正的清單在
 * client 才渲染。搭配 usePersistentState 的 eager 還原,流程是「骨架 →（上次篩選結果）」,
 * 避開「預設全清單 → 篩選後子集」的內容跳動與 CLS(個人化偏好本就只存在 client)。
 */
const WeaponListLazy = dynamic(() => import('@/components/WeaponList').then((m) => m.WeaponList), {
  ssr: false,
  loading: () => <WeaponListSkeleton />,
});

export function WeaponsBrowser(props: ComponentProps<typeof WeaponList>) {
  return <WeaponListLazy {...props} />;
}

/** 與 WeaponList 版面對齊的載入骨架(固定高度,內容換入時不大跳)。 */
function WeaponListSkeleton() {
  return (
    <div aria-hidden className="animate-pulse motion-reduce:animate-none">
      {/* 搜尋欄 */}
      <div className="h-[42px] w-full rounded-md bg-white/10" />

      {/* 篩選面板:標題 + 三組 chip + 射程軌 */}
      <div className="mt-4 rounded-lg bg-card-translucent p-4 sm:p-5">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className="mt-4 space-y-4">
          {[0, 1, 2].map((g) => (
            <div key={g}>
              <div className="h-3 w-16 rounded bg-white/10" />
              <div className="mt-2 flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((c) => (
                  <div key={c} className="h-7 w-16 rounded-pill bg-white/5" />
                ))}
              </div>
            </div>
          ))}
          <div className="mt-4 h-9 w-full rounded bg-white/5" />
        </div>
      </div>

      {/* 結果計數 */}
      <div className="mt-4 h-3 w-20 rounded bg-white/10" />

      {/* 結果格 */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-card-translucent" />
        ))}
      </div>
    </div>
  );
}
