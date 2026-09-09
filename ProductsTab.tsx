import React, { useState } from 'react';
import { Product, ProductUnit, AllStock } from '../../types';
import { formatQty, formatMoney, isDecimalUnit } from '../../utils';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Check,
  X,
  Building2,
  Tag,
  Boxes,
} from 'lucide-react';

interface ProductsTabProps {
  products: Product[];
  stock: AllStock;
  enableAmount: boolean;
  onSaveProduct: (prod: Omit<Product, 'id'> & { id?: string }) => { success: boolean; error?: string };
  onDeleteProduct: (id: string) => { success: boolean; error?: string };
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

const AVAILABLE_UNITS: ProductUnit[] = ['件', '箱', '包', '斤', '公斤'];

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  stock,
  enableAmount,
  onSaveProduct,
  onDeleteProduct,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // 表單狀態
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('包');
  const [priceStr, setPriceStr] = useState('');
  const [costStr, setCostStr] = useState('');
  const [supplier, setSupplier] = useState('');

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setUnit('包');
    setPriceStr('');
    setCostStr('');
    setSupplier('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setUnit(p.unit);
    setPriceStr(p.price.toString());
    setCostStr(p.cost !== null && p.cost !== undefined ? p.cost.toString() : '');
    setSupplier(p.supplier || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('商品名稱不能為空', 'warning');
      return;
    }

    const price = enableAmount ? parseFloat(priceStr) : 0;
    if (enableAmount && (isNaN(price) || price < 0)) {
      showToast('預設售價必須為大於或等於 0 的數字', 'warning');
      return;
    }

    let cost: number | null = null;
    if (enableAmount && costStr.trim()) {
      const parsedCost = parseFloat(costStr);
      if (!isNaN(parsedCost) && parsedCost >= 0) {
        cost = parsedCost;
      }
    }

    const result = onSaveProduct({
      id: editingProduct?.id,
      name: trimmedName,
      unit,
      price,
      cost,
      supplier: supplier.trim() || undefined,
    });

    if (result.success) {
      showToast(editingProduct ? '商品修改已儲存' : '新商品已建立成功', 'success');
      handleCloseModal();
    } else {
      showToast(result.error || '儲存失敗', 'error');
    }
  };

  const handleDelete = (p: Product) => {
    const pStock = stock[p.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
    const total = pStock.mkt_up + pStock.mkt_dn + pStock.wh_new + pStock.wh_old;

    // 還有庫存的商品不能刪除
    if (total > 0) {
      showToast(
        `商品【${p.name}】目前在各冷凍庫中尚有庫存 ${formatQty(total, p.unit)} ${p.unit}，不可刪除！請先將庫存出貨或盤點歸零。`,
        'error'
      );
      return;
    }

    const confirmed = window.confirm(
      `確定要刪除商品【${p.name}】嗎？\n刪除後該商品將不再出現在清單中，但歷史異動明細會妥善保留！`
    );
    if (!confirmed) return;

    const result = onDeleteProduct(p.id);
    if (result.success) {
      showToast(`已刪除商品【${p.name}】`, 'success');
    } else {
      showToast(result.error || '刪除失敗', 'error');
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 頂部操作列 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            商品品項管理 ({products.length} 項)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            設定批發品項名稱、計量單位（斤/公斤支援小數）、預設售價與進階成本
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-950/50 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>新增商品品項</span>
        </button>
      </div>

      {/* 商品列表表格 */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-950/80 text-xs font-bold text-slate-400 border-b border-slate-800">
                <th className="py-3.5 px-4">商品名稱</th>
                <th className="py-3.5 px-3 text-center">計量單位</th>
                {enableAmount && <th className="py-3.5 px-4 text-right">預設批發售價</th>}
                {enableAmount && <th className="py-3.5 px-4 text-right">基準成本</th>}
                <th className="py-3.5 px-4 text-center">目前總庫存</th>
                <th className="py-3.5 px-4">常用供貨商</th>
                <th className="py-3.5 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={enableAmount ? 7 : 5} className="py-12 text-center text-slate-500">
                    尚無商品，請點選上方「新增商品品項」
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const pStock = stock[p.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
                  const total = pStock.mkt_up + pStock.mkt_dn + pStock.wh_new + pStock.wh_old;
                  const isDecimal = isDecimalUnit(p.unit);

                  return (
                    <tr key={p.id} className="hover:bg-slate-850/50 transition-colors">
                      {/* 名稱 */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-base leading-snug">{p.name}</div>
                      </td>

                      {/* 單位 */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            isDecimal
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-600/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {p.unit}
                          {isDecimal && ' (小數)'}
                        </span>
                      </td>

                      {/* 售價 */}
                      {enableAmount && (
                        <td className="py-3.5 px-4 text-right tabular-nums">
                          <span className="text-base font-extrabold text-amber-400">
                            {formatMoney(p.price)}
                          </span>
                        </td>
                      )}

                      {/* 成本 */}
                      {enableAmount && (
                        <td className="py-3.5 px-4 text-right tabular-nums">
                          <span className="text-sm font-semibold text-slate-300">
                            {p.cost !== null && p.cost !== undefined ? formatMoney(p.cost) : '—'}
                          </span>
                        </td>
                      )}

                      {/* 總庫存 */}
                      <td className="py-3.5 px-4 text-center tabular-nums">
                        <span
                          className={`text-base font-black ${
                            total > 0 ? 'text-white' : 'text-rose-400 font-bold'
                          }`}
                        >
                          {formatQty(total, p.unit)}
                        </span>{' '}
                        <span className="text-xs text-slate-500">{p.unit}</span>
                      </td>

                      {/* 供貨商 */}
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {p.supplier || <span className="text-slate-600">—</span>}
                      </td>

                      {/* 操作按鈕 */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
                            title="編輯商品"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 border border-rose-800/40 text-xs font-bold transition-colors"
                            title={total > 0 ? '尚有庫存不能刪除' : '刪除商品'}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* 新增/編輯 Modal 彈跳視窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal 標題列 */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-400" />
                {editingProduct ? `編輯商品：${editingProduct.name}` : '新增商品品項'}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal 表單 */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* 商品名稱 */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">
                  商品名稱 <span className="text-rose-400">* (不可重複)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：急凍草蝦、澎湖純花枝丸、美國牛小排..."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-base font-bold focus:border-amber-400"
                  required
                />
              </div>

              {/* 單位與小數規則說明 */}
              <div className={`grid grid-cols-1 ${enableAmount ? 'sm:grid-cols-2' : ''} gap-3`}>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">
                    計量單位 <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as ProductUnit)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-base font-bold focus:border-amber-400"
                  >
                    {AVAILABLE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u} {isDecimalUnit(u) ? '(允許小數)' : '(整數)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 售價 */}
                {enableAmount && (
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">
                      預設批發售價 (NT$) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={priceStr}
                      onChange={(e) => setPriceStr(e.target.value)}
                      placeholder="例如 350"
                      className="w-full bg-slate-950 border border-slate-700 text-amber-300 rounded-xl px-3.5 py-2.5 text-base font-bold tabular-nums focus:border-amber-400"
                      required
                    />
                  </div>
                )}
              </div>

              {/* 單位規則提示 */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>單位自動判斷規則</strong>：選擇「斤」或「公斤」時，進出貨與盤點數量允許輸入小數點（例如 2.5 斤）；選擇「件／箱／包」時嚴格限制整數。
                </span>
              </div>

              {/* 基準成本 (選填，僅在啟用金額功能時顯示) */}
              {enableAmount && (
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">
                    基準成本 (NT$) <span className="text-slate-500 font-normal">(選填，用於毛利計算)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={costStr}
                    onChange={(e) => setCostStr(e.target.value)}
                    placeholder="留空代表尚未設定成本"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-base font-bold tabular-nums focus:border-amber-400"
                  />
                </div>
              )}

              {/* 常用供貨廠商 */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">
                  常用供貨廠商 <span className="text-slate-500 font-normal">(選填)</span>
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="例如：東港水產、美福肉品、基隆崁仔頂漁行..."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-base font-medium focus:border-amber-400"
                />
              </div>

              {/* Modal 按鈕 */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-1.5 shadow-md shadow-amber-950/50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingProduct ? '儲存變更' : '確認新增'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
