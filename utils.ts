import { Product, ProductUnit, FreezerLocationId, FREEZER_LOCATIONS, Txn, AllStock } from './types';

/**
 * 判斷商品單位是否允許小數
 * 規則：斤、公斤允許小數；件、箱、包嚴格限整數
 */
export function isDecimalUnit(unit: ProductUnit): boolean {
  return unit === '斤' || unit === '公斤';
}

/**
 * 格式化數量顯示
 * 若允許小數：最多小數點後兩位，去掉尾數 0（例：2.50 -> 2.5, 3.00 -> 3）
 * 若不允許小數：強制整數顯示
 */
export function formatQty(qty: number, unit?: ProductUnit): string {
  if (qty === undefined || qty === null || isNaN(qty)) return '0';
  if (unit && !isDecimalUnit(unit)) {
    return Math.round(qty).toString();
  }
  // 小數處理：四捨五入到第二位，轉數字自動去除尾數 0
  const fixed = Number(Math.round(Number(qty + 'e+2')) + 'e-2');
  return fixed.toString();
}

/**
 * 解析使用者輸入數量
 */
export function parseQtyInput(val: string, unit: ProductUnit): number {
  const trimmed = val.trim();
  if (!trimmed) return 0;
  if (isDecimalUnit(unit)) {
    const num = parseFloat(trimmed);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }
  const num = parseInt(trimmed, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * 金額格式化 (新台幣 NT$)
 */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return 'NT$ ' + Math.round(amount).toLocaleString('zh-TW');
}

/**
 * 純數字金額格式化 (不帶 NT$)
 */
export function formatNumber(amount: number): string {
  return Math.round(amount).toLocaleString('zh-TW');
}

/**
 * HTML Escape 避免特殊字元破損畫面
 */
export function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 取得本地台灣日期字串 (YYYY-MM-DD)
 * 絕對不使用 toISOString() 以避免 UTC 8小時時差！
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 判斷是否為今日（以本地時間計算）
 */
export function isToday(ts: number): boolean {
  return getLocalDateString(new Date(ts)) === getLocalDateString(new Date());
}

/**
 * 判斷是否為本月（以本地時間計算）
 */
export function isThisMonth(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/**
 * 格式化時間戳為本地台灣時間字串
 */
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化精簡時間 (MM/DD HH:mm)
 */
export function formatShortDateTime(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

/**
 * 產生單號 (例如 IN-20260903-XXXX)
 */
export function generateRef(prefix: 'IN' | 'OUT' | 'MOV' | 'CNT'): string {
  const d = new Date();
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

/**
 * 依庫位 ID 獲取庫位資訊
 */
export function getLocationMeta(locId: FreezerLocationId) {
  return FREEZER_LOCATIONS.find((l) => l.id === locId) || FREEZER_LOCATIONS[0];
}

/**
 * 匯出 CSV，包含異動明細與當前庫存現況
 * 必須加上 UTF-8 BOM (\uFEFF)，確保 Windows Excel 開啟不會亂碼
 */
export function exportToCSV(
  txns: Txn[],
  products: Product[],
  stock: AllStock
): void {
  const prodMap = new Map<string, Product>();
  products.forEach((p) => prodMap.set(p.id, p));

  const lines: string[] = [];

  // 1. 異動紀錄標題與資料
  lines.push('【恒心冷凍食品批發進出貨與庫存系統 - 異動明細表】');
  lines.push(`匯出時間,${formatDateTime(Date.now())}`);
  lines.push('');
  lines.push('時間,單號,類型,商品名稱,單位,來源/目標庫位,數量,單價(NT$),成本快照(NT$),總金額(NT$),客戶/廠商,備註');

  const typeLabels: Record<string, string> = {
    in: '進貨',
    out: '出貨',
    move: '調撥',
    count: '盤點',
  };

  txns.forEach((t) => {
    const prod = prodMap.get(t.pid);
    const prodName = prod ? prod.name : `已刪除商品(${t.pid})`;
    const unit = prod ? prod.unit : '件';
    const locName = getLocationMeta(t.loc).name;
    const toLocName = t.toLoc ? getLocationMeta(t.toLoc).name : '';
    const locDisplay = t.type === 'move' ? `${locName} -> ${toLocName}` : locName;
    const sign = t.type === 'in' ? '+' : t.type === 'out' ? '-' : '';
    const qtyStr = `${sign}${formatQty(t.qty, unit)}`;
    const priceStr = t.price !== undefined ? t.price.toString() : '';
    const costStr = t.cost !== undefined && t.cost !== null ? t.cost.toString() : '';
    const totalAmount = t.price !== undefined ? Math.round(t.price * Math.abs(t.qty)).toString() : '';

    const row = [
      `"${formatDateTime(t.ts)}"`,
      `"${t.ref || ''}"`,
      `"${typeLabels[t.type] || t.type}"`,
      `"${prodName.replace(/"/g, '""')}"`,
      `"${unit}"`,
      `"${locDisplay}"`,
      `"${qtyStr}"`,
      `"${priceStr}"`,
      `"${costStr}"`,
      `"${totalAmount}"`,
      `"${(t.party || '').replace(/"/g, '""')}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ];
    lines.push(row.join(','));
  });

  lines.push('');
  lines.push('');
  // 2. 附上目前的庫存現況表
  lines.push('【當前各庫位庫存現況表】');
  lines.push('商品編號,商品名稱,單位,預設售價(NT$),成本(NT$),市場上層,市場下層,倉庫新機,倉庫舊機,總量');

  products.forEach((p) => {
    const pStock = stock[p.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
    const total = pStock.mkt_up + pStock.mkt_dn + pStock.wh_new + pStock.wh_old;
    const row = [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.unit}"`,
      `"${p.price}"`,
      `"${p.cost !== null && p.cost !== undefined ? p.cost : ''}"`,
      `"${formatQty(pStock.mkt_up, p.unit)}"`,
      `"${formatQty(pStock.mkt_dn, p.unit)}"`,
      `"${formatQty(pStock.wh_new, p.unit)}"`,
      `"${formatQty(pStock.wh_old, p.unit)}"`,
      `"${formatQty(total, p.unit)}"`,
    ];
    lines.push(row.join(','));
  });

  // UTF-8 BOM 必須加在最前面
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `冷凍庫進銷存報表_${getLocalDateString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
