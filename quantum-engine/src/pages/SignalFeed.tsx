import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import SignalCard from '../components/SignalCard';
import SignalDetailModal from '../components/SignalDetailModal';
import { useSignals } from '../hooks/useSignals';
import { Signal, SignalType, SignalDetail } from '../types';
import { signalApi } from '../api/signals';
import { newsApi } from '../api/news';

const signalTypes: (SignalType | '全部')[] = ['全部', '新闻资讯', '融资事件', '政策规划', '技术发布', '产业化进展', '人才组织'];
const PAGE_SIZE = 20;

// 支持关键词搜索的类型
const SERVER_FILTER_TYPES = new Set<string>(['新闻资讯', '融资事件', '政策规划', '技术发布', '产业化进展', '人才组织']);

export default function SignalFeed() {
  const [selectedSignal, setSelectedSignal] = useState<SignalDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { signals, total: totalCount, loading, filters, updateFilters } = useSignals({
    type: '全部',
    priority: 'all',
    timeRange: 'all',
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const isServerFilterMode = filters.type ? SERVER_FILTER_TYPES.has(filters.type) : false;

  // 获取各类型数量统计（并行，仅启动时查一次）
  useEffect(() => {
    const fetchTypeCounts = async () => {
      const newsResp = await Promise.allSettled([
        newsApi.getNewsList({ page: 1, page_size: 1, keyword: '量子', match_mode: 'any' }),
      ]);
      setTypeCounts({
        '新闻资讯': newsResp[0].status === 'fulfilled' ? newsResp[0].value.total : 0,
      });
    };
    fetchTypeCounts();
  }, []);

  const handleTypeChange = (type: SignalType | '全部') => {
    setCurrentPage(1);
    setSearchInput('');
    updateFilters({ type, page: 1, keyword: undefined });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateFilters({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      updateFilters({ keyword: val.trim() || undefined, page: 1 });
    }, 400);
  };

  const handleSearchClear = () => {
    setSearchInput('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCurrentPage(1);
    updateFilters({ keyword: undefined, page: 1 });
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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const keyword = filters.keyword || '';

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 animate-fade-up">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display text-4xl text-shimmer tracking-widest">SIGNAL FEED</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)]">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 dot-pulse" />
            <span className="text-[11px] text-blue-400 font-medium">实时</span>
          </div>
        </div>
        <p className="text-[#8892aa] text-sm">
          {keyword ? (
            <>搜索 &ldquo;{keyword}&rdquo; &middot; 找到 <span className="text-blue-400 font-medium">{totalCount}</span> 条信号</>
          ) : (
            <>实时追踪量子科技领域的关键信号 &middot; 共 <span className="text-blue-400 font-medium">{totalCount}</span> 条信号</>
          )}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-xl p-4 mb-6 sticky top-16 z-40">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex gap-1.5 flex-wrap">
            {signalTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`btn-glow px-3.5 py-1.5 rounded-md font-medium text-sm cursor-pointer transition-all duration-200 ${
                  filters.type === type
                    ? 'bg-blue-600 text-white shadow-glow-sm border border-blue-500'
                    : 'bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)] text-[#8892aa] hover:bg-[rgba(59,130,246,0.12)] hover:text-[#c8d4f0] hover:border-blue-500/30'
                }`}
              >
                {type}
                {type !== '全部' && typeCounts[type] !== undefined && (
                  <span className="ml-1.5 text-[11px] opacity-60">{typeCounts[type]}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={filters.timeRange || 'all'}
              onChange={(e) => { setCurrentPage(1); updateFilters({ timeRange: e.target.value as any, page: 1 }); }}
              className="bg-[rgba(10,10,24,0.8)] border border-[rgba(59,130,246,0.15)] rounded-md px-3 py-1.5 text-sm text-[#c8d4f0] cursor-pointer hover:border-blue-500/40 transition-colors focus:outline-none focus:border-blue-500/50 appearance-none"
            >
              <option value="all" className="bg-[#0a0a18]">全部时间</option>
              <option value="7" className="bg-[#0a0a18]">最近 7 天</option>
              <option value="30" className="bg-[#0a0a18]">最近 30 天</option>
              <option value="90" className="bg-[#0a0a18]">最近 90 天</option>
            </select>
            {!isServerFilterMode && (
              <select
                value={filters.priority || 'all'}
                onChange={(e) => updateFilters({ priority: e.target.value as any })}
                className="bg-[rgba(10,10,24,0.8)] border border-[rgba(59,130,246,0.15)] rounded-md px-3 py-1.5 text-sm text-[#c8d4f0] cursor-pointer hover:border-blue-500/40 transition-colors focus:outline-none focus:border-blue-500/50 appearance-none"
              >
                <option value="all">优先级：全部</option>
                <option value="high">高优先级</option>
                <option value="mid">中优先级</option>
                <option value="low">低优先级</option>
              </select>
            )}
          </div>
        </div>
        {/* 论文/新闻模式下显示搜索框 */}
        {isServerFilterMode && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892aa] pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={filters.type === '论文' ? '搜索论文标题、摘要、关键词...' : '搜索新闻标题、内容、技术方向...'}
              className="w-full pl-9 pr-9 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(59,130,246,0.18)] rounded-lg text-sm text-[#c8d4f0] placeholder-[#8892aa] focus:outline-none focus:border-blue-500/50 focus:bg-[rgba(59,130,246,0.05)] transition-all"
            />
            {searchInput && (
              <button
                onClick={handleSearchClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892aa] hover:text-[#c8d4f0] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Signal List */}
      {loading ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
          <p className="text-[#8892aa] mt-4 text-sm">
            {keyword ? `正在搜索「${keyword}」...` : '加载中...'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.length > 0 ? (
            <>
              {signals.map((signal, index) => (
                <div
                  key={signal.id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-300"
                  style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
                >
                  <SignalCard signal={signal} onClick={() => handleSignalClick(signal)} />
                </div>
              ))}

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 py-8">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] hover:bg-[rgba(59,130,246,0.15)] disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-sm font-medium text-[#c8d4f0] transition-all"
                  >
                    上一页
                  </button>
                  <div className="flex gap-1.5">
                    {(() => {
                      const pages: number[] = [];
                      const maxShow = 5;
                      let start = Math.max(1, currentPage - Math.floor(maxShow / 2));
                      const end = Math.min(totalPages, start + maxShow - 1);
                      if (end - start < maxShow - 1) start = Math.max(1, end - maxShow + 1);
                      for (let p = start; p <= end; p++) pages.push(p);
                      return pages.map(p => (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`w-9 h-9 rounded-md text-sm font-medium transition-all ${
                            currentPage === p
                              ? 'bg-blue-600 text-white shadow-glow-sm border border-blue-500'
                              : 'bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.12)] hover:bg-[rgba(59,130,246,0.14)] text-[#8892aa] hover:text-[#c8d4f0]'
                          }`}
                        >
                          {p}
                        </button>
                      ));
                    })()}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] hover:bg-[rgba(59,130,246,0.15)] disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-sm font-medium text-[#c8d4f0] transition-all"
                  >
                    下一页
                  </button>
                </div>
              )}

              <div className="text-center pb-4">
                <p className="text-[#8892aa] text-xs">
                  第 <span className="text-blue-400">{currentPage}</span> / <span className="text-blue-400">{totalPages || 1}</span> 页
                  {' · '}共 <span className="text-blue-400">{totalCount}</span> 条信号
                </p>
              </div>
            </>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center">
              <div className="text-5xl mb-4 opacity-40">🔍</div>
              <p className="text-[#c8d4f0] text-base mb-2 font-medium">
                {keyword ? `没有找到包含「${keyword}」的信号` : '暂无符合条件的信号'}
              </p>
              <p className="text-[#8892aa] text-sm">
                {keyword ? '尝试更换关键词，或清除搜索条件' : '尝试调整筛选条件或时间范围'}
              </p>
              {keyword && (
                <button
                  onClick={handleSearchClear}
                  className="mt-4 px-4 py-2 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.18)] hover:bg-[rgba(59,130,246,0.15)] text-blue-400 text-sm rounded-md transition-all"
                >
                  清除搜索
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {selectedSignal && !loadingDetail && (
        <SignalDetailModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
      )}
      {loadingDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-card rounded-xl p-10 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
            <p className="text-[#8892aa] mt-4 text-sm">加载详情中...</p>
          </div>
        </div>
      )}
    </div>
  );
}
