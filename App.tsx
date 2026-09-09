import React, { useState, useEffect, useCallback } from 'react';
import { DB } from './db';
import {
  AppState,
  ActiveTab,
  Product,
  ProductUnit,
  FreezerLocationId,
  Txn,
  AllStock,
  UiMode,
} from './types';
import { generateRef, formatQty, formatMoney, getLocationMeta } from './utils';

import { Header } from './components/Header';
import { SimpleMode } from './components/SimpleMode';
import { InventoryTab } from './components/Tabs/InventoryTab';
import { InboundTab } from './components/Tabs/InboundTab';
import { OutboundTab } from './components/Tabs/OutboundTab';
import { TransferTab } from './components/Tabs/TransferTab';
import { CountTab } from './components/Tabs/CountTab';
import { RecordsTab } from './components/Tabs/RecordsTab';
import { ProductsTab } from './components/Tabs/ProductsTab';
import { SettingsModal } from './components/Tabs/SettingsModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => DB.load());
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');
  const [preselectedProductId, setPreselectedProductId] = useState<string | undefined>();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [uiMode, setUiMode] = useState<UiMode>(() => DB.loadUiMode());

  // 儲存狀態至持久層
  const updateState = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setAppState((prev) => {
        const next = updater(prev);
        DB.save({
          products: next.products,
          stock: next.stock,
          txns: next.txns,
        });
        return next;
      });
    },
    []
  );

  // 顯示 Toast 訊息
  const showToast = useCallback(
    (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info', title?: string) => {
      const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      setToasts((prev) => [...prev, { id, message, type, title }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 從庫存總覽快速點選動作
  const handleQuickAction = (action: 'in' | 'out' | 'move', productId: string) => {
    setPreselectedProductId(productId);
    if (action === 'in') setActiveTab('inbound');
    else if (action === 'out') setActiveTab('outbound');
    else if (action === 'move') setActiveTab('transfer');
  };

  // 切換介面模式（簡易／專業），純裝置端偏好，不影響商品與庫存資料
  const handleSwitchUiMode = (mode: UiMode) => {
    DB.saveUiMode(mode);
    setUiMode(mode);
  };

  // 切換「啟用金額與毛利功能」偏好
  const handleToggleEnableAmount = (val: boolean) => {
    DB.savePref(val);
    setAppState((prev) => ({ ...prev, enableAmount: val }));
  };

  // 1. 執行進貨
  const handleCommitInbound = (data: {
    supplier: string;
    note: string;
    items: {
      productId: string;
      locationId: FreezerLocationId;
      qty: number;
      cost: number | null;
    }[];
  }) => {
    const refCode = generateRef('IN');
    const now = Date.now();
    const newTxns: Txn[] = [];

    updateState((prev) => {
      const nextStock: AllStock = { ...prev.stock };
      const nextProducts: Product[] = [...prev.products];

      data.items.forEach((item) => {
        const prod = nextProducts.find((p) => p.id === item.productId);
        if (!prod) return;

        // 更新庫存
        const currentPStock = nextStock[item.productId]
          ? { ...nextStock[item.productId] }
          : { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };

        currentPStock[item.locationId] = Number(
          ((currentPStock[item.locationId] || 0) + item.qty).toFixed(2)
        );
        nextStock[item.productId] = currentPStock;

        // 若填寫成本，同步更新商品成本
        if (item.cost !== null && item.cost >= 0) {
          prod.cost = item.cost;
        }

        // 寫入異動紀錄
        newTxns.push({
          id: 'tx-' + now + '-' + Math.random().toString(36).slice(2, 6),
          ts: now,
          type: 'in',
          ref: refCode,
          pid: item.productId,
          loc: item.locationId,
          qty: item.qty,
          price: prod.price,
          cost: item.cost,
          party: data.supplier,
          note: data.note,
        });
      });

      return {
        ...prev,
        stock: nextStock,
        products: nextProducts,
        txns: [...newTxns, ...prev.txns],
      };
    });

    showToast(
      `進貨成功！共登記 ${data.items.length} 項商品入庫（單號：${refCode}）`,
      'success',
      '進貨完成'
    );
  };

  // 2. 執行出貨
  const handleCommitOutbound = (data: {
    customer: string;
    note: string;
    items: {
      productId: string;
      locationId: FreezerLocationId;
      qty: number;
      price: number | null;
      cost: number | null;
    }[];
  }) => {
    const refCode = generateRef('OUT');
    const now = Date.now();
    const newTxns: Txn[] = [];
    let totalSale = 0;

    // 先二次確認所有品項庫存足夠
    for (const item of data.items) {
      const pStock = appState.stock[item.productId] || {
        mkt_up: 0,
        mkt_dn: 0,
        wh_new: 0,
        wh_old: 0,
      };
      const available = pStock[item.locationId] || 0;
      const prod = appState.products.find((p) => p.id === item.productId);
      if (item.qty > available) {
        showToast(
          `出貨中斷：商品【${prod?.name}】在庫位只有 ${formatQty(available, prod?.unit)} ${
            prod?.unit
          }，無法出貨！`,
          'error',
          '庫存不足'
        );
        return;
      }
    }

    updateState((prev) => {
      const nextStock: AllStock = { ...prev.stock };

      data.items.forEach((item) => {
        const prod = prev.products.find((p) => p.id === item.productId);
        if (!prod) return;

        if (item.price !== null) {
          totalSale += item.price * item.qty;
        }

        // 扣庫存
        const currentPStock = nextStock[item.productId]
          ? { ...nextStock[item.productId] }
          : { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };

        currentPStock[item.locationId] = Number(
          Math.max(0, (currentPStock[item.locationId] || 0) - item.qty).toFixed(2)
        );
        nextStock[item.productId] = currentPStock;

        // 寫入異動紀錄
        newTxns.push({
          id: 'tx-' + now + '-' + Math.random().toString(36).slice(2, 6),
          ts: now,
          type: 'out',
          ref: refCode,
          pid: item.productId,
          loc: item.locationId,
          qty: item.qty,
          price: item.price ?? undefined,
          cost: item.cost, // 當下成本快照
          party: data.customer,
          note: data.note,
        });
      });

      return {
        ...prev,
        stock: nextStock,
        txns: [...newTxns, ...prev.txns],
      };
    });

    showToast(
      appState.enableAmount
        ? `出貨開單完成！客戶：${data.customer}，總額 ${formatMoney(totalSale)}（單號：${refCode}）`
        : `出貨開單完成！客戶：${data.customer}（單號：${refCode}）`,
      'success',
      '出貨已扣庫存'
    );
  };

  // 3. 執行調撥
  const handleCommitTransfer = (data: {
    productId: string;
    fromLoc: FreezerLocationId;
    toLoc: FreezerLocationId;
    qty: number;
    note: string;
  }) => {
    const refCode = generateRef('MOV');
    const now = Date.now();
    const prod = appState.products.find((p) => p.id === data.productId);
    const fromMeta = getLocationMeta(data.fromLoc);
    const toMeta = getLocationMeta(data.toLoc);

    updateState((prev) => {
      const nextStock: AllStock = { ...prev.stock };
      const currentPStock = nextStock[data.productId]
        ? { ...nextStock[data.productId] }
        : { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };

      // 來源扣除，目的增加，總量嚴格維持不變
      currentPStock[data.fromLoc] = Number(
        Math.max(0, (currentPStock[data.fromLoc] || 0) - data.qty).toFixed(2)
      );
      currentPStock[data.toLoc] = Number(
        ((currentPStock[data.toLoc] || 0) + data.qty).toFixed(2)
      );
      nextStock[data.productId] = currentPStock;

      const newTxn: Txn = {
        id: 'tx-' + now + '-' + Math.random().toString(36).slice(2, 6),
        ts: now,
        type: 'move',
        ref: refCode,
        pid: data.productId,
        loc: data.fromLoc,
        toLoc: data.toLoc,
        qty: data.qty,
        note: data.note,
      };

      return {
        ...prev,
        stock: nextStock,
        txns: [newTxn, ...prev.txns],
      };
    });

    showToast(
      `調撥完成！【${prod?.name}】${formatQty(data.qty, prod?.unit)} ${prod?.unit} 自 ${
        fromMeta.shortName
      } 移至 ${toMeta.shortName}`,
      'success',
      '調撥成功'
    );
  };

  // 4. 執行盤點存檔
  const handleCommitCount = (data: {
    locationId: FreezerLocationId;
    changes: {
      productId: string;
      systemQty: number;
      actualQty: number;
      diff: number;
    }[];
  }) => {
    const locMeta = getLocationMeta(data.locationId);
    const now = Date.now();
    const refCode = generateRef('CNT');
    const newTxns: Txn[] = [];

    updateState((prev) => {
      const nextStock: AllStock = { ...prev.stock };

      data.changes.forEach((c) => {
        const currentPStock = nextStock[c.productId]
          ? { ...nextStock[c.productId] }
          : { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };

        currentPStock[data.locationId] = c.actualQty;
        nextStock[c.productId] = currentPStock;

        newTxns.push({
          id: 'tx-' + now + '-' + Math.random().toString(36).slice(2, 6),
          ts: now,
          type: 'count',
          ref: refCode,
          pid: c.productId,
          loc: data.locationId,
          qty: c.diff,
          note: `盤點更新 (原 ${c.systemQty} -> 實 ${c.actualQty})`,
        });
      });

      return {
        ...prev,
        stock: nextStock,
        txns: [...newTxns, ...prev.txns],
      };
    });

    showToast(
      `【${locMeta.name}】盤點完成存檔！已校正 ${data.changes.length} 項品項差異`,
      'success',
      '盤點已更新'
    );
  };

  // 5a. 簡易模式：直接對某商品在某庫位加減庫存（不記金額，type 沿用 in/out）
  const handleQuickAdjust = (productId: string, locationId: FreezerLocationId, delta: number) => {
    const prod = appState.products.find((p) => p.id === productId);
    if (!prod) return;

    const qty = Math.abs(delta);
    if (qty <= 0) return;

    const pStock = appState.stock[productId] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
    const available = pStock[locationId] || 0;

    if (delta < 0 && qty > available) {
      showToast(
        `【${prod.name}】在【${getLocationMeta(locationId).name}】只剩 ${formatQty(
          available,
          prod.unit
        )} ${prod.unit}，無法再減少`,
        'error'
      );
      return;
    }

    const refCode = generateRef(delta > 0 ? 'IN' : 'OUT');
    const now = Date.now();

    updateState((prev) => {
      const nextStock: AllStock = { ...prev.stock };
      const currentPStock = nextStock[productId]
        ? { ...nextStock[productId] }
        : { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };

      currentPStock[locationId] = Number(
        Math.max(0, (currentPStock[locationId] || 0) + delta).toFixed(2)
      );
      nextStock[productId] = currentPStock;

      const newTxn: Txn = {
        id: 'tx-' + now + '-' + Math.random().toString(36).slice(2, 6),
        ts: now,
        type: delta > 0 ? 'in' : 'out',
        ref: refCode,
        pid: productId,
        loc: locationId,
        qty,
        note: '簡易模式快速調整',
      };

      return {
        ...prev,
        stock: nextStock,
        txns: [newTxn, ...prev.txns],
      };
    });

    const locMeta = getLocationMeta(locationId);
    showToast(
      `【${prod.name}】${locMeta.shortName} ${delta > 0 ? '+' : '−'}${formatQty(qty, prod.unit)} ${prod.unit}`,
      'success'
    );
  };

  // 5b. 簡易模式：快速新增商品（不記價格／成本／廠商，庫存從 0 開始）
  const handleQuickAddProduct = (
    name: string,
    unit: ProductUnit
  ): { success: boolean; error?: string; productId?: string } => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: '請輸入商品名稱' };
    }

    const isDuplicate = appState.products.some((p) => p.name.trim() === trimmed);
    if (isDuplicate) {
      return { success: false, error: `已有相同名稱的商品「${trimmed}」，不可重複命名！` };
    }

    const newId = 'p-' + Date.now();
    const newProduct: Product = {
      id: newId,
      name: trimmed,
      unit,
      price: 0,
      cost: null,
      supplier: undefined,
    };

    updateState((prev) => ({
      ...prev,
      products: [...prev.products, newProduct],
      stock: {
        ...prev.stock,
        [newId]: { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 },
      },
    }));

    showToast(`已新增商品【${trimmed}】，可以開始加減庫存了`, 'success');
    return { success: true, productId: newId };
  };

  // 6. 儲存/新增商品
  const handleSaveProduct = (
    prodData: Omit<Product, 'id'> & { id?: string }
  ): { success: boolean; error?: string } => {
    // 檢查名稱是否重複
    const isDuplicate = appState.products.some(
      (p) => p.name.trim() === prodData.name.trim() && p.id !== prodData.id
    );
    if (isDuplicate) {
      return { success: false, error: `已有相同名稱的商品「${prodData.name}」，不可重複命名！` };
    }

    if (prodData.id) {
      // 編輯商品
      updateState((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === prodData.id
            ? {
                ...p,
                name: prodData.name,
                unit: prodData.unit,
                price: prodData.price,
                cost: prodData.cost,
                supplier: prodData.supplier,
              }
            : p
        ),
      }));
    } else {
      // 新增商品
      const newId = 'p-' + Date.now();
      const newProduct: Product = {
        id: newId,
        name: prodData.name,
        unit: prodData.unit,
        price: prodData.price,
        cost: prodData.cost,
        supplier: prodData.supplier,
      };

      updateState((prev) => ({
        ...prev,
        products: [...prev.products, newProduct],
        stock: {
          ...prev.stock,
          [newId]: { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 },
        },
      }));
    }

    return { success: true };
  };

  // 7. 刪除商品 (有庫存者不可刪除)
  const handleDeleteProduct = (id: string): { success: boolean; error?: string } => {
    const pStock = appState.stock[id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
    const total = pStock.mkt_up + pStock.mkt_dn + pStock.wh_new + pStock.wh_old;

    if (total > 0) {
      return {
        success: false,
        error: '該商品在冷凍櫃中尚有庫存，不可刪除！請先將庫存出貨或盤點歸零。',
      };
    }

    updateState((prev) => {
      const nextStock = { ...prev.stock };
      delete nextStock[id];

      return {
        ...prev,
        products: prev.products.filter((p) => p.id !== id),
        stock: nextStock,
        // 過去異動紀錄妥善保留
      };
    });

    return { success: true };
  };

  // 8. 還原備份狀態
  const handleRestoreState = (newState: AppState) => {
    setAppState(newState);
  };

  // 簡易模式：整個畫面換成極簡的加減庫存介面，不顯示七大分頁
  if (uiMode === 'simple') {
    return (
      <>
        <SimpleMode
          products={appState.products}
          stock={appState.stock}
          txns={appState.txns}
          onAdjust={handleQuickAdjust}
          onQuickAddProduct={handleQuickAddProduct}
          onSwitchToPro={() => handleSwitchUiMode('pro')}
          showToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* 頂部商號導覽列 */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setPreselectedProductId(undefined);
        }}
        productCount={appState.products.length}
        onSwitchToSimple={() => handleSwitchUiMode('simple')}
      />

      {/* 主內容區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5">
        {activeTab === 'inventory' && (
          <InventoryTab
            products={appState.products}
            stock={appState.stock}
            enableAmount={appState.enableAmount}
            onQuickAction={handleQuickAction}
          />
        )}

        {activeTab === 'inbound' && (
          <InboundTab
            products={appState.products}
            stock={appState.stock}
            initialProductId={preselectedProductId}
            enableAmount={appState.enableAmount}
            onCommitInbound={handleCommitInbound}
          />
        )}

        {activeTab === 'outbound' && (
          <OutboundTab
            products={appState.products}
            stock={appState.stock}
            initialProductId={preselectedProductId}
            enableAmount={appState.enableAmount}
            onCommitOutbound={handleCommitOutbound}
            showToast={showToast}
          />
        )}

        {activeTab === 'transfer' && (
          <TransferTab
            products={appState.products}
            stock={appState.stock}
            initialProductId={preselectedProductId}
            onCommitTransfer={handleCommitTransfer}
            showToast={showToast}
          />
        )}

        {activeTab === 'count' && (
          <CountTab
            products={appState.products}
            stock={appState.stock}
            onCommitCount={handleCommitCount}
          />
        )}

        {activeTab === 'records' && (
          <RecordsTab
            txns={appState.txns}
            products={appState.products}
            stock={appState.stock}
            enableAmount={appState.enableAmount}
          />
        )}

        {activeTab === 'products' && (
          <ProductsTab
            products={appState.products}
            stock={appState.stock}
            enableAmount={appState.enableAmount}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            showToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsModal
            appState={appState}
            onRestoreState={handleRestoreState}
            onToggleEnableAmount={handleToggleEnableAmount}
            showToast={showToast}
          />
        )}
      </main>

      {/* 浮動提示 Toast 元件 (非阻斷式提示) */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
