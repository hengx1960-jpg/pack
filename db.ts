/**
 * ============================================================================
 * 資料持久化層 (Database Layer)
 * ============================================================================
 * 目前實作：本機 LocalStorage 儲存
 * 
 * 💡【未來升級 Supabase / 雲端資料庫說明】：
 * 當日後需升級至 Supabase 或其他後端資料庫以支援多人連線與即時同步時，
 * 僅需替換此檔案中的 DB.load() 與 DB.save() 函式實作，回傳 Promise 或非同步呼叫，
 * 上層所有畫面元件與業務邏輯完全無須修改！
 * ============================================================================
 */

import { AppState, Product, AllStock, Txn, UiMode } from './types';

const STORAGE_KEY = 'allen_cold_storage_v1';
const ENABLE_AMOUNT_KEY = 'allen_enable_amount_pref';
const UI_MODE_KEY = 'allen_ui_mode_pref';

// 預設示範資料 (每一種只保留一筆，做為介面範例)
export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', name: '急凍特級白蝦(30/40)', unit: '箱', price: 1800, cost: 1450, supplier: '東港海產批發' },
];

export const DEFAULT_STOCK: AllStock = {
  p1: { mkt_up: 4, mkt_dn: 6, wh_new: 20, wh_old: 15 },
};

export const DEFAULT_TXNS: Txn[] = [
  {
    id: 'tx-init-1',
    ts: Date.now() - 1000 * 60 * 60 * 3, // 3 小時前
    type: 'in',
    ref: 'IN-INIT-001',
    pid: 'p1',
    loc: 'wh_new',
    qty: 20,
    price: 1800,
    cost: 1450,
    party: '東港海產批發',
    note: '新船到港大進貨',
  },
];

export const DB = {
  /**
   * 載入完整應用程式狀態
   */
  load(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const prefRaw = localStorage.getItem(ENABLE_AMOUNT_KEY);
      const enableAmount = prefRaw === 'true';

      if (!raw) {
        // 第一次使用時載入示範預設資料
        return {
          products: DEFAULT_PRODUCTS,
          stock: DEFAULT_STOCK,
          txns: DEFAULT_TXNS,
          enableAmount,
        };
      }

      const parsed = JSON.parse(raw);
      return {
        products: Array.isArray(parsed.products) ? parsed.products : DEFAULT_PRODUCTS,
        stock: parsed.stock || DEFAULT_STOCK,
        txns: Array.isArray(parsed.txns) ? parsed.txns : DEFAULT_TXNS,
        enableAmount,
      };
    } catch (err) {
      console.error('DB.load 發生錯誤，退回預設資料', err);
      return {
        products: DEFAULT_PRODUCTS,
        stock: DEFAULT_STOCK,
        txns: DEFAULT_TXNS,
        enableAmount: false,
      };
    }
  },

  /**
   * 儲存應用程式狀態
   */
  save(state: Pick<AppState, 'products' | 'stock' | 'txns'>): void {
    try {
      const payload = {
        products: state.products,
        stock: state.stock,
        txns: state.txns,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error('DB.save 發生錯誤', err);
    }
  },

  /**
   * 儲存「啟用金額與毛利功能」偏好設定
   */
  savePref(enableAmount: boolean): void {
    try {
      localStorage.setItem(ENABLE_AMOUNT_KEY, enableAmount ? 'true' : 'false');
    } catch (e) {
      console.error('savePref error', e);
    }
  },

  /**
   * 讀取「介面模式」偏好（簡易 / 專業）。
   * 這個偏好刻意不放進 AppState／備份 JSON 裡：它是「這台裝置習慣用哪個模式」，
   * 不是商品或庫存這種要跨裝置同步的資料（例如市場攤位的平板固定用簡易模式，
   * 辦公室電腦固定用專業模式，兩邊資料一樣但介面各自習慣）。
   */
  loadUiMode(): UiMode {
    try {
      return localStorage.getItem(UI_MODE_KEY) === 'pro' ? 'pro' : 'simple';
    } catch {
      return 'simple';
    }
  },

  saveUiMode(mode: UiMode): void {
    try {
      localStorage.setItem(UI_MODE_KEY, mode);
    } catch (e) {
      console.error('saveUiMode error', e);
    }
  },

  /**
   * 匯出所有資料為 JSON 字串
   */
  exportJson(): string {
    const data = this.load();
    return JSON.stringify(data, null, 2);
  },

  /**
   * 從 JSON 字串匯入資料
   */
  importJson(jsonString: string): AppState {
    const parsed = JSON.parse(jsonString);
    if (!parsed.products || !parsed.stock || !parsed.txns) {
      throw new Error('備份檔案格式不正確，缺少必要資料欄位');
    }
    this.save({
      products: parsed.products,
      stock: parsed.stock,
      txns: parsed.txns,
    });
    return this.load();
  },

  /**
   * 清空所有本機資料並重設
   */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ENABLE_AMOUNT_KEY);
  },

  /**
   * 重設回示範資料
   */
  resetToDemo(): AppState {
    const demo: AppState = {
      products: DEFAULT_PRODUCTS,
      stock: DEFAULT_STOCK,
      txns: DEFAULT_TXNS,
      enableAmount: false,
    };
    this.save(demo);
    return demo;
  },
};
