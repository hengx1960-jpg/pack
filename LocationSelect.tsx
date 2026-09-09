import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { FreezerLocationId, FREEZER_LOCATIONS, ProductUnit } from '../types';
import { formatQty } from '../utils';

interface LocationSelectProps {
  /** 目前選取的庫位 */
  value: FreezerLocationId;
  onChange: (id: FreezerLocationId) => void;
  /** 各庫位目前的庫存量，用來在選項旁顯示參考數量（選填） */
  quantities?: Partial<Record<FreezerLocationId, number>>;
  unit?: ProductUnit;
  /** 隱藏特定庫位（例如調撥時，目的庫位要排除已選的來源庫位可用這個） */
  excludeIds?: FreezerLocationId[];
  disabled?: boolean;
  id?: string;
}

/**
 * 原生 <select> 沒辦法穩定地在展開選單裡顯示每個選項的顏色（iOS Safari 完全不支援），
 * 所以庫位選擇改用這個自訂下拉元件，四個庫位（市場上/下、倉庫新/舊）各自有固定的
 * 顏色圓點與強調色，開起來後不管在哪個裝置看都分辨得出來。
 */
export const LocationSelect: React.FC<LocationSelectProps> = ({
  value,
  onChange,
  quantities,
  unit,
  excludeIds,
  disabled,
  id,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = FREEZER_LOCATIONS.find((l) => l.id === value) || FREEZER_LOCATIONS[0];
  const visibleLocations = FREEZER_LOCATIONS.filter((l) => !excludeIds?.includes(l.id));
  const groups = [
    { groupName: '市場' as const, items: visibleLocations.filter((l) => l.group === 'market') },
    { groupName: '倉庫' as const, items: visibleLocations.filter((l) => l.group === 'warehouse') },
  ].filter((g) => g.items.length > 0);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-base font-bold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${current.badgeBg} hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${current.dot}`} />
          <span className="truncate">
            {current.groupName} · {current.name}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-30 mt-1.5 w-full min-w-[240px] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden"
        >
          {groups.map((g) => (
            <div key={g.groupName}>
              <div className="px-3 py-1.5 text-[11px] font-black text-slate-500 bg-slate-950/90 tracking-wider">
                {g.groupName}
              </div>
              {g.items.map((loc) => {
                const isSelected = loc.id === value;
                const qty = quantities ? quantities[loc.id] ?? 0 : undefined;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(loc.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-bold text-left border-l-4 transition-colors ${
                      isSelected ? loc.badgeBg : 'border-transparent text-slate-200 hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${loc.dot}`} />
                      <span className="truncate">{loc.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {qty !== undefined && (
                        <span className="text-xs font-semibold text-slate-400 tabular-nums">
                          存 {formatQty(qty, unit)}
                          {unit ? ` ${unit}` : ''}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
