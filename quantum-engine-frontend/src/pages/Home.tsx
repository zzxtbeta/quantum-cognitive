import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart2,
  BookText,
  Building2,
  Clock,
  Flame,
  Layers,
  Newspaper,
  Radar,
  Users,
  Zap,
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { signalApi } from '../api/signals';
import { fetchCompanies } from '../api/companies';
import { fetchKnowledgeCategories } from '../api/knowledge';
import { newsApi } from '../api/news';
import {
  EmergingCompanySignal,
  fetchLatestCompanyPromotions,
} from '../api/companySignals';
import type { Signal } from '../types';

const PRIORITY_TONE: Record<string, string> = {
  high: 'text-red-700 bg-red-50 border-red-200',
  mid: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-slate-600 bg-slate-100 border-slate-200',
};

const quickLinks = [
  {
    to: '/signals',
    icon: Zap,
    label: '信号流',
    desc: '追踪论文、新闻与市场动态的实时变化。',
    accent: 'from-amber-500 to-orange-500',
  },
  {
    to: '/candidates',
    icon: Building2,
    label: '公司库',
    desc: '筛选 Gold 层企业，快速发现重点公司与产业分布。',
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    to: '/emerging-companies',
    icon: Radar,
    label: '新玩家雷达',
    desc: '查看最近注册且近期被报道的公司，辅助 deal sourcing。',
    accent: 'from-emerald-500 to-lime-500',
  },
  {
    to: '/researchers',
    icon: Users,
    label: '人才库',
    desc: '追踪核心研究者、机构团队和人才流动。',
    accent: 'from-violet-500 to-purple-600',
  },
  {
    to: '/knowledge',
    icon: BookText,
    label: '知识库',
    desc: '查看多 Agent 研究报告与主题化沉淀文档。',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    to: '/knowledge-map',
    icon: Layers,
    label: '知识地图',
    desc: '从技术路线和实体关系角度浏览研究脉络。',
    accent: 'from-teal-500 to-cyan-500',
  },
];

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return '今天';
  if (days === 1) return '1 天前';
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
    amber: ['from-amber-500/20 to-orange-500/10', 'text-amber-600'],
    blue: ['from-blue-500/20 to-cyan-500/10', 'text-blue-600'],
    emerald: ['from-emerald-500/20 to-teal-500/10', 'text-emerald-600'],
    violet: ['from-violet-500/20 to-purple-500/10', 'text-violet-600'],
  } as const;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-5 flex items-start gap-4">
      <div
        className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${toneMap[tone][0]} flex items-center justify-center flex-shrink-0`}
      >
        <Icon className={`w-5 h-5 ${toneMap[tone][1]}`} />
      </div>
      <div className="min-w-0">
        <p className="text-3xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-sm text-slate-700 mt-1">{label}</p>
        <p className="text-[11px] text-slate-500 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function EmergingSignalCard({ item }: { item: EmergingCompanySignal }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.companyName}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {[item.province, item.city].filter(Boolean).join(' / ') || '地区待补充'}
          </p>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700">
          {item.newsCount || 0} 篇报道
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-500">
        {item.legalPersonName && <span>法人：{item.legalPersonName}</span>}
        {item.creditCode && <span>信用代码：{item.creditCode}</span>}
        {item.establishedAt && <span>成立：{item.establishedAt}</span>}
      </div>

      <div className="mt-3 space-y-2">
        {item.newsItems.slice(0, 3).map((newsItem) => (
          <a
            key={newsItem.newsId}
            href={newsItem.url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100 transition-colors"
          >
            <div className="text-[12px] text-slate-800 line-clamp-2">
              {newsItem.title || '暂无标题'}
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-slate-500">
              {newsItem.source && <span>{newsItem.source}</span>}
              {newsItem.publishedAt && <span>{newsItem.publishedAt}</span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { focusItems, notes } = useAppContext();
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const [signalAggregateTotal, setSignalAggregateTotal] = useState(0);
  const [companyTotal, setCompanyTotal] = useState<number | null>(null);
  const [newsTotal, setNewsTotal] = useState<number | null>(null);
  const [knowledgeTotal, setKnowledgeTotal] = useState<number | null>(null);
  const [emergingSignals, setEmergingSignals] = useState<EmergingCompanySignal[]>([]);

  useEffect(() => {
    signalApi
      .getSignals({ type: '全部', page: 1, pageSize: 4 })
      .then((res) => {
        setRecentSignals(res.signals.slice(0, 4));
        setSignalAggregateTotal(res.total);
      })
      .catch(() => {});

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

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }),
    [],
  );

  return (
    <div className="animate-fade-up space-y-8">
      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-slate-500 tracking-[0.32em] uppercase mb-1.5 flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            {dateLabel}
          </p>
          <h1 className="font-display text-4xl text-shimmer tracking-widest leading-tight">
            QUANTUM RADAR
          </h1>
          <p className="text-slate-600 text-sm mt-1.5">
            量子科技赛道实时认知引擎，围绕信号、公司、研究者与报告做联动追踪。
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />
          <span>数据实时同步中</span>
        </div>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          value={signalAggregateTotal || '...'}
          label="聚合信号"
          sub="论文与新闻信号统一入口"
          tone="amber"
        />
        <StatCard
          icon={BookText}
          value={knowledgeTotal ?? '...'}
          label="知识库文档"
          sub="多 Agent 报告与沉淀文档"
          tone="emerald"
        />
        <StatCard
          icon={Building2}
          value={companyTotal ?? '...'}
          label="公司库企业"
          sub="Gold 层公司记录"
          tone="blue"
        />
        <StatCard
          icon={Newspaper}
          value={newsTotal ?? '...'}
          label="新闻库条目"
          sub="支持来源、时间与关键词组合检索"
          tone="violet"
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Radar className="w-4 h-4 text-emerald-500" />
            新玩家雷达
          </h2>
          <button
            onClick={() => navigate('/emerging-companies')}
            className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
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
          <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-5 text-sm text-slate-500">
            暂时还没有可展示的新玩家雷达数据。
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            最新信号
          </h2>
          <button
            onClick={() => navigate('/signals')}
            className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            查看全部 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recentSignals.map((signal) => (
            <button
              key={signal.id}
              onClick={() => navigate('/signals')}
              className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-4 text-left group hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${PRIORITY_TONE[signal.priority]}`}
                  >
                    {signal.priority === 'high' ? '高优先' : signal.priority === 'mid' ? '中优先' : '低优先'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {signal.type}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {signal.timestamp}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2">
                {signal.title}
              </h3>
              <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                {signal.summary}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-slate-800">功能导航</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickLinks.map(({ to, icon: Icon, label, desc, accent }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-4 text-left group hover:border-blue-300 transition-all duration-200 hover:scale-[1.01]"
            >
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center mb-3`}>
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">
                {label}
              </p>
              <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">我的关注</p>
          <p className="text-2xl font-bold text-slate-900">{focusItems.length}</p>
          <p className="text-[12px] text-slate-500 mt-1">个人关注列表与提醒</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">研究笔记</p>
          <p className="text-2xl font-bold text-slate-900">{notes.length}</p>
          <p className="text-[12px] text-slate-500 mt-1">
            最近编辑 {notes[0] ? formatRelativeDate(notes[0].updatedAt) : '暂无'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">知识库文档</p>
          <p className="text-2xl font-bold text-slate-900">{knowledgeTotal ?? '...'}</p>
          <p className="text-[12px] text-slate-500 mt-1">多 Agent 报告与沉淀文档</p>
        </div>
      </section>
    </div>
  );
}
