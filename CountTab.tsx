import React, { useState, useMemo } from 'react';
import {
  Product,
  AllStock,
  FreezerLocationId,
  FREEZER_LOCATIONS,
} from '../../types';
import {
  formatQty,
  isDecimalUnit,
  parseQtyInput,
  getLocationMeta,
} from '../../utils';
import {
  ClipboardCheck,
  Check,
  RotateCcw,
  Eye,
  Store,
  Warehouse,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface CountTabProps {
  products: Product[];
  stock: AllStock;
  onCommitCount: (data: {
    locationId: FreezerLocationId;
    changes: {
      productId: string;
      systemQty: number;
      actualQty: number;
      diff: number;
    }[];
  }) => void;
}

export const CountTab: React.FC<CountTabProps> = ({
  products,
  stock,
  onCommitCount,
}) => {
  // 目前選取盤點的庫位
  const [selectedLoc, setSelectedLoc] = useState<FreezerLocationId>('mkt_up');
  const [includeZeroStock, setIncludeZeroStock] = useState(false);

  // 本地暫存實際數量輸入：{ [productId]: string }
  const [actualValues, setActualValues] = useState<Record<string, string>>({});

  const locMeta = getLocationMeta(selectedLoc);

  // 切換庫位時清空自訂輸入
  const handleSelectLoc = (locId: FreezerLocationId) => {
    setSelectedLoc(locId);
    setActualValues({});
  };

  // 取得此庫位目前要盤點的商品清單
  const countList = useMemo(() => {
    return products.filter((p) => {
      const pStock = stock[p.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
      const systemQty = pStock[selectedLoc] || 0;
      if (includeZeroStock) return true;
      return systemQty > 0;
    });
  }, [products, stock, selectedLoc, includeZeroStock]);

  // 更新實際盤點數量輸入
  const handleActualChange = (productId: string, val: string) => {
    setActualValues((prev) => ({
      ...prev,
      [productId]: val,
    }));
  };

  // 重設為系統數量
  const handleResetToSystem = () => {
    setActualValues({});
  };

  // 提交盤點存檔
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const changes: {
      productId: string;
      systemQty: number;
      actualQty: number;
      diff: number;
    }[] = [];

    countList.forEach((p) => {
      const pStock = stock[p.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
      const systemQty = pStock[selectedLoc] || 0;
      const inputVal = actualValues[p.id];

      // 若使用者有輸入則取使用者值，否則預設維持系統數量
      const actualQty =
        inputVal !== undefined && inputVal.trim() !== ''
          ? parseQtyInput(inputVal, p.unit)
          : systemQty;

      const diff = Number((actualQty - systemQty).toFixed(2));
      if (diff !== 0) {
        changes.push({
          productId: p.id,
          systemQty,
          actualQty,
          diff,
        });
      }
    });

    if (changes.length === 0) {
      if (
        !window.confirm(
          `【${locMeta.name}】經比對與系統數量完全一致（無任何盤盈或盤虧差異）。\n是否仍要確認完成本次盤點？`
        )
      ) {
        return;
      }
    } else {
      const summaryText = changes
        .map((c) => {
          const p = products.find((prod) => prod.id === c.productId);
          const sign = c.diff > 0 ? '+' : '';
          return `· ${p?.name}: 原 ${formatQty(c.systemQty, p?.unit)} -> 實 ${formatQty(
            c.actualQty,
            p?.unit
          )} (差異: ${sign}${formatQty(c.diff, p?.unit)} ${p?.unit})`;
        })
        .join('\n');

      const confirmed = window.confirm(
        `確定要更新【${locMeta.name}】的庫存數量嗎？\n\n共發現 ${changes.length} 項品項差異：\n${summaryText}\n\n此動作將覆蓋系統庫存並記錄盤點異動！`
      );
      if (!confirmed) return;
    }

    onCommitCount({
      locationId: selectedLoc,
      changes,
    });

    setActualValues({});
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16">
      {/* 頂部標題 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-400" />
            分櫃實地盤點作業
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            一次盤點一個冷凍庫位，輸入現場實際清點數量，系統自動計算盤盈盤虧
          </p>
        </div>

        {/* 連零庫存一起盤開關 */}
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 cursor-pointer select-none text-sm font-bold text-slate-200">
          <input
            type="checkbox"
            checked={includeZeroStock}
            onChange={(e) => setIncludeZeroStock(e.target.checked)}
            className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
          />
          <Eye className="w-4 h-4 text-amber-400" />
          <span>連零庫存商品一起盤點</span>
        </label>
      </div>

      {/* 四個冷凍庫位切換按鈕 (大按鈕好按，四色分明) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {FREEZER_LOCATIONS.map((loc) => {
          const isSelected = selectedLoc === loc.id;
          const isMarket = loc.group === 'market';

          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => handleSelectLoc(loc.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden min-h-[58px] ${
                isSelected
                  ? `${loc.badgeBg} ring-2 ring-offset-0`
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-md border ${loc.badgeBg}`}
                >
                  {isMarket ? <Store className="w-3 h-3" /> : <Warehouse className="w-3 h-3" />}
                  {loc.groupName}
                </span>
                {isSelected && (
                  <span className={`w-2.5 h-2.5 rounded-full ${loc.dot} animate-pulse`} />
                )}
              </div>
              <div className="font-extrabold text-sm text-white mt-1.5 line-clamp-1">
                {loc.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* 盤點表單本體 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-black text-slate-200">
              盤點中庫位：<strong className="text-amber-400">{locMeta.name}</strong> (共 {countList.length} 品項)
            </span>
            <button
              type="button"
              onClick={handleResetToSystem}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              還原為系統數量
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-950 text-xs font-bold text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 min-w-[200px]">商品名稱 (單位)</th>
                  <th className="py-3 px-4 text-center">系統記錄數量</th>
                  <th className="py-3 px-4 text-center min-w-[160px]">現場實際數量 (可修改)</th>
                  <th className="py-3 px-4 text-center min-w-[120px]">盤點差異</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {countList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      <p className="text-base font-semibold">此冷凍櫃目前無任何有庫存的商品</p>
                      <p className="text-xs mt-1 text-slate-600">
                        若欲盤點全部品項，請勾選上方「連零庫存商品一起盤點」
                      </p>
                    </td>
                  </tr>
                ) : (
                  countList.map((p) => {
                    const pStock = stock[p.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
                    const systemQty = pStock[selectedLoc] || 0;
                    const allowDecimal = isDecimalUnit(p.unit);

                    const inputValue =
                      actualValues[p.id] !== undefined
                        ? actualValues[p.id]
                        : systemQty.toString();

                    const parsedActual = parseQtyInput(inputValue, p.unit);
                    const diff = Number((parsedActual - systemQty).toFixed(2));
                    const hasDiff = diff !== 0;

                    let rowBg = 'hover:bg-slate-800/30';
                    let diffBadge = (
                      <span className="text-slate-500 text-sm font-semibold tabular-nums">0 (平)</span>
                    );

                    if (diff > 0) {
                      rowBg = 'bg-emerald-950/20 hover:bg-emerald-950/30';
                      diffBadge = (
                        <span className="inline-flex items-center gap-1 text-sm font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/50 tabular-nums">
                          <TrendingUp className="w-3.5 h-3.5" />+{formatQty(diff, p.unit)} (盤盈)
                        </span>
                      );
                    } else if (diff < 0) {
                      rowBg = 'bg-rose-950/20 hover:bg-rose-950/30';
                      diffBadge = (
                        <span className="inline-flex items-center gap-1 text-sm font-black text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-600/50 tabular-nums">
                          <TrendingDown className="w-3.5 h-3.5" />
                          {formatQty(diff, p.unit)} (盤虧)
                        </span>
                      );
                    }

                    return (
                      <tr key={p.id} className={`transition-colors ${rowBg}`}>
                        {/* 商品名稱 */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-base leading-snug">{p.name}</div>
                          <span className="text-xs text-slate-400 font-semibold mt-0.5 inline-block">
                            單位：{p.unit}
                          </span>
                        </td>

                        {/* 系統記錄數量 */}
                        <td className="py-3 px-4 text-center tabular-nums">
                          <span className="text-base font-bold text-slate-300">
                            {formatQty(systemQty, p.unit)}
                          </span>{' '}
                          <span className="text-xs text-slate-500">{p.unit}</span>
                        </td>

                        {/* 現場實際數量輸入 */}
                        <td className="py-3 px-4 text-center">
                          <div className="relative inline-block w-36">
                            <input
                              type="number"
                              step={allowDecimal ? 'any' : '1'}
                              min="0"
                              value={inputValue}
                              onChange={(e) => handleActualChange(p.id, e.target.value)}
                              placeholder="0"
                              className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-center text-base font-black tabular-nums transition-colors ${
                                hasDiff
                                  ? diff > 0
                                    ? 'border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                                    : 'border-rose-500 text-rose-300 ring-1 ring-rose-500/40'
                                  : 'border-slate-700 text-white focus:border-amber-400'
                              }`}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 pointer-events-none">
                              {p.unit}
                            </span>
                          </div>
                        </td>

                        {/* 盤點差異 */}
                        <td className="py-3 px-4 text-center">{diffBadge}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 存檔按鈕 */}
        {countList.length > 0 && (
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-lg font-black tracking-wider shadow-xl shadow-amber-950/60 transition-all flex items-center justify-center gap-3 min-h-[52px]"
            >
              <Check className="w-6 h-6 stroke-[3]" />
              <span>存檔並更新【{locMeta.name}】庫存</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
