import { useEffect, useRef, useState } from 'react';
import { CalendarRange, Search, SlidersHorizontal, X } from 'lucide-react';
import SignalCard from '../components/SignalCard';
import SignalDetailModal from '../components/SignalDetailModal';
import { useSignals } from '../hooks/useSignals';
import { Signal, SignalDetail, SignalType } from '../types';
import { signalApi } from '../api/signals';

const signalTypes: Array<SignalType | '全部'> = [
  '全部',
  '新闻资讯',
  '融资事件',
  '政策规划',
  '技术发布',
  '产业化进展',
  '人才组织',
];

const serverFilterTypes = new Set<string>([
  '新闻资讯',
  '融资事件',
  '政策规划',
  '技术发布',
  '产业化进展',
  '人才组织',
]);

const pageSize = 20;

export default function SignalFeed() {
  const [selectedSignal, setSelectedSignal] = useState<SignalDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { signals, total, loading, filters, updateFilters } = useSignals({
    type: '全部',
    priority: 'all',
    timeRange: 'all',
    matchMode: 'phrase',
    page: 1,
    pageSize,
  });

  useEffect(() => {
    setSearchInput(filters.keyword || '');
    setSourceInput(filters.source || '');
    setDraftStartDate(filters.startDate || '');
    setDraftEndDate(filters.endDate || '');
  }, [filters.keyword, filters.source, filters.startDate, filters.endDate]);

  const isServerMode = filters.type ? serverFilterTypes.has(filters.type) : false;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleTypeChange = (type: SignalType | '全部') => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updateFilters({
      type,
      page: 1,
      keyword: undefined,
      source: undefined,
      startDate: undefined,
      endDate: undefined,
      matchMode: 'phrase',
    });
    setSearchInput('');
    setSourceInput('');
    setDraftStartDate('');
    setDraftEndDate('');
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFilters({ keyword: value.trim() || undefined, page: 1 });
    }, 350);
  };

  const applyNewsFilters = () => {
    updateFilters({
      source: sourceInput.trim() || undefined,
      startDate: draftStartDate || undefined,
      endDate: draftEndDate || undefined,
      page: 1,
    });
  };

  const clearNewsFilters = () => {
    setSourceInput('');
    setDraftStartDate('');
    setDraftEndDate('');
    updateFilters({
      source: undefined,
      startDate: undefined,
      endDate: undefined,
      matchMode: 'phrase',
      page: 1,
    });
  };

  const handleSignalClick = async (signal: Signal) => {
    setLoadingDetail(true);
    try {
      const detail = await signalApi.getSignalById(signal.id);
      setSelectedSignal(detail);
    } catch {
      setSelectedSignal(signal as SignalDetail);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div>
      <div className="mb-6 animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">SIGNAL FEED</h1>
        <p className="text-[#8892aa] text-sm">
          统一浏览新闻、论文和量子赛道动态。
          <span className="text-blue-400 font-medium ml-2">{total}</span> 条结果
        </p>
      </div>

      <div className="glass-card rounded-2xl p-4 mb-6 sticky top-16 z-40 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {signalTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`px-3.5 py-1.5 rounded-md font-medium text-sm transition-all ${
                  filters.type === type
                    ? 'bg-blue-600 text-white border border-blue-500'
                    : 'bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)] text-[#8892aa] hover:bg-[rgba(59,130,246,0.12)] hover:text-[#c8d4f0]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <select
              value={filters.timeRange || 'all'}
              onChange={(event) => updateFilters({ timeRange: event.target.value as any, page: 1 })}
              className="bg-[rgba(10,10,24,0.8)] border border-[rgba(59,130,246,0.15)] rounded-md px-3 py-1.5 text-sm text-[#c8d4f0] focus:outline-none"
            >
              <option value="all">全部时间</option>
              <option value="7">近 7 天</option>
              <option value="30">近 30 天</option>
              <option value="90">近 90 天</option>
            </select>

            {isServerMode && (
              <select
                value={filters.matchMode || 'phrase'}
                onChange={(event) => updateFilters({ matchMode: event.target.value as 'phrase' | 'any', page: 1 })}
                className="bg-[rgba(10,10,24,0.8)] border border-[rgba(59,130,246,0.15)] rounded-md px-3 py-1.5 text-sm text-[#c8d4f0] focus:outline-none"
              >
                <option value="phrase">短语匹配</option>
                <option value="any">多词宽松匹配</option>
              </select>
            )}
          </div>
        </div>

        {isServerMode && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892aa] pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="搜索标题或正文关键词..."
                className="w-full pl-9 pr-9 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(59,130,246,0.18)] rounded-lg text-sm text-[#c8d4f0] placeholder-[#8892aa] focus:outline-none"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    updateFilters({ keyword: undefined, page: 1 });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892aa] hover:text-[#c8d4f0]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                type="text"
                value={sourceInput}
                onChange={(event) => setSourceInput(event.target.value)}
                placeholder="来源名称"
                className="bg-[rgba(255,255,255,0.04)] border border-[rgba(59,130,246,0.18)] rounded-lg px-3 py-2 text-sm text-[#c8d4f0] placeholder-[#8892aa] focus:outline-none"
              />
              <div className="relative">
                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892aa]" />
                <input
                  type="date"
                  value={draftStartDate}
                  onChange={(event) => setDraftStartDate(event.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(59,130,246,0.18)] rounded-lg pl-9 pr-3 py-2 text-sm text-[#c8d4f0] focus:outline-none"
                />
              </div>
              <div className="relative">
                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892aa]" />
                <input
                  type="date"
                  value={draftEndDate}
                  onChange={(event) => setDraftEndDate(event.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(59,130,246,0.18)] rounded-lg pl-9 pr-3 py-2 text-sm text-[#c8d4f0] focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={applyNewsFilters}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  应用
                </button>
                <button
                  onClick={clearNewsFilters}
                  className="px-3 py-2 border border-[rgba(59,130,246,0.18)] rounded-lg text-sm text-[#c8d4f0] hover:bg-[rgba(59,130,246,0.08)]"
                >
                  清空
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
          <p className="text-[#8892aa] mt-4 text-sm">加载中…</p>
        </div>
      ) : signals.length > 0 ? (
        <div className="space-y-4">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} onClick={() => handleSignalClick(signal)} />
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 py-8">
              <button
                onClick={() => updateFilters({ page: Math.max(1, (filters.page || 1) - 1) })}
                disabled={(filters.page || 1) === 1}
                className="px-4 py-2 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] disabled:opacity-30 rounded-md text-sm text-[#c8d4f0]"
              >
                上一页
              </button>
              <span className="text-sm text-[#8892aa]">
                第 <span className="text-blue-400">{filters.page || 1}</span> / {totalPages} 页
              </span>
              <button
                onClick={() => updateFilters({ page: Math.min(totalPages, (filters.page || 1) + 1) })}
                disabled={(filters.page || 1) >= totalPages}
                className="px-4 py-2 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] disabled:opacity-30 rounded-md text-sm text-[#c8d4f0]"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4 opacity-40">⌁</div>
          <p className="text-[#c8d4f0] text-base mb-2 font-medium">没有找到匹配结果</p>
          <p className="text-[#8892aa] text-sm">可以放宽关键词、来源或时间范围后重试。</p>
        </div>
      )}

      {selectedSignal && !loadingDetail && (
        <SignalDetailModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
      )}
      {loadingDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-card rounded-2xl p-10 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
            <p className="text-[#8892aa] mt-4 text-sm">加载详情中…</p>
          </div>
        </div>
      )}
    </div>
  );
}
