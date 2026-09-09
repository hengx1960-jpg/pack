import React, { useState, useMemo } from 'react';
import { Txn, Product, AllStock, TxnType } from '../../types';
import {
  formatShortDateTime,
  formatDateTime,
  formatQty,
  formatMoney,
  isToday,
  isThisMonth,
  exportToCSV,
  getLocationMeta,
} from '../../utils';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Calendar,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardCheck,
} from 'lucide-react';

interface RecordsTabProps {
  txns: Txn[];
  products: Product[];
  stock: AllStock;
  enableAmount: boolean;
}

export const RecordsTab: React.FC<RecordsTabProps> = ({
  txns,
  products,
  stock,
  enableAmount,
}) => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(50);

  // 產品查表
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // 計算三個主要統計數字 (嚴格使用台灣本地時間，禁止使用 UTC toISOString)
  const metrics = useMemo(() => {
    let todayOutAmount = 0;
    let thisMonthOutAmount = 0;
    let thisMonthProfitTotal = 0;
    let hasAnyCostItem = false;

    txns.forEach((t) => {
      if (t.type === 'out') {
        const amount = (t.price || 0) * Math.abs(t.qty);

        // 今日出貨金額 (本地時間)
        if (isToday(t.ts)) {
          todayOutAmount += amount;
        }

        // 本月出貨金額 (本地時間)
        if (isThisMonth(t.ts)) {
          thisMonthOutAmount += amount;

          // 毛利計算：(單價 - 成本) * 數量，僅計算有成本資料的品項
          if (t.cost !== null && t.cost !== undefined && !isNaN(t.cost)) {
            hasAnyCostItem = true;
            const profit = (t.price || 0) - t.cost;
            thisMonthProfitTotal += profit * Math.abs(t.qty);
          }
        }
      }
    });

    return {
      todayOutAmount,
      thisMonthOutAmount,
      thisMonthProfit: hasAnyCostItem ? thisMonthProfitTotal : null,
    };
  }, [txns]);

  // 過濾與搜尋
  const filteredTxns = useMemo(() => {
    return txns
      .filter((t) => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const prod = productMap.get(t.pid);
          const prodName = prod ? prod.name.toLowerCase() : '';
          const partyName = (t.party || '').toLowerCase();
          const refCode = (t.ref || '').toLowerCase();
          const noteText = (t.note || '').toLowerCase();

          if (
            !prodName.includes(query) &&
            !partyName.includes(query) &&
            !refCode.includes(query) &&
            !noteText.includes(query)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.ts - a.ts); // 最新在最前
  }, [txns, typeFilter, searchQuery, productMap]);

  const displayedList = filteredTxns.slice(0, displayLimit);
  const hasMore = filteredTxns.length > displayLimit;

  // 匯出 CSV (包含 UTF-8 BOM，防止 Excel 亂碼)
  const handleExportCSV = () => {
    exportToCSV(txns, products, stock);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 頂部三個核心財務指標卡片（僅在啟用金額功能時顯示） */}
      {enableAmount && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* 1. 今日出貨金額 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              今日出貨金額 (台灣時間)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 tabular-nums">
              NT$ {Math.round(metrics.todayOutAmount).toLocaleString('zh-TW')}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* 2. 本月出貨金額 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
              本月出貨總額 (當月累計)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-sky-400 mt-1 tabular-nums">
              NT$ {Math.round(metrics.thisMonthOutAmount).toLocaleString('zh-TW')}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* 3. 本月毛利 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              本月預估毛利 (售價 − 成本)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 tabular-nums">
              {metrics.thisMonthProfit !== null
                ? 'NT$ ' + Math.round(metrics.thisMonthProfit).toLocaleString('zh-TW')
                : '—'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>
      )}

      {/* 工具列：搜尋、篩選與 CSV 匯出按鈕 */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* 搜尋框 */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋商品名、客戶名、單號或備註..."
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-base focus:border-amber-400 placeholder:text-slate-500 font-medium"
            />
          </div>

          {/* 類型篩選按鈕列 */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'all', label: '全部' },
              { id: 'in', label: '進貨' },
              { id: 'out', label: '出貨' },
              { id: 'move', label: '調撥' },
              { id: 'count', label: '盤點' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  typeFilter === f.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 匯出 CSV 按鈕 (含 UTF-8 BOM) */}
        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>匯出完整報表 (CSV)</span>
        </button>
      </div>

      {/* 異動明細表格 (窄螢幕可橫向捲動) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-slate-950/80 text-xs font-bold text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4">時間 (台灣時間)</th>
                <th className="py-3 px-3 text-center">類型</th>
                <th className="py-3 px-4">商品名稱</th>
                <th className="py-3 px-3 text-center">庫位異動</th>
                <th className="py-3 px-3 text-right">數量</th>
                {enableAmount && <th className="py-3 px-3 text-right">單價 / 總額</th>}
                <th className="py-3 px-4">對象 / 備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {displayedList.length === 0 ? (
                <tr>
                  <td colSpan={enableAmount ? 7 : 6} className="py-12 text-center text-slate-500">
                    <p className="text-base font-semibold">查無異動紀錄</p>
                  </td>
                </tr>
              ) : (
                displayedList.map((t) => {
                  const prod = productMap.get(t.pid);
                  const prodName = prod ? prod.name : `已刪除商品`;
                  const unit = prod ? prod.unit : '件';
                  const loc = getLocationMeta(t.loc);
                  const toLoc = t.toLoc ? getLocationMeta(t.toLoc) : null;

                  // 類型標籤與顏色
                  let typeBadge = (
                    <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {t.type}
                    </span>
                  );
                  let qtyColor = 'text-white';
                  let qtySign = '';

                  if (t.type === 'in') {
                    typeBadge = (
                      <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-600/50">
                        <ArrowDownToLine className="w-3 h-3" /> 進貨
                      </span>
                    );
                    qtyColor = 'text-emerald-400';
                    qtySign = '+';
                  } else if (t.type === 'out') {
                    typeBadge = (
                      <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-600/50">
                        <ArrowUpFromLine className="w-3 h-3" /> 出貨
                      </span>
                    );
                    qtyColor = 'text-rose-400';
                    qtySign = '−';
                  } else if (t.type === 'move') {
                    typeBadge = (
                      <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-600/50">
                        <ArrowLeftRight className="w-3 h-3" /> 調撥
                      </span>
                    );
                    qtyColor = 'text-sky-400';
                  } else if (t.type === 'count') {
                    typeBadge = (
                      <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-600/50">
                        <ClipboardCheck className="w-3 h-3" /> 盤點
                      </span>
                    );
                    qtyColor = t.qty >= 0 ? 'text-emerald-400' : 'text-rose-400';
                    qtySign = t.qty > 0 ? '+' : '';
                  }

                  return (
                    <tr key={t.id} className="hover:bg-slate-850/50 transition-colors">
                      {/* 時間 */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-300 font-mono">
                        <div>{formatDateTime(t.ts)}</div>
                        {t.ref && <div className="text-[11px] text-slate-500 font-mono">{t.ref}</div>}
                      </td>

                      {/* 類型 */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">{typeBadge}</td>

                      {/* 商品 */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm leading-snug">{prodName}</div>
                        <span className="text-xs text-slate-500 font-semibold">{unit}</span>
                      </td>

                      {/* 庫位 */}
                      <td className="py-3 px-3 text-center whitespace-nowrap text-xs font-bold">
                        {t.type === 'move' && toLoc ? (
                          <div className="flex items-center justify-center gap-1 text-sky-300">
                            <span>{loc.shortName}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-emerald-300">{toLoc.shortName}</span>
                          </div>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded ${
                              loc.group === 'market'
                                ? 'bg-amber-950/40 text-amber-300 border border-amber-700/40'
                                : 'bg-sky-950/40 text-sky-300 border border-sky-700/40'
                            }`}
                          >
                            {loc.shortName}
                          </span>
                        )}
                      </td>

                      {/* 數量 */}
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                        <span className={`text-base font-black ${qtyColor}`}>
                          {qtySign}
                          {formatQty(Math.abs(t.qty), unit)}
                        </span>{' '}
                        <span className="text-xs text-slate-500">{unit}</span>
                      </td>

                      {/* 單價 / 總額 */}
                      {enableAmount && (
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                          {t.price !== undefined && t.price !== null ? (
                            <div>
                              <span className="text-sm font-bold text-amber-400">
                                NT$ {Math.round(t.price * Math.abs(t.qty)).toLocaleString('zh-TW')}
                              </span>
                              <div className="text-[11px] text-slate-500">
                                @{t.price} / {unit}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      )}

                      {/* 對象 / 備註 */}
                      <td className="py-3 px-4 text-xs">
                        {t.party && (
                          <div className="font-bold text-slate-200 flex items-center gap-1">
                            <span className="text-[11px] text-amber-400 font-semibold">
                              {t.type === 'in' ? '廠商:' : '客戶:'}
                            </span>
                            {t.party}
                          </div>
                        )}
                        {t.note && <div className="text-slate-400 text-xs mt-0.5">{t.note}</div>}
                        {!t.party && !t.note && <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 看更多按鈕 */}
        {hasMore && (
          <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={() => setDisplayLimit((prev) => prev + 50)}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
            >
              <ChevronDown className="w-4 h-4" />
              <span>載入更多紀錄 (目前顯示 {displayedList.length} / 共 {filteredTxns.length} 筆)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
