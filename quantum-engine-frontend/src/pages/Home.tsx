import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart2,
  BookText,
  Building2,
  Clock,
  Database,
  FileText,
  Flame,
  Layers,
  Newspaper,
  Users,
  Zap,
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { signalApi } from '../api/signals';
import { fetchCompanies } from '../api/companies';
import { fetchKnowledgeCategories } from '../api/knowledge';
import { newsApi } from '../api/news';
import { fetchLatestCompanyPromotions, type EmergingCompanySignal } from '../api/companySignals';
import type { Signal } from '../types';

const PRIORITY_TONE: Record<string, string> = {
  high: 'text-red-500 bg-red-500/10 border-red-500/20',
  mid: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const quickLinks = [
  {
    to: '/signals',
    icon: Zap,
    label: '信号流',
    desc: '实时追踪量子科技新闻、融资与技术动态',
    accent: 'from-amber-500 to-orange-500',
  },
  {
    to: '/candidates',
    icon: Building2,
    label: '公司库',
    desc: '浏览量子赛道公司、区域分布与注册信息',
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    to: '/emerging-companies',
    icon: Building2,
    label: '新玩家雷达',
    desc: '近三个月注册且近期被报道的公司信号',
    accent: 'from-emerald-500 to-lime-500',
  },
  {
    to: '/researchers',
    icon: Users,
    label: '人才库',
    desc: '追踪核心研究者、团队流动与机构关系',
    accent: 'from-violet-500 to-purple-600',
  },
  {
    to: '/knowledge',
    icon: Database,
    label: '知识库',
    desc: '管理多 Agent 研究报告与沉淀文档',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    to: '/knowledge-map',
    icon: Layers,
    label: '知识地图',
    desc: '从结构化视角理解技术脉络与实体关系',
    accent: 'from-teal-500 to-cyan-500',
  },
  {
    to: '/notes',
    icon: FileText,
    label: '研究笔记',
    desc: '查看个人笔记与投资判断沉淀',
    accent: 'from-slate-500 to-slate-700',
  },
];

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  return `${Math.floor(days / 30)} 个月前`;
}

function StatCard({
  icon: Icon,
  value,
  label,
  sub,
  tone,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  sub: string;
  tone: 'amber' | 'blue' | 'emerald' | 'violet';
}) {
  const toneMap = {
    amber: ['from-amber-500/20 to-orange-500/10', 'text-amber-500'],
    blue: ['from-blue-500/20 to-cyan-500/10', 'text-blue-500'],
    emerald: ['from-emerald-500/20 to-teal-500/10', 'text-emerald-500'],
    violet: ['from-violet-500/20 to-purple-500/10', 'text-violet-500'],
  } as const;

  return (
    <div className="glass-card rounded-2xl p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${toneMap[tone][0]} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${toneMap[tone][1]}`} />
      </div>
      <div className="min-w-0">
        <p className="text-3xl font-bold text-[#e0e8ff] leading-none">{value}</p>
        <p className="text-sm text-[#c8d4f0] mt-1">{label}</p>
        <p className="text-[11px] text-[#8892aa] mt-1">{sub}</p>
      </div>
    </div>
  );
}

function EmergingSignalCard({ item }: { item: EmergingCompanySignal }) {
  return (
    <button
      onClick={() => window.open(item.latestNewsUrl || '', '_blank', 'noopener,noreferrer')}
      disabled={!item.latestNewsUrl}
      className="glass-card rounded-2xl p-4 text-left disabled:cursor-default"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#e0e8ff]">{item.companyName}</p>
          <p className="text-[11px] text-[#8892aa] mt-1">
            {[item.province, item.city].filter(Boolean).join(' / ') || '地区待补充'}
          </p>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-300/30 bg-emerald-400/10 text-emerald-300">
          {item.newsCount || 0} 条报道
        </span>
      </div>

      {item.latestNewsTitle && (
        <p className="text-[12px] text-[#c8d4f0] mt-3 leading-relaxed line-clamp-2">
          {item.latestNewsTitle}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#8892aa]">
        {item.promotedAt && <span>入库 {item.promotedAt.slice(0, 10)}</span>}
        {item.latestNewsDate && (
          <span className="flex items-center gap-1">
            <Newspaper className="w-3 h-3" />
            {item.latestNewsDate}
          </span>
        )}
        {item.latestNewsSource && <span>{item.latestNewsSource}</span>}
      </div>
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { focusItems, notes } = useAppContext();
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const [totalSignals, setTotalSignals] = useState(0);
  const [companyTotal, setCompanyTotal] = useState<number | null>(null);
  const [newsTotal, setNewsTotal] = useState<number | null>(null);
  const [knowledgeTotal, setKnowledgeTotal] = useState<number | null>(null);
  const [emergingSignals, setEmergingSignals] = useState<EmergingCompanySignal[]>([]);

  useEffect(() => {
    signalApi.getSignals({ type: '全部', page: 1, pageSize: 4 }).then((res) => {
      setRecentSignals(res.signals.slice(0, 4));
      setTotalSignals(res.total);
    }).catch(() => {});

    Promise.allSettled([
      fetchCompanies({ page: 1, page_size: 1 }),
      newsApi.getNewsList({ page: 1, page_size: 1, sort_by: 'published_at', match_mode: 'phrase' }),
      fetchKnowledgeCategories(),
      fetchLatestCompanyPromotions(),
    ]).then(([companyRes, newsRes, knowledgeRes, emergingRes]) => {
      if (companyRes.status === 'fulfilled') setCompanyTotal(companyRes.value.total);
      if (newsRes.status === 'fulfilled') setNewsTotal(newsRes.value.total);
      if (knowledgeRes.status === 'fulfilled') {
        setKnowledgeTotal(knowledgeRes.value.reduce((sum, item) => sum + item.count, 0));
      }
      if (emergingRes.status === 'fulfilled') {
        setEmergingSignals(emergingRes.value.slice(0, 4));
      }
    });
  }, []);

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }, []);

  return (
    <div className="animate-fade-up space-y-8">
      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-[#8892aa] tracking-[0.32em] uppercase mb-1.5 flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            {dateLabel}
          </p>
          <h1 className="font-display text-4xl text-shimmer tracking-widest leading-tight">
            QUANTUM RADAR
          </h1>
          <p className="text-[#8892aa] text-sm mt-1.5">
            量子科技赛道实时认知引擎，围绕信号、公司、研究者与报告做联动追踪。
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#8892aa] whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />
          <span>数据实时同步中</span>
        </div>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Zap} value={totalSignals || '—'} label="信号总数" sub="论文与新闻信号统一入口" tone="amber" />
        <StatCard icon={BookText} value={knowledgeTotal ?? '—'} label="知识库文档" sub="多 Agent 报告与沉淀文档" tone="emerald" />
        <StatCard icon={Building2} value={companyTotal ?? '—'} label="公司库企业" sub="Gold 层公司记录" tone="blue" />
        <StatCard icon={Newspaper} value={newsTotal ?? '—'} label="新闻库条目" sub="可按来源与时间组合检索" tone="violet" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#c8d4f0] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            新玩家雷达
          </h2>
          <button
            onClick={() => navigate('/emerging-companies')}
            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            查看全部 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {emergingSignals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {emergingSignals.map((item) => (
              <EmergingSignalCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-5 text-sm text-[#8892aa]">
            暂无可展示的新玩家信号。
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#c8d4f0] flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            最新信号
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
            <button
              key={signal.id}
              onClick={() => navigate('/signals')}
              className="glass-card rounded-2xl p-4 text-left group hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${PRIORITY_TONE[signal.priority]}`}>
                    {signal.priority === 'high' ? '高优先' : signal.priority === 'mid' ? '中优先' : '低优先'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(59,130,246,0.08)] text-blue-400 border border-[rgba(59,130,246,0.15)]">
                    {signal.type}
                  </span>
                </div>
                <span className="text-[10px] text-[#8892aa] flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {signal.timestamp}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-[#e0e8ff] group-hover:text-blue-300 transition-colors line-clamp-2">
                {signal.title}
              </h3>
              <p className="text-[11px] text-[#8892aa] mt-2 line-clamp-2 leading-relaxed">
                {signal.summary}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-[#c8d4f0]">功能导航</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickLinks.map(({ to, icon: Icon, label, desc, accent }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="glass-card rounded-2xl p-4 text-left group hover:border-blue-500/30 transition-all duration-200 hover:scale-[1.01]"
            >
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center mb-3`}>
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <p className="text-sm font-semibold text-[#e0e8ff] mb-1 group-hover:text-blue-300 transition-colors">{label}</p>
              <p className="text-[11px] text-[#8892aa] leading-snug">{desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8892aa] mb-2">我的关注</p>
          <p className="text-2xl font-bold text-[#e0e8ff]">{focusItems.length}</p>
          <p className="text-[12px] text-[#8892aa] mt-1">个人跟踪标的与提醒列表</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8892aa] mb-2">研究笔记</p>
          <p className="text-2xl font-bold text-[#e0e8ff]">{notes.length}</p>
          <p className="text-[12px] text-[#8892aa] mt-1">
            最近编辑 {notes[0] ? formatRelativeDate(notes[0].updatedAt) : '暂无'}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8892aa] mb-2">知识沉淀</p>
          <p className="text-2xl font-bold text-[#e0e8ff]">{knowledgeTotal ?? '—'}</p>
          <p className="text-[12px] text-[#8892aa] mt-1">从调研过程直接沉淀成可复用报告</p>
        </div>
      </section>
    </div>
  );
}
