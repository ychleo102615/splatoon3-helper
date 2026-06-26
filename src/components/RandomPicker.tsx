'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { StickerButton } from '@/components/StickerButton';
import { SubspeIcon } from '@/components/SubspeIcon';
import { RangeSlider, type RangeValue, type RangeMark } from '@/components/RangeSlider';
import { FilterGroup, Chip, type FilterOption } from '@/components/FilterGroup';
import { DimensionModeToggle, type DimensionModeToggleProps } from '@/components/DimensionModeToggle';
import { type DimensionModeSwitchProps } from '@/components/DimensionModeSwitch';
import { CollapsiblePanel } from '@/components/CollapsiblePanel';
import { ActiveFilterTokens, type FilterTokenGroup } from '@/components/FilterTokens';
import {
  matchesFilters,
  buildRangeMarks,
  isRangeLimited,
  type DimensionMode,
  type DimensionRole,
} from '@/components/weaponFilters';
import { usePersistentState, type PersistentCodec } from '@/components/usePersistentState';
import {
  RANDOM_PICKER_KEY,
  RANDOM_RESULT_KEY,
  serializeCriteria,
  deserializeCriteria,
  type FilterOptions,
} from '@/components/filterStorage';
import type { WeaponCategory } from '@/data/schema';

export type { FilterOption };

/**
 * 隨機武器決定器(規格 §3.2)。
 *
 * - **多槽抽選**:一次抽選由 1–8 個「抽選槽」組成,每槽各自獨立的條件
 *   (分類 / 副 / 特殊 / 射程區間);按一次「全部抽選」同時揭曉,各槽對應一把。
 *   單把抽選 = 1 槽的特例(抽象一致,不分兩套 UI)。
 * - **多重條件篩選**:每槽內,分類 / 副 / 特殊三維度各維度內為 OR、維度間為 AND;
 *   某維度未選任何項即代表「不限」。射程以區間滑桿表示,滿格 = 不限。
 * - **單次內去重**(規格 §3.2):「不重複」僅作用於同一次抽選的 N 把之間
 *   (跨次仍為無狀態純抽選,不記錄歷史);某槽在去重後湊不滿時回 null,顯示提示而非靜默失敗。
 * - **招牌時刻**(DESIGN Two-Zone):揭曉是品牌區,放膽用霓虹(Splat Magenta 揭曉氛圍);
 *   主 CTA 為草綠貼紙鈕。槽設定區與資料(副/特殊名稱)維持克制。
 * - 抽選只在點擊事件中發生(client),render 期間不取亂數,避免 SSG/hydration 不一致。
 * - **結果留存**(規格 §5.2):最近一次抽選結果以獨立 key 持久化(見 RANDOM_RESULT_KEY),
 *   與「設定」存檔解耦——改條件 / 增減槽 / 重設都不動結果,結果只由「重新抽選」或
 *   「清除結果」鈕改變。只留最近一筆、下次抽選仍不參考它,§3.2 跨次無狀態純抽選不受影響。
 */

/** 抽選池中的單把武器(名稱已於伺服器端依 locale 解析)。 */
export interface PickerWeapon {
  id: string;
  category: WeaponCategory;
  name: string;
  subId: string;
  subName: string;
  specialId: string;
  specialName: string;
  /** 射程相對值(0–100);用於射程區間篩選。快照缺值時為 null(視為不符射程限制)。 */
  range: number | null;
  /** §4.3.1 opt-in:主武器官方圖示外部 URL;預設關閉時 undefined,揭曉卡維持自繪佔位。 */
  iconUrl?: string;
  /** §4.3.1 opt-in:副武器圖示徽章外部 URL(預設關閉時 undefined)。 */
  subIconUrl?: string;
  /** §4.3.1 opt-in:特殊武器圖示徽章外部 URL(預設關閉時 undefined)。 */
  specialIconUrl?: string;
}

/** 單一抽選槽的條件(各槽獨立)。 */
interface Slot {
  /** 穩定 key(掛載期內唯一)。 */
  id: number;
  cats: Set<WeaponCategory>;
  subIds: Set<string>;
  specialIds: Set<string>;
  /** 射程選取區間(初始 = 軌道邊界 = 不限)。 */
  range: RangeValue;
  /** 各離散維度的角色(不限 / 必須是 / 可以是;各槽獨立;與已選值解耦)。預設全 'none'。 */
  roles: { cats: DimensionRole; subIds: DimensionRole; specialIds: DimensionRole };
  /** 簡化模式:此槽是否展開(隨設定一起持久化;預設展開)。屬介面狀態,非篩選語意。 */
  open: boolean;
}

/**
 * 隨機器的「設定」存檔:多槽條件 + 跨槽不重複開關。抽選結果不在內——
 * 它是另一個生命週期(「抽到什麼」vs「要從哪抽」),以獨立 key 持久化(見 RANDOM_RESULT_KEY)。
 */
interface PickerModel {
  slots: Slot[];
  noRepeat: boolean;
}

interface Props {
  weapons: PickerWeapon[];
  /** 出現在抽選池中的分類(依 WEAPON_CATEGORIES 正序);名稱走 Categories i18n。 */
  categories: WeaponCategory[];
  subs: FilterOption[];
  specials: FilterOption[];
  /** 射程滑桿軌道邊界(= 資料實際 min/max)。 */
  rangeBounds: RangeValue;
}

const MAX_SLOTS = 8;

// 新建的空白槽一律收合(open: false):新增 / 複製 / 重設 / 初次載入皆然——單一空槽收合更精簡,
// 要設定點「＋新增條件」即展開。已存檔的槽沿用各自持久化的開合(走 codec deserialize,不經此)。
function createSlot(id: number, bounds: RangeValue): Slot {
  return {
    id,
    cats: new Set(),
    subIds: new Set(),
    specialIds: new Set(),
    range: { ...bounds },
    roles: { cats: 'none', subIds: 'none', specialIds: 'none' },
    open: false,
  };
}

export function RandomPicker({ weapons, categories, subs, specials, rangeBounds }: Props) {
  const t = useTranslations('Random');

  // 槽設定(每槽條件)+ 不重複開關 = 一份可序列化記錄,暫存到 localStorage:重新整理後沿用。
  // 抽選結果則以獨立 key 另存(見下方 resultCodec),與設定解耦:改設定不動結果。
  const codec = useMemo<PersistentCodec<PickerModel>>(() => {
    const options: FilterOptions = {
      cats: new Set(categories),
      subIds: new Set(subs.map((s) => s.id)),
      specialIds: new Set(specials.map((s) => s.id)),
      bounds: rangeBounds,
    };
    return {
      // 槽 id 只是 render key,不入存檔;還原時依序重新編號。open(展開/收合)隨條件一起存。
      serialize: (m) => ({
        slots: m.slots.map((s) => ({ ...serializeCriteria(s), open: s.open })),
        noRepeat: m.noRepeat,
      }),
      deserialize: (raw) => {
        const o = (raw ?? {}) as { slots?: unknown; noRepeat?: unknown };
        const stored = Array.isArray(o.slots) ? o.slots.slice(0, MAX_SLOTS) : [];
        // open 缺值(舊存檔)→ 預設展開;唯有明確存成 false 才收合。
        const slots = stored.map((entry, i) => ({
          id: i,
          open: (entry as { open?: unknown })?.open !== false,
          ...deserializeCriteria(entry, options),
        }));
        return {
          slots: slots.length > 0 ? slots : [createSlot(0, rangeBounds)],
          noRepeat: o.noRepeat === true,
        };
      },
    };
  }, [categories, subs, specials, rangeBounds]);

  const [model, setModel] = usePersistentState<PickerModel>(
    RANDOM_PICKER_KEY,
    () => ({ slots: [createSlot(0, rangeBounds)], noRepeat: false }),
    codec,
  );
  const { slots, noRepeat } = model;

  // 結果存檔只存武器 id(非整個 PickerWeapon):名稱 / 圖示由當前快照重新解析,因此跨語系沿用、
  // 跨遊戲版本自癒(已不存在的 id → null,顯示為空槽)。null(整體)= 尚未抽 / 已清除。
  const resultCodec = useMemo<PersistentCodec<(PickerWeapon | null)[] | null>>(() => {
    const byId = new Map(weapons.map((w) => [w.id, w]));
    return {
      serialize: (r) => (r === null ? null : r.map((w) => (w ? w.id : null))),
      deserialize: (raw) =>
        Array.isArray(raw)
          ? raw.map((id) => (typeof id === 'string' ? (byId.get(id) ?? null) : null))
          : null,
    };
  }, [weapons]);

  // 每槽抽選結果(揭曉時與當次的槽等長);null(成員)= 該槽湊不滿(條件無交集或去重後耗盡)。
  // 以獨立 key 持久化,與設定解耦:改條件不清結果,結果只由重新抽選 / 清除結果鈕改變。
  const [results, setResults] = usePersistentState<(PickerWeapon | null)[] | null>(
    RANDOM_RESULT_KEY,
    null,
    resultCodec,
  );
  // 每次抽選自增,作為揭曉網格的 key:強制重掛載以重播 reveal 動畫。不持久化(還原時自 0 起算)。
  const [drawSeq, setDrawSeq] = useState(0);

  const rangeMarks: RangeMark[] = useMemo(
    () => buildRangeMarks(rangeBounds, (k) => t(k)),
    [rangeBounds, t],
  );

  // 單槽抽選池:四維度 AND(語意由 matchesFilters 統一定義,與列表頁同一份)。
  const poolFor = (slot: Slot): PickerWeapon[] =>
    weapons.filter((w) => matchesFilters(w, slot, rangeBounds));

  // 下一個槽 id 由現有槽推導(max + 1):slots 即唯一事實來源,免去獨立計數器與還原後失準。
  const nextSlotId = (list: Slot[]): number => list.reduce((max, s) => Math.max(max, s.id), -1) + 1;

  // 單槽變更(條件或 open):合併 partial。結果與設定已解耦,任何設定變更都不清結果——
  // 上次抽到的武器留在揭曉區,清除交由「清除結果」鈕。open 也走這裡(它與條件同屬槽狀態,
  // 機械上等價,毋須另立 setter)。
  const updateSlot = (id: number, partial: Partial<Slot>) => {
    setModel((m) => ({
      ...m,
      slots: m.slots.map((s) => (s.id === id ? { ...s, ...partial } : s)),
    }));
  };

  // 新增空槽:收合落地(見 createSlot)。已有槽時展開新空槽只是把版面推長,收合摘要更克制;
  // 要編輯點開即可。
  const addSlot = () => {
    setModel((m) =>
      m.slots.length >= MAX_SLOTS
        ? m
        : { ...m, slots: [...m.slots, createSlot(nextSlotId(m.slots), rangeBounds)] },
    );
  };

  // 複製某一槽:深拷貝其條件(Set / range / roles 皆另建,免共用參照)成新槽,緊接原槽之後插入。
  // 預設收合——複本一落地就帶完整條件,收合摘要正好讓人「核對複製到什麼」而不撐長版面;與設定解耦,
  // 不動抽選結果。達上限則無操作。
  const duplicateSlot = (id: number) => {
    setModel((m) => {
      if (m.slots.length >= MAX_SLOTS) return m;
      const i = m.slots.findIndex((s) => s.id === id);
      if (i < 0) return m;
      const src = m.slots[i];
      const copy: Slot = {
        id: nextSlotId(m.slots),
        cats: new Set(src.cats),
        subIds: new Set(src.subIds),
        specialIds: new Set(src.specialIds),
        range: { ...src.range },
        roles: { ...src.roles },
        open: false,
      };
      const slots = [...m.slots];
      slots.splice(i + 1, 0, copy);
      return { ...m, slots };
    });
  };

  const removeSlot = (id: number) => {
    setModel((m) => (m.slots.length <= 1 ? m : { ...m, slots: m.slots.filter((s) => s.id !== id) }));
  };

  // 槽排序:把第 from 個移到第 to 個(皆為移除前的索引;越界 / 原地則無操作)。拖曳放下與鍵盤上下移
  // 共用此一入口——重排只動 slots 順序,id 不變故 React key 穩定、抽選結果不受影響。
  const moveSlot = (from: number, to: number) => {
    setModel((m) => {
      if (from === to || from < 0 || to < 0 || from >= m.slots.length || to >= m.slots.length)
        return m;
      const slots = [...m.slots];
      const [moved] = slots.splice(from, 1);
      slots.splice(to, 0, moved);
      return { ...m, slots };
    });
  };

  // 全部重設只重置「設定」(回到單一空槽);抽選結果不在此清——兩者生命週期獨立。
  const resetAll = () => {
    setModel({ slots: [createSlot(0, rangeBounds)], noRepeat: false });
  };

  const toggleNoRepeat = () => {
    setModel((m) => ({ ...m, noRepeat: !m.noRepeat }));
  };

  // 清除最近一次抽選結果:回到提示態,並抹去結果存檔。不動任何設定。
  const clearResults = () => setResults(null);

  const draw = () => {
    const used = new Set<string>(); // 跨槽去重(noRepeat 時)
    const next = slots.map((slot) => {
      let pool = poolFor(slot);
      if (noRepeat) pool = pool.filter((w) => !used.has(w.id));
      if (pool.length === 0) return null;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      if (noRepeat) used.add(picked.id);
      return picked;
    });
    setResults(next);
    setDrawSeq((s) => s + 1);
  };

  const canDraw = slots.some((s) => poolFor(s).length > 0);
  const multi = slots.length > 1;

  /* ── 槽拖曳排序(Pointer Events;觸控 + 滑鼠通用,mobile-first) ──────────────
     原生 HTML5 DnD 在觸控裝置無效,故自製。被拖卡片一律「浮起」並以 transform 跟手;
     其餘卡片的視覺回饋採**混合**(模式於按下那刻定案,整段拖曳不切換,避免突兀):
       - **全部收合 → 即時讓位(live)**:卡片矮且均高,介於原位與落點間的卡片實際平移
         「被拖卡片佔高 + 間距」讓出洞,所見即所得;落下才提交。
       - **有任一展開 → 落點線(line)**:展開卡片可達數百 px,實際推動會笨重,故僅以一條
         指示線標示插入位,不動其他卡片。
     效能:移動階段全程以 ref + 直接改 DOM style(不 setState),避免每次 pointermove 重渲染
     整棵(含開啟槽的大量 chip);僅落下時 setModel 提交一次重排。鍵盤(方向鍵)走另一條 a11y 路徑。 */
  const slotsContainerRef = useRef<HTMLDivElement>(null);
  const dropLineRef = useRef<HTMLDivElement>(null);
  const slotEls = useRef(new Map<number, HTMLElement>());
  const registerSlotEl = (id: number) => (el: HTMLElement | null) => {
    if (el) slotEls.current.set(id, el);
    else slotEls.current.delete(id);
  };
  // 拖曳期間量得的版面快照(viewport 座標)+ 模式相關欄;非拖曳時為 null。
  const dragRef = useRef<{
    id: number;
    fromIndex: number;
    startY: number;
    insert: number;
    mode: 'live' | 'line';
    /** live 模式讓位距離 = 被拖卡片佔高 + 一個列間距(均一,故與其他卡片各自高度無關)。 */
    shift: number;
    /** 各槽外層元素(原始順序);live 讓位與收尾清樣式用。 */
    els: (HTMLElement | null)[];
    containerTop: number;
    tops: number[];
    bottoms: number[];
    mids: number[];
  } | null>(null);
  // 唯一會觸發重渲染的拖曳狀態:標記哪一槽正被拖(套用浮起樣式)。位移 / 讓位 / 指示線走 imperative。
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const GAP = 8; // 指示線置於上下卡片間隙中央(= 列間距一半)
  const ROW_GAP = 16; // space-y-4 = 1rem;讓位距離含一個列間距

  // [line 模式] 依插入索引把落點指示線移到對應間隙;落點即原位(insert === from / from+1)時藏起。
  const positionDropLine = (insert: number) => {
    const d = dragRef.current;
    const el = dropLineRef.current;
    if (!d || !el) return;
    if (insert === d.fromIndex || insert === d.fromIndex + 1) {
      el.style.opacity = '0';
      return;
    }
    let top: number;
    if (insert <= 0) top = d.tops[0] - d.containerTop - GAP;
    else if (insert >= d.tops.length)
      top = d.bottoms[d.bottoms.length - 1] - d.containerTop + GAP;
    else top = (d.bottoms[insert - 1] + d.tops[insert]) / 2 - d.containerTop;
    el.style.top = `${top}px`;
    el.style.opacity = '1';
  };

  // [live 模式] 介於原位與落點之間的卡片讓位:往下拖→上移、往上拖→下移,位移均為 shift;其餘歸零。
  const applyLiveShift = (insert: number) => {
    const d = dragRef.current;
    if (!d) return;
    for (let k = 0; k < d.els.length; k++) {
      const el = d.els[k];
      if (!el || k === d.fromIndex) continue; // 被拖卡片自己跟手,不參與讓位
      const ty =
        d.fromIndex < k && k < insert ? -d.shift : insert <= k && k < d.fromIndex ? d.shift : 0;
      el.style.transform = ty === 0 ? '' : `translateY(${ty}px)`;
    }
  };

  // 收尾:清掉拖曳期間 imperative 加的 transform / transition(含被拖卡片與所有讓位卡片),
  // 藏起指示線。React 不管這些 inline 樣式,故須在此手動還原,否則重排後殘留錯位。
  const endDrag = (id: number) => {
    const d = dragRef.current;
    const els = d ? d.els : [slotEls.current.get(id) ?? null];
    for (const el of els) {
      if (!el) continue;
      el.style.transition = '';
      el.style.transform = '';
    }
    if (dropLineRef.current) dropLineRef.current.style.opacity = '0';
    dragRef.current = null;
    setDraggingId(null);
  };

  // 給拖曳把手的事件組(每槽一份;以 slot.id 綁定,避免跨槽串擾)。把手須 touch-action:none,
  // 觸控起拖才不被當成捲動;setPointerCapture 後 move/up 一律回到把手。
  const reorderHandleProps = (id: number, index: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const container = slotsContainerRef.current;
      if (!container) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const containerTop = container.getBoundingClientRect().top;
      const tops: number[] = [];
      const bottoms: number[] = [];
      const mids: number[] = [];
      const els: (HTMLElement | null)[] = [];
      for (const s of slots) {
        const el = slotEls.current.get(s.id) ?? null;
        const r = el?.getBoundingClientRect();
        if (!r) return;
        els.push(el);
        tops.push(r.top);
        bottoms.push(r.bottom);
        mids.push(r.top + r.height / 2);
      }
      // 模式定案:全部收合 → 即時讓位;有任一展開 → 落點線(避免推動高卡片)。
      const mode: 'live' | 'line' = slots.every((s) => !s.open) ? 'live' : 'line';
      const shift = bottoms[index] - tops[index] + ROW_GAP;
      if (mode === 'live') {
        // 讓位過渡:僅掛在非被拖卡片;被拖卡片要 1:1 跟手不能有 transition。reduced-motion 則瞬移。
        const reduced =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        for (let k = 0; k < els.length; k++) {
          if (els[k] && k !== index)
            els[k]!.style.transition = reduced ? 'none' : 'transform 160ms ease';
        }
      }
      dragRef.current = { id, fromIndex: index, startY: e.clientY, insert: index, mode, shift, els, containerTop, tops, bottoms, mids };
      setDraggingId(id);
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      if (!d || d.id !== id) return;
      const offset = e.clientY - d.startY;
      const el = slotEls.current.get(id);
      if (el) el.style.transform = `translateY(${offset}px)`;
      // 觸發閥值 = 被拖卡片「移動方向上的前緣」越過鄰卡中點(等同與鄰卡重疊過半才換)。
      // 不用「指標 vs 中點」:把手在卡頂,指標被抓取點綁住,會逼著幾乎整張蓋過才觸發。
      // 改以卡片自身幾何(原始 top/bottom + 位移)判斷,與抓在卡片哪裡無關;沿用原始 mids 為門檻避免回授。
      const from = d.fromIndex;
      let insert = from; // 預設原位(未過半 → 不換)
      if (offset > 0) {
        const bottom = d.bottoms[from] + offset; // 下緣現位
        insert = from + 1;
        for (let k = from + 1; k < d.mids.length; k++) {
          if (bottom > d.mids[k]) insert = k + 1;
          else break;
        }
      } else if (offset < 0) {
        const top = d.tops[from] + offset; // 上緣現位
        for (let k = from - 1; k >= 0; k--) {
          if (top < d.mids[k]) insert = k;
          else break;
        }
      }
      d.insert = insert;
      if (d.mode === 'live') applyLiveShift(insert);
      else positionDropLine(insert);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* 指標已釋放 */
      }
      if (d && d.id === id) {
        const to = d.insert > d.fromIndex ? d.insert - 1 : d.insert;
        moveSlot(d.fromIndex, to);
      }
      endDrag(id);
    },
    onPointerCancel: () => endDrag(id),
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // 鍵盤可及的重排:把手聚焦時 ↑/↓ 上下移一格。key=slot.id 故 DOM 節點隨槽搬移、焦點自然保留。
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSlot(index, index - 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSlot(index, index + 1);
      }
    },
  });

  return (
    <div>
      {/* ── 頂部:整體標題 + 全部重設 ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-label text-xs uppercase tracking-wide text-muted-on-dark">
          {t('slotsTitle')}
        </h2>
        <button
          type="button"
          onClick={resetAll}
          className="font-label text-xs uppercase tracking-wide text-muted-on-dark underline-offset-2 transition-colors hover:text-text-on-dark hover:underline"
        >
          {t('resetFilters')}
        </button>
      </div>

      {/* ── 抽選槽:堆疊卡片(每槽各自條件,可拖曳排序) ───────────────────── */}
      <div ref={slotsContainerRef} className="relative mt-3 space-y-4">
        {/* 落點指示線:拖曳時 imperative 改 top / opacity 移動;非拖曳時 opacity 0 隱形佔位。 */}
        <div
          ref={dropLineRef}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-10 h-0.5 -translate-y-1/2 rounded-full bg-turf-green opacity-0 shadow-[0_0_8px_rgba(25,215,25,0.7)] transition-opacity duration-100"
          style={{ top: 0 }}
        />
        {slots.map((slot, i) => (
          <SlotCard
            key={slot.id}
            index={i}
            total={slots.length}
            showIndex={multi}
            slot={slot}
            poolCount={poolFor(slot).length}
            canRemove={slots.length > 1}
            canDuplicate={slots.length < MAX_SLOTS}
            canReorder={multi}
            isDragging={draggingId === slot.id}
            slotRef={registerSlotEl(slot.id)}
            reorderHandle={reorderHandleProps(slot.id, i)}
            categories={categories}
            subs={subs}
            specials={specials}
            rangeBounds={rangeBounds}
            rangeMarks={rangeMarks}
            onUpdate={(partial) => updateSlot(slot.id, partial)}
            onToggleOpen={(open) => updateSlot(slot.id, { open })}
            onDuplicate={() => duplicateSlot(slot.id)}
            onRemove={() => removeSlot(slot.id)}
          />
        ))}
      </div>

      {/* ── 新增槽 / 上限提示 ─────────────────────────────────────────────── */}
      {slots.length < MAX_SLOTS ? (
        <button
          type="button"
          onClick={addSlot}
          className="mt-4 w-full rounded-lg border border-dashed border-ink-700 px-4 py-3 font-label text-xs font-bold uppercase tracking-wide text-text-on-dark transition-colors duration-150 ease-state hover:border-muted-on-dark hover:bg-white/5 motion-reduce:transition-none"
        >
          {t('addSlot')}
        </button>
      ) : (
        <p className="mt-4 text-center font-data text-xs text-muted-on-dark">
          {t('maxSlots', { count: MAX_SLOTS })}
        </p>
      )}

      {/* ── 抽選列:不重複開關 + 主 CTA(草綠貼紙鈕,招牌時刻) ─────────────── */}
      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={noRepeat}
            onChange={toggleNoRepeat}
            disabled={!multi}
            className="size-4 accent-turf-green disabled:opacity-40"
          />
          <span className="font-label text-xs uppercase tracking-wide text-text-on-dark">
            {t('noRepeat')}
          </span>
        </label>
        <StickerButton onClick={draw} disabled={!canDraw} className="w-full sm:w-auto">
          {results ? t('drawAgain') : t('drawAll')}
        </StickerButton>
      </div>

      {/* ── 揭曉區:抽中結果(品牌區放膽,Splat Magenta 揭曉氛圍) ─────────── */}
      <div className="mt-6">
        {results ? (
          <div>
            {/* 結果標題列:鏡像頂部「設定 + 重設」——這裡是「結果 + 清除結果」。
                showIndex 依「當次抽選的把數」(results.length)而非當前槽數:結果與設定已解耦,
                抽完後增減槽不影響這份已揭曉的結果。 */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-label text-xs uppercase tracking-wide text-muted-on-dark">
                {t('resultsTitle')}
              </h2>
              <button
                type="button"
                onClick={clearResults}
                className="font-label text-xs uppercase tracking-wide text-muted-on-dark underline-offset-2 transition-colors hover:text-text-on-dark hover:underline"
              >
                {t('clearResults')}
              </button>
            </div>
            <div
              key={drawSeq}
              className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2"
              role="list"
              aria-label={t('resultEyebrow')}
            >
              {results.map((result, i) => (
                <ResultCard key={i} index={i} showIndex={results.length > 1} result={result} />
              ))}
            </div>
          </div>
        ) : !canDraw ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ink-700 px-4 py-8 text-center">
            <p className="font-body text-sm text-text-on-dark">{t('emptyPool')}</p>
            <p className="max-w-[40ch] font-body text-xs leading-relaxed text-muted-on-dark">
              {t('emptyPoolHint')}
            </p>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-ink-700 px-4 py-2 font-label text-xs font-bold uppercase tracking-wide text-text-on-dark transition-colors duration-150 ease-state hover:border-muted-on-dark hover:bg-white/5 motion-reduce:transition-none"
            >
              {t('resetFilters')}
            </button>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-ink-700 px-4 py-8 text-center font-body text-sm text-muted-on-dark">
            {t('prompt')}
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  抽選槽卡片                                                                  */
/* -------------------------------------------------------------------------- */

/** 拖曳把手要散佈到 <button> 上的事件組(由 RandomPicker.reorderHandleProps 產生)。 */
type ReorderHandleProps = Pick<
  React.HTMLAttributes<HTMLButtonElement>,
  'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onKeyDown'
>;

function SlotCard({
  index,
  total,
  showIndex,
  slot,
  poolCount,
  canRemove,
  canDuplicate,
  canReorder,
  isDragging,
  slotRef,
  reorderHandle,
  categories,
  subs,
  specials,
  rangeBounds,
  rangeMarks,
  onUpdate,
  onToggleOpen,
  onDuplicate,
  onRemove,
}: {
  index: number;
  /** 當前總槽數(拖曳把手 aria 用「第 n 把,共 total 把」交代位置)。 */
  total: number;
  showIndex: boolean;
  slot: Slot;
  poolCount: number;
  canRemove: boolean;
  /** 未達上限時可複製此槽。 */
  canDuplicate: boolean;
  /** 多於一槽時才顯示拖曳把手(僅一槽無從排序)。 */
  canReorder: boolean;
  /** 此槽正被拖曳:套用浮起樣式(位移與落點線由父層 imperative 處理)。 */
  isDragging: boolean;
  /** 量測用:把外層容器元素登記到父層 ref map(供拖曳算落點)。 */
  slotRef: (el: HTMLElement | null) => void;
  /** 拖曳把手事件組;散佈於把手 <button>。 */
  reorderHandle: ReorderHandleProps;
  categories: WeaponCategory[];
  subs: FilterOption[];
  specials: FilterOption[];
  rangeBounds: RangeValue;
  rangeMarks: RangeMark[];
  onUpdate: (partial: Partial<Slot>) => void;
  /** 展開 / 收合(簡化模式);與條件分流,切換不清抽選結果。 */
  onToggleOpen: (open: boolean) => void;
  /** 複製此槽(緊接其後插入一份條件複本)。 */
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations('Random');
  const tc = useTranslations('Categories');

  // 逐槽簡化模式:展開 = 完整 chip picker;收合 = 該槽已選條件 token。8 槽時頁面易過長,
  // 各槽獨立收合最實用。open 隨槽設定一起持久化(見 PickerModel codec),重載後沿用上次的開/合。
  const open = slot.open;

  // 每維度控制器(各槽獨立):角色(不限/必須是/可以是)與已選值解耦的互動規則收斂於一處
  // (同 WeaponList:不限保留值並淡化、切回自動還原、必須是/可以是無值時自動選第一項、清空回不限)。寫回經 onUpdate。
  const makeDim = <T extends string>(
    values: Set<T>,
    role: DimensionRole,
    first: T | undefined,
    write: (values: Set<T>, role: DimensionRole) => void,
  ) => ({
    role,
    size: values.size,
    has: (v: T) => values.has(v),
    setRole: (r: DimensionRole) => {
      if (r === 'none') write(values, 'none');
      else if (values.size === 0)
        write(first === undefined ? values : new Set<T>([first]), first === undefined ? 'none' : r);
      else write(values, r);
    },
    toggle: (v: T) => {
      const next = new Set(values);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      write(next, next.size === 0 ? 'none' : role === 'none' ? 'AND' : role);
    },
    remove: (v: T) => {
      const next = new Set(values);
      next.delete(v);
      write(next, next.size === 0 ? 'none' : role);
    },
    clear: () => write(new Set<T>(), 'none'),
  });
  const catDim = makeDim(slot.cats, slot.roles.cats, categories[0], (v, r) =>
    onUpdate({ cats: v, roles: { ...slot.roles, cats: r } }),
  );
  const subDim = makeDim(slot.subIds, slot.roles.subIds, subs[0]?.id, (v, r) =>
    onUpdate({ subIds: v, roles: { ...slot.roles, subIds: r } }),
  );
  const speDim = makeDim(slot.specialIds, slot.roles.specialIds, specials[0]?.id, (v, r) =>
    onUpdate({ specialIds: v, roles: { ...slot.roles, specialIds: r } }),
  );

  const expandedMode = (
    dim: { role: DimensionRole; setRole: (r: DimensionRole) => void },
    name: string,
  ): DimensionModeToggleProps => ({
    value: dim.role,
    onChange: dim.setRole,
    noneLabel: t('any'),
    requiredLabel: t('modeRequired'),
    anyLabel: t('modeAny'),
    excludeLabel: t('modeExclude'),
    ariaLabel: t('modeAria', { name }),
  });
  const collapsedMode = (
    dim: { role: DimensionRole; setRole: (r: DimensionRole) => void },
    name: string,
  ): DimensionModeSwitchProps => ({
    value: dim.role as DimensionMode,
    onChange: (m) => dim.setRole(m),
    requiredLabel: t('modeRequired'),
    anyLabel: t('modeAny'),
    excludeLabel: t('modeExclude'),
    ariaLabel: t('modeSwitchAria', { name }),
  });
  // 維度角色 → chip/token 選中態極性:不要是 = 排除(琥珀),其餘 = 選取(綠)。
  const dimTone = (role: DimensionRole) => (role === 'NOT' ? 'exclude' : 'select');
  const clearAction = (dim: { size: number; clear: () => void }, name: string) =>
    dim.size > 0 ? (
      <button
        type="button"
        onClick={dim.clear}
        aria-label={t('clearGroupAria', { name })}
        className="font-label text-[11px] uppercase tracking-wide text-muted-on-dark underline-offset-2 transition-colors hover:text-text-on-dark hover:underline"
      >
        {t('clearGroup')}
      </button>
    ) : undefined;

  // 收合摘要:只列「有在篩」(角色非不限)的維度,各帶單鈕角色切換;射程群無角色。
  const subById = useMemo(() => new Map(subs.map((s) => [s.id, s])), [subs]);
  const specialById = useMemo(() => new Map(specials.map((s) => [s.id, s])), [specials]);
  const groups: FilterTokenGroup[] = [];
  if (catDim.role !== 'none')
    groups.push({
      key: 'cats',
      mode: collapsedMode(catDim, t('categoryGroup')),
      tone: dimTone(catDim.role),
      tokens: [...slot.cats].map((c) => ({ key: `cat:${c}`, label: tc(c), onRemove: () => catDim.remove(c) })),
    });
  if (subDim.role !== 'none')
    groups.push({
      key: 'subIds',
      mode: collapsedMode(subDim, t('subGroup')),
      tone: dimTone(subDim.role),
      tokens: [...slot.subIds].map((id) => ({
        key: `sub:${id}`,
        label: subById.get(id)?.name ?? id,
        iconUrl: subById.get(id)?.iconUrl,
        onRemove: () => subDim.remove(id),
      })),
    });
  if (speDim.role !== 'none')
    groups.push({
      key: 'specialIds',
      mode: collapsedMode(speDim, t('specialGroup')),
      tone: dimTone(speDim.role),
      tokens: [...slot.specialIds].map((id) => ({
        key: `spe:${id}`,
        label: specialById.get(id)?.name ?? id,
        iconUrl: specialById.get(id)?.iconUrl,
        onRemove: () => speDim.remove(id),
      })),
    });
  if (isRangeLimited(slot.range, rangeBounds))
    groups.push({
      key: 'range',
      tokens: [
        {
          key: 'range',
          label: t('rangeToken', { min: slot.range.min, max: slot.range.max }),
          onRemove: () => onUpdate({ range: { ...rangeBounds } }),
        },
      ],
    });

  return (
    // 外層容器:供父層量測(slotRef)與拖曳期間 imperative 套 translateY。浮起時抬升層級,
    // 並停用文字選取(觸控拖曳手感)。視覺浮起(描邊 / 陰影)交給 CollapsiblePanel 的 className,
    // 落在真正的卡片邊界上。
    <div
      ref={slotRef}
      className={`relative ${isDragging ? 'z-20 cursor-grabbing select-none' : ''}`}
    >
      <CollapsiblePanel
        open={open}
        onOpenChange={onToggleOpen}
        className={isDragging ? 'shadow-2xl ring-2 ring-turf-green/60' : undefined}
        header={
          showIndex ? (
            <div className="flex items-center gap-2">
              {canReorder ? (
                <button
                  type="button"
                  {...reorderHandle}
                  aria-label={t('reorderSlot', { n: index + 1, total })}
                  className="grid size-6 shrink-0 cursor-grab touch-none place-items-center rounded text-muted-on-dark transition-colors hover:bg-white/10 hover:text-text-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-turf-green active:cursor-grabbing motion-reduce:transition-none"
                >
                  <GripIcon />
                </button>
              ) : null}
              <h3 className="font-label text-xs font-bold uppercase tracking-wide text-text-on-dark">
                {t('slotLabel', { n: index + 1 })}
              </h3>
            </div>
          ) : null
        }
        expandLabel={t('filtersExpand')}
        collapseLabel={t('filtersCollapse')}
        toolbar={
          <>
            <span className="font-data text-xs text-muted-on-dark">
              {t('poolCount', { count: poolCount })}
            </span>
            {canDuplicate ? (
              <button
                type="button"
                onClick={onDuplicate}
                aria-label={t('duplicateSlot', { n: index + 1 })}
                className="grid size-6 place-items-center rounded-pill text-muted-on-dark transition-colors hover:bg-white/10 hover:text-text-on-dark"
              >
                <DuplicateIcon />
              </button>
            ) : null}
            {canRemove ? (
              <button
                type="button"
                onClick={onRemove}
                aria-label={t('removeSlot', { n: index + 1 })}
                className="grid size-6 place-items-center rounded-pill text-base leading-none text-muted-on-dark transition-colors hover:bg-white/10 hover:text-text-on-dark"
              >
                ×
              </button>
            ) : null}
          </>
        }
        summary={
          <ActiveFilterTokens
            groups={groups}
            onAdd={() => onToggleOpen(true)}
            addLabel={t('addCondition')}
            emptyLabel={t('noConditions')}
            removeLabel={(name) => t('removeCondition', { name })}
          />
        }
      >
        {/* 每維度標題左側皆帶「不限 / 必須是 / 可以是」三選一角色切換(各槽獨立);右側「清除」清值並回不限;
            不限時 chip 淡化(停用但記住,切回即還原)。合成見 weaponFilters。射程恆 AND。 */}
        <FilterGroup
          label={t('categoryGroup')}
          mode={<DimensionModeToggle {...expandedMode(catDim, t('categoryGroup'))} />}
          action={clearAction(catDim, t('categoryGroup'))}
          dimmed={catDim.role === 'none'}
        >
          {categories.map((cat) => (
            <Chip
              key={cat}
              active={catDim.has(cat)}
              tone={dimTone(catDim.role)}
              onClick={() => catDim.toggle(cat)}
            >
              {tc(cat)}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup
          label={t('subGroup')}
          mode={<DimensionModeToggle {...expandedMode(subDim, t('subGroup'))} />}
          action={clearAction(subDim, t('subGroup'))}
          dimmed={subDim.role === 'none'}
        >
          {subs.map((s) => (
            <Chip
              key={s.id}
              active={subDim.has(s.id)}
              icon={s.iconUrl}
              tone={dimTone(subDim.role)}
              onClick={() => subDim.toggle(s.id)}
            >
              {s.name}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup
          label={t('specialGroup')}
          mode={<DimensionModeToggle {...expandedMode(speDim, t('specialGroup'))} />}
          action={clearAction(speDim, t('specialGroup'))}
          dimmed={speDim.role === 'none'}
        >
          {specials.map((s) => (
            <Chip
              key={s.id}
              active={speDim.has(s.id)}
              icon={s.iconUrl}
              tone={dimTone(speDim.role)}
              onClick={() => speDim.toggle(s.id)}
            >
              {s.name}
            </Chip>
          ))}
        </FilterGroup>

        <div className="mt-4">
          <RangeSlider
            bound={rangeBounds}
            value={slot.range}
            onChange={(range) => onUpdate({ range })}
            label={t('rangeGroup')}
            minHandleLabel={t('rangeMin')}
            maxHandleLabel={t('rangeMax')}
            anyLabel={t('any')}
            resetLabel={t('rangeReset')}
            marks={rangeMarks}
          />
        </div>
      </CollapsiblePanel>
    </div>
  );
}

/** 拖曳把手圖示:六點抓握紋(全自繪 SVG,§4 合規);裝飾,語意由按鈕 aria-label 承載。 */
function GripIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <circle cx="6" cy="4" r="1.25" />
      <circle cx="10" cy="4" r="1.25" />
      <circle cx="6" cy="8" r="1.25" />
      <circle cx="10" cy="8" r="1.25" />
      <circle cx="6" cy="12" r="1.25" />
      <circle cx="10" cy="12" r="1.25" />
    </svg>
  );
}

/** 複製圖示:兩枚交疊圓角方框(全自繪 SVG,§4 合規);裝飾,語意由按鈕 aria-label 承載。 */
function DuplicateIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  揭曉卡片                                                                    */
/* -------------------------------------------------------------------------- */

function ResultCard({
  index,
  showIndex,
  result,
}: {
  index: number;
  showIndex: boolean;
  result: PickerWeapon | null;
}) {
  const t = useTranslations('Random');
  const tc = useTranslations('Categories');
  const tw = useTranslations('Weapons');

  // 逐張 stagger:每卡延後 80ms 進場(motion-safe;reduced-motion 直接顯示)。
  const delay = { animationDelay: `${index * 80}ms` };

  if (result === null) {
    return (
      <article
        role="listitem"
        style={delay}
        className="flex flex-col gap-2 rounded-lg border border-dashed border-ink-700 p-5 motion-safe:animate-reveal"
      >
        {showIndex ? (
          <p className="font-label text-xs uppercase tracking-wide text-muted-on-dark">
            {t('slotLabel', { n: index + 1 })}
          </p>
        ) : null}
        <p className="font-body text-sm text-muted-on-dark">{t('slotEmpty')}</p>
      </article>
    );
  }

  return (
    <article
      role="listitem"
      style={delay}
      className="relative overflow-hidden rounded-lg border border-splat-magenta/40 bg-card-translucent p-5 motion-safe:animate-reveal"
    >
      {/* 揭曉輝光(裝飾) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-splat-magenta opacity-20 blur-3xl"
      />

      <div className="flex gap-4">
        {/* 視覺槽:霓虹噴濺底(品牌氛圍)。§4.3.1 opt-in 開啟時疊上官方主武器圖;
            未啟用(預設)維持自繪綠點佔位,版面與「全自繪」狀態一致。 */}
        <div className="relative grid size-20 shrink-0 place-items-center rounded-md bg-ink-800">
          <span
            aria-hidden
            className="absolute size-12 rounded-full bg-splat-magenta opacity-30 blur-xl"
          />
          {result.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- §4.3.1 opt-in 外部圖,刻意用 <img> 避開 next/image 遠端 host 設定
            <img
              src={result.iconUrl}
              alt={tw('iconAlt', { name: result.name })}
              width={64}
              height={64}
              loading="lazy"
              className="relative size-16 object-contain drop-shadow"
            />
          ) : (
            <span aria-hidden className="size-9 rounded-full bg-turf-green opacity-90" />
          )}
        </div>

        <div className="min-w-0">
          <p className="font-data text-[10px] uppercase tracking-[0.2em] text-splat-magenta">
            {showIndex ? t('slotLabel', { n: index + 1 }) : t('resultEyebrow')}
          </p>
          <p className="mt-1 flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-muted-on-dark">
            <span className="size-2 rounded-full bg-turf-green" aria-hidden />
            {tc(result.category)}
          </p>
          <h3 className="mt-1 text-balance font-display text-xl font-extrabold leading-tight text-text-on-dark">
            {result.name}
          </h3>

          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-on-dark">
            <div className="flex items-center gap-1.5">
              <dt className="font-label uppercase tracking-wide">{tw('subLabel')}</dt>
              {result.subIconUrl ? (
                <SubspeIcon
                  src={result.subIconUrl}
                  alt={tw('iconAlt', { name: result.subName })}
                  className="size-5 p-0.5"
                />
              ) : null}
              <dd className="font-body text-text-on-dark">{result.subName}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="font-label uppercase tracking-wide">{tw('specialLabel')}</dt>
              {result.specialIconUrl ? (
                <SubspeIcon
                  src={result.specialIconUrl}
                  alt={tw('iconAlt', { name: result.specialName })}
                  className="size-5 p-0.5"
                />
              ) : null}
              <dd className="font-body text-text-on-dark">{result.specialName}</dd>
            </div>
          </dl>

          <Link
            href={`/weapons/${result.id}`}
            className="mt-3 inline-block font-label text-xs uppercase tracking-wide text-text-on-dark underline decoration-white/40 underline-offset-4 transition-colors duration-150 ease-state hover:decoration-text-on-dark motion-reduce:transition-none"
          >
            {t('viewDetails')}
          </Link>
        </div>
      </div>
    </article>
  );
}
