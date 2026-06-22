'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { RandomPicker } from '@/components/RandomPicker';

/**
 * RandomPicker 的 client-only 邊界。
 *
 * 以 next/dynamic `ssr:false` 掛載:伺服器端只輸出骨架,槽設定 + 不重複開關在 client 才渲染。
 * 搭配 usePersistentState 的 eager 還原,流程是「骨架 →（上次的槽設定）」,
 * 避開「預設 1 槽 → 還原成多槽」的版面跳動(抽選結果本就不持久化,載入後維持提示態)。
 */
const RandomPickerLazy = dynamic(
  () => import('@/components/RandomPicker').then((m) => m.RandomPicker),
  { ssr: false, loading: () => <RandomPickerSkeleton /> },
);

export function RandomBrowser(props: ComponentProps<typeof RandomPicker>) {
  return <RandomPickerLazy {...props} />;
}

/** 與 RandomPicker 版面對齊的載入骨架(固定高度,內容換入時不大跳)。 */
function RandomPickerSkeleton() {
  return (
    <div aria-hidden className="animate-pulse motion-reduce:animate-none">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-white/10" />
        <div className="h-3 w-16 rounded bg-white/10" />
      </div>

      {/* 一張抽選槽卡:三組 chip + 射程軌 */}
      <div className="mt-3 rounded-lg bg-card-translucent p-4 sm:p-5">
        <div className="space-y-4">
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

      {/* 新增槽 */}
      <div className="mt-4 h-12 w-full rounded-lg border border-dashed border-ink-700" />

      {/* 抽選列:不重複開關 + 主 CTA */}
      <div className="mt-5 flex items-center justify-between">
        <div className="h-4 w-28 rounded bg-white/10" />
        <div className="h-11 w-32 rounded-lg bg-white/10" />
      </div>

      {/* 揭曉提示 */}
      <div className="mt-6 h-24 w-full rounded-lg border border-dashed border-ink-700" />
    </div>
  );
}
