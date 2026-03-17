import { useEffect, useState } from 'react';
import { ArrowUpRight, Building2, CalendarRange, Newspaper, RefreshCw } from 'lucide-react';
import { EmergingCompanySignal, fetchLatestCompanyPromotions } from '../api/companySignals';

function SignalCard({ item }: { item: EmergingCompanySignal }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-semibold text-slate-800">{item.companyName}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
            {item.establishedAt && (
              <span className="flex items-center gap-1">
                <CalendarRange className="w-3.5 h-3.5" />
                注册时间 {item.establishedAt}
              </span>
            )}
            {(item.province || item.city) && (
              <span>{[item.province, item.city].filter(Boolean).join(' / ')}</span>
            )}
            {item.industry && <span>{item.industry}</span>}
          </div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700">
          新增信号
        </span>
      </div>

      {(item.latestNewsTitle || item.summary) && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          {item.latestNewsTitle && (
            <p className="text-[14px] font-medium text-slate-800 leading-relaxed">{item.latestNewsTitle}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-slate-500">
            {item.latestNewsDate && (
              <span className="flex items-center gap-1">
                <Newspaper className="w-3.5 h-3.5" />
                {item.latestNewsDate}
              </span>
            )}
            {item.latestNewsSource && <span>{item.latestNewsSource}</span>}
          </div>
          {item.summary && (
            <p className="mt-3 text-[12px] leading-relaxed text-slate-600 line-clamp-4">{item.summary}</p>
          )}
          {item.latestNewsUrl && (
            <a
              href={item.latestNewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700 hover:underline"
            >
              查看原文
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}
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
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">EARLY SIGNALS</h1>
        <p className="text-[#8892aa] text-sm">
          近三个月内注册，且近三个月内被新闻报道的公司。适合用来补充 deal sourcing 的早期信号扫描。
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">{loading ? '—' : items.length}</p>
            <p className="text-[12px] text-slate-500 mt-1">当前捕获公司数</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">
              {loading ? '—' : items.filter((item) => item.latestNewsUrl).length}
            </p>
            <p className="text-[12px] text-slate-500 mt-1">带可点击新闻来源</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">
              {loading ? '—' : items.filter((item) => item.establishedAt).length}
            </p>
            <p className="text-[12px] text-slate-500 mt-1">带注册时间字段</p>
          </div>
        </div>

        <button
          onClick={load}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-2xl">
          加载失败：{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          加载中…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-500 bg-white border border-slate-200 rounded-2xl">
          <Building2 className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">当前没有返回可展示的公司信号</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {items.map((item) => <SignalCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
