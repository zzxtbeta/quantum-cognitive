import { useEffect, useState } from 'react';
import {
  Building2,
  CalendarRange,
  Newspaper,
  RefreshCw,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import {
  EmergingCompanySignal,
  fetchLatestCompanyPromotions,
} from '../api/companySignals';

function MetaPill({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
      {label}：{value}
    </span>
  );
}

function SignalCard({ item }: { item: EmergingCompanySignal }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-semibold text-slate-800">{item.companyName}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <MetaPill label="报道数" value={item.newsCount ?? 0} />
            <MetaPill label="法定代表人" value={item.legalPersonName} />
            <MetaPill label="统一信用代码" value={item.creditCode} />
            <MetaPill label="行业" value={item.industry} />
            <MetaPill label="地区" value={[item.province, item.city].filter(Boolean).join(' / ')} />
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700">
          最近三个月注册 + 被报道
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
            <CalendarRange className="w-3.5 h-3.5" />
            注册/晋升时间
          </div>
          <div className="mt-2 text-[13px] text-slate-700 space-y-1">
            <div>注册时间：{item.establishedAt || '未提供'}</div>
            <div>入池时间：{item.promotedAt ? item.promotedAt.slice(0, 10) : '未提供'}</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            快速判断
          </div>
          <div className="mt-2 text-[13px] leading-relaxed text-slate-700">
            {item.summary || '该公司已进入新玩家雷达，建议结合相关报道、工商信息和后续融资动态继续跟踪。'}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 text-[13px] font-semibold text-slate-700">
          <Newspaper className="w-4 h-4 text-blue-600" />
          相关报道
        </div>
        <div className="divide-y divide-slate-100">
          {item.newsItems.length > 0 ? (
            item.newsItems.map((newsItem) => (
              <div key={newsItem.newsId} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <a
                      href={newsItem.url || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] font-medium text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      {newsItem.title || '未命名报道'}
                    </a>
                    <div className="mt-1 flex flex-wrap gap-3 text-[12px] text-slate-500">
                      {newsItem.source && <span>{newsItem.source}</span>}
                      {newsItem.publishedAt && <span>{newsItem.publishedAt}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-4 text-[13px] text-slate-500">暂无关联报道明细</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmergingCompanies() {
  const [items, setItems] = useState<EmergingCompanySignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLatestCompanyPromotions();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '新玩家雷达加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">EARLY SIGNALS</h1>
        <p className="text-[#8892aa] text-sm">
          基于多源数据整合，追踪最近三个月注册且近期被媒体报道的公司。这些信号更适合做早期 deal sourcing。
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">{loading ? '...' : items.length}</p>
            <p className="text-[12px] text-slate-500 mt-1">命中的新玩家公司</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">
              {loading ? '...' : items.reduce((sum, item) => sum + (item.newsCount || 0), 0)}
            </p>
            <p className="text-[12px] text-slate-500 mt-1">关联报道总数</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">
              {loading ? '...' : items.filter((item) => item.creditCode).length}
            </p>
            <p className="text-[12px] text-slate-500 mt-1">具备工商主键的公司</p>
          </div>
        </div>

        <button
          onClick={() => void load()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-2xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          正在加载新玩家雷达...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-500 bg-white border border-slate-200 rounded-2xl">
          <Building2 className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">最近没有命中新玩家雷达数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {items.map((item) => (
            <SignalCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[13px] text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <ScrollText className="w-4 h-4" />
          使用说明
        </div>
        <div className="mt-2 leading-relaxed">
          这里展示的是“近期注册 + 近期被报道”的公司，不等同于全部新公司名单。更适合做新团队发现、区域孵化观察和新闻驱动的机会扫描。
        </div>
      </div>
    </div>
  );
}
