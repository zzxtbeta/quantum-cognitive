import { NavLink } from 'react-router-dom';
import {
  Building2,
  Database,
  FileText,
  Home,
  Layers,
  Radar,
  ScrollText,
  Star,
  Users,
  Zap,
} from 'lucide-react';

const mainNav = [
  { to: '/home', icon: Home, label: '主页' },
  { to: '/signals', icon: Zap, label: '信号流' },
  { to: '/candidates', icon: Building2, label: '公司库' },
  { to: '/emerging-companies', icon: Radar, label: '新玩家雷达' },
  { to: '/researchers', icon: Users, label: '人才库' },
  { to: '/knowledge-map', icon: Layers, label: '知识地图' },
];

const personalNav = [
  { to: '/focus', icon: Star, label: '我的关注' },
  { to: '/notes', icon: FileText, label: '我的笔记' },
  { to: '/knowledge', icon: Database, label: '知识库' },
  { to: '/tool-logs', icon: ScrollText, label: '工具日志' },
];

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-[13px] cursor-pointer transition-all duration-200 group ${
          isActive
            ? 'nav-link-active-bar bg-[rgba(59,130,246,0.12)] text-blue-400'
            : 'text-[#8892aa] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#c8d4f0]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-[#8892aa] group-hover:text-[#c8d4f0]'}`} />
          <span className="tracking-wide">{label}</span>
          {isActive && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside
      className="fixed left-0 w-60 border-r backdrop-blur-xl h-[calc(100vh-4rem)] top-16 overflow-y-auto transition-colors duration-300 flex flex-col"
      style={{ background: 'var(--th-bg-sidebar)', borderColor: 'var(--th-border)' }}
    >
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Layers className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#c8d4f0] tracking-widest uppercase">量子赛道</p>
            <p className="text-[11px] text-[#8892aa] tracking-wide">认知引擎 · Beta</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-2" style={{ height: '1px', background: 'var(--th-border)' }} />

      <nav className="px-3 py-2 space-y-1">
        {mainNav.map((item) => <NavItem key={item.to} {...item} />)}
      </nav>

      <div className="px-5 pt-5 pb-1.5">
        <p className="text-xs text-[#8892aa] uppercase tracking-widest font-semibold">我的工作台</p>
      </div>

      <nav className="px-3 pb-3 space-y-1">
        {personalNav.map((item) => <NavItem key={item.to} {...item} />)}
      </nav>

      <div className="flex-1" />

      <div className="px-4 pb-6">
        <div
          className="border rounded-xl p-4 transition-colors duration-300"
          style={{ borderColor: 'var(--th-border)', background: 'var(--th-bg-elevated)' }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />
            <span className="text-[11px] text-emerald-400 font-semibold">数据实时同步中</span>
          </div>
          <p className="text-[11px] text-[#8892aa] leading-relaxed">多源数据与研究结果持续汇聚到统一工作台。</p>
        </div>
      </div>
    </aside>
  );
}
