'use client';

/**
 * usePersistentState — 把一份 state 暫存到 localStorage,並在首次 render 就還原。
 *
 * 這裡只負責「機制」(eager 還原 + 寫回),不認識任何篩選語意;
 * 「形狀如何序列化 / 還原時如何對當前資料清洗」由呼叫端透過 codec 注入
 * (篩選語意見 filterStorage.ts,與 weaponFilters.ts 平權)。
 *
 * **使用前提:僅用於 client-only 子樹**(本產品以 next/dynamic `ssr:false` 掛載
 * WeaponList / RandomPicker)。因為這塊在伺服器端完全不渲染,首次 render 就能直接讀
 * localStorage、一步落在「還原態」——沒有 default→restored 那一拍閃動,也沒有 hydration
 * 不一致風險。若在會 SSR 的元件用本 hook,首屏會與伺服器輸出不符(請勿如此使用)。
 *
 * 設計保證:
 *  1. **eager 還原**:在 useState 初始化即讀 localStorage,初始值就是還原值。
 *  2. **壞值不致命**:壞 JSON、配額已滿或隱私模式無 localStorage 時靜默退回 initial,不中斷操作。
 *  3. **變更即寫回**:首次寫回 = 把還原值寫回(idempotent,無害),之後任何變更同步落盤。
 */

import { useEffect, useRef, useState } from 'react';

export interface PersistentCodec<T> {
  /** state → JSON 安全形狀(例:Set 攤平為 array)。 */
  serialize: (value: T) => unknown;
  /** 還原並對「當前」資料清洗(例:剔除已不存在的 id、把數值夾回當前邊界)。 */
  deserialize: (raw: unknown) => T;
}

export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  codec: PersistentCodec<T>,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // 首次 render 即還原:client-only,沒有伺服器首屏要對齊,可直接讀 localStorage。
  const [state, setState] = useState<T>(() => {
    const fallback = () => (typeof initial === 'function' ? (initial as () => T)() : initial);
    if (typeof window === 'undefined') return fallback();
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) return codec.deserialize(JSON.parse(raw));
    } catch {
      // 壞 JSON / 無 localStorage → 退回 initial。
    }
    return fallback();
  });

  // codec 多由 props 衍生(每 render 可能換參考);以 ref 取最新值,避免在 render 寫 ref。
  const codecRef = useRef(codec);
  useEffect(() => {
    codecRef.current = codec;
  }, [codec]);

  // 任何變更寫回(首次 = 還原值寫回,idempotent)。
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(codecRef.current.serialize(state)));
    } catch {
      // 配額滿 / 無 localStorage → 放棄寫入,不影響當前操作。
    }
  }, [key, state]);

  return [state, setState];
}
