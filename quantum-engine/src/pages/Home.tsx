import { useNavigate } from 'react-router-dom';
import {
  Zap, Target, Users, Map, Star, FileText,
  Activity, Clock, ArrowRight,
  Flame, Newspaper, BarChart2,
} from 'lucide-react';
import { mockSignals } from '../data/mockData';
import { useAppContext } from '../contexts/AppContext';

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-500',
  mid: 'bg-amber-400',
  low: 'bg-slate-500',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: '高优先',
  mid: '中优先',
  low: '低优先',
};

const quickLinks = [
  {
    to: '/signals',
    icon: Zap,
    label: '信号流',
    desc: '实时追踪量子科技动态',
    color: 'from-amber-500 to-orange-500',
  },
  {
    to: '/candidates',
    icon: Target,
    label: '候选标的',
    desc: 'AI 推荐潜在投资标的',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    to: '/researchers',
    icon: Users,
    label: '人才库',
    desc: '追踪顶尖研究者动向',
    color: 'from-violet-500 to-purple-600',
  },
  {
    to: '/knowledge-map',
    icon: Map,
    label: '知识地图',
    desc: '技术路线全景可视化',
    color: 'from-teal-500 to-emerald-500',
  },
  {
    to: '/focus',
    icon: Star,
    label: '我的关注',
    desc: '个人关注列表与提醒',
    color: 'from-rose-500 to-pink-500',
  },
  {
    to: '/notes',
    icon: FileText,
    label: '我的笔记',
    desc: '投资分析与研究记录',
    color: 'from-slate-500 to-slate-600',
  },
];

function StatCard({
  icon: Icon,
  value,
  label,
  sub,
  color = 'text-blue-400',
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="glass-card rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
        color === 'text-blue-400' ? 'from-blue-500/20 to-indigo-500/10' :
        color === 'text-amber-400' ? 'from-amber-500/20 to-orange-500/10' :
        color === 'text-violet-400' ? 'from-violet-500/20 to-purple-500/10' :
        'from-emerald-500/20 to-teal-500/10'
      } flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#e0e8ff] leading-none mb-1">{value}</p>
        <p className="text-xs text-[#8892aa] font-medium">{label}</p>
        {sub && <p className="text-[10px] text-[#8892aa] mt-0.5 opacity-70">{sub}</p>}
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { focusItems, notes } = useAppContext();

  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const recentSignals = mockSignals.slice(0, 4);
  const highCount = mockSignals.filter((s) => s.priority === 'high').length;

  return (
    <div className="animate-fade-up space-y-8">
      {/* Welcome Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-[#8892aa] tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
            <Activity className="w-3 h-3" /> {dateStr}
          </p>
          <h1 className="font-display text-4xl text-shimmer tracking-widest leading-tight">
            QUANTUM RADAR
          </h1>
          <p className="text-[#8892aa] text-sm mt-1.5">
            量子科技赛道实时认知引擎 · <span className="text-blue-400 font-medium">{highCount} 条高优先信号</span>待处理
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#8892aa]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />
          <span>数据实时同步中</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Zap} value={mockSignals.length} label="信号总数" sub="本周新增 2 条" color="text-amber-400" />
        <StatCard icon={Target} value={3} label="候选标的" sub="AI 推荐跟踪中" color="text-blue-400" />
        <StatCard icon={Star} value={focusItems.length} label="我的关注" sub="有 1 项近期更新" color="text-violet-400" />
        <StatCard icon={FileText} value={notes.length} label="研究笔记" sub="最近编辑 1 天前" color="text-emerald-400" />
      </div>

      {/* Recent Signals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#c8d4f0] flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" /> 最新信号
          </h2>
          <button
            onClick={() => navigate('/signals')}
            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            查看全部 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recentSignals.map((signal) => (
            <div
              key={signal.id}
              onClick={() => navigate('/signals')}
              className="glass-card rounded-xl p-4 cursor-pointer group hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLOR[signal.priority]} bg-opacity-20`}
                        style={{ background: `${signal.priority === 'high' ? 'rgba(239,68,68,0.12)' : signal.priority === 'mid' ? 'rgba(251,191,36,0.12)' : 'rgba(100,116,139,0.12)'}` }}>
                    <span className={`w-1 h-1 rounded-full ${PRIORITY_COLOR[signal.priority]}`} />
                    <span className={signal.priority === 'high' ? 'text-red-400' : signal.priority === 'mid' ? 'text-amber-400' : 'text-slate-400'}>
                      {PRIORITY_LABEL[signal.priority]}
                    </span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(59,130,246,0.08)] text-blue-400 border border-[rgba(59,130,246,0.15)]">
                    {signal.type}
                  </span>
                </div>
                <span className="text-[10px] text-[#8892aa] flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {signal.timestamp}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#e0e8ff] group-hover:text-blue-300 transition-colors leading-snug line-clamp-1">
                {signal.title}
              </h3>
              <p className="text-[11px] text-[#8892aa] mt-1.5 line-clamp-2 leading-relaxed">
                {signal.summary}
              </p>
              <div className="mt-2.5 flex items-center gap-3 text-[10px] text-[#8892aa]">
                <span className="flex items-center gap-1"><Newspaper className="w-3 h-3" />{signal.source}</span>
                {signal.relatedEntities.companies > 0 && (
                  <span className="flex items-center gap-1"><Target className="w-3 h-3" />{signal.relatedEntities.companies} 家公司</span>
                )}
                {signal.relatedEntities.people > 0 && (
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{signal.relatedEntities.people} 位研究者</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-[#c8d4f0]">功能导航</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickLinks.map(({ to, icon: Icon, label, desc, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="glass-card rounded-xl p-4 text-left group hover:border-blue-500/30 transition-all duration-200 hover:scale-[1.01]"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 transition-transform group-hover:scale-105`}>
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <p className="text-sm font-semibold text-[#e0e8ff] mb-0.5 group-hover:text-blue-300 transition-colors">{label}</p>
              <p className="text-[11px] text-[#8892aa] leading-snug">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
