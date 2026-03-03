import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SignalCard from '../components/SignalCard';
import SignalDetailModal from '../components/SignalDetailModal';
import { useSignals } from '../hooks/useSignals';
import { Signal, SignalType, SignalDetail } from '../types';
import { signalApi } from '../api/signals';

const signalTypes: (SignalType | '全部')[] = ['全部', '政策规划', '融资事件', '产业化进展', '技术发布', '人才组织', '论文'];

export default function SignalFeed() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [selectedSignal, setSelectedSignal] = useState<SignalDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const { signals, loading, filters, updateFilters } = useSignals({
    type: '全部',
    priority: 'all',
    timeRange: 'all',
    page: currentPage,
    pageSize: 20,
  });

  // 获取各类型的数量统计
  useEffect(() => {
    const fetchTypeCounts = async () => {
      const counts: Record<string, number> = {};
      
      // 获取论文数量（真实API）
      try {
        const paperResponse = await signalApi.getSignals({ type: '论文', page: 1, pageSize: 1 });
        counts['论文'] = paperResponse.total;
      } catch (error) {
        console.error('Failed to fetch paper count:', error);
        counts['论文'] = 0;
      }

      // 获取其他类型数量（Mock数据）
      for (const type of signalTypes) {
        if (type !== '全部' && type !== '论文') {
          const response = await signalApi.getSignals({ type, page: 1, pageSize: 1 });
          counts[type] = response.total;
        }
      }

      setTypeCounts(counts);
    };

    fetchTypeCounts();
  }, []);

  // 更新总数
  useEffect(() => {
    const fetchTotal = async () => {
      const response = await signalApi.getSignals(filters);
      setTotalCount(response.total);
    };
    fetchTotal();
  }, [filters]);

  // 处理信号点击，获取完整详情
  const handleSignalClick = async (signal: Signal) => {
    setLoadingDetail(true);
    try {
      const detail = await signalApi.getSignalById(signal.id);
      setSelectedSignal(detail);
    } catch (error) {
      console.error('Failed to fetch signal detail:', error);
      // 如果获取失败，使用列表中的数据
      setSelectedSignal(signal as SignalDetail);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Filter signals by search query
  const filteredSignals = searchQuery
    ? signals.filter(signal =>
        signal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : signals;

  const handleTypeChange = (type: SignalType | '全部') => {
    setCurrentPage(1);
    updateFilters({ type, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateFilters({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalCount / 20);

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
          {searchQuery ? (
            <>搜索 &ldquo;{searchQuery}&rdquo; · 找到 <span className="text-blue-400 font-medium">{filteredSignals.length}</span> 条信号</>
          ) : (
            <>实时追踪量子科技领域的关键信号 · 共 <span className="text-blue-400 font-medium">{totalCount}</span> 条信号</>
          )}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-xl p-4 mb-6 sticky top-16 z-40">
        <div className="flex items-center justify-between flex-wrap gap-4">
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
                  <span className="ml-1.5 text-[11px] opacity-60">
                    {typeCounts[type]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={filters.timeRange || 'all'}
              onChange={(e) => updateFilters({ timeRange: e.target.value as any })}
              className="bg-[rgba(10,10,24,0.8)] border border-[rgba(59,130,246,0.15)] rounded-md px-3 py-1.5 text-sm text-[#c8d4f0] cursor-pointer hover:border-blue-500/40 transition-colors focus:outline-none focus:border-blue-500/50 appearance-none"
            >
              <option value="all" className="bg-[#0a0a18]">全部时间</option>
              <option value="7" className="bg-[#0a0a18]">最近 7 天</option>
              <option value="30" className="bg-[#0a0a18]">最近 30 天</option>
              <option value="90" className="bg-[#0a0a18]">最近 90 天</option>
            </select>
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
          </div>
        </div>
      </div>

      {/* Signal Feed */}
      {loading ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin"></div>
          <p className="text-[#8892aa] mt-4 text-sm">加载中...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSignals.length > 0 ? (
            <>
              {filteredSignals.map((signal, index) => (
                <div
                  key={signal.id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <SignalCard 
                    signal={signal} 
                    onClick={() => handleSignalClick(signal)}
                  />
                </div>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 py-8">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] hover:bg-[rgba(59,130,246,0.15)] disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-sm font-medium text-[#c8d4f0] transition-all"
                  >
                    上一页
                  </button>
                  
                  <div className="flex gap-2">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white shadow-glow-sm border border-blue-500'
                              : 'bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.12)] hover:bg-[rgba(59,130,246,0.14)] text-[#8892aa] hover:text-[#c8d4f0]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
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

              <div className="text-center py-4">
                <p className="text-[#8892aa] text-xs">
                  第 <span className="text-blue-400">{currentPage}</span> / {totalPages} 页 · 共 <span className="text-blue-400">{totalCount}</span> 条信号
                </p>
              </div>
            </>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center">
              <div className="text-5xl mb-4 opacity-40">🔍</div>
              <p className="text-[#c8d4f0] text-base mb-2 font-medium">
                {searchQuery ? `没有找到包含 "${searchQuery}" 的信号` : '暂无符合条件的信号'}
              </p>
              <p className="text-[#8892aa] text-sm">
                {searchQuery ? '尝试使用其他关键词搜索' : '尝试调整筛选条件或时间范围'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Signal Detail Modal */}
      {selectedSignal && !loadingDetail && (
        <SignalDetailModal
          signal={selectedSignal}
          onClose={() => setSelectedSignal(null)}
        />
      )}

      {/* Loading Detail Modal */}
      {loadingDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-card rounded-xl p-10 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin"></div>
            <p className="text-[#8892aa] mt-4 text-sm">加载详情中...</p>
          </div>
        </div>
      )}
    </div>
  );
}
