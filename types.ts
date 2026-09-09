/**
 * 冷凍庫進銷存管理系統 - 型別定義
 * 適用於台灣台中冷凍食品批發四溫層冷凍庫
 */

export type ProductUnit = '件' | '箱' | '包' | '斤' | '公斤';

export type FreezerLocationId = 'mkt_up' | 'mkt_dn' | 'wh_new' | 'wh_old';

export interface FreezerLocation {
  id: FreezerLocationId;
  group: 'market' | 'warehouse';
  groupName: '市場' | '倉庫';
  name: string;
  shortName: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  headerBg: string;
  dot: string; // 實心色點 / 色塊用的 bg-* class，供自訂庫位選單使用
  description: string;
}

// 四個固定庫位常數陣列，便於日後維護與擴展
export const FREEZER_LOCATIONS: FreezerLocation[] = [
  {
    id: 'mkt_up',
    group: 'market',
    groupName: '市場',
    name: '市場小冷凍庫 上層',
    shortName: '市場上',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    badgeText: 'text-amber-400',
    borderColor: 'border-amber-500',
    headerBg: 'bg-amber-950/40 text-amber-200 border-amber-800/60',
    dot: 'bg-amber-400',
    description: '市場攤位現場快速取貨，擺放主力快銷品上架貨',
  },
  {
    id: 'mkt_dn',
    group: 'market',
    groupName: '市場',
    name: '市場小冷凍庫 下層',
    shortName: '市場下',
    badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
    badgeText: 'text-orange-400',
    borderColor: 'border-orange-500',
    headerBg: 'bg-orange-950/40 text-orange-200 border-orange-800/60',
    dot: 'bg-orange-500',
    description: '市場攤位現場備貨區，較重包裝或當天備貨',
  },
  {
    id: 'wh_new',
    group: 'warehouse',
    groupName: '倉庫',
    name: '倉庫大冷凍庫 新機',
    shortName: '倉庫新',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    badgeText: 'text-sky-400',
    borderColor: 'border-sky-500',
    headerBg: 'bg-sky-950/40 text-sky-200 border-sky-800/60',
    dot: 'bg-sky-400',
    description: '大型主力冷凍主機，新進大批箱裝貨物',
  },
  {
    id: 'wh_old',
    group: 'warehouse',
    groupName: '倉庫',
    name: '倉庫大冷凍庫 舊機',
    shortName: '倉庫舊',
    badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
    badgeText: 'text-indigo-400',
    borderColor: 'border-indigo-500',
    headerBg: 'bg-indigo-950/40 text-indigo-200 border-indigo-800/60',
    dot: 'bg-indigo-500',
    description: '大庫備存調配櫃，舊批號先進先出優先調撥',
  },
];

export interface Product {
  id: string;
  name: string;          // 商品名稱，不可重複
  unit: ProductUnit;     // 單位：件 / 箱 / 包 / 斤 / 公斤
  price: number;         // 預設售價 (新台幣)
  cost: number | null;   // 成本，可為 null
  supplier?: string;     // 常用廠商，可為空
}

// 庫存 stock: { [商品id]: { mkt_up: 數量, mkt_dn: 數量, wh_new: 數量, wh_old: 數量 } }
export type ProductStockMap = Record<FreezerLocationId, number>;
export type AllStock = Record<string, ProductStockMap>;

export type TxnType = 'in' | 'out' | 'move' | 'count';

export interface Txn {
  id: string;
  ts: number;            // 時間戳 (毫秒)
  type: TxnType;         // 'in' 進貨 / 'out' 出貨 / 'move' 調撥 / 'count' 盤點
  ref: string;           // 單號，同一張單的多個品項共用
  pid: string;           // 商品 id
  loc: FreezerLocationId;// 庫位
  toLoc?: FreezerLocationId; // 僅調撥使用，目的庫位
  qty: number;           // 數量（調撥與盤點可為負數或正數）
  price?: number;        // 出貨記單價
  cost?: number | null;  // 當下成本快照，用來算毛利
  party?: string;        // 客戶或廠商名稱
  note?: string;         // 備註
}

export type ActiveTab = 'inventory' | 'inbound' | 'outbound' | 'transfer' | 'count' | 'records' | 'products' | 'settings';

export type UiMode = 'pro' | 'simple';

export interface AppState {
  products: Product[];
  stock: AllStock;
  txns: Txn[];
  enableAmount: boolean; // 是否啟用金額／毛利功能，預設關閉（金額另外計算）
}
