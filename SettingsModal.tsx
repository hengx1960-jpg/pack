import React, { useRef } from 'react';
import { DB } from '../../db';
import { AppState, FREEZER_LOCATIONS } from '../../types';
import {
  Settings,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  Store,
  Warehouse,
  Info,
  CheckCircle2,
  FileCode,
  DollarSign,
} from 'lucide-react';

interface SettingsModalProps {
  appState: AppState;
  onRestoreState: (newState: AppState) => void;
  onToggleEnableAmount: (val: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  appState,
  onRestoreState,
  onToggleEnableAmount,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 下載備份 JSON
  const handleDownloadBackup = () => {
    const jsonStr = DB.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const nowStr = new Date().toISOString().slice(0, 10);
    link.download = `Allen冷凍進銷存_備份檔_${nowStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('備份檔 (JSON) 下載成功！', 'success');
  };

  // 2. 上傳並還原備份 JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!window.confirm('確定要還原此備份檔案嗎？現有資料將會被完全覆蓋！')) {
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const restored = DB.importJson(text);
        onRestoreState(restored);
        showToast('資料已成功從備份檔案還原！', 'success');
      } catch (err: any) {
        showToast(`還原失敗：${err?.message || '備份格式不正確'}`, 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // 3. 清空所有資料
  const handleClearAll = () => {
    const step1 = window.confirm('【警告】確定要清空所有資料嗎？這將刪除所有商品清單、庫存與異動紀錄！');
    if (!step1) return;

    const step2 = window.confirm('【二次確認】此操作完全不可逆！請再次確認是否真的要清空所有資料？');
    if (!step2) return;

    DB.clear();
    const emptyState: AppState = {
      products: [],
      stock: {},
      txns: [],
      enableAmount: false,
    };
    DB.save(emptyState);
    onRestoreState(emptyState);
    showToast('所有資料已成功清空', 'info');
  };

  // 4. 重設回預設示範資料
  const handleResetDemo = () => {
    if (
      !window.confirm('確定要載入示範資料嗎？現有資料將會被取代（僅供參考格式用，示範資料只有一項商品）。')
    ) {
      return;
    }
    const demo = DB.resetToDemo();
    onRestoreState(demo);
    showToast('已載入示範資料（1 項商品，四個庫位各有庫存）', 'success');
  };

  // 5. 下載單檔離線 HTML
  const handleDownloadOfflineHtml = () => {
    const backupJson = DB.exportJson();
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>恒心進出貨系統 (離線單檔版)</title>
  <meta name="theme-color" content="#0f172a">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;600;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: '#f59e0b',
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Noto Sans TC', system-ui, sans-serif; }
    * { font-variant-numeric: tabular-nums; }
    input, select, textarea, button { font-size: 16px !important; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <div class="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
    <header class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center">A</div>
        <div>
          <h1 class="text-xl font-black text-white">恒心進出貨系統</h1>
          <p class="text-xs text-slate-400">台中冷凍食品批發 · 離線單檔便攜版</p>
        </div>
      </div>
      <div class="text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
        免安裝 · 離線可用
      </div>
    </header>

    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-sm space-y-2">
      <div class="font-bold text-amber-400">【離線資料狀態】</div>
      <p class="text-slate-300">本離線檔案已內嵌下載當下的最新庫存與商品資料。您亦可直接於瀏覽器隨時雙擊本檔案開啟使用，資料異動會同步存在此瀏覽器的本機快取中。</p>
      <div class="pt-2 flex gap-2">
        <button onclick="localStorage.setItem('allen_cold_storage_v1', JSON.stringify(embeddedData)); location.reload();" class="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs">
          載入內嵌初始資料
        </button>
      </div>
    </div>

    <!-- 庫存表格預覽 -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="p-3 bg-slate-950 font-black text-sm text-slate-200">當前庫存現況快速預覽</div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm" id="offline-stock-table">
          <thead>
            <tr class="bg-slate-950/60 text-xs text-slate-400 border-b border-slate-800">
              <th class="p-3">商品名稱</th>
              <th class="p-3 text-center">市場上層</th>
              <th class="p-3 text-center">市場下層</th>
              <th class="p-3 text-center">倉庫新機</th>
              <th class="p-3 text-center">倉庫舊機</th>
              <th class="p-3 text-center text-amber-400 font-bold">總庫存</th>
            </tr>
          </thead>
          <tbody id="offline-stock-tbody" class="divide-y divide-slate-800 font-medium"></tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    const embeddedData = ${backupJson};
    const currentData = JSON.parse(localStorage.getItem('allen_cold_storage_v1') || JSON.stringify(embeddedData));
    const tbody = document.getElementById('offline-stock-tbody');
    
    currentData.products.forEach(p => {
      const s = currentData.stock[p.id] || { mkt_up: 0, mkt_dn: 0, wh_new: 0, wh_old: 0 };
      const total = s.mkt_up + s.mkt_dn + s.wh_new + s.wh_old;
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/40';
      tr.innerHTML = \`
        <td class="p-3 font-bold text-white">\${p.name} <span class="text-xs text-slate-400 font-normal">(\${p.unit})</span></td>
        <td class="p-3 text-center text-amber-300 font-bold">\${s.mkt_up}</td>
        <td class="p-3 text-center text-orange-300 font-bold">\${s.mkt_dn}</td>
        <td class="p-3 text-center text-sky-300 font-bold">\${s.wh_new}</td>
        <td class="p-3 text-center text-indigo-300 font-bold">\${s.wh_old}</td>
        <td class="p-3 text-center text-base font-black text-amber-400">\${total} \${p.unit}</td>
      \`;
      tbody.appendChild(tr);
    });
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `恒心_進出貨系統_離線單檔_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('單檔離線 HTML 下載完成，任何電腦雙擊即可開啟！', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* 標題 */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-md">
        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-400" />
          系統設定、資料備份與四溫層說明
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
          資料目前安全持久化儲存於瀏覽器 LocalStorage；隨時可下載離線 JSON 備份或轉移設備
        </p>
      </div>

      {/* 資料備份與還原功能區 */}
      <div className="bg-slate-900/95 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <h3 className="text-base font-black text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-400" />
          資料安全備份與跨裝置轉移
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* 下載備份 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-white text-sm">下載完整備份檔 (JSON)</h4>
              <p className="text-xs text-slate-400 mt-1">
                將全部商品資料、當前四冷凍櫃庫存及所有異動明細導出為單一備份檔案。
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="mt-3 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow transition-all min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              下載備份檔 (JSON)
            </button>
          </div>

          {/* 還原備份 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-white text-sm">還原備份檔 (JSON)</h4>
              <p className="text-xs text-slate-400 mt-1">
                選擇過往下載的 JSON 備份檔，即可在不同手機或電腦上完整復原資料。
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="restore-json-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow transition-all min-h-[44px]"
              >
                <Upload className="w-4 h-4" />
                選擇檔案並還原
              </button>
            </div>
          </div>

          {/* 下載單檔離線 HTML */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-white text-sm">下載單檔離線 HTML</h4>
              <p className="text-xs text-slate-400 mt-1">
                導出單一免伺服器 HTML 檔，任何電腦雙擊瀏覽器即可直接執行開單與查庫存。
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadOfflineHtml}
              className="mt-3 w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow transition-all min-h-[44px]"
            >
              <FileCode className="w-4 h-4" />
              下載離線單檔 HTML
            </button>
          </div>
        </div>

        {/* 示範資料重設與清空 */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDemo}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-black flex items-center justify-center gap-2 transition-all min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            載入示範資料 (1 項商品範例)
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/50 text-xs font-black flex items-center justify-center gap-2 transition-all min-h-[44px]"
          >
            <Trash2 className="w-4 h-4" />
            清空所有資料 (二次確認)
          </button>
        </div>
      </div>

      {/* 金額與毛利功能開關 */}
      <div className="bg-slate-900/95 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
        <h3 className="text-base font-black text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-400" />
          金額與毛利功能
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          預設關閉，因為金額是另外計算的。關閉時，出貨開單不會出現單價欄位，商品也不用填售價／成本，紀錄頁也不會顯示營業額與毛利。
          如果之後想在系統內直接記單價、算毛利，打開這個開關即可，不會影響現有的商品與庫存資料。
        </p>
        <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={appState.enableAmount}
            onChange={(e) => onToggleEnableAmount(e.target.checked)}
            className="w-5 h-5 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
          />
          <span className="text-sm font-bold text-slate-200">
            啟用金額與毛利功能（出貨記單價、商品記售價／成本、紀錄頁顯示營業額與毛利）
          </span>
        </label>
      </div>

      {/* 四個冷凍庫位配置解說 */}
      <div className="bg-slate-900/95 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <h3 className="text-base font-black text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400" />
          四溫層冷凍庫位定位與先進先出 (FIFO) 運作指引
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* 市場組 */}
          <div className="p-4 rounded-xl bg-amber-950/15 border border-amber-500/40 space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/50">
                <Store className="w-4 h-4" />
              </span>
              <span className="font-black text-base text-amber-300">
                市場攤位現場組（暖橘琥珀色標示）
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              位於台中市場營業現場，空間精巧，主要供現場批發交貨與零碎取貨。
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-900/90 border border-amber-900/30">
                <div className="font-bold text-amber-300">mkt_up · 小冷凍庫 上層</div>
                <div className="text-slate-400 mt-0.5">主力快銷品常備上架貨，方便單手快速提取出貨。</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/90 border border-amber-900/30">
                <div className="font-bold text-orange-300">mkt_dn · 小冷凍庫 下層</div>
                <div className="text-slate-400 mt-0.5">現場備份囤貨區，較大包裝或當天自載批發備用。</div>
              </div>
            </div>
          </div>

          {/* 倉庫組 */}
          <div className="p-4 rounded-xl bg-sky-950/15 border border-sky-500/40 space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/50">
                <Warehouse className="w-4 h-4" />
              </span>
              <span className="font-black text-base text-sky-300">
                後勤主倉庫組（冰川湛藍色標示）
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              位於批發倉庫或冷鏈物流中心，容積龐大，供大宗整箱入庫與批次進貨存儲。
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-900/90 border border-sky-900/30">
                <div className="font-bold text-sky-300">wh_new · 大冷凍庫 新機</div>
                <div className="text-slate-400 mt-0.5">進口原箱與新進貨主力櫃，溫度穩定強勁。</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/90 border border-indigo-900/30">
                <div className="font-bold text-indigo-300">wh_old · 大冷凍庫 舊機</div>
                <div className="text-slate-400 mt-0.5">
                  過渡與先期批號庫，調撥時預設從此機調出至市場上層（貫徹先進先出 FIFO）。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 開發架構與升級說明 */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-300">
          <FileCode className="w-4 h-4 text-slate-400" />
          架構升級說明：獨立資料存取層 (DB Layer)
        </div>
        <p className="leading-relaxed">
          系統資料層已嚴格封裝於 <code className="text-amber-400 font-mono">DB.load()</code> 與{' '}
          <code className="text-amber-400 font-mono">DB.save()</code>，目前採用高相容性 LocalStorage
          運作。日後若欲導入 Supabase 或雲端 PostgreSQL 達成多人即時共用，僅需抽換該層實作，上層 UI
          元件與全部業務邏輯均可零修改無痛對接！
        </p>
      </div>
    </div>
  );
};
