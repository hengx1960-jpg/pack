import React from 'react';
import { ActiveTab } from '../types';
import {
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardCheck,
  FileSpreadsheet,
  Package,
  Settings,
  Flame,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  productCount: number;
  onSwitchToSimple: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  productCount,
  onSwitchToSimple,
}) => {
  const navItems: NavItem[] = [
    { id: 'inventory', label: '庫存總覽', icon: <Boxes className="w-5 h-5" /> },
    { id: 'inbound', label: '進貨登記', icon: <ArrowDownToLine className="w-5 h-5" /> },
    { id: 'outbound', label: '出貨開單', icon: <ArrowUpFromLine className="w-5 h-5" /> },
    { id: 'transfer', label: '庫位調撥', icon: <ArrowLeftRight className="w-5 h-5" /> },
    { id: 'count', label: '分櫃盤點', icon: <ClipboardCheck className="w-5 h-5" /> },
    { id: 'records', label: '紀錄報表', icon: <FileSpreadsheet className="w-5 h-5" /> },
    { id: 'products', label: '商品管理', icon: <Package className="w-5 h-5" /> },
    { id: 'settings', label: '備份設定', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      {/* 頂部商號與系統標題列 */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-xl shadow-md shrink-0 ring-2 ring-amber-400/30">
            恒
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                恒心進出貨系統
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Flame className="w-3 h-3 text-amber-400" /> 台中冷凍批發
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              市場雙層小櫃 (上/下) · 倉庫大冷凍庫 (新/舊機) · 全程實名紀錄
            </p>
          </div>
        </div>

        {/* 右側資訊與快速設定按鈕 */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden xs:block">
            <span className="text-xs text-slate-400 font-semibold block">在庫品項</span>
            <span className="text-sm font-extrabold text-amber-400 tabular-nums">
              {productCount} <span className="text-xs text-slate-300 font-normal">品</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onSwitchToSimple}
            className="p-2 rounded-xl border border-emerald-700/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 hover:text-emerald-200 transition-all flex items-center gap-1.5 text-xs font-bold"
            title="切換到簡易模式（快速加減庫存）"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden md:inline">簡易模式</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
            title="系統設定與資料備份"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline">設定與備份</span>
          </button>
        </div>
      </div>

      {/* 七大主要功能橫向滾動分頁選單 (手機友善，按鈕面積大) */}
      <nav
        aria-label="主要分頁導覽"
        className="max-w-7xl mx-auto px-2 sm:px-6 overflow-x-auto no-scrollbar border-t border-slate-800/80"
      >
        <div className="flex items-center gap-1.5 py-2 min-w-max">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-btn-${item.id}`}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all whitespace-nowrap min-h-[44px] ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-300 font-black'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
