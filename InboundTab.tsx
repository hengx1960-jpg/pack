import React, { useState, useEffect } from 'react';
import {
  Product,
  AllStock,
  FreezerLocationId,
  Txn,
} from '../../types';
import {
  formatQty,
  generateRef,
  isDecimalUnit,
  parseQtyInput,
} from '../../utils';
import {
  Plus,
  Trash2,
  Check,
  Building2,
  Layers,
  FileText,
  ArrowDownToLine,
  Info,
} from 'lucide-react';
import { LocationSelect } from '../LocationSelect';

interface InboundItem {
  rowId: string;
  productId: string;
  locationId: FreezerLocationId;
  qtyString: string;
  costString: string;
}

interface InboundTabProps {
  products: Product[];
  stock: AllStock;
  initialProductId?: string;
  enableAmount: boolean;
  onCommitInbound: (
    inboundData: {
      supplier: string;
      note: string;
      items: {
        productId: string;
        locationId: FreezerLocationId;
        qty: number;
        cost: number | null;
      }[];
    }
  ) => void;
}

export const InboundTab: React.FC<InboundTabProps> = ({
  products,
  stock,
  initialProductId,
  enableAmount,
  onCommitInbound,
}) => {
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');

  const [items, setItems] = useState<InboundItem[]>(() => [
    {
      rowId: 'row-' + Date.now(),
      productId: initialProductId || (products[0]?.id ?? ''),
      locationId: 'wh_new', // 預設進大倉庫新機
      qtyString: '',
      costString: '',
    },
  ]);

  // 當外部傳入 initialProductId 變更時，帶入第一筆
  useEffect(() => {
    if (initialProductId && products.some((p) => p.id === initialProductId)) {
      setItems((prev) => {
        if (prev.length === 1 && !prev[0].qtyString) {
          const prod = products.find((p) => p.id === initialProductId);
          return [
            {
              rowId: prev[0].rowId,
              productId: initialProductId,
              locationId: prev[0].locationId,
              qtyString: '',
              costString: prod?.cost ? prod.cost.toString() : '',
            },
          ];
        }
        return prev;
      });
    }
  }, [initialProductId, products]);

  // 新增一列品項
  const handleAddItem = () => {
    const defaultProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        rowId: 'row-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
        productId: defaultProd?.id ?? '',
        locationId: 'wh_new',
        qtyString: '',
        costString: defaultProd?.cost ? defaultProd.cost.toString() : '',
      },
    ]);
  };

  // 移除一列
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // 更新單一欄位（不造成整列表單重繪）
  const handleUpdateItem = (index: number, field: keyof InboundItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };

      // 若商品變更，自動帶入該商品預設成本
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          target.costString = prod.cost !== null && prod.cost !== undefined ? prod.cost.toString() : '';
          // 若有常用廠商且單頭未填，可友善提示
          if (prod.supplier && !supplier) {
            setSupplier(prod.supplier);
          }
        }
      }

      next[index] = target;
      return next;
    });
  };

  // 提交進貨
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證
    const validItems: {
      productId: string;
      locationId: FreezerLocationId;
      qty: number;
      cost: number | null;
    }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) continue;

      const qty = parseQtyInput(item.qtyString, prod.unit);
      if (qty <= 0) {
        alert(`第 ${i + 1} 項「${prod.name}」進貨數量必須大於 0！`);
        return;
      }

      let cost: number | null = null;
      if (enableAmount && item.costString.trim()) {
        const parsedCost = parseFloat(item.costString);
        if (!isNaN(parsedCost) && parsedCost >= 0) {
          cost = parsedCost;
        }
      }

      validItems.push({
        productId: item.productId,
        locationId: item.locationId,
        qty,
        cost,
      });
    }

    if (validItems.length === 0) {
      alert('請至少填寫一項有效商品與數量！');
      return;
    }

    // 執行進貨
    onCommitInbound({
      supplier: supplier.trim(),
      note: note.trim(),
      items: validItems,
    });

    // 清空重設表單
    setSupplier('');
    setNote('');
    setItems([
      {
        rowId: 'row-' + Date.now(),
        productId: products[0]?.id ?? '',
        locationId: 'wh_new',
        qtyString: '',
        costString: '',
      },
    ]);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-5 pb-16">
      {/* 標題 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-md">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
          商品進貨登記
        </h2>
        <p className="text-xs text-slate-400 mt-0.5 font-medium">
          入庫數量直接計入指定冷凍庫位，單號自動建立
        </p>
      </div>

      {/* 廠商名稱（選填） */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl space-y-2">
        <label className="block text-sm font-bold text-slate-300 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-amber-400" />
          供貨廠商名稱（選填）
        </label>
        <input
          type="text"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="例如：東港水產批發、美福肉品、澎湖阿輝..."
          className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-base focus:border-amber-400 placeholder:text-slate-500 font-medium"
        />
      </div>

      {/* 品項清單 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-sm font-black text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            進貨品項清單 ({items.length})
          </span>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 text-xs font-black flex items-center gap-1 transition-all"
          >
            <Plus className="w-4 h-4" />
            加一項
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const prod = products.find((p) => p.id === item.productId) || products[0];
            const pStock = prod
              ? stock[prod.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 }
              : { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
            const currentInLoc = pStock[item.locationId] || 0;
            const unit = prod?.unit ?? '件';
            const allowDecimal = isDecimalUnit(unit);

            return (
              <div
                key={item.rowId}
                className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>品項 #{index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/50 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      刪除此項
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* 商品選擇 */}
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      選擇商品
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleUpdateItem(index, 'productId', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-base font-bold focus:border-amber-400"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 存入庫位 */}
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      存入冷凍庫位
                    </label>
                    <LocationSelect
                      value={item.locationId}
                      onChange={(locId) => handleUpdateItem(index, 'locationId', locId)}
                      quantities={pStock}
                      unit={unit}
                    />
                  </div>

                  {/* 進貨數量 */}
                  <div className="sm:col-span-4">
                    <div className="flex items-baseline justify-between mb-1">
                      <label className="text-xs font-bold text-slate-400">
                        進貨數量 ({unit})
                      </label>
                      <span className="text-[11px] font-bold text-slate-400">
                        此櫃現有：
                        <span className="text-white font-extrabold ml-1">
                          {formatQty(currentInLoc, unit)}
                        </span>{' '}
                        {unit}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step={allowDecimal ? 'any' : '1'}
                        min="0.01"
                        value={item.qtyString}
                        onChange={(e) => handleUpdateItem(index, 'qtyString', e.target.value)}
                        placeholder={allowDecimal ? '可輸入小數 (例 2.5)' : '限整數 (例 10)'}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-base font-black tabular-nums focus:border-amber-400 placeholder:text-slate-600 placeholder:font-normal"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 成本選填（啟用金額功能時才顯示） */}
                {enableAmount && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                        進貨單價成本 (NT$ / 每{unit})
                        <span className="text-[10px] text-amber-400/80">(填入將自動更新商品預設成本)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.costString}
                        onChange={(e) => handleUpdateItem(index, 'costString', e.target.value)}
                        placeholder={`參考原成本: ${prod?.cost ?? '無'}`}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-base font-bold tabular-nums focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ＋ 加一項 按鈕 */}
        <button
          type="button"
          onClick={handleAddItem}
          className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-amber-500/80 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-amber-400 font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[44px]"
        >
          <Plus className="w-5 h-5" />
          <span>增加一項進貨商品</span>
        </button>
      </div>

      {/* 單頭備註欄 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl space-y-2">
        <label className="block text-sm font-bold text-slate-300 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-slate-400" />
          進貨備註（選填）
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：冷鏈物流車配送、冷凍溫度-18度確認合格、早市緊急進貨..."
          className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-base focus:border-amber-400 placeholder:text-slate-500 font-medium"
        />
      </div>

      {/* 確認進貨大按鈕 (手套友善，min-h 52px) */}
      <div className="pt-2">
        <button
          type="submit"
          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-lg font-black tracking-wider shadow-xl shadow-emerald-950/60 transition-all flex items-center justify-center gap-3 min-h-[52px]"
        >
          <Check className="w-6 h-6 stroke-[3]" />
          <span>確認送出進貨登記</span>
        </button>
      </div>
    </form>
  );
};
