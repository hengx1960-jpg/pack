import React, { useState, useEffect } from 'react';
import { Product, AllStock, FreezerLocationId, FREEZER_LOCATIONS } from '../../types';
import { formatQty, isDecimalUnit, parseQtyInput, getLocationMeta } from '../../utils';
import {
  ArrowLeftRight,
  Check,
  Warehouse,
  Store,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { LocationSelect } from '../LocationSelect';

interface TransferTabProps {
  products: Product[];
  stock: AllStock;
  initialProductId?: string;
  onCommitTransfer: (data: {
    productId: string;
    fromLoc: FreezerLocationId;
    toLoc: FreezerLocationId;
    qty: number;
    note: string;
  }) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const TransferTab: React.FC<TransferTabProps> = ({
  products,
  stock,
  initialProductId,
  onCommitTransfer,
  showToast,
}) => {
  const [selectedProductId, setSelectedProductId] = useState(
    initialProductId || (products[0]?.id ?? '')
  );

  // 規格特別要求：預設「倉庫舊機 → 市場上層」（舊貨優先出，符合先進先出）
  const [fromLoc, setFromLoc] = useState<FreezerLocationId>('wh_old');
  const [toLoc, setToLoc] = useState<FreezerLocationId>('mkt_up');
  const [qtyString, setQtyString] = useState('');
  const [note, setNote] = useState('');

  // 當外部 initialProductId 改變時同步
  useEffect(() => {
    if (initialProductId && products.some((p) => p.id === initialProductId)) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId, products]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const pStock = selectedProduct
    ? stock[selectedProduct.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 }
    : { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };

  const sourceAvailable = pStock[fromLoc] || 0;
  const targetAvailable = pStock[toLoc] || 0;
  const unit = selectedProduct?.unit ?? '件';
  const allowDecimal = isDecimalUnit(unit);

  const fromMeta = getLocationMeta(fromLoc);
  const toMeta = getLocationMeta(toLoc);

  const handleSwap = () => {
    const temp = fromLoc;
    setFromLoc(toLoc);
    setToLoc(temp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      showToast('請選擇要調撥的商品', 'warning');
      return;
    }

    if (fromLoc === toLoc) {
      showToast('調撥來源與目的冷凍庫不能相同！請選擇不同庫位', 'error');
      return;
    }

    const qty = parseQtyInput(qtyString, unit);
    if (qty <= 0) {
      showToast('調撥數量必須大於 0', 'warning');
      return;
    }

    if (qty > sourceAvailable) {
      showToast(
        `來源【${fromMeta.name}】目前只有 ${formatQty(sourceAvailable, unit)} ${unit}，無法調撥 ${formatQty(
          qty,
          unit
        )} ${unit}！`,
        'error'
      );
      return;
    }

    onCommitTransfer({
      productId: selectedProduct.id,
      fromLoc,
      toLoc,
      qty,
      note: note.trim(),
    });

    // 清空輸入
    setQtyString('');
    setNote('');
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5 pb-16">
      {/* 標題與說明 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-md">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-sky-400" />
          冷凍庫位調撥作業
        </h2>
        <p className="text-xs text-slate-400 mt-0.5 font-medium">
          商品於四個冷凍櫃之間移轉，總庫存保持不變。預設舊機優先調往市場攤位 (FIFO)。
        </p>
      </div>

      {/* 1. 選擇商品 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl space-y-3">
        <label className="block text-sm font-bold text-slate-300">
          選擇調撥商品
        </label>
        <select
          value={selectedProductId}
          onChange={(e) => {
            setSelectedProductId(e.target.value);
            setQtyString('');
          }}
          className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-base font-bold focus:border-amber-400"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.unit})
            </option>
          ))}
        </select>

        {/* 該商品在四個庫位的即時庫存狀況 */}
        {selectedProduct && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
            {FREEZER_LOCATIONS.map((loc) => {
              const count = pStock[loc.id] || 0;
              const isSrc = fromLoc === loc.id;
              const isDst = toLoc === loc.id;

              return (
                <div
                  key={loc.id}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isSrc
                      ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500'
                      : isDst
                      ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-400">
                    {loc.shortName}
                    {isSrc && ' (來源)'}
                    {isDst && ' (目的)'}
                  </div>
                  <div className="text-sm font-black text-white tabular-nums mt-0.5">
                    {formatQty(count, unit)} <span className="text-[10px] text-slate-400">{unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. 來源與目的冷凍庫位選擇 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center">
          {/* 來源庫位 */}
          <div className="sm:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-400 flex items-center gap-1">
                <Warehouse className="w-3.5 h-3.5" />
                調出來源櫃
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                可調：<strong className="text-white">{formatQty(sourceAvailable, unit)}</strong> {unit}
              </span>
            </div>
            <LocationSelect
              value={fromLoc}
              onChange={setFromLoc}
              quantities={pStock}
              unit={unit}
            />
          </div>

          {/* 交換按鈕 */}
          <div className="sm:col-span-1 flex justify-center pt-2 sm:pt-4">
            <button
              type="button"
              onClick={handleSwap}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 shadow hover:scale-105 transition-all"
              title="交換調出與調入庫位"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* 目的庫位 */}
          <div className="sm:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                <Store className="w-3.5 h-3.5" />
                調入目的櫃
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                現存：<strong className="text-white">{formatQty(targetAvailable, unit)}</strong> {unit}
              </span>
            </div>
            <LocationSelect
              value={toLoc}
              onChange={setToLoc}
              quantities={pStock}
              unit={unit}
            />
          </div>
        </div>

        {fromLoc === toLoc && (
          <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-600/60 text-xs font-bold text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            來源櫃與目的櫃相同，無法執行調撥！
          </div>
        )}
      </div>

      {/* 3. 調撥數量與備註 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl space-y-4">
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="text-sm font-bold text-slate-300">
              調撥數量 ({unit})
            </label>
            <span className="text-xs font-bold text-slate-400">
              來源庫存上限：
              <span className="text-amber-400 ml-1 font-extrabold tabular-nums">
                {formatQty(sourceAvailable, unit)} {unit}
              </span>
            </span>
          </div>

          <div className="relative">
            <input
              type="number"
              step={allowDecimal ? 'any' : '1'}
              min="0.01"
              max={sourceAvailable}
              value={qtyString}
              onChange={(e) => setQtyString(e.target.value)}
              placeholder={allowDecimal ? '請輸入數量 (例如 3.5)' : '請輸入整數數量 (例如 5)'}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-lg font-black tabular-nums focus:border-amber-400"
              required
            />
            {/* 快速全部調撥按鈕 */}
            {sourceAvailable > 0 && (
              <button
                type="button"
                onClick={() => setQtyString(sourceAvailable.toString())}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700"
              >
                全調
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-300 mb-1 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            調撥備註（選填）
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：現場備貨補齊、新機進貨分批調入舊機、客人下午提貨預搬..."
            className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-base focus:border-amber-400 placeholder:text-slate-500 font-medium"
          />
        </div>
      </div>

      {/* 確認調撥按鈕 */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={fromLoc === toLoc || sourceAvailable <= 0}
          className={`w-full py-4 px-6 rounded-2xl text-lg font-black tracking-wider shadow-xl transition-all flex items-center justify-center gap-3 min-h-[52px] ${
            fromLoc === toLoc || sourceAvailable <= 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white shadow-sky-950/60'
          }`}
        >
          <Check className="w-6 h-6 stroke-[3]" />
          <span>確認執行冷凍庫調撥</span>
        </button>
      </div>
    </form>
  );
};
