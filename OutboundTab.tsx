import React, { useState, useEffect, useMemo } from 'react';
import { Product, AllStock, FreezerLocationId } from '../../types';
import { formatQty, formatMoney, isDecimalUnit, parseQtyInput, getLocationMeta } from '../../utils';
import {
  ArrowUpFromLine,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  UserCheck,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import { LocationSelect } from '../LocationSelect';

interface OutboundItem {
  rowId: string;
  productId: string;
  locationId: FreezerLocationId;
  qtyString: string;
  priceString: string;
}

interface OutboundTabProps {
  products: Product[];
  stock: AllStock;
  initialProductId?: string;
  enableAmount: boolean;
  onCommitOutbound: (data: {
    customer: string;
    note: string;
    items: {
      productId: string;
      locationId: FreezerLocationId;
      qty: number;
      price: number | null;
      cost: number | null;
    }[];
  }) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const OutboundTab: React.FC<OutboundTabProps> = ({
  products,
  stock,
  initialProductId,
  enableAmount,
  onCommitOutbound,
  showToast,
}) => {
  const [customer, setCustomer] = useState('');
  const [note, setNote] = useState('');

  const [items, setItems] = useState<OutboundItem[]>(() => [
    {
      rowId: 'out-row-' + Date.now(),
      productId: initialProductId || (products[0]?.id ?? ''),
      locationId: 'mkt_up', // 預設從市場上層出貨 (市場攤位常備出貨櫃)
      qtyString: '',
      priceString: products[0]?.price ? products[0].price.toString() : '0',
    },
  ]);

  // 當外部傳入 initialProductId 時
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
              priceString: prod?.price ? prod.price.toString() : '0',
            },
          ];
        }
        return prev;
      });
    }
  }, [initialProductId, products]);

  // 新增一列
  const handleAddItem = () => {
    const defaultProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        rowId: 'out-row-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
        productId: defaultProd?.id ?? '',
        locationId: 'mkt_up',
        qtyString: '',
        priceString: defaultProd?.price ? defaultProd.price.toString() : '0',
      },
    ]);
  };

  // 刪除一列
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // 更新欄位
  const handleUpdateItem = (index: number, field: keyof OutboundItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };

      // 若商品變更，自動帶入預設售價
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          target.priceString = prod.price.toString();
        }
      }

      next[index] = target;
      return next;
    });
  };

  // 即時計算總金額（僅在啟用金額功能時）與檢查各項庫存是否超賣
  const summary = useMemo(() => {
    let totalAmount = 0;
    let hasStockError = false;

    items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return;

      const qty = parseQtyInput(item.qtyString, prod.unit);
      if (enableAmount) {
        const price = parseFloat(item.priceString) || 0;
        totalAmount += qty * price;
      }

      const pStock = stock[prod.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
      const currentStock = pStock[item.locationId] || 0;
      if (qty > currentStock) {
        hasStockError = true;
      }
    });

    return { totalAmount: Math.round(totalAmount), hasStockError };
  }, [items, products, stock, enableAmount]);

  // 提交出貨
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer.trim()) {
      showToast('請填寫 B2B 出貨「客戶名稱」（例如：海宴餐廳、阿水海產攤）', 'warning');
      return;
    }

    const validItems: {
      productId: string;
      locationId: FreezerLocationId;
      qty: number;
      price: number | null;
      cost: number | null;
    }[] = [];

    // 嚴格庫存檢核，任何一項不足就擋下並明確告知「某商品在某櫃只剩多少」
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) continue;

      const qty = parseQtyInput(item.qtyString, prod.unit);
      if (qty <= 0) {
        showToast(`第 ${i + 1} 項「${prod.name}」出貨數量必須大於 0`, 'warning');
        return;
      }

      const pStock = stock[prod.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
      const availableStock = pStock[item.locationId] || 0;
      const locMeta = getLocationMeta(item.locationId);

      if (qty > availableStock) {
        showToast(
          `出貨被擋下：商品【${prod.name}】在【${locMeta.name}】只剩 ${formatQty(
            availableStock,
            prod.unit
          )} ${prod.unit}，無法出貨 ${formatQty(qty, prod.unit)} ${prod.unit}！`,
          'error'
        );
        return;
      }

      let price: number | null = null;
      if (enableAmount) {
        const parsedPrice = parseFloat(item.priceString);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          showToast(`第 ${i + 1} 項「${prod.name}」單價不可為負數`, 'warning');
          return;
        }
        price = parsedPrice;
      }

      validItems.push({
        productId: item.productId,
        locationId: item.locationId,
        qty,
        price,
        cost: enableAmount ? prod.cost : null, // 當下成本快照，用於精確計算毛利
      });
    }

    if (validItems.length === 0) {
      showToast('請至少填寫一項出貨商品！', 'warning');
      return;
    }

    // 執行出貨扣庫存
    onCommitOutbound({
      customer: customer.trim(),
      note: note.trim(),
      items: validItems,
    });

    // 清空表單
    setCustomer('');
    setNote('');
    setItems([
      {
        rowId: 'out-row-' + Date.now(),
        productId: products[0]?.id ?? '',
        locationId: 'mkt_up',
        qtyString: '',
        priceString: products[0]?.price ? products[0].price.toString() : '0',
      },
    ]);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-5 pb-16">
      {/* 頂部標題與說明 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-rose-400" />
            B2B 出貨單開單
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            {enableAmount
              ? '依指定庫位扣減庫存，支援單價現場議價修改，防止超賣'
              : '依指定庫位扣減庫存，防止超賣（金額另外計算，此處不記單價）'}
          </p>
        </div>
      </div>

      {/* 客戶名稱單頭 (必填) */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl space-y-2">
        <label className="block text-sm font-bold text-slate-200 flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-amber-400" />
          客戶 / 批發商號名稱 <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="例如：海宴活海產、大中海鮮樓、逢甲小吃部..."
          className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-base focus:border-amber-400 placeholder:text-slate-500 font-medium"
          required
        />
      </div>

      {/* 出貨品項清單 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-sm font-black text-slate-200">
            出貨品項明細 ({items.length})
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
            const currentStock = pStock[item.locationId] || 0;
            const unit = prod?.unit ?? '件';
            const allowDecimal = isDecimalUnit(unit);
            const inputQty = parseQtyInput(item.qtyString, unit);
            const isInsufficient = inputQty > currentStock;

            return (
              <div
                key={item.rowId}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-3 ${
                  isInsufficient
                    ? 'bg-rose-950/25 border-rose-600/80 shadow-inner'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    品項 #{index + 1}
                    {isInsufficient && (
                      <span className="text-rose-400 flex items-center gap-1 font-black bg-rose-950/80 px-2 py-0.5 rounded border border-rose-600/50">
                        <BadgeAlert className="w-3.5 h-3.5" />
                        庫存不足警告！
                      </span>
                    )}
                  </span>
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

                <div className={`grid grid-cols-1 sm:grid-cols-12 gap-3 items-end`}>
                  {/* 商品選擇 */}
                  <div className={enableAmount ? 'sm:col-span-4' : 'sm:col-span-6'}>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      出貨商品
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

                  {/* 從哪個庫位出貨 */}
                  <div className={enableAmount ? 'sm:col-span-4' : 'sm:col-span-6'}>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      從哪個冷凍庫出貨
                    </label>
                    <LocationSelect
                      value={item.locationId}
                      onChange={(locId) => handleUpdateItem(index, 'locationId', locId)}
                      quantities={pStock}
                      unit={unit}
                    />
                  </div>

                  {/* 出貨數量 (即時庫存提示與超賣警告) */}
                  <div className={enableAmount ? 'sm:col-span-2' : 'sm:col-span-6'}>
                    <div className="flex items-baseline justify-between mb-1">
                      <label className="text-xs font-bold text-slate-400">
                        數量 ({unit})
                      </label>
                    </div>
                    <input
                      type="number"
                      step={allowDecimal ? 'any' : '1'}
                      min="0.01"
                      value={item.qtyString}
                      onChange={(e) => handleUpdateItem(index, 'qtyString', e.target.value)}
                      placeholder={allowDecimal ? '例 2.5' : '例 5'}
                      className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-base font-black tabular-nums transition-colors ${
                        isInsufficient
                          ? 'border-rose-500 text-rose-400 bg-rose-950/40 ring-1 ring-rose-500'
                          : 'border-slate-700 text-white focus:border-amber-400'
                      }`}
                      required
                    />
                  </div>

                  {/* 出貨單價 (可議價現場修改；僅在啟用金額功能時顯示) */}
                  {enableAmount && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        單價 (NT$)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.priceString}
                        onChange={(e) => handleUpdateItem(index, 'priceString', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-amber-300 rounded-xl px-3 py-2 text-base font-black tabular-nums focus:border-amber-400"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* 庫位可用庫存指示與小計 */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      isInsufficient ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    該櫃可用量：
                    <strong className="text-white tabular-nums">
                      {formatQty(currentStock, unit)}
                    </strong>{' '}
                    {unit}
                    {isInsufficient && (
                      <span className="text-rose-400 font-extrabold ml-1">
                        (超賣 {formatQty(inputQty - currentStock, unit)} {unit})
                      </span>
                    )}
                  </span>

                  {enableAmount && (
                    <span className="font-bold text-slate-300">
                      小計：
                      <strong className="text-amber-400 text-sm ml-1 tabular-nums">
                        {formatMoney(inputQty * (parseFloat(item.priceString) || 0))}
                      </strong>
                    </span>
                  )}
                </div>
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
          <span>增加一項出貨商品</span>
        </button>
      </div>

      {/* 備註欄 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl space-y-2">
        <label className="block text-sm font-bold text-slate-300 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-slate-400" />
          出貨備註（選填）
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：自載、下午3點前送達後廚、附手寫估價單..."
          className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-base focus:border-amber-400 placeholder:text-slate-500 font-medium"
        />
      </div>

      {/* 底部確認出貨按鈕；金額功能啟用時才顯示總金額 */}
      <div className="bg-slate-950 border-2 border-amber-500/50 p-5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {enableAmount ? (
          <div className="text-center sm:text-left w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-bold tracking-wider block">
              本單出貨總金額 (NTD)
            </span>
            <div className="text-3xl sm:text-4xl font-black text-amber-400 tabular-nums drop-shadow-md">
              NT$ {summary.totalAmount.toLocaleString('zh-TW')}
            </div>
            {summary.hasStockError && (
              <div className="text-xs text-rose-400 font-bold flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                包含庫存不足品項，請修正後再確認出貨
              </div>
            )}
          </div>
        ) : (
          <div className="text-center sm:text-left w-full sm:w-auto">
            <span className="text-sm text-slate-300 font-bold">
              共 {items.length} 項品項，確認後將直接扣減對應庫位庫存
            </span>
            {summary.hasStockError && (
              <div className="text-xs text-rose-400 font-bold flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                包含庫存不足品項，請修正後再確認出貨
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={summary.hasStockError}
          className={`w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-black tracking-wide shadow-xl transition-all flex items-center justify-center gap-3 min-h-[52px] ${
            summary.hasStockError
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-rose-950/60'
          }`}
        >
          <Check className="w-6 h-6 stroke-[3]" />
          <span>確認出貨扣庫存</span>
        </button>
      </div>
    </form>
  );
};
