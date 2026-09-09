import React, { useState, useMemo } from 'react';
import { Product, AllStock, FREEZER_LOCATIONS, FreezerLocationId } from '../../types';
import { formatQty, formatMoney, isDecimalUnit } from '../../utils';
import {
  Search,
  EyeOff,
  Store,
  Warehouse,
  Plus,
  Minus,
  ArrowLeftRight,
  TrendingDown,
  Layers,
} from 'lucide-react';

interface InventoryTabProps {
  products: Product[];
  stock: AllStock;
  enableAmount: boolean;
  onQuickAction: (action: 'in' | 'out' | 'move', productId: string) => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  products,
  stock,
  enableAmount,
  onQuickAction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hideZeroStock, setHideZeroStock] = useState(false);

  // 計算每個庫位的品項數與總量
  const locationStats = useMemo(() => {
    const stats: Record<FreezerLocationId, { count: number; totalUnits: number }> = {
      mkt_up: { count: 0, totalUnits: 0 },
      mkt_dn: { count: 0, totalUnits: 0 },
      wh_new: { count: 0, totalUnits: 0 },
      wh_old: { count: 0, totalUnits: 0 },
    };

    products.forEach((p) => {
      const pStock = stock[p.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
      (['mkt_up', 'mkt_dn', 'wh_new', 'wh_old'] as FreezerLocationId[]).forEach((loc) => {
        const qty = pStock[loc] || 0;
        if (qty > 0) {
          stats[loc].count += 1;
          stats[loc].totalUnits += qty;
        }
      });
    });

    return stats;
  }, [products, stock]);

  // 過濾商品清單
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
      if (!matchesSearch) return false;

      if (hideZeroStock) {
        const pStock = stock[p.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
        const total = pStock.mkt_up + pStock.mkt_dn + pStock.wh_new + pStock.wh_old;
        if (total <= 0) return false;
      }

      return true;
    });
  }, [products, stock, searchTerm, hideZeroStock]);

  return (
    <div className="space-y-5 pb-12">
      {/* 頂部：四個庫位即時概況卡片 (一眼分辨市場 vs 倉庫) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {FREEZER_LOCATIONS.map((loc) => {
          const stat = locationStats[loc.id];
          const isMarket = loc.group === 'market';

          return (
            <div
              key={loc.id}
              id={`freezer-card-${loc.id}`}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 relative overflow-hidden ${
                isMarket
                  ? 'bg-slate-900/90 border-amber-500/40 hover:border-amber-400'
                  : 'bg-slate-900/90 border-sky-500/40 hover:border-sky-400'
              }`}
            >
              {/* 頂部標記條 */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isMarket
                    ? loc.id === 'mkt_up'
                      ? 'bg-amber-400'
                      : 'bg-orange-500'
                    : loc.id === 'wh_new'
                    ? 'bg-sky-400'
                    : 'bg-indigo-500'
                }`}
              />

              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg border ${
                    isMarket
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  }`}
                >
                  {isMarket ? <Store className="w-3.5 h-3.5" /> : <Warehouse className="w-3.5 h-3.5" />}
                  {loc.groupName} · {loc.shortName}
                </span>
                <span className="text-[11px] font-mono text-slate-400 font-semibold">{loc.id}</span>
              </div>

              <div className="text-sm font-bold text-slate-200 line-clamp-1">{loc.name}</div>

              <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">在櫃品項</span>
                  <span className="text-2xl font-black text-white tabular-nums">{stat.count}</span>
                  <span className="text-xs text-slate-400 ml-1">種</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-medium block">在庫總量</span>
                  <span
                    className={`text-lg font-black tabular-nums ${
                      isMarket ? 'text-amber-400' : 'text-sky-400'
                    }`}
                  >
                    {stat.totalUnits % 1 === 0 ? stat.totalUnits : stat.totalUnits.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 搜尋與過濾列 */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋商品名稱（例如：蝦、花枝丸、牛五花）..."
            className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-2.5 text-base focus:border-amber-400 placeholder:text-slate-500 font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded"
            >
              清空
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 cursor-pointer select-none bg-slate-950 sm:bg-transparent px-3 py-2 sm:p-0 rounded-xl border sm:border-0 border-slate-800">
            <input
              type="checkbox"
              checked={hideZeroStock}
              onChange={(e) => setHideZeroStock(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-amber-500 focus:ring-offset-slate-900"
            />
            <span className="flex items-center gap-1.5">
              <EyeOff className="w-4 h-4 text-slate-400" />
              隱藏零庫存商品
            </span>
          </label>

          <span className="text-xs text-slate-400 font-semibold tabular-nums">
            顯示 {filteredProducts.length} / {products.length} 品
          </span>
        </div>
      </div>

      {/* 主體：四庫位分欄表格 (窄螢幕可橫向滑動，數字等寬對齊) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-xs font-bold text-slate-300 tracking-wider">
                <th className="py-3.5 px-4 sticky left-0 bg-slate-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] min-w-[200px]">
                  商品名稱（單位）
                </th>
                {/* 市場小冷凍庫 上層 */}
                <th className="py-3.5 px-3 text-center bg-amber-950/20 text-amber-300 border-l border-amber-900/30">
                  <div className="text-[11px] font-normal text-amber-400/80">市場小櫃</div>
                  <div className="font-black text-sm">上層</div>
                </th>
                {/* 市場小冷凍庫 下層 */}
                <th className="py-3.5 px-3 text-center bg-orange-950/20 text-orange-300 border-l border-orange-900/30">
                  <div className="text-[11px] font-normal text-orange-400/80">市場小櫃</div>
                  <div className="font-black text-sm">下層</div>
                </th>
                {/* 倉庫大冷凍庫 新機 */}
                <th className="py-3.5 px-3 text-center bg-sky-950/20 text-sky-300 border-l border-sky-900/30">
                  <div className="text-[11px] font-normal text-sky-400/80">倉庫大櫃</div>
                  <div className="font-black text-sm">新機</div>
                </th>
                {/* 倉庫大冷凍庫 舊機 */}
                <th className="py-3.5 px-3 text-center bg-indigo-950/20 text-indigo-300 border-l border-indigo-900/30">
                  <div className="text-[11px] font-normal text-indigo-400/80">倉庫大櫃</div>
                  <div className="font-black text-sm">舊機</div>
                </th>
                {/* 總量（最醒目） */}
                <th className="py-3.5 px-4 text-center bg-amber-500/10 text-amber-300 border-l-2 border-amber-500/40">
                  <div className="text-[11px] font-bold text-amber-400">老闆看這裡</div>
                  <div className="font-black text-base">總庫存量</div>
                </th>
                <th className="py-3.5 px-4 text-center border-l border-slate-800">
                  現場快捷
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="text-base font-semibold">找不到符合條件的商品</p>
                    <p className="text-xs mt-1 text-slate-600">請嘗試更換關鍵字或取消「隱藏零庫存」</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const pStock = stock[p.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
                  const total = pStock.mkt_up + pStock.mkt_dn + pStock.wh_new + pStock.wh_old;
                  const isLowStock = total <= 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* 商品名稱（含單位與參考售價） */}
                      <td className="py-3 px-4 sticky left-0 bg-slate-900 group-hover:bg-slate-850 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                        <div className="font-bold text-white text-base leading-snug flex items-center gap-1.5">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                            單位：{p.unit}
                          </span>
                          {enableAmount && <span>定價 {formatMoney(p.price)}</span>}
                        </div>
                      </td>

                      {/* 市場上層 */}
                      <td className="py-3 px-3 text-center border-l border-amber-900/20 tabular-nums">
                        <span
                          className={`text-base font-extrabold ${
                            pStock.mkt_up > 0
                              ? 'text-amber-300 font-black'
                              : 'text-slate-600 opacity-40 font-normal'
                          }`}
                        >
                          {formatQty(pStock.mkt_up, p.unit)}
                        </span>
                      </td>

                      {/* 市場下層 */}
                      <td className="py-3 px-3 text-center border-l border-orange-900/20 tabular-nums">
                        <span
                          className={`text-base font-extrabold ${
                            pStock.mkt_dn > 0
                              ? 'text-orange-300 font-black'
                              : 'text-slate-600 opacity-40 font-normal'
                          }`}
                        >
                          {formatQty(pStock.mkt_dn, p.unit)}
                        </span>
                      </td>

                      {/* 倉庫新機 */}
                      <td className="py-3 px-3 text-center border-l border-sky-900/20 tabular-nums">
                        <span
                          className={`text-base font-extrabold ${
                            pStock.wh_new > 0
                              ? 'text-sky-300 font-black'
                              : 'text-slate-600 opacity-40 font-normal'
                          }`}
                        >
                          {formatQty(pStock.wh_new, p.unit)}
                        </span>
                      </td>

                      {/* 倉庫舊機 */}
                      <td className="py-3 px-3 text-center border-l border-indigo-900/20 tabular-nums">
                        <span
                          className={`text-base font-extrabold ${
                            pStock.wh_old > 0
                              ? 'text-indigo-300 font-black'
                              : 'text-slate-600 opacity-40 font-normal'
                          }`}
                        >
                          {formatQty(pStock.wh_old, p.unit)}
                        </span>
                      </td>

                      {/* 總量（最醒目特別設計） */}
                      <td className="py-3 px-4 text-center border-l-2 border-amber-500/40 bg-amber-500/5 tabular-nums">
                        <div
                          className={`text-xl font-black ${
                            total > 0
                              ? 'text-amber-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]'
                              : 'text-rose-500/80 font-bold'
                          }`}
                        >
                          {formatQty(total, p.unit)}
                          <span className="text-xs font-semibold text-slate-400 ml-1">
                            {p.unit}
                          </span>
                        </div>
                        {isLowStock && (
                          <span className="inline-block text-[10px] font-bold text-rose-400 bg-rose-950/60 px-1.5 rounded mt-0.5">
                            缺貨中
                          </span>
                        )}
                      </td>

                      {/* 快速直達操作按鈕 */}
                      <td className="py-3 px-3 text-center border-l border-slate-800">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onQuickAction('in', p.id)}
                            className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400 border border-emerald-700/50 text-xs font-bold flex items-center gap-0.5"
                            title="快速進貨登記"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">進</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickAction('out', p.id)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-700/50 text-xs font-bold flex items-center gap-0.5"
                            title="快速出貨開單"
                          >
                            <Minus className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">出</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickAction('move', p.id)}
                            className="p-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 text-sky-400 border border-sky-700/50 text-xs font-bold flex items-center gap-0.5"
                            title="庫位調撥"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">調</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
