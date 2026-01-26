import React from 'react';
import { BarChart3, Settings, Video, FolderKanban, Activity } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const navItems = [
    { id: 'projects', label: '项目管理', sublabel: 'Projects', icon: FolderKanban },
    { id: 'report', label: '归因分析报告', sublabel: 'Report', icon: BarChart3 },
    { id: 'playground', label: '视频素材库', sublabel: 'Library', icon: Video },
    { id: 'settings', label: '系统设置', sublabel: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-10">
      {/* Logo区域 */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">
              Video Analytics
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">内容归因引擎</p>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              currentPage === item.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <item.icon size={18} className={currentPage === item.id ? 'text-white' : 'text-slate-500'} />
            <div className="text-left">
              <div className="font-medium leading-tight">{item.label}</div>
              <div className={`text-[10px] ${currentPage === item.id ? 'text-blue-200' : 'text-slate-600'}`}>
                {item.sublabel}
              </div>
            </div>
          </button>
        ))}
      </nav>

      {/* 底部状态 */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <span>System Online</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
