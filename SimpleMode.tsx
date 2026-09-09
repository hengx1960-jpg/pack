import React, { useMemo, useState } from 'react';
import {
  Product,
  AllStock,
  Txn,
  FreezerLocationId,
  FREEZER_LOCATIONS,
  ProductUnit,
} from '../types';
import { formatQty, isDecimalUnit, getLocationMeta } from '../utils';
import {
  Search,
  Plus,
  Minus,
  X,
  Check,
  PackagePlus,
  Sparkles,
  Briefcase,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';

interface SimpleModeProps {
  products: Product[];
  stock: AllStock;
  txns: Txn[];
  onAdjust: (productId: string, locationId: FreezerLocationId, delta: number) => void;
  onQuickAddProduct: (
    name: string,
    unit: ProductUnit
  ) => { success: boolean; error?: string; productId?: string };
  onSwitchToPro: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

const ZERO_STOCK = { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
const QUICK_UNITS: ProductUnit[] = ['件', '箱', '包', '斤', '公斤'];

export const SimpleMode: React.FC<SimpleModeProps> = ({
  products,
  stock,
  txns,
  onAdjust,
  onQuickAddProduct,
  onSwitchToPro,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<FreezerLocationId>('mkt_up');
  const [customAmount, setCustomAmount] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState<ProductUnit>('件');

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, searchTerm]);

  const pStock = selectedProduct ? stock[selectedProduct.id] || ZERO_STOCK : ZERO_STOCK;
  const unit = selectedProduct?.unit;
  const allowDecimal = unit ? isDecimalUnit(unit) : false;
  const currentQty = pStock[selectedLocationId] || 0;

  const quickChips = allowDecimal ? [0.5, 1, 5] : [1, 5, 10];

  // 最近 5 筆異動（不分模式，兩邊資料本來就同一份）
  const recentTxns = useMemo(() => {
    return txns.filter((t) => t.type === 'in' || t.type === 'out').slice(0, 5);
  }, [txns]);

  const handlePickProduct = (id: string) => {
    setSelectedProductId(id);
    setCustomAmount('');
  };

  const handleBackToSearch = () => {
    setSelectedProductId(null);
    setSearchTerm('');
    setCustomAmount('');
  };

  const handleChipAdjust = (amount: number) => {
    if (!selectedProduct) return;
    if (amount < 0 && Math.abs(amount) > currentQty) {
      showToast(
        `【${selectedProduct.name}】在【${getLocationMeta(selectedLocationId).name}】只剩 ${formatQty(
          currentQty,
          selectedProduct.unit
        )} ${selectedProduct.unit}，不能再減了`,
        'error'
      );
      return;
    }
    onAdjust(selectedProduct.id, selectedLocationId, amount);
  };

  const handleCustomAdjust = (sign: 1 | -1) => {
    if (!selectedProduct) return;
    const amt = parseFloat(customAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('請先輸入大於 0 的數量', 'warning');
      return;
    }
    const delta = sign * (allowDecimal ? Math.round(amt * 100) / 100 : Math.round(amt));
    if (delta < 0 && Math.abs(delta) > currentQty) {
      showToast(
        `【${selectedProduct.name}】在【${getLocationMeta(selectedLocationId).name}】只剩 ${formatQty(
          currentQty,
          selectedProduct.unit
        )} ${selectedProduct.unit}，不能再減了`,
        'error'
      );
      return;
    }
    onAdjust(selectedProduct.id, selectedLocationId, delta);
    setCustomAmount('');
  };

  const handleQuickAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast('請輸入商品名稱', 'warning');
      return;
    }
    const result = onQuickAddProduct(trimmed, newUnit);
    if (result.success && result.productId) {
      setShowAddForm(false);
      setNewName('');
      setNewUnit('件');
      setSearchTerm('');
      setSelectedProductId(result.productId);
    } else if (result.error) {
      showToast(result.error, 'error');
    }
  };

  const openAddFormWithName = (name: string) => {
    setNewName(name);
    setShowAddForm(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 極簡頂部列 */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black shadow-md shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-tight">簡易模式</h1>
            <p className="text-[11px] text-slate-400 leading-tight">選商品、選庫位、加減量</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSwitchToPro}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors min-h-[40px]"
        >
          <Briefcase className="w-4 h-4" />
          切換專業版
        </button>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-2xl w-full mx-auto pb-10">
        {!selectedProduct ? (
          <>
            {/* 步驟一：搜尋或選擇商品 */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜尋商品名稱..."
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-2xl pl-11 pr-4 py-3.5 text-lg font-bold focus:border-emerald-400 placeholder:text-slate-500 placeholder:font-normal"
              />
            </div>

            {!showAddForm ? (
              <button
                type="button"
                onClick={() => openAddFormWithName(searchTerm)}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500/80 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-emerald-400 font-bold flex items-center justify-center gap-2 transition-all min-h-[52px]"
              >
                <PackagePlus className="w-5 h-5" />
                {searchTerm.trim() ? `找不到？新增商品「${searchTerm.trim()}」` : '新增一個新商品'}
              </button>
            ) : (
              <div className="bg-slate-900 border border-emerald-600/50 rounded-2xl p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
                    <PackagePlus className="w-4 h-4" />
                    快速新增商品
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="商品名稱"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-base font-bold focus:border-emerald-400"
                />
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-1.5">單位</div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_UNITS.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setNewUnit(u)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors min-h-[40px] ${
                          newUnit === u
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  新增並開始調整
                </button>
              </div>
            )}

            {/* 商品清單 */}
            <div className="space-y-1.5 max-h-[52vh] overflow-y-auto pr-0.5">
              {filteredProducts.length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-sm">
                  找不到符合的商品，用上面的按鈕新增一個吧
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const total =
                    (stock[p.id]?.mkt_up || 0) +
                    (stock[p.id]?.mkt_dn || 0) +
                    (stock[p.id]?.wh_new || 0) +
                    (stock[p.id]?.wh_old || 0);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePickProduct(p.id)}
                      className="w-full flex items-center justify-between gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-600/50 rounded-2xl px-4 py-3.5 text-left transition-colors min-h-[60px]"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white text-base truncate">{p.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">單位：{p.unit}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-black text-emerald-400 tabular-nums">
                          {formatQty(total, p.unit)}
                        </div>
                        <div className="text-[10px] text-slate-500">總庫存</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            {/* 目前操作中的商品 */}
            <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3.5">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400 font-bold">目前操作</div>
                <div className="font-black text-white text-lg truncate">{selectedProduct.name}</div>
              </div>
              <button
                type="button"
                onClick={handleBackToSearch}
                className="shrink-0 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-bold transition-colors min-h-[44px]"
              >
                換商品
              </button>
            </div>

            {/* 步驟二：選庫位 */}
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2 px-1">選擇冷凍庫位</div>
              <div className="grid grid-cols-2 gap-2.5">
                {FREEZER_LOCATIONS.map((loc) => {
                  const isSelected = selectedLocationId === loc.id;
                  const qty = pStock[loc.id] || 0;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setSelectedLocationId(loc.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all min-h-[76px] ${
                        isSelected ? loc.badgeBg : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${loc.dot}`} />
                        <span className={`text-xs font-black ${isSelected ? '' : 'text-slate-400'}`}>
                          {loc.groupName}
                        </span>
                      </div>
                      <div className={`font-bold text-sm mt-1 ${isSelected ? '' : 'text-white'}`}>
                        {loc.shortName}
                      </div>
                      <div className={`text-xl font-black tabular-nums mt-1 ${isSelected ? '' : 'text-slate-300'}`}>
                        {formatQty(qty, unit)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 步驟三：加減量 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="text-center">
                <div className="text-xs font-bold text-slate-400">
                  {getLocationMeta(selectedLocationId).name} · 目前庫存
                </div>
                <div className="text-4xl font-black text-white tabular-nums mt-1">
                  {formatQty(currentQty, unit)}
                  <span className="text-lg font-bold text-slate-400 ml-1.5">{unit}</span>
                </div>
              </div>

              {/* 快速加減按鈕 */}
              <div className="grid grid-cols-3 gap-2">
                {quickChips.map((v) => (
                  <button
                    key={`minus-${v}`}
                    type="button"
                    onClick={() => handleChipAdjust(-v)}
                    className="py-3.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 active:bg-rose-800 border border-rose-700/50 text-rose-300 font-black text-lg transition-colors min-h-[52px]"
                  >
                    − {v}
                  </button>
                ))}
                {quickChips.map((v) => (
                  <button
                    key={`plus-${v}`}
                    type="button"
                    onClick={() => handleChipAdjust(v)}
                    className="py-3.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 active:bg-emerald-800 border border-emerald-700/50 text-emerald-300 font-black text-lg transition-colors min-h-[52px]"
                  >
                    + {v}
                  </button>
                ))}
              </div>

              {/* 自訂數量 */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <input
                  type="number"
                  step={allowDecimal ? 'any' : '1'}
                  min="0"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={`輸入其他數量${allowDecimal ? '（可小數）' : ''}`}
                  className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-3 text-base font-bold tabular-nums focus:border-emerald-400 placeholder:font-normal placeholder:text-slate-500 min-w-0"
                />
                <button
                  type="button"
                  onClick={() => handleCustomAdjust(-1)}
                  className="shrink-0 w-14 h-14 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white flex items-center justify-center transition-colors"
                  title="出庫（減少）"
                >
                  <Minus className="w-6 h-6 stroke-[3]" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCustomAdjust(1)}
                  className="shrink-0 w-14 h-14 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center transition-colors"
                  title="進貨（增加）"
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* 最近異動（給即時回饋、兩個模式資料本來就共用一份） */}
        {recentTxns.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-xs font-black text-slate-400 flex items-center gap-1.5 mb-2 px-1">
              <Clock className="w-3.5 h-3.5" />
              最近異動
            </div>
            <div className="space-y-1">
              {recentTxns.map((t) => {
                const prod = products.find((p) => p.id === t.pid);
                const loc = getLocationMeta(t.loc);
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-slate-800/50"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      {t.type === 'in' ? (
                        <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span className="text-slate-200 font-semibold truncate">
                        {prod ? prod.name : '已刪除商品'}
                      </span>
                      <span className="text-slate-500 text-xs shrink-0">{loc.shortName}</span>
                    </span>
                    <span
                      className={`font-black tabular-nums shrink-0 ml-2 ${
                        t.type === 'in' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {t.type === 'in' ? '+' : '−'}
                      {formatQty(Math.abs(t.qty), prod?.unit)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
