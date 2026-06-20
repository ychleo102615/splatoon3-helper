/**
 * 副 / 特殊武器圖示徽章(規格 §4.3.1 opt-in)。
 *
 * 官方 subspe 圖示為**黑白雙調**(黑色主體 + 白色高光/圓孔,部分特殊帶少量彩色),
 * 且變體不一致(特殊有白色 `01`、副武器 `01` 為空白),無法靠換來源/變體統一解決。
 * 故置於**中明度的 Ink Purple 圓形背板**:亮色會殺白、暗色會殺黑,唯中明度飽和色能讓黑與白同時可讀
 *(WCAG 近似:白 ≈ 5.9:1、黑 ≈ 3.6:1),並與黑白灰階明顯區隔、貼近遊戲內「圓底徽章」呈現。
 *
 * 純展示元件(無 client 行為),server / client component 皆可使用。
 * 圖檔為執行時外部 hotlink(§4.3.1),刻意用原生 `<img>` 以避開 next/image 遠端 host 設定。
 */
export function SubspeIcon({
  src,
  alt,
  className = 'size-9 p-1.5',
}: {
  src: string;
  alt: string;
  /** 控制徽章尺寸與內距(預設詳情頁用);列表可傳較小值。 */
  className?: string;
}) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-pill bg-ink-purple ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- §4.3.1 opt-in 外部圖,刻意用 <img> */}
      <img src={src} alt={alt} loading="lazy" className="size-full object-contain" />
    </span>
  );
}
