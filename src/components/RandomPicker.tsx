'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { StickerButton } from '@/components/StickerButton';
import { SubspeIcon } from '@/components/SubspeIcon';
import { RangeSlider, type RangeValue, type RangeMark } from '@/components/RangeSlider';
import { FilterGroup, Chip, type FilterOption } from '@/components/FilterGroup';
import { CollapsiblePanel } from '@/components/CollapsiblePanel';
import { ActiveFilterTokens, type FilterToken } from '@/components/FilterTokens';
import { matchesFilters, buildRangeMarks, isRangeLimited } from '@/components/weaponFilters';
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

function createSlot(id: number, bounds: RangeValue): Slot {
  return {
    id,
    cats: new Set(),
    subIds: new Set(),
    specialIds: new Set(),
    range: { ...bounds },
    open: true,
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

  const addSlot = () => {
    setModel((m) =>
      m.slots.length >= MAX_SLOTS
        ? m
        : { ...m, slots: [...m.slots, createSlot(nextSlotId(m.slots), rangeBounds)] },
    );
  };

  const removeSlot = (id: number) => {
    setModel((m) => (m.slots.length <= 1 ? m : { ...m, slots: m.slots.filter((s) => s.id !== id) }));
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

      {/* ── 抽選槽:堆疊卡片(每槽各自條件,全展開) ───────────────────────── */}
      <div className="mt-3 space-y-4">
        {slots.map((slot, i) => (
          <SlotCard
            key={slot.id}
            index={i}
            showIndex={multi}
            slot={slot}
            poolCount={poolFor(slot).length}
            canRemove={slots.length > 1}
            categories={categories}
            subs={subs}
            specials={specials}
            rangeBounds={rangeBounds}
            rangeMarks={rangeMarks}
            onUpdate={(partial) => updateSlot(slot.id, partial)}
            onToggleOpen={(open) => updateSlot(slot.id, { open })}
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

function SlotCard({
  index,
  showIndex,
  slot,
  poolCount,
  canRemove,
  categories,
  subs,
  specials,
  rangeBounds,
  rangeMarks,
  onUpdate,
  onToggleOpen,
  onRemove,
}: {
  index: number;
  showIndex: boolean;
  slot: Slot;
  poolCount: number;
  canRemove: boolean;
  categories: WeaponCategory[];
  subs: FilterOption[];
  specials: FilterOption[];
  rangeBounds: RangeValue;
  rangeMarks: RangeMark[];
  onUpdate: (partial: Partial<Slot>) => void;
  /** 展開 / 收合(簡化模式);與條件分流,切換不清抽選結果。 */
  onToggleOpen: (open: boolean) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('Random');
  const tc = useTranslations('Categories');

  // 逐槽簡化模式:展開 = 完整 chip picker;收合 = 該槽已選條件 token。8 槽時頁面易過長,
  // 各槽獨立收合最實用。open 隨槽設定一起持久化(見 PickerModel codec),重載後沿用上次的開/合。
  const open = slot.open;

  const toggleIn = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };
  const without = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    next.delete(value);
    return next;
  };

  // 已選條件 → 可逐一刪除的 token(收合時顯示)。副 / 特殊的名稱與圖示由選項表反查。
  const subById = useMemo(() => new Map(subs.map((s) => [s.id, s])), [subs]);
  const specialById = useMemo(() => new Map(specials.map((s) => [s.id, s])), [specials]);
  const tokens: FilterToken[] = [
    ...[...slot.cats].map((c) => ({
      key: `cat:${c}`,
      label: tc(c),
      onRemove: () => onUpdate({ cats: without(slot.cats, c) }),
    })),
    ...[...slot.subIds].map((id) => ({
      key: `sub:${id}`,
      label: subById.get(id)?.name ?? id,
      iconUrl: subById.get(id)?.iconUrl,
      onRemove: () => onUpdate({ subIds: without(slot.subIds, id) }),
    })),
    ...[...slot.specialIds].map((id) => ({
      key: `spe:${id}`,
      label: specialById.get(id)?.name ?? id,
      iconUrl: specialById.get(id)?.iconUrl,
      onRemove: () => onUpdate({ specialIds: without(slot.specialIds, id) }),
    })),
    ...(isRangeLimited(slot.range, rangeBounds)
      ? [
          {
            key: 'range',
            label: t('rangeToken', { min: slot.range.min, max: slot.range.max }),
            onRemove: () => onUpdate({ range: { ...rangeBounds } }),
          },
        ]
      : []),
  ];

  return (
    <CollapsiblePanel
      open={open}
      onOpenChange={onToggleOpen}
      header={
        showIndex ? (
          <h3 className="font-label text-xs font-bold uppercase tracking-wide text-text-on-dark">
            {t('slotLabel', { n: index + 1 })}
          </h3>
        ) : null
      }
      expandLabel={t('filtersExpand')}
      collapseLabel={t('filtersCollapse')}
      toolbar={
        <>
          <span className="font-data text-xs text-muted-on-dark">
            {t('poolCount', { count: poolCount })}
          </span>
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
          tokens={tokens}
          onAdd={() => onToggleOpen(true)}
          addLabel={t('addCondition')}
          emptyLabel={t('noConditions')}
          removeLabel={(name) => t('removeCondition', { name })}
        />
      }
    >
      <FilterGroup
        label={t('categoryGroup')}
        anyLabel={t('any')}
        anyActive={slot.cats.size === 0}
        onAny={() => onUpdate({ cats: new Set() })}
      >
        {categories.map((cat) => (
          <Chip
            key={cat}
            active={slot.cats.has(cat)}
            onClick={() => onUpdate({ cats: toggleIn(slot.cats, cat) })}
          >
            {tc(cat)}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup
        label={t('subGroup')}
        anyLabel={t('any')}
        anyActive={slot.subIds.size === 0}
        onAny={() => onUpdate({ subIds: new Set() })}
      >
        {subs.map((s) => (
          <Chip
            key={s.id}
            active={slot.subIds.has(s.id)}
            icon={s.iconUrl}
            onClick={() => onUpdate({ subIds: toggleIn(slot.subIds, s.id) })}
          >
            {s.name}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup
        label={t('specialGroup')}
        anyLabel={t('any')}
        anyActive={slot.specialIds.size === 0}
        onAny={() => onUpdate({ specialIds: new Set() })}
      >
        {specials.map((s) => (
          <Chip
            key={s.id}
            active={slot.specialIds.has(s.id)}
            icon={s.iconUrl}
            onClick={() => onUpdate({ specialIds: toggleIn(slot.specialIds, s.id) })}
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
