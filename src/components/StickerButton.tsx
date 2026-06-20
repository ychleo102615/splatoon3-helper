import type { ComponentProps, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

/**
 * 招牌主 CTA — 雙層立體「貼紙鈕」(側面 / 頂面)。
 *
 * 3D 原理(深度與顏色解耦,物理見 globals.css `@layer components .sticker`):
 *  - `.sticker__edge`   = 深綠側面(左右更深的漸層),提供圓柱厚度。
 *  - `.sticker__front`  = 亮草綠頂面,顏色**全程不變**;rest 上移 4px、hover 抬到 6px、
 *    active 壓到 2px。頂面不再被 hover 染成側面色,立體感因此不被抵銷。
 *  (全黑背景不需 cast shadow,立體感純靠側面厚度 + 頂面位移。)
 *
 *  視覺與動態物理集中在 CSS component;此元件只負責語意結構與多型:
 *  給 `href` 渲染為導航 `Link`(首頁「隨機抽一把」),
 *  給 `onClick` 渲染為動作 `button`(隨機器「抽!」,可 disabled)。
 *  `className` 只負責外層版面(寬度,如 `w-full sm:w-auto`)。
 */

/** 頂面文字的字體分工(沿用全站 label 樣式;3D / 色彩由 .sticker__front 處理)。 */
const FRONT_TYPE = 'font-label text-sm font-bold uppercase tracking-wider';

function Layers({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="sticker__edge" aria-hidden />
      <span className={`sticker__front ${FRONT_TYPE}`}>{children}</span>
    </>
  );
}

type CommonProps = {
  children: ReactNode;
  /** 外層版面覆寫(寬度等);不覆寫貼紙身分。 */
  className?: string;
};

type LinkProps = CommonProps & {
  href: ComponentProps<typeof Link>['href'];
};

type ButtonProps = CommonProps & {
  onClick: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
};

export function StickerButton(props: LinkProps | ButtonProps) {
  const className = ['sticker', props.className].filter(Boolean).join(' ');

  if ('href' in props) {
    return (
      <Link href={props.href} className={className}>
        <Layers>{props.children}</Layers>
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? 'button'}
      onClick={props.onClick}
      disabled={props.disabled}
      className={className}
    >
      <Layers>{props.children}</Layers>
    </button>
  );
}
