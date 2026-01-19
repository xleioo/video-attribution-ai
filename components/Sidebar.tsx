import React from 'react';
import { LayoutDashboard, BarChart3, Settings, Video, FileInput, FolderKanban } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', label: '工作台 (Dashboard)', icon: LayoutDashboard },
    { id: 'projects', label: '项目管理 (Projects)', icon: FolderKanban },
    { id: 'report', label: '归因分析报告 (Report)', icon: BarChart3 },
    { id: 'playground', label: '视频素材库 (Library)', icon: Video },
    { id: 'settings', label: '系统设置 (Settings)', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-10 shadow-xl">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Elixir AI Analytics
        </h1>
        <p className="text-xs text-slate-400 mt-1">V面霜内容归因引擎</p>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              currentPage === item.id
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          System Status: Online
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
